import { AuditLogger } from '../audit/audit.logger';

export interface QueueItem {
  provider: string;
  payload: any;
  received_at: Date;
  headers: any;
}

export type QueueProcessor = (item: QueueItem) => Promise<void>;

/**
 * File d'attente simple en mémoire pour le traitement asynchrone des IPN.
 * En production, remplacer par Redis/Bull ou autre solution persistante.
 */
export class IpnQueueService {
  private queue: QueueItem[] = [];
  private processing = false;
  private processor?: QueueProcessor;
  private readonly audit: AuditLogger;

  constructor(audit?: AuditLogger) {
    this.audit = audit || new AuditLogger();
  }

  /**
   * Enregistre le processor qui traitera les items de la queue
   */
  setProcessor(processor: QueueProcessor) {
    this.processor = processor;
  }

  /**
   * Ajoute un item à la queue et démarre le traitement
   */
  async enqueue(item: QueueItem): Promise<void> {
    this.queue.push(item);

    await this.audit.info('IPN_ENQUEUED', {
      provider: item.provider,
      queue_length: this.queue.length,
    });

    // Démarrer le traitement si pas déjà en cours
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Traite les items de la queue de manière asynchrone
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        if (this.processor) {
          await this.processor(item);
        } else {
          await this.audit.error('IPN_NO_PROCESSOR', {
            provider: item.provider,
          });
        }
      } catch (error: any) {
        await this.audit.error('IPN_PROCESSING_ERROR', {
          provider: item.provider,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    this.processing = false;
  }

  /**
   * Retourne la longueur actuelle de la queue (pour tests/monitoring)
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}
