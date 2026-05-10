/**
 * Script utilitaire pour créer ou mettre a jour des organisations en masse.
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/admin/script-orga.ts \
 *     --file scripts/admin/orga-seed.json \
 *     [--dry-run]
 *
 * Format JSON attendu:
 *   {
 *     "organisations": [
 *       {
 *         "raison_sociale": "Organisation Test",
 *         "type": "ENTREPRISE",
 *         "email": "contact@orga.ci",
 *         "contact_referent": "Mme Test",
 *         "pays": "CI",
 *         "identifiant_legal": "CI-123",
 *         "langue_preferee": "FR",
 *         "statut": "ACTIF",
 *         "sous_types": ["B2B"]
 *       }
 *     ]
 *   }
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const dbUrl = process.env.DATABASE_URL || '';
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const args = process.argv.slice(2);
const fileFlag = args.indexOf('--file');
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';

if (fileFlag === -1 || !args[fileFlag + 1]) {
  console.error('Usage: script-orga.ts --file <chemin/vers/fichier.json> [--dry-run]');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[fileFlag + 1]);
const BCRYPT_ROUNDS = 12;
const TEMP_PASSWORD = process.env.ORG_TEMP_PASSWORD || 'Forges@2026!';

type OrganisationSeed = {
  raison_sociale: string;
  type: string;
  email: string;
  contact_referent: string;
  pays: string;
  identifiant_legal?: string | null;
  langue_preferee?: string;
  statut?: string;
  sous_types?: string[];
};

type SeedFile = {
  organisations: OrganisationSeed[];
};

function normalizeSubTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);
}

async function run() {
  if (!fs.existsSync(filePath)) {
    console.error(`Fichier introuvable: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const config: SeedFile = JSON.parse(raw);

  if (!Array.isArray(config.organisations) || config.organisations.length === 0) {
    console.error('Le fichier JSON doit contenir un tableau "organisations" non vide.');
    process.exit(1);
  }

  const passwordHash = await hash(TEMP_PASSWORD, BCRYPT_ROUNDS);

  console.log('\n=== Script Organisations ===');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (aucune ecriture)' : 'PRODUCTION'}`);
  console.log(`Fichier: ${filePath}`);
  console.log(`Organisations a traiter: ${config.organisations.length}`);
  console.log(`Mot de passe temporaire: ${TEMP_PASSWORD}`);

  const results: Array<{ email: string; id: string; action: 'CREATED' | 'UPDATED' | 'DRY_RUN' }> = [];

  for (const org of config.organisations) {
    if (!org.raison_sociale || !org.type || !org.email || !org.contact_referent || !org.pays) {
      throw new Error(`Organisation incomplète: ${JSON.stringify(org)}`);
    }

    const payload = {
      raison_sociale: org.raison_sociale.trim(),
      type: org.type.trim(),
      email: org.email.trim().toLowerCase(),
      contact_referent: org.contact_referent.trim(),
      pays: org.pays.trim().toUpperCase(),
      identifiant_legal: org.identifiant_legal?.trim() || null,
      langue_preferee: org.langue_preferee || 'FR',
      statut: org.statut || 'ACTIF',
      sous_types: normalizeSubTypes(org.sous_types),
      password_hash: passwordHash,
    };

    if (dryRun) {
      console.log(`- [DRY] ${payload.raison_sociale} <${payload.email}>`);
      results.push({ email: payload.email, id: `DRY-ORG-${results.length + 1}`, action: 'DRY_RUN' });
      continue;
    }

    const existing = await prisma.organisation.findUnique({
      where: { email: payload.email },
    });

    if (existing) {
      const updated = await prisma.organisation.update({
        where: { email: payload.email },
        data: {
          raison_sociale: payload.raison_sociale,
          type: payload.type,
          contact_referent: payload.contact_referent,
          pays: payload.pays,
          identifiant_legal: payload.identifiant_legal,
          langue_preferee: payload.langue_preferee,
          statut: payload.statut,
          sous_types: payload.sous_types,
          password_hash: existing.password_hash || passwordHash,
        },
      });

      console.log(`- Updated: ${updated.raison_sociale} (${updated.id})`);
      results.push({ email: updated.email, id: updated.id, action: 'UPDATED' });
      continue;
    }

    const created = await prisma.organisation.create({
      data: {
        raison_sociale: payload.raison_sociale,
        type: payload.type,
        email: payload.email,
        contact_referent: payload.contact_referent,
        pays: payload.pays,
        identifiant_legal: payload.identifiant_legal,
        langue_preferee: payload.langue_preferee,
        statut: payload.statut,
        sous_types: payload.sous_types,
        password_hash: payload.password_hash,
      },
    });

    console.log(`- Created: ${created.raison_sociale} (${created.id})`);
    results.push({ email: created.email, id: created.id, action: 'CREATED' });
  }

  console.log('\n=== Resume ===');
  console.log(`Total traitees: ${results.length}`);
  results.forEach((row) => {
    console.log(`- ${row.action}: ${row.email} (${row.id})`);
  });

  if (dryRun) {
    console.log('\n[DRY-RUN] Aucune donnée écrite en base.');
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur script orga:', err);
    prisma.$disconnect();
    process.exit(1);
  });
