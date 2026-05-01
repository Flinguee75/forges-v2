import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { ngserCircuitBreaker } from '../../shared/circuit-breaker/circuit-breaker.service';

export interface NgserSessionRequest {
  order: string;
  amount: number;
  currency: string;
  notification_url: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface NgserSessionResponse {
  payment_token: string;
  payment_url: string;
  expired_url?: string;
}

export interface NgserStatusRequest {
  order: string;
}

export interface NgserStatusResponse {
  order: string;
  status: string;
  code?: string | number;
  transaction_id?: string;
  amount?: number;
  wallet?: string;
  payment_date?: string;
}

export class NgserClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private name: string;
  private authenticationToken: string;
  private authToken: string;
  private operationTokenPaiement: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(private readonly audit: AuditLogger) {
    this.baseUrl = process.env.NGSER_BASE_URL || 'https://securetest.crossroad-africa.net/';
    this.name = process.env.NGSER_NAME || 'FORGES';
    this.authenticationToken = process.env.NGSER_AUTHENTICATION_TOKEN || process.env.NGSER_AUTH_TOKEN || '';
    this.authToken = process.env.NGSER_AUTH_TOKEN || this.authenticationToken;
    this.operationTokenPaiement = process.env.NGSER_OPERATION_TOKEN_PAIEMENT || '';
    this.timeoutMs = parseInt(process.env.NGSER_REQUEST_TIMEOUT_MS || '30000', 10);
    this.maxRetries = parseInt(process.env.NGSER_MAX_RETRIES || '2', 10);

    if (!this.authenticationToken || !this.authToken || !this.operationTokenPaiement) {
      throw new Error('NGSER_CREDENTIALS_MISSING: NGSER_AUTH_TOKEN and NGSER_OPERATION_TOKEN_PAIEMENT required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour logs (sans exposer credentials)
    this.client.interceptors.request.use(
      (config) => {
        this.audit.info('NGSER_HTTP_REQUEST', {
          method: config.method?.toUpperCase(),
          url: config.url,
          timeout: config.timeout,
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        this.audit.info('NGSER_HTTP_RESPONSE', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      async (error: AxiosError) => {
        await this.audit.error('NGSER_HTTP_ERROR', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url,
          code: error.code,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Créer une session de paiement NGSER
   * Endpoint sandbox validé: POST /v3/sessions
   */
  async createSession(request: NgserSessionRequest): Promise<NgserSessionResponse> {
    try {
      const payload = {
        name: this.name,
        authentication_token: this.authenticationToken,
        auth_token: this.authToken,
        operation_token: this.operationTokenPaiement,
        order: request.order,
        transaction_amount: request.amount,
        currency: request.currency.toLowerCase(),
        notification_url: request.notification_url,
        customer_email: request.customer_email,
        customer_phone: request.customer_phone,
      };

      await this.audit.info('NGSER_CREATE_SESSION_REQUEST', {
        order: request.order,
        amount: request.amount,
        currency: request.currency,
      });

      const response = await this.postWithRetry<NgserSessionResponse>(
        '/v3/sessions',
        payload,
        'CREATE_SESSION',
        request.order
      );

      if (!response.data.payment_token || !response.data.payment_url) {
        throw new Error('NGSER_INVALID_RESPONSE: payment_token or payment_url missing');
      }

      await this.audit.info('NGSER_CREATE_SESSION_SUCCESS', {
        order: request.order,
        payment_url_received: !!response.data.payment_url,
      });

      return response.data;
    } catch (error: any) {
      await this.handleNgserError(error, 'CREATE_SESSION', request.order);
      throw error;
    }
  }

  /**
   * Réconciliation : vérifier le statut d'un paiement NGSER
   * Endpoint décrit par l'addendum v4.9: POST /v3/check-status
   */
  async getStatus(request: NgserStatusRequest): Promise<NgserStatusResponse> {
    try {
      const payload = {
        name: this.name,
        authentication_token: this.authenticationToken,
        auth_token: this.authToken,
        operation_token: this.operationTokenPaiement,
        order: request.order,
      };

      await this.audit.info('NGSER_GET_STATUS_REQUEST', {
        order: request.order,
      });

      const response = await this.postWithRetry<NgserStatusResponse>(
        '/v3/check-status',
        payload,
        'GET_STATUS',
        request.order
      );

      await this.audit.info('NGSER_GET_STATUS_SUCCESS', {
        order: request.order,
        status: response.data.status,
        code: response.data.code,
      });

      return response.data;
    } catch (error: any) {
      await this.handleNgserError(error, 'GET_STATUS', request.order);
      throw error;
    }
  }

  /**
   * Gestion centralisée des erreurs NGSER
   */
  private async postWithRetry<T>(url: string, payload: object, operation: string, order: string) {
    if (!ngserCircuitBreaker.canExecute()) {
      await this.audit.error('NGSER_CIRCUIT_OPEN', {
        operation,
        order,
      });
      throw new Error('NGSER_CIRCUIT_OPEN');
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        if (attempt > 0) {
          await this.audit.warning('NGSER_HTTP_RETRY', {
            operation,
            order,
            attempt,
            max_retries: this.maxRetries,
          });
        }

        const response = await this.client.post<T>(url, payload);
        ngserCircuitBreaker.recordSuccess();
        return response;
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error) || attempt === this.maxRetries) {
          ngserCircuitBreaker.recordFailure();
          throw error;
        }

        await this.sleep(this.retryDelayMs(attempt));
      }
    }

    throw lastError;
  }

  private shouldRetry(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;

    if (error.code === 'ECONNABORTED' || !error.response) return true;

    return (error.response.status || 0) >= 500;
  }

  private retryDelayMs(attempt: number): number {
    return Math.min(1000 * 2 ** attempt, 5000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleNgserError(error: any, operation: string, order: string) {
    const isAxiosError = axios.isAxiosError(error);

    if (isAxiosError) {
      const axiosError = error as AxiosError;

      // Timeout
      if (axiosError.code === 'ECONNABORTED') {
        await this.audit.error('NGSER_TIMEOUT', {
          operation,
          order,
          timeout_ms: this.timeoutMs,
        });
        throw new Error(`NGSER_TIMEOUT: ${operation} exceeded ${this.timeoutMs}ms`);
      }

      // Erreur réseau
      if (!axiosError.response) {
        await this.audit.error('NGSER_NETWORK_ERROR', {
          operation,
          order,
          message: axiosError.message,
        });
        throw new Error(`NGSER_NETWORK_ERROR: ${axiosError.message}`);
      }

      // Erreur HTTP
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      await this.audit.error('NGSER_HTTP_ERROR', {
        operation,
        order,
        status,
        response: data,
      });

      if (status === 401 || status === 403) {
        throw new Error('NGSER_AUTHENTICATION_ERROR: Invalid credentials');
      }

      if (status === 404) {
        throw new Error('NGSER_NOT_FOUND: Order not found or invalid endpoint');
      }

      if (status >= 500) {
        throw new Error(`NGSER_SERVER_ERROR: ${status}`);
      }

      throw new Error(`NGSER_HTTP_ERROR: ${status}`);
    }

    // Erreur inconnue
    await this.audit.error('NGSER_UNKNOWN_ERROR', {
      operation,
      order,
      message: error.message || 'Unknown error',
    });

    throw error;
  }

  /**
   * Health check NGSER (utile pour monitoring)
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
