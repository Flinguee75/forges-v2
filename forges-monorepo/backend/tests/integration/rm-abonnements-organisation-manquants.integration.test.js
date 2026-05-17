const {
  accounts,
  auth,
  createOrganisationAccount,
  prisma,
  request,
  API_URL,
} = require('./helpers');

const { OrganisationRepository } = require('../../src/modules/comptes/organisation/organisation.repository');
const { OrganisationService } = require('../../src/modules/comptes/organisation/organisation.service');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildOrganisationSchedulerService() {
  return new OrganisationService(
    new OrganisationRepository(prisma),
    { info: jest.fn(), warning: jest.fn() },
    { sendConfirmation: jest.fn(), sendEssaiExpire: jest.fn() },
  );
}

describe('Wave 1 - Abonnements Organisation manquants', () => {
  const registeredEmails = [];

  afterAll(async () => {
    if (registeredEmails.length > 0) {
      await prisma.abonnementOrganisation.deleteMany({
        where: { organisation: { email: { in: registeredEmails } } },
      });
      await prisma.abonnementB2B.deleteMany({
        where: { organisation: { email: { in: registeredEmails } } },
      });
      await prisma.organisation.deleteMany({ where: { email: { in: registeredEmails } } });
    }
  });

  test('RM-81 - une nouvelle organisation obtient un essai gratuit de 30 jours a la confirmation', async () => {
    const suffix = uniqueSuffix();
    const email = `wave1-rm81-${suffix}@forges.test`;
    registeredEmails.push(email);

    const register = await request(API_URL)
      .post('/api/organisations/register')
      .send({
        raison_sociale: 'Organisation RM-81',
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `RM81-${suffix}`,
        contact_referent: 'Contact RH',
        pays: 'CI',
        langue_preferee: 'FR',
        email,
        password: 'Test@FORGES2026!',
        consentement_rgpd: true,
      });

    expect(register.status).toBe(201);

    const created = await prisma.organisation.findUnique({ where: { email } });
    expect(created).toBeTruthy();
    expect(created.statut).toBe('EN_ATTENTE');
    expect(created.token_confirmation).toBeTruthy();

    await request(API_URL)
      .get(`/api/organisations/confirm/${created.token_confirmation}`)
      .expect(200);

    const confirmed = await prisma.organisation.findUnique({ where: { email } });
    expect(confirmed.statut).toBe('ACTIF');
    expect(confirmed.token_confirmation).toBeNull();
    expect(confirmed.date_fin_essai).toBeTruthy();

    const trialDays = Math.round((confirmed.date_fin_essai.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    expect(trialDays).toBeGreaterThanOrEqual(29);
    expect(trialDays).toBeLessThanOrEqual(30);
  });

  test('RM-80/RM-83 - apres essai expire, l abonnement Organisation est requis et le scheduler suspend sans souscription', async () => {
    const orgSansAbonnement = await createOrganisationAccount('rm80-83');
    const orgAvecAbonnement = await createOrganisationAccount('rm80-abonne');
    const headers = await auth(orgSansAbonnement);

    await prisma.organisation.update({
      where: { id: orgSansAbonnement.id },
      data: {
        statut: 'ACTIF',
        date_fin_essai: daysFromNow(-1),
        abonnement_org_id: null,
      },
    });

    const abo = await prisma.abonnementOrganisation.create({
      data: {
        organisation_id: orgAvecAbonnement.id,
        offre: 'BASIQUE',
        statut: 'ACTIF',
        montant_annuel: 50000,
        perimetre_fonctionnel: ['B2B'],
        date_debut: daysFromNow(-40),
        date_fin: daysFromNow(325),
        renouvellement_auto: true,
      },
    });
    await prisma.organisation.update({
      where: { id: orgAvecAbonnement.id },
      data: {
        statut: 'ACTIF',
        date_fin_essai: daysFromNow(-1),
        abonnement_org_id: abo.id,
      },
    });

    const dashboard = await request(API_URL)
      .get('/api/espace-organisation/dashboard')
      .set(headers)
      .expect(200);
    expect(dashboard.body.organisation.essai_expire).toBe(true);
    expect(dashboard.body.organisation.abonnement_org).toBeNull();

    const service = buildOrganisationSchedulerService();
    const suspendedCount = await service.suspendreEssaisExpires();
    expect(suspendedCount).toBeGreaterThanOrEqual(1);

    const suspended = await prisma.organisation.findUnique({ where: { id: orgSansAbonnement.id } });
    const subscribed = await prisma.organisation.findUnique({ where: { id: orgAvecAbonnement.id } });
    expect(suspended.statut).toBe('SUSPENDU');
    expect(subscribed.statut).toBe('ACTIF');

    const blockedLogin = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: orgSansAbonnement.email, password: orgSansAbonnement.password });
    expect(blockedLogin.status).toBe(401);
    expect(blockedLogin.body.error).toBe('INVALID_CREDENTIALS');
  });

  test('RM-109 - le scheduler renouvelle automatiquement un abonnement Organisation arrive a J-1', async () => {
    const organisation = await createOrganisationAccount('rm109');
    const adminHeaders = await auth(accounts.admin);
    const ancienneDateFin = daysFromNow(1);

    const abonnement = await prisma.abonnementOrganisation.create({
      data: {
        organisation_id: organisation.id,
        offre: 'PRO',
        statut: 'ACTIF',
        montant_annuel: 150000,
        perimetre_fonctionnel: ['B2B', 'VOUCHERS'],
        date_debut: daysFromNow(-364),
        date_fin: ancienneDateFin,
        renouvellement_auto: true,
      },
    });
    await prisma.organisation.update({
      where: { id: organisation.id },
      data: { abonnement_org_id: abonnement.id },
    });

    const scheduler = await request(API_URL)
      .post('/api/abonnements/admin/scheduler')
      .set(adminHeaders)
      .send({});

    expect(scheduler.status).toBe(200);
    expect(scheduler.body.data.organisations.renouveles).toBeGreaterThanOrEqual(1);
    expect(scheduler.body.data.organisations.echecs).toBe(0);

    const renewed = await prisma.abonnementOrganisation.findUnique({ where: { id: abonnement.id } });
    const renewedDays = Math.round((renewed.date_fin.getTime() - ancienneDateFin.getTime()) / (24 * 60 * 60 * 1000));
    expect(renewed.statut).toBe('ACTIF');
    expect(renewedDays).toBe(365);
  });
});
