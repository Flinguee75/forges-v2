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
export const SESSION_ID = 'ses-gwu-ccdl-juin-2026';

async function truncateTables() {
  console.log('[reset] Suppression des données métier...');

  // Ordre: enfants avant parents (FK)
  // Liste des tables dans l'ordre FK (enfants avant parents)
  // Découverte via pg_tables sur la DB cible — IF EXISTS pour ignorer les absentes
  const tables = [
    'CommissionApporteur',
    'CommissionPartenaire',
    'CommissionPartenaireAbonnement',
    'AuditLog',
    'Paiement',
    'ConversationBot',
    'EnqueteCatalogue',
    'Dossier',
    'VoucherOrganisation',
    'VoucherApporteur',
    'AccesFormationDemande',
    'FeedbackFormation',
    'FormationPartenaire',
    'ContratInstitutionnel',
    'devis',
    'AbonnementRetail',
    'AbonnementB2B',
    'AbonnementOrganisation',
    'Apporteur',
    'Apprenant',
    'OrganisationConfig',
    'Organisation',
    'Session',
    'Formation',
    'Partenaire',
  ];

  for (const table of tables) {
    if (!DRY_RUN) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      } catch (e: any) {
        if (e.code === 'P2010' && e.meta?.code === '42P01') {
          console.log(`  -> Ignoré (table absente): ${table}`);
          continue;
        }
        throw e;
      }
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
        description_courte: 'Masterclass internationale co-délivrée par la George Washington University et le CCDL. 10 jours intensifs sur la cybersécurité stratégique et la gouvernance IA, du 1er au 11 juin 2026 à Abidjan. Certification reconnue par le gouvernement ivoirien, badge numérique vérifiable.',
        description_longue: `Certified Strategic Cybersecurity & AI Governance Analyst est une Masterclass internationale de haut niveau co-délivrée par la George Washington University School of Business et le Center for Cyber Diplomacy and Leadership (CCDL). Elle se tient du 1er au 11 juin 2026 à l'Agence Ivoirienne de Gestion des Fréquences (AIGF), Anoumabo, Abidjan, Côte d'Ivoire — première édition de cet événement sur le continent africain.

Conçue pour les stratèges de haut niveau, décideurs politiques, responsables IT, cadres en cybersécurité et leaders en gouvernance IA, cette formation intensive de 10 jours couvre deux semaines thématiques :

Semaine 1 — Fondamentaux : Paysage mondial des menaces cyber, Intelligence artificielle (opportunités, risques et implications stratégiques), Design thinking stratégique, Cadres internationaux de gouvernance (NIST, ISO 27001, EU AI Act), Régulation de l'IA, Protection des données et droits numériques, Gestion des risques cyber et IA, Cyber threat intelligence, Architecture nationale de cybersécurité.

Semaine 2 — Mise en œuvre et leadership : Réponse aux incidents et gestion de crise, Cyber diplomatie et coopération internationale, Attribution et dissuasion cyber, Sécurité de l'IA, IA responsable (éthique et redevabilité), Gouvernance organisationnelle de l'IA, Développement de la main-d'œuvre, Communication stratégique.

À l'issue de la session, les participants passent un examen QCM dont la réussite conditionne l'obtention du certificat. Les lauréats reçoivent le titre de Certified Strategic Cybersecurity & AI Governance Analyst, assorti d'un badge numérique vérifiable (LinkedIn, portfolio professionnel), reconnu par le gouvernement ivoirien et aligné sur la Stratégie nationale de cybersécurité 2026-2030.`,
        duree_jours: 10,
        cout_catalogue: 3000000,
        responsable_id: adminId,
        type_formation: 'SUR_DEVIS',
        mode_formation: 'PRESENTIEL',
        lieu: 'AIGF, Anoumabo, Abidjan, Côte d\'Ivoire',
        statut: 'ACTIVE',
        inclus_abonnement: false,
        public_cible: 'Décideurs, responsables IT, cadres en cybersécurité, leaders en gouvernance IA',
        objectifs_pedagogiques: [
          'Maîtriser le paysage mondial des menaces cyber et les cadres de gouvernance (NIST, ISO 27001, EU AI Act)',
          'Comprendre les opportunités, risques et implications stratégiques de l\'IA',
          'Développer une architecture nationale de cybersécurité et une stratégie de réponse aux incidents',
          'Conduire la cyber diplomatie et la coopération internationale',
          'Obtenir la certification Certified Strategic Cybersecurity & AI Governance Analyst',
        ],
        langues_disponibles: ['FR'],
        certification_delivree: true,
      },
      update: {
        statut: 'ACTIVE',
        mode_formation: 'PRESENTIEL',
        lieu: 'AIGF, Anoumabo, Abidjan, Côte d\'Ivoire',
        responsable_id: adminId,
        cout_catalogue: 3000000,
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
        capacite: 50,
        nb_inscrits: 0,
        places_restantes: 50,
        lieu: 'AIGF, Anoumabo, Abidjan, Côte d\'Ivoire',
        statut: 'INSCRIPTIONS_OUVERTES',
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
