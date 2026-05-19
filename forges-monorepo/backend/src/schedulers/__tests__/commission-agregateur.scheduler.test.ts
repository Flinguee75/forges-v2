jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn();
const mockAggregate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    commissionApporteur: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
      aggregate: mockAggregate,
    },
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

import { CommissionAgregateurScheduler } from '../commission-agregateur.scheduler';

// Exécution le 1er du mois : le mois écoulé est le mois précédent
const NOW = new Date('2026-06-01T07:00:00Z');

// Données partagées
const apporteurFixture = {
  id: 'apporteur-1',
  email: 'apporteur@test.ci',
};

const commissionFixture = {
  id: 'comm-1',
  apporteur_id: 'apporteur-1',
  montant_commission_xof: 300000,
  statut: 'EN_ATTENTE',
  apporteur: apporteurFixture,
};

describe('CommissionAgregateurScheduler', () => {
  let scheduler: CommissionAgregateurScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF;
    mockAuditInfo.mockResolvedValue(undefined);
    mockAuditError.mockResolvedValue(undefined);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    scheduler = new CommissionAgregateurScheduler();
  });

  // -----------------------------------------------------------------------
  // Bug 1 — Seuil de reversement (RM-147)
  // -----------------------------------------------------------------------

  describe('Bug 1 — seuil de reversement par defaut (RM-147)', () => {
    it('seuil par defaut est 5000 XOF quand SEUIL_REVERSEMENT_APPORTEUR_XOF non defini — cumul < seuil reste VALIDEE', async () => {
      // cumul = 4999 XOF < 5000 XOF → pas de reversement
      mockFindMany.mockResolvedValue([commissionFixture]);
      mockAggregate.mockResolvedValue({ _sum: { montant_commission_xof: 4999 } });

      await scheduler.executeNow(NOW);

      // updateMany appelé pour passer EN_ATTENTE → VALIDEE
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statut: 'VALIDEE' }) })
      );

      // Aucun second updateMany avec statut REVERSEE
      const reverseeCall = mockUpdateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data?: { statut?: string } })?.data?.statut === 'REVERSEE'
      );
      expect(reverseeCall).toBeUndefined();
    });

    it('reversement declenche si cumul >= 5000 XOF', async () => {
      // cumul = 5000 XOF = seuil exact → reversement attendu
      mockFindMany.mockResolvedValue([commissionFixture]);
      mockAggregate.mockResolvedValue({ _sum: { montant_commission_xof: 5000 } });

      await scheduler.executeNow(NOW);

      const reverseeCall = mockUpdateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data?: { statut?: string } })?.data?.statut === 'REVERSEE'
      );
      expect(reverseeCall).toBeDefined();

      // Audit COMMISSIONS_REVERSEES_APPORTEUR déclenché
      expect(mockAuditInfo).toHaveBeenCalledWith(
        'COMMISSIONS_REVERSEES_APPORTEUR',
        expect.objectContaining({ apporteur_id: 'apporteur-1', montant_reverse_xof: 5000 })
      );
    });

    it('report au mois suivant si cumul < seuil avec audit REPORTE', async () => {
      mockFindMany.mockResolvedValue([commissionFixture]);
      mockAggregate.mockResolvedValue({ _sum: { montant_commission_xof: 3000 } });

      await scheduler.executeNow(NOW);

      expect(mockAuditInfo).toHaveBeenCalledWith(
        'COMMISSIONS_AGREGEES_RAPPORT_REPORTE',
        expect.objectContaining({ apporteur_id: 'apporteur-1' })
      );
    });

    it('respecte SEUIL_REVERSEMENT_APPORTEUR_XOF defini via env', async () => {
      process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF = '1000';
      mockFindMany.mockResolvedValue([commissionFixture]);
      // cumul = 1000 XOF = seuil exact → reversement
      mockAggregate.mockResolvedValue({ _sum: { montant_commission_xof: 1000 } });

      const schedulerWithEnv = new CommissionAgregateurScheduler();
      await schedulerWithEnv.executeNow(NOW);

      const reverseeCall = mockUpdateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data?: { statut?: string } })?.data?.statut === 'REVERSEE'
      );
      expect(reverseeCall).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Bug 2 — Champ de date dans le filtre (RM-146)
  // -----------------------------------------------------------------------

  describe('Bug 2 — filtre date sur les commissions EN_ATTENTE (RM-146)', () => {
    it('scheduler filtre les commissions EN_ATTENTE du mois ecoule avec date_generation', async () => {
      mockFindMany.mockResolvedValue([]);

      await scheduler.executeNow(NOW);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            statut: 'EN_ATTENTE',
            date_generation: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('la periode filtree correspond au mois ecoule complet', async () => {
      mockFindMany.mockResolvedValue([]);

      // NOW = 2026-06-01 → mois ecoule = 2026-05 (mai)
      await scheduler.executeNow(NOW);

      const args = mockFindMany.mock.calls[0][0];
      const gte: Date = args.where.date_generation.gte;
      const lte: Date = args.where.date_generation.lte;

      // Premier jour = 1er mai 2026
      expect(gte.getFullYear()).toBe(2026);
      expect(gte.getMonth()).toBe(4); // mois = 4 = mai (0-indexe)
      expect(gte.getDate()).toBe(1);

      // Dernier jour = 31 mai 2026 23:59:59
      expect(lte.getFullYear()).toBe(2026);
      expect(lte.getMonth()).toBe(4);
      expect(lte.getDate()).toBe(31);
    });

    it('updateMany utilise aussi date_generation pour la transition EN_ATTENTE vers VALIDEE', async () => {
      mockFindMany.mockResolvedValue([commissionFixture]);
      mockAggregate.mockResolvedValue({ _sum: { montant_commission_xof: 100 } });

      await scheduler.executeNow(NOW);

      const valideeCall = mockUpdateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { where?: { statut?: string } })?.where?.statut === 'EN_ATTENTE'
      );
      expect(valideeCall).toBeDefined();
      const whereClause = (valideeCall![0] as { where: Record<string, unknown> }).where;
      expect(whereClause).toHaveProperty('date_generation');
    });

    it('retourne sans erreur si aucune commission EN_ATTENTE trouvee', async () => {
      mockFindMany.mockResolvedValue([]);

      await expect(scheduler.executeNow(NOW)).resolves.not.toThrow();

      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockAuditInfo).toHaveBeenCalledWith(
        'COMMISSIONS_AGREGATION_VIDE',
        expect.objectContaining({ nb_commissions: 0 })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Comportements transversaux
  // -----------------------------------------------------------------------

  describe('comportements transversaux', () => {
    it('calcule le bon mois_facturation (mois precedent)', async () => {
      mockFindMany.mockResolvedValue([commissionFixture]);
      mockAggregate.mockResolvedValue({ _sum: { montant_commission_xof: 100 } });

      // Janvier 2027 → mois precedent = 2026-12
      await scheduler.executeNow(new Date('2027-01-01T07:00:00Z'));

      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mois_facturation: '2026-12' }),
        })
      );
    });

    it('traite plusieurs apporteurs independamment', async () => {
      const comm2 = { ...commissionFixture, id: 'comm-2', apporteur_id: 'apporteur-2', apporteur: { id: 'apporteur-2', email: 'ap2@test.ci' } };
      mockFindMany.mockResolvedValue([commissionFixture, comm2]);
      // chaque aggregate retourne un cumul sous le seuil
      mockAggregate.mockResolvedValue({ _sum: { montant_commission_xof: 100 } });

      await scheduler.executeNow(NOW);

      // audit REPORTE appele pour chaque apporteur
      expect(mockAuditInfo).toHaveBeenCalledWith('COMMISSIONS_AGREGEES_RAPPORT_REPORTE', expect.objectContaining({ apporteur_id: 'apporteur-1' }));
      expect(mockAuditInfo).toHaveBeenCalledWith('COMMISSIONS_AGREGEES_RAPPORT_REPORTE', expect.objectContaining({ apporteur_id: 'apporteur-2' }));
    });

    it('gere les erreurs par apporteur sans stopper les autres', async () => {
      const comm2 = { ...commissionFixture, id: 'comm-2', apporteur_id: 'apporteur-2', apporteur: { id: 'apporteur-2', email: 'ap2@test.ci' } };
      mockFindMany.mockResolvedValue([commissionFixture, comm2]);
      // aggregate echoue pour le premier apporteur, OK pour le second
      mockAggregate
        .mockRejectedValueOnce(new Error('DB_AGGREGATE_ERROR'))
        .mockResolvedValueOnce({ _sum: { montant_commission_xof: 100 } });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      await expect(scheduler.executeNow(NOW)).resolves.not.toThrow();

      expect(mockAuditError).toHaveBeenCalledWith(
        'COMMISSION_AGREGATION_ERROR',
        expect.objectContaining({ apporteur_id: 'apporteur-1' })
      );
      consoleSpy.mockRestore();
    });
  });
});
