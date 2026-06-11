import { PrismaClient } from '@prisma/client';

export class BotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Sessions ConversationBot
  async creerSession(data: {
    utilisateur_id: string;
    type_utilisateur: 'APPRENANT' | 'ORGANISATION';
    flux_actif: string;
    langue: string;
    apprenant_id?: string | null;
    organisation_id?: string | null;
    contexte?: any;
  }) {
    return this.prisma.conversationBot.create({
      data: { ...data, statut: 'EN_COURS', historique: [] }
    });
  }

  async findRecentSessionFeedbackTarget(apprenantId: string, now: Date) {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.prisma.dossier.findFirst({
      where: {
        apprenant_id: apprenantId,
        statut: { in: ['PAYE', 'PAYE_DIRECTEMENT'] },
        session: {
          OR: [
            { statut: { in: ['CLOTUREE', 'TERMINEE'] }, date_fin: { gte: since, lte: now } },
            { statut: 'EN_COURS', date_fin: { gte: startOfToday, lte: endOfToday } },
          ],
        },
        formation: {
          feedbacks: { none: { apprenant_id: apprenantId } },
        },
      },
      select: {
        formation_id: true,
        session_id: true,
        formation: { select: { intitule: true, mode_formation: true } },
      },
      orderBy: { session: { date_fin: 'desc' } },
    });
  }

  async findExpiredOnDemandFeedbackTarget(apprenantId: string, now: Date) {
    return this.prisma.accesFormationDemande.findFirst({
      where: {
        apprenant_id: apprenantId,
        date_expiration: { lte: now },
        statut: 'EXPIRE',
        formation: {
          mode_formation: 'A_LA_DEMANDE',
          feedbacks: { none: { apprenant_id: apprenantId } },
        },
      },
      select: {
        formation_id: true,
        formation: { select: { intitule: true, mode_formation: true } },
      },
      orderBy: { date_expiration: 'desc' },
    });
  }

  async findRecentOrganisationFeedbackTarget(organisationId: string, now: Date) {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return this.prisma.dossier.findFirst({
      where: {
        organisation_inscriptrice_id: organisationId,
        statut: { in: ['PAYE', 'PAYE_DIRECTEMENT'] },
        session: {
          OR: [
            { statut: { in: ['CLOTUREE', 'TERMINEE'] }, date_fin: { gte: since, lte: now } },
            { statut: 'EN_COURS', date_fin: { gte: startOfToday, lte: endOfToday } },
          ],
        },
        formation: {
          feedbacks: { none: { organisation_id: organisationId } },
        },
      },
      select: {
        formation_id: true,
        session_id: true,
        formation: { select: { intitule: true, mode_formation: true } },
      },
      orderBy: { session: { date_fin: 'desc' } },
    });
  }

  async findSession(id: string) {
    return this.prisma.conversationBot.findUnique({ where: { id } });
  }

  async findSessionActive(utilisateur_id: string) {
    return this.prisma.conversationBot.findFirst({
      where: {
        utilisateur_id,
        statut: 'EN_COURS'
      },
      orderBy: { date_debut: 'desc' }
    });
  }

  async updateSession(id: string, data: {
    flux_actif?: string;
    historique?: any[];
    statut?: string;
    dernier_refus_upgrade_le?: Date;
    nb_refus_upgrade?: number;
  }) {
    return this.prisma.conversationBot.update({ where: { id }, data });
  }

  async cloturerSession(id: string, statut: 'TERMINEE' | 'ABANDONNEE') {
    return this.prisma.conversationBot.update({ where: { id }, data: { statut } });
  }

  // RM-120 : vérifier dernier refus upgrade
  async findDernierRefusUpgrade(utilisateur_id: string) {
    return this.prisma.conversationBot.findFirst({
      where: { utilisateur_id, dernier_refus_upgrade_le: { not: null } },
      orderBy: { dernier_refus_upgrade_le: 'desc' },
      select: { dernier_refus_upgrade_le: true, nb_refus_upgrade: true }
    });
  }

  // RM-121 : vérifier si feedback déjà collecté
  async feedbackExiste(apprenant_id: string, formation_id: string): Promise<boolean> {
    const count = await this.prisma.feedbackFormation.count({
      where: { apprenant_id, formation_id }
    });
    return count > 0;
  }

  // RM-121 : sessions clôturées < 7j sans feedback
  async findSessionsSansFeedback(apprenant_id: string) {
    const limite7j = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    return this.prisma.dossier.findMany({
      where: {
        apprenant_id,
        statut: 'PAYE',
        session: { statut: 'CLOTUREE', date_fin: { gte: limite7j } },
        formation_id: {
          notIn: (await this.prisma.feedbackFormation.findMany({
            where: { apprenant_id },
            select: { formation_id: true }
          })).map(f => f.formation_id)
        }
      },
      include: { formation: { select: { id: true, intitule: true } } },
      take: 1
    });
  }

  // RM-122 : enregistrer feedback (5 questions)
  async enregistrerFeedback(data: {
    apprenant_id?: string | null;
    organisation_id?: string | null;
    formation_id: string;
    session_id?: string | null;
    canal?: string;
    note_globale: number;
    note_contenu?: number | null;
    note_formateur?: number | null;
    commentaire_libre?: string | null;
    recommande: boolean;
    session_bot_id: string;
  }) {
    return this.prisma.feedbackFormation.create({ data });
  }

  // RM-118 : enregistrer une demande de contact organisation
  async enregistrerDemandeContact(data: {
    utilisateur_id: string;
    type_utilisateur: string;
    organisation_id?: string | null;
    session_bot_id?: string | null;
    motif: string;
    commentaire?: string | null;
  }) {
    return this.prisma.demandeContactBot.create({
      data: {
        ...data,
        organisation_id: data.organisation_id ?? null,
        session_bot_id: data.session_bot_id ?? null,
        commentaire: data.commentaire ?? null,
      },
    });
  }

  async findDemandesContact(params: {
    statut?: string;
    motif?: string;
    organisation_id?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (params.statut) where.statut = params.statut;
    if (params.motif) where.motif = { contains: params.motif, mode: 'insensitive' };
    if (params.organisation_id) where.organisation_id = params.organisation_id;

    const [demandes, total] = await Promise.all([
      this.prisma.demandeContactBot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date_saisie: 'desc' },
        include: {
          organisation: {
            select: {
              raison_sociale: true,
              contact_referent: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.demandeContactBot.count({ where }),
    ]);

    return {
      demandes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // RM-123/124 : enregistrer enquête catalogue
  async enregistrerEnquete(data: {
    utilisateur_id: string;
    type_utilisateur: string;
    domaine: string;
    niveau: string;
    volume: string;
    session_bot_id: string;
  }) {
    // RM-124 : incrémenter fréquence si enquête similaire existante
    const existante = await this.prisma.enqueteCatalogue.findFirst({
      where: { domaine: data.domaine, niveau: data.niveau }
    });

    if (existante) {
      return this.prisma.enqueteCatalogue.update({
        where: { id: existante.id },
        data: { frequence_demande: { increment: 1 } }
      });
    }

    return this.prisma.enqueteCatalogue.create({
      data: { ...data, frequence_demande: 1 }
    });
  }

  async getEmailApprenant(apprenant_id: string) {
    return this.prisma.apprenant.findUnique({
      where: { id: apprenant_id },
      select: { email: true, prenoms: true, nom: true, langue_preferee: true },
    });
  }

  // RM-125 : lecture seule du profil apprenant — ZERO modification
  async getProfilApprenant(apprenant_id: string) {
    return this.prisma.apprenant.findUnique({
      where: { id: apprenant_id },
      select: {
        type_apprenant: true,
        secteur_activite: true,
        langue_preferee: true,
        abonnement_retail: { select: { offre: true, statut: true } },
      },
    });
  }

  // RM-125 : lecture seule du profil organisation — ZERO modification
  async getProfilOrganisation(organisation_id: string) {
    return this.prisma.organisation.findUnique({
      where: { id: organisation_id },
      select: { langue_preferee: true },
    });
  }

  // RM-125 : lecture seule de l'abonnement B2B — ZERO modification
  async getAbonnementB2B(organisation_id: string) {
    return this.prisma.abonnementB2B.findFirst({
      where: { organisation_id },
      select: { palier: true, statut: true },
    });
  }

  // RM-125 : comptage apprenants actifs d'une organisation — ZERO modification
  async countApprenantsActifsOrganisation(organisation_id: string): Promise<number> {
    return this.prisma.apprenant.count({
      where: { organisation_id, statut: 'ACTIF' },
    });
  }

  // RM-118 : filtrage catalogue par profil
  async filtrerFormations(filtres: {
    type_formation?: string[];
    secteur?: string;
    langue?: string;
    inclus_abonnement?: boolean;
    limit?: number;
  }) {
    // RM-125 : lecture seule, ZERO modification de données
    return this.prisma.formation.findMany({
      where: {
        statut: 'ACTIVE',
        ...(filtres.type_formation && { type_formation: { in: filtres.type_formation } }),
        ...(filtres.langue && { langues_disponibles: { has: filtres.langue } }),
        ...(filtres.inclus_abonnement !== undefined && { inclus_abonnement: filtres.inclus_abonnement }),
      },
      select: {
        id: true, intitule: true, description_courte: true,
        type_formation: true, cout_catalogue: true,
        inclus_abonnement: true, mode_formation: true,
        certification_delivree: true,
      },
      take: filtres.limit || 5, // RM-118 : max 5 formations
      orderBy: [{ certification_delivree: 'desc' }, { created_at: 'desc' }]
    });
  }
}
