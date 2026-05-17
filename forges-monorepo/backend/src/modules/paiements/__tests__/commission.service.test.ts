import { CommissionService } from '../commission.service';

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
