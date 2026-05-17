import { EspaceOrganisationRepository } from './espace-organisation.repository';
import { ImportCSVService } from './import-csv.service';
import { RapportService } from './rapport.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CommissionService } from '../paiements/commission.service';
import { PaiementReglementService } from '../paiements/paiement-reglement.service';

export class EspaceOrganisationService {
  private readonly reglementService: PaiementReglementService;

  constructor(
    private readonly orgRepo: EspaceOrganisationRepository,
    private readonly importCSV: ImportCSVService,
    private readonly rapport: RapportService,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {
    this.reglementService = new PaiementReglementService(
      prisma,
      audit,
      new CommissionService(prisma, audit)
    );
  }

  // UCS12 — Dashboard organisation
  async getDashboard(organisation_id: string) {
    const [org, stats, recent_inscriptions] = await Promise.all([
      this.orgRepo.findOrganisationById(organisation_id),
      this.orgRepo.getStatsOrganisation(organisation_id),
      this.prisma.dossier.findMany({
        where: {
          apprenant: { organisation_id },
          OR: [
            { source_financement: 'B2B' },
            { voucher_organisation_id: { not: null } },
          ],
        },
        include: {
          apprenant: { select: { id: true, nom: true, prenoms: true, email: true } },
          formation: { select: { id: true, intitule: true, type_formation: true } },
          session: { select: { date_debut: true, date_fin: true, statut: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    if (!org) throw new Error('ORGANISATION_NOT_FOUND');

    // RM-83 : vérification essai expiré
    const essaiExpire = org.date_fin_essai && org.date_fin_essai < new Date() && !org.abonnement_org_id;
    const joursRestantsEssai = org.date_fin_essai
      ? Math.max(0, Math.ceil((org.date_fin_essai.getTime() - Date.now()) / (24 * 3600 * 1000)))
      : null;

    return {
      organisation: {
        raison_sociale: org.raison_sociale,
        nom: org.raison_sociale,
        statut: org.statut,
        essai_actif: !!org.date_fin_essai && !essaiExpire,
        jours_restants_essai: joursRestantsEssai,
        essai_expire: essaiExpire,
        abonnement_org: org.abonnement_org,
        abonnement_b2b: org.abonnement_b2b,
      },
      stats,
      recent_inscriptions,
    };
  }

  // UCS12 — Liste bénéficiaires (RM-44)
  async getBeneficiaires(organisation_id: string, filters?: any) {
    return this.orgRepo.findBeneficiaires(organisation_id, filters ?? {});
  }

  // UCS12 — Import CSV bénéficiaires (RM-59)
  async importerBeneficiairesCSV(csvContent: string, organisation_id: string, userId: string) {
    // RM-61 : vérification plafond B2B avant import
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    if (org?.abonnement_b2b) {
      const nbActifs = await this.orgRepo.countActifsB2B(organisation_id);
      if (nbActifs >= org.abonnement_b2b.nb_max) {
        throw new Error('B2B_PLAFOND_ATTEINT');
      }
    }

    return this.importCSV.importerBeneficiaires(csvContent, organisation_id, userId);
  }

  // UCS12 — Mes vouchers
  async getMesVouchers(organisation_id: string) {
    return this.orgRepo.findVouchers(organisation_id);
  }

  // UCS12 — Rapport bailleur PDF
  async getRapportBailleur(organisation_id: string, filters?: any) {
    return this.rapport.genererRapportBailleur(organisation_id, filters);
  }

  // UCS12.1 — Dashboard B2B
  async getDashboardB2B(organisation_id: string) {
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    if (!org?.abonnement_b2b) throw new Error('ABONNEMENT_B2B_INACTIF');

    const nbActifs = await this.orgRepo.countActifsB2B(organisation_id);
    const b2b = org.abonnement_b2b;

    return {
      palier: b2b.palier,
      nb_max: b2b.nb_max,
      nb_actifs: nbActifs,
      places_restantes: b2b.nb_max - nbActifs,
      taux_utilisation: Math.round(nbActifs / b2b.nb_max * 100),
      // RM-69 : alerte si plafond proche
      alerte_plafond: nbActifs >= b2b.nb_max * 0.9,
      date_renouvellement: b2b.date_renouvellement,
    };
  }

  // UCS12.1 — Désactivation apprenant B2B (RM-62 : certifications conservées)
  async desactiverBeneficiaire(apprenant_id: string, organisation_id: string, userId: string) {
    const apprenant = await this.prisma.apprenant.findFirst({
      where: { id: apprenant_id, organisation_id }
    });

    if (!apprenant) throw new Error('APPRENANT_NOT_FOUND');

    // RM-62 : désactivation seulement — pas de suppression — certifications conservées
    await this.prisma.apprenant.update({
      where: { id: apprenant_id },
      data: { statut: 'INACTIF' }
    });

    // Décrémenter nb_actifs B2B
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    if (org?.abonnement_b2b_id) {
      await this.prisma.abonnementB2B.update({
        where: { id: org.abonnement_b2b_id },
        data: { nb_actifs: { decrement: 1 } }
      });
    }

    await this.audit.info('BENEFICIAIRE_DESACTIVE', {
      apprenant_id,
      organisation_id,
      user_id: userId,
      note: 'Certifications conservées (RM-62)'
    });

    return { message: 'Bénéficiaire désactivé. Ses certifications sont conservées (RM-62).' };
  }

  // UCS12 — Créer un membre individuel
  async createMembre(organisation_id: string, data: any) {
    // Vérifier si l'email existe déjà
    const existing = await this.prisma.apprenant.findUnique({
      where: { email: data.email }
    });

    if (existing) throw new Error('EMAIL_DEJA_UTILISE');

    // RM-61 : vérification plafond B2B avant création
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    if (org?.abonnement_b2b) {
      const nbActifs = await this.orgRepo.countActifsB2B(organisation_id);
      if (nbActifs >= org.abonnement_b2b.nb_max) {
        throw new Error('B2B_PLAFOND_ATTEINT');
      }
    }

    // Générer mot de passe temporaire
    const tempPassword = uuidv4().substring(0, 12) + 'A1!';
    const password_hash = await hash(tempPassword, 12);

    // Créer l'apprenant
    const apprenant = await this.prisma.apprenant.create({
      data: {
        email: data.email,
        password_hash,
        nom: data.nom,
        prenoms: data.prenom,
        secteur_activite: data.secteur_activite,
        niveau_etude: data.niveau_etude,
        organisation_id,
        statut: 'ACTIF',
        type_apprenant: 'PROFESSIONNEL',
        pays_residence: 'SN', // Défaut Sénégal
        pays_nationalite: 'SN',
        langue_preferee: 'FR',
        consentement_rgpd: false,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      }
    });

    // Incrémenter nb_actifs B2B si applicable
    if (org?.abonnement_b2b_id) {
      await this.prisma.abonnementB2B.update({
        where: { id: org.abonnement_b2b_id },
        data: { nb_actifs: { increment: 1 } }
      });
    }

    await this.audit.info('MEMBRE_CREE', {
      apprenant_id: apprenant.id,
      organisation_id,
    });

    // Envoi identifiants par email
    await this.email.sendTempPassword(data.email, tempPassword, 'FR');

    return { message: 'Membre créé avec succès', apprenant };
  }

  // UCS12 — Commander des vouchers
  async commanderVouchers(organisation_id: string, data: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: data.formation_id }
    });

    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    // Créer les vouchers
    // Note: TypeVoucherApporteur n'a que APPORT et PROMOTIONNEL
    // Les vouchers organisation utilisent PROMOTIONNEL et sont distingués par organisation_id
    const vouchers = [];
    for (let i = 0; i < data.quantite; i++) {
      const voucher = await this.prisma.voucherApporteur.create({
        data: {
          organisation_id,
          formation_id: data.formation_id,
          code: `ORG-${Date.now()}-${i}`,
          statut: 'ACTIF',
          type: 'PROMOTIONNEL', // Les vouchers org utilisent PROMOTIONNEL (distingués par organisation_id)
          valeur: formation.cout_catalogue || 0,
          type_valeur: 'MONTANT',
          date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000), // 1 an
        }
      });
      vouchers.push(voucher);
    }

    await this.audit.info('VOUCHERS_COMMANDES', {
      organisation_id,
      formation_id: data.formation_id,
      quantite: data.quantite,
    });

    return { message: `${data.quantite} vouchers créés avec succès`, vouchers };
  }

  // UCS12 — Suivi des inscriptions (tous dossiers de l'organisation, pas seulement B2B)
  async getSuiviInscriptions(organisation_id: string, filters: any) {
    const { page = 1, limit = 20, statut, formation_id } = filters || {};
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {
      apprenant: { organisation_id },
      // UCS12 : l'org ne voit que les inscriptions qu'elle commande (B2B ou voucher org)
      OR: [
        { source_financement: 'B2B' },
        { voucher_organisation_id: { not: null } },
      ],
    };
    if (statut) where.statut = statut;
    if (formation_id) where.formation_id = formation_id;

    const [dossiers, total] = await Promise.all([
      this.prisma.dossier.findMany({
        where,
        include: {
          apprenant: { select: { id: true, nom: true, prenoms: true, email: true } },
          formation: { select: { id: true, intitule: true, type_formation: true, cout_catalogue: true } },
          session: { select: { date_debut: true, date_fin: true, statut: true } },
          paiement: { select: { statut: true, confirmed_at: true, montant_final: true } },
        },
        skip,
        take: parsedLimit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.dossier.count({ where }),
    ]);

    return { dossiers, total, page: parsedPage, limit: parsedLimit };
  }

  // UCS12 — Historique paiements
  async getMesPaiements(organisation_id: string, filters: any) {
    const { page = 1, limit = 20, date_debut, date_fin } = filters;
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {
      dossier: {
        apprenant: { organisation_id },
        OR: [
          { source_financement: 'B2B' },
          { voucher_organisation_id: { not: null } },
        ],
      }
    };

    if (date_debut) {
      where.confirmed_at = { gte: new Date(date_debut) };
    }
    if (date_fin) {
      where.confirmed_at = { ...where.confirmed_at, lte: new Date(date_fin) };
    }

    const [paiements, total] = await Promise.all([
      this.prisma.paiement.findMany({
        where,
        include: {
          dossier: {
            include: {
              apprenant: { select: { nom: true, prenoms: true, email: true } },
              formation: { select: { intitule: true } }
            }
          }
        },
        skip,
        take: parsedLimit,
        orderBy: { confirmed_at: 'desc' }
      }),
      this.prisma.paiement.count({ where })
    ]);

    return { paiements, total, page: parsedPage, limit: parsedLimit };
  }

  // UCS12 — Inscrire un bénéficiaire à une formation (org initie l'inscription)
  async inscrireBeneficiaire(organisation_id: string, data: {
    beneficiaire_id: string;
    session_id: string;
    source_financement: 'B2B' | 'VOUCHER';
    voucher_organisation_id?: string;
  }): Promise<{ dossier_id: string; statut: string }> {
    // 1. Vérifier que le bénéficiaire appartient à l'org
    const beneficiaire = await this.prisma.apprenant.findFirst({
      where: { id: data.beneficiaire_id, organisation_id }
    });
    if (!beneficiaire) throw new Error('APPRENANT_NON_BENEFICIAIRE');

    // 2. Vérifier unicité — pas déjà inscrit à cette session
    const existing = await this.prisma.dossier.findFirst({
      where: { apprenant_id: data.beneficiaire_id, session_id: data.session_id }
    });
    if (existing) throw new Error('INSCRIPTION_DEJA_EXISTANTE');

    // 3. Récupérer session + formation et appliquer les invariants InscriptionService
    const session = await (this.prisma as any).session.findUnique({
      where: { id: data.session_id },
      include: { formation: { include: { partenaire: true } } },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (typeof session.places_restantes === 'number' && session.places_restantes <= 0) {
      throw new Error('SESSION_COMPLETE');
    }

    // RM-15 : unicité apprenant/formation cross-sessions
    const inscriptionFormation = await this.prisma.dossier.findFirst({
      where: {
        apprenant_id: data.beneficiaire_id,
        formation_id: session.formation_id,
        statut: { notIn: ['ANNULE', 'REJETE'] },
      },
    });
    if (inscriptionFormation) throw new Error('INSCRIPTION_DEJA_EXISTANTE');

    const extraData: Record<string, any> = {};
    let voucherOrg: any = null;

    if (data.source_financement === 'B2B') {
      // 4a. Vérifier quota B2B (RM-61)
      const org = await this.orgRepo.findOrganisationById(organisation_id);
      if (org?.abonnement_b2b) {
        const nbActifs = await this.orgRepo.countActifsB2B(organisation_id);
        if (nbActifs >= org.abonnement_b2b.nb_max) throw new Error('B2B_PLAFOND_ATTEINT');
      }
    } else {
      // 4b. Valider le VoucherOrganisation
      voucherOrg = await (this.prisma as any).voucherOrganisation.findFirst({
        where: { id: data.voucher_organisation_id, organisation_id, statut: 'ACTIF' }
      });
      if (!voucherOrg) throw new Error('VOUCHER_INVALIDE');
      if (voucherOrg.formation_id && voucherOrg.formation_id !== session.formation_id) {
        throw new Error('VOUCHER_WRONG_FORMATION');
      }
      extraData.voucher_organisation_id = data.voucher_organisation_id;
    }

    const montant = session?.formation?.cout_catalogue ?? 0;

    // 5. Créer le dossier — org couvre toujours le coût → statut PAYE
    const dossier = await this.prisma.dossier.create({
      data: {
        apprenant_id: data.beneficiaire_id,
        session_id: data.session_id,
        formation_id: session.formation_id,
        source_financement: data.source_financement,
        statut: 'PAYE',
        organisation_inscriptrice_id: organisation_id,
        ...extraData,
      } as any,
    });

    // 6. Créer le paiement interne puis le confirmer via le règlement commun
    await this.creerPaiementOrganisationConfirme(
      dossier,
      session,
      montant,
      data.source_financement === 'B2B' ? 'B2B_ORG' : 'VOUCHER_ORG'
    );

    // 7. Incrémenter quota du voucher organisation si utilisé
    if (voucherOrg) {
      const updatedVoucher = await (this.prisma as any).voucherOrganisation.update({
        where: { id: voucherOrg.id },
        data: { quota_utilise: { increment: 1 } },
      });
      if (updatedVoucher.quota_max && updatedVoucher.quota_utilise >= updatedVoucher.quota_max) {
        await (this.prisma as any).voucherOrganisation.update({
          where: { id: voucherOrg.id },
          data: { statut: 'EPUISE' },
        });
      }
    }

    // 8. Notification email au bénéficiaire
    await (this.email as any).sendEmail({
      to: beneficiaire.email,
      subject: 'Votre organisation vous a inscrit a une formation',
      html: '<p>Votre organisation vous a inscrit a une formation. Consultez votre espace apprenant.</p>',
    });

    // 9. Audit
    await this.audit.info('BENEFICIAIRE_INSCRIT_PAR_ORGANISATION', {
      organisation_id,
      beneficiaire_id: data.beneficiaire_id,
      session_id: data.session_id,
      source_financement: data.source_financement,
      dossier_id: dossier.id,
    });

    return { dossier_id: dossier.id, statut: 'PAYE' };
  }

  private async creerPaiementOrganisationConfirme(
    dossier: any,
    session: any,
    montant: number,
    methode: 'B2B_ORG' | 'VOUCHER_ORG'
  ) {
    const paiementExistant = await this.prisma.paiement.findUnique({ where: { dossier_id: dossier.id } });
    const paiement = paiementExistant || await this.prisma.paiement.create({
      data: {
        dossier_id: dossier.id,
        montant_catalogue: montant,
        montant_final: montant,
        montant_initie: montant,
        reduction_appliquee: 0,
        methode,
        statut: 'PENDING',
        provider: 'INTERNE',
        order_ngser: `ORG-${dossier.id}`,
      } as any,
    });

    if (paiement.statut === 'CONFIRME') return paiement;

    await this.reglementService.confirmerProvider({
      paiement: {
        ...paiement,
        dossier: {
          ...dossier,
          formation: session.formation,
          session,
        },
      },
      transactionId: `ORG-${methode}-${dossier.id}`,
      providerStatus: 'SUCCESS',
      payload: { source: methode },
    });

    return paiement;
  }

  // UCS12 — Mon profil
  async getMonProfil(organisation_id: string) {
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    if (!org) throw new Error('ORGANISATION_NOT_FOUND');

    return {
      id: org.id,
      raison_sociale: org.raison_sociale,
      email: org.email,
      contact_referent: org.contact_referent,
      type: org.type,
      sous_types: org.sous_types,
      pays: org.pays,
      langue_preferee: org.langue_preferee,
      statut: org.statut,
    };
  }

  // UCS12 — Mise à jour profil
  async updateMonProfil(organisation_id: string, data: any) {
    const updated = await this.prisma.organisation.update({
      where: { id: organisation_id },
      data: {
        raison_sociale: data.raison_sociale,
        email: data.email,
        contact_referent: data.contact_referent,
        pays: data.pays,
        langue_preferee: data.langue_preferee,
      }
    });

    await this.audit.info('PROFIL_ORGANISATION_MIS_A_JOUR', {
      organisation_id,
    });

    return { message: 'Profil mis à jour avec succès', organisation: updated };
  }
}
