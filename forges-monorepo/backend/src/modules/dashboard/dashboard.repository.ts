import { PrismaClient } from '@prisma/client';

type DashboardScope = {
  formations?: any;
  sessions?: any;
  dossiers?: any;
  paiements?: any;
};

type DashboardFilters = {
  date_from?: string | Date;
  date_to?: string | Date;
  formation_id?: string;
  session_id?: string;
  dossier_statut?: string;
  paiement_statut?: string;
  methode?: string;
};

const PAID_DOSSIER_STATUSES = ['PAYE'];
const OPEN_SESSION_STATUSES = ['OUVERTE', 'INSCRIPTIONS_OUVERTES', 'EN_COURS'];
const ACTIVE_ORGANISATION_STATUSES = ['ACTIF', 'ACTIVE'];
const NON_DEVIS_PAIEMENT_REVENUE_WHERE = {
  NOT: {
    dossier: {
      voucher_organisation: {
        is: {
          devis_id: { not: null },
        },
      },
    },
  },
};

function buildDateCondition(dateFrom?: string | Date, dateTo?: string | Date): any {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const createdAt: Record<string, Date> = {};

  if (dateFrom) {
    createdAt.gte = new Date(dateFrom);
  }

  if (dateTo) {
    createdAt.lte = new Date(dateTo);
  }

  return { created_at: createdAt };
}

function mergeWhere(base?: any, ...conditions: Array<any>) {
  const parts = [base, ...conditions].filter((condition) => condition && Object.keys(condition).length > 0) as Record<string, unknown>[];

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return { AND: parts };
}

function normalizeGroupBy(rows: Array<Record<string, any>>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = Object.keys(row).find((field) => field !== '_count');
    if (!key) {
      return acc;
    }

    acc[row[key]] = row._count?._all || row._count || 0;
    return acc;
  }, {});
}

function groupByMonth<T extends { created_at: Date; [key: string]: any }>(
  items: T[],
  valueKey?: keyof T
) {
  const grouped = new Map<string, { count: number; sum: number }>();

  for (const item of items) {
    const date = new Date(item.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = grouped.get(key) || { count: 0, sum: 0 };
    current.count += 1;
    if (valueKey && typeof item[valueKey] === 'number') {
      current.sum += Number(item[valueKey]);
    }
    grouped.set(key, current);
  }

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, stats]) => {
      const [, month] = monthKey.split('-');
      const monthName = monthNames[Number(month) - 1] || month;

      return {
        mois: monthName,
        [valueKey ? String(valueKey) : 'inscriptions']: valueKey ? stats.sum : stats.count,
      };
    });
}

export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getStatsAdmin() {
    const [
      nbApprenants,
      nbOrganisations,
      nbFormations,
      nbSessions,
      nbDossiers,
      paiementsConfirmesHorsDevis,
      devisPayes,
      nbAbonnementsRetailActifs,
      nbAbonnementsB2BActifs,
      dossiersParStatut,
    ] = await Promise.all([
      this.prisma.apprenant.count({ where: { statut: 'ACTIF', role: 'APPRENANT' } }),
      this.prisma.organisation.count({ where: { statut: { in: ACTIVE_ORGANISATION_STATUSES } } }),
      this.prisma.formation.count({ where: { statut: 'ACTIVE' } }),
      this.prisma.session.count({ where: { statut: { in: OPEN_SESSION_STATUSES } } }),
      this.prisma.dossier.count(),
      this.prisma.paiement.aggregate({
        where: mergeWhere({ statut: 'CONFIRME' }, NON_DEVIS_PAIEMENT_REVENUE_WHERE),
        _sum: { montant_final: true },
      }),
      this.prisma.devis.aggregate({ where: { statut: 'PAYE' }, _sum: { montant_total_xof: true } }),
      this.prisma.abonnementRetail.count({ where: { statut: 'ACTIF' } }),
      this.prisma.abonnementB2B.count({ where: { statut: 'ACTIF' } }),
      this.prisma.dossier.groupBy({ by: ['statut'], _count: { _all: true } }),
    ]);

    return {
      nb_apprenants_actifs: nbApprenants,
      nb_organisations_actives: nbOrganisations,
      nb_formations_actives: nbFormations,
      nb_sessions_en_cours: nbSessions,
      nb_dossiers_total: nbDossiers,
      ca_total_xof: (paiementsConfirmesHorsDevis._sum.montant_final || 0) + (devisPayes._sum.montant_total_xof || 0),
      nb_abonnements_retail_actifs: nbAbonnementsRetailActifs,
      nb_abonnements_b2b_actifs: nbAbonnementsB2BActifs,
      dossiers_par_statut: normalizeGroupBy(dossiersParStatut as any),
    };
  }

  async getStatsAgent() {
    const [
      paiementsEnAttente,
      paiementsConfirmesHorsDevis,
      devisPayes,
      totalReversementsPartenaire,
      totalCommissionsApporteur,
      reversementsPartenaireMois,
    ] = await Promise.all([
      this.prisma.paiement.count({ where: { statut: 'EN_ATTENTE' } }),
      this.prisma.paiement.aggregate({
        where: mergeWhere({ statut: 'CONFIRME' }, NON_DEVIS_PAIEMENT_REVENUE_WHERE),
        _sum: { montant_final: true },
      }),
      this.prisma.devis.aggregate({ where: { statut: 'PAYE' }, _sum: { montant_total_xof: true } }),
      this.prisma.commissionPartenaire.aggregate({ where: { statut: 'EN_ATTENTE' }, _sum: { montant_reverse: true } }),
      this.prisma.commissionApporteur.aggregate({ where: { statut: 'EN_ATTENTE' }, _sum: { montant_commission: true } }),
      this.prisma.commissionPartenaire.aggregate({
        where: {
          statut: 'REVERSE',
          reverse_le: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { montant_reverse: true },
      }),
    ]);

    return {
      paiements_en_attente: paiementsEnAttente,
      ca_confirme_xof: (paiementsConfirmesHorsDevis._sum.montant_final || 0) + (devisPayes._sum.montant_total_xof || 0),
      reversements_partenaires_a_effectuer_xof: totalReversementsPartenaire._sum.montant_reverse || 0,
      commissions_apporteurs_a_reverser_xof: totalCommissionsApporteur._sum.montant_commission || 0,
      reversements_partenaires_ce_mois_xof: reversementsPartenaireMois._sum.montant_reverse || 0,
    };
  }

  async getStatsResponsable(responsableId: string) {
    const [dossiersEnAttente, dossiersRetenusUrgents, formationsEnAttente] = await Promise.all([
      this.prisma.dossier.count({
        where: { statut: 'EN_ATTENTE_VERIFICATION', formation: { responsable_id: responsableId } },
      }),
      this.prisma.dossier.findMany({
        where: {
          statut: 'RETENU',
          formation: { responsable_id: responsableId },
          updated_at: { lt: new Date(Date.now() - 24 * 3600 * 1000) },
        },
        select: {
          id: true,
          apprenant: { select: { nom: true, prenoms: true } },
          formation: { select: { intitule: true } },
        },
      }),
      this.prisma.formationPartenaire.count({
        where: { responsable_validateur_id: responsableId, statut_validation: 'EN_ATTENTE' },
      }),
    ]);

    return {
      dossiers_en_attente_verification: dossiersEnAttente,
      dossiers_retenus_urgents: dossiersRetenusUrgents,
      formations_partenaires_a_valider: dossiersEnAttente,
      formations_partenaires_en_attente: formationsEnAttente,
    };
  }

  async getStatsSuperviseur() {
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [
      sessionsOuvertes,
      vouchersEnAttente,
      inscriptionsMois,
      apporteursActifs,
      topApporteursMois,
    ] = await Promise.all([
      this.prisma.session.count({ where: { statut: { in: OPEN_SESSION_STATUSES } } }),
      this.prisma.voucherApporteur.count({ where: { statut: 'BROUILLON', type: 'PROMOTIONNEL' } }),
      this.prisma.dossier.count({ where: { created_at: { gte: debutMois } } }),
      this.prisma.apporteur.count({ where: { statut: 'ACTIF' } }),
      this.prisma.commissionApporteur.groupBy({
        by: ['apporteur_id'],
        where: { created_at: { gte: debutMois } },
        _sum: { montant_commission: true },
        orderBy: { _sum: { montant_commission: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      sessions_ouvertes: sessionsOuvertes,
      vouchers_promo_a_valider: vouchersEnAttente,
      inscriptions_ce_mois: inscriptionsMois,
      apporteurs_actifs: apporteursActifs,
      top_apporteurs_mois: topApporteursMois,
    };
  }

  async getStatsPartenaire(partenaireId: string) {
    const [formations, reversements] = await Promise.all([
      this.prisma.formation.findMany({
        where: { partenaire_id: partenaireId },
        select: {
          id: true,
          intitule: true,
          statut: true,
          type_formation: true,
          formation_partenaire: { select: { statut_validation: true } },
          _count: { select: { dossiers: { where: { statut: 'PAYE' } } } },
        },
      }),
      this.prisma.commissionPartenaire.findMany({
        where: { partenaire_id: partenaireId },
        select: { montant_reverse: true, statut: true, created_at: true },
        orderBy: { created_at: 'desc' },
        take: 12,
      }),
    ]);

    const totalReversementsAttente = reversements
      .filter((item) => item.statut === 'EN_ATTENTE')
      .reduce((sum, item) => sum + Number(item.montant_reverse || 0), 0);

    const totalReversementsPercus = reversements
      .filter((item) => item.statut === 'REVERSE')
      .reduce((sum, item) => sum + Number(item.montant_reverse || 0), 0);

    return {
      formations: formations.map((formation) => ({
        id: formation.id,
        intitule: formation.intitule,
        statut: formation.statut,
        statut_validation: formation.formation_partenaire?.statut_validation,
        nb_certifies: formation._count.dossiers,
      })),
      reversements_nets_en_attente_xof: totalReversementsAttente,
      reversements_nets_percus_xof: totalReversementsPercus,
    };
  }

  async getStatsApporteur(apporteurId: string) {
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [apporteur, commissionsMois, historiqueReversements] = await Promise.all([
      this.prisma.apporteur.findUnique({
        where: { id: apporteurId },
        select: { code_apporteur: true, taux_commission_pct: true, statut: true },
      }),
      this.prisma.commissionApporteur.aggregate({
        where: { apporteur_id: apporteurId, created_at: { gte: debutMois } },
        _sum: { montant_commission: true, montant_base: true },
        _count: { _all: true },
      }),
      this.prisma.commissionApporteur.findMany({
        where: { apporteur_id: apporteurId },
        select: { montant_commission: true, statut: true, created_at: true },
        orderBy: { created_at: 'desc' },
        take: 12,
      }),
    ]);

    const totalEnAttente = historiqueReversements
      .filter((item) => item.statut === 'EN_ATTENTE')
      .reduce((sum, item) => sum + Number(item.montant_commission || 0), 0);

    return {
      code_apporteur: apporteur?.code_apporteur,
      taux_commission_pct: apporteur?.taux_commission_pct,
      transactions_ce_mois: commissionsMois._count._all || commissionsMois._count || 0,
      ca_genere_ce_mois_xof: commissionsMois._sum.montant_base || 0,
      commission_ce_mois_xof: commissionsMois._sum.montant_commission || 0,
      cumul_en_attente_xof: totalEnAttente,
      historique_reversements: historiqueReversements,
    };
  }

  async getStatsOrganisation(organisationId: string) {
    const [nbBeneficiaires, nbInscriptions, nbPayes, abonnementB2B] = await Promise.all([
      this.prisma.apprenant.count({ where: { organisation_id: organisationId, statut: 'ACTIF' } }),
      this.prisma.dossier.count({ where: { apprenant: { organisation_id: organisationId } } }),
      this.prisma.dossier.count({ where: { apprenant: { organisation_id: organisationId }, statut: { in: PAID_DOSSIER_STATUSES } } }),
      this.prisma.abonnementB2B.findFirst({ where: { organisation_id: organisationId, statut: 'ACTIF' } }),
    ]);

    return {
      nb_beneficiaires_actifs: nbBeneficiaires,
      nb_inscriptions: nbInscriptions,
      nb_certifies: nbPayes,
      taux_certification: nbInscriptions > 0 ? Math.round((nbPayes / nbInscriptions) * 100) : 0,
      abonnement_b2b: abonnementB2B
        ? {
            palier: abonnementB2B.palier,
            nb_max: abonnementB2B.nb_max,
            nb_actifs: nbBeneficiaires,
            taux_utilisation: Math.round((nbBeneficiaires / abonnementB2B.nb_max) * 100),
          }
        : null,
    };
  }

  async getGlobalStats(role: string, userId: string, filters: DashboardFilters = {}) {
    const scope = this.buildScope(role, userId);
    const dateCondition = buildDateCondition(filters.date_from, filters.date_to);

    const whereFormations = mergeWhere(
      scope.formations,
      filters.formation_id ? { id: filters.formation_id } : null,
      dateCondition
    );
    const whereSessions = mergeWhere(
      scope.sessions,
      filters.formation_id ? { formation_id: filters.formation_id } : null,
      filters.session_id ? { id: filters.session_id } : null,
      dateCondition
    );
    const whereDossiers = mergeWhere(
      scope.dossiers,
      filters.formation_id ? { formation_id: filters.formation_id } : null,
      filters.session_id ? { session_id: filters.session_id } : null,
      filters.dossier_statut ? { statut: filters.dossier_statut } : null,
      dateCondition
    );
    const wherePaiements = mergeWhere(
      scope.paiements,
      filters.formation_id ? { dossier: { formation_id: filters.formation_id } } : null,
      filters.session_id ? { dossier: { session_id: filters.session_id } } : null,
      filters.paiement_statut ? { statut: filters.paiement_statut } : null,
      filters.methode ? { methode: filters.methode } : null,
      dateCondition
    );

    const [
      totalFormations,
      totalFormationsActives,
      totalSessions,
      totalSessionsOuvertes,
      totalDossiers,
      totalDossiersConfirmes,
      dossiersByStatutRaw,
      paiementsConfirmesAgg,
    ] = await Promise.all([
      this.prisma.formation.count({ where: whereFormations }),
      this.prisma.formation.count({ where: mergeWhere(whereFormations, { statut: 'ACTIVE' }) }),
      this.prisma.session.count({ where: whereSessions }),
      this.prisma.session.count({ where: mergeWhere(whereSessions, { statut: { in: OPEN_SESSION_STATUSES } }) }),
      this.prisma.dossier.count({ where: whereDossiers }),
      this.prisma.dossier.count({ where: mergeWhere(whereDossiers, { statut: { in: PAID_DOSSIER_STATUSES } }) }),
      this.prisma.dossier.groupBy({ by: ['statut'], where: whereDossiers, _count: { _all: true } }),
      this.prisma.paiement.aggregate({
        where: mergeWhere(wherePaiements, { statut: 'CONFIRME' }),
        _count: { _all: true },
        _sum: { montant_final: true },
      }),
    ]);

    return {
      totalFormations,
      totalFormationsActives,
      totalSessions,
      totalSessionsOuvertes,
      totalDossiers,
      totalDossiersConfirmes,
      dossiersByStatut: normalizeGroupBy(dossiersByStatutRaw as any),
      paiementsConfirmes: paiementsConfirmesAgg._count._all || 0,
      montantPayeTotal: paiementsConfirmesAgg._sum.montant_final || 0,
    };
  }

  async getFormationStats(role: string, userId: string, formationId: string, filters: DashboardFilters = {}) {
    const scope = this.buildScope(role, userId);
    const dateCondition = buildDateCondition(filters.date_from, filters.date_to);
    const formationWhere = mergeWhere(scope.formations, { id: formationId });

    const formation = await this.prisma.formation.findFirst({
      where: formationWhere as any,
      select: {
        id: true,
        intitule: true,
        statut: true,
        cout_catalogue: true,
        type_formation: true,
        mode_formation: true,
        responsable_id: true,
      },
    });

    if (!formation) {
      return null;
    }

    const whereSessions = mergeWhere(
      scope.sessions,
      { formation_id: formationId },
      filters.session_id ? { id: filters.session_id } : null,
      dateCondition
    );
    const whereDossiers = mergeWhere(
      scope.dossiers,
      { formation_id: formationId },
      filters.session_id ? { session_id: filters.session_id } : null,
      filters.dossier_statut ? { statut: filters.dossier_statut } : null,
      dateCondition
    );
    const wherePaiements = mergeWhere(
      scope.paiements,
      { dossier: { formation_id: formationId } },
      filters.session_id ? { dossier: { session_id: filters.session_id } } : null,
      filters.paiement_statut ? { statut: filters.paiement_statut } : null,
      filters.methode ? { methode: filters.methode } : null,
      dateCondition
    );

    const [sessionsTotal, sessionsByStatutRaw, dossiersTotal, dossiersByStatutRaw, paiementsStats] = await Promise.all([
      this.prisma.session.count({ where: whereSessions }),
      this.prisma.session.groupBy({ by: ['statut'], where: whereSessions, _count: { _all: true } }),
      this.prisma.dossier.count({ where: whereDossiers }),
      this.prisma.dossier.groupBy({ by: ['statut'], where: whereDossiers, _count: { _all: true } }),
      this.prisma.paiement.aggregate({
        where: wherePaiements,
        _count: { _all: true },
        _sum: { montant_final: true },
      }),
    ]);

    return {
      formation,
      sessionsTotal,
      sessionsByStatut: normalizeGroupBy(sessionsByStatutRaw as any),
      dossiersTotal,
      dossiersByStatut: normalizeGroupBy(dossiersByStatutRaw as any),
      paiementsTotal: paiementsStats._count._all || 0,
      montantPayeTotal: paiementsStats._sum.montant_final || 0,
    };
  }

  async getSessionStats(role: string, userId: string, sessionId: string, filters: DashboardFilters = {}) {
    const scope = this.buildScope(role, userId);
    const dateCondition = buildDateCondition(filters.date_from, filters.date_to);
    const sessionWhere = mergeWhere(scope.sessions, { id: sessionId });

    const session = await this.prisma.session.findFirst({
      where: sessionWhere as any,
      select: {
        id: true,
        statut: true,
        date_debut: true,
        date_fin: true,
        capacite: true,
        nb_inscrits: true,
        places_restantes: true,
        formation: {
          select: {
            id: true,
            intitule: true,
            responsable_id: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    const whereDossiers = mergeWhere(
      scope.dossiers,
      { session_id: sessionId },
      filters.dossier_statut ? { statut: filters.dossier_statut } : null,
      dateCondition
    );
    const wherePaiements = mergeWhere(
      scope.paiements,
      { dossier: { session_id: sessionId } },
      filters.paiement_statut ? { statut: filters.paiement_statut } : null,
      filters.methode ? { methode: filters.methode } : null,
      dateCondition
    );

    const [dossiersTotal, dossiersByStatutRaw, paiementsByStatutRaw, paiementsAgg] = await Promise.all([
      this.prisma.dossier.count({ where: whereDossiers }),
      this.prisma.dossier.groupBy({ by: ['statut'], where: whereDossiers, _count: { _all: true } }),
      this.prisma.paiement.groupBy({ by: ['statut'], where: wherePaiements, _count: { _all: true } }),
      this.prisma.paiement.aggregate({
        where: wherePaiements,
        _count: { _all: true },
        _sum: { montant_final: true },
      }),
    ]);

    return {
      session,
      dossiersTotal,
      dossiersByStatut: normalizeGroupBy(dossiersByStatutRaw as any),
      paiementsByStatut: normalizeGroupBy(paiementsByStatutRaw as any),
      paiementsTotal: paiementsAgg._count._all || 0,
      montantPayeTotal: paiementsAgg._sum.montant_final || 0,
    };
  }

  async getPaiementsStats(role: string, userId: string, filters: DashboardFilters = {}) {
    const scope = this.buildScope(role, userId);
    const dateCondition = buildDateCondition(filters.date_from, filters.date_to);
    const wherePaiements = mergeWhere(
      scope.paiements,
      filters.formation_id ? { dossier: { formation_id: filters.formation_id } } : null,
      filters.session_id ? { dossier: { session_id: filters.session_id } } : null,
      filters.paiement_statut ? { statut: filters.paiement_statut } : null,
      filters.methode ? { methode: filters.methode } : null,
      dateCondition
    );

    const [paiementsByStatutRaw, paiementsByMethodeRaw, aggregate] = await Promise.all([
      this.prisma.paiement.groupBy({ by: ['statut'], where: wherePaiements, _count: { _all: true } }),
      this.prisma.paiement.groupBy({ by: ['methode'], where: wherePaiements, _count: { _all: true } }),
      this.prisma.paiement.aggregate({
        where: wherePaiements,
        _count: { _all: true },
        _sum: { montant_final: true },
      }),
    ]);

    return {
      paiementsByStatut: normalizeGroupBy(paiementsByStatutRaw as any),
      paiementsByMethode: normalizeGroupBy(paiementsByMethodeRaw as any),
      paiementsTotal: aggregate._count._all || 0,
      montantTotal: aggregate._sum.montant_final || 0,
    };
  }

  async getInscriptionsEvolution(role: string, userId: string, filters: DashboardFilters = {}) {
    const scope = this.buildScope(role, userId);
    const dateCondition = buildDateCondition(filters.date_from, filters.date_to);
    const dossiers = await this.prisma.dossier.findMany({
      where: mergeWhere(
        scope.dossiers,
        filters.formation_id ? { formation_id: filters.formation_id } : null,
        filters.session_id ? { session_id: filters.session_id } : null,
        dateCondition
      ) as any,
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    });

    return {
      evolution: groupByMonth(dossiers),
    };
  }

  async getPaiementsEvolution(role: string, userId: string, filters: DashboardFilters = {}) {
    const scope = this.buildScope(role, userId);
    const dateCondition = buildDateCondition(filters.date_from, filters.date_to);
    const paiements = await this.prisma.paiement.findMany({
      where: mergeWhere(
        scope.paiements,
        filters.formation_id ? { dossier: { formation_id: filters.formation_id } } : null,
        filters.session_id ? { dossier: { session_id: filters.session_id } } : null,
        dateCondition
      ) as any,
      select: { created_at: true, montant_final: true },
      orderBy: { created_at: 'asc' },
    });

    return {
      evolution: groupByMonth(paiements, 'montant_final'),
    };
  }

  async getRapportsData(role: string, userId: string, filters: DashboardFilters = {}) {
    const scope = this.buildScope(role, userId);
    const dateCondition = buildDateCondition(filters.date_from, filters.date_to);
    const rapports = await this.prisma.dossier.findMany({
      where: mergeWhere(
        scope.dossiers,
        filters.formation_id ? { formation_id: filters.formation_id } : null,
        filters.session_id ? { session_id: filters.session_id } : null,
        filters.dossier_statut ? { statut: filters.dossier_statut } : null,
        dateCondition
      ) as any,
      select: {
        id: true,
        statut: true,
        source_financement: true,
        voucher_code: true,
        code_apporteur: true,
        montant_remise: true,
        created_at: true,
        apprenant: { select: { nom: true, prenoms: true, email: true } },
        formation: { select: { intitule: true, cout_catalogue: true } },
        session: { select: { date_debut: true } },
        paiement: { select: { statut: true, montant_final: true, methode: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const formations = rapports.reduce<Record<string, number>>((acc, row) => {
      const key = row.formation?.intitule || 'N/A';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      rapports: rapports.map((row) => ({
        dossier_id: row.id,
        apprenant_nom: `${row.apprenant?.nom || ''} ${row.apprenant?.prenoms || ''}`.trim(),
        apprenant_email: row.apprenant?.email || null,
        formation_titre: row.formation?.intitule || null,
        session_date_debut: row.session?.date_debut || null,
        statut_dossier: row.statut,
        statut_paiement: row.paiement?.statut || null,
        montant_paiement: row.paiement?.montant_final || 0,
        montant_attendu: row.paiement?.montant_final
          ? null
          : Math.max(0, Number(row.formation?.cout_catalogue || 0) - Number(row.montant_remise || 0)),
        methode_paiement: row.paiement?.methode || null,
        source_financement: row.source_financement,
        voucher_code: row.voucher_code,
        code_apporteur: row.code_apporteur,
        montant_remise: row.montant_remise,
        date_inscription: row.created_at,
      })),
      formations,
      total_rapports: rapports.length,
    };
  }

  buildScope(role: string, userId: string): DashboardScope {
    if (role === 'ADMIN') {
      return {};
    }

    if (role === 'SUPERVISEUR') {
      return {
        sessions: {
          formation: {
            responsable_id: userId,
          },
        },
        dossiers: {
          session: {
            formation: {
              responsable_id: userId,
            },
          },
        },
        paiements: {
          dossier: {
            session: {
              formation: {
                responsable_id: userId,
              },
            },
          },
        },
      };
    }

    if (role === 'RESPONSABLE') {
      return {
        formations: { responsable_id: userId },
        sessions: { formation: { responsable_id: userId } },
        dossiers: { formation: { responsable_id: userId } },
        paiements: { dossier: { formation: { responsable_id: userId } } },
      };
    }

    return {};
  }
}
