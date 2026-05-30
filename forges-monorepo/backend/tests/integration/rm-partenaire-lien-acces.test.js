const { accounts, auth, createApprenantAccount, prisma, request, API_URL } = require('./helpers');

jest.setTimeout(15000);

describe('Workflow partenaire — lien LMS et accès apprenant', () => {
  test('partenaire soumet une formation à la demande avec lien, FORGES valide, apprenant accède via proxy', async () => {
    const contentUrl = `https://lms.forges.test/formations/partner-${Date.now()}`;
    const partenaireHeaders = await auth(accounts.partenaire);

    const submit = await request(API_URL)
      .post('/api/partenaires/formations')
      .set(partenaireHeaders)
      .send({
        intitule: `Formation partenaire lien ${Date.now()}`,
        description_courte: 'Formation partenaire avec lien LMS',
        description_longue: 'Validation de la transmission du lien de contenu partenaire.',
        duree_jours: 5,
        prix_coutant_propose: 120000,
        mode_formation: 'A_LA_DEMANDE',
        langues_disponibles: ['FR'],
        certification_delivree: true,
        public_cible: 'Professionnels',
        objectifs_pedagogiques: ['Accéder au contenu partenaire'],
        prerequis: 'Aucun',
        url_contenu: contentUrl,
      });

    expect(submit.status).toBe(201);
    const { formation_id: formationId, fp_id: formationPartenaireId } = submit.body.data;

    const storedBeforeValidation = await prisma.formation.findUnique({
      where: { id: formationId },
      select: { url_externe_chiffree: true, statut: true },
    });
    expect(storedBeforeValidation.url_externe_chiffree).toBeTruthy();
    expect(storedBeforeValidation.url_externe_chiffree).not.toBe(contentUrl);
    expect(storedBeforeValidation.statut).toBe('EN_ATTENTE_VALIDATION');

    const responsableHeaders = await auth(accounts.responsable);
    const validation = await request(API_URL)
      .put(`/api/responsable/validations/${formationPartenaireId}/valider`)
      .set(responsableHeaders)
      .send({
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        prix_coutant_valide: 120000,
      });

    expect(validation.status).toBe(200);
    expect(validation.body.data.inclus_abonnement).toBe(true);
    expect(validation.body.data.prix_catalogue).toBe(150000);

    const apprenantAccount = await createApprenantAccount('part-lms');
    await prisma.abonnementRetail.create({
      data: {
        apprenant_id: apprenantAccount.id,
        offre: 'PREMIUM',
        statut: 'ACTIF',
        montant_mensuel: 2500000,
        date_debut: new Date(Date.now() - 24 * 3600 * 1000),
        date_fin: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    const apprenantHeaders = await auth(apprenantAccount);
    const access = await request(API_URL)
      .post(`/api/formations/${formationId}/acceder`)
      .set(apprenantHeaders)
      .send({});

    expect(access.status).toBe(200);
    expect(access.body.data.formation_id).toBe(formationId);
    expect(access.body.data.statut).toBe('ACTIF');

    const proxy = await request(API_URL)
      .get(`/api/formations-demande/${access.body.data.id}/acceder`)
      .set(apprenantHeaders)
      .redirects(0);

    expect(proxy.status).toBe(302);
    expect(proxy.headers.location).toBe(contentUrl);

    await prisma.accesFormationDemande.deleteMany({ where: { formation_id: formationId } });
    await prisma.formationPartenaire.deleteMany({ where: { id: formationPartenaireId } });
    await prisma.formation.deleteMany({ where: { id: formationId } });
  });
});
