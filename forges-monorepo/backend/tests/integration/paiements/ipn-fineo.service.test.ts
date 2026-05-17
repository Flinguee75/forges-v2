import { IpnFineoService } from 'modules/paiements/ipn-fineo.service';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from 'shared/audit/audit.logger';
import { CommissionService } from 'modules/paiements/commission.service';
import { FineoClient } from 'modules/paiements/fineo.client';

jest.mock('modules/paiements/fineo.client');

const prisma = new PrismaClient();
const audit = new AuditLogger(prisma);
const commissionService = new CommissionService(prisma, audit);

const MONTANT_CENTIMES = 50000;
const MONTANT_XOF = Math.round(MONTANT_CENTIMES / 100);

const TEST_IDS = {
  apprenant: 'test-fineo-apprenant',
  formation: 'test-fineo-formation',
  partenaire: 'test-fineo-partenaire',
  session: 'test-fineo-session',
};

describe('IpnFineoService — callback FineoPay', () => {
  let service: IpnFineoService;
  let mockGetTransaction: jest.Mock;

  beforeAll(async () => {
    // Nettoyage
    await prisma.commissionPartenaire.deleteMany({ where: { paiement: { dossier_id: { startsWith: 'D-FINEO-' } } } });
    await prisma.commissionApporteur.deleteMany({ where: { paiement: { dossier_id: { startsWith: 'D-FINEO-' } } } });
    await prisma.paiement.deleteMany({ where: { dossier_id: { startsWith: 'D-FINEO-' } } });
    await prisma.dossier.deleteMany({ where: { id: { startsWith: 'D-FINEO-' } } });

    await prisma.apprenant.upsert({
      where: { id: TEST_IDS.apprenant },
      update: {},
      create: {
        id: TEST_IDS.apprenant,
        email: 'test-fineo-apprenant@forges.ci',
        password_hash: 'hash',
        nom: 'Fineo',
        prenoms: 'Test',
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
        raison_sociale: 'Partenaire Fineo Test',
        type: 'ORGANISME',
        pays: 'CI',
        email_principal: 'partenaire-fineo@forges.ci',
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
        intitule: 'Formation Fineo Test',
        description_courte: 'Fixture IPN FineoPay',
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
    await prisma.commissionPartenaire.deleteMany({ where: { paiement: { dossier_id: { startsWith: 'D-FINEO-' } } } });
    await prisma.commissionApporteur.deleteMany({ where: { paiement: { dossier_id: { startsWith: 'D-FINEO-' } } } });
    await prisma.paiement.deleteMany({ where: { dossier_id: { startsWith: 'D-FINEO-' } } });
    await prisma.dossier.deleteMany({ where: { id: { startsWith: 'D-FINEO-' } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetTransaction = jest.fn();
    (FineoClient as jest.Mock).mockImplementation(() => ({
      getTransaction: mockGetTransaction,
    }));

    service = new IpnFineoService(prisma, audit, commissionService);
  });

  async function creerFixture(dossierId: string, syncRef: string) {
    await prisma.dossier.upsert({
      where: { id: dossierId },
      update: { statut: 'RETENU' },
      create: {
        id: dossierId,
        apprenant_id: TEST_IDS.apprenant,
        formation_id: TEST_IDS.formation,
        session_id: TEST_IDS.session,
        statut: 'RETENU',
        source_financement: 'RETAIL',
      },
    });

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
        order_ngser: syncRef,
        reduction_appliquee: 0,
      },
    });
  }

  describe('Cas nominal — SUCCESS', () => {
    it('doit confirmer le paiement et passer le dossier à PAYE', async () => {
      const dossierId = 'D-FINEO-SUCCESS-01';
      const syncRef = 'FRG-FNO-2026-001-SUCC01';
      const reference = 'FNO-REF-SUCC-001';

      await creerFixture(dossierId, syncRef);

      mockGetTransaction.mockResolvedValue({
        reference,
        amount: MONTANT_XOF,
        status: 'success',
        canal: 'orange',
        fees: 500,
        direction: 'cashin',
        date: new Date().toISOString(),
        syncRef,
      });

      const result = await service.traiterCallback({
        reference,
        amount: MONTANT_XOF,
        status: 'success',
        syncRef,
      });

      expect(result.paiement_statut).toBe('CONFIRME');
      expect(result.dossier_statut).toBe('PAYE');

      const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
      expect(dossier?.statut).toBe('PAYE');

      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.statut).toBe('CONFIRME');
      expect(paiement?.transaction_id).toBe(reference);
    });
  });

  describe('Cas FAIL', () => {
    it('doit passer le paiement à ECHOUE mais conserver le dossier si tentatives < 3 (RM-08)', async () => {
      const dossierId = 'D-FINEO-FAIL-01';
      const syncRef = 'FRG-FNO-2026-001-FAIL01';
      const reference = 'FNO-REF-FAIL-001';

      await creerFixture(dossierId, syncRef);

      mockGetTransaction.mockResolvedValue({
        reference,
        amount: MONTANT_XOF,
        status: 'failed',
        canal: 'mtn',
        fees: 0,
        direction: 'cashin',
        date: new Date().toISOString(),
        syncRef,
      });

      const result = await service.traiterCallback({
        reference,
        amount: MONTANT_XOF,
        status: 'failed',
        syncRef,
      });

      expect(result.paiement_statut).toBe('ECHOUE');
      // 1ère tentative : dossier reste RETENU, pas encore ANNULE
      expect(result.dossier_statut).toBe('RETENU');

      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.tentatives).toBe(1);

      const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
      expect(dossier?.statut).toBe('RETENU');
    });

    it('doit annuler le dossier si expires_at dépassé même avant 3 tentatives (RM-07)', async () => {
      const dossierId = 'D-FINEO-FAIL-03';
      const syncRef = 'FRG-FNO-2026-001-FAIL03';
      const reference = 'FNO-REF-FAIL-003';

      await creerFixture(dossierId, syncRef);

      // Forcer expires_at dans le passé
      await prisma.paiement.update({
        where: { dossier_id: dossierId },
        data: { expires_at: new Date(Date.now() - 1000) },
      });

      mockGetTransaction.mockResolvedValue({
        reference,
        amount: MONTANT_XOF,
        status: 'failed',
        canal: 'orange',
        fees: 0,
        direction: 'cashin',
        date: new Date().toISOString(),
        syncRef,
      });

      const result = await service.traiterCallback({
        reference,
        amount: MONTANT_XOF,
        status: 'failed',
        syncRef,
      });

      expect(result.paiement_statut).toBe('ECHOUE');
      expect(result.dossier_statut).toBe('ANNULE');

      const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
      expect(dossier?.statut).toBe('ANNULE');
    });

    it('doit annuler le dossier après 3 échecs (RM-08)', async () => {
      const dossierId = 'D-FINEO-FAIL-02';
      const syncRef = 'FRG-FNO-2026-001-FAIL02';
      const reference = 'FNO-REF-FAIL-002';

      await creerFixture(dossierId, syncRef);

      // Simuler déjà 2 tentatives échouées
      await prisma.paiement.update({
        where: { dossier_id: dossierId },
        data: { tentatives: 2 },
      });

      mockGetTransaction.mockResolvedValue({
        reference,
        amount: MONTANT_XOF,
        status: 'failed',
        canal: 'mtn',
        fees: 0,
        direction: 'cashin',
        date: new Date().toISOString(),
        syncRef,
      });

      const result = await service.traiterCallback({
        reference,
        amount: MONTANT_XOF,
        status: 'failed',
        syncRef,
      });

      expect(result.paiement_statut).toBe('ECHOUE');
      expect(result.dossier_statut).toBe('ANNULE');

      const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
      expect(dossier?.statut).toBe('ANNULE');
    });
  });

  describe('Sécurité — double vérification', () => {
    it('doit rejeter si getTransaction échoue (référence inconnue côté FineoPay)', async () => {
      mockGetTransaction.mockRejectedValue(new Error('FINEO_NOT_FOUND'));

      await expect(
        service.traiterCallback({
          reference: 'REF-FORGEE',
          amount: MONTANT_XOF,
          status: 'success',
          syncRef: 'FRG-FNO-2026-001-FAKE',
        })
      ).rejects.toThrow('FINEO_CB_VERIFICATION_ECHEC');
    });

    it('doit rejeter si syncRef manquante', async () => {
      mockGetTransaction.mockResolvedValue({
        reference: 'REF-001',
        amount: MONTANT_XOF,
        status: 'success',
        canal: 'orange',
        fees: 0,
        direction: 'cashin',
        date: new Date().toISOString(),
        // pas de syncRef
      });

      await expect(
        service.traiterCallback({
          reference: 'REF-001',
          amount: MONTANT_XOF,
          status: 'success',
        })
      ).rejects.toThrow('FINEO_CB_SYNCREF_MANQUANTE');
    });

    it('doit rejeter si référence manquante dans le callback', async () => {
      await expect(
        service.traiterCallback({
          reference: '',
          amount: MONTANT_XOF,
          status: 'success',
        })
      ).rejects.toThrow('FINEO_CB_REFERENCE_MANQUANTE');
    });
  });

  describe('Idempotence', () => {
    it('doit ignorer un callback doublon (déjà CONFIRME)', async () => {
      const dossierId = 'D-FINEO-IDEM-01';
      const syncRef = 'FRG-FNO-2026-001-IDEM01';
      const reference = 'FNO-REF-IDEM-001';

      await creerFixture(dossierId, syncRef);

      // Marquer comme déjà CONFIRME
      await prisma.paiement.update({
        where: { dossier_id: dossierId },
        data: { statut: 'CONFIRME', transaction_id: reference },
      });

      mockGetTransaction.mockResolvedValue({
        reference,
        amount: MONTANT_XOF,
        status: 'success',
        canal: 'orange',
        fees: 0,
        direction: 'cashin',
        date: new Date().toISOString(),
        syncRef,
      });

      const result = await service.traiterCallback({
        reference,
        amount: MONTANT_XOF,
        status: 'success',
        syncRef,
      });

      expect(result.already_processed).toBe(true);
      expect(result.action).toBe('NONE');
    });
  });

  describe('Contrôle montant', () => {
    it('doit rejeter si le montant vérifié ne correspond pas', async () => {
      const dossierId = 'D-FINEO-MONTANT-01';
      const syncRef = 'FRG-FNO-2026-001-MONT01';
      const reference = 'FNO-REF-MONT-001';

      await creerFixture(dossierId, syncRef);

      mockGetTransaction.mockResolvedValue({
        reference,
        amount: 99999, // montant différent
        status: 'success',
        canal: 'orange',
        fees: 0,
        direction: 'cashin',
        date: new Date().toISOString(),
        syncRef,
      });

      await expect(
        service.traiterCallback({ reference, amount: 99999, status: 'success', syncRef })
      ).rejects.toThrow('MONTANT_MISMATCH');
    });
  });
});
