const {
  accounts,
  auth,
  createApprenantAccount,
  createOrganisationAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('Wave 1 - Abonnements B2B manquants', () => {
  test('RM-111 - expiration B2B suspend les acces formations a la demande finances par B2B sans les supprimer', async () => {
    const organisation = await createOrganisationAccount('rm111');
    const apprenant = await createApprenantAccount('rm111');
    const adminHeaders = await auth(accounts.admin);

    await prisma.apprenant.update({
      where: { id: apprenant.id },
      data: { organisation_id: organisation.id },
    });

    const abonnement = await prisma.abonnementB2B.create({
      data: {
        organisation_id: organisation.id,
        palier: 'STARTER',
        nb_max: 20,
        nb_actifs: 1,
        date_debut: daysFromNow(-366),
        date_fin: daysFromNow(-1),
        date_renouvellement: daysFromNow(-1),
        prix_annuel: 250000,
        premium_inclus_par_an: 0,
        statut: 'ACTIF',
      },
    });
    await prisma.organisation.update({
      where: { id: organisation.id },
      data: { abonnement_b2b_id: abonnement.id },
    });

    const acces = await prisma.accesFormationDemande.create({
      data: {
        apprenant_id: apprenant.id,
        formation_id: ids.demandeFormation,
        source_financement: 'B2B',
        statut: 'ACTIF',
        date_activation: daysFromNow(-10),
        date_expiration: daysFromNow(355),
        progression: 25,
      },
    });

    const scheduler = await request(API_URL)
      .post('/api/abonnements/admin/scheduler')
      .set(adminHeaders)
      .send({});

    expect(scheduler.status).toBe(200);
    expect(scheduler.body.data.b2b_expires).toBeGreaterThanOrEqual(1);

    const expired = await prisma.abonnementB2B.findUnique({ where: { id: abonnement.id } });
    const suspendedAccess = await prisma.accesFormationDemande.findUnique({ where: { id: acces.id } });
    const accessCount = await prisma.accesFormationDemande.count({ where: { id: acces.id } });

    expect(expired.statut).toBe('EXPIRE');
    expect(suspendedAccess.statut).toBe('SUSPENDU');
    expect(suspendedAccess.progression).toBe(25);
    expect(accessCount).toBe(1);
  });
});
