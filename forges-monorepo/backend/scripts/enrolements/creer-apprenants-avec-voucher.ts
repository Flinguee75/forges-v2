/**
 * FORGES — Script d'enrôlement apprenants avec voucher CSV
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-avec-voucher.ts --file /Users/tidianecisse/Downloads/apprenants\ avec\ voucher.csv --formation frm-123 --session ses-456
 *   node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-avec-voucher.ts --file /Users/tidianecisse/Downloads/apprenants\ avec\ voucher.csv --formation frm-123 --session ses-456 --row 3
 *   node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-avec-voucher.ts --file /Users/tidianecisse/Downloads/apprenants\ avec\ voucher.csv --formation frm-123 --session ses-456 --limit 1 --dry-run
 *
 * Variables d'environnement:
 *   DATABASE_URL           Obligatoire.
 *   DRY_RUN=true           Simule sans ecrire en base.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { EmailService } from '../../src/shared/email/email.service';
import { AuditLogger } from '../../src/shared/audit/audit.logger';
import { DossierRepository } from '../../src/modules/inscriptions/dossier.repository';
import { SessionRepository } from '../../src/modules/sessions/session.repository';
import { FormationRepository } from '../../src/modules/formations/formation.repository';
import { VoucherValidationService } from '../../src/modules/vouchers/voucher-validation.service';
import { VoucherRepository } from '../../src/modules/vouchers/voucher.repository';
import { AbonnementRetailRepository } from '../../src/modules/abonnements/retail/abonnement-retail.repository';
import { InscriptionService } from '../../src/modules/inscriptions/inscription.service';
import {
  buildInscriptionVoucherInput,
  parseCsvApprenantsAvecVoucher,
} from '../../src/shared/enrolements/creer-apprenants-avec-voucher.helpers';

const args = process.argv.slice(2);
const fileFlag = args.indexOf('--file');
const formationFlag = args.indexOf('--formation');
const sessionFlag = args.indexOf('--session');
const rowFlag = args.indexOf('--row');
const limitFlag = args.indexOf('--limit');
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';

if (fileFlag === -1 || !args[fileFlag + 1]) {
  console.error('Usage: creer-apprenants-avec-voucher.ts --file <chemin/vers/fichier.csv> --formation <id> --session <id> [--row <ligne>] [--limit <n>] [--dry-run]');
  process.exit(1);
}

if (formationFlag === -1 || !args[formationFlag + 1]) {
  console.error('Usage: creer-apprenants-avec-voucher.ts --file <chemin/vers/fichier.csv> --formation <id> --session <id> [--row <ligne>] [--limit <n>] [--dry-run]');
  process.exit(1);
}

if (sessionFlag === -1 || !args[sessionFlag + 1]) {
  console.error('Usage: creer-apprenants-avec-voucher.ts --file <chemin/vers/fichier.csv> --formation <id> --session <id> [--row <ligne>] [--limit <n>] [--dry-run]');
  process.exit(1);
}

const inputPath = path.resolve(__dirname, args[fileFlag + 1]);
const targetFormationId = args[formationFlag + 1];
const targetSessionId = args[sessionFlag + 1];
const selectedRow = rowFlag !== -1 ? Number(args[rowFlag + 1]) : null;
const selectedLimit = limitFlag !== -1 ? Number(args[limitFlag + 1]) : null;
const LOG_FILE = path.join(__dirname, 'creer_apprenants_avec_voucher_log.json');

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('DATABASE_URL requis');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const emailService = new EmailService();
const audit = new AuditLogger(prisma);
const dossierRepo = new DossierRepository(prisma);
const sessionRepo = new SessionRepository(prisma);
const formationRepo = new FormationRepository(prisma);
const voucherRepo = new VoucherRepository(prisma);
const voucherValidation = new VoucherValidationService(voucherRepo);
const retailRepo = new AbonnementRetailRepository(prisma);
const inscriptionService = new InscriptionService(
  dossierRepo,
  sessionRepo,
  formationRepo,
  voucherValidation,
  retailRepo,
  audit,
  emailService,
  prisma
);

const logs: Array<{ level: string; message: string; data: Record<string, unknown>; ts: string }> = [];

function log(level: string, message: string, data: Record<string, unknown> = {}) {
  const entry = { level, message, data, ts: new Date().toISOString() };
  logs.push(entry);
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SKIP' ? '⏭️' : level === 'DRY' ? '🟦' : '✅';
  console.log(`${prefix} [${level}] ${message}`, Object.keys(data).length ? JSON.stringify(data) : '');
}

function saveLogs() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  console.log(`\n📄 Log sauvegardé : ${LOG_FILE}`);
}

function loadCsvApprenants(csvFilePath: string) {
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  return parseCsvApprenantsAvecVoucher(csvContent);
}


async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Fichier introuvable: ${inputPath}`);
    process.exit(1);
  }

  if (selectedRow !== null && (!Number.isInteger(selectedRow) || selectedRow < 2)) {
    console.error('--row doit être un numéro de ligne CSV >= 2');
    process.exit(1);
  }

  if (selectedLimit !== null && (!Number.isInteger(selectedLimit) || selectedLimit <= 0)) {
    console.error('--limit doit être un entier strictement positif');
    process.exit(1);
  }

  const apprenants = loadCsvApprenants(inputPath);
  const rows = selectedRow !== null
    ? apprenants.filter((row) => row.lineNumber === selectedRow)
    : selectedLimit !== null
      ? apprenants.slice(0, selectedLimit)
      : apprenants;

  if (rows.length === 0) {
    console.error('Aucune ligne ne correspond au filtre fourni.');
    process.exit(1);
  }

  const formation = await prisma.formation.findUnique({
    where: { id: targetFormationId },
    select: { id: true, intitule: true, type_formation: true },
  });

  if (!formation) {
    throw new Error(`FORMATION_INTRouvable: ${targetFormationId}`);
  }

  const session = await prisma.session.findUnique({
    where: { id: targetSessionId },
    select: { id: true, date_debut: true, date_fin: true, lieu: true, formation_id: true },
  });

  if (!session) {
    throw new Error(`SESSION_INTRouvable: ${targetSessionId}`);
  }

  if (session.formation_id !== formation.id) {
    throw new Error(`SESSION_NON_ASSOCIEE_A_LA_FORMATION: session=${session.id} formation=${formation.id}`);
  }

  console.log('\n' + '═'.repeat(72));
  console.log('  FORGES — Script apprenants avec voucher CSV');
  console.log(`  Mode : ${dryRun ? '🔵 DRY-RUN (simulation)' : '🔴 EXÉCUTION RÉELLE'}`);
  console.log(`  CSV  : ${path.relative(process.cwd(), inputPath)}`);
  console.log(`  Formation cible : ${formation.intitule} (${formation.id})`);
  console.log(`  Session cible    : ${session.id}`);
  console.log(`  Lignes retenues  : ${rows.length}`);
  if (selectedRow !== null) console.log(`  Ligne ciblée     : ${selectedRow}`);
  if (selectedLimit !== null) console.log(`  Limite           : ${selectedLimit}`);
  console.log('═'.repeat(72) + '\n');

  const summary = {
    created: 0,
    skippedExisting: 0,
    skippedMissing: 0,
    errors: 0,
  };

  for (const row of rows) {
    try {
      const apprenant = await prisma.apprenant.findUnique({
        where: { email: row.email },
        select: {
          id: true,
          email: true,
          nom: true,
          prenoms: true,
          organisation: {
            select: {
              raison_sociale: true,
            },
          },
        },
      });

      if (!apprenant) {
        summary.skippedMissing += 1;
        log('SKIP', 'Apprenant introuvable', { line: row.lineNumber, email: row.email });
        continue;
      }

      const existing = await prisma.dossier.findFirst({
        where: {
          apprenant_id: apprenant.id,
          formation_id: formation.id,
          session_id: session.id,
          statut: { notIn: ['ANNULE', 'REJETE'] },
        },
        select: { id: true, statut: true },
      });

      if (existing) {
        summary.skippedExisting += 1;
        log('SKIP', 'Dossier déjà existant', {
          line: row.lineNumber,
          email: row.email,
          dossier_id: existing.id,
          statut: existing.statut,
        });
        continue;
      }

      const inscriptionInput = buildInscriptionVoucherInput({
        sessionId: session.id,
        apprenantId: apprenant.id,
        voucher: row.voucher,
      });

      const inscription = dryRun
        ? {
            id: `DRY-DOSSIER-${apprenant.id.slice(-6)}`,
            statut: 'PAYE_DIRECTEMENT',
            montant_total: 0,
            montant_apres_reduction: 0,
          }
        : await inscriptionService.inscrire(inscriptionInput);

      summary.created += 1;
      log(dryRun ? 'DRY' : 'OK', 'Dossier créé', {
        line: row.lineNumber,
        email: row.email,
        nom: `${row.nom} ${row.prenom}`,
        voucher: row.voucher || 'AUCUN',
        dossier_id: inscription.id,
        statut: inscription.statut,
        montant_total: inscription.montant_total,
        montant_apres_reduction: inscription.montant_apres_reduction,
      });
    } catch (error: any) {
      summary.errors += 1;
      log('ERROR', 'Erreur pendant l’enrôlement', {
        line: row.lineNumber,
        email: row.email,
        voucher: row.voucher || null,
        error: error?.message || String(error),
      });
    }
  }

  console.log('\n=== Résumé ===');
  console.log(`Créés              : ${summary.created}`);
  console.log(`Déjà existants     : ${summary.skippedExisting}`);
  console.log(`Apprenants absents : ${summary.skippedMissing}`);
  console.log(`Erreurs            : ${summary.errors}`);

  if (dryRun) {
    console.log('\n[DRY-RUN] Aucune donnée écrite en base.');
  }

  saveLogs();
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur enrôlement voucher:', err.message);
    saveLogs();
    prisma.$disconnect();
    process.exit(1);
  });
