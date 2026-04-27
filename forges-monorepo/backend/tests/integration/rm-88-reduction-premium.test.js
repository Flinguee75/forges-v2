const { accounts, auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-88 — Réduction -15% Abonné Premium (Criticité 5)', () => {
  // RM-88 : Abonné Premium actif obtient -15% sur formations Premium

  test('RM-88.1 — Apprenant Premium actif voit prix réduit -15%', async () => {
    // Utiliser l'apprenant Premium Retail qui a un abonnement actif (créé dans seed)
    const apprenant = await prisma.apprenant.findUnique({
      where: { id: 'app-e2e-premium-retail-01' },
      include: { abonnement_retail: true },
    });

    expect(apprenant).toBeDefined();
    expect(apprenant.abonnement_retail?.offre).toBe('PREMIUM');
    expect(apprenant.abonnement_retail?.statut).toBe('ACTIF');

    const formation = await prisma.formation.findUnique({ where: { id: ids.premiumRetailFormation } });
    const prixNormal = formation.cout_catalogue;
    const prixReduit = Math.round(prixNormal * 0.85);

    const headers = await auth(accounts.apprenantPremiumRetail);
    const res = await request(API_URL).get(`/api/formations/${ids.premiumRetailFormation}`).set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.prix_affiche).toBe(prixReduit);
  });

  test('RM-88.2 — Inscription Premium avec abonné applique réduction', async () => {
    const headers = await auth(await createApprenantAccount('rm88'));

    // Créer abonnement Premium actif
    const apprenant = await createApprenantAccount('rm88');
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 1);
    await prisma.abonnementRetail.create({
      data: {
        apprenant_id: apprenant.id,
        offre: 'PREMIUM',
        statut: 'ACTIF',
        date_debut: new Date(),
        date_fin: dateFin,
        montant_mensuel: 2500000,
      },
    });

    const formation = await prisma.formation.findUnique({ where: { id: ids.premiumRetailFormation } });
    const prixReduit = Math.round(formation.cout_catalogue * 0.85);

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(await auth(apprenant))
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(201);

    const dossier = await prisma.dossier.findFirst({
      where: { apprenant_id: apprenant.id, session_id: ids.premiumRetailSession },
    });

    // RM-88 : La réduction de 15% doit être appliquée (montant_remise = 15% du prix catalogue)
    const remiseAttendue = Math.round(formation.cout_catalogue * 0.15);
    expect(dossier.montant_remise).toBe(remiseAttendue);
  });

  test('RM-88.3 — Apprenant sans abonnement paie prix plein', async () => {
    const apprenant = await createApprenantAccount('rm88-3');
    const formation = await prisma.formation.findUnique({ where: { id: ids.premiumRetailFormation } });

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(await auth(apprenant))
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(201);

    const dossier = await prisma.dossier.findFirst({
      where: { apprenant_id: apprenant.id },
    });

    // RM-88 : Sans abonnement Premium, aucune réduction
    expect(dossier.montant_remise).toBe(0);
  });
});
