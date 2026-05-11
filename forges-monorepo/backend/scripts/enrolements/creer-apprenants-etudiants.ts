/**
 * FORGES — Script de test apprenants étudiants + facture personnalisée
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-etudiants.ts --file groupes/apprenants_etudiants.csv --context groupes/apprenants-individuels-context.json
 *   node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-etudiants.ts --file groupes/apprenants_etudiants.csv --context groupes/apprenants-individuels-context.json --dry-run
 *
 * Variables d'environnement:
 *   DATABASE_URL           Obligatoire.
 *   EMAIL_TEST_OVERRIDE    Si defini, redirige tous les emails vers cette adresse.
 *   DRY_RUN=true           Simule sans ecrire en base.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EmailService } from '../../src/shared/email/email.service';
import { DevisRepository } from '../../src/modules/devis/devis.repository';
import { DevisService } from '../../src/modules/devis/devis.service';
import { AuditLogger } from '../../src/shared/audit/audit.logger';
import { getMissingHeaders, normalizeXofAmount, parseCsvTable } from '../../src/shared/csv/csv-parser';

const args = process.argv.slice(2);
const fileFlag = args.indexOf('--file');
const contextFlag = args.indexOf('--context');
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
const EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE || null;
const BCRYPT_ROUNDS = 12;

if (fileFlag === -1 || !args[fileFlag + 1]) {
  console.error('Usage: creer-apprenants-etudiants.ts --file <chemin/vers/fichier.csv> --context <chemin/vers/contexte.json> [--dry-run]');
  process.exit(1);
}

if (contextFlag === -1 || !args[contextFlag + 1]) {
  console.error('Usage: creer-apprenants-etudiants.ts --file <chemin/vers/fichier.csv> --context <chemin/vers/contexte.json> [--dry-run]');
  process.exit(1);
}

const inputPath = path.resolve(__dirname, args[fileFlag + 1]);
const contextPath = path.resolve(__dirname, args[contextFlag + 1]);
const LOG_FILE = path.join(__dirname, 'creer_apprenants_etudiants_log.json');

type CsvContext = {
  formation_id: string;
  session_id: string;
  contact_referent: string;
  identifiant_legal?: string | null;
  notes_admin?: string;
};

type CsvApprenant = {
  lineNumber: number;
  nom: string;
  prenom: string;
  email: string;
  organisation: string;
  secteur_activite: string | null;
  pays_residence: string;
  pays_nationalite: string;
  type_apprenant: string;
  type_apprenant_backend: 'PROFESSIONNEL' | 'APPRENANT';
  niveau_etude: string | null;
  tarif_xof: number;
};

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('DATABASE_URL requis');
  process.exit(1);
}

process.env.FRONTEND_URL = 'https://edu.forges-group.com';

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const emailService = new EmailService();
const devisService = new DevisService(
  new DevisRepository(prisma),
  prisma,
  new AuditLogger(prisma),
  emailService
);

const logs: Array<{ level: string; message: string; data: Record<string, unknown>; ts: string }> = [];

function log(level: string, message: string, data: Record<string, unknown> = {}) {
  const entry = { level, message, data, ts: new Date().toISOString() };
  logs.push(entry);
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SKIP' ? '⏭️' : '✅';
  console.log(`${prefix} [${level}] ${message}`, Object.keys(data).length ? JSON.stringify(data) : '');
}

function saveLogs() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  console.log(`\n📄 Log sauvegardé : ${LOG_FILE}`);
}

function resolveEmail(email: string) {
  return EMAIL_OVERRIDE || email;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function generateTempPassword() {
  return `FORGES-${crypto.randomUUID().slice(0, 8).toUpperCase()}!`;
}

function buildNumeroFacture(index: number, nomComplet: string) {
  const year = new Date().getFullYear();
  const nameSlug = slugify(nomComplet).slice(0, 24).toUpperCase().replace(/-/g, '');
  return `FORGES-FACTURE-${year}-${nameSlug}-${String(index + 1).padStart(3, '0')}`;
}

function normalizeTypeApprenant(value: string, lineNumber?: number): 'PROFESSIONNEL' | 'APPRENANT' {
  const normalized = requireTrimmed(value, 'type_apprenant', lineNumber).toUpperCase();

  if (normalized === 'ETUDIANT' || normalized === 'APPRENANT') {
    return 'APPRENANT';
  }

  if (normalized === 'PROFESSIONNEL') {
    return 'PROFESSIONNEL';
  }

  throw new Error(`type_apprenant invalide${lineNumber ? ` à la ligne ${lineNumber}` : ''}: ${value}`);
}

function requireTrimmed(value: string | undefined, fieldName: string, lineNumber?: number) {
  const trimmed = value?.trim() || '';
  if (!trimmed) {
    const lineInfo = lineNumber ? ` (ligne ${lineNumber})` : '';
    throw new Error(`Champ requis manquant${lineInfo}: ${fieldName}`);
  }

  return trimmed;
}

function loadCsvApprenants(csvFilePath: string) {
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const parsed = parseCsvTable(csvContent);
  const requiredHeaders = [
    'nom',
    'prenom',
    'email',
    'organisation',
    'secteur_activite',
    'pays_residence',
    'pays_nationalite',
    'type_apprenant',
    'niveau_etude',
    'tarif_xof',
  ];
  const missingHeaders = getMissingHeaders(parsed.headers, requiredHeaders);

  if (missingHeaders.length > 0) {
    throw new Error(`Colonnes CSV manquantes: ${missingHeaders.join(', ')}`);
  }

  const seenEmails = new Map<string, number>();
  const duplicateEmails: Array<{ email: string; firstLine: number; secondLine: number }> = [];

  parsed.rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const email = requireTrimmed(row.email, 'email', lineNumber).toLowerCase();

    if (seenEmails.has(email)) {
      duplicateEmails.push({ email, firstLine: seenEmails.get(email) || lineNumber, secondLine: lineNumber });
      return;
    }

    seenEmails.set(email, lineNumber);
  });

  if (duplicateEmails.length > 0) {
    const details = duplicateEmails
      .map((dup) => `${dup.email} (lignes ${dup.firstLine} et ${dup.secondLine})`)
      .join(', ');
    throw new Error(`Doublon email détecté dans le CSV: ${details}`);
  }

  const apprenants = parsed.rows.map((row, index) => {
    const lineNumber = index + 2;
    const nom = requireTrimmed(row.nom, 'nom', lineNumber);
    const prenom = requireTrimmed(row.prenom, 'prenom', lineNumber);
    const email = requireTrimmed(row.email, 'email', lineNumber).toLowerCase();
    const organisation = requireTrimmed(row.organisation, 'organisation', lineNumber);
    const pays_residence = requireTrimmed(row.pays_residence, 'pays_residence', lineNumber);
    const pays_nationalite = requireTrimmed(row.pays_nationalite, 'pays_nationalite', lineNumber);
    const type_apprenant = requireTrimmed(row.type_apprenant, 'type_apprenant', lineNumber);
    const type_apprenant_backend = normalizeTypeApprenant(type_apprenant, lineNumber);
    const niveau_etude = requireTrimmed(row.niveau_etude, 'niveau_etude', lineNumber);
    const tarif_xof = normalizeXofAmount(requireTrimmed(row.tarif_xof, 'tarif_xof', lineNumber));

    if (!Number.isFinite(tarif_xof) || tarif_xof <= 0) {
      throw new Error(`tarif_xof invalide à la ligne ${lineNumber}: ${row.tarif_xof}`);
    }

    if (type_apprenant_backend === 'APPRENANT' && !niveau_etude) {
      throw new Error(`niveau_etude obligatoire pour un apprenant scolarisé (ligne ${lineNumber})`);
    }

    return {
      lineNumber,
      nom,
      prenom,
      email,
      organisation,
      secteur_activite: row.secteur_activite?.trim() || null,
      pays_residence,
      pays_nationalite,
      type_apprenant,
      type_apprenant_backend,
      niveau_etude: niveau_etude || null,
      tarif_xof,
    } satisfies CsvApprenant;
  });

  return apprenants;
}

function loadCsvContext(jsonPath: string): CsvContext {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Fichier de contexte introuvable: ${jsonPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Partial<CsvContext>;
  const formation_id = requireTrimmed(raw.formation_id, 'formation_id');
  const session_id = requireTrimmed(raw.session_id, 'session_id');
  const contact_referent = requireTrimmed(raw.contact_referent, 'contact_referent');

  return {
    formation_id,
    session_id,
    contact_referent,
    identifiant_legal: raw.identifiant_legal?.trim() || null,
    notes_admin: raw.notes_admin?.trim() || '',
  };
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Fichier introuvable: ${inputPath}`);
    process.exit(1);
  }

  const apprenants = loadCsvApprenants(inputPath);
  if (apprenants.length === 0) {
    console.error('Le CSV doit contenir au moins un apprenant.');
    process.exit(1);
  }

  const context = loadCsvContext(contextPath);

  console.log('\n' + '═'.repeat(72));
  console.log('  FORGES — Script apprenants étudiants + facture PDF');
  console.log(`  Mode : ${dryRun ? '🔵 DRY-RUN (simulation)' : '🔴 EXÉCUTION RÉELLE'}`);
  console.log(`  CSV   : ${path.relative(process.cwd(), inputPath)}`);
  console.log(`  Contexte : ${path.relative(process.cwd(), contextPath)}`);
  console.log(`  Référent : ${context.contact_referent}`);
  console.log(`  Apprenants : ${apprenants.length}`);
  console.log('═'.repeat(72) + '\n');

  try {
    const results: Array<{ email: string; status: 'CREATED' | 'REUSED' | 'DRY_RUN'; id: string }> = [];

    const formation = await prisma.formation.findUnique({
      where: { id: context.formation_id },
      select: { id: true, intitule: true, cout_catalogue: true },
    });
    const session = await prisma.session.findUnique({
      where: { id: context.session_id },
      select: { id: true, date_debut: true, date_fin: true },
    });

    if (!formation) {
      throw new Error(`Formation introuvable: ${context.formation_id}`);
    }

    if (!session) {
      throw new Error(`Session introuvable: ${context.session_id}`);
    }

    for (const [index, apprenantSeed] of apprenants.entries()) {
      const email = apprenantSeed.email;
      const nomComplet = `${apprenantSeed.prenom} ${apprenantSeed.nom}`.trim();
      const resolvedEmail = resolveEmail(email);
      const tempPassword = generateTempPassword();

      console.log(`\n${'─'.repeat(52)}`);
      console.log(`  Apprenant : ${nomComplet}`);
      console.log(`  Email     : ${email}`);
      console.log(`  Tarif     : ${apprenantSeed.tarif_xof.toLocaleString('fr-FR')} XOF`);
      console.log('─'.repeat(52));

      if (dryRun) {
        const fakeId = `DRY-APP-${slugify(email)}`;
        results.push({ email, id: fakeId, status: 'DRY_RUN' });
        log('INFO', '[DRY-RUN] Créerait apprenant', {
          line: apprenantSeed.lineNumber,
          id: fakeId,
          email,
          nom: apprenantSeed.nom,
          prenoms: apprenantSeed.prenom,
          organisation: apprenantSeed.organisation,
          tarif_xof: apprenantSeed.tarif_xof,
          pays_residence: apprenantSeed.pays_residence,
          pays_nationalite: apprenantSeed.pays_nationalite,
          secteur_activite: apprenantSeed.secteur_activite,
        });
      } else {
        const existing = await prisma.apprenant.findUnique({ where: { email } });

        if (existing) {
          results.push({ email, id: existing.id, status: 'REUSED' });
          log('WARN', 'Apprenant déjà en base — réutilisation', {
            email,
            id: existing.id,
          });
        } else {
          const passwordHash = await hash(tempPassword, BCRYPT_ROUNDS);
          const created = await prisma.apprenant.create({
            data: {
              email,
              password_hash: passwordHash,
              nom: apprenantSeed.nom,
              prenoms: apprenantSeed.prenom,
          type_apprenant: apprenantSeed.type_apprenant_backend,
          secteur_activite: apprenantSeed.secteur_activite,
          niveau_etude: apprenantSeed.niveau_etude,
          pays_residence: apprenantSeed.pays_residence,
          pays_nationalite: apprenantSeed.pays_nationalite,
          langue_preferee: 'FR',
              role: 'APPRENANT',
              statut: 'ACTIF',
              consentement_rgpd: true,
              consentement_timestamp: new Date(),
              consentement_version_cgu: '1.0',
              token_confirmation: null,
              token_expiration: null,
              telephone: null,
              organisation_id: null,
            },
          });

          results.push({ email, id: created.id, status: 'CREATED' });
          log('INFO', 'Apprenant créé', {
            line: apprenantSeed.lineNumber,
            email,
            id: created.id,
            nom: created.nom,
            prenoms: created.prenoms,
            organisation: apprenantSeed.organisation,
            type_apprenant: apprenantSeed.type_apprenant_backend,
            niveau_etude: apprenantSeed.niveau_etude,
          });

          await emailService.sendTempPassword(resolvedEmail, tempPassword, 'FR', 'APPRENANT');
          log('INFO', 'Email mot de passe temporaire envoyé', {
            email: resolvedEmail,
            type_compte: 'APPRENANT',
            apprenant: nomComplet,
          });
        }
      }

      const numeroFacture = buildNumeroFacture(index, nomComplet);
      const tarifUnitaire = apprenantSeed.tarif_xof;
      const montantTotal = tarifUnitaire;
      const sessionDates = {
        date_debut: session.date_debut,
        date_fin: session.date_fin,
      };

      if (dryRun) {
        log('INFO', '[DRY-RUN] Enverrait facture PDF personnalisée', {
          numero_facture: numeroFacture,
          destinataire: resolvedEmail,
          recipient_label: nomComplet,
          organisation_label: apprenantSeed.organisation,
          formation: formation.intitule,
          session_id: session.id,
          tarif_unitaire_xof: tarifUnitaire,
          montant_total_xof: montantTotal,
          date_debut_session: session.date_debut,
          date_fin_session: session.date_fin,
        });
      } else {
        await devisService.envoyerEmailDevis(`draft-${slugify(email)}`, 'script_creer_apprenants_etudiants', {
          recipientEmail: resolvedEmail,
          recipientLabel: nomComplet,
          organisationLabel: apprenantSeed.organisation,
          formationLabel: formation.intitule,
          numeroDevis: numeroFacture,
          nbPlaces: 1,
          tarifUnitaireXof: tarifUnitaire,
          montantTotalXof: montantTotal,
          createdAt: new Date(),
          session: sessionDates,
          notesAdmin: context.notes_admin || null,
          identifiantLegal: context.identifiant_legal || null,
          attachmentFilename: `${numeroFacture}-${slugify(nomComplet)}.pdf`,
        });
        log('INFO', 'Facture PDF envoyée', {
          numero_facture: numeroFacture,
          destinataire: resolvedEmail,
          recipient_label: nomComplet,
          organisation_label: apprenantSeed.organisation,
          formation: formation.intitule,
          session_id: session.id,
          tarif_unitaire_xof: tarifUnitaire,
          montant_total_xof: montantTotal,
          date_debut_session: session.date_debut,
          date_fin_session: session.date_fin,
        });
      }
    }

    console.log('\n=== Resume ===');
    console.log(`Apprenants traites : ${results.length}`);
    console.log(`Mode              : ${dryRun ? 'DRY-RUN' : 'REEL'}`);
    console.log(`Email override    : ${EMAIL_OVERRIDE || '(aucun)'}`);
    if (dryRun) {
      console.log('Aucune écriture base n’a été faite.');
    }
  } catch (err: any) {
    log('ERROR', `Erreur inattendue : ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    await prisma.$disconnect();
    saveLogs();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Erreur script apprenants étudiants + facture:', err.message);
    process.exit(1);
  });
}

export {
  buildNumeroFacture,
  loadCsvApprenants,
  loadCsvContext,
  normalizeTypeApprenant,
  requireTrimmed,
};
