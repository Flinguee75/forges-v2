const { accounts, auth, createPaiementAndConfirm, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 4 API — Formations RM-04/11/12/87/91-96', () => {

  // RM-11 : protection historique — formation avec paiements ne peut être supprimée
  test('RM-11 — formation avec paiements validés ne peut être supprimée, seulement archivée', async () => {
    const headers = await auth(accounts.responsable);

    // Vérifier qu'une formation avec paiements ne peut pas être supprimée
    const formation = await prisma.formation.findFirst({
      where: {
        dossiers: {
          some: {
            paiement: { statut: 'CONFIRME' }
          }
        }
      }
    });

    if (!formation) {
      console.log('Aucune formation avec paiements trouvée pour RM-11');
      return;
    }

    // Tenter DELETE (devrait échouer ou retourner 403/409)
    const deleteRes = await request(API_URL)
      .delete(`/api/responsable/formations/${formation.id}`)
      .set(headers);

    expect([403, 404, 409]).toContain(deleteRes.status);

    // Archivage doit fonctionner
    const archiveRes = await request(API_URL)
      .put(`/api/responsable/formations/${formation.id}/archiver`)
      .set(headers)
      .send({});

    expect([200, 409]).toContain(archiveRes.status);
    if (archiveRes.status === 200) {
      const archived = await prisma.formation.findUnique({ where: { id: formation.id } });
      expect(archived.statut).toBe('ARCHIVEE');
    }
  });

  // RM-12 : cohérence tarif — modification n'affecte pas dossiers déjà traités
  test('RM-12 — modification tarif bloquée si paiements validés', async () => {
    const headers = await auth(accounts.responsable);

    // Trouver une formation avec paiements
    const formation = await prisma.formation.findFirst({
      where: {
        dossiers: {
          some: {
            paiement: { statut: 'CONFIRME' }
          }
        }
      }
    });

    if (!formation) {
      console.log('Aucune formation avec paiements trouvée pour RM-12');
      return;
    }

    const nouveauTarif = formation.cout_catalogue + 10000;

    const res = await request(API_URL)
      .put(`/api/responsable/formations/${formation.id}`)
      .set(headers)
      .send({ cout_catalogue: nouveauTarif });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('TARIF_NON_MODIFIABLE_APRES_INSCRIPTION');
  });

  // RM-04 : délai traitement obligatoire avant ouverture inscriptions
  test('RM-04 — session ne peut ouvrir inscriptions avant délai traitement', async () => {
    const headers = await auth(accounts.responsable);

    // Créer une formation avec délai_traitement_jours
    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-04 ${Date.now()}`,
        description_courte: 'Test délai traitement',
        description_longue: 'Test RM-04',
        duree_jours: 5,
        cout_catalogue: 200000,
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        mode_formation: 'AVEC_SESSION',
        statut: 'ACTIVE',
        langues_disponibles: ['FR'],
        certification_delivree: true,
        public_cible: 'Professionnels',
        objectifs_pedagogiques: ['Tester RM-04'],
        prerequis: 'Aucun',
        inclus_abonnement: true,
        // delai_traitement_jours: 3, // QUICK WIN #1 : Champ absent du schéma (Wave 5)
        responsable_id: ids.responsable, // Correction PLAN_CORRECTION_WAVE4 #2
      },
    });

    // Créer une session qui ouvre dans moins de 3 jours
    const dateDans2Jours = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const sessionRes = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(headers)
      .send({
        formation_id: formation.id,
        capacite: 20,
        date_ouverture: dateDans2Jours,
        date_cloture: new Date(dateDans2Jours.getTime() + 5 * 24 * 60 * 60 * 1000),
        date_debut: new Date(dateDans2Jours.getTime() + 7 * 24 * 60 * 60 * 1000),
        date_fin: new Date(dateDans2Jours.getTime() + 12 * 24 * 60 * 60 * 1000),
      });

    // RM-04 : Le backend rejette si délai < 3 jours avant ouverture
    expect(sessionRes.status).toBe(400);
    expect(sessionRes.body.error).toBe('DELAI_TRAITEMENT_INSUFFISANT');
  });

  // RM-87 : Premium hors abonnement — achat unitaire obligatoire
  test('RM-87 — formation Premium jamais incluse dans abonnement (inclus_abonnement=false)', async () => {
    const premiumFormations = await prisma.formation.findMany({
      where: { type_formation: 'PREMIUM' }
    });

    expect(premiumFormations.length).toBeGreaterThan(0);
    premiumFormations.forEach(f => {
      expect(f.inclus_abonnement).toBe(false);
    });
  });

  // RM-91 : mode_formation obligatoire (AVEC_SESSION ou A_LA_DEMANDE)
  test('RM-91 — toute formation a un mode_formation défini', async () => {
    const formations = await prisma.formation.findMany({
      where: { statut: { in: ['ACTIVE', 'EN_ATTENTE_PLANIFICATION'] } }
    });

    formations.forEach(f => {
      expect(['AVEC_SESSION', 'A_LA_DEMANDE']).toContain(f.mode_formation);
    });
  });

  // RM-92 : durée accès 365j pour formations À la demande
  test('RM-92 — formations À la demande ont duree_acces_jours = 365', async () => {
    const formationsDemande = await prisma.formation.findMany({
      where: { mode_formation: 'A_LA_DEMANDE' }
    });

    formationsDemande.forEach(f => {
      expect(f.duree_acces_jours).toBe(365);
    });
  });

  // RM-93 : disponibilité immédiate pour formations À la demande
  test('RM-93 — formations À la demande accessibles immédiatement après paiement', async () => {
    const headers = await auth(accounts.apprenantStd);

    // Accéder à une formation À la demande
    const res = await request(API_URL)
      .post(`/api/formations/${ids.demandeFormation}/acceder`)
      .set(headers)
      .send({});

    expect([200, 201]).toContain(res.status);
    const acces = res.body.data?.acces || res.body.acces || res.body.data;
    expect(acces.statut).toBe('ACTIF');
    expect(acces.source_financement).toBe('ABONNEMENT');
  });

  // RM-94 : formations Standard À la demande incluses dans abonnement
  test('RM-94 — formation Standard À la demande accessible sans surcoût si abonné', async () => {
    const headers = await auth(accounts.apprenantStd);

    const acces = await request(API_URL)
      .post(`/api/formations/${ids.demandeFormation}/acceder`)
      .set(headers)
      .send({});

    expect([200, 201]).toContain(acces.status);
    expect(acces.body.data?.source_financement || acces.body.source_financement).toBe('ABONNEMENT');
  });

  // RM-95 : formations Premium À la demande payantes (même pour abonnés)
  test('RM-95 — formation Premium À la demande nécessite paiement même si abonné', async () => {
    const premiumDemande = await prisma.formation.findFirst({
      where: {
        type_formation: 'PREMIUM',
        mode_formation: 'A_LA_DEMANDE',
        statut: 'ACTIVE'
      }
    });

    if (!premiumDemande) {
      console.log('Aucune formation Premium À la demande trouvée pour RM-95');
      return;
    }

    const headers = await auth(accounts.apprenantStd);

    const res = await request(API_URL)
      .post(`/api/formations/${premiumDemande.id}/acceder`)
      .set(headers)
      .send({});

    // Devrait nécessiter un paiement (402 ou redirection vers paiement)
    expect([402, 403]).toContain(res.status);
  });

  // RM-96 : formation À la demande ne peut PAS avoir de session planifiée
  test('RM-96 — création session bloquée pour formation mode=A_LA_DEMANDE', async () => {
    const headers = await auth(accounts.responsable);

    const formationDemande = await prisma.formation.findFirst({
      where: { mode_formation: 'A_LA_DEMANDE', statut: 'ACTIVE' }
    });

    if (!formationDemande) {
      console.log('Aucune formation À la demande trouvée pour RM-96');
      return;
    }

    const sessionRes = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(headers)
      .send({
        formation_id: formationDemande.id,
        capacite: 20,
        date_ouverture: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        date_cloture: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        date_debut: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        date_fin: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect([400, 409]).toContain(sessionRes.status);
    expect(sessionRes.body.error).toMatch(/A_LA_DEMANDE|MODE_FORMATION|VALIDATION_ERROR|SESSION_IMPOSSIBLE/i);
  });
});
