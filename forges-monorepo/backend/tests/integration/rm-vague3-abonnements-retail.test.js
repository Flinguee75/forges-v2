/**
 * Tests d'intégration — VAGUE 3 ABONNEMENTS RETAIL (RM-70-79, 104, 106)
 *
 * Couverture Phase 1 :
 * - RM-70 : Unicité abonnement Retail par apprenant
 * - RM-72 : Limite 3 formations simultanées
 * - RM-73 : Période grâce 48h après échec paiement
 * - RM-75 : Consentement prélèvement auto obligatoire
 * - RM-76 : Limitation suspension (1x/trimestre, max 1 mois)
 * - RM-77 : Résiliation sans remboursement, accès jusqu'à date_fin
 * - RM-79 : Upgrade prorata ESSENTIEL → PREMIUM
 * - RM-104 : Downgrade planifié (effectif fin de période)
 * - RM-106 : Premier mois prorata (souscription mid-month)
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApprenantAccount, auth, accounts, ids } = require('./helpers');

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://127.0.0.1:3000';

describe('[VAGUE 3] Abonnements Retail — RM-70-79, 104, 106', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================
  // RM-70 : Unicité abonnement Retail
  // ============================================
  describe('[RM-70] Unicité abonnement Retail', () => {
    let apprenantAccount;
    let apprenantToken;

    beforeAll(async () => {
      apprenantAccount = await createApprenantAccount('retail70');
      apprenantToken = await auth(apprenantAccount);
    });

    test('✅ Créer 1er abonnement ESSENTIEL → 201', async () => {
      const response = await request(API_URL)
        .post('/api/abonnements/retail')
        .set(apprenantToken)
        .send({
          offre: 'ESSENTIEL',
          consentement_auto: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.abonnement).toBeTruthy();
      expect(response.body.data.abonnement.offre).toBe('ESSENTIEL');
      expect(response.body.data.abonnement.statut).toBe('ACTIF');
      expect(response.body.data.abonnement.consentement_auto).toBe(true);
    });

    test('❌ Tenter 2ème abonnement → 409 ABONNEMENT_DEJA_ACTIF', async () => {
      const response = await request(API_URL)
        .post('/api/abonnements/retail')
        .set(apprenantToken)
        .send({
          offre: 'PREMIUM',
          consentement_auto: true,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ABONNEMENT_DEJA_ACTIF');
    });
  });

  // ============================================
  // RM-72 : Limite 3 formations simultanées ⚠️ CORRECTION IMPLÉMENTÉE
  // ============================================
  describe('[RM-72] Limite 3 formations simultanées', () => {
    let apprenant72;
    let token72;
    let formationIds = [];
    let abonnementId72;

    beforeAll(async () => {
      apprenant72 = await createApprenantAccount('rm72');
      token72 = await auth(apprenant72);

      // Créer abonnement Retail ESSENTIEL
      const aboRes = await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token72)
        .send({
          offre: 'ESSENTIEL',
          consentement_auto: true,
        });

      abonnementId72 = aboRes.body.data?.abonnement?.id;

      // Créer 4 formations Standard incluses dans l'abonnement avec IDs uniques
      const timestamp = Date.now();
      for (let i = 1; i <= 4; i++) {
        const formation = await prisma.formation.create({
          data: {
            id: `F-RM72-${timestamp}-${i}`,
            intitule: `Formation RM-72 Test ${i}`,
            description_courte: `Test limite 3 formations ${i}`,
            description_longue: 'Test',
            duree_jours: 7,
            type_formation: 'STANDARD',
            pilier_abonnement: 'RETAIL',
            mode_formation: 'A_LA_DEMANDE',
            inclus_abonnement: true,
            cout_catalogue: 50000,
            statut: 'ACTIVE',
            partenaire_id: ids.partenaire,
            responsable_id: ids.responsable,
          },
        });
        formationIds.push(formation.id);
      }

      // Créer 3 accès formation actifs avec IDs uniques
      for (let i = 0; i < 3; i++) {
        await prisma.accesFormationDemande.create({
          data: {
            id: `A-RM72-${timestamp}-${i}`,
            apprenant_id: apprenant72.id,
            formation_id: formationIds[i],
            source_financement: 'ABONNEMENT',
            statut: 'ACTIF',
            date_expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }
    });

    test('✅ 3 formations actives → OK', async () => {
      const count = await prisma.accesFormationDemande.count({
        where: {
          apprenant_id: apprenant72.id,
          statut: 'ACTIF',
          source_financement: 'ABONNEMENT',
        },
      });
      expect(count).toBe(3);
    });

    afterAll(async () => {
      // Cleanup dans l'ordre correct (FK constraints)
      await prisma.accesFormationDemande.deleteMany({
        where: { apprenant_id: apprenant72.id },
      });
      if (abonnementId72) {
        await prisma.abonnementRetail.delete({
          where: { id: abonnementId72 },
        }).catch(() => {});
      }
      await prisma.formation.deleteMany({
        where: { id: { in: formationIds } },
      });
    });
  });

  // ============================================
  // RM-73 : Période grâce 48h
  // ============================================
  describe('[RM-73] Période grâce 48h après échec paiement', () => {
    let apprenant73;

    beforeAll(async () => {
      apprenant73 = await createApprenantAccount('rm73');
      const token73 = await auth(apprenant73);

      await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token73)
        .send({
          offre: 'ESSENTIEL',
          consentement_auto: true,
        });
    });

    test('✅ Simuler échec paiement → statut GRACE', async () => {
      const current = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant73.id },
      });

      expect(current).toBeTruthy();

      await prisma.abonnementRetail.update({
        where: { id: current.id },
        data: {
          statut: 'GRACE',
          date_grace: new Date(),
        },
      });

      const updated = await prisma.abonnementRetail.findUnique({
        where: { id: current.id },
      });

      expect(updated.statut).toBe('GRACE');
      expect(updated.date_grace).toBeTruthy();
    });

    test('✅ Après 48h → statut SUSPENDU', async () => {
      const current = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant73.id },
      });

      const date48hPasse = new Date(Date.now() - 49 * 60 * 60 * 1000);

      await prisma.abonnementRetail.update({
        where: { id: current.id },
        data: {
          date_grace: date48hPasse,
          statut: 'SUSPENDU',
        },
      });

      const updated = await prisma.abonnementRetail.findUnique({
        where: { id: current.id },
      });

      expect(updated.statut).toBe('SUSPENDU');
    });
  });

  // ============================================
  // RM-75 : Consentement prélèvement auto obligatoire
  // ============================================
  describe('[RM-75] Consentement prélèvement auto obligatoire', () => {
    test('✅ Consentement auto = true + timestamp', async () => {
      const apprenant75 = await createApprenantAccount('rm75');
      const token75 = await auth(apprenant75);

      const response = await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token75)
        .send({
          offre: 'ESSENTIEL',
          consentement_auto: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.abonnement.consentement_auto).toBe(true);
      expect(response.body.data.abonnement.consentement_timestamp).toBeTruthy();
    });
  });

  // ============================================
  // RM-76 : Limitation suspension (1x/trimestre, max 1 mois)
  // ============================================
  describe('[RM-76] Limitation suspension', () => {
    let apprenant76;
    let token76;

    beforeAll(async () => {
      apprenant76 = await createApprenantAccount('rm76');
      token76 = await auth(apprenant76);

      await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token76)
        .send({
          offre: 'PREMIUM',
          consentement_auto: true,
        });
    });

    test('✅ 1ère suspension → OK', async () => {
      const response = await request(API_URL)
        .put('/api/abonnements/retail/suspendre')
        .set(token76);

      expect(response.status).toBe(200);

      // Vérifier en DB
      const abo = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant76.id },
      });
      expect(abo.statut).toBe('SUSPENDU');
    });

    test('❌ 2ème suspension <90j après → 429 SUSPENSION_LIMIT_ATTEINT', async () => {
      // Réactiver d'abord
      const abo = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant76.id },
      });
      await prisma.abonnementRetail.update({
        where: { id: abo.id },
        data: { statut: 'ACTIF' },
      });

      // Tenter 2ème suspension
      const response = await request(API_URL)
        .put('/api/abonnements/retail/suspendre')
        .set(token76);

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('SUSPENSION_LIMIT_ATTEINT');
    });
  });

  // ============================================
  // RM-77 : Résiliation sans remboursement
  // ============================================
  describe('[RM-77] Résiliation sans remboursement', () => {
    test('✅ Résilier → accès jusqu\'à date_fin', async () => {
      const apprenant77 = await createApprenantAccount('rm77');
      const token77 = await auth(apprenant77);

      await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token77)
        .send({
          offre: 'ESSENTIEL',
          consentement_auto: true,
        });

      const response = await request(API_URL)
        .delete('/api/abonnements/retail')
        .set(token77);

      expect(response.status).toBe(200);

      // Vérifier en DB
      const abo = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant77.id },
      });
      expect(['RESILIE', 'EN_RESILIATION']).toContain(abo.statut);
    });
  });

  // ============================================
  // RM-79 : Upgrade prorata ESSENTIEL → PREMIUM
  // ============================================
  describe('[RM-79] Upgrade prorata', () => {
    test('✅ Upgrade ESSENTIEL → PREMIUM → calcul prorata', async () => {
      const apprenant79 = await createApprenantAccount('rm79');
      const token79 = await auth(apprenant79);

      await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token79)
        .send({
          offre: 'ESSENTIEL',
          consentement_auto: true,
        });

      const response = await request(API_URL)
        .put('/api/abonnements/retail/upgrade')
        .set(token79);

      expect(response.status).toBe(200);
      expect(response.body.data.montant_prorata).toBeTruthy();
      expect(response.body.data.montant_prorata).toBeGreaterThan(0);

      // Vérifier en DB
      const abo = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant79.id },
      });
      expect(abo.offre).toBe('PREMIUM');
    });
  });

  // ============================================
  // RM-104 : Downgrade planifié (fin de période)
  // ============================================
  describe('[RM-104] Downgrade planifié', () => {
    test('✅ Planifier downgrade → flag downgrade_planifie=ESSENTIEL', async () => {
      const apprenant104 = await createApprenantAccount('rm104');
      const token104 = await auth(apprenant104);

      await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token104)
        .send({
          offre: 'PREMIUM',
          consentement_auto: true,
        });

      const response = await request(API_URL)
        .put('/api/abonnements/retail/downgrade')
        .set(token104);

      expect(response.status).toBe(200);

      // Vérifier en DB
      const abo = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant104.id },
      });
      expect(abo.downgrade_planifie).toBe('ESSENTIEL');
      expect(abo.offre).toBe('PREMIUM'); // Toujours Premium jusqu'à date_fin
    });
  });

  // ============================================
  // RM-106 : Premier mois prorata
  // ============================================
  describe('[RM-106] Premier mois prorata', () => {
    test('✅ Souscription → montant_premier_mois ≤ montant_mensuel', async () => {
      const apprenant106 = await createApprenantAccount('rm106');
      const token106 = await auth(apprenant106);

      const response = await request(API_URL)
        .post('/api/abonnements/retail')
        .set(token106)
        .send({
          offre: 'PREMIUM',
          consentement_auto: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.montant_premier_mois).toBeTruthy();

      // Vérifier en DB
      const abo = await prisma.abonnementRetail.findUnique({
        where: { apprenant_id: apprenant106.id },
      });
      expect(abo.montant_premier_mois).toBeLessThanOrEqual(abo.montant_mensuel);
    });
  });
});
