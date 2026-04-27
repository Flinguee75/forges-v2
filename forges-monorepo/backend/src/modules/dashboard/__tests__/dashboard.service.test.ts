import { DashboardService } from '../dashboard.service';
import { DashboardRepository } from '../dashboard.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockRepo: jest.Mocked<DashboardRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;

  const statsAdmin = {
    nb_apprenants_actifs: 1250,
    nb_organisations_actives: 45,
    nb_formations_actives: 38,
    nb_sessions_en_cours: 12,
    nb_dossiers_total: 3400,
    ca_total_xof: 170000000,
    nb_abonnements_retail_actifs: 320,
    nb_abonnements_b2b_actifs: 18,
    dossiers_par_statut: { PAYE: 2800, EN_ATTENTE_VERIFICATION: 120, ANNULE: 480 },
  };

  const statsPartenaire = {
    formations: [{ id: 'f-01', intitule: 'Cybersécurité GWU', statut: 'ACTIVE', statut_validation: 'VALIDEE', nb_certifies: 45 }],
    reversements_nets_en_attente_xof: 3600000,
    reversements_nets_percus_xof: 12000000,
  };

  const statsApporteur = {
    code_apporteur: '550e8400-e29b-41d4-a716-446655440000',
    taux_commission_pct: 5,
    transactions_ce_mois: 8,
    ca_genere_ce_mois_xof: 800000,
    commission_ce_mois_xof: 40000,
    cumul_en_attente_xof: 75000,
    historique_reversements: [],
  };

  beforeEach(() => {
    mockRepo = {
      getStatsAdmin: jest.fn(),
      getStatsAgent: jest.fn(),
      getStatsResponsable: jest.fn(),
      getStatsSuperviseur: jest.fn(),
      getStatsPartenaire: jest.fn(),
      getStatsApporteur: jest.fn(),
      getStatsOrganisation: jest.fn(),
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    service = new DashboardService(mockRepo, mockAudit);
  });

  // Dispatch par rôle
  describe('Dispatch KPI par rôle', () => {
    it('retourne les stats Admin pour rôle ADMIN', async () => {
      mockRepo.getStatsAdmin.mockResolvedValue(statsAdmin);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.getKPI('ADMIN', 'admin-01');
      expect(result.role).toBe('ADMIN');
      expect(result.data.nb_apprenants_actifs).toBe(1250);
      expect(result.data.ca_total_xof).toBe(170000000);
      expect(mockRepo.getStatsAdmin).toHaveBeenCalledTimes(1);
    });

    it('retourne les stats Agent pour rôle AGENT', async () => {
      mockRepo.getStatsAgent.mockResolvedValue({
        paiements_en_attente: 12,
        ca_confirme_xof: 1200000,
        reversements_partenaires_a_effectuer_xof: 3600000,
        commissions_apporteurs_a_reverser_xof: 75000,
        reversements_partenaires_ce_mois_xof: 500000,
      });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.getKPI('AGENT', 'agent-01');
      expect(result.data.paiements_en_attente).toBe(12);
      expect(mockRepo.getStatsAgent).toHaveBeenCalledTimes(1);
    });

    it('retourne les stats Responsable filtrées par userId', async () => {
      mockRepo.getStatsResponsable.mockResolvedValue({
        dossiers_en_attente_verification: 5,
        dossiers_retenus_urgents: [],
        formations_partenaires_a_valider: 5,
        formations_partenaires_en_attente: 2,
      });
      mockAudit.info.mockResolvedValue(undefined);

      await service.getKPI('RESPONSABLE', 'resp-01');
      expect(mockRepo.getStatsResponsable).toHaveBeenCalledWith('resp-01');
    });

    it('retourne les stats Superviseur', async () => {
      mockRepo.getStatsSuperviseur.mockResolvedValue({
        sessions_ouvertes: 8, vouchers_promo_a_valider: 3,
        inscriptions_ce_mois: 45, apporteurs_actifs: 12,
        top_apporteurs_mois: []
      });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.getKPI('SUPERVISEUR', 'sup-01');
      expect(result.data.sessions_ouvertes).toBe(8);
    });

    it('traite GESTIONNAIRE comme ORGANISATION', async () => {
      mockRepo.getStatsOrganisation.mockResolvedValue({ nb_beneficiaires_actifs: 25 } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.getKPI('GESTIONNAIRE', 'gest-01');
      expect(mockRepo.getStatsOrganisation).toHaveBeenCalledWith('gest-01');
    });
  });

  // RM-130 : vue Partenaire — commission FORGES masquée
  describe('RM-130 — Vue Partenaire sans commission FORGES', () => {
    it('retourne uniquement les reversements nets du partenaire', async () => {
      mockRepo.getStatsPartenaire.mockResolvedValue(statsPartenaire);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.getKPI('PARTENAIRE', 'part-01');
      expect(result.data.reversements_nets_en_attente_xof).toBe(3600000);
      // La commission FORGES ne doit JAMAIS apparaître dans la réponse
      expect(result.data.commission_forges_pct).toBeUndefined();
      expect(result.data.montant_commission_forges).toBeUndefined();
      expect(mockRepo.getStatsPartenaire).toHaveBeenCalledWith('part-01');
    });
  });

  // RM-148 : vue Apporteur — commissions + reversements
  describe('RM-148 — Vue Apporteur avec commissions et historique', () => {
    it('retourne le code UUID permanent + commissions', async () => {
      mockRepo.getStatsApporteur.mockResolvedValue(statsApporteur);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.getKPI('APPORTEUR', 'apt-01');
      // RM-142 : code UUID permanent toujours visible
      expect(result.data.code_apporteur).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(result.data.commission_ce_mois_xof).toBe(40000);
      expect(result.data.taux_commission_pct).toBe(5);
      expect(mockRepo.getStatsApporteur).toHaveBeenCalledWith('apt-01');
    });
  });

  // Journalisation MT-01
  describe('MT-01 — Journalisation consultation dashboard', () => {
    it('journalise chaque consultation de dashboard', async () => {
      mockRepo.getStatsAdmin.mockResolvedValue(statsAdmin);
      mockAudit.info.mockResolvedValue(undefined);

      await service.getKPI('ADMIN', 'admin-01');
      expect(mockAudit.info).toHaveBeenCalledWith(
        'DASHBOARD_CONSULTE',
        expect.objectContaining({ role: 'ADMIN', user_id: 'admin-01' })
      );
    });
  });

  // Export rapport
  describe('Export rapport PDF/Excel', () => {
    it('génère un rapport Admin au format PDF', async () => {
      mockRepo.getStatsAdmin.mockResolvedValue(statsAdmin);
      mockAudit.info.mockResolvedValue(undefined);

      const rapport = await service.exportRapport('ADMIN', 'admin-01', 'PDF');
      expect(rapport.meta.format).toBe('PDF');
      expect(rapport.meta.role).toBe('ADMIN');
      expect(rapport.contenu).toBeDefined();
    });

    it('génère un rapport avec période filtrée', async () => {
      mockRepo.getStatsAgent.mockResolvedValue({
        paiements_en_attente: 5,
        ca_confirme_xof: 0,
        reversements_partenaires_a_effectuer_xof: 0,
        commissions_apporteurs_a_reverser_xof: 0,
        reversements_partenaires_ce_mois_xof: 0,
      });
      mockAudit.info.mockResolvedValue(undefined);

      const debut = new Date('2026-01-01');
      const fin = new Date('2026-01-31');
      const rapport = await service.exportRapport('AGENT', 'agent-01', 'EXCEL', { debut, fin });
      expect(rapport.meta.periode).toEqual({ debut, fin });
    });
  });
});
