import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcrypt';
import { PartenaireRepository } from './partenaire.repository';
import { FormationPartenaireRepository } from './formation-partenaire.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';
import { SoumettreFormationDto, AutoInscriptionPartenaireDto } from './dto/partenaire.dto';
import { UpdateProfilPartenaireDto } from './dto/profil.dto';
import { getCommissionForgesDefaut } from '../../config/env.config';
import { chiffrerUrl } from '../../shared/crypto/crypto.service';

export class PartenaireService {
  constructor(
    private readonly partenaireRepo: PartenaireRepository,
    private readonly fpRepo: FormationPartenaireRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // Flux B — Auto-inscription partenaire (RM-126)
  async autoInscrire(dto: AutoInscriptionPartenaireDto) {
    const existant = await this.partenaireRepo.findByEmail(dto.email_principal);
    if (existant) throw new Error('EMAIL_ALREADY_EXISTS');

    const partenaire = await this.partenaireRepo.create({
      raison_sociale: dto.raison_sociale,
      type: dto.type,
      pays: dto.pays,
      email_principal: dto.email_principal,
      commission_forges_pct: getCommissionForgesDefaut(),
      mode_inscription: 'AUTO_INSCRIPTION',
      statut: 'EN_ATTENTE_VERIFICATION',
    });

    await this.audit.info('PARTENAIRE_AUTO_INSCRIT', { partenaire_id: partenaire.id });
    return partenaire;
  }

  // Flux A — Activation via token invitation Admin (RM-126)
  async activerViaToken(token: string, password: string) {
    const partenaire = await this.partenaireRepo.findByToken(token);
    if (!partenaire) throw new Error('TOKEN_INVALID');
    if (partenaire.token_invitation_expiration && partenaire.token_invitation_expiration < new Date()) {
      throw new Error('TOKEN_EXPIRE');
    }

    const password_hash = await hash(password, 12);
    const updated = await this.prisma.partenaire.update({
      where: { id: partenaire.id },
      data: { password_hash, statut: 'ACTIF', token_invitation: null }
    });

    await this.audit.info('PARTENAIRE_ACTIVE', { partenaire_id: partenaire.id });
    return {
      message: 'Compte Partenaire activé avec succès.',
      partenaire: {
        id: updated.id,
        statut: updated.statut,
        mode_inscription: updated.mode_inscription,
      },
    };
  }

  // Admin — approuver auto-inscription (RM-126 Flux B)
  async approuver(partenaire_id: string, responsable_id: string, adminId: string) {
    const partenaire = await this.partenaireRepo.findById(partenaire_id);
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');
    if (partenaire.statut !== 'EN_ATTENTE_VERIFICATION') throw new Error('STATUT_INVALIDE');

    await this.partenaireRepo.activer(partenaire_id, responsable_id);
    await this.audit.info('PARTENAIRE_APPROUVE', { partenaire_id, admin_id: adminId });
    await this.email.sendPartenaireApprouve(partenaire.email_principal, 'FR');

    return { message: 'Partenaire approuvé et activé.' };
  }

  // UCS17 — Soumettre formation (RM-136 : 21 champs, SANS type_formation)
  async soumettreFormation(dto: SoumettreFormationDto, partenaire_id: string) {
    const partenaire = await this.partenaireRepo.findById(partenaire_id);
    if (!partenaire || partenaire.statut !== 'ACTIF') throw new Error('PARTENAIRE_INACTIF');

    // RM-127 : type_formation/pilier_abonnement ABSENTS du DTO partenaire
    // Création formation sans type_formation (null)
    const urlExterneChiffree = dto.url_contenu ? chiffrerUrl(dto.url_contenu) : undefined;

    const formation = await this.prisma.formation.create({
      data: {
        intitule: dto.intitule,
        description_courte: dto.description_courte,
        description_longue: dto.description_longue,
        duree_jours: dto.duree_jours,
        cout_catalogue: 0, // calculé à la validation (RM-137)
        responsable_id: partenaire.responsable_designe_id || '',
        type_formation: 'STANDARD' as any, // Valeur interne temporaire avant validation FORGES
        mode_formation: dto.mode_formation,
        pilier_abonnement: 'RETAIL' as any, // Valeur interne temporaire avant validation FORGES
        langues_disponibles: dto.langues_disponibles,
        certification_delivree: dto.certification_delivree,
        public_cible: dto.public_cible,
        objectifs_pedagogiques: dto.objectifs_pedagogiques,
        prerequis: dto.prerequis,
        partenaire_id,
        statut: 'EN_ATTENTE_VALIDATION',
        inclus_abonnement: false,
        url_externe_chiffree: urlExterneChiffree,
      }
    });

    // Créer FormationPartenaire avec prix coûtant proposé
    const fp = await this.fpRepo.create({
      formation_id: formation.id,
      partenaire_id,
      responsable_validateur_id: partenaire.responsable_designe_id || undefined,
      prix_coutant_soumis: dto.prix_coutant_propose,
    });

    // RM-128 : notifier Responsable désigné
    if (partenaire.responsable_designe_id) {
      try {
        await this.email.sendNouvelleFormationAValider(
          partenaire.responsable_designe_id,
          formation.intitule,
          'FR'
        );
      } catch (error: any) {
        await this.audit.warning('FORMATION_PARTENAIRE_EMAIL_FAILED', {
          partenaire_id,
          formation_id: formation.id,
          error: error?.message || 'UNKNOWN_ERROR',
        });
      }
    }

    await this.audit.info('FORMATION_PARTENAIRE_SOUMISE', {
      formation_id: formation.id,
      partenaire_id,
      prix_coutant: dto.prix_coutant_propose
    });

    return { formation_id: formation.id, fp_id: fp.id, message: 'Formation soumise en attente de validation.' };
  }

  // UCS17 — Resoumission après rejet (RM-128)
  async resoumettre(formation_id: string, partenaire_id: string) {
    const fp = await this.fpRepo.findByFormation(formation_id);
    if (!fp || fp.partenaire_id !== partenaire_id) throw new Error('FORMATION_NOT_FOUND');
    if (fp.statut_validation !== 'REJETE') throw new Error('FORMATION_NON_REJETEE');

    await this.fpRepo.incrementerVersion(formation_id);
    await this.prisma.formation.update({
      where: { id: formation_id },
      data: { statut: 'EN_ATTENTE_VALIDATION' }
    });

    await this.audit.info('FORMATION_PARTENAIRE_RESOUMISE', { formation_id, partenaire_id, version: fp.version + 1 });
    return { message: `Formation resoumise (version ${fp.version + 1}).` };
  }

  // UCS17 — Dashboard Partenaire (RM-130 : commission FORGES masquée)
  async getDashboard(partenaire_id: string) {
    const [formations, reversementsNets] = await Promise.all([
      this.partenaireRepo.findFormationsPartenaire(partenaire_id),
      this.partenaireRepo.findReversementsNets(partenaire_id),
    ]);

    const totalEnAttente = reversementsNets
      .filter(r => r.statut === 'EN_ATTENTE')
      .reduce((s, r) => s + r.montant_reverse, 0);

    const totalPercu = reversementsNets
      .filter(r => r.statut === 'REVERSE')
      .reduce((s, r) => s + r.montant_reverse, 0);

    return {
      formations: formations.map(f => ({
        id: f.id,
        intitule: f.intitule,
        statut: f.statut,
        statut_validation: f.formation_partenaire?.statut_validation,
        nb_certifies: f._count.dossiers,
        // RM-130 : prix_catalogue et commission JAMAIS exposés
      })),
      reversements: {
        en_attente_xof: totalEnAttente,
        percus_xof: totalPercu,
        historique: reversementsNets,
        // RM-130 : commission_forges_pct ABSENT
      }
    };
  }

  // GET /api/partenaires/formations — Liste mes formations
  async getMesFormations(partenaire_id: string, query: any) {
    const partenaire = await this.partenaireRepo.findById(partenaire_id);
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    const formations = await this.partenaireRepo.findFormationsPartenaire(partenaire_id);

    // Filtrage optionnel par statut si fourni dans query
    let filtered = formations;
    if (query.statut) {
      filtered = formations.filter(f => f.statut === query.statut);
    }
    if (query.statut_validation) {
      filtered = filtered.filter(f => f.formation_partenaire?.statut_validation === query.statut_validation);
    }

    return filtered.map(f => ({
      id: f.id,
      intitule: f.intitule,
      description_courte: f.description_courte,
      mode_formation: f.mode_formation,
      duree_jours: f.duree_jours,
      statut: f.statut,
      statut_validation: f.formation_partenaire?.statut_validation,
      date_soumission: f.formation_partenaire?.date_soumission,
      date_validation: f.formation_partenaire?.date_validation,
      nb_certifies: f._count?.dossiers || 0,
      // RM-130 : prix_catalogue et commission_forges_pct JAMAIS exposés
    }));
  }

  // GET /api/partenaires/formations/:id — Détail d'une formation
  async getFormationDetail(formation_id: string, partenaire_id: string) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formation_id },
      include: {
        formation_partenaire: true,
        _count: { select: { dossiers: { where: { statut: 'PAYE' } } } }
      }
    });

    if (!formation) throw new Error('FORMATION_NOT_FOUND');
    if (formation.partenaire_id !== partenaire_id) throw new Error('NOT_YOUR_FORMATION');

    return {
      id: formation.id,
      intitule: formation.intitule,
      description_courte: formation.description_courte,
      description_longue: formation.description_longue,
      mode_formation: formation.mode_formation,
      duree_jours: formation.duree_jours,
      langues_disponibles: formation.langues_disponibles,
      certification_delivree: formation.certification_delivree,
      public_cible: formation.public_cible,
      objectifs_pedagogiques: formation.objectifs_pedagogiques,
      prerequis: formation.prerequis,
      statut: formation.statut,
      statut_validation: formation.formation_partenaire?.statut_validation,
      prix_coutant_soumis: formation.formation_partenaire?.prix_coutant_soumis,
      prix_coutant_valide: formation.formation_partenaire?.prix_coutant_valide,
      commentaire_responsable: formation.formation_partenaire?.commentaire_responsable,
      corrections_suggeres: formation.formation_partenaire?.corrections_suggeres,
      version: formation.formation_partenaire?.version,
      date_soumission: formation.formation_partenaire?.date_soumission,
      date_validation: formation.formation_partenaire?.date_validation,
      nb_certifies: formation._count.dossiers,
      // RM-130 : cout_catalogue et commission JAMAIS exposés
    };
  }

  // PUT /api/partenaires/formations/:id — Éditer brouillon
  async editerFormationBrouillon(formation_id: string, dto: SoumettreFormationDto, partenaire_id: string) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formation_id },
      include: { formation_partenaire: true }
    });

    if (!formation) throw new Error('FORMATION_NOT_FOUND');
    if (formation.partenaire_id !== partenaire_id) throw new Error('NOT_YOUR_FORMATION');
    if (formation.statut !== 'BROUILLON') throw new Error('NOT_BROUILLON');

    // Mise à jour de la formation
    const updated = await this.prisma.formation.update({
      where: { id: formation_id },
      data: {
        intitule: dto.intitule,
        description_courte: dto.description_courte,
        description_longue: dto.description_longue,
        duree_jours: dto.duree_jours,
        mode_formation: dto.mode_formation,
        langues_disponibles: dto.langues_disponibles,
        certification_delivree: dto.certification_delivree,
        public_cible: dto.public_cible,
        objectifs_pedagogiques: dto.objectifs_pedagogiques,
        prerequis: dto.prerequis,
      }
    });

    // Mise à jour du prix coûtant dans FormationPartenaire
    if (formation.formation_partenaire) {
      await this.prisma.formationPartenaire.update({
        where: { id: formation.formation_partenaire.id },
        data: { prix_coutant_soumis: dto.prix_coutant_propose }
      });
    }

    await this.audit.info('FORMATION_BROUILLON_EDITE', { formation_id, partenaire_id });

    return { success: true, message: 'Formation brouillon mise à jour.' };
  }

  // PUT /api/partenaires/formations/:id/soumettre — Soumettre brouillon
  async soumettreFormationBrouillon(formation_id: string, partenaire_id: string) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formation_id },
      include: { formation_partenaire: true }
    });

    if (!formation) throw new Error('FORMATION_NOT_FOUND');
    if (formation.partenaire_id !== partenaire_id) throw new Error('NOT_YOUR_FORMATION');
    if (formation.statut !== 'BROUILLON') throw new Error('NOT_BROUILLON');

    const partenaire = await this.partenaireRepo.findById(partenaire_id);
    if (!partenaire || partenaire.statut !== 'ACTIF') throw new Error('PARTENAIRE_INACTIF');

    // Transition BROUILLON → EN_ATTENTE_VALIDATION
    await this.prisma.formation.update({
      where: { id: formation_id },
      data: { statut: 'EN_ATTENTE_VALIDATION' }
    });

    // Mettre à jour FormationPartenaire
    if (formation.formation_partenaire) {
      await this.prisma.formationPartenaire.update({
        where: { id: formation.formation_partenaire.id },
        data: {
          statut_validation: 'EN_ATTENTE',
          date_soumission: new Date(),
        }
      });
    }

    // RM-128 : notifier Responsable désigné
    if (partenaire.responsable_designe_id) {
      await this.email.sendNouvelleFormationAValider(
        partenaire.responsable_designe_id,
        formation.intitule,
        'FR'
      );
    }

    await this.audit.info('FORMATION_BROUILLON_SOUMISE', { formation_id, partenaire_id });

    return { success: true, message: 'Formation soumise pour validation.' };
  }

  // GET /api/partenaires/reversements — Mes reversements (RM-138)
  async getMesReversements(partenaire_id: string, query: any) {
    const partenaire = await this.partenaireRepo.findById(partenaire_id);
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    const reversements = await this.partenaireRepo.findReversementsNets(partenaire_id);

    // Filtrage optionnel par statut
    let filtered = reversements;
    if (query.statut) {
      filtered = reversements.filter(r => r.statut === query.statut);
    }

    const totalEnAttente = filtered
      .filter(r => r.statut === 'EN_ATTENTE')
      .reduce((s, r) => s + r.montant_reverse, 0);

    const totalReverse = filtered
      .filter(r => r.statut === 'REVERSE')
      .reduce((s, r) => s + r.montant_reverse, 0);

    return {
      reversements: filtered.map(r => ({
        montant_reverse_xof: r.montant_reverse,
        statut: r.statut,
        formation_intitule: r.formation?.intitule,
        date_creation: r.created_at,
        date_reversement: r.reverse_le,
        // RM-130 : commission_forges_pct et cout_catalogue JAMAIS exposés
      })),
      totaux: {
        en_attente_xof: totalEnAttente,
        reverses_xof: totalReverse,
      }
    };
  }

  async getProfil(partenaire_id: string, requester: { role?: string; userId?: string }) {
    if (!requester || requester.role !== 'PARTENAIRE' || requester.userId !== partenaire_id) {
      throw new Error('FORBIDDEN');
    }

    const partenaire = await this.partenaireRepo.getProfil(partenaire_id);
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    return {
      id: partenaire.id,
      raison_sociale: partenaire.raison_sociale,
      type: partenaire.type,
      pays: partenaire.pays,
      email_principal: partenaire.email_principal,
      email: partenaire.email_principal,
      statut: partenaire.statut,
      mode_inscription: partenaire.mode_inscription,
      responsable_designe_id: partenaire.responsable_designe_id || null,
      created_at: partenaire.created_at,
      nb_formations: partenaire.formations?.length || 0,
    };
  }

  async updateProfil(partenaire_id: string, dto: UpdateProfilPartenaireDto, requester: { role?: string; userId?: string }) {
    if (!requester || requester.role !== 'PARTENAIRE' || requester.userId !== partenaire_id) {
      throw new Error('FORBIDDEN');
    }

    const partenaire = await this.partenaireRepo.getProfil(partenaire_id);
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    if (dto.email_principal && dto.email_principal !== partenaire.email_principal) {
      const duplicate = await this.partenaireRepo.findByEmail(dto.email_principal);
      if (duplicate && duplicate.id !== partenaire_id) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
    }

    const updated = await this.partenaireRepo.updateProfil(partenaire_id, {
      ...(dto.raison_sociale ? { raison_sociale: dto.raison_sociale } : {}),
      ...(dto.email_principal ? { email_principal: dto.email_principal } : {}),
      ...(dto.pays ? { pays: dto.pays } : {}),
    });

    await this.audit.info('PARTENAIRE_PROFIL_MAJ', { partenaire_id });

    return {
      id: updated.id,
      raison_sociale: updated.raison_sociale,
      type: updated.type,
      pays: updated.pays,
      email_principal: updated.email_principal,
      email: updated.email_principal,
      statut: updated.statut,
      mode_inscription: updated.mode_inscription,
      responsable_designe_id: updated.responsable_designe_id || null,
      created_at: updated.created_at,
      nb_formations: updated.formations?.length || 0,
    };
  }

  // GET /api/agent/reversements/partenaires — AGENT (RM-138, RM-132)
  async getReversementsEnAttente(agentId: string) {
    // RM-138 : seuil minimum 50 000 XOF (stocké en centimes)
    const seuil = parseInt(process.env.SEUIL_REVERSEMENT_PARTENAIRE_XOF || '50000');

    // 1. Commissions retail (CommissionPartenaire)
    const commissionsRetail = await this.prisma.commissionPartenaire.groupBy({
      by: ['partenaire_id'],
      where: { statut: 'EN_ATTENTE' },
      _sum: { montant_reverse: true },
      _count: { id: true }
    });

    // 2. Commissions abonnement (CommissionPartenaireAbonnement - RM-132)
    const commissionsAbonnement = await this.prisma.commissionPartenaireAbonnement.groupBy({
      by: ['partenaire_id'],
      where: { statut: 'EN_ATTENTE' },
      _sum: { montant_reverse: true },
      _count: { id: true }
    });

    // 3. Fusionner par partenaire_id
    const cumulParPartenaire = new Map<string, { montant: number; nb_commissions: number }>();

    for (const g of commissionsRetail) {
      cumulParPartenaire.set(g.partenaire_id, {
        montant: g._sum.montant_reverse || 0,
        nb_commissions: g._count.id,
      });
    }

    for (const g of commissionsAbonnement) {
      const existant = cumulParPartenaire.get(g.partenaire_id) || { montant: 0, nb_commissions: 0 };
      cumulParPartenaire.set(g.partenaire_id, {
        montant: existant.montant + (g._sum.montant_reverse || 0),
        nb_commissions: existant.nb_commissions + g._count.id,
      });
    }

    // 4. Filtrer >= seuil et enrichir
    const reversementsEnAttente = await Promise.all(
      Array.from(cumulParPartenaire.entries())
        .filter(([, v]) => v.montant >= seuil)
        .map(async ([partenaire_id, v]) => {
          const partenaire = await this.partenaireRepo.findById(partenaire_id);
          if (!partenaire) return null;

          return {
            partenaire_id,
            raison_sociale: partenaire.raison_sociale,
            email: partenaire.email_principal,
            montant_total_xof: v.montant,
            nb_commissions: v.nb_commissions,
          };
        })
    );

    return reversementsEnAttente.filter(r => r !== null);
  }

  // POST /api/agent/reversements/:id/effectuer — AGENT (RM-138)
  async effectuerReversementPartenaire(
    partenaire_id: string,
    agent_id: string,
    data: { preuve_virement?: string; date_execution?: Date }
  ) {
    // Vérifier que le partenaire existe
    const partenaire = await this.partenaireRepo.findById(partenaire_id);
    if (!partenaire) {
      throw new Error('PARTENAIRE_NOT_FOUND');
    }

    // Récupérer commissions retail + abonnement EN_ATTENTE
    const [commissionsRetail, commissionsAbonnement] = await Promise.all([
      this.prisma.commissionPartenaire.findMany({
        where: { partenaire_id, statut: 'EN_ATTENTE' }
      }),
      this.prisma.commissionPartenaireAbonnement.findMany({
        where: { partenaire_id, statut: 'EN_ATTENTE' }
      })
    ]);

    const nbCommissions = commissionsRetail.length + commissionsAbonnement.length;
    if (nbCommissions === 0) {
      throw new Error('AUCUNE_COMMISSION_EN_ATTENTE');
    }

    // Calculer le total (retail + abonnement)
    const totalRetail = commissionsRetail.reduce((sum, c) => sum + c.montant_reverse, 0);
    const totalAbonnement = commissionsAbonnement.reduce((sum, c) => sum + c.montant_reverse, 0);
    const total = totalRetail + totalAbonnement;

    // RM-138 : vérifier seuil minimum (50 000 XOF = 5 000 000 centimes)
    const seuil = parseInt(process.env.SEUIL_REVERSEMENT_PARTENAIRE_XOF || '5000000');

    if (total < seuil) {
      throw new Error('SEUIL_NON_ATTEINT');
    }

    const dateExecution = data.date_execution || new Date();

    // Transition EN_ATTENTE → REVERSE (retail + abonnement)
    await Promise.all([
      this.prisma.commissionPartenaire.updateMany({
        where: { partenaire_id, statut: 'EN_ATTENTE' },
        data: { statut: 'REVERSE', reverse_le: dateExecution, reverse_par: agent_id }
      }),
      this.prisma.commissionPartenaireAbonnement.updateMany({
        where: { partenaire_id, statut: 'EN_ATTENTE' },
        data: { statut: 'REVERSE', reverse_le: dateExecution, reverse_par: agent_id }
      })
    ]);

    // AuditLog
    await this.audit.info('REVERSEMENT_PARTENAIRE_EFFECTUE', {
      partenaire_id,
      agent_id,
      montant_xof: total,
      nb_commissions_retail: commissionsRetail.length,
      nb_commissions_abonnement: commissionsAbonnement.length,
      date_execution: dateExecution
    });

    // Email partenaire (RM-100)
    const periode = dateExecution.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    try {
      await this.email.sendReversementPartenaire(
        partenaire.email_principal,
        partenaire.raison_sociale,
        total,
        nbCommissions,
        periode,
        'FR'
      );
    } catch (error) {
      // Non-bloquant : logger l'erreur d'envoi sans faire échouer le reversement
      await this.audit.error('REVERSEMENT_PARTENAIRE_EMAIL_FAILED', {
        partenaire_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return {
      success: true,
      montant_reverse_xof: total,
      nb_commissions: nbCommissions,
      partenaire: {
        id: partenaire.id,
        raison_sociale: partenaire.raison_sociale
      }
    };
  }
}
