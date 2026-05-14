const { accounts, auth, createApprenantAccount, createPaiementAndConfirm, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-149 — Vue paiements Agent Comptable', () => {
  test('AGENT peut lister les paiements confirmes via les routes backoffice', async () => {
    const apprenant = await createApprenantAccount('rm149-paiements');
    const apprenantHeaders = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(apprenantHeaders)
      .send({ source_financement: 'RETAIL' });

    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier?.id || inscription.body.data?.id;
    expect(dossierId).toBeTruthy();

    await createPaiementAndConfirm(apprenantHeaders, dossierId, 'rm149-paiements', 150000);

    const agentHeaders = await auth(accounts.agent);

    const liste = await request(API_URL)
      .get('/api/backoffice/paiements')
      .set(agentHeaders)
      .query({ statut: 'CONFIRME' });

    expect(liste.status).toBe(200);
    expect(Array.isArray(liste.body)).toBe(true);
    expect(
      liste.body.some(
        (row) => row.statut === 'CONFIRME' && (row.dossier_id === dossierId || row.dossier?.id === dossierId)
      )
    ).toBe(true);
  });

  test('AGENT peut executer un reversement partenaire via l alias backoffice', async () => {
    const agentHeaders = await auth(accounts.agent);

    await prisma.commissionPartenaire.upsert({
      where: { paiement_id: 'P-E2E-PAYE-01' },
      create: {
        partenaire_id: ids.partenaire,
        formation_id: ids.partenaireFormation,
        paiement_id: 'P-E2E-PAYE-01',
        montant_catalogue: 75000,
        commission_forges_pct: 20,
        montant_reverse: 60000,
        statut: 'EN_ATTENTE',
      },
      update: {
        partenaire_id: ids.partenaire,
        formation_id: ids.partenaireFormation,
        montant_catalogue: 75000,
        commission_forges_pct: 20,
        montant_reverse: 60000,
        statut: 'EN_ATTENTE',
        reverse_le: null,
        reverse_par: null,
      },
    });

    const reversement = await request(API_URL)
      .post(`/api/backoffice/reversements/partenaires/${ids.partenaire}/execute`)
      .set(agentHeaders)
      .send({});

    expect(reversement.status).toBe(201);
    expect(reversement.body.statusCode).toBe(201);

    const remaining = await prisma.commissionPartenaire.count({
      where: { partenaire_id: ids.partenaire, statut: 'EN_ATTENTE' },
    });
    expect(remaining).toBe(0);

    await prisma.commissionPartenaire.deleteMany({
      where: {
        partenaire_id: ids.partenaire,
        paiement_id: 'P-E2E-PAYE-01',
      },
    });
  });
});
