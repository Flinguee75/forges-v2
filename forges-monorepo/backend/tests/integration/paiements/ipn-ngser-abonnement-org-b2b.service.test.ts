import { IpnNgserService } from 'modules/paiements/ipn-ngser.service';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from 'shared/audit/audit.logger';
import { CommissionService } from 'modules/paiements/commission.service';

/**
 * Tests d'intégration DB pour les flux IPN NGSER
 * sur AbonnementOrganisation et AbonnementB2B.
 *
 * Vérifie RM-158 étendu : fallback order_ngser sur org et B2B
 * après échec de lookup sur Paiement et AbonnementRetail.
 */

const prisma = new PrismaClient();
const audit = new AuditLogger(prisma);
const commissionService = new CommissionService(prisma, audit);
const service = new IpnNgserService(prisma, audit, commissionService);

const ORG_ID = 'test-ipn-org-b2b-org';
const ABO_ORG_ID = 'test-ipn-abo-org-01';
const ABO_ORG_FAIL_ID = 'test-ipn-abo-org-fail-01';
const ABO_B2B_ID = 'test-ipn-abo-b2b-01';
const ABO_B2B_FAIL_ID = 'test-ipn-abo-b2b-fail-01';

const ORDER_ORG_SUCCESS = 'ABO-ORG-2026-124-ORGOK01';
const ORDER_ORG_FAIL = 'ABO-ORG-2026-124-ORGKO01';
const ORDER_B2B_SUCCESS = 'ABO-B2B-2026-124-B2BOK01';
const ORDER_B2B_FAIL = 'ABO-B2B-2026-124-B2BKO01';

async function upsertOrganisation(id: string, email: string) {
  await prisma.organisation.upsert({
    where: { id },
    update: {},
    create: {
      id,
      email,
      raison_sociale: 'Test Org IPN',
      type: 'ENTREPRISE',
      sous_types: [],
      contact_referent: 'Test Contact',
      pays: 'CI',
      password_hash: '$2b$12$test-password-hash-only-for-tests',
      statut: 'ACTIF',
    },
  });
}

async function createAbonnementOrgEnAttente(id: string, orgId: string, orderNgser: string) {
  await prisma.abonnementOrganisation.deleteMany({ where: { id } });
  return prisma.abonnementOrganisation.create({
    data: {
      id,
      organisation_id: orgId,
      offre: 'PRO',
      statut: 'EN_ATTENTE_PAIEMENT',
      montant_annuel: 150000,
      perimetre_fonctionnel: [],
      date_debut: new Date(),
      date_fin: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      renouvellement_auto: true,
      order_ngser: orderNgser,
    },
  });
}

async function createAbonnementB2BEnAttente(id: string, orgId: string, orderNgser: string) {
  await prisma.abonnementB2B.deleteMany({ where: { id } });
  return prisma.abonnementB2B.create({
    data: {
      id,
      organisation_id: orgId,
      palier: 'STARTER',
      nb_max: 20,
      nb_actifs: 0,
      prix_annuel: 250000,
      premium_consommes: 0,
      date_debut: new Date(),
      date_fin: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      statut: 'EN_ATTENTE_PAIEMENT',
      order_ngser: orderNgser,
    },
  });
}

const ORG_SUCCESS_ID = 'test-ipn-org-success';
const ORG_FAIL_ID = 'test-ipn-org-fail';
const ORG_B2B_SUCCESS_ID = 'test-ipn-org-b2b-success';
const ORG_B2B_FAIL_ID = 'test-ipn-org-b2b-fail';

describe('IpnNgserService — AbonnementOrganisation (RM-158 étendu)', () => {
  beforeAll(async () => {
    await upsertOrganisation(ORG_SUCCESS_ID, 'ipn-org-success@forges-test.ci');
    await upsertOrganisation(ORG_FAIL_ID, 'ipn-org-fail@forges-test.ci');
  });

  beforeEach(async () => {
    await createAbonnementOrgEnAttente(ABO_ORG_ID, ORG_SUCCESS_ID, ORDER_ORG_SUCCESS);
    await createAbonnementOrgEnAttente(ABO_ORG_FAIL_ID, ORG_FAIL_ID, ORDER_ORG_FAIL);
  });

  afterAll(async () => {
    await prisma.abonnementOrganisation.deleteMany({
      where: { organisation_id: { in: [ORG_SUCCESS_ID, ORG_FAIL_ID] } },
    });
    await prisma.organisation.deleteMany({
      where: { id: { in: [ORG_SUCCESS_ID, ORG_FAIL_ID] } },
    });
  });

  it('IPN SUCCESS — active AbonnementOrganisation EN_ATTENTE_PAIEMENT -> ACTIF et lie abonnement_org_id', async () => {
    const result = await service.traiterIpn({
      order_id: ORDER_ORG_SUCCESS,
      status_id: 1,
      transaction_id: `tx-org-ok-${Date.now()}`,
      transaction_amount: 1500,
    });

    expect(result.action).toBe('ABONNEMENT_ORG_ACTIVE');
    expect(result.paiement_statut).toBe('CONFIRME');

    const abo = await prisma.abonnementOrganisation.findUnique({ where: { id: ABO_ORG_ID } });
    expect(abo?.statut).toBe('ACTIF');
    expect(abo?.transaction_id_ngser).toBeDefined();

    const org = await prisma.organisation.findUnique({ where: { id: ORG_SUCCESS_ID } });
    expect(org?.abonnement_org_id).toBe(ABO_ORG_ID);
  });

  it('IPN FAIL — annule AbonnementOrganisation EN_ATTENTE_PAIEMENT -> ANNULE', async () => {
    const result = await service.traiterIpn({
      order_id: ORDER_ORG_FAIL,
      status_id: 0,
      transaction_id: `tx-org-ko-${Date.now()}`,
      transaction_amount: 0,
    });

    expect(result.action).toBe('ABONNEMENT_ORG_ANNULE');
    expect(result.paiement_statut).toBe('ECHOUE');

    const abo = await prisma.abonnementOrganisation.findUnique({ where: { id: ABO_ORG_FAIL_ID } });
    expect(abo?.statut).toBe('ANNULE');
  });

  it('IPN idempotent — ignore si abonnement org déjà ACTIF', async () => {
    await prisma.abonnementOrganisation.update({
      where: { id: ABO_ORG_ID },
      data: { statut: 'ACTIF', transaction_id_ngser: 'tx-already-done' },
    });

    const result = await service.traiterIpn({
      order_id: ORDER_ORG_SUCCESS,
      status_id: 1,
      transaction_id: `tx-org-replay-${Date.now()}`,
      transaction_amount: 1500,
    });

    expect(result.already_processed).toBe(true);
    expect(result.action).toBe('NONE');

    const abo = await prisma.abonnementOrganisation.findUnique({ where: { id: ABO_ORG_ID } });
    expect(abo?.statut).toBe('ACTIF');
  });
});

describe('IpnNgserService — AbonnementB2B (RM-158 étendu)', () => {
  beforeAll(async () => {
    await upsertOrganisation(ORG_B2B_SUCCESS_ID, 'ipn-b2b-success@forges-test.ci');
    await upsertOrganisation(ORG_B2B_FAIL_ID, 'ipn-b2b-fail@forges-test.ci');
  });

  beforeEach(async () => {
    await createAbonnementB2BEnAttente(ABO_B2B_ID, ORG_B2B_SUCCESS_ID, ORDER_B2B_SUCCESS);
    await createAbonnementB2BEnAttente(ABO_B2B_FAIL_ID, ORG_B2B_FAIL_ID, ORDER_B2B_FAIL);
  });

  afterAll(async () => {
    await prisma.abonnementB2B.deleteMany({
      where: { organisation_id: { in: [ORG_B2B_SUCCESS_ID, ORG_B2B_FAIL_ID] } },
    });
    await prisma.organisation.deleteMany({
      where: { id: { in: [ORG_B2B_SUCCESS_ID, ORG_B2B_FAIL_ID] } },
    });
    await prisma.$disconnect();
  });

  it('IPN SUCCESS — active AbonnementB2B EN_ATTENTE_PAIEMENT -> ACTIF et lie abonnement_b2b_id', async () => {
    const result = await service.traiterIpn({
      order_id: ORDER_B2B_SUCCESS,
      status_id: 1,
      transaction_id: `tx-b2b-ok-${Date.now()}`,
      transaction_amount: 2500,
    });

    expect(result.action).toBe('ABONNEMENT_B2B_ACTIVE');
    expect(result.paiement_statut).toBe('CONFIRME');

    const abo = await prisma.abonnementB2B.findUnique({ where: { id: ABO_B2B_ID } });
    expect(abo?.statut).toBe('ACTIF');
    expect(abo?.transaction_id_ngser).toBeDefined();

    const org = await prisma.organisation.findUnique({ where: { id: ORG_B2B_SUCCESS_ID } });
    expect(org?.abonnement_b2b_id).toBe(ABO_B2B_ID);
  });

  it('IPN FAIL — annule AbonnementB2B EN_ATTENTE_PAIEMENT -> ANNULE', async () => {
    const result = await service.traiterIpn({
      order_id: ORDER_B2B_FAIL,
      status_id: 0,
      transaction_id: `tx-b2b-ko-${Date.now()}`,
      transaction_amount: 0,
    });

    expect(result.action).toBe('ABONNEMENT_B2B_ANNULE');
    expect(result.paiement_statut).toBe('ECHOUE');

    const abo = await prisma.abonnementB2B.findUnique({ where: { id: ABO_B2B_FAIL_ID } });
    expect(abo?.statut).toBe('ANNULE');
  });

  it('IPN idempotent — ignore si abonnement B2B déjà ACTIF', async () => {
    await prisma.abonnementB2B.update({
      where: { id: ABO_B2B_ID },
      data: { statut: 'ACTIF', transaction_id_ngser: 'tx-b2b-already-done' },
    });

    const result = await service.traiterIpn({
      order_id: ORDER_B2B_SUCCESS,
      status_id: 1,
      transaction_id: `tx-b2b-replay-${Date.now()}`,
      transaction_amount: 2500,
    });

    expect(result.already_processed).toBe(true);
    expect(result.action).toBe('NONE');

    const abo = await prisma.abonnementB2B.findUnique({ where: { id: ABO_B2B_ID } });
    expect(abo?.statut).toBe('ACTIF');
  });
});
