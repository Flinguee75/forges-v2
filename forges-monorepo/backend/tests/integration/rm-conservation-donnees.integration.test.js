const {
  auth,
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('Wave 3 - Conservation donnees', () => {
  test('RM-74 - la resiliation Retail conserve dossiers et acces formation', async () => {
    const apprenant = await createApprenantAccount('rm74');
    const headers = await auth(apprenant);

    await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'ESSENTIEL' })
      .expect(201);

    await prisma.abonnementRetail.update({
      where: { apprenant_id: apprenant.id },
      data: { statut: 'ACTIF' },
    });

    const dossier = await prisma.dossier.create({
      data: {
        apprenant_id: apprenant.id,
        formation_id: ids.standardFormation,
        session_id: ids.sessionStandard,
        statut: 'PAYE',
        source_financement: 'RETAIL',
      },
    });
    const acces = await prisma.accesFormationDemande.create({
      data: {
        apprenant_id: apprenant.id,
        formation_id: ids.demandeFormation,
        source_financement: 'ABONNEMENT',
        statut: 'ACTIF',
        date_expiration: daysFromNow(365),
        progression: 40,
      },
    });

    await request(API_URL)
      .delete('/api/abonnements/retail')
      .set(headers)
      .send({})
      .expect(200);

    const abonnement = await prisma.abonnementRetail.findUnique({ where: { apprenant_id: apprenant.id } });
    const dossierConserve = await prisma.dossier.findUnique({ where: { id: dossier.id } });
    const accesConserve = await prisma.accesFormationDemande.findUnique({ where: { id: acces.id } });

    expect(abonnement.statut).toBe('EN_RESILIATION');
    expect(dossierConserve).toBeTruthy();
    expect(dossierConserve.statut).toBe('PAYE');
    expect(accesConserve).toBeTruthy();
    expect(accesConserve.progression).toBe(40);
  });
});
