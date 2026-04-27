import { createHmac } from 'crypto';
export class AuditLogger {
  async log(level: string, action: string, data: any) {
    const hmac = createHmac('sha256', process.env.HMAC_KEY!).update(JSON.stringify(data)).digest('hex');
    console.log(JSON.stringify({ level, action, data, hmac, timestamp: new Date().toISOString() }));
  }
  async info(action: string, data: any) { return this.log('INFO', action, data); }
  async warning(action: string, data: any) { return this.log('WARNING', action, data); }
  async error(action: string, data: any) { return this.log('ERROR', action, data); }
}
