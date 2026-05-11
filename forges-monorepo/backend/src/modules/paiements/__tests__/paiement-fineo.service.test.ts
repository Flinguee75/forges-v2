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
      expect(paiement?.montant_catalogue).toBe(MONTANT_XOF);
      expect(paiement?.montant_final).toBe(MONTANT_XOF);
      expect(paiement?.reduction_appliquee).toBe(0);
      expect(paiement?.order_ngser).toBe(result.sync_ref);
    });

    it('doit créer un paiement FineoPay sans échéance pour EN_ATTENTE_PAIEMENT', async () => {
      const dossierId = 'D-FINEO-INIT-ENATTENTE';
      await creerDossier(dossierId, 'EN_ATTENTE_PAIEMENT');

      const result = await service.initierPaiement(dossierId, TEST_IDS.apprenant);

      expect(result.checkout_link).toBe('https://demo.fineopay.com/checkout/test-link');
      expect(result.montant_initie).toBe(MONTANT_XOF);

      const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
      expect(paiement?.expires_at).toBeNull();
      expect(paiement?.statut).toBe('PENDING');
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
  });
});
