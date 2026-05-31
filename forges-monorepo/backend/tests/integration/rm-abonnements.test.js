const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Abonnements RM-102/RM-92/RM-94/RM-103', () => {
  test('RM-102 — seule une formation STANDARD avec pilier RETAIL/TOUS est incluse', async () => {
    const standard = await prisma.formation.findUnique({ where: { id: ids.standardFormation } });
    const premium = await prisma.formation.findUnique({ where: { id: ids.premiumRetailFormation } });

    expect(standard.type_formation).toBe('STANDARD');
    expect(['RETAIL', 'TOUS']).toContain(standard.pilier_abonnement);
    expect(standard.inclus_abonnement).toBe(true);
    expect(premium.inclus_abonnement).toBe(false);
  });

  test('RM-94/RM-92 — un abonne accede a une formation Standard a la demande pour 365j', async () => {
    const headers = await auth(accounts.apprenantPremiumRetail);
    const res = await request(API_URL)
      .post(`/api/formations/${ids.demandeFormation}/acceder`)
      .set(headers)
      .send({});

    expect([200, 201]).toContain(res.status);
    const acces = res.body.data || res.body;
    expect(acces.statut).toBe('ACTIF');
    expect(acces.source_financement).toBe('ABONNEMENT');

    const dureeMs = new Date(acces.date_expiration).getTime() - new Date(acces.date_activation).getTime();
    expect(Math.round(dureeMs / (24 * 60 * 60 * 1000))).toBe(365);
  });

  test('RM-103 — un acces a la demande expire retourne 410', async () => {
    const headers = await auth(accounts.apprenantDossier);
    const res = await request(API_URL)
      .get(`/api/espace-apprenant/formations-demande/${ids.accesExpired}`)
      .set(headers);

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('ACCES_EXPIRE');
  });
});
