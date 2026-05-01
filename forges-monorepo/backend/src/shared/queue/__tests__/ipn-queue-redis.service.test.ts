const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  lPush: jest.fn(),
  rPush: jest.fn(),
  rPopLPush: jest.fn(),
  lRem: jest.fn(),
  lLen: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

const mockAuditInfo = jest.fn();
const mockAuditError = jest.fn();

jest.mock('../../audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    info: mockAuditInfo,
    error: mockAuditError,
  })),
}));

import { IpnQueueRedisService } from '../ipn-queue-redis.service';

async function waitForExpectation(assertion: () => void) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
  throw lastError;
}

describe('IpnQueueRedisService', () => {
  const item = {
    provider: 'NGSER',
    payload: { order_ngser: 'FRG-2026-001-AAAAAA' },
    received_at: new Date('2026-05-01T00:00:00Z'),
    headers: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.IPN_QUEUE_MAX_RETRIES = '3';
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.disconnect.mockResolvedValue(undefined);
    mockRedisClient.lPush.mockResolvedValue(1);
    mockRedisClient.rPush.mockResolvedValue(1);
    mockRedisClient.lRem.mockResolvedValue(1);
    mockRedisClient.lLen.mockResolvedValue(1);
    mockRedisClient.rPopLPush.mockReset();
    mockAuditInfo.mockResolvedValue(undefined);
    mockAuditError.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.IPN_QUEUE_MAX_RETRIES;
  });

  it('enqueue dans Redis et déclenche le traitement', async () => {
    mockRedisClient.rPopLPush
      .mockResolvedValueOnce(JSON.stringify(item))
      .mockResolvedValueOnce(null);
    const processor = jest.fn().mockResolvedValue(undefined);
    const queue = new IpnQueueRedisService();
    queue.setProcessor(processor);

    await queue.enqueue(item);

    expect(mockRedisClient.lPush).toHaveBeenCalledWith('forges:ipn:queue', JSON.stringify(item));
    await waitForExpectation(() => {
      expect(processor).toHaveBeenCalledWith(expect.objectContaining({ provider: 'NGSER' }));
      expect(mockRedisClient.lRem).toHaveBeenCalledWith('forges:ipn:processing', 1, JSON.stringify(item));
    });
  });

  it('retry puis envoie en DLQ après échecs processor', async () => {
    const raw = JSON.stringify(item);
    mockRedisClient.rPopLPush
      .mockResolvedValueOnce(raw)
      .mockResolvedValueOnce(null);
    const processor = jest.fn().mockRejectedValue(new Error('boom'));
    const queue = new IpnQueueRedisService();
    queue.setProcessor(processor);

    await queue.processQueue();

    expect(processor).toHaveBeenCalledTimes(3);
    expect(mockRedisClient.rPush).toHaveBeenCalledWith(
      'forges:ipn:dlq',
      expect.stringContaining('"error":"boom"')
    );
    expect(mockRedisClient.lRem).toHaveBeenCalledWith('forges:ipn:processing', 1, raw);
    expect(mockAuditError).toHaveBeenCalledWith(
      'IPN_MOVED_TO_DLQ_REDIS',
      expect.objectContaining({ provider: 'NGSER', error: 'boom' })
    );
  });
});
