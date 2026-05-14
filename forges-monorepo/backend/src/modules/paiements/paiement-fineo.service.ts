import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { VoucherRepository } from '../vouchers/voucher.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { getDelaiPaiementH } from '../../config/env.config';

const FINEO_PROVIDER = 'FINEO';

export class PaiementFineoService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly voucherRepo: VoucherRepository,
    private readonly audit: AuditLogger
  ) {}

  async initierPaiement(dossierId: string, apprenantId: string, clientAccount?: string, canal?: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      include: { formation: true, session: true },
    });

    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    if (dossier.apprenant_id !== apprenantId) throw new Error('FORBIDDEN');
    if (dossier.statut === 'PAYE') throw new Error('PAIEMENT_DEJA_VALIDE');

    const paiementExistant = await this.prisma.paiement.findUnique({
      where: { dossier_id: dossierId },
    });

    if (paiementExistant?.statut === 'CONFIRME') {
      throw new Error('PAIEMENT_DEJA_VALIDE');
    }

    // RM-07 : délai 72h dépassé
    if (paiementExistant?.expires_at && new Date() > new Date(paiementExistant.expires_at)) {
      throw new Error('PAYMENT_EXPIRED');
    }

    // RM-08 : max 3 tentatives
    if (paiementExistant && (paiementExistant.tentatives || 0) >= 3) {
      throw new Error('TOO_MANY_ATTEMPTS');
    }

    // Reprendre une session FineoPay PENDING existante (sans rappeler FineoPay)
    if (paiementExistant?.provider === FINEO_PROVIDER && paiementExistant.order_ngser && paiementExistant.statut === 'PENDING') {
      const payload = paiementExistant.ngser_payload_last as { checkout_link?: string } | null;
      return {
        paiement_id: paiementExistant.id,
        sync_ref: paiementExistant.order_ngser,
        checkout_link: payload?.checkout_link || '',
        montant_initie: this.toXof(paiementExistant.montant_initie || 0),
      };
    }

    if (!['RETENU', 'PAYE_DIRECTEMENT'].includes(dossier.statut)) {
      throw new Error('DOSSIER_STATUT_INVALIDE');
    }

    const montantCatalogueCentimes = dossier.formation.cout_catalogue;
    const montantFinalCentimes = await this.calculerMontantFinal(dossier, apprenantId, montantCatalogueCentimes);
    const montantFinalXof = this.toXof(montantFinalCentimes);
    const syncRef = this.generateSyncRef();
    const expiresAt = new Date(Date.now() + getDelaiPaiementH() * 3600 * 1000);

    const callbackUrl = process.env.FINEO_CALLBACK_URL ||
      `${process.env.BACKEND_URL || 'http://localhost:3000'}/webhooks/fineo`;
    const returnUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/apprenant/paiements/callback`
      : 'http://localhost:5173/apprenant/paiements/callback';

    const inputs: Array<{ key: string; type: string; label: string; required: boolean; defaultValue?: string }> = [
      { key: 'apprenant_nom', type: 'text', label: 'Votre nom complet', required: false },
      { key: 'apprenant_email', type: 'email', label: 'Votre email', required: false },
    ];
    if (clientAccount) {
      inputs.unshift({ key: 'clientAccount', type: 'tel', label: 'Numero Mobile Money', required: false, defaultValue: clientAccount });
    }
    if (canal) {
      inputs.unshift({ key: 'canal', type: 'text', label: 'Operateur', required: false, defaultValue: canal });
    }

    const fineoClient = this.getFineoClient();
    const checkout = await fineoClient.createCheckoutLink({
      title: `Inscription — ${dossier.formation.intitule}`,
      amount: montantFinalXof,
      callbackUrl,
      syncRef,
      inputs,
    });

    const fineoData = {
      provider: FINEO_PROVIDER,
      order_ngser: syncRef,
      montant_initie: montantFinalCentimes,
      expires_at: expiresAt,
      ngser_payload_last: {
        checkout_link: checkout.checkoutLink,
        return_url: returnUrl,
      },
    };

    const paiement = paiementExistant
      ? await this.prisma.paiement.update({
          where: { id: paiementExistant.id },
          data: { ...fineoData, statut: 'PENDING', transaction_id: null },
        })
      : await this.prisma.paiement.create({
          data: {
            dossier_id: dossierId,
            montant_catalogue: montantCatalogueCentimes,
            montant_final: montantFinalCentimes,
            reduction_appliquee: montantCatalogueCentimes - montantFinalCentimes,
            methode: 'MOBILE_MONEY',
            statut: 'PENDING',
            tentatives: 0,
            ...fineoData,
          },
        });

    await this.audit.info('PAIEMENT_FINEO_INITIE', {
      paiement_id: paiement.id,
      dossier_id: dossierId,
      provider: FINEO_PROVIDER,
      sync_ref: syncRef,
      montant_initie: montantFinalXof,
    });

    return {
      paiement_id: paiement.id,
      sync_ref: syncRef,
      checkout_link: checkout.checkoutLink,
      montant_initie: montantFinalXof,
    };
  }

  private async calculerMontantFinal(dossier: any, apprenantId: string, montantCatalogueCentimes: number): Promise<number> {
    const montant = montantCatalogueCentimes;

    if (dossier.voucher_code) {
      const voucher = await this.voucherRepo.findByCode(dossier.voucher_code);
      if (voucher?.type === 'PROMOTIONNEL') {
        if (voucher.type_valeur === 'MONTANT') return Math.max(0, montant - voucher.valeur);
        if (voucher.type_valeur === 'POURCENTAGE') return Math.floor(montant * (1 - voucher.valeur / 100));
      }
    }

    if (dossier.formation.type_formation === 'PREMIUM') {
      const abonnement = await this.prisma.abonnementRetail.findFirst({
        where: { apprenant_id: apprenantId, statut: 'ACTIF' },
      });
      if (abonnement) return Math.floor(montant * 0.85);
    }

    return montant;
  }

  private toXof(montantCentimes: number): number {
    return Math.round(montantCentimes / 100);
  }

  private generateSyncRef(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const start = Date.UTC(year, 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start) / 86400000).toString().padStart(3, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `FRG-FNO-${year}-${dayOfYear}-${suffix}`;
  }

  private getFineoClient() {
    const { FineoClient } = require('./fineo.client');
    return new FineoClient(this.audit);
  }
}
