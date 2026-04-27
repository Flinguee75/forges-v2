import { ApporteurRepository, SEUIL_REVERSEMENT_DEFAUT } from './apporteur.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';
import { RegisterApporteurDto, UpdateProfilApporteurDto } from './dto/profil.dto';

export class ApporteurService {
  constructor(
    private readonly apporteurRepo: ApporteurRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // UCS19 — Validation code apporteur lors d'une transaction (RM-143)
  async validerCode(code: string, voucher_code?: string): Promise<{
    valide: boolean;
    apporteur_id?: string;
    taux?: number;
    message?: string;
  }> {
    // RM-143 : vérifier code existant + statut ACTIF
    const apporteur = await this.apporteurRepo.findByCode(code);

    if (!apporteur) {
      // RM-143 alt1 : code invalide → transaction continue sans code
      return { valide: false, message: 'Code apporteur invalide ou inactif.' };
    }

    // RM-144 : non-cumulable avec un autre voucher
    if (voucher_code) {
      return {
        valide: false,
        message: 'Code apporteur non cumulable avec un autre voucher (RM-144). Choisissez l\'un ou l\'autre.'
      };
    }

    return {
      valide: true,
      apporteur_id: apporteur.id,
      taux: apporteur.taux_commission_pct,
    };
  }

  // UCS20 — Dashboard Apporteur (RM-142, RM-145, RM-147, RM-148)
  async getDashboard(apporteur_id: string) {
    const apporteur = await this.apporteurRepo.findById(apporteur_id);
    if (!apporteur) throw new Error('APPORTEUR_NOT_FOUND');

    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

    const [commissionsMois, cumulDu, historique] = await Promise.all([
      this.apporteurRepo.aggregerCommissionsMois(apporteur_id, maintenant),
      this.apporteurRepo.getCumulDu(apporteur_id),
      this.apporteurRepo.findCommissions(apporteur_id, { statut: 'REVERSEE' }),
    ]);

    const seuil = SEUIL_REVERSEMENT_DEFAUT;

    return {
      // RM-142 : code UUID permanent toujours visible
      code_apporteur: apporteur.code_apporteur,
      lien_parrainage: `https://forges-group.com/register?ref=${apporteur.code_apporteur}`,
      taux_commission_pct: apporteur.taux_commission_pct,
      statut: apporteur.statut,

      // Stats mois courant (RM-145, RM-148)
      stats_mois: {
        nb_transactions: commissionsMois.nb_transactions,
        ca_genere_xof: commissionsMois.montant_total / (apporteur.taux_commission_pct / 100),
        commission_xof: commissionsMois.montant_total,
      },

      // Cumul en attente (RM-147)
      cumul_du_xof: cumulDu,
      seuil_reversement_xof: seuil,
      progression_seuil_pct: Math.min(100, Math.round(cumulDu / seuil * 100)),
      message_seuil: cumulDu >= seuil
        ? 'Reversement en cours de traitement.'
        : `En cours d'accumulation — reversement dès ${seuil.toLocaleString()} XOF atteints.`,

      // Historique reversements (RM-147)
      historique_reversements: historique.map(h => ({
        montant_xof: h.montant_commission,
        statut: h.statut,
        date: h.reverse_le || h.created_at,
      })),
    };
  }

  // UCS20 — Détail commissions par mois (RM-145)
  async getCommissionsParMois(apporteur_id: string, mois?: Date) {
    const commissions = await this.apporteurRepo.findCommissions(
      apporteur_id,
      { mois: mois || new Date() }
    );

    return commissions.map(c => ({
      id: c.id,
      paiement_id: c.paiement_id,
      montant_base_xof: c.montant_base,
      taux_pct: c.taux_commission_pct,
      commission_xof: c.montant_commission,
      statut: c.statut,
      date: c.created_at,
      paiement: c.paiement,
    }));
  }

  async getProfil(apporteur_id: string, requester?: { role?: string; userId?: string }) {
    if (!requester || requester.role !== 'APPORTEUR' || requester.userId !== apporteur_id) {
      throw new Error('FORBIDDEN');
    }

    const apporteur = await this.apporteurRepo.getProfil(apporteur_id);
    if (!apporteur) throw new Error('APPORTEUR_NOT_FOUND');

    return {
      id: apporteur.id,
      nom: apporteur.nom,
      type: apporteur.type,
      email: apporteur.email,
      telephone: apporteur.telephone || '',
      pays: apporteur.pays || '',
      code_apporteur: apporteur.code_apporteur,
      taux_commission_pct: apporteur.taux_commission_pct,
      statut: apporteur.statut,
      date_inscription: apporteur.date_inscription,
      commissions_count: apporteur._count?.commissions || 0,
      voucher: apporteur.voucher || null,
    };
  }

  async updateProfil(apporteur_id: string, dto: UpdateProfilApporteurDto, requester?: { role?: string; userId?: string }) {
    if (!requester || requester.role !== 'APPORTEUR' || requester.userId !== apporteur_id) {
      throw new Error('FORBIDDEN');
    }

    const apporteur = await this.apporteurRepo.getProfil(apporteur_id);
    if (!apporteur) throw new Error('APPORTEUR_NOT_FOUND');

    if (dto.email && dto.email !== apporteur.email) {
      const duplicate = await this.apporteurRepo.findByEmail(dto.email);
      if (duplicate && duplicate.id !== apporteur_id) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
    }

    const updated = await this.apporteurRepo.updateProfil(apporteur_id, {
      ...(dto.nom ? { nom: dto.nom } : {}),
      ...(dto.email ? { email: dto.email } : {}),
      ...(dto.telephone ? { telephone: dto.telephone } : {}),
      ...(dto.pays ? { pays: dto.pays } : {}),
    });

    await this.audit.info('APPORTEUR_PROFIL_MAJ', { apporteur_id });

    return {
      id: updated.id,
      nom: updated.nom,
      type: updated.type,
      email: updated.email,
      telephone: updated.telephone || '',
      pays: updated.pays || '',
      code_apporteur: updated.code_apporteur,
      taux_commission_pct: updated.taux_commission_pct,
      statut: updated.statut,
      date_inscription: updated.date_inscription,
      commissions_count: updated._count?.commissions || 0,
      voucher: updated.voucher || null,
    };
  }

  async register(dto: RegisterApporteurDto, ip?: string) {
    const existing = await this.apporteurRepo.findByEmail(dto.email);
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Apporteur en attente de vérification — mot de passe défini lors de l'activation
    const created = await this.prisma.apporteur.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        password_hash: 'PENDING_ACTIVATION',
        telephone: dto.telephone || null,
        pays: null,
        type: dto.type,
        statut: 'EN_ATTENTE_VERIFICATION',
      },
    });

    await this.audit.info('APPORTEUR_REGISTER', {
      apporteur_id: created.id,
      email: created.email,
      ip: ip || null,
    });

    return {
      message: 'Demande enregistrée. Votre compte est en attente de vérification.',
      workflow_status: 'EN_ATTENTE_VERIFICATION',
      apporteur: {
        id: created.id,
        nom: created.nom,
        type: created.type,
        email: created.email,
        telephone: created.telephone || '',
        pays: created.pays || '',
        code_apporteur: created.code_apporteur,
        taux_commission_pct: created.taux_commission_pct,
        statut: created.statut,
        date_inscription: created.date_inscription,
        commissions_count: 0,
        voucher: null,
      },
    };
  }

  // Scheduler fin de mois — agrégation + validation (RM-146)
  async traiterFinDeMois() {
    const moisPrecedent = new Date();
    moisPrecedent.setMonth(moisPrecedent.getMonth() - 1);

    const apporteurs = await this.prisma.apporteur.findMany({
      where: { statut: 'ACTIF' }
    });

    let totalAgregees = 0;
    let eligiblesReversement = 0;

    for (const apporteur of apporteurs) {
      // RM-146 : agréger commissions du mois → VALIDEE
      const agg = await this.apporteurRepo.aggregerCommissionsMois(apporteur.id, moisPrecedent);

      if (agg.nb_transactions > 0) {
        await this.apporteurRepo.validerCommissionsMois(apporteur.id, moisPrecedent);
        totalAgregees += agg.montant_total;

        // RM-147 : vérifier si cumul >= seuil
        const cumulDu = await this.apporteurRepo.getCumulDu(apporteur.id);
        if (cumulDu >= SEUIL_REVERSEMENT_DEFAUT) {
          eligiblesReversement++;
        }

        await this.audit.info('COMMISSIONS_AGREGEES', {
          apporteur_id: apporteur.id,
          montant: agg.montant_total,
          nb_transactions: agg.nb_transactions,
        });
      }
    }

    return {
      nb_apporteurs_traites: apporteurs.length,
      montant_total_agregé_xof: totalAgregees,
      nb_eligibles_reversement: eligiblesReversement,
    };
  }

  // Agent Comptable — effectuer reversements éligibles (RM-147)
  async effectuerReversements(agentId: string) {
    const eligibles = await this.apporteurRepo.findEligiblesReversement();
    let totalReverses = 0;

    for (const item of eligibles) {
      const apporteur = await this.apporteurRepo.findById(item.apporteur_id);
      if (!apporteur) continue;

      const montant = item._sum.montant_commission || 0;
      await this.apporteurRepo.marquerReverseesCommePayees(apporteur.id, agentId);

      await this.audit.info('REVERSEMENT_APPORTEUR_EFFECTUE', {
        apporteur_id: apporteur.id,
        montant_xof: montant,
        agent_id: agentId,
      });

      // RM-100 : notifier apporteur avec template HTML
      const nbCommissions = await this.prisma.commissionApporteur.count({
        where: { apporteur_id: apporteur.id, statut: 'REVERSE' }
      });
      const periode = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await this.email.sendReversementApporteur(
        apporteur.email,
        apporteur.nom,
        montant,
        nbCommissions,
        periode,
        'FR'
      );

      totalReverses += montant;
    }

    return {
      nb_reversements: eligibles.length,
      montant_total_xof: totalReverses,
    };
  }

  async effectuerReversementApporteur(apporteur_id: string, agentId: string) {
    const apporteur = await this.apporteurRepo.findById(apporteur_id);
    if (!apporteur) throw new Error('APPORTEUR_NOT_FOUND');

    const montant = await this.apporteurRepo.getCumulDu(apporteur_id);
    if (montant <= 0) throw new Error('AUCUNE_COMMISSION_EN_ATTENTE');

    const seuil = parseInt(process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF || '500000');
    if (montant < seuil) throw new Error('SEUIL_NON_ATTEINT');

    await this.apporteurRepo.marquerReverseesCommePayees(apporteur_id, agentId);

    await this.audit.info('REVERSEMENT_APPORTEUR_EFFECTUE', {
      apporteur_id,
      montant_xof: montant,
      agent_id: agentId,
    });

    return {
      apporteur_id,
      montant_total_xof: montant,
      message: 'Reversement apporteur effectué.'
    };
  }

  // GET /api/agent/reversements/apporteurs — AGENT (RM-147)
  async getCommissionsEnAttente(agentId: string) {
    // RM-147 : seuil minimum 5 000 XOF (stocké en centimes = 500 000)
    const seuil = parseInt(process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF || '500000'); // 5 000 XOF = 500 000 centimes

    // Récupérer commissions VALIDEE groupées par apporteur
    const commissionsGroupees = await this.prisma.commissionApporteur.groupBy({
      by: ['apporteur_id'],
      where: { statut: 'VALIDEE' },
      _sum: {
        montant_commission_xof: true
      },
      _count: {
        id: true
      }
    });

    // Filtrer les apporteurs dont le cumul >= seuil
    const reversementsEnAttente = await Promise.all(
      commissionsGroupees
        .filter(g => (g._sum.montant_commission_xof || 0) >= seuil)
        .map(async (g) => {
          const apporteur = await this.apporteurRepo.findById(g.apporteur_id);
          if (!apporteur) return null;

          return {
            apporteur_id: g.apporteur_id,
            nom: apporteur.nom,
            email: apporteur.email,
            code_apporteur: apporteur.code_apporteur,
            montant_total_xof: g._sum.montant_commission_xof || 0,
            nb_commissions: g._count.id
          };
        })
    );

    // Filtrer les null (apporteurs non trouvés)
    return reversementsEnAttente.filter(r => r !== null);
  }

  // RM-147 alt4 : clôture compte → reversement intégral
  async cloturerCompte(apporteur_id: string, agentId: string) {
    const apporteur = await this.apporteurRepo.findById(apporteur_id);
    if (!apporteur) throw new Error('APPORTEUR_NOT_FOUND');

    const cumulDu = await this.apporteurRepo.getCumulDu(apporteur_id);

    if (cumulDu > 0) {
      // Reverser TOUT le solde quel que soit le montant
      await this.apporteurRepo.marquerReverseesCommePayees(apporteur_id, agentId);

      const nbCommissions = await this.prisma.commissionApporteur.count({
        where: { apporteur_id, statut: 'REVERSE' }
      });
      const periode = `Clôture - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      await this.email.sendReversementApporteur(
        apporteur.email,
        apporteur.nom,
        cumulDu,
        nbCommissions,
        periode,
        'FR'
      );

      await this.audit.info('REVERSEMENT_CLOTURE_APPORTEUR', { apporteur_id, montant_xof: cumulDu });
    }

    await this.apporteurRepo.updateStatut(apporteur_id, 'INACTIF');
    await this.audit.info('APPORTEUR_CLOTURE', { apporteur_id, agent_id: agentId });

    return { message: 'Compte clôturé. Solde intégral reversé.', montant_reverse_xof: cumulDu };
  }

  // Superviseur — tableau de bord mensuel (RM-148)
  async getTdbMensuelSuperviseur(mois?: Date) {
    const moisCible = mois || new Date();
    const topApporteurs = await this.apporteurRepo.getTopApporteursMois(moisCible);
    const nbActifs = await this.prisma.apporteur.count({ where: { statut: 'ACTIF' } });
    const totalCommissions = await this.prisma.commissionApporteur.aggregate({
      where: { statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
      _sum: { montant_commission: true }
    });

    return {
      nb_apporteurs_actifs: nbActifs,
      top_apporteurs: topApporteurs,
      commissions_totales_dues_xof: totalCommissions._sum.montant_commission || 0,
    };
  }
}
