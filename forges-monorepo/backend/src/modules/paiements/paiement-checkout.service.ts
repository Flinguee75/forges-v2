import { AuditLogger } from '../../shared/audit/audit.logger';
import { FineoClient, FineoInputField } from './fineo.client';
import { NgserClient } from './ngser.client';

export type PaiementProvider = 'FINEO' | 'NGSER';

export interface InitierCheckoutParams {
  order: string;
  amountXof: number;
  title: string;
  callbackUrl: string;
  returnUrl: string;
  inputs?: FineoInputField[];
}

export interface CheckoutSession {
  provider: PaiementProvider | 'MOCK';
  payment_url: string;
  payment_token?: string;
}

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

export class PaiementCheckoutService {
  constructor(private readonly audit: AuditLogger) {}

  async initierCheckout(params: InitierCheckoutParams): Promise<CheckoutSession> {
    if (this.isMockMode()) {
      return {
        provider: 'MOCK',
        payment_url: this.buildMockPaymentUrl(params.order),
        payment_token: `mock-token-${params.order}`,
      };
    }

    if (this.getProvider() === 'NGSER') {
      return this.initierNgser(params);
    }

    return this.initierFineo(params);
  }

  private async initierFineo(params: InitierCheckoutParams): Promise<CheckoutSession> {
    const fineoClient = new FineoClient(this.audit);
    const checkout = await fineoClient.createCheckoutLink({
      title: params.title,
      amount: params.amountXof,
      callbackUrl: params.callbackUrl,
      syncRef: params.order,
      inputs: params.inputs,
    });

    return {
      provider: 'FINEO',
      payment_url: checkout.checkoutLink,
    };
  }

  private async initierNgser(params: InitierCheckoutParams): Promise<CheckoutSession> {
    const ngserClient = new NgserClient(this.audit);
    const session = await ngserClient.createSession({
      order: params.order,
      amount: params.amountXof,
      currency: 'XOF',
      notification_url: process.env.NGSER_NOTIFICATION_URL || params.callbackUrl,
      return_url: params.returnUrl,
    });

    return {
      provider: 'NGSER',
      payment_url: session.payment_url,
      payment_token: session.payment_token,
    };
  }

  private getProvider(): PaiementProvider {
    const provider = (process.env.PAYMENT_PROVIDER || process.env.PAIEMENT_PROVIDER || 'FINEO').toUpperCase();
    return provider === 'NGSER' ? 'NGSER' : 'FINEO';
  }

  private isMockMode(): boolean {
    return process.env.PAYMENT_MOCK_MODE === 'true' || process.env.NODE_ENV === 'test';
  }

  private buildMockPaymentUrl(order: string): string {
    const frontendUrl = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/$/, '');
    return `${frontendUrl}/mock-checkout/${order}`;
  }
}
