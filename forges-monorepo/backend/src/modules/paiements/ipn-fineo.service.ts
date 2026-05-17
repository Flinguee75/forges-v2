import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { CommissionService } from './commission.service';
import { FineoClient } from './fineo.client';
import { PaiementReglementService } from './paiement-reglement.service';

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
  private readonly reglementService: PaiementReglementService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly commissionService: CommissionService
  ) {
    this.reglementService = new PaiementReglementService(prisma, audit, commissionService);
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
      return this.traiterCallbackAbonnement(syncRef, statut, payload.reference, transactionVerifiee);
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

  private async traiterCallbackAbonnement(
    syncRef: string,
    statut: string,
    reference: string,
    transaction: any
  ): Promise<IpnFineoResult> {
    const abonnementRetail = await this.prisma.abonnementRetail.findUnique({
      where: { order_ngser: syncRef },
      include: { apprenant: true },
    });

    if (abonnementRetail) {
      this.assertMontantFineo(syncRef, abonnementRetail.montant_premier_mois || abonnementRetail.montant_mensuel, transaction.amount);
      return this.traiterAbonnementRetail(abonnementRetail, statut, reference, transaction);
    }

    const abonnementOrg = await this.prisma.abonnementOrganisation.findUnique({
      where: { order_ngser: syncRef },
      include: { organisation: true },
    });

    if (abonnementOrg) {
      this.assertMontantFineo(syncRef, abonnementOrg.montant_annuel, transaction.amount);
      return this.traiterAbonnementOrganisation(abonnementOrg, statut, reference, transaction);
    }

    const abonnementB2B = await this.prisma.abonnementB2B.findUnique({
      where: { order_ngser: syncRef },
      include: { organisation: true },
    });

    if (abonnementB2B) {
      this.assertMontantFineo(syncRef, abonnementB2B.prix_annuel, transaction.amount);
      return this.traiterAbonnementB2B(abonnementB2B, statut, reference, transaction);
    }

    await this.audit.error('FINEO_CB_PAIEMENT_INTROUVABLE', {
      syncRef,
      reference,
    });
    throw new Error('PAIEMENT_NOT_FOUND');
  }

  private assertMontantFineo(syncRef: string, montantAttenduXof: number, montantFineo?: number) {
    if (montantFineo !== undefined && montantFineo !== montantAttenduXof) {
      this.audit.error('FINEO_CB_MONTANT_MISMATCH', {
        syncRef,
        montant_initie_xof: montantAttenduXof,
        montant_verifie: montantFineo,
      }).catch(() => {});
      throw new Error('MONTANT_MISMATCH');
    }
  }

  private async traiterAbonnementRetail(
    abonnement: any,
    statut: string,
    reference: string,
    transaction: any
  ): Promise<IpnFineoResult> {
    if (abonnement.statut !== 'EN_ATTENTE_PAIEMENT') {
      await this.audit.info('FINEO_CB_ABONNEMENT_DEJA_TRAITE', {
        abonnement_id: abonnement.id,
        statut: abonnement.statut,
      });
      return { already_processed: true, action: 'NONE' };
    }

    if (statut === 'SUCCESS') {
      await this.prisma.abonnementRetail.update({
        where: { id: abonnement.id },
        data: {
          statut: 'ACTIF',
          transaction_id_ngser: reference,
        },
      });

      await this.audit.info('FINEO_CB_ABONNEMENT_ACTIVE', {
        abonnement_id: abonnement.id,
        apprenant_id: abonnement.apprenant_id,
        offre: abonnement.offre,
        reference,
        canal: transaction.canal,
      });

      return { action: 'ABONNEMENT_ACTIVE', paiement_statut: 'CONFIRME' };
    }

    if (statut === 'FAIL') {
      await this.prisma.abonnementRetail.update({
        where: { id: abonnement.id },
        data: { statut: 'ANNULE' },
      });

      await this.audit.warning('FINEO_CB_ABONNEMENT_ECHEC', {
        abonnement_id: abonnement.id,
        apprenant_id: abonnement.apprenant_id,
        reference,
      });

      return { action: 'ABONNEMENT_ANNULE', paiement_statut: 'ECHOUE' };
    }

    await this.audit.info('FINEO_CB_ABONNEMENT_PENDING', { abonnement_id: abonnement.id, reference });
    return { action: 'ABONNEMENT_PENDING' };
  }

  private async traiterAbonnementOrganisation(
    abonnement: any,
    statut: string,
    reference: string,
    transaction: any
  ): Promise<IpnFineoResult> {
    if (abonnement.statut !== 'EN_ATTENTE_PAIEMENT') {
      await this.audit.info('FINEO_CB_ABONNEMENT_ORG_DEJA_TRAITE', {
        abonnement_id: abonnement.id,
        statut: abonnement.statut,
      });
      return { already_processed: true, action: 'NONE' };
    }

    if (statut === 'SUCCESS') {
      await this.prisma.$transaction(async (tx) => {
        await tx.abonnementOrganisation.update({
          where: { id: abonnement.id },
          data: {
            statut: 'ACTIF',
            transaction_id_ngser: reference,
          },
        });

        await tx.organisation.update({
          where: { id: abonnement.organisation_id },
          data: { abonnement_org_id: abonnement.id },
        });
      });

      await this.audit.info('FINEO_CB_ABONNEMENT_ORG_ACTIVE', {
        abonnement_id: abonnement.id,
        organisation_id: abonnement.organisation_id,
        offre: abonnement.offre,
        reference,
        canal: transaction.canal,
      });

      return { action: 'ABONNEMENT_ORG_ACTIVE', paiement_statut: 'CONFIRME' };
    }

    if (statut === 'FAIL') {
      await this.prisma.abonnementOrganisation.update({
        where: { id: abonnement.id },
        data: { statut: 'ANNULE' },
      });

      await this.audit.warning('FINEO_CB_ABONNEMENT_ORG_ECHEC', {
        abonnement_id: abonnement.id,
        organisation_id: abonnement.organisation_id,
        reference,
      });

      return { action: 'ABONNEMENT_ORG_ANNULE', paiement_statut: 'ECHOUE' };
    }

    await this.audit.info('FINEO_CB_ABONNEMENT_ORG_PENDING', { abonnement_id: abonnement.id, reference });
    return { action: 'ABONNEMENT_ORG_PENDING' };
  }

  private async traiterAbonnementB2B(
    abonnement: any,
    statut: string,
    reference: string,
    transaction: any
  ): Promise<IpnFineoResult> {
    if (abonnement.statut !== 'EN_ATTENTE_PAIEMENT') {
      await this.audit.info('FINEO_CB_ABONNEMENT_B2B_DEJA_TRAITE', {
        abonnement_id: abonnement.id,
        statut: abonnement.statut,
      });
      return { already_processed: true, action: 'NONE' };
    }

    if (statut === 'SUCCESS') {
      await this.prisma.$transaction(async (tx) => {
        await tx.abonnementB2B.update({
          where: { id: abonnement.id },
          data: {
            statut: 'ACTIF',
            transaction_id_ngser: reference,
          },
        });

        await tx.organisation.update({
          where: { id: abonnement.organisation_id },
          data: { abonnement_b2b_id: abonnement.id },
        });
      });

      await this.audit.info('FINEO_CB_ABONNEMENT_B2B_ACTIVE', {
        abonnement_id: abonnement.id,
        organisation_id: abonnement.organisation_id,
        palier: abonnement.palier,
        reference,
        canal: transaction.canal,
      });

      return { action: 'ABONNEMENT_B2B_ACTIVE', paiement_statut: 'CONFIRME' };
    }

    if (statut === 'FAIL') {
      await this.prisma.abonnementB2B.update({
        where: { id: abonnement.id },
        data: { statut: 'ANNULE' },
      });

      await this.audit.warning('FINEO_CB_ABONNEMENT_B2B_ECHEC', {
        abonnement_id: abonnement.id,
        organisation_id: abonnement.organisation_id,
        reference,
      });

      return { action: 'ABONNEMENT_B2B_ANNULE', paiement_statut: 'ECHOUE' };
    }

    await this.audit.info('FINEO_CB_ABONNEMENT_B2B_PENDING', { abonnement_id: abonnement.id, reference });
    return { action: 'ABONNEMENT_B2B_PENDING' };
  }

  private async traiterSuccess(paiement: any, reference: string, transaction: any): Promise<IpnFineoResult> {
    const result = await this.reglementService.confirmerProvider({
      paiement,
      transactionId: reference,
      providerStatus: 'SUCCESS',
      wallet: transaction.canal,
      payload: transaction,
    });

    await this.audit.info('FINEO_CB_SUCCESS_TRAITE', {
      paiement_id: paiement.id,
      reference,
      dossier_id: paiement.dossier_id,
    });

    return result;
  }

  private async traiterFail(paiement: any, reference: string, transaction: any): Promise<IpnFineoResult> {
    const MAX_TENTATIVES = 3;
    const nouvellesTentatives = (paiement.tentatives || 0) + 1;
    const expire = paiement.expires_at && new Date() > new Date(paiement.expires_at);
    const epuise = nouvellesTentatives >= MAX_TENTATIVES;
    const annulerDossier = epuise || expire;

    const result = await this.reglementService.echouerProvider({
      paiement,
      transactionId: reference,
      providerStatus: 'FAIL',
      payload: transaction,
      tentatives: nouvellesTentatives,
      annulerDossier,
    });

    await this.audit.info('FINEO_CB_FAIL_TRAITE', {
      paiement_id: paiement.id,
      reference,
      tentatives: nouvellesTentatives,
      dossier_annule: annulerDossier,
    });

    return result;
  }
}
