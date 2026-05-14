import { PaiementFineoService } from '../paiement-fineo.service';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { VoucherRepository } from '../../vouchers/voucher.repository';
import { FineoClient } from '../fineo.client';

jest.mock('../fineo.client');

const prisma = new PrismaClient();
const audit = new AuditLogger(prisma);
const voucherRepo = new VoucherRepository(prisma);

const MONTANT_CENTIMES = 80000;
const MONTANT_XOF = Math.round(MONTANT_CENTIMES / 100);

const TEST_IDS = {
  apprenant: 'test-fineo-initier-apprenant',
  formation: 'test-fineo-initier-formation',
  partenaire: 'test-fineo-initier-partenaire',
  session: 'test-fineo-initier-session',
};

describe('PaiementFineoService — initiation paiement FineoPay', () => {
  let service: PaiementFineoService;
  let mockCreateCheckoutLink: jest.Mock;

  beforeAll(async () => {
    await prisma.paiement.deleteMany({ where: { dossier_id: { startsWith: 'D-FINEO-INIT-' } } });
    await prisma.dossier.deleteMany({ where: { id: { startsWith: 'D-FINEO-INIT-' } } });

    await prisma.apprenant.upsert({
      where: { id: TEST_IDS.apprenant },
      update: {},
      create: {
        id: TEST_IDS.apprenant,
        email: 'test-fineo-initier@forges.ci',
        password_hash: 'hash',
        nom: 'Fineo',
        prenoms: 'Initier',
        type_apprenant: 'APPRENANT',
        niveau_etude: 'LICENCE',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        statut: 'ACTIF',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
      },
    });

    await prisma.partenaire.upsert({
      where: { id: TEST_IDS.partenaire },
      update: {},
      create: {
        id: TEST_IDS.partenaire,
        raison_sociale: 'Partenaire Fineo Initier',
        type: 'ORGANISME',
        pays: 'CI',
        email_principal: 'partenaire-fineo-init@forges.ci',
        commission_forges_pct: 30,
        statut: 'ACTIF',
        mode_inscription: 'AUTO_INSCRIPTION',
      },
    });

    await prisma.formation.upsert({
      where: { id: TEST_IDS.formation },
      update: { cout_catalogue: MONTANT_CENTIMES, statut: 'ACTIVE' },
      create: {
        id: TEST_IDS.formation,
        intitule: 'Formation Fineo Initier Test',
        description_courte: 'Fixture initiation FineoPay',
        duree_jours: 1,
        cout_catalogue: MONTANT_CENTIMES,
        responsable_id: 'test-responsable',
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        statut: 'ACTIVE',
        objectifs_pedagogiques: [],
        langues_disponibles: ['FR'],
        partenaire_id: TEST_IDS.partenaire,
      },
    });

    await prisma.session.upsert({
      where: { id: TEST_IDS.session },
      update: {},
      create: {
        id: TEST_IDS.session,
        formation_id: TEST_IDS.formation,
        date_debut: new Date(Date.now() + 10 * 86400000),
        date_fin: new Date(Date.now() + 11 * 86400000),
        capacite: 20,
        places_restantes: 20,
        date_ouverture: new Date(Date.now() + 5 * 86400000),
        date_cloture: new Date(Date.now() + 9 * 86400000),
        statut: 'PLANIFIEE',
      },
    });
  });

  afterAll(async () => {
    await prisma.paiement.deleteMany({ where: { dossier_id: { startsWith: 'D-FINEO-INIT-' } } });
    await prisma.dossier.deleteMany({ where: { id: { startsWith: 'D-FINEO-INIT-' } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateCheckoutLink = jest.fn().mockResolvedValue({
      checkoutLink: 'https://demo.fineopay.com/checkout/test-link',
    });

    (FineoClient as jest.Mock).mockImplementation(() => ({
      createCheckoutLink: mockCreateCheckoutLink,
    }));

    service = new PaiementFineoService(prisma, voucherRepo, audit);
  });

  async function creerDossier(dossierId: string, statut = 'RETENU') {
    await prisma.dossier.upsert({
      where: { id: dossierId },
      update: { statut },
      create: {
        id: dossierId,
        apprenant_id: TEST_IDS.apprenant,
        formation_id: TEST_IDS.formation,
        session_id: TEST_IDS.session,
        statut,
        source_financement: 'RETAIL',
      },
    });
  }

  describe('Cas nominal', () => {
    it('doit créer un paiement FineoPay et retourner le checkout link', async () => {
      const dossierId = 'D-FINEO-INIT-01';
      await creerDossier(dossierId);

      const result = await service.initierPaiement(dossierId, TEST_IDS.apprenant);

      expect(result.checkout_link).toBe('https://demo.fineopay.com/checkout/test-link');
      expect(result.sync_ref).toMatch(/^FRG-FNO-/);
      expect(result.montant_initie).toBe(MONTANT_XOF);
      expect(result.paiement_id).toBeDefined();

      expect(mockCreateCheckoutLink).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: MONTANT_XOF,
          syncRef: result.sync_ref,
        })
      );

      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.provider).toBe('FINEO');
      expect(paiement?.statut).toBe('PENDING');
      expect(paiement?.montant_catalogue).toBe(MONTANT_CENTIMES);
      expect(paiement?.montant_final).toBe(MONTANT_CENTIMES);
      expect(paiement?.reduction_appliquee).toBe(0);
      expect(paiement?.order_ngser).toBe(result.sync_ref);
    });

    it('doit reprendre un paiement FINEO existant sans rappeler FineoPay', async () => {
      const dossierId = 'D-FINEO-INIT-02';
      await creerDossier(dossierId);

      const first = await service.initierPaiement(dossierId, TEST_IDS.apprenant);
      const second = await service.initierPaiement(dossierId, TEST_IDS.apprenant);

      expect(second.paiement_id).toBe(first.paiement_id);
      expect(mockCreateCheckoutLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cas d\'erreur', () => {
    it('doit rejeter si dossier introuvable', async () => {
      await expect(
        service.initierPaiement('D-FINEO-INEXISTANT', TEST_IDS.apprenant)
      ).rejects.toThrow('DOSSIER_NOT_FOUND');
    });

    it('doit rejeter si apprenant ne correspond pas au dossier (FORBIDDEN)', async () => {
      const dossierId = 'D-FINEO-INIT-03';
      await creerDossier(dossierId);

      await expect(
        service.initierPaiement(dossierId, 'autre-apprenant-id')
      ).rejects.toThrow('FORBIDDEN');
    });

    it('doit rejeter si dossier statut invalide (EN_ATTENTE_VERIFICATION)', async () => {
      const dossierId = 'D-FINEO-INIT-04';
      await creerDossier(dossierId, 'EN_ATTENTE_VERIFICATION');

      await expect(
        service.initierPaiement(dossierId, TEST_IDS.apprenant)
      ).rejects.toThrow('DOSSIER_STATUT_INVALIDE');
    });

    it('doit rejeter si dossier déjà PAYE', async () => {
      const dossierId = 'D-FINEO-INIT-05';
      await creerDossier(dossierId, 'PAYE');

      await expect(
        service.initierPaiement(dossierId, TEST_IDS.apprenant)
      ).rejects.toThrow('PAIEMENT_DEJA_VALIDE');
    });

    it('RM-07 : doit rejeter si le délai de paiement 72h est dépassé', async () => {
      const dossierId = 'D-FINEO-INIT-06';
      await creerDossier(dossierId);

      await prisma.paiement.create({
        data: {
          dossier_id: dossierId,
          montant_catalogue: MONTANT_CENTIMES,
          montant_final: MONTANT_CENTIMES,
          montant_initie: MONTANT_CENTIMES,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          tentatives: 0,
          provider: 'FINEO',
          order_ngser: 'FRG-FNO-EXPIRED-01',
          reduction_appliquee: 0,
          expires_at: new Date(Date.now() - 1000), // expiré il y a 1 seconde
        },
      });

      await expect(
        service.initierPaiement(dossierId, TEST_IDS.apprenant)
      ).rejects.toThrow('PAYMENT_EXPIRED');
    });

    it('RM-08 : doit rejeter après 3 tentatives épuisées', async () => {
      const dossierId = 'D-FINEO-INIT-07';
      await creerDossier(dossierId);

      await prisma.paiement.create({
        data: {
          dossier_id: dossierId,
          montant_catalogue: MONTANT_CENTIMES,
          montant_final: MONTANT_CENTIMES,
          montant_initie: MONTANT_CENTIMES,
          methode: 'MOBILE_MONEY',
          statut: 'ECHOUE',
          tentatives: 3,
          provider: 'FINEO',
          order_ngser: 'FRG-FNO-MAXATT-01',
          reduction_appliquee: 0,
          expires_at: new Date(Date.now() + 3600 * 1000),
        },
      });

      await expect(
        service.initierPaiement(dossierId, TEST_IDS.apprenant)
      ).rejects.toThrow('TOO_MANY_ATTEMPTS');
    });
  });

  describe('Retry — paiement ECHOUE', () => {
    it('doit générer un nouveau checkout link après un échec (retry)', async () => {
      const dossierId = 'D-FINEO-INIT-08';
      await creerDossier(dossierId);

      await prisma.paiement.create({
        data: {
          dossier_id: dossierId,
          montant_catalogue: MONTANT_CENTIMES,
          montant_final: MONTANT_CENTIMES,
          montant_initie: MONTANT_CENTIMES,
          methode: 'MOBILE_MONEY',
          statut: 'ECHOUE',
          tentatives: 1,
          provider: 'FINEO',
          order_ngser: 'FRG-FNO-OLD-SYNCREF',
          transaction_id: 'FNO-REF-FAILED-001',
          reduction_appliquee: 0,
          expires_at: new Date(Date.now() + 3600 * 1000),
        },
      });

      const result = await service.initierPaiement(dossierId, TEST_IDS.apprenant);

      // Nouveau lien et nouvelle syncRef
      expect(result.checkout_link).toBe('https://demo.fineopay.com/checkout/test-link');
      expect(result.sync_ref).toMatch(/^FRG-FNO-/);
      expect(result.sync_ref).not.toBe('FRG-FNO-OLD-SYNCREF');

      // Paiement mis à jour : PENDING, nouvelle syncRef, transaction_id effacé
      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.statut).toBe('PENDING');
      expect(paiement?.order_ngser).toBe(result.sync_ref);
      expect(paiement?.transaction_id).toBeNull();

      // createCheckoutLink appelé une fois (pas de résumé du lien précédent)
      expect(mockCreateCheckoutLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('Voucher promotionnel — application au lien de paiement', () => {
    const VOUCHER_PCT_CODE = 'FINEO-PROMO-PCT-10';
    const VOUCHER_MONTANT_CODE = 'FINEO-PROMO-MNT-20000';

    beforeAll(async () => {
      // Nettoyage des dossiers de cette suite
      await prisma.paiement.deleteMany({
        where: { dossier_id: { in: ['D-FINEO-PROMO-PCT-01', 'D-FINEO-PROMO-MNT-01', 'D-FINEO-PROMO-NONE-01'] } },
      });
      await prisma.dossier.deleteMany({
        where: { id: { in: ['D-FINEO-PROMO-PCT-01', 'D-FINEO-PROMO-MNT-01', 'D-FINEO-PROMO-NONE-01'] } },
      });

      // Voucher POURCENTAGE : -10%
      await prisma.voucherApporteur.upsert({
        where: { code: VOUCHER_PCT_CODE },
        update: {},
        create: {
          code: VOUCHER_PCT_CODE,
          type: 'PROMOTIONNEL',
          type_valeur: 'POURCENTAGE',
          valeur: 10,
          quota_max: 99,
          statut: 'ACTIF',
        },
      });

      // Voucher MONTANT : -20000 centimes (200 XOF)
      await prisma.voucherApporteur.upsert({
        where: { code: VOUCHER_MONTANT_CODE },
        update: {},
        create: {
          code: VOUCHER_MONTANT_CODE,
          type: 'PROMOTIONNEL',
          type_valeur: 'MONTANT',
          valeur: 20000,
          quota_max: 99,
          statut: 'ACTIF',
        },
      });
    });

    afterAll(async () => {
      await prisma.paiement.deleteMany({
        where: { dossier_id: { in: ['D-FINEO-PROMO-PCT-01', 'D-FINEO-PROMO-MNT-01', 'D-FINEO-PROMO-NONE-01'] } },
      });
      await prisma.dossier.deleteMany({
        where: { id: { in: ['D-FINEO-PROMO-PCT-01', 'D-FINEO-PROMO-MNT-01', 'D-FINEO-PROMO-NONE-01'] } },
      });
      await prisma.voucherApporteur.deleteMany({
        where: { code: { in: [VOUCHER_PCT_CODE, VOUCHER_MONTANT_CODE] } },
      });
    });

    async function creerDossierAvecVoucher(dossierId: string, voucherCode: string) {
      await prisma.dossier.upsert({
        where: { id: dossierId },
        update: { statut: 'RETENU', voucher_code: voucherCode },
        create: {
          id: dossierId,
          apprenant_id: TEST_IDS.apprenant,
          formation_id: TEST_IDS.formation,
          session_id: TEST_IDS.session,
          statut: 'RETENU',
          source_financement: 'RETAIL',
          voucher_code: voucherCode,
        },
      });
    }

    it('doit appliquer une réduction POURCENTAGE (-10%) sur le lien Fineo', async () => {
      const dossierId = 'D-FINEO-PROMO-PCT-01';
      await creerDossierAvecVoucher(dossierId, VOUCHER_PCT_CODE);

      const result = await service.initierPaiement(dossierId, TEST_IDS.apprenant);

      // 80000 centimes × 0.90 = 72000 centimes = 720 XOF
      const montantAttenduXof = Math.floor(MONTANT_CENTIMES * 0.9) / 100;
      expect(result.montant_initie).toBe(montantAttenduXof);

      expect(mockCreateCheckoutLink).toHaveBeenCalledWith(
        expect.objectContaining({ amount: montantAttenduXof })
      );

      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.montant_catalogue).toBe(MONTANT_CENTIMES);
      expect(paiement?.montant_final).toBe(Math.floor(MONTANT_CENTIMES * 0.9));
      expect(paiement?.reduction_appliquee).toBe(MONTANT_CENTIMES - Math.floor(MONTANT_CENTIMES * 0.9));
    });

    it('doit appliquer une réduction MONTANT (-20000 centimes) sur le lien Fineo', async () => {
      const dossierId = 'D-FINEO-PROMO-MNT-01';
      await creerDossierAvecVoucher(dossierId, VOUCHER_MONTANT_CODE);

      const result = await service.initierPaiement(dossierId, TEST_IDS.apprenant);

      // 80000 - 20000 = 60000 centimes = 600 XOF
      const montantAttenduXof = (MONTANT_CENTIMES - 20000) / 100;
      expect(result.montant_initie).toBe(montantAttenduXof);

      expect(mockCreateCheckoutLink).toHaveBeenCalledWith(
        expect.objectContaining({ amount: montantAttenduXof })
      );

      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.montant_catalogue).toBe(MONTANT_CENTIMES);
      expect(paiement?.montant_final).toBe(MONTANT_CENTIMES - 20000);
      expect(paiement?.reduction_appliquee).toBe(20000);
    });

    it('doit utiliser le plein tarif si le voucher_code est absent du dossier', async () => {
      const dossierId = 'D-FINEO-PROMO-NONE-01';
      await creerDossier(dossierId);

      const result = await service.initierPaiement(dossierId, TEST_IDS.apprenant);

      expect(result.montant_initie).toBe(MONTANT_XOF);
      expect(mockCreateCheckoutLink).toHaveBeenCalledWith(
        expect.objectContaining({ amount: MONTANT_XOF })
      );

      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.reduction_appliquee).toBe(0);
    });
  });
});
