import { OrganisationDashboardService } from '../organisation-dashboard.service';
import { EspaceOrganisationRepository } from '../espace-organisation.repository';
import { RapportService } from '../rapport.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('OrganisationDashboardService', () => {
  let service: OrganisationDashboardService;
  let mockRepo: jest.Mocked<EspaceOrganisationRepository>;
  let mockRapport: jest.Mocked<RapportService>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;

  const orgAvecB2B = {
    id: 'org-01',
    raison_sociale: 'TechCorp CI',
    email: 'contact@techcorp.ci',
    contact_referent: 'M. Diallo',
    type: 'ENTREPRISE',
    sous_types: [],
    identifiant_legal: 'CI-ABJ-2026-B-0001',
    pays: 'CI',
    langue_preferee: 'FR',
    statut: 'ACTIF',
    date_fin_essai: null,
    abonnement_org_id: 'abo-org-01',
    abonnement_b2b_id: 'abo-b2b-01',
    abonnement_org: { statut: 'ACTIF' },
    abonnement_b2b: { id: 'abo-b2b-01', palier: 'BUSINESS', nb_max: 50 },
  };

  const orgEssai = {
    ...orgAvecB2B,
    abonnement_org_id: null,
    abonnement_b2b: null,
    abonnement_b2b_id: null,
    date_fin_essai: new Date(Date.now() + 5 * 24 * 3600 * 1000), // 5 jours restants
  };

  beforeEach(() => {
    mockRepo = {
      findOrganisationById: jest.fn(),
      findBeneficiaires: jest.fn(),
      findVouchers: jest.fn(),
      countActifsB2B: jest.fn(),
      getStatsOrganisation: jest.fn(),
      findRecentInscriptions: jest.fn(),
      findRecentPaiements: jest.fn(),
    } as any;

    mockRapport = {
      genererRapportBailleur: jest.fn(),
    } as any;

    mockPrisma = {
      dossier: { findMany: jest.fn(), count: jest.fn() },
      paiement: { findMany: jest.fn(), count: jest.fn() },
      organisation: { update: jest.fn() },
      formation: { findUnique: jest.fn() },
      voucherOrganisation: { create: jest.fn() },
      voucherApporteur: { create: jest.fn(), findMany: jest.fn() },
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;

    service = new OrganisationDashboardService(mockRepo, mockRapport, mockPrisma, mockAudit);

    mockRepo.findRecentInscriptions.mockResolvedValue([]);
    mockRepo.findRecentPaiements.mockResolvedValue([]);
  });

  // RM-80/83 : essai et abonnement organisation
  describe('RM-80/83 — getDashboard avec statut essai', () => {
    it('affiche les jours restants d\'essai', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(orgEssai as any);
      mockRepo.getStatsOrganisation.mockResolvedValue({ nb_beneficiaires: 5, nb_inscriptions: 3, nb_vouchers_actifs: 2, montant_paye_total: 50000 });

      const result = await service.getDashboard('org-01');
      expect(result.organisation.essai_actif).toBe(true);
      expect(result.organisation.jours_restants_essai).toBe(5);
      expect(result.organisation.essai_expire).toBe(false);
    });

    it('retourne un contrat dashboard enrichi pour le frontend organisation', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.getStatsOrganisation.mockResolvedValue({
        nb_beneficiaires: 5,
        nb_inscriptions: 3,
        nb_vouchers_actifs: 2,
        montant_paye_total: 50000,
      });
      mockRepo.findRecentInscriptions.mockResolvedValue([
        {
          id: 'dossier-01',
          statut: 'PAYE',
          apprenant: { id: 'app-01', nom: 'Diallo', prenoms: 'Awa', email: 'awa@org.ci' },
          formation: { id: 'formation-01', intitule: 'Gestion projet', type_formation: 'STANDARD' },
          session: { date_debut: new Date('2026-06-01T00:00:00.000Z'), date_fin: new Date('2026-06-05T00:00:00.000Z'), statut: 'PLANIFIEE' },
          paiement: { statut: 'CONFIRME', confirmed_at: new Date('2026-05-01T00:00:00.000Z'), montant_final: 50000 },
        },
      ] as any);
      mockRepo.findRecentPaiements.mockResolvedValue([
        {
          id: 'paiement-01',
          montant_final: 50000,
          methode: 'VOUCHER_ORG',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          dossier: {
            apprenant: { id: 'app-01', nom: 'Diallo', prenoms: 'Awa', email: 'awa@org.ci' },
            formation: { id: 'formation-01', intitule: 'Gestion projet', type_formation: 'STANDARD' },
            session: { date_debut: new Date('2026-06-01T00:00:00.000Z'), date_fin: new Date('2026-06-05T00:00:00.000Z'), statut: 'PLANIFIEE' },
          },
        },
      ] as any);

      const result = await service.getDashboard('org-01');

      expect(result.recent_inscriptions).toHaveLength(1);
      expect(result.recent_inscriptions[0].etudiant).toEqual(expect.objectContaining({
        nom: 'Diallo',
        prenom: 'Awa',
      }));
      expect(result.recent_inscriptions[0].session.formation.titre).toBe('Gestion projet');
      expect(result.recent_paiements[0]).toEqual(expect.objectContaining({
        montant: 50000,
        methode_paiement: 'VOUCHER_ORG',
      }));
      expect(result.subscription_summary).toEqual({
        organisation: orgAvecB2B.abonnement_org,
        b2b: expect.objectContaining({ id: 'abo-b2b-01', exists: true }),
      });
    });

    it('signale essai expiré sans abonnement', async () => {
      const orgExpire = {
        ...orgEssai,
        date_fin_essai: new Date(Date.now() - 24 * 3600 * 1000),
      };
      mockRepo.findOrganisationById.mockResolvedValue(orgExpire as any);
      mockRepo.getStatsOrganisation.mockResolvedValue({ nb_beneficiaires: 0, nb_inscriptions: 0, nb_vouchers_actifs: 0, montant_paye_total: 0 });

      const result = await service.getDashboard('org-01');
      expect(result.organisation.essai_expire).toBe(true);
    });

    it('lève ORGANISATION_NOT_FOUND si org absente', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(null);
      mockRepo.getStatsOrganisation.mockResolvedValue({} as any);

      await expect(service.getDashboard('org-99')).rejects.toThrow('ORGANISATION_NOT_FOUND');
    });
  });

  describe('getMonProfil', () => {
    it('retourne les champs publics du profil', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);

      const result = await service.getMonProfil('org-01');
      expect(result.raison_sociale).toBe('TechCorp CI');
      expect(result.identifiant_legal).toBe('CI-ABJ-2026-B-0001');
      expect(result.statut).toBe('ACTIF');
    });

    it('lève ORGANISATION_NOT_FOUND si org absente', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(null);

      await expect(service.getMonProfil('org-99')).rejects.toThrow('ORGANISATION_NOT_FOUND');
    });
  });

  describe('updateMonProfil', () => {
    it('met à jour et log l\'audit', async () => {
      mockPrisma.organisation.update.mockResolvedValue({ ...orgAvecB2B, raison_sociale: 'Nouveau Nom' });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.updateMonProfil('org-01', { raison_sociale: 'Nouveau Nom' });
      expect(result.message).toBe('Profil mis à jour avec succès');
      expect(result.organisation.raison_sociale).toBe('Nouveau Nom');
      expect(mockAudit.info).toHaveBeenCalledWith('PROFIL_ORGANISATION_MIS_A_JOUR', expect.objectContaining({ organisation_id: 'org-01' }));
    });

    it('ignore les champs undefined pour un patch non destructif', async () => {
      mockPrisma.organisation.update.mockResolvedValue(orgAvecB2B);
      mockAudit.info.mockResolvedValue(undefined);

      await service.updateMonProfil('org-01', {
        raison_sociale: 'TechCorp CI',
        email: undefined,
        contact_referent: undefined,
        pays: 'CI',
      });

      expect(mockPrisma.organisation.update).toHaveBeenCalledWith({
        where: { id: 'org-01' },
        data: {
          raison_sociale: 'TechCorp CI',
          pays: 'CI',
        },
      });
    });

    it('transforme une contrainte unique email Prisma en erreur contrôlée', async () => {
      mockPrisma.organisation.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await expect(
        service.updateMonProfil('org-01', { email: 'doublon@test.ci' })
      ).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('getMesVouchers', () => {
    it('délègue au repo', async () => {
      mockRepo.findVouchers.mockResolvedValue({ vouchers: [], total: 0, page: 1, limit: 20, totalPages: 0 } as any);
      await service.getMesVouchers('org-01', { statut: 'ACTIF', page: 1, limit: 20 });
      expect(mockRepo.findVouchers).toHaveBeenCalledWith('org-01', { statut: 'ACTIF', page: 1, limit: 20 });
    });
  });

  describe('getRapportBailleur', () => {
    it('délègue au service rapport', async () => {
      mockRapport.genererRapportBailleur.mockResolvedValue({ date_generation: '' } as any);
      await service.getRapportBailleur('org-01', {});
      expect(mockRapport.genererRapportBailleur).toHaveBeenCalledWith('org-01', {});
    });
  });

  describe('commanderVouchers', () => {
    it('lève FORMATION_NOT_FOUND si formation absente', async () => {
      mockPrisma.formation.findUnique.mockResolvedValue(null);

      await expect(
        service.commanderVouchers('org-01', { formation_id: 'f-99', quantite: 5 })
      ).rejects.toThrow('FORMATION_NOT_FOUND');
    });

    it('crée le bon nombre de vouchers organisation', async () => {
      mockPrisma.formation.findUnique.mockResolvedValue({ id: 'f-01', cout_catalogue: 75000 });
      mockPrisma.voucherOrganisation.create.mockImplementation(async () => ({ id: 'v-' + Math.random() }));
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.commanderVouchers('org-01', { formation_id: 'f-01', quantite: 3 });
      expect(mockPrisma.voucherOrganisation.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.voucherApporteur.create).not.toHaveBeenCalled();
      expect(mockPrisma.voucherOrganisation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organisation_id: 'org-01',
          formation_id: 'f-01',
          type: 'ORGANISATION',
          quota_max: 1,
          quota_utilise: 0,
        }),
      });
      expect(result.vouchers).toHaveLength(3);
    });
  });

  describe('getSuiviInscriptions', () => {
    it('retourne dossiers paginés', async () => {
      mockPrisma.dossier.findMany.mockResolvedValue([{ id: 'd-01' }]);
      mockPrisma.dossier.count.mockResolvedValue(1);

      const result = await service.getSuiviInscriptions('org-01', { page: 1, limit: 20 });
      expect(result.total).toBe(1);
      expect(result.dossiers).toHaveLength(1);
    });
  });

  describe('getMesPaiements', () => {
    it('retourne paiements paginés', async () => {
      mockPrisma.paiement.findMany.mockResolvedValue([{ id: 'p-01' }]);
      mockPrisma.paiement.count.mockResolvedValue(1);

      const result = await service.getMesPaiements('org-01', { page: 1, limit: 20 });
      expect(result.total).toBe(1);
      expect(result.paiements).toHaveLength(1);
    });
  });
});
