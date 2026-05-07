/**
 * Script generique d'enrolement par groupe (Masterclass / evenements FORGES)
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/enrolements/import-groupe.ts \
 *     --groupe groupes/anssi.json \
 *     --formation <formation_id> \
 *     [--dry-run]
 *
 * Variables d'environnement:
 *   EMAIL_TEST_OVERRIDE  Si defini, tous les emails sont redirigés vers cette adresse.
 *   DRY_RUN=true         Simule sans ecrire en base.
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const dbUrl = process.env.DATABASE_URL || '';
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const args = process.argv.slice(2);
const groupeFlag = args.indexOf('--groupe');
const formationFlag = args.indexOf('--formation');
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';

if (groupeFlag === -1) {
  console.error('Usage: import-groupe.ts --groupe <chemin/vers/groupe.json> [--formation <id>] [--dry-run]');
  process.exit(1);
}

const groupePath = path.resolve(__dirname, args[groupeFlag + 1]);
const formationIdArg = formationFlag !== -1 ? args[formationFlag + 1] : null;

const EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE || null;
const TEMP_PASSWORD = process.env.ENROLEMENT_TEMP_PASSWORD || 'Forges@2026!';
const BCRYPT_ROUNDS = 12;
const VOUCHER_EXPIRATION_DAYS = 90;

interface GroupeConfig {
  organisation: {
    raison_sociale: string;
    type: string;
    email: string;
    contact_referent: string;
    pays: string;
    identifiant_legal?: string;
  };
  masterclass: {
    formation_id: string | null;
    tarif_unitaire_xof: number;
    notes_admin?: string;
  };
  apprenants: Array<{
    nom: string;
    prenoms: string;
    email: string;
    fonction?: string;
    pays_residence: string;
    pays_nationalite: string;
  }>;
}

function resolveEmail(email: string): string {
  return EMAIL_OVERRIDE || email;
}

function generateVoucherCode(orgSlug: string, index: number): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `${orgSlug}-${String(index + 1).padStart(2, '0')}-${ts}`;
}

function slugify(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

async function run() {
  if (!fs.existsSync(groupePath)) {
    console.error(`Fichier groupe introuvable: ${groupePath}`);
    process.exit(1);
  }

  const config: GroupeConfig = JSON.parse(fs.readFileSync(groupePath, 'utf-8'));
  const formationId = formationIdArg || config.masterclass.formation_id;

  if (!formationId) {
    console.error('formation_id requis (--formation <id> ou masterclass.formation_id dans le JSON)');
    process.exit(1);
  }

  console.log(`\n=== Import groupe: ${config.organisation.raison_sociale} ===`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (aucune ecriture)' : 'PRODUCTION'}`);
  if (EMAIL_OVERRIDE) console.log(`Email override: tous les emails -> ${EMAIL_OVERRIDE}`);
  console.log(`Apprenants: ${config.apprenants.length}`);
  console.log(`Tarif unitaire: ${config.masterclass.tarif_unitaire_xof.toLocaleString('fr-FR')} FCFA`);
  console.log(`Montant total: ${(config.masterclass.tarif_unitaire_xof * config.apprenants.length).toLocaleString('fr-FR')} FCFA\n`);

  const passwordHash = await hash(TEMP_PASSWORD, BCRYPT_ROUNDS);
  const orgSlug = slugify(config.organisation.raison_sociale);

  // --- Etape 2: Organisation ---
  console.log('[1/4] Organisation...');
  let organisationId: string;

  if (!dryRun) {
    const existing = await prisma.organisation.findFirst({
      where: { email: config.organisation.email },
    });

    if (existing) {
      organisationId = existing.id;
      console.log(`  -> Existante: ${existing.raison_sociale} (${existing.id})`);
    } else {
      const org = await prisma.organisation.create({
        data: {
          raison_sociale: config.organisation.raison_sociale,
          type: config.organisation.type,
          email: config.organisation.email,
          contact_referent: config.organisation.contact_referent,
          pays: config.organisation.pays,
          langue_preferee: 'FR',
          identifiant_legal: config.organisation.identifiant_legal || null,
          password_hash: passwordHash,
          statut: 'ACTIF',
          sous_types: [],
        },
      });
      organisationId = org.id;
      console.log(`  -> Creee: ${org.raison_sociale} (${org.id})`);
    }
  } else {
    organisationId = `DRY-ORG-${orgSlug}`;
    console.log(`  -> [DRY] Organisation: ${config.organisation.raison_sociale} (${organisationId})`);
  }

  // --- Etape 3: Apprenants ---
  console.log('[2/4] Apprenants...');
  const apprenantIds: string[] = [];

  for (const apprenant of config.apprenants) {
    if (!dryRun) {
      const existing = await prisma.apprenant.findFirst({ where: { email: apprenant.email } });
      if (existing) {
        apprenantIds.push(existing.id);
        console.log(`  -> Existant: ${apprenant.nom} ${apprenant.prenoms} (${existing.id})`);
        continue;
      }

      const created = await prisma.apprenant.create({
        data: {
          email: apprenant.email,
          nom: apprenant.nom,
          prenoms: apprenant.prenoms,
          type_apprenant: 'PROFESSIONNEL',
          pays_residence: apprenant.pays_residence,
          pays_nationalite: apprenant.pays_nationalite,
          langue_preferee: 'FR',
          password_hash: passwordHash,
          statut: 'EN_ATTENTE',
          consentement_rgpd: true,
          consentement_timestamp: new Date(),
          consentement_version_cgu: '1.0',
          organisation_id: organisationId,
        },
      });
      apprenantIds.push(created.id);
      console.log(`  -> Cree: ${created.nom} ${created.prenoms} (${created.id})`);
    } else {
      const fakeId = `DRY-APP-${slugify(apprenant.nom)}`;
      apprenantIds.push(fakeId);
      console.log(`  -> [DRY] ${apprenant.nom} ${apprenant.prenoms} <${apprenant.email}> -> ${fakeId}`);
    }
  }

  // --- Etape 4a: Devis ---
  console.log('[3/4] Devis...');
  const annee = new Date().getFullYear();
  const nbPlaces = config.apprenants.length;
  const montantTotal = config.masterclass.tarif_unitaire_xof * nbPlaces;
  let devisId: string;
  let numeroDevis: string;

  if (!dryRun) {
    const count = await prisma.devis.count({ where: { created_at: { gte: new Date(`${annee}-01-01`) } } });
    const sequence = String(count + 1).padStart(3, '0');
    numeroDevis = `FORGES-DEVIS-${annee}-${sequence}`;

    const adminUser = await prisma.apprenant.findFirst({ where: { role: 'ADMIN' as any } });
    const createdBy = adminUser?.id || 'system';

    const devis = await prisma.devis.create({
      data: {
        numero_devis: numeroDevis,
        organisation_id: organisationId,
        formation_id: formationId,
        nb_places: nbPlaces,
        tarif_unitaire_xof: config.masterclass.tarif_unitaire_xof,
        montant_total_xof: montantTotal,
        statut: 'CREE',
        notes_admin: config.masterclass.notes_admin || null,
        created_by: createdBy,
      },
    });
    devisId = devis.id;
    console.log(`  -> Devis cree: ${numeroDevis} — ${montantTotal.toLocaleString('fr-FR')} FCFA (${devisId})`);
    console.log(`  -> Destinataire email devis: ${resolveEmail(config.organisation.email)}`);
  } else {
    numeroDevis = `FORGES-DEVIS-${annee}-DRY`;
    devisId = 'DRY-DEVIS-001';
    console.log(`  -> [DRY] Devis: ${numeroDevis} — ${montantTotal.toLocaleString('fr-FR')} FCFA`);
    console.log(`  -> [DRY] Email devis -> ${resolveEmail(config.organisation.email)}`);
  }

  // --- Etape 4b: Vouchers (1 par apprenant) ---
  console.log('[4/4] Vouchers...');
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + VOUCHER_EXPIRATION_DAYS);
  const voucherCodes: string[] = [];

  for (let i = 0; i < config.apprenants.length; i++) {
    const apprenant = config.apprenants[i];
    const code = generateVoucherCode(orgSlug, i);
    voucherCodes.push(code);

    if (!dryRun) {
      await prisma.voucherOrganisation.create({
        data: {
          code,
          organisation_id: organisationId,
          formation_id: formationId,
          type: 'ORGANISATION',
          type_valeur: 'POURCENTAGE',
          valeur: 100,
          quota_max: 1,
          quota_utilise: 0,
          date_expiration: expiration,
          statut: 'ACTIF',
        },
      });
      console.log(`  -> Voucher ${code} pour ${apprenant.nom} ${apprenant.prenoms}`);
      console.log(`     Email voucher -> ${resolveEmail(apprenant.email)}`);
    } else {
      console.log(`  -> [DRY] Voucher ${code} pour ${apprenant.nom} ${apprenant.prenoms} -> ${resolveEmail(apprenant.email)}`);
    }
  }

  // --- Resume ---
  console.log('\n=== Resume ===');
  console.log(`Organisation : ${config.organisation.raison_sociale} (${organisationId})`);
  console.log(`Apprenants   : ${apprenantIds.length} crees/trouves`);
  console.log(`Devis        : ${numeroDevis} — ${montantTotal.toLocaleString('fr-FR')} FCFA`);
  console.log(`Vouchers     : ${voucherCodes.join(', ')}`);
  console.log(`Email devis  : ${resolveEmail(config.organisation.email)}`);
  if (dryRun) console.log('\n[DRY-RUN] Aucune donnee ecrite en base.');

  return { organisationId, apprenantIds, devisId, numeroDevis, voucherCodes, montantTotal };
}

run()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur import:', err);
    prisma.$disconnect();
    process.exit(1);
  });
