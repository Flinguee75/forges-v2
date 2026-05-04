import { PrismaClient, Prisma } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { CommissionService } from './commission.service';

export interface IpnPayload {
  // Champs réels NGSER (doc officielle)
  order_id?: string;           // identifiant commande NGSER
  status_id?: number;          // 1=SUCCESS, 0/4/5=FAIL
  transaction_id: string;
  transaction_amount?: number; // en XOF (int)
  paid_transaction_amount?: number;
  currency?: string;
  wallet?: string;
  wallet_reference_id?: string;
  phone_number?: string;
  // Champs internes / alias legacy
  order_ngser?: string;
  order?: string;
  status?: string;
  code_ngser?: string | number;
  wallet_ngser?: string;
  amount?: number;
}

export interface IpnResult {
  paiement_statut?: string;
  dossier_statut?: string;
  commissions_created?: boolean;
  already_processed?: boolean;
  action?: string;
  reconciliation_eligible?: boolean;
}

export class IpnNgserService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit?: AuditLogger,
    private readonly commissionService?: CommissionService
  ) {
    this.audit = audit || new AuditLogger(prisma);
    this.commissionService = commissionService || new CommissionService(prisma, this.audit);
  }

  async traiterIpn(ipn: IpnPayload): Promise<IpnResult> {
    // Normaliser les champs NGSER réels vers notre modèle interne
    // Doc NGSER: order_id, status_id, transaction_amount (XOF int)
    const orderNgser = ipn.order_id || ipn.order_ngser || ipn.order;
    if (!orderNgser) {
      throw new Error('IPN_ORDER_MANQUANT');
    }

    const montantIpn = ipn.transaction_amount ?? ipn.amount;

    // status_id: 1=SUCCESS, 0/4/5=FAIL (doc NGSER)
    const statutNgser = this.normaliserStatutNgser(
      ipn.status,
      ipn.status_id ?? ipn.code_ngser
    );

    // RM-158: Idempotence via transaction_id
    const paiementExistant = await this.prisma.paiement.findFirst({
      where: { transaction_id: ipn.transaction_id },
      include: { dossier: true },
    });

    if (paiementExistant && paiementExistant.statut === 'CONFIRME') {
      await this.audit.info('IPN_DOUBLON_IGNORE', {
        transaction_id: ipn.transaction_id,
        order_ngser: orderNgser,
      });
      return { already_processed: true, action: 'NONE' };
    }

    // Récupérer paiement via order_ngser
    const paiement = await this.prisma.paiement.findUnique({
      where: { order_ngser: orderNgser },
      include: {
        dossier: {
          include: { formation: true, apprenant: true },
        },
      },
    });

    if (!paiement) {
      await this.audit.error('IPN_PAIEMENT_INTROUVABLE', {
        order_ngser: orderNgser,
        transaction_id: ipn.transaction_id,
      });
      throw new Error('PAIEMENT_NOT_FOUND');
    }

    // Contrôle montant : NGSER envoie XOF (int), DB stocke en centimes
    const montantInitieXof = Math.round((paiement.montant_initie || 0) / 100);
    if (montantIpn !== undefined && Math.abs(montantIpn - montantInitieXof) > 1) {
      await this.audit.error('IPN_MONTANT_MISMATCH', {
        order_ngser: orderNgser,
        montant_initie_xof: montantInitieXof,
        montant_ipn: montantIpn,
        difference: Math.abs(montantIpn - montantInitieXof),
      });
      throw new Error('MONTANT_MISMATCH');
    }

    // Normaliser pour la suite du traitement
    ipn.order_ngser = orderNgser;

    // RM-158: Traiter selon statut
    switch (statutNgser) {
      case 'SUCCESS':
        return await this.traiterSuccess(paiement, ipn);
      case 'FAIL':
        return await this.traiterFail(paiement, ipn);
      case 'PENDING':
        return await this.traiterPending(paiement, ipn);
      default:
        await this.audit.error('IPN_CODE_INCONNU', {
          status: ipn.status,
          code_ngser: ipn.code_ngser,
          order_ngser: ipn.order_ngser,
        });
        return { action: 'LOGGED_UNKNOWN' };
    }
  }

  private normaliserStatutNgser(status?: string, code?: string | number): string {
    const codeString = code === undefined || code === null ? undefined : String(code);

    // Mapping codes NGSER
    if (codeString === '1') return 'SUCCESS';
    if (['0', '2', '4', '5'].includes(codeString || '')) return 'FAIL';
    if (codeString === '3') return 'PENDING';

    // Fallback sur status string
    return (status || 'PENDING').toUpperCase();
  }

  private async traiterSuccess(paiement: any, ipn: IpnPayload): Promise<IpnResult> {
    let commissionsCreated = false;

    await this.prisma.$transaction(async (tx) => {
      // Mettre à jour paiement
      await tx.paiement.update({
        where: { id: paiement.id },
        data: {
          statut: 'CONFIRME',
          status_ngser: 'SUCCESS',
          code_ngser: ipn.status_id !== undefined ? String(ipn.status_id) : (ipn.code_ngser ? String(ipn.code_ngser) : null),
          wallet_ngser: ipn.wallet || ipn.wallet_ngser,
          ngser_payload_last: ipn as any,
          transaction_id: ipn.transaction_id,
          confirmed_at: new Date(),
        },
      });

      // Mettre à jour dossier
      await tx.dossier.update({
        where: { id: paiement.dossier_id },
        data: { statut: 'PAYE' },
      });

      // Créer commissions (RM-09, RM-145)
      const commissions = await this.commissionService.creerCommissionsApresSuccessPayment(
        paiement,
        paiement.dossier,
        paiement.dossier.formation,
        tx
      );

      commissionsCreated = !!(commissions.partenaire || commissions.apporteur);
    });

    await this.audit.info('IPN_SUCCESS_TRAITE', {
      paiement_id: paiement.id,
      transaction_id: ipn.transaction_id,
      dossier_id: paiement.dossier_id,
    });

    return {
      paiement_statut: 'CONFIRME',
      dossier_statut: 'PAYE',
      commissions_created: commissionsCreated,
    };
  }

  private async traiterFail(paiement: any, ipn: IpnPayload): Promise<IpnResult> {
    await this.prisma.$transaction(async (tx) => {
      await tx.paiement.update({
        where: { id: paiement.id },
        data: {
          statut: 'ECHOUE',
          status_ngser: 'FAIL',
          code_ngser: ipn.status_id !== undefined ? String(ipn.status_id) : (ipn.code_ngser ? String(ipn.code_ngser) : null),
          wallet_ngser: ipn.wallet || ipn.wallet_ngser,
          ngser_payload_last: ipn as any,
          transaction_id: ipn.transaction_id,
        },
      });

      await tx.dossier.update({
        where: { id: paiement.dossier_id },
        data: { statut: 'ANNULE' },
      });
    });

    await this.audit.info('IPN_FAIL_TRAITE', {
      paiement_id: paiement.id,
      transaction_id: ipn.transaction_id,
      code_ngser: ipn.code_ngser,
    });

    return {
      paiement_statut: 'ECHOUE',
      dossier_statut: 'ANNULE',
    };
  }

  private async traiterPending(paiement: any, ipn: IpnPayload): Promise<IpnResult> {
    await this.prisma.paiement.update({
      where: { id: paiement.id },
      data: {
        statut: 'PENDING',
        status_ngser: 'PENDING',
        code_ngser: ipn.code_ngser ? String(ipn.code_ngser) : null,
        wallet_ngser: ipn.wallet_ngser,
        ngser_payload_last: ipn as any,
        transaction_id: ipn.transaction_id,
      },
    });

    await this.audit.info('IPN_PENDING_TRAITE', {
      paiement_id: paiement.id,
      transaction_id: ipn.transaction_id,
    });

    return {
      paiement_statut: 'PENDING',
      reconciliation_eligible: true,
    };
  }
}
