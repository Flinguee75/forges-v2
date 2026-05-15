/**
 * FORGES — Envoi emails de confirmation d'enrôlement depuis un CSV
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/enrolements/envoyer-confirmations-csv.ts --file /chemin/vers/apprenants.csv --formation frm-123 --session ses-456
 *   node -r ts-node/register/transpile-only scripts/enrolements/envoyer-confirmations-csv.ts --file /chemin/vers/apprenants.csv --formation frm-123 --session ses-456 --dry-run
 *   node -r ts-node/register/transpile-only scripts/enrolements/envoyer-confirmations-csv.ts --file /chemin/vers/apprenants.csv --formation frm-123 --session ses-456 --row 3
 *   node -r ts-node/register/transpile-only scripts/enrolements/envoyer-confirmations-csv.ts --file /chemin/vers/apprenants.csv --formation frm-123 --session ses-456 --limit 10
 *
 * Variables d'environnement:
 *   DATABASE_URL           Obligatoire.
 *   EMAIL_TEST_OVERRIDE    Si défini, tous les mails sont envoyés à cette adresse.
 *   DRY_RUN=true           Simule sans envoyer.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { EmailService } from '../../src/shared/email/email.service';
import { parseCsvApprenantsAvecVoucher } from '../../src/shared/enrolements/creer-apprenants-avec-voucher.helpers';

const args = process.argv.slice(2);
const fileFlag = args.indexOf('--file');
const formationFlag = args.indexOf('--formation');
const sessionFlag = args.indexOf('--session');
const rowFlag = args.indexOf('--row');
const limitFlag = args.indexOf('--limit');
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
const EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE || null;

if (fileFlag === -1 || !args[fileFlag + 1]) {
  console.error('Usage: envoyer-confirmations-csv.ts --file <fichier.csv> --formation <id> --session <id> [--row <n>] [--limit <n>] [--dry-run]');
  process.exit(1);
}
if (formationFlag === -1 || !args[formationFlag + 1]) {
  console.error('--formation requis');
  process.exit(1);
}
if (sessionFlag === -1 || !args[sessionFlag + 1]) {
  console.error('--session requis');
  process.exit(1);
}

const inputPath = path.resolve(__dirname, args[fileFlag + 1]);
const targetFormationId = args[formationFlag + 1];
const targetSessionId = args[sessionFlag + 1];
const selectedRow = rowFlag !== -1 ? Number(args[rowFlag + 1]) : null;
const selectedLimit = limitFlag !== -1 ? Number(args[limitFlag + 1]) : null;
const LOG_FILE = path.join(__dirname, 'envoyer_confirmations_csv_log.json');

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('DATABASE_URL requis');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const emailService = new EmailService();

const logs: Array<{ level: string; message: string; data: Record<string, unknown>; ts: string }> = [];

function log(level: string, message: string, data: Record<string, unknown> = {}) {
  const entry = { level, message, data, ts: new Date().toISOString() };
  logs.push(entry);
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SKIP' ? '⏭️' : level === 'DRY' ? '🟦' : '✅';
  console.log(`${prefix} [${level}] ${message}`, Object.keys(data).length ? JSON.stringify(data) : '');
}

function saveLogs() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  console.log(`\nLog sauvegarde : ${LOG_FILE}`);
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Fichier introuvable: ${inputPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  const apprenants = parseCsvApprenantsAvecVoucher(csvContent);

  const rows = selectedRow !== null
    ? apprenants.filter((r) => r.lineNumber === selectedRow)
    : selectedLimit !== null
      ? apprenants.slice(0, selectedLimit)
      : apprenants;

  if (rows.length === 0) {
    console.error('Aucune ligne ne correspond au filtre fourni.');
    process.exit(1);
  }

  const formation = await prisma.formation.findUnique({
    where: { id: targetFormationId },
    select: { id: true, intitule: true },
  });
  if (!formation) {
    throw new Error(`FORMATION_INTROUVABLE: ${targetFormationId}`);
  }

  const session = await prisma.session.findUnique({
    where: { id: targetSessionId },
    select: { id: true, date_debut: true, date_fin: true, lieu: true, formation_id: true },
  });
  if (!session) {
    throw new Error(`SESSION_INTROUVABLE: ${targetSessionId}`);
  }
  if (session.formation_id !== formation.id) {
    throw new Error(`SESSION_NON_ASSOCIEE_A_LA_FORMATION: session=${session.id} formation=${formation.id}`);
  }

  console.log('\n' + '='.repeat(72));
  console.log('  FORGES — Envoi confirmations enrolement CSV');
  console.log(`  Mode : ${dryRun ? 'DRY-RUN (simulation)' : 'EXECUTION REELLE'}`);
  if (EMAIL_OVERRIDE) console.log(`  Override email -> ${EMAIL_OVERRIDE}`);
  console.log(`  CSV       : ${path.relative(process.cwd(), inputPath)}`);
  console.log(`  Formation : ${formation.intitule} (${formation.id})`);
  console.log(`  Session   : ${session.id}`);
  console.log(`  Lignes    : ${rows.length}`);
  console.log('='.repeat(72) + '\n');

  const summary = { sent: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      const apprenant = await prisma.apprenant.findUnique({
        where: { email: row.email },
        select: {
          id: true,
          email: true,
          nom: true,
          prenoms: true,
          organisation: { select: { raison_sociale: true } },
        },
      });

      if (!apprenant) {
        summary.skipped += 1;
        log('SKIP', 'Apprenant introuvable en base', { line: row.lineNumber, email: row.email });
        continue;
      }

      const destinataire = EMAIL_OVERRIDE || apprenant.email;
      const organisation = apprenant.organisation?.raison_sociale || '';

      if (dryRun) {
        summary.sent += 1;
        log('DRY', 'Email simule', { line: row.lineNumber, email: row.email, to: destinataire });
        continue;
      }

      await emailService.sendEnrolementConfirmationApprenant({
        to: destinataire,
        prenoms: apprenant.prenoms,
        nom: apprenant.nom,
        organisation,
        formation: formation.intitule,
        session: {
          date_debut: session.date_debut,
          date_fin: session.date_fin,
          lieu: session.lieu || null,
        },
      });

      summary.sent += 1;
      log('OK', 'Email envoye', {
        line: row.lineNumber,
        email: apprenant.email,
        to: destinataire,
        nom: `${apprenant.prenoms} ${apprenant.nom}`,
      });
    } catch (error: any) {
      summary.errors += 1;
      log('ERROR', 'Erreur envoi email', {
        line: row.lineNumber,
        email: row.email,
        error: error?.message || String(error),
      });
    }
  }

  console.log('\n=== Resume ===');
  console.log(`Envoyes  : ${summary.sent}`);
  console.log(`Skipped  : ${summary.skipped}`);
  console.log(`Erreurs  : ${summary.errors}`);
  if (dryRun) console.log('\n[DRY-RUN] Aucun email envoye.');

  saveLogs();
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur envoi confirmations:', err.message);
    saveLogs();
    prisma.$disconnect();
    process.exit(1);
  });
