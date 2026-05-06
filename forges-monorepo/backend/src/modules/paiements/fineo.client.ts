import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuditLogger } from '../../shared/audit/audit.logger';

export interface FineoInputField {
  key: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'list';
  label: string;
  required?: boolean;
  options?: { label: string; amount?: number }[];
}

export interface FineoCheckoutRequest {
  title: string;
  amount: number;
  callbackUrl: string;
  syncRef: string;
  description?: string;
  inputs?: FineoInputField[];
}

export interface FineoCheckoutResponse {
  checkoutLink: string;
}

export interface FineoTransaction {
  reference: string;
  amount: number;
  fees: number;
  canal: string;
  direction: string;
  status: string;
  date: string;
  syncRef?: string;
  formValue?: Record<string, any>;
}

export class FineoClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private businessCode: string;
  private apiKey: string;

  constructor(private readonly audit: AuditLogger) {
    this.baseUrl = (process.env.FINEO_BASE_URL || 'https://dev.fineopay.com/api/v1/business/dev').trim();
    this.businessCode = process.env.FINEO_BUSINESS_CODE || '';
    this.apiKey = process.env.FINEO_API_KEY || '';

    if (!this.businessCode || !this.apiKey) {
      throw new Error('FINEO_CREDENTIALS_MISSING: FINEO_BUSINESS_CODE and FINEO_API_KEY required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        businessCode: this.businessCode,
        apiKey: this.apiKey,
      },
    });

    this.client.interceptors.request.use((config) => {
      this.audit.info('FINEO_HTTP_REQUEST', {
        method: config.method?.toUpperCase(),
        url: config.url,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        this.audit.info('FINEO_HTTP_RESPONSE', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      async (error: AxiosError) => {
        await this.audit.error('FINEO_HTTP_ERROR', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  async createCheckoutLink(request: FineoCheckoutRequest): Promise<FineoCheckoutResponse> {
    try {
      await this.audit.info('FINEO_CHECKOUT_REQUEST', {
        syncRef: request.syncRef,
        amount: request.amount,
      });

      const response = await this.client.post<{ success: boolean; data: { checkoutLink: string } }>(
        '/checkout-link',
        {
          title: request.title,
          amount: request.amount,
          callbackUrl: request.callbackUrl,
          syncRef: request.syncRef,
          ...(request.description ? { description: request.description } : {}),
          ...(request.inputs?.length ? { inputs: request.inputs } : {}),
        }
      );

      if (!response.data?.success || !response.data?.data?.checkoutLink) {
        throw new Error('FINEO_INVALID_RESPONSE: checkoutLink missing');
      }

      await this.audit.info('FINEO_CHECKOUT_SUCCESS', {
        syncRef: request.syncRef,
        link_received: true,
      });

      return { checkoutLink: response.data.data.checkoutLink };
    } catch (error: any) {
      await this.handleFineoError(error, 'CREATE_CHECKOUT', request.syncRef);
      throw error;
    }
  }

  // Double vérification sécurité — appelé à la réception du callback (pas de HMAC côté FineoPay)
  async getTransaction(reference: string): Promise<FineoTransaction> {
    try {
      await this.audit.info('FINEO_GET_TRANSACTION', { reference });

      const response = await this.client.get<{ success: boolean; data: FineoTransaction }>(
        `/transactions/${reference}`
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error('FINEO_INVALID_RESPONSE: transaction data missing');
      }

      await this.audit.info('FINEO_GET_TRANSACTION_SUCCESS', {
        reference,
        status: response.data.data.status,
      });

      return response.data.data;
    } catch (error: any) {
      await this.handleFineoError(error, 'GET_TRANSACTION', reference);
      throw error;
    }
  }

  private async handleFineoError(error: any, operation: string, ref: string) {
    if (!axios.isAxiosError(error)) return;

    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED') {
      throw new Error(`FINEO_TIMEOUT: ${operation}`);
    }

    if (!axiosError.response) {
      throw new Error(`FINEO_NETWORK_ERROR: ${axiosError.message}`);
    }

    const status = axiosError.response.status;
    if (status === 401 || status === 403) throw new Error('FINEO_AUTHENTICATION_ERROR');
    if (status === 404) throw new Error('FINEO_NOT_FOUND');
    if (status >= 500) throw new Error(`FINEO_SERVER_ERROR: ${status}`);
    throw new Error(`FINEO_HTTP_ERROR: ${status}`);
  }
}
