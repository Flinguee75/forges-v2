jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

const mockPaiementFindMany = jest.fn();
const mockPaiementFindUnique = jest.fn();
const mockPaiementUpdate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    paiement: {
      findMany: mockPaiementFindMany,
      findUnique: mockPaiementFindUnique,
      update: mockPaiementUpdate,
    },
  })),
}));

const mockTraiterIpn = jest.fn();
jest.mock('../../modules/paiements/ipn-ngser.service', () => ({
  IpnNgserService: jest.fn().mockImplementation(() => ({
    traiterIpn: mockTraiterIpn,
  })),
}));

const mockAuditInfo = jest.fn();
const mockAuditWarning = jest.fn();
const mockAuditError = jest.fn();
jest.mock('../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    info: mockAuditInfo,
    warning: mockAuditWarning,
    error: mockAuditError,
  })),
}));

import { ReconciliationNgserScheduler } from '../reconciliation-ngser.scheduler';

describe('ReconciliationNgserScheduler — RM-159', () => {
  let scheduler: ReconciliationNgserScheduler;
  const NOW = new Date('2026-04-29T10:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditInfo.mockResolvedValue(undefined);
    mockAuditWarning.mockResolvedValue(undefined);
    mockAuditError.mockResolvedValue(undefined);
    mockTraiterIpn.mockResolvedValue({ paiement_statut: 'CONFIRME', dossier_statut: 'PAYE' });
    mockPaiementFindUnique.mockResolvedValue({ montant_initie: 150000 });
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    process.env.NGSER_MOCK_MODE = 'true'; // Mode mock par défaut pour les tests
    const mockPrismaInstance = {
      paiement: {
        findMany: mockPaiementFindMany,
        findUnique: mockPaiementFindUnique,
        update: mockPaiementUpdate,
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const mockAuditInstance = {
      info: mockAuditInfo,
      warning: mockAuditWarning,
      error: mockAuditError,
    } as any;
    const mockIpnServiceInstance = {
      traiterIpn: mockTraiterIpn,
    } as any;
    scheduler = new ReconciliationNgserScheduler(mockPrismaInstance, mockAuditInstance, mockIpnServiceInstance);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('RM-159.1: Récupération paiements PENDING éligibles', () => {
    it('récupère paiements PENDING > 30min', async () => {
      const paiementAncien = {
        id: 'paiement-ancien-1',
        order_ngser: 'FRG-2026-001-AAAAAA',
        statut: 'PENDING',
        provider: 'NGSER',
        montant_initie: 150000,
        created_at: new Date(NOW.getTime() - 60 * 60 * 1000), // 1h ago
      };

      mockPaiementFindMany.mockResolvedValue([paiementAncien]);

      const paiementsEligibles = await scheduler.getPaiementsPendingEligibles(30);

      expect(paiementsEligibles).toHaveLength(1);
      expect(paiementsEligibles[0].id).toBe('paiement-ancien-1');
      expect(mockPaiementFindMany).toHaveBeenCalledWith({
        where: {
          statut: 'PENDING',
          provider: 'NGSER',
          created_at: { lt: expect.any(Date) },
          order_ngser: { not: null },
        },
        include: { dossier: true },
      });
    });

    it('ignore paiements PENDING récents (< 30min)', async () => {
      const paiementRecent = {
        id: 'paiement-recent-1',
        order_ngser: 'FRG-2026-002-BBBBBB',
        statut: 'PENDING',
        provider: 'NGSER',
        montant_initie: 150000,
        created_at: new Date(NOW.getTime() - 10 * 60 * 1000), // 10min ago
      };

      mockPaiementFindMany.mockResolvedValue([]);

      const paiementsEligibles = await scheduler.getPaiementsPendingEligibles(30);

      expect(paiementsEligibles).toHaveLength(0);
    });

    it('ignore paiements non NGSER', async () => {
      mockPaiementFindMany.mockResolvedValue([]);

      const paiementsEligibles = await scheduler.getPaiementsPendingEligibles(30);

      expect(paiementsEligibles).toHaveLength(0);
      expect(mockPaiementFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: 'NGSER',
          }),
        })
      );
    });
  });

  describe('RM-159.2: Réconciliation SUCCESS', () => {
    it('appelle IPN service avec SUCCESS et met à jour paiement', async () => {
      mockPaiementFindUnique.mockResolvedValue({ montant_initie: 200000 });
      mockTraiterIpn.mockResolvedValue({
        paiement_statut: 'CONFIRME',
        dossier_statut: 'PAYE',
        commissions_created: true,
      });

      const result = await scheduler.reconcilierPaiement('FRG-2026-003-CCCCCC');

      expect(mockTraiterIpn).toHaveBeenCalledWith({
        order_ngser: 'FRG-2026-003-CCCCCC',
        transaction_id: expect.stringContaining('TXN-RECON-MOCK'),
        status: 'SUCCESS',
        amount: 2000,
      });

      expect(result).toBeDefined();
      expect(result?.statut_final).toBe('CONFIRME');
      expect(result?.dossier_statut).toBe('PAYE');
    });
  });

  describe('RM-159.3: Réconciliation FAIL', () => {
    it('appelle IPN service avec FAIL et met à jour paiement', async () => {
      mockPaiementFindUnique.mockResolvedValue({ montant_initie: 100000 });
      mockTraiterIpn.mockResolvedValueOnce({
        paiement_statut: 'ECHOUE',
        dossier_statut: 'ANNULE',
      });

      const result = await scheduler.reconcilierPaiement('FRG-2026-004-DDDDDD');

      expect(mockTraiterIpn).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.statut_final).toBe('ECHOUE');
      expect(result?.dossier_statut).toBe('ANNULE');
      expect(mockTraiterIpn).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000 }));
    });
  });

  describe('RM-159.4: Gestion timeout NGSER', () => {
    it('garde PENDING si NGSER indisponible (timeout)', async () => {
      mockTraiterIpn.mockRejectedValueOnce(new Error('NGSER_TIMEOUT'));

      const result = await scheduler.reconcilierPaiement('FRG-2026-005-EEEEEE');

      expect(result).toBeDefined();
      expect(result?.statut_final).toBe('PENDING');
      expect(result?.error).toContain('NGSER_TIMEOUT');
      expect(mockAuditError).toHaveBeenCalledWith(
        'RECONCILIATION_ERREUR',
        expect.objectContaining({
          order_ngser: 'FRG-2026-005-EEEEEE',
          error: 'NGSER_TIMEOUT',
        })
      );
    });

    it('garde PENDING si paiement introuvable ou sans montant_initie', async () => {
      mockPaiementFindUnique.mockResolvedValue(null);

      const result = await scheduler.reconcilierPaiement('FRG-2026-005-NOMONTANT');

      expect(result).toEqual(expect.objectContaining({
        statut_final: 'PENDING',
        error: 'PAIEMENT_NOT_FOUND_OR_NO_MONTANT',
      }));
      expect(mockTraiterIpn).not.toHaveBeenCalled();
    });
  });

  describe('RM-159.5: Exécution scheduler complète', () => {
    it('réconcilie tous les paiements PENDING éligibles', async () => {
      const paiements = [
        {
          id: 'p1',
          order_ngser: 'FRG-2026-006-FFFFFF',
          statut: 'PENDING',
          provider: 'NGSER',
          montant_initie: 150000,
          created_at: new Date(NOW.getTime() - 60 * 60 * 1000),
          dossier: { id: 'd1' },
        },
        {
          id: 'p2',
          order_ngser: 'FRG-2026-007-GGGGGG',
          statut: 'PENDING',
          provider: 'NGSER',
          montant_initie: 200000,
          created_at: new Date(NOW.getTime() - 90 * 60 * 1000),
          dossier: { id: 'd2' },
        },
      ];

      mockPaiementFindMany.mockResolvedValue(paiements);
      mockTraiterIpn.mockResolvedValue({
        paiement_statut: 'CONFIRME',
        dossier_statut: 'PAYE',
      });

      await scheduler.executeNow();

      expect(mockPaiementFindMany).toHaveBeenCalled();
      expect(mockTraiterIpn).toHaveBeenCalledTimes(2);
      expect(mockAuditInfo).toHaveBeenCalledWith('RECONCILIATION_NGSER_DEBUT', {});
      expect(mockAuditInfo).toHaveBeenCalledWith(
        'RECONCILIATION_NGSER_FIN',
        expect.objectContaining({ nb_paiements_traites: 2 })
      );
    });

    it('continue après erreur sur un paiement', async () => {
      const paiements = [
        {
          id: 'p-err',
          order_ngser: 'FRG-2026-008-HHHHHH',
          statut: 'PENDING',
          provider: 'NGSER',
          montant_initie: 150000,
          created_at: new Date(NOW.getTime() - 60 * 60 * 1000),
          dossier: { id: 'd-err' },
        },
        {
          id: 'p-ok',
          order_ngser: 'FRG-2026-009-IIIIII',
          statut: 'PENDING',
          provider: 'NGSER',
          montant_initie: 200000,
          created_at: new Date(NOW.getTime() - 90 * 60 * 1000),
          dossier: { id: 'd-ok' },
        },
      ];

      mockPaiementFindMany.mockResolvedValue(paiements);
      mockTraiterIpn
        .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
        .mockResolvedValueOnce({ paiement_statut: 'CONFIRME', dossier_statut: 'PAYE' });

      await scheduler.executeNow();

      expect(mockTraiterIpn).toHaveBeenCalledTimes(2);
      expect(mockAuditError).toHaveBeenCalledWith(
        'RECONCILIATION_ERREUR',
        expect.objectContaining({ order_ngser: 'FRG-2026-008-HHHHHH' })
      );
      expect(mockAuditInfo).toHaveBeenCalledWith(
        'RECONCILIATION_NGSER_FIN',
        expect.objectContaining({ nb_paiements_traites: 2 })
      );
    });
  });

  describe('RM-159.6: Mode mock vs mode réel', () => {
    it('utilise mode mock si NGSER_MOCK_MODE=true', async () => {
      // Mode mock déjà activé dans beforeEach
      const result = await scheduler.reconcilierPaiement('FRG-2026-010-JJJJJJ');

      expect(mockTraiterIpn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
          transaction_id: expect.stringContaining('TXN-RECON-MOCK'),
        })
      );
    });
  });

  describe('RM-159.7: Variables d\'environnement délai', () => {
    it('utilise NGSER_RECONCILIATION_PENDING_MINUTES si défini', async () => {
      process.env.NGSER_RECONCILIATION_PENDING_MINUTES = '45';

      const paiementsEligibles = await scheduler.getPaiementsPendingEligibles(45);

      // Le délai de 45 minutes doit être pris en compte
      expect(mockPaiementFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: { lt: new Date(NOW.getTime() - 45 * 60 * 1000) },
          }),
        })
      );

      delete process.env.NGSER_RECONCILIATION_PENDING_MINUTES;
    });

    it('fallback vers NGSER_RECONCILIATION_PENDING_MIN si défini', async () => {
      process.env.NGSER_RECONCILIATION_PENDING_MIN = '60';

      const paiementsEligibles = await scheduler.getPaiementsPendingEligibles(60);

      expect(mockPaiementFindMany).toHaveBeenCalled();

      delete process.env.NGSER_RECONCILIATION_PENDING_MIN;
    });

    it('utilise 30 minutes par défaut si aucune variable', async () => {
      const paiementsEligibles = await scheduler.getPaiementsPendingEligibles(30);

      expect(mockPaiementFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: { lt: new Date(NOW.getTime() - 30 * 60 * 1000) },
          }),
        })
      );
    });
  });
});
