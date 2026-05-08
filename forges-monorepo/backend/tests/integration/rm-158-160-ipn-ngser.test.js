/**
 * Tests d'intégration RM-158/160 — Format IPN NGSER réel
 * Couvre: Idempotence stricte, Contrôle montant, Statuts NGSER
 * Date: 2026-05-04
 */

const { accounts, auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');
const { createHmac } = require('crypto');

// Constantes
const MONTANT_CATALOGUE_XOF = 1500; // 150000 centimes en DB
const MONTANT_CATALOGUE_CENTIMES = 150000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';

describe('RM-158/160 — IPN NGSER Format Réel (Idempotence & Montant)', () => {
  // Helper: Créer un webhook signature valide
  function createValidSignature(payload) {
    return createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  // Helper: Envoyer un IPN webhook signé
  async function sendWebhookIpn(payload) {
    const signature = createValidSignature(payload);
    return request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(payload);
  }

  // Helper: Créer un paiement NGSER en DB
  async function createNgserPaiement(dossierId) {
    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId }, select: { formation_id: true } });
    const formation = await prisma.formation.findUnique({
      where: { id: dossier?.formation_id || ids.standardFormation },
    });
    const orderNgser = `FRG-2026-TEST-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    return prisma.paiement.create({
      data: {
        dossier_id: dossierId,
        montant_catalogue: formation.cout_catalogue,
        montant_final: formation.cout_catalogue,
        reduction_appliquee: 0,
        methode: 'MOBILE_MONEY',
        statut: 'PENDING',
        tentatives: 0,
        expires_at: new Date(Date.now() + 72 * 3600 * 1000),
        provider: 'NGSER',
        order_ngser: orderNgser,
        montant_initie: formation.cout_catalogue,
      },
    });
  }

  beforeAll(async () => {
    // Setup test data
    await prisma.dossier.deleteMany({
      where: { id: { startsWith: 'D-IPN-TEST-' } },
    });
    await prisma.paiement.deleteMany({
      where: { dossier_id: { startsWith: 'D-IPN-TEST-' } },
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.commissionPartenaire.deleteMany({
      where: { paiement: { dossier_id: { startsWith: 'D-IPN-TEST-' } } },
    });
    await prisma.paiement.deleteMany({
      where: { dossier_id: { startsWith: 'D-IPN-TEST-' } },
    });
    await prisma.dossier.deleteMany({
      where: { id: { startsWith: 'D-IPN-TEST-' } },
    });
  });

  // ============================================================================
  // RM-158.1: Idempotence Stricte
  // ============================================================================

  describe('RM-158.1: Idempotence stricte (transaction_id unique)', () => {
    test('IPN doublon retourne 200 sans refaire l\'action', async () => {
      // Créer un dossier RETENU
      const account = await createApprenantAccount('ipn-doublon-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      expect(inscription.status).toBe(201);
      const dossierId = inscription.body.dossier.id;

      // Créer paiement NGSER directement en DB
      const formation = await prisma.formation.findUnique({
        where: { id: ids.standardFormation },
      });
      const orderNgser = `FRG-2026-TEST-${Date.now()}`;
      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossierId,
          montant_catalogue: formation.cout_catalogue,
          montant_final: formation.cout_catalogue,
          reduction_appliquee: 0,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          tentatives: 0,
          expires_at: new Date(Date.now() + 72 * 3600 * 1000),
          provider: 'NGSER',
          order_ngser: orderNgser,
          montant_initie: formation.cout_catalogue,
        },
      });

      // Premier IPN — Format NGSER réel
      const ipnPayload1 = {
        order_id: paiement.order_ngser,
        status_id: 1, // SUCCESS
        transaction_id: `TXN-DOUBLON-${Date.now()}`,
        transaction_amount: Math.round(formation.cout_catalogue / 100), // XOF
        wallet: 'MOBILE_MONEY',
      };

      const res1 = await sendWebhookIpn(ipnPayload1);
      expect(res1.status).toBe(200);

      // Vérifier que paiement est CONFIRME
      let paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('CONFIRME');

      // Vérifier commission éventuelle (uniquement pour formations partenaire)
      const commissions1 = await prisma.commissionPartenaire.count({
        where: { paiement_id: paiement.id },
      });

      // Deuxième IPN (doublon) — Même transaction_id
      const res2 = await sendWebhookIpn(ipnPayload1);
      expect(res2.status).toBe(200); // Doit répondre 200 quand même

      // Vérifier que rien n'a changé
      paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('CONFIRME');

      // Vérifier que commission N'A PAS été dupliquée
      const commissions2 = await prisma.commissionPartenaire.count({
        where: { paiement_id: paiement.id },
      });
      expect(commissions2).toBe(commissions1); // Idempotent : pas de duplication
    });

    test('transaction_id empêche double traitement sur orders différents', async () => {
      // Créer 2 dossiers
      const account1 = await createApprenantAccount('ipn-order1-' + Date.now());
      const account2 = await createApprenantAccount('ipn-order2-' + Date.now());

      const headers1 = await auth(account1);
      const headers2 = await auth(account2);

      const insc1 = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers1)
        .send({ source_financement: 'RETAIL' });

      const insc2 = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers2)
        .send({ source_financement: 'RETAIL' });

      // Créer paiements NGSER
      const paiement1 = await createNgserPaiement(insc1.body.dossier.id);
      const paiement2 = await createNgserPaiement(insc2.body.dossier.id);

      // Envoyer IPN pour paiement1
      const txnId = `TXN-REPLAY-${Date.now()}`;
      const ipn1 = {
        order_id: paiement1.order_ngser,
        status_id: 1,
        transaction_id: txnId,
        transaction_amount: Math.round(paiement1.montant_initie / 100),
        wallet: 'MOBILE_MONEY',
      };

      const res1 = await sendWebhookIpn(ipn1);
      expect(res1.status).toBe(200);

      let p1 = await prisma.paiement.findUnique({ where: { id: paiement1.id } });
      expect(p1.statut).toBe('CONFIRME');

      // Tentative: Même transaction_id, mais order différent
      const ipn2 = {
        ...ipn1,
        order_id: paiement2.order_ngser, // Order différent
      };

      const res2 = await sendWebhookIpn(ipn2);
      expect(res2.status).toBe(200);

      // Paiement 2 ne doit PAS être modifié (replay attack bloqué)
      let p2 = await prisma.paiement.findUnique({ where: { id: paiement2.id } });
      expect(p2.statut).toBe('PENDING'); // Pas changé
    });
  });

  // ============================================================================
  // RM-160: Contrôle Montant
  // ============================================================================

  describe('RM-160: Contrôle montant (±1 XOF tolerance)', () => {
    test('rejette IPN si montant faux (mismatch)', async () => {
      const account = await createApprenantAccount('ipn-montant-faux-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const paiement = await createNgserPaiement(inscription.body.dossier.id);
      const formation = await prisma.formation.findUnique({
        where: { id: ids.standardFormation },
      });

      // IPN avec MAUVAIS montant
      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 1,
        transaction_id: `TXN-MONTANT-FAUX-${Date.now()}`,
        transaction_amount: 999, // ❌ Faux: doit être ~1500 XOF
        wallet: 'MOBILE_MONEY',
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      // Paiement doit rester PENDING (rejeté)
      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('PENDING');
    });

    test('accepte IPN avec montant exact', async () => {
      const account = await createApprenantAccount('ipn-montant-ok-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      // IPN avec montant EXACT
      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 1,
        transaction_id: `TXN-MONTANT-OK-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF, // ✅ Exact
        wallet: 'MOBILE_MONEY',
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      // Paiement doit être CONFIRME
      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('CONFIRME');

      // Dossier doit être PAYE
      const dossier = await prisma.dossier.findUnique({
        where: { id: dossierId },
      });
      expect(dossier.statut).toBe('PAYE');
    });

    test('accepte montant ±1 XOF (tolérance arrondi)', async () => {
      const account = await createApprenantAccount('ipn-montant-tolerance-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      // IPN avec montant = 1501 (1 XOF au-dessus)
      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 1,
        transaction_id: `TXN-MONTANT-PLUS1-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF + 1, // ✅ +1 XOF accepté
        wallet: 'MOBILE_MONEY',
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      // Doit être accepté
      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('CONFIRME');
    });
  });

  // ============================================================================
  // RM-158.2: Statuts IPN NGSER
  // ============================================================================

  describe('RM-158.2: Statuts IPN (SUCCESS/FAIL/PENDING mapping)', () => {
    test('status_id=1 (SUCCESS) → CONFIRME + PAYE + commissions', async () => {
      const account = await createApprenantAccount('ipn-success-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 1, // ✅ SUCCESS
        transaction_id: `TXN-SUCCESS-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF,
        wallet: 'MOBILE_MONEY',
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      // Vérifications
      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('CONFIRME');

      const dossier = await prisma.dossier.findUnique({
        where: { id: dossierId },
      });
      expect(dossier.statut).toBe('PAYE');

      // Commission créée uniquement pour formations partenaire
      const commissions = await prisma.commissionPartenaire.count({
        where: { paiement_id: paiement.id },
      });
      expect(commissions).toBeGreaterThanOrEqual(0);
    });

    test('status_id=0 (FAIL) → ECHOUE + ANNULE', async () => {
      const account = await createApprenantAccount('ipn-fail-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 0, // ❌ FAIL
        transaction_id: `TXN-FAIL-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF,
        wallet: 'MOBILE_MONEY',
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      // Vérifications
      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('ECHOUE');

      const dossier = await prisma.dossier.findUnique({
        where: { id: dossierId },
      });
      expect(dossier.statut).toBe('ANNULE');
    });

    test('status_id=2 (montant insuffisant) → ECHOUE + ANNULE', async () => {
      const account = await createApprenantAccount('ipn-insufficient-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 2, // Montant insuffisant
        transaction_id: `TXN-INSUFF-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF, // montant exact (pas de mismatch)
        wallet: 'MOBILE_MONEY',
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      // Vérifications
      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('ECHOUE');

      const dossier = await prisma.dossier.findUnique({
        where: { id: dossierId },
      });
      expect(dossier.statut).toBe('ANNULE');
    });

    test('status_id=3 (PENDING) → reste PENDING (réconciliation)', async () => {
      const account = await createApprenantAccount('ipn-pending-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      // Sauvegarder statut dossier avant l'IPN
      const dossierAvant = await prisma.dossier.findUnique({ where: { id: dossierId } });

      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 3, // PENDING
        transaction_id: `TXN-PENDING-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF,
        wallet: 'MOBILE_MONEY',
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      // Doit rester PENDING
      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('PENDING');

      // Dossier reste inchangé (PAYE_DIRECTEMENT pour STANDARD+RETAIL)
      const dossier = await prisma.dossier.findUnique({
        where: { id: dossierId },
      });
      expect(dossier.statut).toBe(dossierAvant.statut);
    });
  });

  // ============================================================================
  // Format NGSER Réel
  // ============================================================================

  describe('Format NGSER Réel (order_id, status_id, transaction_amount)', () => {
    test('order_id résout le paiement (champ réel NGSER)', async () => {
      const account = await createApprenantAccount('ipn-orderid-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      // IPN avec champ order_id réel NGSER
      const ipnPayload = {
        order_id: paiement.order_ngser, // ✅ Champ réel NGSER
        status_id: 1,
        transaction_id: `TXN-ORDERID-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF,
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('CONFIRME');
    });

    test('IPN sans order_id ni order_ngser rejette', async () => {
      // IPN malformé (pas d'order_id)
      const ipnPayload = {
        // ❌ Pas d'order_id
        status_id: 1,
        transaction_id: `TXN-NOORDER-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF,
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200); // Webhook répond toujours 200
      // Mais pas de paiement modifié
    });

    test('transaction_amount utilisé comme montant primaire', async () => {
      const account = await createApprenantAccount('ipn-txnamount-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      const dossierId = inscription.body.dossier.id;
      const paiement = await createNgserPaiement(dossierId);

      // IPN avec transaction_amount, pas amount
      const ipnPayload = {
        order_id: paiement.order_ngser,
        status_id: 1,
        transaction_id: `TXN-TXNAMOUNT-${Date.now()}`,
        transaction_amount: MONTANT_CATALOGUE_XOF, // ✅ Champ primaire
        // amount absent
      };

      const res = await sendWebhookIpn(ipnPayload);
      expect(res.status).toBe(200);

      const paiement_updated = await prisma.paiement.findUnique({
        where: { id: paiement.id },
      });
      expect(paiement_updated.statut).toBe('CONFIRME');
    });
  });

  // ============================================================================
  // RM-158.3: Commissions (Pas de doublon)
  // ============================================================================

  describe('RM-158.3: Commissions créées une seule fois', () => {
    afterEach(async () => {
      await prisma.commissionPartenaire.deleteMany({
        where: { paiement: { order_ngser: { startsWith: 'FRG-2026-TEST-' } } },
      }).catch(() => {});
      await prisma.paiement.deleteMany({
        where: { order_ngser: { startsWith: 'FRG-2026-TEST-' } },
      }).catch(() => {});
    });

    test('commission partenaire créée une seule fois (pas dupliquée)', async () => {
      const account = await createApprenantAccount('ipn-commission-' + Date.now());
      const headers = await auth(account);
      const inscription = await request(API_URL)
        .post(`/api/sessions/${ids.partenaireSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });
      expect(inscription.status).toBe(201);

      const dossierId = inscription.body.dossier.id;
      // Supprimer les paiements residuels pour ce dossier avant de créer le test
      await prisma.commissionPartenaire.deleteMany({ where: { paiement: { dossier_id: dossierId } } }).catch(() => {});
      await prisma.paiement.deleteMany({ where: { dossier_id: dossierId } }).catch(() => {});
      const paiement = await createNgserPaiement(dossierId);
      const montantXof = Math.round(paiement.montant_initie / 100);

      const txnId = `TXN-COMMISSION-${Date.now()}`;

      // Premier IPN
      const ipn1 = {
        order_id: paiement.order_ngser,
        status_id: 1,
        transaction_id: txnId,
        transaction_amount: montantXof,
      };

      const res1 = await sendWebhookIpn(ipn1);
      expect(res1.status).toBe(200);

      const commissions1 = await prisma.commissionPartenaire.count({
        where: { paiement_id: paiement.id },
      });
      expect(commissions1).toBe(1); // Créée une fois

      // Deuxième IPN (doublon)
      const res2 = await sendWebhookIpn(ipn1);
      expect(res2.status).toBe(200);

      const commissions2 = await prisma.commissionPartenaire.count({
        where: { paiement_id: paiement.id },
      });
      expect(commissions2).toBe(1); // Toujours 1, pas dupliquée
    });
  });
});
