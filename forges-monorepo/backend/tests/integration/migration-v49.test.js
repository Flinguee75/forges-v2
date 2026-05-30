const { ids, prisma } = require('./helpers');

describe('Migration v4.9 - schema DB', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('MIG-01: le modele Devis existe avec montants XOF entiers', async () => {
    await prisma.organisation.deleteMany({ where: { id: 'org-test-mig' } });
    await prisma.organisation.create({
      data: {
        id: 'org-test-mig',
        raison_sociale: 'Org Test MIG',
        type: 'ENTREPRISE',
        sous_types: [],
        contact_referent: 'Contact Test',
        pays: 'CI',
        email: `org-test-mig-${Date.now()}@forges.ci`,
        password_hash: 'hash',
      },
    });

    const devis = await prisma.devis.create({
      data: {
        numero_devis: `DEV-TEST-MIG-${Date.now()}`,
        organisation_id: 'org-test-mig',
        formation_id: 'F-E2E-STD-01',
        nb_places: 10,
        tarif_unitaire_xof: 100000,
        montant_total_xof: 1000000,
        statut: 'CREE',
        created_by: 'admin@forges.ci',
      },
    });

    expect(devis.id).toBeDefined();
    expect(devis.statut).toBe('CREE');
    expect(devis.tarif_unitaire_xof).toBe(100000);
    expect(devis.montant_total_xof).toBe(1000000);

    await prisma.devis.delete({ where: { id: devis.id } });
    await prisma.organisation.delete({ where: { id: 'org-test-mig' } });
  });

  test('MIG-02: enum StatutDevis contient CREE, PAYE, ANNULE', async () => {
    const result = await prisma.$queryRaw`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatutDevis')
      ORDER BY enumlabel;
    `;

    const labels = result.map((row) => row.enumlabel);
    expect(labels).toEqual(['ANNULE', 'CREE', 'PAYE']);
  });

  test('MIG-03: Paiement expose les champs NGSER requis', async () => {
    const result = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Paiement'
      AND column_name IN (
        'provider',
        'payment_token_ngser',
        'order_ngser',
        'montant_initie',
        'wallet_ngser',
        'code_ngser',
        'status_ngser',
        'ngser_payload_last',
        'reconciled_at'
      )
      ORDER BY column_name;
    `;

    const columns = result.map((row) => row.column_name);
    expect(columns).toEqual([
      'code_ngser',
      'montant_initie',
      'ngser_payload_last',
      'order_ngser',
      'payment_token_ngser',
      'provider',
      'reconciled_at',
      'status_ngser',
      'wallet_ngser',
    ]);
  });

  test('MIG-04: order_ngser a une contrainte unique', async () => {
    const dossier1 = `D-MIG-${Date.now()}-1`;
    const dossier2 = `D-MIG-${Date.now()}-2`;
    const order = `FRG-2026-999-${Date.now().toString(16).slice(-6).toUpperCase()}`;

    await prisma.dossier.createMany({
      data: [
        {
          id: dossier1,
          apprenant_id: 'app-e2e-01',
          formation_id: ids.standardFormation,
          session_id: ids.standardSession,
          statut: 'RETENU',
          source_financement: 'RETAIL',
        },
        {
          id: dossier2,
          apprenant_id: 'app-e2e-std-01',
          formation_id: ids.standardFormation,
          session_id: ids.standardSession,
          statut: 'RETENU',
          source_financement: 'RETAIL',
        },
      ],
    });

    await prisma.paiement.create({
      data: {
        dossier_id: dossier1,
        order_ngser: order,
        montant_catalogue: 100000,
        montant_final: 100000,
        methode: 'MOBILE_MONEY',
        statut: 'PENDING',
      },
    });

    await expect(
      prisma.paiement.create({
        data: {
          dossier_id: dossier2,
          order_ngser: order,
          montant_catalogue: 100000,
          montant_final: 100000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
        },
      })
    ).rejects.toThrow();

    await prisma.paiement.delete({ where: { dossier_id: dossier1 } });
    await prisma.dossier.deleteMany({ where: { id: { in: [dossier1, dossier2] } } });
  });

  test('MIG-05: commission_forges_pct partenaire a un defaut a 30', async () => {
    const partenaire = await prisma.partenaire.create({
      data: {
        raison_sociale: `Partenaire MIG ${Date.now()}`,
        type: 'AUTRE',
        pays: 'CI',
        email_principal: `partenaire-mig-${Date.now()}@forges.ci`,
        mode_inscription: 'AUTO_INSCRIPTION',
      },
    });

    expect(partenaire.commission_forges_pct).toBe(30);

    await prisma.partenaire.delete({ where: { id: partenaire.id } });
  });
});
