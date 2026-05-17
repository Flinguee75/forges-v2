const { accounts, auth, createApprenantAccount, createPaiementAndConfirm, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-148 — TDB mensuel Superviseur + alias backoffice', () => {
  test('retourne le top des apporteurs et les commissions dues via /api/superviseur et /api/backoffice', async () => {
    const apprenant = await createApprenantAccount('rm148-tdb');
    const apprenantHeaders = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(apprenantHeaders)
      .send({
        source_financement: 'RETAIL',
        code_apporteur: ids.apporteurCode,
      });

    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier?.id || inscription.body.data?.id;
    expect(dossierId).toBeTruthy();

    await createPaiementAndConfirm(apprenantHeaders, dossierId, 'rm148-tdb', 150000);

    const apporteur = await prisma.apporteur.findFirst({
      where: { code_apporteur: ids.apporteurCode },
    });
    expect(apporteur).toBeTruthy();

    const commission = await prisma.commissionApporteur.findFirst({
      where: { dossier_id: dossierId },
    });
    expect(commission).toBeTruthy();

    const superviseurHeaders = await auth(accounts.superviseur);

    const tdb = await request(API_URL)
      .get('/api/superviseur/apporteurs/tdb')
      .set(superviseurHeaders);

    expect(tdb.status).toBe(200);
    expect(tdb.body.data.nb_apporteurs_actifs).toBeGreaterThan(0);
    expect(Array.isArray(tdb.body.data.top_apporteurs)).toBe(true);
    expect(tdb.body.data.top_apporteurs.some((row) => row.apporteur_id === apporteur.id)).toBe(true);
    expect(tdb.body.data.commissions_totales_dues_xof).toBeGreaterThanOrEqual(commission.montant_commission || commission.montant_commission_xof || 0);

    const backofficeAlias = await request(API_URL)
      .get('/api/backoffice/apporteurs/stats')
      .set(superviseurHeaders);

    expect(backofficeAlias.status).toBe(200);
    expect(backofficeAlias.body.data.top_apporteurs.some((row) => row.apporteur_id === apporteur.id)).toBe(true);
  });
});
