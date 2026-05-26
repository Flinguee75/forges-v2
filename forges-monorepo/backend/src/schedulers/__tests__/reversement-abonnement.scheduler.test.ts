jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

const mockFormationPartenaireFindMany = jest.fn();
const mockCommissionAbonnementFindFirst = jest.fn();
const mockCommissionAbonnementCreate = jest.fn();
const mockAccesFormationCount = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    formationPartenaire: { findMany: mockFormationPartenaireFindMany },
    commissionPartenaireAbonnement: {
      findFirst: mockCommissionAbonnementFindFirst,
      create: mockCommissionAbonnementCreate,
    },
    accesFormationDemande: { count: mockAccesFormationCount },
  })),
}));

const mockAuditInfo = jest.fn();
const mockAuditError = jest.fn();
jest.mock('../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    info: mockAuditInfo,
    error: mockAuditError,
  })),
}));

import { ReversementAbonnementScheduler } from '../reversement-abonnement.scheduler';

describe('ReversementAbonnementScheduler', () => {
  let scheduler: ReversementAbonnementScheduler;
  // 2026-06-01 → mois précédent = 2026-05
  const NOW = new Date('2026-06-01T07:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    mockCommissionAbonnementFindFirst.mockResolvedValue(null); // pas de doublon
    mockCommissionAbonnementCreate.mockResolvedValue({});
    mockAuditInfo.mockResolvedValue(undefined);
    mockAuditError.mockResolvedValue(undefined);
    const mockPrismaInstance = {
      formationPartenaire: { findMany: mockFormationPartenaireFindMany },
      commissionPartenaireAbonnement: {
        findFirst: mockCommissionAbonnementFindFirst,
        create: mockCommissionAbonnementCreate,
      },
      accesFormationDemande: { count: mockAccesFormationCount },
    } as any;
    const mockAuditInstance = {
      info: mockAuditInfo,
      error: mockAuditError,
    } as any;
    scheduler = new ReversementAbonnementScheduler(mockPrismaInstance, mockAuditInstance);
  });

  it('calcule correctement le reversement selon RM-132 (formule × ÷)', async () => {
    mockFormationPartenaireFindMany.mockResolvedValue([
      {
        id: 'fp-1',
        formation_id: 'f-1',
        partenaire_id: 'p-1',
        prix_coutant_valide: 600000, // 6 000 XOF en centimes
        duree_mois: 3,
      },
    ]);
    mockAccesFormationCount.mockResolvedValue(10);

    await scheduler.executeNow(NOW);

    // reversement = 10 × 600000 / 3 = 2 000 000
    expect(mockCommissionAbonnementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partenaire_id: 'p-1',
        formation_id: 'fp-1',
        nb_apprenants_actifs: 10,
        montant_reverse: 2000000,
        mois_reference: '2026-05',
        statut: 'EN_ATTENTE',
      }),
    });
    expect(mockAuditInfo).toHaveBeenCalledWith(
      'COMMISSION_ABONNEMENT_CALCULEE',
      expect.objectContaining({ formation_partenaire_id: 'fp-1' })
    );
  });

  it('skip si nb_apprenants_actifs === 0', async () => {
    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-x', formation_id: 'f-x', partenaire_id: 'p-1', prix_coutant_valide: 500000, duree_mois: 2 },
    ]);
    mockAccesFormationCount.mockResolvedValue(0);

    await scheduler.executeNow(NOW);

    expect(mockCommissionAbonnementCreate).not.toHaveBeenCalled();
  });

  it('fallback duree_mois=1 si null ou 0', async () => {
    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-null', formation_id: 'f-n', partenaire_id: 'p-1', prix_coutant_valide: 300000, duree_mois: null },
    ]);
    mockAccesFormationCount.mockResolvedValue(5);

    await scheduler.executeNow(NOW);

    // reversement = 5 × 300000 / 1 = 1 500 000
    expect(mockCommissionAbonnementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ montant_reverse: 1500000 }),
    });
  });

  it('idempotence : skip si déjà calculé pour le même mois', async () => {
    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-dup', formation_id: 'f-d', partenaire_id: 'p-1', prix_coutant_valide: 400000, duree_mois: 1 },
    ]);
    mockCommissionAbonnementFindFirst.mockResolvedValue({ id: 'existing', mois_reference: '2026-05' });

    await scheduler.executeNow(NOW);

    expect(mockAccesFormationCount).not.toHaveBeenCalled();
    expect(mockCommissionAbonnementCreate).not.toHaveBeenCalled();
  });

  it('calcule le bon mois_reference (mois précédent)', async () => {
    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-m', formation_id: 'f-m', partenaire_id: 'p-1', prix_coutant_valide: 100000, duree_mois: 1 },
    ]);
    mockAccesFormationCount.mockResolvedValue(3);

    // Exécution le 1er janvier 2027 → mois précédent = 2026-12
    await scheduler.executeNow(new Date('2027-01-01T07:00:00Z'));

    expect(mockCommissionAbonnementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ mois_reference: '2026-12' }),
    });
  });

  it('gère plusieurs formations en isolation (continue après erreur)', async () => {
    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-err', formation_id: 'f-e', partenaire_id: 'p-1', prix_coutant_valide: 100000, duree_mois: 1 },
      { id: 'fp-ok', formation_id: 'f-o', partenaire_id: 'p-2', prix_coutant_valide: 200000, duree_mois: 1 },
    ]);
    mockAccesFormationCount.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    mockCommissionAbonnementCreate.mockRejectedValueOnce(new Error('DB_ERROR')).mockResolvedValueOnce({});

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await scheduler.executeNow(NOW);

    expect(mockCommissionAbonnementCreate).toHaveBeenCalledTimes(2);
    expect(mockAuditError).toHaveBeenCalledWith(
      'COMMISSION_ABONNEMENT_ERROR',
      expect.objectContaining({ formation_partenaire_id: 'fp-err' })
    );
    consoleSpy.mockRestore();
  });

  it('skip si aucune formation incluse dans abonnement', async () => {
    mockFormationPartenaireFindMany.mockResolvedValue([]);

    await scheduler.executeNow(NOW);

    expect(mockAccesFormationCount).not.toHaveBeenCalled();
    expect(mockCommissionAbonnementCreate).not.toHaveBeenCalled();
  });
});
