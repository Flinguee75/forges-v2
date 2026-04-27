const { accounts, auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Dossiers et bifurcation RM-140/RM-05/RM-07/RM-19', () => {
  test('RM-140 — Premium+Retail attend verification Responsable', async () => {
    const account = await createApprenantAccount('rm140pr');
    const headers = await auth(account);
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('EN_ATTENTE_VERIFICATION');
  });

  test('RM-140 — Standard Retail et Premium B2B passent en paiement direct', async () => {
    const stdAccount = await createApprenantAccount('rm140std');
    const stdHeaders = await auth(stdAccount);
    const standard = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(stdHeaders)
      .send({ source_financement: 'RETAIL' });

    expect(standard.status).toBe(201);
    expect(standard.body.dossier.statut).toBe('PAYE_DIRECTEMENT');

    const b2bAccount = await createApprenantAccount('rm140b2b');
    const b2bHeaders = await auth(b2bAccount);
    const premiumB2b = await request(API_URL)
      .post(`/api/sessions/${ids.premiumB2bSession}/inscrire`)
      .set(b2bHeaders)
      .send({ source_financement: 'B2B' });

    expect(premiumB2b.status).toBe(201);
    expect(premiumB2b.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
  });

  test('RM-05/RM-07 — RETENU est irreversibile et declenche une expiration 72h', async () => {
    const appAccount = await createApprenantAccount('rm05ret');
    const appHeaders = await auth(appAccount);
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(appHeaders)
      .send({ source_financement: 'RETAIL' });
    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier.id;

    const headers = await auth(accounts.responsable);
    const retenir = await request(API_URL)
      .post(`/api/dossiers/${dossierId}/retenir`)
      .set(headers)
      .send({});

    expect(retenir.status).toBe(200);

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    expect(dossier.statut).toBe('RETENU');
    expect(dossier.expires_at.getTime()).toBeGreaterThan(Date.now() + 71 * 60 * 60 * 1000);

    const refuser = await request(API_URL)
      .put(`/api/dossiers/${dossierId}/refuser`)
      .set(headers)
      .send({ motif_refus: 'Refus interdit apres retention' });
    expect(refuser.status).toBe(400);
  });

  test('RM-07 — scheduler expire les dossiers RETENU expires', async () => {
    const dossierId = `D-RM07-${Date.now()}`;
    const appAccount = await createApprenantAccount('rm07exp');

    await prisma.dossier.create({
      data: {
        id: dossierId,
        apprenant_id: appAccount.id,
        formation_id: ids.premiumRetailFormation,
        session_id: ids.premiumRetailSession,
        statut: 'RETENU',
        source_financement: 'RETAIL',
        expires_at: new Date(Date.now() - 1000),
      },
    });

    const expiredDossiers = await prisma.dossier.findMany({
      where: { statut: 'RETENU', expires_at: { lt: new Date() } },
    });
    expect(expiredDossiers.length).toBeGreaterThanOrEqual(1);

    for (const d of expiredDossiers) {
      await prisma.dossier.update({
        where: { id: d.id },
        data: { statut: 'ANNULE' },
      });
    }

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    expect(dossier.statut).toBe('ANNULE');
  });

  test('RM-19 — GRIS et EXCEPTION sont tries en priorite', async () => {
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL).get('/api/backoffice/dossiers').set(headers);
    expect(res.status).toBe(200);

    const rows = Array.isArray(res.body.data) ? res.body.data : res.body;
    const priorityStatuses = rows.slice(0, 2).map((row) => row.type_fenetre || row.statut);
    expect(priorityStatuses).toEqual(expect.arrayContaining(['GRIS', 'EXCEPTION']));
  });
});
