import { Prisma, PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { CommissionService } from './commission.service';
import { PaiementRecuService } from './paiement-recu.service';

export interface ReglementResult {
  paiement_statut?: string;
  dossier_statut?: string;
  commissions_created?: boolean;
  already_processed?: boolean;
  action?: string;
}

type DeferredAuditEvent = {
  level: 'info' | 'warning';
  action: string;
  metadata: Record<string, any>;
};

export interface ConfirmerProviderParams {
  paiement: any;
  transactionId: string;
  providerStatus?: string;
  providerCode?: string | null;
  wallet?: string | null;
  payload?: any;
  envoyerRecu?: boolean;
}

export interface EchouerProviderParams {
  paiement: any;
  transactionId: string;
  providerStatus?: string;
  providerCode?: string | null;
  wallet?: string | null;
  payload?: any;
  tentatives?: number;
  annulerDossier: boolean;
}

export class PaiementReglementService {
  private readonly recuService: PaiementRecuService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly commissionService: CommissionService
  ) {
    this.recuService = new PaiementRecuService(prisma, audit);
  }

  async confirmerProvider(params: ConfirmerProviderParams): Promise<ReglementResult> {
    const { paiement } = params;
    let commissions: { partenaire?: any; apporteur?: any; auditEvents?: DeferredAuditEvent[] } = {};
    let alreadyProcessed = false;

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.paiement.updateMany({
        where: { id: paiement.id, statut: { not: 'CONFIRME' } },
        data: {
          statut: 'CONFIRME',
          status_ngser: params.providerStatus || 'SUCCESS',
          ...(params.providerCode !== undefined ? { code_ngser: params.providerCode } : {}),
          ...(params.wallet !== undefined ? { wallet_ngser: params.wallet } : {}),
          ...(params.payload !== undefined ? { ngser_payload_last: params.payload as Prisma.InputJsonValue } : {}),
          transaction_id: params.transactionId,
          confirmed_at: new Date(),
        },
      });

      if (result.count === 0) {
        alreadyProcessed = true;
        return;
      }

      await tx.dossier.update({
        where: { id: paiement.dossier_id },
        data: { statut: 'PAYE' },
      });

      if (paiement.dossier?.formation) {
        commissions = await this.commissionService.creerCommissionsApresSuccessPayment(
          paiement,
          paiement.dossier,
          paiement.dossier.formation,
          tx
        );
      }
    });

    if (alreadyProcessed) {
      await this.audit.info('PAIEMENT_REGLEMENT_DEJA_CONFIRME', {
        paiement_id: paiement.id,
        transaction_id: params.transactionId,
      });
      return { already_processed: true, action: 'NONE' };
    }

    for (const event of commissions.auditEvents || []) {
      await this.audit[event.level](event.action, event.metadata);
    }

    const envoyerRecu = params.envoyerRecu ?? process.env.NODE_ENV !== 'test';
    if (envoyerRecu) {
      this.recuService.genererEtEnvoyerRecu(paiement.dossier_id).catch(() => undefined);
    }

    return {
      paiement_statut: 'CONFIRME',
      dossier_statut: 'PAYE',
      commissions_created: !!(commissions.partenaire || commissions.apporteur),
    };
  }

  async echouerProvider(params: EchouerProviderParams): Promise<ReglementResult> {
    const { paiement } = params;
    let alreadyProcessed = false;

    await this.prisma.$transaction(async (tx) => {
      const data: Record<string, any> = {
        statut: 'ECHOUE',
        status_ngser: params.providerStatus || 'FAIL',
        ...(params.providerCode !== undefined ? { code_ngser: params.providerCode } : {}),
        ...(params.wallet !== undefined ? { wallet_ngser: params.wallet } : {}),
        ...(params.payload !== undefined ? { ngser_payload_last: params.payload } : {}),
        ...(params.tentatives !== undefined ? { tentatives: params.tentatives } : {}),
        transaction_id: params.transactionId,
      };

      const result = await tx.paiement.updateMany({
        where: { id: paiement.id, statut: { not: 'CONFIRME' } },
        data,
      });

      if (result.count === 0) {
        alreadyProcessed = true;
        return;
      }

      if (params.annulerDossier) {
        await tx.dossier.update({
          where: { id: paiement.dossier_id },
          data: { statut: 'ANNULE' },
        });
      }
    });

    if (alreadyProcessed) {
      await this.audit.info('PAIEMENT_REGLEMENT_ECHEC_IGNORE_DEJA_CONFIRME', {
        paiement_id: paiement.id,
        transaction_id: params.transactionId,
      });
      return { already_processed: true, action: 'NONE' };
    }

    return {
      paiement_statut: 'ECHOUE',
      dossier_statut: params.annulerDossier ? 'ANNULE' : paiement.dossier?.statut,
    };
  }
}
