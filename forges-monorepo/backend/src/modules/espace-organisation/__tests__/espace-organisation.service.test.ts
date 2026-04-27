import { EspaceOrganisationService } from '../espace-organisation.service';
import { EspaceOrganisationRepository } from '../espace-organisation.repository';
import { ImportCSVService } from '../import-csv.service';
import { RapportService } from '../rapport.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('EspaceOrganisationService', () => {
  let service: EspaceOrganisationService;
  let mockRepo: jest.Mocked<EspaceOrganisationRepository>;
  let mockImportCSV: jest.Mocked<ImportCSVService>;
  let mockRapport: jest.Mocked<RapportService>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const orgAvecB2B = {
    id: 'org-01',
    raison_sociale: 'TechCorp CI',
    statut: 'ACTIF',
    date_fin_essai: null,
    abonnement_org_id: 'abo-org-01',
    abonnement_b2b_id: 'abo-b2b-01',
    abonnement_org: { statut: 'ACTIF' },
    abonnement_b2b: { id: 'abo-b2b-01', palier: 'BUSINESS', nb_max: 50, nb_actifs: 30, date_renouvellement: new Date('2027-01-01') },
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
    } as any;

    mockImportCSV = {
      importerBeneficiaires: jest.fn(),
    } as any;

    mockRapport = {
      genererRapportBailleur: jest.fn(),
    } as any;

    mockPrisma = {
      apprenant: { findFirst: jest.fn(), update: jest.fn() },
      abonnementB2B: { update: jest.fn() },
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = {} as any;

    service = new EspaceOrganisationService(
      mockRepo, mockImportCSV, mockRapport, mockPrisma, mockAudit, mockEmail
    );
  });

  // RM-80/83 : essai et abonnement organisation
  describe('RM-80/83 — Dashboard avec statut essai', () => {
    it('affiche les jours restants d\'essai', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(orgEssai as any);
      mockRepo.getStatsOrganisation.mockResolvedValue({ nb_beneficiaires: 5, nb_inscriptions: 3, nb_vouchers_actifs: 2, montant_paye_total: 50000 });

      const result = await service.getDashboard('org-01');
      expect(result.organisation.essai_actif).toBe(true);
      expect(result.organisation.jours_restants_essai).toBe(5);
      expect(result.organisation.essai_expire).toBe(false);
    });

    it('signale essai expiré sans abonnement', async () => {
      const orgExpire = {
        ...orgEssai,
        date_fin_essai: new Date(Date.now() - 24 * 3600 * 1000), // expiré hier
      };
      mockRepo.findOrganisationById.mockResolvedValue(orgExpire as any);
      mockRepo.getStatsOrganisation.mockResolvedValue({ nb_beneficiaires: 0, nb_inscriptions: 0, nb_vouchers_actifs: 0, montant_paye_total: 0 });

      const result = await service.getDashboard('org-01');
      expect(result.organisation.essai_expire).toBe(true);
    });
  });

  // RM-44 : visibilité RH limitée
  describe('RM-44 — Visibilité RH limitée aux vouchers organisation', () => {
    it('filtre les bénéficiaires B2B uniquement', async () => {
      mockRepo.findBeneficiaires.mockResolvedValue({
        dossiers: [{ id: 'd-01', source_financement: 'B2B' }],
        total: 1, page: 1, limit: 20
      } as any);

      await service.getBeneficiaires('org-01');
      expect(mockRepo.findBeneficiaires).toHaveBeenCalledWith('org-01', expect.any(Object));
    });
  });

  // RM-59/61 : import CSV + plafond B2B
  describe('RM-59/61 — Import CSV avec vérification plafond', () => {
    it('bloque si plafond B2B atteint', async () => {
      const orgPlafondAtteint = {
        ...orgAvecB2B,
        abonnement_b2b: { ...orgAvecB2B.abonnement_b2b, nb_max: 30 }
      };
      mockRepo.findOrganisationById.mockResolvedValue(orgPlafondAtteint as any);
      mockRepo.countActifsB2B.mockResolvedValue(30); // nb_actifs = nb_max

      await expect(
        service.importerBeneficiairesCSV('csv...', 'org-01', 'user-01')
      ).rejects.toThrow('B2B_PLAFOND_ATTEINT');
    });

    it('autorise import si places disponibles', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.countActifsB2B.mockResolvedValue(30); // 30/50 → places dispo
      mockImportCSV.importerBeneficiaires.mockResolvedValue({
        succes: 3, erreurs: 0, doublons: 0, rapport: []
      });

      const result = await service.importerBeneficiairesCSV('csv...', 'org-01', 'user-01');
      expect(result.succes).toBe(3);
    });
  });

  // RM-62 : désactivation sans suppression — certifications conservées
  describe('RM-62 — Désactivation bénéficiaire sans suppression', () => {
    it('désactive sans supprimer les données', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue({ id: 'a-01', statut: 'ACTIF' });
      mockPrisma.apprenant.update.mockResolvedValue({});
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockPrisma.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.desactiverBeneficiaire('a-01', 'org-01', 'user-01');

      // Vérifie statut=INACTIF (pas delete)
      expect(mockPrisma.apprenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'INACTIF' } })
      );
      expect(result.message).toContain('certifications sont conservées');
    });

    it('décrémente nb_actifs B2B après désactivation', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue({ id: 'a-01' });
      mockPrisma.apprenant.update.mockResolvedValue({});
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockPrisma.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await service.desactiverBeneficiaire('a-01', 'org-01', 'user-01');
      expect(mockPrisma.abonnementB2B.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { nb_actifs: { decrement: 1 } } })
      );
    });
  });

  // RM-69 : alerte plafond B2B proche
  describe('RM-69 — Alerte plafond B2B à 90%', () => {
    it('déclenche alerte si nb_actifs >= 90% de nb_max', async () => {
      const orgProcheMax = {
        ...orgAvecB2B,
        abonnement_b2b: { ...orgAvecB2B.abonnement_b2b, nb_max: 50, nb_actifs: 45 }
      };
      mockRepo.findOrganisationById.mockResolvedValue(orgProcheMax as any);
      mockRepo.countActifsB2B.mockResolvedValue(46); // 92%

      const result = await service.getDashboardB2B('org-01');
      expect(result.alerte_plafond).toBe(true);
      expect(result.taux_utilisation).toBeGreaterThanOrEqual(90);
    });

    it('pas d\'alerte si taux < 90%', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.countActifsB2B.mockResolvedValue(30); // 60%

      const result = await service.getDashboardB2B('org-01');
      expect(result.alerte_plafond).toBe(false);
    });
  });
});
