/**
 * Script de remise à zéro de la DB dev et création du compte admin.
 *
 * Usage (depuis forges-monorepo/backend) :
 *   DATABASE_URL=... node -r ts-node/register/transpile-only scripts/admin/reset-dev.ts
 *   DATABASE_URL=... node -r ts-node/register/transpile-only scripts/admin/reset-dev.ts --dry-run
 *
 * Ce script :
 *   1. Vide toutes les tables métier (ordre FK respecté)
 *   2. Crée un compte Admin FORGES
 *   3. Crée la formation "Masterclass GWU/CCDL" et la session "1–11 juin 2026"
 *
 * ATTENTION : ne pas exécuter en production.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('DATABASE_URL requis');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@forges-group.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@FORGES2026!';

export const FORMATION_ID = 'frm-masterclass-gwu-ccdl-2026';
export const SESSION_ID = 'ses-anssi-juin-2026';

async function truncateTables() {
  console.log('[reset] Suppression des données métier...');

  // Ordre: enfants avant parents (FK)
  const tables = [
    'CommissionApporteur',
    'CommissionPartenaire',
    'AuditLog',
    'Paiement',
    'Dossier',
    'VoucherOrganisation',
    'VoucherApporteur',
    'AccesFormationDemande',
    'FeedbackFormation',
    'FormationPartenaire',
    'devis',
    'AbonnementRetail',
    'AbonnementB2B',
    'AbonnementOrganisation',
    'OrganisationConfig',
    'Apprenant',
    'Organisation',
    'Session',
    'Formation',
    'Partenaire',
  ];

  for (const table of tables) {
    if (!DRY_RUN) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    }
    console.log(`  -> ${DRY_RUN ? '[DRY] ' : ''}Vidé: ${table}`);
  }
}

async function createAdmin(passwordHash: string) {
  console.log('\n[admin] Création du compte admin...');

  const existing = await prisma.apprenant.findFirst({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`  -> Admin déjà existant: ${ADMIN_EMAIL} (${existing.id})`);
    return existing.id;
  }

  if (!DRY_RUN) {
    const admin = await prisma.apprenant.create({
      data: {
        id: 'usr-admin-forges-dev-0000000001',
        nom: 'FORGES',
        prenoms: 'Admin',
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        role: 'ADMIN' as any,
        statut: 'ACTIF',
        type_apprenant: 'PROFESSIONNEL',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      },
    });
    console.log(`  -> Admin créé: ${admin.email} (${admin.id})`);
    return admin.id;
  } else {
    console.log(`  -> [DRY] Admin: ${ADMIN_EMAIL}`);
    return 'DRY-ADMIN-ID';
  }
}

async function createFormationEtSession(adminId: string) {
  console.log('\n[formation] Création Masterclass GWU/CCDL...');

  if (!DRY_RUN) {
    const formation = await prisma.formation.upsert({
      where: { id: FORMATION_ID },
      create: {
        id: FORMATION_ID,
        intitule: 'Masterclass GWU/CCDL — Cybersécurité & IA',
        description_courte: 'Masterclass intensive sur la cybersécurité et l\'intelligence artificielle pour professionnels.',
        description_longue: 'Formation intensive de 10 jours couvrant les enjeux de cybersécurité, gouvernance numérique et intelligence artificielle appliquée au secteur public et privé.',
        duree_jours: 10,
        cout_catalogue: 2000000,
        responsable_id: adminId,
        type_formation: 'SUR_DEVIS',
        mode_formation: 'AVEC_SESSION',
        statut: 'PUBLIEE',
        inclus_abonnement: false,
        objectifs_pedagogiques: [
          'Maîtriser les fondamentaux de la cybersécurité',
          'Comprendre les enjeux de l\'IA pour la sécurité',
          'Gouvernance et conformité des systèmes d\'information',
        ],
        langues_disponibles: ['FR'],
        certification_delivree: true,
      },
      update: {
        statut: 'PUBLIEE',
        responsable_id: adminId,
      },
    });
    console.log(`  -> Formation: ${formation.intitule} (${formation.id})`);

    const session = await prisma.session.upsert({
      where: { id: SESSION_ID },
      create: {
        id: SESSION_ID,
        formation_id: FORMATION_ID,
        date_ouverture: new Date('2026-05-01'),
        date_cloture: new Date('2026-05-31'),
        date_debut: new Date('2026-06-01'),
        date_fin: new Date('2026-06-11'),
        capacite: 20,
        nb_inscrits: 0,
        places_restantes: 20,
        statut: 'PLANIFIEE',
      },
      update: {},
    });
    console.log(`  -> Session: ${session.date_debut.toLocaleDateString('fr-FR')} — ${session.date_fin.toLocaleDateString('fr-FR')} (${session.id})`);

    return { formationId: formation.id, sessionId: session.id };
  } else {
    console.log(`  -> [DRY] Formation + Session créées`);
    return { formationId: FORMATION_ID, sessionId: SESSION_ID };
  }
}

async function run() {
  console.log(`\n=== RESET DB DEV ${DRY_RUN ? '(DRY-RUN)' : ''} ===`);
  console.log(`Base: ${dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

  await truncateTables();

  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  const adminId = await createAdmin(passwordHash);
  const { formationId, sessionId } = await createFormationEtSession(adminId);

  console.log('\n=== Résumé ===');
  console.log(`Admin email    : ${ADMIN_EMAIL}`);
  console.log(`Admin password : ${ADMIN_PASSWORD}`);
  console.log(`Formation ID   : ${formationId}`);
  console.log(`Session ID     : ${sessionId}`);
  if (DRY_RUN) console.log('\n[DRY-RUN] Aucune donnée écrite.');
}

run()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur reset:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
