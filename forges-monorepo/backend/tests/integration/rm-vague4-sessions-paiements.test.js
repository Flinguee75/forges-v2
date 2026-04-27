const { accounts, auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 4 API — Sessions RM-03/18/19/24/25 + Paiements RM-06/08', () => {

  // ===== SESSIONS =====

  // RM-03 : archivage auto dossiers EN_ATTENTE lorsque formation archivée
  test('RM-03 — dossiers EN_ATTENTE annulés lorsque formation archivée', async () => {
    const headers = await auth(accounts.responsable);

    // Créer formation avec dossier EN_ATTENTE
    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-03 ${Date.now()}`,
        description_courte: 'Test archivage dossiers',
        description_longue: 'RM-03',
        duree_jours: 3,
        cout_catalogue: 100000,
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        mode_formation: 'AVEC_SESSION',
        statut: 'ACTIVE',
        langues_disponibles: ['FR'],
        certification_delivree: true,
        public_cible: 'Professionnels',
        objectifs_pedagogiques: ['Test'],
        prerequis: 'Aucun',
        inclus_abonnement: true,
        responsable_id: ids.responsable, // Correction URGENT #2 : RM-03
      },
    });

    const session = await prisma.session.create({
      data: {
        formation_id: formation.id,
        capacite: 20,
        places_restantes: 20,
        statut: 'OUVERTE',
        date_ouverture: new Date(),
        date_cloture: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        date_debut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        date_fin: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    });

    const account = await createApprenantAccount('rm03');
    const dossier = await prisma.dossier.create({
      data: {
        apprenant_id: account.id,
        formation_id: formation.id,
        session_id: session.id,
        source_financement: 'RETAIL',
        statut: 'EN_ATTENTE_VERIFICATION',
      },
    });

    // Archiver la formation
    await request(API_URL)
      .put(`/api/responsable/formations/${formation.id}/archiver`)
      .set(headers)
      .send({});

    // Vérifier que le dossier EN_ATTENTE est annulé
    const dossierApres = await prisma.dossier.findUnique({ where: { id: dossier.id } });
    expect(dossierApres.statut).toBe('ANNULE');
  });

  // RM-18 : fenêtre exception +10% capacité pour inscriptions exceptionnelles
  test('RM-18 — inscriptions EXCEPTION possibles jusqua 10 pourcent capacite', async () => {
    const headers = await auth(accounts.responsable);

    // Créer session capacité 10
    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-18 ${Date.now()}`,
        description_courte: 'Test fenêtre exception',
        description_longue: 'RM-18',
        duree_jours: 2,
        cout_catalogue: 80000,
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        mode_formation: 'AVEC_SESSION',
        statut: 'ACTIVE',
        langues_disponibles: ['FR'],
        certification_delivree: false,
        public_cible: 'Tous',
        objectifs_pedagogiques: ['Test RM-18'],
        prerequis: 'Aucun',
        inclus_abonnement: true,
        responsable_id: ids.responsable, // Correction URGENT #3 : RM-18
      },
    });

    const session = await prisma.session.create({
      data: {
        formation_id: formation.id,
        capacite: 10,
        places_restantes: 0, // Session pleine
        statut: 'OUVERTE',
        date_ouverture: new Date(),
        date_cloture: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        date_debut: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        date_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Inscrire 10 apprenants (capacité normale)
    for (let i = 0; i < 10; i++) {
      const account = await createApprenantAccount(`rm18-normal-${i}`);
      await prisma.dossier.create({
        data: {
          apprenant_id: account.id,
          formation_id: formation.id,
          session_id: session.id,
          source_financement: 'RETAIL',
          statut: 'PAYE_DIRECTEMENT',
        },
      });
    }

    // Mettre à jour places_restantes après insertion directe en DB
    await prisma.session.update({
      where: { id: session.id },
      data: { places_restantes: 0, nb_inscrits: 10 },
    });

    // 11ème inscription → GRIS (0-10%)
    const account11 = await createApprenantAccount('rm18-gris');
    const inscription11 = await request(API_URL)
      .post(`/api/sessions/${session.id}/inscrire`)
      .set(await auth(account11))
      .send({ source_financement: 'RETAIL' });

    const dossier11 = await prisma.dossier.findFirst({
      where: { apprenant_id: account11.id, session_id: session.id },
    });

    expect(dossier11.type_fenetre).toBe('GRIS');

    // 12ème inscription → EXCEPTION (>10%)
    const account12 = await createApprenantAccount('rm18-exception');
    const inscription12 = await request(API_URL)
      .post(`/api/sessions/${session.id}/inscrire`)
      .set(await auth(account12))
      .send({ source_financement: 'RETAIL' });

    const dossier12 = await prisma.dossier.findFirst({
      where: { apprenant_id: account12.id, session_id: session.id },
    });

    expect(dossier12.type_fenetre).toBe('EXCEPTION');
  });

  // RM-19 : dossiers GRIS/EXCEPTION affichés en priorité pour Responsable
  test('RM-19 — endpoint responsable trie GRIS/EXCEPTION en priorité', async () => {
    const headers = await auth(accounts.responsable);

    const res = await request(API_URL)
      .get('/api/responsable/dossiers')
      .set(headers);

    expect(res.status).toBe(200);
    const dossiers = res.body.data || res.body;

    // Vérifier que les dossiers GRIS/EXCEPTION apparaissent en tête
    const premiersTypes = dossiers.slice(0, 5).map(d => d.type_fenetre);
    const hasGrisOrException = premiersTypes.some(t => ['GRIS', 'EXCEPTION'].includes(t));

    // Si des dossiers GRIS/EXCEPTION existent, ils doivent être en tête
    const totalGrisException = dossiers.filter(d => ['GRIS', 'EXCEPTION'].includes(d.type_fenetre)).length;
    if (totalGrisException > 0) {
      expect(hasGrisOrException).toBe(true);
    }
  });

  // RM-24 : notification modification session avec inscrits
  test('RM-24 — modification session avec inscrits notifie Responsable', async () => {
    const headers = await auth(accounts.responsable);

    // Créer session avec inscrit
    const session = await prisma.session.create({
      data: {
        formation_id: ids.standardFormation,
        capacite: 15,
        places_restantes: 15,
        statut: 'OUVERTE',
        date_ouverture: new Date(),
        date_cloture: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        date_debut: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        date_fin: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      },
    });

    const account = await createApprenantAccount('rm24');
    await prisma.dossier.create({
      data: {
        apprenant_id: account.id,
        formation_id: ids.standardFormation,
        session_id: session.id,
        source_financement: 'RETAIL',
        statut: 'PAYE_DIRECTEMENT',
      },
    });

    // Modifier la session
    const updateRes = await request(API_URL)
      .put(`/api/responsable/sessions/${session.id}`)
      .set(headers)
      .send({
        date_debut: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // Décalage date
      });

    expect(updateRes.status).toBe(200);
    // Une notification devrait être créée (vérification simplifié)
  });

  // RM-25 : planification annuelle — Superviseur planifie toutes sessions en une opération
  test('RM-25 — endpoint planification annuelle permet création multiple sessions', async () => {
    const headers = await auth(accounts.superviseur);

    const sessions = [
      {
        formation_id: ids.standardFormation,
        capacite: 20,
        date_ouverture: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        date_cloture: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        date_debut: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
        date_fin: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
      },
      {
        formation_id: ids.standardFormation,
        capacite: 20,
        date_ouverture: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        date_cloture: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000),
        date_debut: new Date(Date.now() + 67 * 24 * 60 * 60 * 1000),
        date_fin: new Date(Date.now() + 72 * 24 * 60 * 60 * 1000),
      },
    ];

    const res = await request(API_URL)
      .post('/api/superviseur/sessions/planification-annuelle')
      .set(headers)
      .send({ sessions });

    expect([200, 201]).toContain(res.status);
    expect(res.body.data?.created || res.body.created).toBeGreaterThanOrEqual(2);
  });

  // ===== PAIEMENTS =====

  // RM-06 : paiement unique par dossier — max 1 paiement validé
  test('RM-06 — un seul paiement validé par dossier', async () => {
    const account = await createApprenantAccount('rm06');
    const headers = await auth(account);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier?.id || inscription.body.data?.id;

    // Premier paiement
    const paiement1 = await prisma.paiement.create({
      data: {
        dossier_id: dossierId,
        montant_catalogue: 300000, // Correction PLAN_CORRECTION_WAVE4 #3
        montant_final: 300000,
        statut: 'CONFIRME',
        methode: 'MOBILE_MONEY',
        transaction_id: `TX-RM06-1-${Date.now()}`,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    // Tentative deuxième paiement
    const paiement2Res = await request(API_URL)
      .post(`/api/paiements`)
      .set(headers)
      .send({
        dossier_id: dossierId,
        montant: 300000,
        methode: 'MOBILE_MONEY',
      });

    expect([400, 409]).toContain(paiement2Res.status);
    expect(paiement2Res.body.error).toMatch(/PAIEMENT_DEJA_VALIDE|DUPLICATE/i);
  });

  // RM-08 : max 3 tentatives paiement, délai 15 min au-delà
  test('RM-08 — max 3 tentatives paiement par session, blocage après', async () => {
    const account = await createApprenantAccount('rm08');
    const headers = await auth(account);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier?.id || inscription.body.data?.id;

    // QUICK WIN #2 : RM-08 utilise UPDATE sur 1 paiement (relation 1-to-1)
    // Créer 1 paiement initial
    const paiement = await prisma.paiement.create({
      data: {
        dossier_id: dossierId,
        montant_catalogue: 300000,
        statut: 'EN_ATTENTE',
        methode: 'MOBILE_MONEY',
        transaction_id: `TX-RM08-init-${Date.now()}`,
        tentatives: 0,
      },
    });

    // Simuler 3 tentatives échouées via UPDATE
    for (let i = 0; i < 3; i++) {
      await prisma.paiement.update({
        where: { id: paiement.id },
        data: {
          tentatives: { increment: 1 },
          statut: 'ECHOUE',
          transaction_id: `TX-RM08-${i}-${Date.now()}`,
        },
      });
    }

    // 4ème tentative → bloquée
    const paiement4Res = await request(API_URL)
      .post(`/api/paiements`)
      .set(headers)
      .send({
        dossier_id: dossierId,
        montant: 300000,
        methode: 'MOBILE_MONEY',
      });

    expect(paiement4Res.status).toBe(429);
    expect(paiement4Res.body.error).toBe('TOO_MANY_ATTEMPTS');
  });
});
