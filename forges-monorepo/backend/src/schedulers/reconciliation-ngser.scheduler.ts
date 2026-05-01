import * as cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../shared/prisma/prisma.client';
import { AuditLogger } from '../shared/audit/audit.logger';
import { IpnNgserService } from '../modules/paiements/ipn-ngser.service';
import { NgserClient } from '../modules/paiements/ngser.client';

export interface ReconciliationResult {
  statut_final?: string;
  dossier_statut?: string;
  order_ngser?: string;
  error?: string;
}

/**
 * ReconciliationNgserScheduler (RM-159)
 *
 * Déclencheur : Toutes les 30 minutes (cron: *\/30 * * * *)
 *
 * Logique :
 * 1. Chercher Paiement statut=PENDING, provider=NGSER, created_at < maintenant - délai (30min par défaut)
 * 2. Mode mock (J3-J5) : simule SUCCESS via IPN
 * 3. Mode réel (J6+) : appelle NGSER check status API, puis traite via IPN service
 * 4. AuditLog chaque exécution et erreur
 * 5. Continue après erreur sur un paiement individuel
 */
export class ReconciliationNgserScheduler {
  private prisma: PrismaClient;
  private audit: AuditLogger;
  private ipnService: IpnNgserService;
  private task: cron.ScheduledTask | null = null;
  private mockMode: boolean;

  constructor() {
    this.prisma = prisma;
    this.audit = new AuditLogger();
    this.ipnService = new IpnNgserService(this.prisma, this.audit);
    this.mockMode = process.env.NGSER_MOCK_MODE === 'true';
  }

  start(): void {
    this.task = cron.schedule('*/30 * * * *', async () => {
      console.log('[ReconciliationNgserScheduler] Exécution — Réconciliation paiements PENDING...');
      await this.reconcilierPaiementsPending();
    });
    console.log('[ReconciliationNgserScheduler] Démarré — cron: */30 * * * *');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[ReconciliationNgserScheduler] Arrêté');
    }
  }

  /**
   * Récupère les paiements PENDING éligibles pour réconciliation
   * (PENDING depuis plus de `delaiMinutes` minutes)
   */
  async getPaiementsPendingEligibles(delaiMinutes: number = 30) {
    const seuil = new Date(Date.now() - delaiMinutes * 60 * 1000);

    return await this.prisma.paiement.findMany({
      where: {
        statut: 'PENDING',
        provider: 'NGSER',
        created_at: { lt: seuil },
        order_ngser: { not: null },
      },
      include: { dossier: true },
    });
  }

  /**
   * Exécution de la réconciliation de tous les paiements PENDING éligibles
   */
  private async reconcilierPaiementsPending(): Promise<void> {
    try {
      await this.audit.info('RECONCILIATION_NGSER_DEBUT', {});

      const delaiMinutes =
        Number(process.env.NGSER_RECONCILIATION_PENDING_MINUTES) ||
        Number(process.env.NGSER_RECONCILIATION_PENDING_MIN) ||
        30;

      const paiements = await this.getPaiementsPendingEligibles(delaiMinutes);

      if (paiements.length === 0) {
        console.log('[ReconciliationNgserScheduler] Aucun paiement PENDING éligible');
        await this.audit.info('RECONCILIATION_NGSER_FIN', { nb_paiements_traites: 0 });
        return;
      }

      console.log(`[ReconciliationNgserScheduler] ${paiements.length} paiements PENDING à réconcilier`);

      for (const paiement of paiements) {
        try {
          await this.reconcilierPaiement(paiement.order_ngser!);
        } catch (error) {
          console.error(
            `[ReconciliationNgserScheduler] Erreur réconciliation ${paiement.order_ngser}:`,
            error
          );
          // Continue avec les autres paiements
        }
      }

      await this.audit.info('RECONCILIATION_NGSER_FIN', {
        nb_paiements_traites: paiements.length,
      });
    } catch (error) {
      console.error('[ReconciliationNgserScheduler] Erreur globale:', error);
      await this.audit.error('SCHEDULER_RECONCILIATION_NGSER_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Réconcilie un paiement individuel
   * @param order_ngser - Numéro de commande NGSER
   */
  async reconcilierPaiement(order_ngser: string): Promise<ReconciliationResult> {
    try {
      if (this.mockMode) {
        // J3-J5: Mode mock
        return await this.reconcilierMock(order_ngser);
      } else {
        // J6+: Mode réel (API NGSER sandbox/production)
        return await this.reconcilierReel(order_ngser);
      }
    } catch (error: any) {
      await this.audit.error('RECONCILIATION_ERREUR', {
        order_ngser: order_ngser,
        error: error.message,
      });

      return {
        statut_final: 'PENDING',
        error: error.message,
      };
    }
  }

  /**
   * Réconciliation mock (J3-J5)
   * Simule un SUCCESS pour valider la logique sans appel API réel
   */
  private async reconcilierMock(order_ngser: string): Promise<ReconciliationResult> {
    console.log(`[ReconciliationNgserScheduler] Mode MOCK - Réconciliation ${order_ngser}`);

    const paiement = await this.prisma.paiement.findUnique({
      where: { order_ngser },
      select: { montant_initie: true },
    });

    if (!paiement?.montant_initie) {
      throw new Error('PAIEMENT_NOT_FOUND_OR_NO_MONTANT');
    }

    // Simule un IPN SUCCESS
    const ipnMock = {
      order_ngser: order_ngser,
      transaction_id: `TXN-RECON-MOCK-${Date.now()}`,
      status: 'SUCCESS',
      amount: paiement.montant_initie,
    };

    const result = await this.ipnService.traiterIpn(ipnMock);

    await this.audit.info('RECONCILIATION_MOCK_SUCCESS', {
      order_ngser: order_ngser,
      transaction_id: ipnMock.transaction_id,
    });

    return {
      statut_final: result.paiement_statut || 'CONFIRME',
      dossier_statut: result.dossier_statut || 'PAYE',
      order_ngser: order_ngser,
    };
  }

  /**
   * Réconciliation réelle (J6+)
   * Appelle l'API NGSER pour vérifier le statut du paiement
   */
  private async reconcilierReel(order_ngser: string): Promise<ReconciliationResult> {
    console.log(`[ReconciliationNgserScheduler] Mode RÉEL - Réconciliation ${order_ngser}`);

    const ngserClient = new NgserClient(this.audit);
    const ngserStatus = await ngserClient.getStatus({ order: order_ngser });
    const paiement = await this.prisma.paiement.findUnique({
      where: { order_ngser },
      select: { montant_initie: true },
    });

    const result = await this.ipnService.traiterIpn({
      order_ngser: order_ngser,
      transaction_id: ngserStatus.transaction_id || `RECON-${order_ngser}`,
      status: ngserStatus.status,
      amount: ngserStatus.amount ?? paiement?.montant_initie ?? 0,
      code_ngser: ngserStatus.code,
      wallet_ngser: ngserStatus.wallet,
    });

    await this.prisma.paiement.updateMany({
      where: { order_ngser },
      data: { reconciled_at: new Date() },
    });

    return {
      statut_final: result.paiement_statut,
      dossier_statut: result.dossier_statut,
      order_ngser: order_ngser,
    };
  }

  /**
   * Exécution manuelle (pour tests)
   */
  async executeNow(): Promise<void> {
    console.log('[ReconciliationNgserScheduler] Exécution manuelle déclenchée');
    await this.reconcilierPaiementsPending();
  }
}
