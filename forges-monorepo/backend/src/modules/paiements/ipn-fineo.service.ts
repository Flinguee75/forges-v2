import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { CommissionService } from './commission.service';
import { FineoClient } from './fineo.client';
import { PaiementRecuService } from './paiement-recu.service';

export interface FineoCbPayload {
  reference: string;        // référence transaction FineoPay
  amount: number;
  status: string;           // "success" | "failed" | "pending"
  clientAccountNumber?: string;
  timestamp?: string;
  syncRef?: string;         // notre syncRef envoyé à la création
}

export interface IpnFineoResult {
  paiement_statut?: string;
  dossier_statut?: string;
  commissions_created?: boolean;
  already_processed?: boolean;
  action?: string;
}

export class IpnFineoService {
  private _fineoClient: FineoClient | null = null;
  private recuService: PaiementRecuService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly commissionService: CommissionService
  ) {
    this.recuService = new PaiementRecuService(prisma, audit);
  }

  private get fineoClient(): FineoClient {
    if (!this._fineoClient) {
      this._fineoClient = new FineoClient(this.audit);
    }
    return this._fineoClient;
  }

  async traiterCallback(payload: FineoCbPayload): Promise<IpnFineoResult> {
    if (!payload.reference) {
      throw new Error('FINEO_CB_REFERENCE_MANQUANTE');
    }

    // Sécurité : double vérification auprès de FineoPay (pas de HMAC dans leur API)
    let transactionVerifiee: any;
    try {
      transactionVerifiee = await this.fineoClient.getTransaction(payload.reference);
    } catch (err: any) {
      await this.audit.error('FINEO_CB_VERIFICATION_ECHEC', {
        reference: payload.reference,
        error: err.message,
      });
      throw new Error('FINEO_CB_VERIFICATION_ECHEC');
    }

    // Utiliser le statut vérifié côté FineoPay, pas celui du callback
    const statut = this.normaliserStatut(transactionVerifiee.status);
    const syncRef = payload.syncRef || transactionVerifiee.syncRef;

    if (!syncRef) {
      await this.audit.error('FINEO_CB_SYNCREF_MANQUANTE', { reference: payload.reference });
      throw new Error('FINEO_CB_SYNCREF_MANQUANTE');
    }

    // Idempotence : déjà traité ?
    const paiementExistant = await this.prisma.paiement.findFirst({
      where: { transaction_id: payload.reference },
    });
    if (paiementExistant?.statut === 'CONFIRME') {
      await this.audit.info('FINEO_CB_DOUBLON_IGNORE', { reference: payload.reference });
      return { already_processed: true, action: 'NONE' };
    }

    // Retrouver le paiement via syncRef (stocké dans order_ngser)
    const paiement = await this.prisma.paiement.findUnique({
      where: { order_ngser: syncRef },
      include: {
        dossier: {
          include: { formation: true, apprenant: true },
        },
      },
    });

    if (!paiement) {
      await this.audit.error('FINEO_CB_PAIEMENT_INTROUVABLE', {
        syncRef,
        reference: payload.reference,
      });
      throw new Error('PAIEMENT_NOT_FOUND');
    }

    // Contrôle montant (FineoPay envoie en XOF directement)
    const montantInitieXof = Math.round((paiement.montant_initie || 0) / 100);
    if (transactionVerifiee.amount !== undefined && transactionVerifiee.amount !== montantInitieXof) {
      await this.audit.error('FINEO_CB_MONTANT_MISMATCH', {
        syncRef,
        montant_initie_xof: montantInitieXof,
        montant_verifie: transactionVerifiee.amount,
      });
      throw new Error('MONTANT_MISMATCH');
    }

    switch (statut) {
      case 'SUCCESS':
        return this.traiterSuccess(paiement, payload.reference, transactionVerifiee);
      case 'FAIL':
        return this.traiterFail(paiement, payload.reference, transactionVerifiee);
      default:
        await this.audit.info('FINEO_CB_PENDING', { syncRef, reference: payload.reference });
        return { action: 'PENDING' };
    }
  }

  private normaliserStatut(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'success') return 'SUCCESS';
    if (s === 'failed' || s === 'fail') return 'FAIL';
    return 'PENDING';
  }

  private async traiterSuccess(paiement: any, reference: string, transaction: any): Promise<IpnFineoResult> {
    let commissionsCreated = false;

    await this.prisma.$transaction(async (tx) => {
      await tx.paiement.update({
        where: { id: paiement.id },
        data: {
          statut: 'CONFIRME',
          status_ngser: 'SUCCESS',
          transaction_id: reference,
          wallet_ngser: transaction.canal,
          ngser_payload_last: transaction,
          confirmed_at: new Date(),
        },
      });

      await tx.dossier.update({
        where: { id: paiement.dossier_id },
        data: { statut: 'PAYE' },
      });

      const commissions = await this.commissionService.creerCommissionsApresSuccessPayment(
        paiement,
        paiement.dossier,
        paiement.dossier.formation,
        tx
      );
      commissionsCreated = !!(commissions.partenaire || commissions.apporteur);
    });

    await this.audit.info('FINEO_CB_SUCCESS_TRAITE', {
      paiement_id: paiement.id,
      reference,
      dossier_id: paiement.dossier_id,
    });

    // Envoi recu PDF non-bloquant
    this.recuService.genererEtEnvoyerRecu(paiement.dossier_id).catch(() => {});

    return { paiement_statut: 'CONFIRME', dossier_statut: 'PAYE', commissions_created: commissionsCreated };
  }

  private async traiterFail(paiement: any, reference: string, transaction: any): Promise<IpnFineoResult> {
    const MAX_TENTATIVES = 3;
    const nouvellesTentatives = (paiement.tentatives || 0) + 1;
    const expire = paiement.expires_at && new Date() > new Date(paiement.expires_at);
    const epuise = nouvellesTentatives >= MAX_TENTATIVES;
    const annulerDossier = epuise || expire;

    await this.prisma.$transaction(async (tx) => {
      await tx.paiement.update({
        where: { id: paiement.id },
        data: {
          statut: 'ECHOUE',
          status_ngser: 'FAIL',
          transaction_id: reference,
          ngser_payload_last: transaction,
          tentatives: nouvellesTentatives,
        },
      });

      if (annulerDossier) {
        await tx.dossier.update({
          where: { id: paiement.dossier_id },
          data: { statut: 'ANNULE' },
        });
      }
    });

    await this.audit.info('FINEO_CB_FAIL_TRAITE', {
      paiement_id: paiement.id,
      reference,
      tentatives: nouvellesTentatives,
      dossier_annule: annulerDossier,
    });

    const dossierStatut = annulerDossier ? 'ANNULE' : paiement.dossier?.statut;
    return { paiement_statut: 'ECHOUE', dossier_statut: dossierStatut };
  }
}
