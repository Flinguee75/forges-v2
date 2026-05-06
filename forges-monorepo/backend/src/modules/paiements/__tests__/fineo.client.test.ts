import { FineoClient } from '../fineo.client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FineoClient — client HTTP FineoPay', () => {
  let client: FineoClient;
  let audit: AuditLogger;
  let prisma: PrismaClient;
  let mockAxiosInstance: any;

  beforeAll(() => {
    prisma = new PrismaClient();
    audit = new AuditLogger(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.FINEO_BASE_URL = 'https://dev.fineopay.com/api/v1/business/dev';
    process.env.FINEO_BUSINESS_CODE = 'test_business_code';
    process.env.FINEO_API_KEY = 'test_api_key';

    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new FineoClient(audit);
  });

  describe('Initialisation', () => {
    it('doit créer une instance avec les credentials', () => {
      expect(client).toBeDefined();
    });

    it('doit rejeter si FINEO_BUSINESS_CODE manquant', () => {
      delete process.env.FINEO_BUSINESS_CODE;
      expect(() => new FineoClient(audit)).toThrow('FINEO_CREDENTIALS_MISSING');
    });

    it('doit rejeter si FINEO_API_KEY manquant', () => {
      delete process.env.FINEO_API_KEY;
      expect(() => new FineoClient(audit)).toThrow('FINEO_CREDENTIALS_MISSING');
    });
  });

  describe('createCheckoutLink', () => {
    it('doit générer un lien de paiement avec succès', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          success: true,
          data: { checkoutLink: 'https://demo.fineopay.com/checkout/abc123' },
        },
        status: 200,
        config: { url: '/checkout-link' },
      });

      const result = await client.createCheckoutLink({
        title: 'Formation Test',
        amount: 50000,
        callbackUrl: 'https://api.forges.ci/webhooks/fineo',
        syncRef: 'FRG-FNO-2026-001-AABBCC',
      });

      expect(result.checkoutLink).toBe('https://demo.fineopay.com/checkout/abc123');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/checkout-link',
        expect.objectContaining({
          amount: 50000,
          syncRef: 'FRG-FNO-2026-001-AABBCC',
        })
      );
    });

    it('doit lever FINEO_INVALID_RESPONSE si checkoutLink absent', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: {} },
        status: 200,
        config: { url: '/checkout-link' },
      });

      await expect(
        client.createCheckoutLink({
          title: 'Test',
          amount: 50000,
          callbackUrl: 'https://api.forges.ci/webhooks/fineo',
          syncRef: 'FRG-FNO-2026-001-AABBCC',
        })
      ).rejects.toThrow('FINEO_INVALID_RESPONSE');
    });

    it('doit lever FINEO_AUTHENTICATION_ERROR sur 401', async () => {
      const err: any = new Error('401');
      err.isAxiosError = true;
      err.response = { status: 401 };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(err);

      await expect(
        client.createCheckoutLink({
          title: 'Test',
          amount: 50000,
          callbackUrl: 'https://api.forges.ci/webhooks/fineo',
          syncRef: 'FRG-FNO-2026-001-AABBCC',
        })
      ).rejects.toThrow('FINEO_AUTHENTICATION_ERROR');
    });
  });

  describe('getTransaction — double vérification sécurité', () => {
    it('doit retourner les données de la transaction', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            reference: 'REF-001',
            amount: 50000,
            status: 'success',
            canal: 'orange',
            fees: 500,
            direction: 'cashin',
            date: '2026-05-06T14:00:00Z',
          },
        },
        status: 200,
        config: { url: '/transactions/REF-001' },
      });

      const result = await client.getTransaction('REF-001');

      expect(result.reference).toBe('REF-001');
      expect(result.status).toBe('success');
      expect(result.amount).toBe(50000);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/transactions/REF-001');
    });

    it('doit lever FINEO_NOT_FOUND si référence inconnue', async () => {
      const err: any = new Error('404');
      err.isAxiosError = true;
      err.response = { status: 404 };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(err);

      await expect(client.getTransaction('REF-INCONNUE')).rejects.toThrow('FINEO_NOT_FOUND');
    });
  });
});
