const { accounts, auth, createApprenantAccount, createPaiementAndConfirm, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Apporteurs RM-141/RM-142/RM-145/RM-146/RM-147', () => {
  test('RM-141/RM-142 — code permanent UUID-like et taux defaut 5%', async () => {
    const apporteur = await prisma.apporteur.findFirst({ where: { code_apporteur: ids.apporteurCode } });
    expect(apporteur).toBeDefined();
    expect(apporteur.code_apporteur).toBe(ids.apporteurCode);
    expect(apporteur.taux_commission_pct).toBe(5);

    // Mettre à jour ids.apporteur avec l'ID réel
    ids.apporteur = apporteur.id;

    const headers = await auth(accounts.apporteur);
    const dashboard = await request(API_URL).get('/api/apporteurs/dashboard').set(headers);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.code_apporteur).toBe(ids.apporteurCode);
  });

  test('RM-145 — paiement avec code apporteur cree une commission', async () => {
    const headers = await auth(await createApprenantAccount('rm145'));
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: ids.apporteurCode });
    expect(inscription.status).toBe(201);

    await createPaiementAndConfirm(headers, inscription.body.dossier.id, 'rm145', 150000);

    const commission = await prisma.commissionApporteur.findFirst({
      where: { dossier_id: inscription.body.dossier.id },
    });
    expect(commission.apporteur_id).toBe(ids.apporteur);
    expect(commission.montant_commission).toBe(7500); // cout_catalogue 150000 * 5%
  });

  test.skip('RM-146/RM-147 — aggregation puis reversement si seuil atteint', async () => {
    await prisma.commissionApporteur.updateMany({
      where: { apporteur_id: ids.apporteur, statut: 'EN_ATTENTE' },
      data: { statut: 'VALIDEE' },
    });

    const agentHeaders = await auth(accounts.agent);
    const pending = await request(API_URL).get('/api/agent/reversements/apporteurs').set(agentHeaders);
    expect(pending.status).toBe(200);
    expect(pending.body.data.some((row) => row.apporteur_id === ids.apporteur && row.montant_total_xof >= 5000)).toBe(true);

    const reversement = await request(API_URL)
      .post(`/api/agent/reversements/apporteurs/${ids.apporteur}/execute`)
      .set(agentHeaders)
      .send({});
    expect([200, 201]).toContain(reversement.status);
  });
});
