const {
  createOrganisationAccount,
  prisma,
} = require('./helpers');

const { AbonnementB2BService } = require('../../src/modules/abonnements/b2b/abonnement-b2b.service');
const { OrganisationRepository } = require('../../src/modules/comptes/organisation/organisation.repository');
const { OrganisationService } = require('../../src/modules/comptes/organisation/organisation.service');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function buildB2BService() {
  return new AbonnementB2BService(
    prisma,
    { info: jest.fn(), warning: jest.fn() },
    {},
  );
}

function buildOrganisationService(emailMock) {
  return new OrganisationService(
    new OrganisationRepository(prisma),
    { info: jest.fn(), warning: jest.fn() },
    emailMock,
  );
}

describe('Wave 3 - Alertes abonnement', () => {
  test('RM-69 - detecte les abonnements B2B dont le plafond est atteint', async () => {
    const service = buildB2BService();
    const organisation = await createOrganisationAccount('rm69');

    const abonnement = await prisma.abonnementB2B.create({
      data: {
        organisation_id: organisation.id,
        palier: 'STARTER',
        nb_max: 2,
        nb_actifs: 2,
        date_debut: daysFromNow(-30),
        date_fin: daysFromNow(335),
        prix_annuel: 250000,
        premium_inclus_par_an: 0,
        statut: 'ACTIF',
      },
    });
    await prisma.organisation.update({
      where: { id: organisation.id },
      data: { abonnement_b2b_id: abonnement.id },
    });

    const alertes = await service.trouverAlertesPlafond();
    expect(alertes.map((abo) => abo.id)).toContain(abonnement.id);
  });

  test('RM-82 - envoie les alertes de fin essai Organisation a J-7 et J-2', async () => {
    const emailMock = {
      sendConfirmation: jest.fn(),
      sendEssaiExpire: jest.fn(),
      sendAlerteFinEssai: jest.fn(),
    };
    const service = buildOrganisationService(emailMock);
    const orgJ7 = await createOrganisationAccount('rm82-j7');
    const orgJ2 = await createOrganisationAccount('rm82-j2');

    await prisma.organisation.update({
      where: { id: orgJ7.id },
      data: { statut: 'ACTIF', date_fin_essai: daysFromNow(7), abonnement_org_id: null },
    });
    await prisma.organisation.update({
      where: { id: orgJ2.id },
      data: { statut: 'ACTIF', date_fin_essai: daysFromNow(2), abonnement_org_id: null },
    });

    const result = await service.envoyerAlertesFinEssai();

    expect(result.alertes_j7).toBeGreaterThanOrEqual(1);
    expect(result.alertes_j2).toBeGreaterThanOrEqual(1);
    expect(emailMock.sendAlerteFinEssai).toHaveBeenCalledWith(orgJ7.email, expect.any(Date), 'FR');
    expect(emailMock.sendAlerteFinEssai).toHaveBeenCalledWith(orgJ2.email, expect.any(Date), 'FR');
  });
});
