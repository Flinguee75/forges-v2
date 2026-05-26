import { CommissionService } from '../commission.service';

describe('CommissionService — constructeur', () => {
  it('stocke prisma et audit comme champs privés utilisables', () => {
    const mockPrisma = {} as any;
    const mockAudit = {} as any;
    const service = new CommissionService(mockPrisma, mockAudit);
    expect(service).toBeDefined();
    // Les paramètres doivent être stockés — vérifier via accès aux champs privés castés
    expect((service as any).prisma).toBe(mockPrisma);
    expect((service as any).audit).toBe(mockAudit);
  });

  it('getMoisFacturation retourne YYYY-MM du mois courant', () => {
    const service = new CommissionService({} as any);
    const mois = (service as any).getMoisFacturation();
    expect(mois).toMatch(/^\d{4}-\d{2}$/);
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(mois).toBe(expected);
  });
});

describe('CommissionService', () => {
  const audit = {
    info: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
  };

  function createTx(overrides: Record<string, any> = {}) {
    return {
      commissionPartenaire: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (data) => ({ id: 'cp-01', ...data.data })),
      },
      commissionApporteur: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (data) => ({ id: 'ca-01', ...data.data })),
      },
      apporteur: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      formationPartenaire: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      partenaire: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DEFAULT_COMMISSION_APPORTEUR_PCT;
    delete process.env.COMMISSION_APPORTEUR_DEFAULT_PCT;
    delete process.env.DEFAULT_COMMISSION_FORGES_PCT;
    delete process.env.COMMISSION_FORGES_DEFAULT_PCT;
  });

  it('cree une commission apporteur depuis Dossier.code_apporteur', async () => {
    const tx = createTx({
      apporteur: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'apporteur-01',
          code_apporteur: 'code-apporteur-01',
          taux_commission_pct: 7,
        }),
      },
    });
    const service = new CommissionService({} as any, audit as any);

    const result = await service.creerCommissionsApresSuccessPayment(
      { id: 'paiement-01', montant_catalogue: 100000, montant_final: 100000 },
      { id: 'dossier-01', code_apporteur: 'code-apporteur-01' },
      { id: 'formation-01', partenaire_id: null },
      tx as any
    );

    expect(tx.apporteur.findFirst).toHaveBeenCalledWith({
      where: { code_apporteur: 'code-apporteur-01' },
    });
    expect(tx.commissionApporteur.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        apporteur_id: 'apporteur-01',
        paiement_id: 'paiement-01',
        dossier_id: 'dossier-01',
        montant_base: 100000,
        taux_commission_pct: 7,
        montant_commission: 7000,
        statut: 'EN_ATTENTE',
      }),
    });
    expect(result.apporteur?.montant_commission).toBe(7000);
  });

  it('reverse le prix coutant formation quand il est disponible', async () => {
    const tx = createTx();
    const service = new CommissionService({} as any, audit as any);

    const result = await service.creerCommissionsApresSuccessPayment(
      { id: 'paiement-02', montant_catalogue: 100000, montant_final: 100000 },
      { id: 'dossier-02' },
      { id: 'formation-02', partenaire_id: 'partenaire-01', prix_coutant: 80000 },
      tx as any
    );

    expect(tx.commissionPartenaire.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paiement_id: 'paiement-02',
        partenaire_id: 'partenaire-01',
        formation_id: 'formation-02',
        montant_catalogue: 100000,
        commission_forges_pct: 20,
        montant_reverse: 80000,
      }),
    });
    expect(result.partenaire?.montant_reverse).toBe(80000);
  });

  it('ne cree pas de doublon de commission partenaire si le paiement a deja ete traite', async () => {
    const commissionExistante = {
      id: 'cp-existante',
      paiement_id: 'paiement-duplicate',
      partenaire_id: 'partenaire-01',
      formation_id: 'formation-01',
      montant_reverse: 80000,
      statut: 'EN_ATTENTE',
    };
    const tx = createTx({
      commissionPartenaire: {
        findUnique: jest.fn().mockResolvedValue(commissionExistante),
        create: jest.fn(),
      },
    });
    const service = new CommissionService({} as any, audit as any);

    const result = await service.creerCommissionsApresSuccessPayment(
      { id: 'paiement-duplicate', montant_catalogue: 100000, montant_final: 100000 },
      { id: 'dossier-duplicate' },
      { id: 'formation-01', partenaire_id: 'partenaire-01', prix_coutant: 80000 },
      tx as any
    );

    expect(tx.commissionPartenaire.findUnique).toHaveBeenCalledWith({
      where: { paiement_id: 'paiement-duplicate' },
    });
    expect(tx.commissionPartenaire.create).not.toHaveBeenCalled();
    expect(result.partenaire).toBe(commissionExistante);
  });

  it('ne reverse jamais plus que le montant catalogue encaisse', async () => {
    const tx = createTx();
    const service = new CommissionService({} as any, audit as any);

    await service.creerCommissionsApresSuccessPayment(
      { id: 'paiement-04', montant_catalogue: 100000, montant_final: 100000 },
      { id: 'dossier-04' },
      { id: 'formation-04', partenaire_id: 'partenaire-04', prix_coutant: 120000 },
      tx as any
    );

    expect(tx.commissionPartenaire.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        montant_catalogue: 100000,
        montant_reverse: 100000,
        commission_forges_pct: 0,
      }),
    });
  });

  it('reverse le prix coutant valide de FormationPartenaire si Formation.prix_coutant est absent', async () => {
    const tx = createTx({
      formationPartenaire: {
        findUnique: jest.fn().mockResolvedValue({
          prix_coutant_valide: 85000,
          partenaire: { commission_forges_pct: 15 },
        }),
      },
    });
    const service = new CommissionService({} as any, audit as any);

    await service.creerCommissionsApresSuccessPayment(
      { id: 'paiement-03', montant_catalogue: 100000, montant_final: 100000 },
      { id: 'dossier-03' },
      { id: 'formation-03', partenaire_id: 'partenaire-03' },
      tx as any
    );

    expect(tx.formationPartenaire.findUnique).toHaveBeenCalledWith({
      where: { formation_id: 'formation-03' },
      include: { partenaire: true },
    });
    expect(tx.commissionPartenaire.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        commission_forges_pct: 15,
        montant_reverse: 85000,
      }),
    });
  });
});

describe('resolveApporteur — lookup par code string uniquement', () => {
  const audit = {
    info: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
  };

  function createTx(overrides: Record<string, any> = {}) {
    return {
      commissionPartenaire: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (data: any) => ({ id: 'cp-01', ...data.data })),
      },
      commissionApporteur: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (data: any) => ({ id: 'ca-01', ...data.data })),
      },
      apporteur: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      formationPartenaire: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      partenaire: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      ...overrides,
    };
  }

  it('retourne null si dossier.code_apporteur est absent', async () => {
    const tx = createTx();
    const service = new CommissionService({} as any, audit as any);
    const result = await (service as any).resolveApporteur({ code_apporteur: undefined }, tx, []);
    expect(result).toBeNull();
    expect(tx.apporteur.findFirst).not.toHaveBeenCalled();
  });

  it('retourne l apporteur trouvé par code string (chemin réel)', async () => {
    const apporteur = { id: 'apporteur-uuid', taux_commission_pct: 5 };
    const tx = createTx({
      apporteur: { findFirst: jest.fn().mockResolvedValue(apporteur) },
    });
    const service = new CommissionService({} as any, audit as any);
    const result = await (service as any).resolveApporteur(
      { code_apporteur: 'CODE-APPORTEUR-UUID' },
      tx,
      []
    );
    expect(tx.apporteur.findFirst).toHaveBeenCalledWith({
      where: { code_apporteur: 'CODE-APPORTEUR-UUID' },
    });
    expect(result).toEqual(apporteur);
  });

  it('retourne null et ajoute un auditEvent si code_apporteur inconnu', async () => {
    const tx = createTx({
      apporteur: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new CommissionService({} as any, audit as any);
    const auditEvents: any[] = [];
    const result = await (service as any).resolveApporteur(
      { code_apporteur: 'CODE-INCONNU' },
      tx,
      auditEvents
    );
    expect(result).toBeNull();
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0].action).toBe('COMMISSION_APPORTEUR_CODE_INTROUVABLE');
  });
});
