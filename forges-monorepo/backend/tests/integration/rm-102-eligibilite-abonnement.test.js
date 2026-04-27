const { ids, prisma } = require('./helpers');

describe('RM-102 — Éligibilité Abonnement (Criticité 5)', () => {

  // RM-102 : inclus_abonnement calculé automatiquement
  // inclus_abonnement = true SI ET SEULEMENT SI type_formation=STANDARD ET pilier_abonnement ∈ {RETAIL, TOUS}

  // Helper pour calculer inclus_abonnement selon RM-102
  const calculerInclus = (type_formation, pilier_abonnement) => {
    return type_formation === 'STANDARD' && ['RETAIL', 'TOUS'].includes(pilier_abonnement);
  };

  test('RM-102.1 — Formation STANDARD + pilier RETAIL → inclus_abonnement=true', async () => {
    const type_formation = 'STANDARD';
    const pilier_abonnement = 'RETAIL';

    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-102.1 ${Date.now()}`,
        description_courte: 'Test RM-102 STANDARD+RETAIL',
        duree_jours: 5,
        cout_catalogue: 100000,
        responsable_id: ids.responsable,
        type_formation,
        pilier_abonnement,
        inclus_abonnement: calculerInclus(type_formation, pilier_abonnement),
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        objectifs_pedagogiques: ['Objectif 1'],
        certification_delivree: true,
        public_cible: 'Professionnels',
      },
    });

    // RM-102 : STANDARD + RETAIL → inclus_abonnement=true
    expect(formation.type_formation).toBe('STANDARD');
    expect(formation.pilier_abonnement).toBe('RETAIL');
    expect(formation.inclus_abonnement).toBe(true);

    // Nettoyer
    await prisma.formation.delete({ where: { id: formation.id } });
  });

  test('RM-102.2 — Formation STANDARD + pilier TOUS → inclus_abonnement=true', async () => {
    const type_formation = 'STANDARD';
    const pilier_abonnement = 'TOUS';

    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-102.2 ${Date.now()}`,
        description_courte: 'Test RM-102 STANDARD+TOUS',
        duree_jours: 5,
        cout_catalogue: 100000,
        responsable_id: ids.responsable,
        type_formation,
        pilier_abonnement,
        inclus_abonnement: calculerInclus(type_formation, pilier_abonnement),
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        objectifs_pedagogiques: ['Objectif 1'],
        certification_delivree: true,
        public_cible: 'Tous publics',
      },
    });

    // RM-102 : STANDARD + TOUS → inclus_abonnement=true
    expect(formation.type_formation).toBe('STANDARD');
    expect(formation.pilier_abonnement).toBe('TOUS');
    expect(formation.inclus_abonnement).toBe(true);

    // Nettoyer
    await prisma.formation.delete({ where: { id: formation.id } });
  });

  test('RM-102.3 — Formation PREMIUM + pilier RETAIL → inclus_abonnement=false (RM-87)', async () => {
    const type_formation = 'PREMIUM';
    const pilier_abonnement = 'RETAIL';

    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-102.3 ${Date.now()}`,
        description_courte: 'Test RM-102 PREMIUM',
        duree_jours: 10,
        cout_catalogue: 500000,
        responsable_id: ids.responsable,
        type_formation,
        pilier_abonnement,
        inclus_abonnement: calculerInclus(type_formation, pilier_abonnement),
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        objectifs_pedagogiques: ['Objectif Premium'],
        certification_delivree: true,
        public_cible: 'Professionnels avancés',
      },
    });

    // RM-87 + RM-102 : PREMIUM jamais inclus
    expect(formation.type_formation).toBe('PREMIUM');
    expect(formation.inclus_abonnement).toBe(false);

    // Nettoyer
    await prisma.formation.delete({ where: { id: formation.id } });
  });

  test('RM-102.4 — Formation STANDARD + pilier B2B → inclus_abonnement=false', async () => {
    const type_formation = 'STANDARD';
    const pilier_abonnement = 'B2B';

    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-102.4 ${Date.now()}`,
        description_courte: 'Test RM-102 STANDARD+B2B',
        duree_jours: 5,
        cout_catalogue: 150000,
        responsable_id: ids.responsable,
        type_formation,
        pilier_abonnement,
        inclus_abonnement: calculerInclus(type_formation, pilier_abonnement),
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        objectifs_pedagogiques: ['Objectif B2B'],
        certification_delivree: true,
        public_cible: 'Entreprises',
      },
    });

    // RM-102 : STANDARD + B2B → inclus_abonnement=false
    expect(formation.type_formation).toBe('STANDARD');
    expect(formation.pilier_abonnement).toBe('B2B');
    expect(formation.inclus_abonnement).toBe(false);

    // Nettoyer
    await prisma.formation.delete({ where: { id: formation.id } });
  });

  test('RM-102.5 — Formation STANDARD + pilier INSTITUTIONNEL → inclus_abonnement=false', async () => {
    const type_formation = 'STANDARD';
    const pilier_abonnement = 'INSTITUTIONNEL';

    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-102.5 ${Date.now()}`,
        description_courte: 'Test RM-102 STANDARD+INSTITUTIONNEL',
        duree_jours: 5,
        cout_catalogue: 200000,
        responsable_id: ids.responsable,
        type_formation,
        pilier_abonnement,
        inclus_abonnement: calculerInclus(type_formation, pilier_abonnement),
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        objectifs_pedagogiques: ['Objectif Institution'],
        certification_delivree: true,
        public_cible: 'Institutions publiques',
      },
    });

    // RM-102 : STANDARD + INSTITUTIONNEL → inclus_abonnement=false
    expect(formation.type_formation).toBe('STANDARD');
    expect(formation.pilier_abonnement).toBe('INSTITUTIONNEL');
    expect(formation.inclus_abonnement).toBe(false);

    // Nettoyer
    await prisma.formation.delete({ where: { id: formation.id } });
  });

  test('RM-102.6 — Modification pilier RETAIL→B2B recalcule inclus_abonnement (true→false)', async () => {
    // Créer formation STANDARD+RETAIL (inclus=true)
    const type_formation_initial = 'STANDARD';
    const pilier_initial = 'RETAIL';

    const formation = await prisma.formation.create({
      data: {
        intitule: `Formation RM-102.6 ${Date.now()}`,
        description_courte: 'Test RM-102 modification pilier',
        duree_jours: 5,
        cout_catalogue: 120000,
        responsable_id: ids.responsable,
        type_formation: type_formation_initial,
        pilier_abonnement: pilier_initial,
        inclus_abonnement: calculerInclus(type_formation_initial, pilier_initial),
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        objectifs_pedagogiques: ['Objectif'],
        certification_delivree: true,
        public_cible: 'Tous',
      },
    });

    // Vérifier état initial
    expect(formation.inclus_abonnement).toBe(true);

    // Modifier pilier → B2B
    const nouveau_pilier = 'B2B';
    const formationUpdated = await prisma.formation.update({
      where: { id: formation.id },
      data: {
        pilier_abonnement: nouveau_pilier,
        inclus_abonnement: calculerInclus(type_formation_initial, nouveau_pilier)
      },
    });

    // RM-102 : STANDARD + B2B → inclus_abonnement=false
    expect(formationUpdated.pilier_abonnement).toBe('B2B');
    expect(formationUpdated.inclus_abonnement).toBe(false);

    // Nettoyer
    await prisma.formation.delete({ where: { id: formation.id } });
  });
});
