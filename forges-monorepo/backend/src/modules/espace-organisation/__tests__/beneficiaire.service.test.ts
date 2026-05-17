import { BeneficiaireService } from '../beneficiaire.service';
import { EspaceOrganisationRepository } from '../espace-organisation.repository';
import { ImportCSVService } from '../import-csv.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('BeneficiaireService', () => {
  let service: BeneficiaireService;
  let mockRepo: jest.Mocked<EspaceOrganisationRepository>;
  let mockImportCSV: jest.Mocked<ImportCSVService>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;
  let tx: any;

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

    tx = {
      apprenant: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn(), count: jest.fn() },
      abonnementB2B: { update: jest.fn() },
      dossier: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      session: { findUnique: jest.fn() },
      voucherOrganisation: { findFirst: jest.fn(), update: jest.fn() },
      paiement: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() },
      commissionApporteur: { aggregate: jest.fn(), create: jest.fn() },
    };

    mockPrisma = {
      apprenant: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      abonnementB2B: { update: jest.fn() },
      dossier: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      session: { findUnique: jest.fn() },
      voucherOrganisation: { findFirst: jest.fn(), update: jest.fn() },
      paiement: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
      commissionApporteur: { aggregate: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = { sendTempPassword: jest.fn(), sendEmail: jest.fn().mockResolvedValue(undefined) } as any;

    service = new BeneficiaireService(mockRepo, mockImportCSV, mockPrisma, mockAudit, mockEmail);
  });

  // RM-44 : visibilité RH limitée
  describe('RM-44 — getBeneficiaires', () => {
    it('filtre les bénéficiaires B2B uniquement via le repo', async () => {
      mockRepo.findBeneficiaires.mockResolvedValue({
        dossiers: [{ id: 'd-01', source_financement: 'B2B' }],
        total: 1, page: 1, limit: 20
      } as any);

      await service.getBeneficiaires('org-01');
      expect(mockRepo.findBeneficiaires).toHaveBeenCalledWith('org-01', expect.any(Object));
    });
  });

  // RM-59/61 : import CSV + plafond B2B
  describe('RM-59/61 — importerBeneficiairesCSV', () => {
    it('bloque si plafond B2B atteint', async () => {
      const orgPlafondAtteint = {
        ...orgAvecB2B,
        abonnement_b2b: { ...orgAvecB2B.abonnement_b2b, nb_max: 30 }
      };
      mockRepo.findOrganisationById.mockResolvedValue(orgPlafondAtteint as any);
      mockRepo.countActifsB2B.mockResolvedValue(30);

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
  describe('RM-62 — desactiverBeneficiaire', () => {
    it('désactive sans supprimer les données', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue({ id: 'a-01', statut: 'ACTIF' });
      tx.apprenant.update.mockResolvedValue({});
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      tx.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.desactiverBeneficiaire('a-01', 'org-01', 'user-01');

      expect(tx.apprenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'INACTIF' } })
      );
      expect(result.message).toContain('certifications sont conservées');
    });

    it('décrémente nb_actifs B2B dans la même transaction', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue({ id: 'a-01' });
      tx.apprenant.update.mockResolvedValue({});
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      tx.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await service.desactiverBeneficiaire('a-01', 'org-01', 'user-01');

      expect(tx.abonnementB2B.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { nb_actifs: { decrement: 1 } } })
      );
    });

    it('les deux writes sont dans la même transaction ($transaction appelé)', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue({ id: 'a-01' });
      tx.apprenant.update.mockResolvedValue({});
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      tx.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await service.desactiverBeneficiaire('a-01', 'org-01', 'user-01');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Les deux writes utilisent le proxy tx, pas mockPrisma directement
      expect(mockPrisma.apprenant.update).not.toHaveBeenCalled();
      expect(mockPrisma.abonnementB2B.update).not.toHaveBeenCalled();
    });

    it('lève APPRENANT_NOT_FOUND si apprenant absent', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(null);

      await expect(
        service.desactiverBeneficiaire('a-99', 'org-01', 'user-01')
      ).rejects.toThrow('APPRENANT_NOT_FOUND');
    });
  });

  // RM-69 : alerte plafond B2B proche
  describe('RM-69 — getDashboardB2B', () => {
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

    it('lève ABONNEMENT_B2B_INACTIF si pas d\'abonnement B2B', async () => {
      const orgSansB2B = { ...orgAvecB2B, abonnement_b2b: null };
      mockRepo.findOrganisationById.mockResolvedValue(orgSansB2B as any);

      await expect(service.getDashboardB2B('org-01')).rejects.toThrow('ABONNEMENT_B2B_INACTIF');
    });
  });

  // RM-61 : plafond B2B à la création d'un membre
  describe('RM-61 — createMembre', () => {
    it('lève EMAIL_DEJA_UTILISE si email existant', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createMembre('org-01', { email: 'existing@test.ci', nom: 'Doe', prenom: 'John' })
      ).rejects.toThrow('EMAIL_DEJA_UTILISE');
    });

    it('bloque si plafond B2B atteint — re-comptage dans la transaction', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      const orgPlafond = { ...orgAvecB2B, abonnement_b2b: { ...orgAvecB2B.abonnement_b2b, nb_max: 30 } };
      mockRepo.findOrganisationById.mockResolvedValue(orgPlafond as any);
      // Le count dans la transaction retourne 30 = nb_max → doit rejeter
      tx.apprenant.count.mockResolvedValue(30);

      await expect(
        service.createMembre('org-01', { email: 'new@test.ci', nom: 'Doe', prenom: 'John' })
      ).rejects.toThrow('B2B_PLAFOND_ATTEINT');
    });

    it('appelle $transaction pour créer le membre', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      tx.apprenant.count.mockResolvedValue(30); // 30/50 → places dispo
      tx.apprenant.create.mockResolvedValue({ id: 'a-new', email: 'new@test.ci' });
      tx.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendTempPassword.mockResolvedValue(undefined);

      await service.createMembre('org-01', { email: 'new@test.ci', nom: 'Doe', prenom: 'John' });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('re-compte les actifs dans la transaction via tx.apprenant.count', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      tx.apprenant.count.mockResolvedValue(10);
      tx.apprenant.create.mockResolvedValue({ id: 'a-new', email: 'new@test.ci' });
      tx.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendTempPassword.mockResolvedValue(undefined);

      await service.createMembre('org-01', { email: 'new@test.ci', nom: 'Doe', prenom: 'John' });

      expect(tx.apprenant.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organisation_id: 'org-01', statut: 'ACTIF' }) })
      );
    });

    it('incrémente nb_actifs B2B dans la même transaction', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      tx.apprenant.count.mockResolvedValue(10);
      tx.apprenant.create.mockResolvedValue({ id: 'a-new', email: 'new@test.ci' });
      tx.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendTempPassword.mockResolvedValue(undefined);

      await service.createMembre('org-01', { email: 'new@test.ci', nom: 'Doe', prenom: 'John' });

      expect(tx.abonnementB2B.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { nb_actifs: { increment: 1 } } })
      );
    });
  });

  // UCS12 — inscrireBeneficiaire (RM-61, RM-140, RM-15)
  describe('inscrireBeneficiaire — UCS12', () => {
    const beneficiaire = {
      id: 'app-01',
      email: 'emp@org.ci',
      nom: 'Diallo',
      prenoms: 'Hassan',
      organisation_id: 'org-01',
    };
    const session = {
      id: 'sess-01',
      formation_id: 'f-01',
      places_restantes: 20,
      formation: { id: 'f-01', cout_catalogue: 150000, partenaire: null },
    };
    const dossierCree = { id: 'd-01', statut: 'PAYE' };

    // B1 — Inscription B2B reussie
    it('cree un dossier B2B avec organisation_inscriptrice_id et statut PAYE', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(beneficiaire);
      mockPrisma.dossier.findFirst.mockResolvedValue(null);
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.countActifsB2B.mockResolvedValue(30);
      mockPrisma.session.findUnique.mockResolvedValue(session as any);
      mockPrisma.dossier.create.mockResolvedValue(dossierCree);
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-01', dossier_id: 'd-01', statut: 'EN_ATTENTE' });
      mockPrisma.paiement.update.mockResolvedValue({ id: 'p-01', statut: 'CONFIRME' });
      mockPrisma.commissionApporteur.aggregate.mockResolvedValue({ _sum: { montant: 0 } });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.inscrireBeneficiaire('org-01', {
        beneficiaire_id: 'app-01',
        session_id: 'sess-01',
        source_financement: 'B2B',
      });

      expect(result.dossier_id).toBe('d-01');
      expect(result.statut).toBe('PAYE');
      expect(mockPrisma.dossier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source_financement: 'B2B',
            statut: 'PAYE',
            organisation_inscriptrice_id: 'org-01',
            apprenant_id: 'app-01',
            session_id: 'sess-01',
          }),
        })
      );
    });

    // B2 — Inscription via VoucherOrganisation
    it('cree un dossier VOUCHER avec statut PAYE et voucher_organisation_id', async () => {
      const voucher = { id: 'v-01', statut: 'ACTIF', organisation_id: 'org-01', formation_id: null, quota_utilise: 0, quota_max: null };
      const dossierVoucher = { id: 'd-02', statut: 'PAYE' };

      mockPrisma.apprenant.findFirst.mockResolvedValue(beneficiaire);
      mockPrisma.dossier.findFirst.mockResolvedValue(null);
      mockPrisma.voucherOrganisation.findFirst.mockResolvedValue(voucher);
      mockPrisma.session.findUnique.mockResolvedValue(session as any);
      mockPrisma.dossier.create.mockResolvedValue(dossierVoucher);
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-02', dossier_id: 'd-02', statut: 'EN_ATTENTE' });
      mockPrisma.paiement.update.mockResolvedValue({ id: 'p-02', statut: 'CONFIRME' });
      mockPrisma.commissionApporteur.aggregate.mockResolvedValue({ _sum: { montant: 0 } });
      mockPrisma.voucherOrganisation.update.mockResolvedValue({ id: 'v-01', quota_utilise: 1, quota_max: null });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.inscrireBeneficiaire('org-01', {
        beneficiaire_id: 'app-01',
        session_id: 'sess-01',
        source_financement: 'VOUCHER',
        voucher_organisation_id: 'v-01',
      });

      expect(result.statut).toBe('PAYE');
      expect(mockPrisma.dossier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: 'PAYE',
            source_financement: 'VOUCHER',
            voucher_organisation_id: 'v-01',
            organisation_inscriptrice_id: 'org-01',
          }),
        })
      );
    });

    // B3 — Beneficiaire n'appartient pas a l'org
    it('rejette si le beneficiaire n\'appartient pas a l\'organisation', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(null);

      await expect(
        service.inscrireBeneficiaire('org-01', {
          beneficiaire_id: 'app-externe',
          session_id: 'sess-01',
          source_financement: 'B2B',
        })
      ).rejects.toThrow('APPRENANT_NON_BENEFICIAIRE');

      expect(mockPrisma.dossier.create).not.toHaveBeenCalled();
    });

    it('rejette si la session est complete', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(beneficiaire);
      mockPrisma.dossier.findFirst.mockResolvedValue(null);
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.countActifsB2B.mockResolvedValue(30);
      mockPrisma.session.findUnique.mockResolvedValue({
        ...session,
        places_restantes: 0,
      } as any);

      await expect(
        service.inscrireBeneficiaire('org-01', {
          beneficiaire_id: 'app-01',
          session_id: 'sess-01',
          source_financement: 'B2B',
        })
      ).rejects.toThrow('SESSION_COMPLETE');

      expect(mockPrisma.dossier.create).not.toHaveBeenCalled();
    });

    it('rejette si le beneficiaire est deja inscrit a la meme session', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(beneficiaire);
      mockPrisma.dossier.findFirst.mockResolvedValue({ id: 'd-existant' });

      await expect(
        service.inscrireBeneficiaire('org-01', {
          beneficiaire_id: 'app-01',
          session_id: 'sess-01',
          source_financement: 'B2B',
        })
      ).rejects.toThrow('INSCRIPTION_DEJA_EXISTANTE');

      expect(mockPrisma.dossier.create).not.toHaveBeenCalled();
    });

    // B4 — Quota B2B depasse
    it('rejette si le quota B2B est depasse', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(beneficiaire);
      mockPrisma.dossier.findFirst.mockResolvedValue(null);
      mockPrisma.session.findUnique.mockResolvedValue(session as any);
      const orgPleine = { ...orgAvecB2B, abonnement_b2b: { ...orgAvecB2B.abonnement_b2b, nb_max: 30 } };
      mockRepo.findOrganisationById.mockResolvedValue(orgPleine as any);
      mockRepo.countActifsB2B.mockResolvedValue(30);

      await expect(
        service.inscrireBeneficiaire('org-01', {
          beneficiaire_id: 'app-01',
          session_id: 'sess-01',
          source_financement: 'B2B',
        })
      ).rejects.toThrow('B2B_PLAFOND_ATTEINT');

      expect(mockPrisma.dossier.create).not.toHaveBeenCalled();
    });

    // B5 — Voucher invalide
    it('rejette si le voucher n\'appartient pas a l\'organisation ou est inactif', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(beneficiaire);
      mockPrisma.dossier.findFirst.mockResolvedValue(null);
      mockPrisma.session.findUnique.mockResolvedValue(session as any);
      mockPrisma.voucherOrganisation.findFirst.mockResolvedValue(null);

      await expect(
        service.inscrireBeneficiaire('org-01', {
          beneficiaire_id: 'app-01',
          session_id: 'sess-01',
          source_financement: 'VOUCHER',
          voucher_organisation_id: 'v-inexistant',
        })
      ).rejects.toThrow('VOUCHER_INVALIDE');

      expect(mockPrisma.dossier.create).not.toHaveBeenCalled();
    });

    // B7 — Email de notification envoye
    it('envoie un email de notification au beneficiaire apres inscription', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(beneficiaire);
      mockPrisma.dossier.findFirst.mockResolvedValue(null);
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.countActifsB2B.mockResolvedValue(30);
      mockPrisma.session.findUnique.mockResolvedValue(session as any);
      mockPrisma.dossier.create.mockResolvedValue(dossierCree);
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-03', dossier_id: 'd-01', statut: 'EN_ATTENTE' });
      mockPrisma.paiement.update.mockResolvedValue({ id: 'p-03', statut: 'CONFIRME' });
      mockPrisma.commissionApporteur.aggregate.mockResolvedValue({ _sum: { montant: 0 } });
      mockAudit.info.mockResolvedValue(undefined);

      await service.inscrireBeneficiaire('org-01', {
        beneficiaire_id: 'app-01',
        session_id: 'sess-01',
        source_financement: 'B2B',
      });

      expect(mockEmail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'emp@org.ci' })
      );
    });
  });
});
