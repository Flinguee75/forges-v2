import { createClient, RedisClientType } from 'redis';
import { AuditLogger } from '../audit/audit.logger';
import { QueueItem, QueueProcessor } from './ipn-queue.service';

interface FailedQueueItem extends QueueItem {
  error: string;
  failed_at: string;
}

/**
 * File IPN persistante Redis.
 *
 * Utilise une liste de travail séparée pour éviter de perdre un item entre
 * le pop et le traitement. Après 3 échecs, l'item part en dead-letter queue.
 */
export class IpnQueueRedisService {
  private readonly redisClient: RedisClientType;
  private readonly queueKey = process.env.IPN_REDIS_QUEUE_KEY || 'forges:ipn:queue';
  private readonly processingKey = process.env.IPN_REDIS_PROCESSING_KEY || 'forges:ipn:processing';
  private readonly dlqKey = process.env.IPN_REDIS_DLQ_KEY || 'forges:ipn:dlq';
  private readonly maxRetries = Number(process.env.IPN_QUEUE_MAX_RETRIES || 3);
  private readonly audit: AuditLogger;
  private processor?: QueueProcessor;
  private connected = false;
  private processing = false;

  constructor(audit?: AuditLogger, redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.audit = audit || new AuditLogger();
    this.redisClient = createClient({ url: redisUrl }) as RedisClientType;
  }

  setProcessor(processor: QueueProcessor) {
    this.processor = processor;
  }

  async enqueue(item: QueueItem): Promise<void> {
    await this.ensureConnected();
    await this.redisClient.lPush(this.queueKey, JSON.stringify(item));
    const queueLength = await this.redisClient.lLen(this.queueKey);

    await this.audit.info('IPN_ENQUEUED_REDIS', {
      provider: item.provider,
      queue_length: queueLength,
    });

    if (!this.processing) {
      void this.processQueue().catch((error: any) => {
        void this.audit.error('IPN_QUEUE_REDIS_PROCESSING_FAILED', {
          error: error.message,
        });
      });
    }
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      await this.ensureConnected();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const itemStr = await this.redisClient.rPopLPush(this.queueKey, this.processingKey);
        if (!itemStr) break;

        const item = JSON.parse(itemStr) as QueueItem;
        const processed = await this.processItem(item, itemStr);

        if (processed) {
          await this.redisClient.lRem(this.processingKey, 1, itemStr);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  async getQueueLength(): Promise<number> {
    await this.ensureConnected();
    return this.redisClient.lLen(this.queueKey);
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.redisClient.disconnect();
      this.connected = false;
    }
  }

  private async processItem(item: QueueItem, rawItem: string): Promise<boolean> {
    if (!this.processor) {
      await this.moveToDlq(item, rawItem, 'IPN_NO_PROCESSOR');
      return false;
    }

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        await this.processor(item);
        await this.audit.info('IPN_PROCESSED_REDIS', {
          provider: item.provider,
          attempts: attempt + 1,
        });
        return true;
      } catch (error: any) {
        attempt += 1;
        await this.audit.error('IPN_PROCESSING_RETRY_REDIS', {
          provider: item.provider,
          attempt,
          max_retries: this.maxRetries,
          error: error.message,
        });

        if (attempt >= this.maxRetries) {
          await this.moveToDlq(item, rawItem, error.message);
          return false;
        }

        await this.wait(Math.pow(2, attempt) * 1000);
      }
    }

    return false;
  }

  private async moveToDlq(item: QueueItem, rawItem: string, error: string): Promise<void> {
    const failedItem: FailedQueueItem = {
      ...item,
      error,
      failed_at: new Date().toISOString(),
    };

    await this.redisClient.rPush(this.dlqKey, JSON.stringify(failedItem));
    await this.redisClient.lRem(this.processingKey, 1, rawItem);

    await this.audit.error('IPN_MOVED_TO_DLQ_REDIS', {
      provider: item.provider,
      error,
      dlq_key: this.dlqKey,
    });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.redisClient.connect();
      this.connected = true;
    }
  }

  private wait(ms: number): Promise<void> {
    if (process.env.NODE_ENV === 'test') return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
