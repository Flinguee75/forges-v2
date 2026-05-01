import { createHmac } from 'crypto';
import { PrismaClient } from '@prisma/client';

export class AuditLogger {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async log(level: string, action: string, metadata: any, userId?: string) {
    const hmac = createHmac('sha256', process.env.HMAC_KEY || 'default-dev-key')
      .update(JSON.stringify(metadata))
      .digest('hex');

    const logEntry = {
      level,
      action,
      metadata: metadata || {},
      hmac,
      user_id: userId,
      timestamp: new Date(),
    };

    // Always log to console for immediate visibility
    console.log(JSON.stringify(logEntry));

    // Persist to database (RM-162, MT-01)
    try {
      await this.prisma.auditLog.create({
        data: {
          level,
          action,
          metadata: metadata || {},
          hmac,
          user_id: userId,
        },
      });
    } catch (error) {
      console.error('Failed to persist audit log:', error);
      // Don't throw - audit logging should not break business logic
    }
  }

  async info(action: string, metadata: any, userId?: string) {
    return this.log('INFO', action, metadata, userId);
  }

  async warning(action: string, metadata: any, userId?: string) {
    return this.log('WARNING', action, metadata, userId);
  }

  async error(action: string, metadata: any, userId?: string) {
    return this.log('ERROR', action, metadata, userId);
  }
}
