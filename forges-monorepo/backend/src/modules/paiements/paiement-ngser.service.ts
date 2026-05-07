import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { VoucherRepository } from '../vouchers/voucher.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { InitierPaiementNgserDto } from './dto/paiement.dto';
import { getDelaiPaiementH } from '../../config/env.config';

const NGSER_PROVIDER = 'NGSER';
const NGSER_MOCK_BASE_URL = 'https://mock-ngser.forges.ci/pay';

export class PaiementNgserService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly voucherRepo: VoucherRepository,
    private readonly audit: AuditLogger
  ) {}

  async initierPaiement(dto: InitierPaiementNgserDto, apprenantId: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dto.dossier_id },
      include: { formation: true, session: true },
    });

    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    if (dossier.apprenant_id !== apprenantId) throw new Error('FORBIDDEN');
    if (dossier.statut === 'PAYE') throw new Error('PAIEMENT_DEJA_VALIDE');

    const paiementExistant = await this.prisma.paiement.findUnique({
      where: { dossier_id: dto.dossier_id },
    });

    if (paiementExistant?.statut === 'CONFIRME') {
      throw new Error('PAIEMENT_DEJA_VALIDE');
    }

    if (paiementExistant?.provider === NGSER_PROVIDER && paiementExistant.order_ngser) {
      const payload = paiementExistant.ngser_payload_last as { payment_url?: string } | null;

      return {
        paiement_id: paiementExistant.id,
        order_ngser: paiementExistant.order_ngser,
        payment_url: payload?.payment_url || this.buildMockPaymentUrl(paiementExistant.order_ngser),
        montant_initie: paiementExistant.montant_initie,
      };
    }

    if (!['RETENU', 'PAYE_DIRECTEMENT'].includes(dossier.statut)) {
      throw new Error('DOSSIER_STATUT_INVALIDE');
    }

    const montantFinal = await this.calculerMontantFinal(dossier, apprenantId);
    const orderNgser = await this.generateUniqueOrderNgser();
    const session = await this.createNgserSession(orderNgser, montantFinal);
    const expiresAt = new Date(Date.now() + getDelaiPaiementH() * 3600 * 1000);

    const ngserData = {
      provider: NGSER_PROVIDER,
      payment_token_ngser: session.payment_token,
      order_ngser: orderNgser,
      montant_initie: montantFinal,
      expires_at: expiresAt,
      ngser_payload_last: {
        mode: this.isMockMode() ? 'MOCK' : 'REAL',
        payment_url: session.payment_url,
      },
    };

    const paiement = paiementExistant
      ? await this.prisma.paiement.update({ where: { id: paiementExistant.id }, data: ngserData })
      : await this.prisma.paiement.create({
          data: {
            dossier_id: dto.dossier_id,
            montant_catalogue: dossier.formation.cout_catalogue,
            montant_final: montantFinal,
            reduction_appliquee: dossier.formation.cout_catalogue - montantFinal,
            methode: 'MOBILE_MONEY',
            statut: 'PENDING',
            tentatives: 0,
            ...ngserData,
          },
        });

    await this.audit.info('PAIEMENT_NGSER_INITIE', {
      paiement_id: paiement.id,
      dossier_id: dto.dossier_id,
      provider: NGSER_PROVIDER,
      order_ngser: orderNgser,
      montant_initie: montantFinal,
    });

    return {
      paiement_id: paiement.id,
      order_ngser: orderNgser,
      payment_url: session.payment_url,
      montant_initie: montantFinal,
    };
  }

  private async calculerMontantFinal(dossier: any, apprenantId: string): Promise<number> {
    const montant = dossier.formation.cout_catalogue;

    if (dossier.voucher_code) {
      const voucher = await this.voucherRepo.findByCode(dossier.voucher_code);
      if (voucher?.type === 'PROMOTIONNEL') {
        if (voucher.type_valeur === 'MONTANT') {
          return Math.max(0, montant - voucher.valeur);
        }
        if (voucher.type_valeur === 'POURCENTAGE') {
          return Math.floor(montant * (1 - voucher.valeur / 100));
        }
      }
    }

    if (dossier.formation.type_formation === 'PREMIUM') {
      const abonnement = await this.prisma.abonnementRetail.findFirst({
        where: { apprenant_id: apprenantId, statut: 'ACTIF' },
      });
      if (abonnement) {
        return Math.floor(montant * 0.85);
      }
    }

    return montant;
  }

  private async generateUniqueOrderNgser(): Promise<string> {
    for (let tentative = 0; tentative < 5; tentative += 1) {
      const order = this.generateOrderNgser();
      const existing = await this.prisma.paiement.findFirst({
        where: { order_ngser: order },
        select: { id: true },
      });
      if (!existing) return order;
    }

    throw new Error('ORDER_NGSER_GENERATION_FAILED');
  }

  private generateOrderNgser(date = new Date()): string {
    const year = date.getUTCFullYear();
    const start = Date.UTC(year, 0, 0);
    const dayOfYear = Math.floor((date.getTime() - start) / 86400000)
      .toString()
      .padStart(3, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();

    return `FRG-${year}-${dayOfYear}-${suffix}`;
  }

  private async createNgserSession(order: string, montant: number) {
    if (this.isMockMode()) {
      return {
        payment_token: `mock-token-${order}`,
        payment_url: this.buildMockPaymentUrl(order),
        expired_url: `${this.buildMockPaymentUrl(order)}&expired=1`,
      };
    }

    return this.createRealNgserSession(order, montant);
  }

  private async createRealNgserSession(order: string, montant: number): Promise<{
    payment_token: string;
    payment_url: string;
    expired_url?: string;
  }> {
    const ngserClient = await this.getNgserClient();

    const notificationUrl = process.env.NGSER_NOTIFICATION_URL || 'http://localhost:3000/webhooks/paiement';
    const returnUrl = process.env.NGSER_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/paiement/retour`;

    const response = await ngserClient.createSession({
      order,
      amount: Math.round(montant / 100), // centimes → XOF
      currency: 'XOF',
      notification_url: notificationUrl,
      return_url: returnUrl,
    });

    return {
      payment_token: response.payment_token,
      payment_url: response.payment_url,
      expired_url: response.expired_url,
    };
  }

  private async getNgserClient() {
    const { NgserClient } = await import('./ngser.client');
    return new NgserClient(this.audit);
  }

  private isMockMode(): boolean {
    return process.env.NGSER_MOCK_MODE !== 'false';
  }

  private buildMockPaymentUrl(order: string): string {
    return `${NGSER_MOCK_BASE_URL}?order=${order}`;
  }
}
