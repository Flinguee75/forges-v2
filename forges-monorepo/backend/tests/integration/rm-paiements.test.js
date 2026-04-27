const { accounts, auth, createApprenantAccount, createPaiementAndConfirm, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Paiements RM-06/RM-09/RM-10', () => {
  test('RM-09 — webhook SUCCESS confirme le paiement et passe le dossier en PAYE', async () => {
    const headers = await auth(await createApprenantAccount('rm09'));
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.partenaireSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });
    expect(inscription.status).toBe(201);

    await createPaiementAndConfirm(headers, inscription.body.dossier.id, 'rm09', 250000);

    const dossier = await prisma.dossier.findUnique({
      where: { id: inscription.body.dossier.id },
      include: { paiement: true },
    });
    expect(dossier.statut).toBe('PAYE');
    expect(dossier.paiement.statut).toBe('CONFIRME');
  });

  test('RM-06 — un second paiement valide est bloque pour le meme dossier', async () => {
    const headers = await auth(accounts.apprenantDossier);
    const res = await request(API_URL)
      .post('/api/paiements')
      .set(headers)
      .send({ dossier_id: ids.dossierPaye, methode: 'MOBILE_MONEY' });

    expect([400, 409]).toContain(res.status);
  });

  test('RM-10 — aucun remboursement automatique apres paiement confirme', async () => {
    const paiement = await prisma.paiement.findFirst({ where: { dossier_id: ids.dossierPaye } });
    expect(paiement.statut).toBe('CONFIRME');
    expect(paiement.statut).not.toBe('REMBOURSE');
  });
});
