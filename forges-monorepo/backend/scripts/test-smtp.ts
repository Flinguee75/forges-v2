/**
 * Script de test SMTP réel — à exécuter manuellement uniquement
 * Usage: npx ts-node scripts/test-smtp.ts <email-destinataire>
 *
 * Vérifie que sendTempPassword fonctionne avec la config SMTP du .env
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { EmailService } from '../src/shared/email/email.service';

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npx ts-node scripts/test-smtp.ts <email-destinataire>');
    process.exit(1);
  }

  console.log('Config SMTP :');
  console.log('  HOST :', process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST);
  console.log('  PORT :', process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT);
  console.log('  USER :', process.env.SMTP_USER || process.env.BREVO_SMTP_USER);
  console.log('  SECURE:', process.env.SMTP_SECURE || process.env.BREVO_SMTP_SECURE);
  console.log('');

  const emailService = new EmailService();
  const tempPassword = 'ForgesTest2026!';

  console.log(`Envoi sendTempPassword vers ${to} ...`);
  try {
    await emailService.sendTempPassword(to, tempPassword, 'FR');
    console.log('OK — email envoyé avec succes.');
  } catch (err: any) {
    console.error('ECHEC sendTempPassword :', err.message || err);
    process.exit(1);
  }
}

main();
