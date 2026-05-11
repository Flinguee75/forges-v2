/**
 * FORGES — Script de test apprenants + devis personnalise
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-et-devis.ts --file groupes/apprenants-devis-test.json
 *   node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-et-devis.ts --file groupes/apprenants-devis-test.json --dry-run
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

const args = process.argv.slice(2);
const fileFlag = args.indexOf('--file');
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
const EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE || null;
const BCRYPT_ROUNDS = 12;

if (fileFlag === -1 || !args[fileFlag + 1]) {
  console.error('Usage: creer-apprenants-et-devis.ts --file <chemin/vers/fichier.json> [--dry-run]');
  process.exit(1);
}

const inputPath = path.resolve(__dirname, args[fileFlag + 1]);
const LOG_FILE = path.join(__dirname, 'creer_apprenants_et_devis_log.json');

type ApprenantSeed = {
  email: string;
  nom: string;
  prenoms: string;
  pays_residence: string;
  pays_nationalite: string;
  langue_preferee?: 'FR' | 'EN' | 'ES' | 'PT';
  secteur_activite?: string | null;
  niveau_etude?: string | null;
};

type ScriptConfig = {
  devis: {
    formation_id: string;
    session_id: string;
    organisation_label: string;
    contact_referent: string;
    identifiant_legal?: string | null;
    notes_admin?: string;
  };
  apprenants: ApprenantSeed[];
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

function buildNumeroDevis(index: number, nomComplet: string) {
  const year = new Date().getFullYear();
  const nameSlug = slugify(nomComplet).slice(0, 24).toUpperCase().replace(/-/g, '');
  return `FORGES-DEVIS-${year}-${nameSlug}-${String(index + 1).padStart(3, '0')}`;
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Fichier introuvable: ${inputPath}`);
    process.exit(1);
  }

  const config: ScriptConfig = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  if (!config?.devis?.organisation_label || !config?.devis?.contact_referent || !config?.devis?.formation_id || !config?.devis?.session_id) {
    console.error('Le JSON doit contenir devis.organisation_label, contact_referent, formation_id et session_id.');
    process.exit(1);
  }

  if (!Array.isArray(config.apprenants) || config.apprenants.length === 0) {
    console.error('Le JSON doit contenir au moins un apprenant.');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(72));
  console.log('  FORGES — Script apprenants + devis PDF');
  console.log(`  Mode : ${dryRun ? '🔵 DRY-RUN (simulation)' : '🔴 EXÉCUTION RÉELLE'}`);
  console.log(`  Source: ${path.relative(process.cwd(), inputPath)}`);
  console.log(`  Apprenants : ${config.apprenants.length}`);
  console.log('═'.repeat(72) + '\n');

  try {
    const results: Array<{ email: string; status: 'CREATED' | 'REUSED' | 'DRY_RUN'; id: string }> = [];

    const formation = await prisma.formation.findUnique({
      where: { id: config.devis.formation_id },
      select: { id: true, intitule: true, cout_catalogue: true },
    });
    const session = await prisma.session.findUnique({
      where: { id: config.devis.session_id },
      select: { id: true, date_debut: true, date_fin: true },
    });

    if (!formation) {
      throw new Error(`Formation introuvable: ${config.devis.formation_id}`);
    }

    if (!session) {
      throw new Error(`Session introuvable: ${config.devis.session_id}`);
    }

    for (const [index, apprenantSeed] of config.apprenants.entries()) {
      const email = apprenantSeed.email.trim().toLowerCase();
      const nomComplet = `${apprenantSeed.prenoms} ${apprenantSeed.nom}`.trim();
      const resolvedEmail = resolveEmail(email);
      const tempPassword = generateTempPassword();

      console.log(`\n${'─'.repeat(52)}`);
      console.log(`  Apprenant : ${nomComplet}`);
      console.log(`  Email     : ${email}`);
      console.log('─'.repeat(52));

      if (dryRun) {
        const fakeId = `DRY-APP-${slugify(email)}`;
        results.push({ email, id: fakeId, status: 'DRY_RUN' });
        log('INFO', '[DRY-RUN] Créerait apprenant', {
          id: fakeId,
          email,
          nom: apprenantSeed.nom,
          prenoms: apprenantSeed.prenoms,
          pays_residence: apprenantSeed.pays_residence,
          pays_nationalite: apprenantSeed.pays_nationalite,
          langue_preferee: apprenantSeed.langue_preferee || 'FR',
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
              prenoms: apprenantSeed.prenoms,
              type_apprenant: 'PROFESSIONNEL',
              secteur_activite: apprenantSeed.secteur_activite || null,
              niveau_etude: apprenantSeed.niveau_etude || null,
              pays_residence: apprenantSeed.pays_residence,
              pays_nationalite: apprenantSeed.pays_nationalite,
              langue_preferee: apprenantSeed.langue_preferee || 'FR',
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
            email,
            id: created.id,
            nom: created.nom,
            prenoms: created.prenoms,
          });

          await emailService.sendTempPassword(resolvedEmail, tempPassword, apprenantSeed.langue_preferee || 'FR', 'APPRENANT');
          log('INFO', 'Email mot de passe temporaire envoyé', {
            email: resolvedEmail,
            type_compte: 'APPRENANT',
            apprenant: nomComplet,
          });
        }
      }

      const numeroDevis = buildNumeroDevis(index, nomComplet);
      const tarifUnitaire = Math.round(formation.cout_catalogue / 100);
      const montantTotal = tarifUnitaire;
      const sessionDates = {
        date_debut: session.date_debut,
        date_fin: session.date_fin,
      };

      if (dryRun) {
        log('INFO', '[DRY-RUN] Enverrait devis PDF personnalisé', {
          numero_devis: numeroDevis,
          destinataire: resolvedEmail,
          recipient_label: nomComplet,
          organisation_label: config.devis.organisation_label,
          formation: formation.intitule,
          session_id: session.id,
          tarif_unitaire_xof: tarifUnitaire,
          date_debut_session: session.date_debut,
          date_fin_session: session.date_fin,
        });
      } else {
        await devisService.envoyerEmailDevis(`draft-${slugify(email)}`, 'script_creer_apprenants_et_devis', {
          recipientEmail: resolvedEmail,
          recipientLabel: nomComplet,
          organisationLabel: config.devis.organisation_label,
          formationLabel: formation.intitule,
          numeroDevis,
          nbPlaces: 1,
          tarifUnitaireXof: tarifUnitaire,
          montantTotalXof: montantTotal,
          createdAt: new Date(),
          session: sessionDates,
          notesAdmin: config.devis.notes_admin || null,
          identifiantLegal: config.devis.identifiant_legal || null,
          attachmentFilename: `${numeroDevis}-${slugify(nomComplet)}.pdf`,
        });
        log('INFO', 'Devis PDF envoyé', {
          numero_devis: numeroDevis,
          destinataire: resolvedEmail,
          recipient_label: nomComplet,
          formation: formation.intitule,
          session_id: session.id,
          tarif_unitaire_xof: tarifUnitaire,
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

main().catch((err) => {
  console.error('Erreur script apprenants + devis:', err.message);
  process.exit(1);
});
