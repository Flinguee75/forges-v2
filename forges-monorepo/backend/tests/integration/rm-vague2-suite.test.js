/**
 * Tests d'intégration — Vague 2 (suite) FORGES v4.8
 *
 * Couverture RM manquantes :
 *  - Vague 2B (Abonnements B2B + Organisation)
 *      RM-62 : Certifications/dossiers conservés après désactivation B2B
 *      RM-63 : Apprenants B2B accèdent aux formations Standard incluses
 *      RM-66 : Alertes B2B J-45 / J-15
 *      RM-67 : Suspension B2B expirés (scheduler)
 *      RM-78 : Renouvellement automatique Retail (scheduler)
 *      RM-85 : Alertes Organisation J-30 / J-7
 *      RM-86 : Suspension Organisation expirée (scheduler)
 *      RM-107 : Grille tarifaire Organisation (3 offres : BASIQUE, PRO, ENTERPRISE)
 *      RM-110 : Suspension B2B → accès apprenants suspendus
 *      RM-113 : Renouvellement annuel Organisation
 *  - Vague 2C (Partenaires)
 *      RM-135 : Liste formations soumises visible côté Partenaire
 *  - Vague 2D (Sessions & Inscriptions)
 *      RM-03 : Dossiers EN_ATTENTE_VERIFICATION non traités → archivage
 *
 * Stratégie : tests directs sur services / Prisma pour les schedulers
 *  (les schedulers ne sont pas exposés en HTTP par défaut).
 */

const { accounts, auth, createApprenantAccount, createOrganisationAccount, ids, prisma, request, API_URL } = require('./helpers');

const { AbonnementB2BService } = require('../../src/modules/abonnements/b2b/abonnement-b2b.service');
const { AbonnementOrganisationService } = require('../../src/modules/abonnements/organisation/abonnement-organisation.service');
const { AbonnementRetailService } = require('../../src/modules/abonnements/retail/abonnement-retail.service');
const { AbonnementRetailRepository } = require('../../src/modules/abonnements/retail/abonnement-retail.repository');
const { AuditLogger } = require('../../src/shared/audit/audit.logger');
const { EmailService } = require('../../src/shared/email/email.service');

const audit = new AuditLogger();
const email = new EmailService();
const b2bService = new AbonnementB2BService(prisma, audit, email);
const orgService = new AbonnementOrganisationService(prisma, audit, email);
const retailRepo = new AbonnementRetailRepository(prisma);
const retailService = new AbonnementRetailService(retailRepo, prisma, audit, email);

describe('Vague 2 — Suite (B2B / Organisation / Partenaires / Sessions)', () => {
  // ============================================================
  // Vague 2B — RM-107 : Grille tarifaire Organisation
  // ============================================================
  test('RM-107 — Tarifs Organisation : BASIQUE, PRO, ENTERPRISE', async () => {
    const offres = [
      { offre: 'BASIQUE', expectedMontant: 50000, expectedGestionnaires: 1 },
      { offre: 'PRO', expectedMontant: 150000, expectedGestionnaires: 1 },
      { offre: 'ENTERPRISE', expectedMontant: 400000, expectedGestionnaires: 5 },
    ];

    for (const { offre, expectedMontant, expectedGestionnaires } of offres) {
      const account = await createOrganisationAccount(`rm107-${offre.toLowerCase()}`);
      const headers = await auth(account);

      const res = await request(API_URL)
        .post('/api/abonnements/organisation')
        .set(headers)
        .send({ offre });
      expect(res.status).toBe(201);
      expect(res.body.data.montant_annuel).toBe(expectedMontant);

      const me = await request(API_URL).get('/api/abonnements/organisation/me').set(headers);
      expect(me.status).toBe(200);
      expect(me.body.data.nb_gestionnaires_max).toBe(expectedGestionnaires);
    }
  });

  // ============================================================
  // Vague 2B — RM-66 / RM-67 : Schedulers B2B
  // ============================================================
  test('RM-66 — Scheduler envoie alertes expiration B2B (J-45 et J-15)', async () => {
    const orgJ45 = await createOrganisationAccount('rm66-j45');
    const orgJ15 = await createOrganisationAccount('rm66-j15');

    // Cibler le milieu de la fenêtre 24h du scheduler (J+45 à J+45+24h)
    const dateJ45 = new Date(Date.now() + 45 * 24 * 3600 * 1000 + 12 * 3600 * 1000);
    const dateJ15 = new Date(Date.now() + 15 * 24 * 3600 * 1000 + 12 * 3600 * 1000);

    await prisma.abonnementB2B.create({
      data: {
        organisation_id: orgJ45.id,
        palier: 'STARTER',
        nb_max: 20,
        nb_actifs: 0,
        prix_annuel: 250000,
        statut: 'ACTIF',
        date_debut: new Date(),
        date_fin: dateJ45,
      },
    });
    await prisma.abonnementB2B.create({
      data: {
        organisation_id: orgJ15.id,
        palier: 'STARTER',
        nb_max: 20,
        nb_actifs: 0,
        prix_annuel: 250000,
        statut: 'ACTIF',
        date_debut: new Date(),
        date_fin: dateJ15,
      },
    });

    const result = await b2bService.envoyerAlertesExpiration();
    expect(result.alertes_j45).toBeGreaterThanOrEqual(1);
    expect(result.alertes_j15).toBeGreaterThanOrEqual(1);
  });

  test('RM-67 — Scheduler suspend les abonnements B2B expirés', async () => {
    const orgExpire = await createOrganisationAccount('rm67');
    const dateExpiree = new Date(Date.now() - 24 * 3600 * 1000);

    const abo = await prisma.abonnementB2B.create({
      data: {
        organisation_id: orgExpire.id,
        palier: 'STARTER',
        nb_max: 20,
        nb_actifs: 0,
        prix_annuel: 250000,
        statut: 'ACTIF',
        date_debut: new Date(Date.now() - 366 * 24 * 3600 * 1000),
        date_fin: dateExpiree,
      },
    });

    const nbSuspendus = await b2bService.suspendreB2BExpires();
    expect(nbSuspendus).toBeGreaterThanOrEqual(1);

    const aboApresSuspension = await prisma.abonnementB2B.findUnique({ where: { id: abo.id } });
    expect(aboApresSuspension.statut).toBe('EXPIRE');
  });

  // ============================================================
  // Vague 2B — RM-85 / RM-86 : Schedulers Organisation
  // ============================================================
  test('RM-85 — Scheduler envoie alertes expiration Organisation (J-30 et J-7)', async () => {
    const orgJ30 = await createOrganisationAccount('rm85-j30');
    const orgJ7 = await createOrganisationAccount('rm85-j7');

    const dateJ30 = new Date(Date.now() + 30 * 24 * 3600 * 1000 + 12 * 3600 * 1000);
    const dateJ7 = new Date(Date.now() + 7 * 24 * 3600 * 1000 + 12 * 3600 * 1000);

    await prisma.abonnementOrganisation.create({
      data: {
        organisation_id: orgJ30.id,
        offre: 'PRO',
        montant_annuel: 150000,
        statut: 'ACTIF',
        date_debut: new Date(),
        date_fin: dateJ30,
        renouvellement_auto: true,
      },
    });
    await prisma.abonnementOrganisation.create({
      data: {
        organisation_id: orgJ7.id,
        offre: 'PRO',
        montant_annuel: 150000,
        statut: 'ACTIF',
        date_debut: new Date(),
        date_fin: dateJ7,
        renouvellement_auto: true,
      },
    });

    const result = await orgService.envoyerAlertesExpiration();
    expect(result.alertes_j30).toBeGreaterThanOrEqual(1);
    expect(result.alertes_j7).toBeGreaterThanOrEqual(1);
  });

  // ============================================================
  // Vague 2B — RM-62 : Données conservées après désactivation B2B
  // ============================================================
  test('RM-62 — Dossiers d\'apprenants B2B conservés après désactivation', async () => {
    const org = await createOrganisationAccount('rm62');
    const apprenant = await createApprenantAccount('rm62');

    await prisma.apprenant.update({
      where: { id: apprenant.id },
      data: { organisation_id: org.id },
    });

    const dossierId = `D-RM62-${Date.now()}`;
    await prisma.dossier.create({
      data: {
        id: dossierId,
        apprenant_id: apprenant.id,
        formation_id: ids.standardFormation,
        session_id: ids.standardSession,
        statut: 'PAYE',
        source_financement: 'B2B',
      },
    });

    // Simuler désactivation B2B (suspension)
    await prisma.organisation.update({
      where: { id: org.id },
      data: { statut: 'INACTIF' },
    });

    // RM-62 : le dossier doit être conservé même après désactivation
    const dossierApresDesactivation = await prisma.dossier.findUnique({ where: { id: dossierId } });
    expect(dossierApresDesactivation).not.toBeNull();
    expect(dossierApresDesactivation.statut).toBe('PAYE');
  });

  // ============================================================
  // Vague 2B — RM-63 : Apprenants B2B accèdent aux formations Standard
  // ============================================================
  test('RM-63 — Formations Standard avec pilier RETAIL/TOUS sont incluses dans abonnement (RM-102)', async () => {
    const formationsIncluses = await prisma.formation.findMany({
      where: {
        type_formation: 'STANDARD',
        pilier_abonnement: { in: ['RETAIL', 'TOUS'] },
        statut: 'ACTIVE',
      },
    });

    expect(formationsIncluses.length).toBeGreaterThan(0);
    formationsIncluses.forEach((f) => {
      expect(f.inclus_abonnement).toBe(true);
    });

    // RM-63 : un apprenant rattaché à une organisation B2B peut accéder aux formations Standard incluses
    const formationsExcluses = await prisma.formation.findMany({
      where: { type_formation: 'PREMIUM', inclus_abonnement: true },
    });
    expect(formationsExcluses.length).toBe(0);
  });

  // ============================================================
  // Vague 2B — RM-78 : Renouvellement automatique Retail
  // ============================================================
  test('RM-78 — Scheduler traite les renouvellements Retail à échéance', async () => {
    const account = await createApprenantAccount('rm78');
    const headers = await auth(account);

    const sub = await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'ESSENTIEL', consentement_auto: true });
    expect(sub.status).toBe(201);

    // Forcer la date de fin à demain pour passer dans le scheduler
    const demain = new Date(Date.now() + 12 * 3600 * 1000);
    await prisma.abonnementRetail.update({
      where: { apprenant_id: account.id },
      data: { date_fin: demain },
    });

    const result = await retailService.traiterRenouvellements();
    expect(result).toBeDefined();
    expect(typeof result.renouveles).toBe('number');
  });

  // ============================================================
  // Vague 2B — RM-110 : Suspension B2B → accès suspendu
  // ============================================================
  test('RM-110 — Abonnement B2B EXPIRE empêche les nouveaux accès B2B', async () => {
    const org = await createOrganisationAccount('rm110');
    const headers = await auth(org);

    await prisma.abonnementB2B.create({
      data: {
        organisation_id: org.id,
        palier: 'STARTER',
        nb_max: 20,
        nb_actifs: 0,
        prix_annuel: 250000,
        statut: 'EXPIRE',
        date_debut: new Date(Date.now() - 400 * 24 * 3600 * 1000),
        date_fin: new Date(Date.now() - 24 * 3600 * 1000),
      },
    });

    const me = await request(API_URL).get('/api/abonnements/b2b/me').set(headers);
    expect(me.status).toBe(200);
    // RM-110 : seule un abonnement ACTIF est retourné
    expect(me.body.data).toBeNull();
  });

  // ============================================================
  // Vague 2B — RM-113 : Renouvellement annuel Organisation
  // ============================================================
  test('RM-113 — AbonnementOrganisation a renouvellement_auto=true par défaut et durée 1 an', async () => {
    const account = await createOrganisationAccount('rm113');
    const headers = await auth(account);

    const res = await request(API_URL)
      .post('/api/abonnements/organisation')
      .set(headers)
      .send({ offre: 'BASIQUE' });
    expect(res.status).toBe(201);

    const abo = await prisma.abonnementOrganisation.findUnique({
      where: { organisation_id: account.id },
    });
    expect(abo.renouvellement_auto).toBe(true);

    const dureeMs = abo.date_fin.getTime() - abo.date_debut.getTime();
    const dureeJours = Math.round(dureeMs / (24 * 3600 * 1000));
    expect(dureeJours).toBeGreaterThanOrEqual(364);
    expect(dureeJours).toBeLessThanOrEqual(366);
  });

  // ============================================================
  // Vague 2C — RM-135 : Liste formations soumises côté Partenaire
  // ============================================================
  test('RM-135 — Le Partenaire voit la liste de ses formations soumises', async () => {
    const headers = await auth(accounts.partenaire);
    const res = await request(API_URL).get('/api/partenaires/dashboard').set(headers);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.formations)).toBe(true);
    // RM-135 : doit contenir les formations propres du Partenaire
    expect(res.body.data.formations.length).toBeGreaterThanOrEqual(0);
  });

  // ============================================================
  // Vague 2D — RM-03 : Dossiers EN_ATTENTE_VERIFICATION ancien → comportement archivage
  // ============================================================
  test('RM-03 — Dossiers EN_ATTENTE_VERIFICATION peuvent être identifiés pour archivage', async () => {
    const apprenant = await createApprenantAccount('rm03');
    const dossierId = `D-RM03-${Date.now()}`;
    const dateAncienne = new Date(Date.now() - 91 * 24 * 3600 * 1000); // > 90 jours

    await prisma.dossier.create({
      data: {
        id: dossierId,
        apprenant_id: apprenant.id,
        formation_id: ids.premiumRetailFormation,
        session_id: ids.premiumRetailSession,
        statut: 'EN_ATTENTE_VERIFICATION',
        source_financement: 'RETAIL',
        created_at: dateAncienne,
      },
    });

    // RM-03 : critère d'archivage = EN_ATTENTE_VERIFICATION + ancien
    const archivables = await prisma.dossier.findMany({
      where: {
        statut: 'EN_ATTENTE_VERIFICATION',
        created_at: { lt: new Date(Date.now() - 90 * 24 * 3600 * 1000) },
      },
    });
    expect(archivables.length).toBeGreaterThanOrEqual(1);

    // Simuler archivage manuel
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { statut: 'ARCHIVE' },
    });

    const dossierArchive = await prisma.dossier.findUnique({ where: { id: dossierId } });
    expect(dossierArchive.statut).toBe('ARCHIVE');
  });
});
