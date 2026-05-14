/**
 * Script manuel de test de l'envoi du reçu de paiement par email.
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/test-recu-email.ts --dossier <dossier_id>
 *   EMAIL_TEST_OVERRIDE=you@example.com node -r ts-node/register/transpile-only scripts/test-recu-email.ts --dossier <dossier_id>
 *
 * Options:
 *   --dry-run   Vérifie le dossier et le paiement sans déclencher l'envoi.
 *
 * Ce script réutilise PaiementRecuService pour générer le PDF et envoyer
 * le template "paiement-confirme" avec pièce jointe.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../src/shared/audit/audit.logger';
import { PaiementRecuService } from '../src/modules/paiements/paiement-recu.service';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
const helpRequested = args.includes('--help') || args.includes('-h');
const dossierFlagIndex = args.indexOf('--dossier');
const dossierId = dossierFlagIndex !== -1 ? args[dossierFlagIndex + 1] : args[0];

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('DATABASE_URL requis');
  process.exit(1);
}

if (helpRequested || !dossierId || dossierId.startsWith('--')) {
  console.log([
    'Usage:',
    '  node -r ts-node/register/transpile-only scripts/test-recu-email.ts --dossier <dossier_id> [--dry-run]',
    '',
    'Variables utiles:',
    '  EMAIL_TEST_OVERRIDE   Redirige le reçu vers une adresse de test',
    '  FRONTEND_URL          Base URL utilisée dans le lien du reçu',
    '',
  ].join('\n'));
  if (helpRequested) {
    process.exit(0);
  }
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const audit = new AuditLogger(prisma);
const recuService = new PaiementRecuService(prisma, audit);
const emailOverride = process.env.EMAIL_TEST_OVERRIDE || null;

async function main() {
  console.log(`\n=== Test envoi reçu paiement ${dryRun ? '(DRY-RUN)' : ''} ===`);
  console.log(`Dossier          : ${dossierId}`);
  console.log(`Email override    : ${emailOverride || '(aucun)'}`);

  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    include: {
      apprenant: true,
      formation: true,
      session: true,
      paiement: true,
      voucher_organisation: true,
    },
  });

  if (!dossier) {
    throw new Error(`Dossier introuvable: ${dossierId}`);
  }

  if (!dossier.paiement) {
    throw new Error(`Aucun paiement associé au dossier ${dossierId}`);
  }

  if (dossier.paiement.statut !== 'CONFIRME') {
    throw new Error(`Le paiement du dossier ${dossierId} n'est pas CONFIRME (statut: ${dossier.paiement.statut})`);
  }

  console.log(`Apprenant        : ${dossier.apprenant.prenoms || ''} ${dossier.apprenant.nom}`.trim());
  console.log(`Email destinataire: ${emailOverride || dossier.apprenant.email}`);
  console.log(`Formation         : ${dossier.formation.intitule}`);
  console.log(`Paiement          : ${dossier.paiement.id}`);
  console.log(`Montant           : ${(dossier.paiement.montant_final ?? dossier.paiement.montant_initie).toLocaleString('fr-FR')} XOF`);
  console.log(`Statut            : ${dossier.paiement.statut}`);

  if (dryRun) {
    console.log('\n[DRY-RUN] Aucune génération de PDF ni envoi email déclenché.');
    return;
  }

  console.log('\n[1/1] Génération du reçu et envoi email...');
  await recuService.genererEtEnvoyerRecu(dossierId);

  console.log('\nTerminé.');
  console.log('Vérifie la boîte de destination, les logs SMTP et la table AuditLog si besoin.');
}

main()
  .catch((error: any) => {
    console.error('\nECHEC:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
