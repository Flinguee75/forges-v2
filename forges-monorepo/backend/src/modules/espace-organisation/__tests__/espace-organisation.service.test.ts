import { EspaceOrganisationService } from '../espace-organisation.service';
import { EspaceOrganisationRepository } from '../espace-organisation.repository';
import { ImportCSVService } from '../import-csv.service';
import { RapportService } from '../rapport.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-12345678901') }));

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
      apprenant: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      abonnementB2B: { update: jest.fn() },
      dossier: { findMany: jest.fn(), count: jest.fn() },
      paiement: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
      formation: { findUnique: jest.fn() },
      voucherApporteur: { create: jest.fn() },
      organisation: { update: jest.fn() },
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = { sendTempPassword: jest.fn().mockResolvedValue(undefined) } as any;

    service = new EspaceOrganisationService(
      mockRepo, mockImportCSV, mockRapport, mockPrisma, mockAudit, mockEmail
    );
  });

  // B3 — Dashboard doit retourner recent_inscriptions
  describe('Dashboard — recent_inscriptions (B3)', () => {
    it('retourne les inscriptions récentes de l\'organisation dans le dashboard', async () => {
      const dossiersRecents = [
        {
          id: 'd-01',
          statut: 'PAYE_DIRECTEMENT',
          created_at: new Date(),
          apprenant: { id: 'app-01', nom: 'Cisse', prenoms: 'Hassan', email: 'h@org.ci' },
          formation: { id: 'f-01', intitule: 'Cybersécurité', type_formation: 'CERTIFIANTE' },
          session: { date_debut: new Date('2026-06-01'), date_fin: new Date('2026-06-05'), statut: 'INSCRIPTIONS_OUVERTES' },
        },
      ];

      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.getStatsOrganisation.mockResolvedValue({ nb_beneficiaires: 1, nb_inscriptions: 1, nb_vouchers_actifs: 0, montant_paye_total: 0 });
      mockPrisma.dossier.findMany.mockResolvedValue(dossiersRecents);

      const result = await service.getDashboard('org-01');

      expect(result.recent_inscriptions).toBeDefined();
      expect(Array.isArray(result.recent_inscriptions)).toBe(true);
      expect(result.recent_inscriptions).toHaveLength(1);
      expect(result.recent_inscriptions[0].apprenant.nom).toBe('Cisse');
      expect(result.recent_inscriptions[0].formation.intitule).toBe('Cybersécurité');
    });

    it('retourne un tableau vide si aucune inscription récente', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.getStatsOrganisation.mockResolvedValue({ nb_beneficiaires: 0, nb_inscriptions: 0, nb_vouchers_actifs: 0, montant_paye_total: 0 });
      mockPrisma.dossier.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('org-01');

      expect(result.recent_inscriptions).toEqual([]);
    });
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

  // B1 — getSuiviInscriptions doit retourner montant_final et cout_catalogue
  describe('getSuiviInscriptions — montant (B1)', () => {
    it('retourne montant_final du paiement dans les dossiers', async () => {
      const dossiers = [
        {
          id: 'd-01',
          statut: 'PAYE_DIRECTEMENT',
          created_at: new Date(),
          apprenant: { id: 'app-01', nom: 'Cisse', prenoms: 'Hassan', email: 'h@org.ci' },
          formation: { id: 'f-01', intitule: 'Cybersécurité', type_formation: 'CERTIFIANTE', cout_catalogue: 300000000 },
          session: { date_debut: new Date('2026-06-01'), date_fin: new Date('2026-06-05'), statut: 'INSCRIPTIONS_OUVERTES' },
          paiement: { statut: 'EN_ATTENTE', confirmed_at: null, montant_final: 300000000 },
        },
      ];
      mockPrisma.dossier.findMany.mockResolvedValue(dossiers);
      mockPrisma.dossier.count.mockResolvedValue(1);

      const result = await service.getSuiviInscriptions('org-01', {});

      expect(result.dossiers[0].paiement.montant_final).toBe(300000000);
      expect(result.dossiers[0].formation.cout_catalogue).toBe(300000000);
    });

    it('retourne null comme montant si pas de paiement', async () => {
      const dossiers = [
        {
          id: 'd-02',
          statut: 'EN_ATTENTE',
          created_at: new Date(),
          apprenant: { id: 'app-02', nom: 'Diallo', prenoms: 'Mariama', email: 'm@org.ci' },
          formation: { id: 'f-01', intitule: 'Cybersécurité', type_formation: 'CERTIFIANTE', cout_catalogue: 300000000 },
          session: { date_debut: new Date('2026-06-01'), date_fin: new Date('2026-06-05'), statut: 'INSCRIPTIONS_OUVERTES' },
          paiement: null,
        },
      ];
      mockPrisma.dossier.findMany.mockResolvedValue(dossiers);
      mockPrisma.dossier.count.mockResolvedValue(1);

      const result = await service.getSuiviInscriptions('org-01', {});

      expect(result.dossiers[0].paiement).toBeNull();
      expect(result.dossiers[0].formation.cout_catalogue).toBe(300000000);
    });
  });

  // B2 — getSuiviInscriptions ne doit pas exposer les inscriptions personnelles
  describe('getSuiviInscriptions — isolation inscriptions org (B2)', () => {
    it('ne retourne que les dossiers B2B ou voucher organisation, pas les inscriptions personnelles RETAIL', async () => {
      mockPrisma.dossier.findMany.mockResolvedValue([]);
      mockPrisma.dossier.count.mockResolvedValue(0);

      await service.getSuiviInscriptions('org-01', {});

      expect(mockPrisma.dossier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ source_financement: 'B2B' }),
              expect.objectContaining({ voucher_organisation_id: expect.objectContaining({ not: null }) }),
            ]),
          }),
        })
      );
    });

    it('un dossier RETAIL d\'un apprenant de l\'org n\'est pas retourné', async () => {
      const dossierRetail = {
        id: 'd-retail',
        statut: 'PAYE_DIRECTEMENT',
        source_financement: 'RETAIL',
        voucher_organisation_id: null,
        created_at: new Date(),
        apprenant: { id: 'app-01', nom: 'Cisse', prenoms: 'Hassan', email: 'h@org.ci' },
        formation: { id: 'f-01', intitule: 'Cyber', type_formation: 'CERTIFIANTE', cout_catalogue: 300000000 },
        session: { date_debut: new Date(), date_fin: new Date(), statut: 'INSCRIPTIONS_OUVERTES' },
        paiement: { statut: 'EN_ATTENTE', confirmed_at: null, montant_final: 300000000 },
      };
      // Le mock ne retourne rien car Prisma filtre en DB — on vérifie juste le where
      mockPrisma.dossier.findMany.mockResolvedValue([]);
      mockPrisma.dossier.count.mockResolvedValue(0);

      const result = await service.getSuiviInscriptions('org-01', {});

      // Un dossier RETAIL ne doit jamais passer le filtre
      const whereArg = mockPrisma.dossier.findMany.mock.calls[0][0].where;
      expect(JSON.stringify(whereArg)).not.toContain('"source_financement":"RETAIL"');
      expect(result.dossiers).toHaveLength(0);
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

  // Error case : getDashboard ORGANISATION_NOT_FOUND
  describe('getDashboard — ORGANISATION_NOT_FOUND', () => {
    it('lance ORGANISATION_NOT_FOUND si l\'organisation est introuvable', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(null);
      mockRepo.getStatsOrganisation.mockResolvedValue({} as any);
      mockPrisma.dossier.findMany.mockResolvedValue([]);

      await expect(service.getDashboard('org-inconnue')).rejects.toThrow('ORGANISATION_NOT_FOUND');
      expect(mockRepo.findOrganisationById).toHaveBeenCalledWith('org-inconnue');
    });
  });

  // Error case : getDashboardB2B ABONNEMENT_B2B_INACTIF
  describe('getDashboardB2B — ABONNEMENT_B2B_INACTIF', () => {
    it('lance ABONNEMENT_B2B_INACTIF si l\'organisation n\'a pas d\'abonnement B2B', async () => {
      const orgSansB2B = { ...orgAvecB2B, abonnement_b2b: null };
      mockRepo.findOrganisationById.mockResolvedValue(orgSansB2B as any);

      await expect(service.getDashboardB2B('org-01')).rejects.toThrow('ABONNEMENT_B2B_INACTIF');
    });

    it('lance ABONNEMENT_B2B_INACTIF si l\'organisation est introuvable', async () => {
      mockRepo.findOrganisationById.mockResolvedValue(null);

      await expect(service.getDashboardB2B('org-inconnue')).rejects.toThrow('ABONNEMENT_B2B_INACTIF');
    });
  });

  // Error case : desactiverBeneficiaire APPRENANT_NOT_FOUND
  describe('desactiverBeneficiaire — APPRENANT_NOT_FOUND', () => {
    it('lance APPRENANT_NOT_FOUND si l\'apprenant n\'appartient pas à l\'organisation', async () => {
      mockPrisma.apprenant.findFirst.mockResolvedValue(null);

      await expect(
        service.desactiverBeneficiaire('app-inexistant', 'org-01', 'user-01')
      ).rejects.toThrow('APPRENANT_NOT_FOUND');
      expect(mockPrisma.apprenant.update).not.toHaveBeenCalled();
    });
  });

  describe('createMembre — RM-61', () => {
    const dataCreation = {
      email: 'nouveau@org.ci',
      nom: 'Diallo',
      prenom: 'Aissatou',
      secteur_activite: 'TECH',
      niveau_etude: 'BAC+5',
    };

    it('lance EMAIL_DEJA_UTILISE si l email existe deja', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({ id: 'app-existant' });

      await expect(service.createMembre('org-01', dataCreation)).rejects.toThrow('EMAIL_DEJA_UTILISE');
      expect(mockPrisma.apprenant.create).not.toHaveBeenCalled();
    });

    it('lance B2B_PLAFOND_ATTEINT si quota depasse', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      const orgPleine = { ...orgAvecB2B, abonnement_b2b: { ...orgAvecB2B.abonnement_b2b, nb_max: 30 } };
      mockRepo.findOrganisationById.mockResolvedValue(orgPleine as any);
      mockRepo.countActifsB2B.mockResolvedValue(30);

      await expect(service.createMembre('org-01', dataCreation)).rejects.toThrow('B2B_PLAFOND_ATTEINT');
      expect(mockPrisma.apprenant.create).not.toHaveBeenCalled();
    });

    it('cree l apprenant et incremente nb_actifs B2B', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
      mockRepo.countActifsB2B.mockResolvedValue(30);
      const apprenantCree = { id: 'app-nouveau', email: 'nouveau@org.ci', nom: 'Diallo', prenoms: 'Aissatou' };
      mockPrisma.apprenant.create.mockResolvedValue(apprenantCree);
      mockPrisma.abonnementB2B.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.createMembre('org-01', dataCreation);

      expect(mockPrisma.apprenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'nouveau@org.ci',
            nom: 'Diallo',
            organisation_id: 'org-01',
            statut: 'ACTIF',
          }),
        })
      );
      expect(mockPrisma.abonnementB2B.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { nb_actifs: { increment: 1 } } })
      );
      expect(result.apprenant.id).toBe('app-nouveau');
    });
  });

  describe('commanderVouchers', () => {
    it('lance FORMATION_NOT_FOUND si la formation est introuvable', async () => {
      mockPrisma.formation.findUnique.mockResolvedValue(null);

      await expect(
        service.commanderVouchers('org-01', { formation_id: 'f-inconnue', quantite: 5 })
      ).rejects.toThrow('FORMATION_NOT_FOUND');
      expect(mockPrisma.voucherApporteur.create).not.toHaveBeenCalled();
    });

    it('cree le bon nombre de vouchers et journalise', async () => {
      const formation = { id: 'f-01', cout_catalogue: 150000 };
      mockPrisma.formation.findUnique.mockResolvedValue(formation as any);
      mockPrisma.voucherApporteur.create.mockResolvedValue({ id: 'v-01', code: 'ORG-xxx', statut: 'ACTIF' });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.commanderVouchers('org-01', { formation_id: 'f-01', quantite: 3 });

      expect(mockPrisma.voucherApporteur.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.voucherApporteur.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organisation_id: 'org-01',
            formation_id: 'f-01',
            statut: 'ACTIF',
            type: 'PROMOTIONNEL',
            valeur: 150000,
          }),
        })
      );
      expect(result.vouchers).toHaveLength(3);
      expect(mockAudit.info).toHaveBeenCalledWith('VOUCHERS_COMMANDES', expect.objectContaining({ quantite: 3 }));
    });
  });

  describe('getMesPaiements', () => {
    const paiementFixture = [
      {
        id: 'p-01',
        statut: 'CONFIRME',
        confirmed_at: new Date('2026-03-15'),
        montant_final: 200000,
        dossier: {
          apprenant: { nom: 'Cisse', prenoms: 'Tidiane', email: 't@org.ci' },
          formation: { intitule: 'Cloud AWS' },
        },
      },
    ];

    it('retourne la liste paginee des paiements', async () => {
      mockPrisma.paiement.findMany.mockResolvedValue(paiementFixture);
      mockPrisma.paiement.count.mockResolvedValue(1);

      const result = await service.getMesPaiements('org-01', { page: 1, limit: 20 });

      expect(result.paiements).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applique le filtre date_debut dans le where Prisma', async () => {
      mockPrisma.paiement.findMany.mockResolvedValue([]);
      mockPrisma.paiement.count.mockResolvedValue(0);

      await service.getMesPaiements('org-01', { date_debut: '2026-01-01', page: 1, limit: 20 });

      const whereArg = mockPrisma.paiement.findMany.mock.calls[0][0].where;
      expect(whereArg.confirmed_at).toBeDefined();
      expect(whereArg.confirmed_at.gte).toEqual(new Date('2026-01-01'));
    });

    it('applique date_debut et date_fin ensemble', async () => {
      mockPrisma.paiement.findMany.mockResolvedValue([]);
      mockPrisma.paiement.count.mockResolvedValue(0);

      await service.getMesPaiements('org-01', { date_debut: '2026-01-01', date_fin: '2026-03-31', page: 1, limit: 20 });

      const whereArg = mockPrisma.paiement.findMany.mock.calls[0][0].where;
      expect(whereArg.confirmed_at.gte).toEqual(new Date('2026-01-01'));
      expect(whereArg.confirmed_at.lte).toEqual(new Date('2026-03-31'));
    });
  });
});
