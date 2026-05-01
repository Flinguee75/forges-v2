import { NgserClient } from '../ngser.client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { ngserCircuitBreaker } from '../../../shared/circuit-breaker/circuit-breaker.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NgserClient - Client HTTP NGSER', () => {
  let ngserClient: NgserClient;
  let audit: AuditLogger;
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
    audit = new AuditLogger(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ngserCircuitBreaker.reset();

    // Variables d'environnement de test
    process.env.NGSER_BASE_URL = 'https://securetest.crossroad-africa.net/';
    process.env.NGSER_NAME = 'FORGES';
    process.env.NGSER_AUTHENTICATION_TOKEN = 'test-auth-token';
    process.env.NGSER_AUTH_TOKEN = 'test-auth';
    process.env.NGSER_OPERATION_TOKEN_PAIEMENT = 'test-operation-token';
    process.env.NGSER_REQUEST_TIMEOUT_MS = '30000';

    // Mock axios.create
    const mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    ngserClient = new NgserClient(audit);
  });

  describe('Initialisation', () => {
    it('doit créer une instance avec les credentials', () => {
      expect(ngserClient).toBeDefined();
    });

    it('doit rejeter si credentials manquants', () => {
      delete process.env.NGSER_AUTHENTICATION_TOKEN;
      delete process.env.NGSER_AUTH_TOKEN;

      expect(() => new NgserClient(audit)).toThrow('NGSER_CREDENTIALS_MISSING');
    });

    it('doit accepter NGSER_AUTH_TOKEN comme credential canonique unique', () => {
      delete process.env.NGSER_AUTHENTICATION_TOKEN;

      expect(() => new NgserClient(audit)).not.toThrow();
    });
  });

  describe('createSession - Création session paiement', () => {
    it('doit créer une session NGSER avec succès', async () => {
      const mockResponse = {
        data: {
          payment_token: 'token-ngser-12345',
          payment_url: 'https://securetest.crossroad-africa.net/pay?token=12345',
          expired_url: 'https://securetest.crossroad-africa.net/expired?token=12345',
        },
        status: 200,
        config: { url: '/v3/sessions' },
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ngserClient.createSession({
        order: 'FRG-2026-120-ABCDEF',
        amount: 150000,
        currency: 'XOF',
        notification_url: 'http://localhost:3000/webhooks/paiement',
        customer_email: 'test@example.com',
      });

      expect(result.payment_token).toBe('token-ngser-12345');
      expect(result.payment_url).toContain('securetest.crossroad-africa.net');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v3/sessions',
        expect.objectContaining({
          name: 'FORGES',
          order: 'FRG-2026-120-ABCDEF',
          transaction_amount: 150000,
          currency: 'xof',
        })
      );
    });

    it('doit rejeter si payment_url manquant dans la réponse', async () => {
      const mockResponse = {
        data: { payment_token: 'token-12345' },
        status: 200,
        config: { url: '/v3/sessions' },
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(
        ngserClient.createSession({
          order: 'FRG-2026-120-ABCDEF',
          amount: 150000,
          currency: 'XOF',
          notification_url: 'http://localhost:3000/webhooks/paiement',
        })
      ).rejects.toThrow('NGSER_INVALID_RESPONSE');
    });

    it('doit gérer timeout NGSER', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
        isAxiosError: true,
        config: { url: '/v3/sessions' },
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        ngserClient.createSession({
          order: 'FRG-2026-120-TIMEOUT',
          amount: 150000,
          currency: 'XOF',
          notification_url: 'http://localhost:3000/webhooks/paiement',
        })
      ).rejects.toThrow('NGSER_TIMEOUT');
    });

    it('doit gérer erreur 401 authentification', async () => {
      const authError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Invalid credentials' },
        },
        config: { url: '/v3/sessions' },
        message: 'Request failed with status code 401',
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockRejectedValue(authError);

      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        ngserClient.createSession({
          order: 'FRG-2026-120-AUTH',
          amount: 150000,
          currency: 'XOF',
          notification_url: 'http://localhost:3000/webhooks/paiement',
        })
      ).rejects.toThrow('NGSER_AUTHENTICATION_ERROR');
    });

    it('doit gérer erreur 500 serveur NGSER', async () => {
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
        },
        config: { url: '/v3/sessions' },
        message: 'Request failed with status code 500',
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockRejectedValue(serverError);

      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        ngserClient.createSession({
          order: 'FRG-2026-120-SERVER',
          amount: 150000,
          currency: 'XOF',
          notification_url: 'http://localhost:3000/webhooks/paiement',
        })
      ).rejects.toThrow('NGSER_SERVER_ERROR: 500');
    });

    it('doit gérer erreur réseau (pas de réponse)', async () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        code: 'ENETUNREACH',
        config: { url: '/v3/sessions' },
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockRejectedValue(networkError);

      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        ngserClient.createSession({
          order: 'FRG-2026-120-NETWORK',
          amount: 150000,
          currency: 'XOF',
          notification_url: 'http://localhost:3000/webhooks/paiement',
        })
      ).rejects.toThrow('NGSER_NETWORK_ERROR');
    });
  });

  describe('getStatus - Réconciliation statut paiement', () => {
    it('doit récupérer le statut SUCCESS avec transaction_id', async () => {
      const mockResponse = {
        data: {
          order: 'FRG-2026-120-ABCDEF',
          status: 'SUCCESS',
          code: '1',
          transaction_id: 'TXN-NGSER-12345',
          amount: 150000,
          wallet: 'ORANGE_MONEY',
          payment_date: '2026-04-29T10:30:00Z',
        },
        status: 200,
        config: { url: '/v3/check-status' },
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ngserClient.getStatus({
        order: 'FRG-2026-120-ABCDEF',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.code).toBe('1');
      expect(result.transaction_id).toBe('TXN-NGSER-12345');
      expect(result.amount).toBe(150000);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v3/check-status',
        expect.objectContaining({
          name: 'FORGES',
          order: 'FRG-2026-120-ABCDEF',
        })
      );
    });

    it('doit récupérer le statut PENDING', async () => {
      const mockResponse = {
        data: {
          order: 'FRG-2026-120-PENDING',
          status: 'PENDING',
          code: '3',
        },
        status: 200,
        config: { url: '/v3/check-status' },
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ngserClient.getStatus({
        order: 'FRG-2026-120-PENDING',
      });

      expect(result.status).toBe('PENDING');
      expect(result.code).toBe('3');
    });

    it('doit récupérer le statut FAIL', async () => {
      const mockResponse = {
        data: {
          order: 'FRG-2026-120-FAIL',
          status: 'FAIL',
          code: '0',
        },
        status: 200,
        config: { url: '/v3/check-status' },
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ngserClient.getStatus({
        order: 'FRG-2026-120-FAIL',
      });

      expect(result.status).toBe('FAIL');
      expect(result.code).toBe('0');
    });

    it('doit gérer order_ngser inexistant (404)', async () => {
      const notFoundError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Order not found' },
        },
        config: { url: '/v3/check-status' },
        message: 'Request failed with status code 404',
      };

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.post.mockRejectedValue(notFoundError);

      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        ngserClient.getStatus({ order: 'FRG-INEXISTANT' })
      ).rejects.toThrow('NGSER_NOT_FOUND');
    });
  });

  describe('healthCheck - Monitoring NGSER', () => {
    it('doit retourner true si NGSER répond', async () => {
      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await ngserClient.healthCheck();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', { timeout: 5000 });
    });

    it('doit retourner false si NGSER ne répond pas', async () => {
      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await ngserClient.healthCheck();

      expect(result).toBe(false);
    });
  });
});
