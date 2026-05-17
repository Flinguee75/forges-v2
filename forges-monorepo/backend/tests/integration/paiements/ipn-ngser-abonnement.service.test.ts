import { IpnNgserService } from 'modules/paiements/ipn-ngser.service';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from 'shared/audit/audit.logger';
import { CommissionService } from 'modules/paiements/commission.service';

/**
 * Tests unitaires (integration DB) pour le traitement IPN NGSER
 * sur les abonnements Retail (order_ngser prefixe ABO-).
 *
 * Ces tests verifient RM-158 etendu : si l'order ne correspond
 * pas a un Paiement, le service tente AbonnementRetail.order_ngser.
 */

const prisma = new PrismaClient();
const audit = new AuditLogger(prisma);
const commissionService = new CommissionService(prisma, audit);
const service = new IpnNgserService(prisma, audit, commissionService);

const TEST_APPRENANT_ID = 'test-ipn-abo-apprenant';

async function upsertApprenant(id: string, email: string) {
  await prisma.apprenant.upsert({
    where: { id },
    update: {},
    create: {
      id,
      email,
      password_hash: '$2b$12$test-password-hash-only-for-tests',
      nom: 'IPN',
      prenoms: 'AbonnementTest',
      type_apprenant: 'APPRENANT',
      niveau_etude: 'LICENCE',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
    },
  });
}

async function createAbonnementEnAttente(id: string, apprenantId: string, orderNgser: string) {
  await prisma.abonnementRetail.deleteMany({ where: { apprenant_id: apprenantId } });
  return prisma.abonnementRetail.create({
    data: {
      id,
      apprenant_id: apprenantId,
      offre: 'ESSENTIEL',
      statut: 'EN_ATTENTE_PAIEMENT',
      montant_mensuel: 15000,
      montant_premier_mois: 12000,
      order_ngser: orderNgser,
      date_debut: new Date(),
      date_fin: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      consentement_auto: true,
      consentement_timestamp: new Date(),
      suspension_count: 0,
    },
  });
}

describe('IpnNgserService — Abonnement Retail (RM-158 etendu)', () => {
  const ORDER_SUCCESS = 'ABO-2026-124-IPN001';
  const ORDER_FAIL = 'ABO-2026-124-IPN002';
  const ORDER_IDEMPOTENT = 'ABO-2026-124-IPN003';
  const ABO_ID_SUCCESS = 'abo-ipn-test-success-01';
  const ABO_ID_FAIL = 'abo-ipn-test-fail-01';
  const ABO_ID_IDEMPOTENT = 'abo-ipn-test-idempotent-01';
  const APPRENANT_SUCCESS = 'test-abo-ipn-ok-01';
  const APPRENANT_FAIL = 'test-abo-ipn-ko-01';
  const APPRENANT_IDEMPOTENT = 'test-abo-ipn-idem-01';

  beforeAll(async () => {
    await upsertApprenant(APPRENANT_SUCCESS, 'abo-ipn-ok-01@forges-test.ci');
    await upsertApprenant(APPRENANT_FAIL, 'abo-ipn-ko-01@forges-test.ci');
    await upsertApprenant(APPRENANT_IDEMPOTENT, 'abo-ipn-idem-01@forges-test.ci');
  });

  beforeEach(async () => {
    await createAbonnementEnAttente(ABO_ID_SUCCESS, APPRENANT_SUCCESS, ORDER_SUCCESS);
    await createAbonnementEnAttente(ABO_ID_FAIL, APPRENANT_FAIL, ORDER_FAIL);
  });

  afterAll(async () => {
    await prisma.abonnementRetail.deleteMany({
      where: { apprenant_id: { in: [APPRENANT_SUCCESS, APPRENANT_FAIL, APPRENANT_IDEMPOTENT] } },
    });
    await prisma.apprenant.deleteMany({
      where: { id: { in: [APPRENANT_SUCCESS, APPRENANT_FAIL, APPRENANT_IDEMPOTENT] } },
    });
    await prisma.$disconnect();
  });

  // ─── IPN SUCCESS : active l'abonnement ───────────────────────────

  it('IPN SUCCESS — active l\'abonnement EN_ATTENTE_PAIEMENT -> ACTIF', async () => {
    const result = await service.traiterIpn({
      order_id: ORDER_SUCCESS,
      status_id: 1,
      transaction_id: `tx-abo-ok-${Date.now()}`,
      transaction_amount: 120, // 12000 XOF / 100 (centimes -> XOF)
    });

    expect(result.action).toBe('ABONNEMENT_ACTIVE');
    expect(result.paiement_statut).toBe('CONFIRME');

    const abo = await prisma.abonnementRetail.findUnique({ where: { id: ABO_ID_SUCCESS } });
    expect(abo?.statut).toBe('ACTIF');
    expect(abo?.transaction_id_ngser).toBeDefined();
  });

  // ─── IPN FAIL : annule l'abonnement ──────────────────────────────

  it('IPN FAIL — annule l\'abonnement EN_ATTENTE_PAIEMENT -> ANNULE', async () => {
    const result = await service.traiterIpn({
      order_id: ORDER_FAIL,
      status_id: 0,
      transaction_id: `tx-abo-ko-${Date.now()}`,
      transaction_amount: 0,
    });

    expect(result.action).toBe('ABONNEMENT_ANNULE');
    expect(result.paiement_statut).toBe('ECHOUE');

    const abo = await prisma.abonnementRetail.findUnique({ where: { id: ABO_ID_FAIL } });
    expect(abo?.statut).toBe('ANNULE');
  });

  // ─── Idempotence : abonnement deja ACTIF ─────────────────────────

  it('IPN deja traite — idempotent si abonnement deja ACTIF', async () => {
    await createAbonnementEnAttente(ABO_ID_IDEMPOTENT, APPRENANT_IDEMPOTENT, ORDER_IDEMPOTENT);
    // Activer manuellement
    await prisma.abonnementRetail.update({
      where: { id: ABO_ID_IDEMPOTENT },
      data: { statut: 'ACTIF', transaction_id_ngser: 'tx-already-done' },
    });

    const result = await service.traiterIpn({
      order_id: ORDER_IDEMPOTENT,
      status_id: 1,
      transaction_id: `tx-abo-replay-${Date.now()}`,
      transaction_amount: 120,
    });

    expect(result.already_processed).toBe(true);
    expect(result.action).toBe('NONE');

    // Abonnement toujours ACTIF, pas de double traitement
    const abo = await prisma.abonnementRetail.findUnique({ where: { id: ABO_ID_IDEMPOTENT } });
    expect(abo?.statut).toBe('ACTIF');
  });

  // ─── Order inconnu : erreur attendue ─────────────────────────────

  it('order inconnu — leve PAIEMENT_NOT_FOUND si aucun paiement ni abonnement', async () => {
    await expect(service.traiterIpn({
      order_id: 'ABO-9999-999-UNKNOWN',
      status_id: 1,
      transaction_id: `tx-unknown-${Date.now()}`,
      transaction_amount: 100,
    })).rejects.toThrow('PAIEMENT_NOT_FOUND');
  });
});
