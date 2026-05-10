/**
 * FORGES — Script d'enrôlement Organisations
 * v1.0 — adapté au schéma actuel FORGES
 *
 * Mode d'emploi :
 *   node -r ts-node/register/transpile-only scripts/admin/script_organisations_point_focal.ts --dry-run
 *   node -r ts-node/register/transpile-only scripts/admin/script_organisations_point_focal.ts
 *
 * Prérequis : DATABASE_URL dans .env ou variable d'environnement
 *
 * Ce script crée:
 *   - l'organisation
 *   - les apprenants liés
 *   - le devis
 *   - les vouchers organisation
 *
 * Notes:
 *   - le modèle "utilisateur" du script historique n'existe plus ici
 *   - on travaille directement avec les modèles Organisation / Apprenant / Devis / VoucherOrganisation
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EmailService } from '../../src/shared/email/email.service';
import { genererPdfDevis } from '../../src/modules/devis/devis-pdf.service';

const DRY_RUN = process.argv.includes('--dry-run');
const LOG_FILE = path.join(__dirname, 'enrolement_organisations_log.json');

const FORMATION_ID = 'frm-masterclass-gwu-ccdl-2026';
const SESSION_ID = 'ses-gwu-ccdl-juin-2026';
const ANNEE = new Date().getFullYear();
const TEMP_PASSWORD = process.env.ORG_TEMP_PASSWORD || 'Forges@2026!';
const BCRYPT_ROUNDS = 12;
const VOUCHER_EXPIRATION_DAYS = 90;

type OrganisationSeed = {
  code: string;
  nom: string;
  type: string;
  pays: string;
  tarif: number;
  referent: {
    nom: string;
    email_org: string;
  };
  membres: Array<{
    nom: string;
    prenoms: string;
    email_pro: string;
    email_perso: string;
    poste?: string;
    secteur?: string;
  }>;
  notes?: string;
};

const ORGANISATIONS: OrganisationSeed[] = [
  {
    code: 'POINT-FOCAL-TEST',
    nom: 'Point Focal',
    type: 'ENTREPRISE',
    pays: 'CI',
    tarif: 2000000,
    referent: {
      nom: 'Hassan Cissé',
      email_org: 'hassan.cisse@pointfocal.ci',
    },
    membres: [
      {
        nom: 'Hassan Cissé',
        prenoms: 'Hassan',
        email_pro: 'hassan.cisse@pointfocal.ci',
        email_perso: 'cisseha@gmail.com',
        poste: 'Directeur Général',
        secteur: 'TECHNOLOGIE_INFORMATIQUE',
      },
    ],
    notes: 'Inscription test — Point Focal',
  },
  // Décommenter au fur et à mesure après validation du test
  /*
  {
    code: 'ANSSI',
    nom: "Agence Nationale de la Sécurité des Systèmes d'Information",
    type: 'GOUVERNEMENT',
    pays: 'CI',
    tarif: 2000000,
    referent: {
      nom: 'KONAN Kouamé Wilfried-Eli',
      email_org: 'eliekonan@anssi.gouv.ci',
    },
    membres: [
      { nom: 'SAMASSI ALY', prenoms: 'Aly', email_pro: 'asamassi@anssi.gouv.ci', email_perso: 'alysamassi@gmail.com', poste: 'Directeur', secteur: 'ADMINISTRATION_PUBLIQUE' },
      { nom: 'KONAN Wilfried-Eli', prenoms: 'Wilfried-Eli', email_pro: 'eliekonan@anssi.gouv.ci', email_perso: 'elie.konan@gmail.com', poste: 'Directeur Général Adjoint', secteur: 'ADMINISTRATION_PUBLIQUE' },
      { nom: 'Bintou JARVIS', prenoms: 'Bintou', email_pro: 'bjarvis@anssi.gouv.ci', email_perso: 'j2bintoufat@gmail.com', poste: 'Directrice Pôle Support et Gestion', secteur: 'ADMINISTRATION_PUBLIQUE' },
    ],
    notes: 'Prise en charge confirmée par email',
  },
  */
];

const dbUrl = process.env.DATABASE_URL || '';
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});
const emailService = new EmailService();

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

function genUUID() {
  return crypto.randomUUID();
}

function genDevisNum(sequence: number) {
  return `FORGES-DEVIS-${ANNEE}-${String(sequence).padStart(3, '0')}`;
}

function genVoucherCode(orgCode: string, idx: number) {
  return `VCH-${orgCode}-${ANNEE}-${String(idx + 1).padStart(3, '0')}`;
}

async function hashPassword(plain: string) {
  return hash(plain, BCRYPT_ROUNDS);
}

function isNumeroDevisUniqueError(error: unknown) {
  const err = error as { code?: string; meta?: { target?: string[] } };
  return err?.code === 'P2002' && Array.isArray(err?.meta?.target) && err.meta.target.includes('numero_devis');
}

async function orgExists(email: string) {
  const org = await prisma.organisation.findUnique({ where: { email: email.toLowerCase() } });
  return org;
}

async function apprenantExists(email: string) {
  const apprenant = await prisma.apprenant.findUnique({ where: { email: email.toLowerCase() } });
  return apprenant;
}

async function devisExists(organisationId: string, formationId: string, sessionId: string) {
  return prisma.devis.findFirst({
    where: {
      organisation_id: organisationId,
      formation_id: formationId,
      session_id: sessionId,
      statut: 'CREE',
    },
  });
}

async function sendTemporaryPasswordEmail(email: string, typeCompte: 'APPRENANT' | 'ORGANISATION', nom: string) {
  await emailService.sendTempPassword(email, TEMP_PASSWORD, 'FR', typeCompte);
  log('INFO', 'Email mot de passe temporaire envoyé', {
    email,
    nom,
    type_compte: typeCompte,
  });
}

async function sendDevisEmail(params: {
  devis: { numero_devis: string; created_at: Date; nb_places: number; tarif_unitaire_xof: number; montant_total_xof: number };
  organisation: { raison_sociale: string; email: string; contact_referent: string; pays: string; identifiant_legal?: string | null };
  formation: { intitule: string };
  session: { date_debut?: Date | null; date_fin?: Date | null } | null;
}) {
  const pdfBuffer = await genererPdfDevis({
    devis: params.devis,
    organisation: params.organisation,
    formation: params.formation,
    session: params.session,
  });

  await emailService.sendEnrolementDevisOrganisation({
    to: params.organisation.email,
    contactReferent: params.organisation.contact_referent,
    organisation: params.organisation.raison_sociale,
    formation: params.formation.intitule,
    numeroDevis: params.devis.numero_devis,
    nbPlaces: params.devis.nb_places,
    tarifUnitaire: params.devis.tarif_unitaire_xof,
    montantTotal: params.devis.montant_total_xof,
    pdfBuffer,
    pdfFilename: `${params.devis.numero_devis}.pdf`,
  });
}

async function createDevisWithRetry(params: {
  numeroDevisBase: number;
  organisationId: string;
  formationId: string;
  sessionId: string;
  nbPlaces: number;
  tarifUnitaire: number;
  montantTotal: number;
  notes: string | undefined;
}) {
  let sequence = params.numeroDevisBase;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const numeroDevis = genDevisNum(sequence);
    try {
      const devis = await prisma.devis.create({
        data: {
          numero_devis: numeroDevis,
          organisation_id: params.organisationId,
          formation_id: params.formationId,
          session_id: params.sessionId,
          nb_places: params.nbPlaces,
          tarif_unitaire_xof: params.tarifUnitaire,
          montant_total_xof: params.montantTotal,
          statut: 'CREE',
          notes_admin: params.notes || null,
          created_by: 'script_organisations',
        },
      });

      return { devis, numeroDevis };
    } catch (error) {
      if (!isNumeroDevisUniqueError(error)) {
        throw error;
      }

      log('WARN', 'Numero de devis déjà utilisé, tentative suivante', {
        numero: numeroDevis,
      });
      sequence += 1;
    }
  }

  throw new Error('Impossible de générer un numero_devis unique apres plusieurs tentatives.');
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  FORGES — Script Enrôlement Organisations');
  console.log(`  Mode : ${DRY_RUN ? '🔵 DRY-RUN (simulation)' : '🔴 EXÉCUTION RÉELLE'}`);
  console.log(`  Formation : ${FORMATION_ID}`);
  console.log(`  Session   : ${SESSION_ID}`);
  console.log('═'.repeat(60) + '\n');

  try {
    const formation = await prisma.formation.findUnique({ where: { id: FORMATION_ID } });
    if (!formation) {
      log('ERROR', 'Formation introuvable en base', { id: FORMATION_ID });
      return;
    }
    log('INFO', `Formation trouvée : ${formation.intitule}`, { id: FORMATION_ID });

    const session = await prisma.session.findUnique({ where: { id: SESSION_ID } });
    if (!session) {
      log('ERROR', 'Session introuvable en base', { id: SESSION_ID });
      return;
    }
    log('INFO', `Session trouvée : ${session.date_debut} → ${session.date_fin}`, { id: SESSION_ID });

    const passwordHash = await hashPassword(TEMP_PASSWORD);
    const existingDevises = await prisma.devis.findMany({
      where: {
        numero_devis: {
          startsWith: `FORGES-DEVIS-${ANNEE}-`,
        },
      },
      select: {
        numero_devis: true,
      },
    });
    const usedSequences = existingDevises
      .map((devis) => {
        const match = devis.numero_devis.match(/-(\d{3})$/);
        return match ? Number.parseInt(match[1], 10) : 0;
      })
      .filter((value) => Number.isFinite(value) && value > 0);
    let devisSeq = usedSequences.length > 0 ? Math.max(...usedSequences) + 1 : 1;

    for (const org of ORGANISATIONS) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`  Organisation : ${org.nom} [${org.code}]`);
      console.log('─'.repeat(50));

      const orgEmail = org.referent.email_org.toLowerCase();
      let organisationId: string;
      const existingOrg = await orgExists(orgEmail);

      if (existingOrg) {
        organisationId = existingOrg.id;
        log('WARN', 'Organisation déjà en base — réutilisation', {
          email: orgEmail,
          id: organisationId,
        });
      } else if (DRY_RUN) {
        organisationId = `DRY-ORG-${org.code}`;
        log('INFO', '[DRY-RUN] Créerait Organisation', {
          id: organisationId,
          raison_sociale: org.nom,
          type: org.type,
          email: orgEmail,
          contact_referent: org.referent.nom,
          pays: org.pays,
        });
      } else {
        const created = await prisma.organisation.create({
          data: {
            raison_sociale: org.nom,
            type: org.type,
            email: orgEmail,
            contact_referent: org.referent.nom,
            pays: org.pays,
            langue_preferee: 'FR',
            statut: 'ACTIF',
            sous_types: [],
            password_hash: passwordHash,
            token_confirmation: null,
            token_expiration: null,
          },
        });
        organisationId = created.id;
        log('INFO', 'Organisation créée', { raison_sociale: org.nom, id: organisationId });
        await sendTemporaryPasswordEmail(orgEmail, 'ORGANISATION', org.referent.nom);
      }

      const nbPlaces = org.membres.filter((membre) => membre.email_pro !== membre.email_perso).length;
      const montantTotal = nbPlaces * org.tarif;
      const devisExisting = await devisExists(organisationId, FORMATION_ID, SESSION_ID);
      let devisId = devisExisting?.id || '';
      let numeroDevis = devisExisting?.numero_devis || '';

      if (devisExisting) {
        log('WARN', 'Devis déjà existant pour cette organisation/formation/session', {
          devis_id: devisId,
          numero: numeroDevis,
        });
      } else if (DRY_RUN) {
        numeroDevis = genDevisNum(devisSeq++);
        devisId = `DRY-DEVIS-${org.code}`;
        log('INFO', '[DRY-RUN] Créerait Devis', {
          numero: numeroDevis,
          organisation: org.nom,
          formation: FORMATION_ID,
          session: SESSION_ID,
          nb_places: nbPlaces,
          tarif_unitaire: org.tarif,
          montant_total: montantTotal,
          statut: 'CREE',
          notes: org.notes,
        });
      } else {
        const createdDevis = await createDevisWithRetry({
          numeroDevisBase: devisSeq++,
          organisationId,
          formationId: FORMATION_ID,
          sessionId: SESSION_ID,
          nbPlaces,
          tarifUnitaire: org.tarif,
          montantTotal,
          notes: org.notes,
        });
        const devis = createdDevis.devis;
        numeroDevis = createdDevis.numeroDevis;
        devisId = devis.id;
        log('INFO', 'Devis créé', { numero: numeroDevis, montant: montantTotal, id: devisId });
        await sendDevisEmail({
          devis,
          organisation: {
            raison_sociale: org.nom,
            email: orgEmail,
            contact_referent: org.referent.nom,
            pays: org.pays,
            identifiant_legal: null,
          },
          formation: { intitule: formation.intitule },
          session: { date_debut: session.date_debut, date_fin: session.date_fin },
        });
        log('INFO', 'Email devis envoyé', {
          organisation: org.nom,
          email: orgEmail,
          numero_devis: numeroDevis,
        });
      }

      const voucherExpiration = session.date_fin ? new Date(session.date_fin) : new Date();
      if (!session.date_fin) {
        voucherExpiration.setDate(voucherExpiration.getDate() + VOUCHER_EXPIRATION_DAYS);
      }

      let voucherIdx = 0;
      for (const membre of org.membres) {
        if (membre.email_pro.toLowerCase() === membre.email_perso.toLowerCase()) {
          log('SKIP', 'email_pro = email_perso → MANUEL_REQUIS', {
            nom: membre.nom,
            email: membre.email_pro,
            organisation: org.nom,
          });
          continue;
        }

        const apprenantEmail = membre.email_perso.toLowerCase();
        let apprenantId: string;
        const existingApprenant = await apprenantExists(apprenantEmail);

        if (existingApprenant) {
          apprenantId = existingApprenant.id;
          log('WARN', 'Apprenant déjà en base — réutilisation', {
            email: apprenantEmail,
            id: apprenantId,
          });
          if (!DRY_RUN && existingApprenant.organisation_id !== organisationId) {
            await prisma.apprenant.update({
              where: { id: apprenantId },
              data: { organisation_id: organisationId },
            });
            log('INFO', 'Apprenant rattaché à l’organisation', {
              apprenant_id: apprenantId,
              organisation_id: organisationId,
            });
          }
        } else if (DRY_RUN) {
          apprenantId = `DRY-APP-${org.code}-${voucherIdx + 1}`;
          log('INFO', '[DRY-RUN] Créerait Apprenant', {
            id: apprenantId,
            email: apprenantEmail,
            nom: membre.nom,
            prenoms: membre.prenoms,
            type_apprenant: 'PROFESSIONNEL',
            secteur_activite: membre.secteur || null,
            organisation_id: organisationId,
          });
        } else {
          const createdApprenant = await prisma.apprenant.create({
            data: {
              email: apprenantEmail,
              password_hash: passwordHash,
              nom: membre.nom,
              prenoms: membre.prenoms || membre.nom,
              type_apprenant: 'PROFESSIONNEL',
              secteur_activite: membre.secteur || null,
              niveau_etude: null,
              pays_residence: org.pays,
              pays_nationalite: org.pays,
              langue_preferee: 'FR',
              role: 'APPRENANT',
              statut: 'ACTIF',
              consentement_rgpd: true,
              consentement_timestamp: new Date(),
              consentement_version_cgu: '1.0',
              token_confirmation: null,
              token_expiration: null,
              telephone: null,
              organisation_id: organisationId,
            },
          });
          apprenantId = createdApprenant.id;
          log('INFO', 'Apprenant créé', { email: apprenantEmail, id: apprenantId });
          await sendTemporaryPasswordEmail(apprenantEmail, 'APPRENANT', `${membre.prenoms} ${membre.nom}`);
        }

        const voucherCode = genVoucherCode(org.code, voucherIdx);
        const existingVoucher = await prisma.voucherOrganisation.findUnique({
          where: { code: voucherCode },
        });

        if (existingVoucher) {
          log('WARN', 'Voucher déjà existant — réutilisation', {
            code: voucherCode,
            id: existingVoucher.id,
          });
        } else if (DRY_RUN) {
          log('INFO', '[DRY-RUN] Créerait Voucher organisation', {
            code: voucherCode,
            apprenant: apprenantEmail,
            formation: FORMATION_ID,
            devis: numeroDevis,
            statut: 'EN_ATTENTE',
          });
        } else {
          await prisma.voucherOrganisation.create({
            data: {
              code: voucherCode,
              organisation_id: organisationId,
              formation_id: FORMATION_ID,
              devis_id: devisId || null,
              type: 'ORGANISATION',
              type_valeur: 'POURCENTAGE',
              valeur: 100,
              quota_max: 1,
              quota_utilise: 0,
              date_expiration: voucherExpiration,
              statut: devisId ? 'EN_ATTENTE' : 'ACTIF',
            },
          });
          log('INFO', 'Voucher organisation créé', { code: voucherCode, apprenant: apprenantEmail });
        }

        voucherIdx++;
      }
    }
  } catch (err: any) {
    log('ERROR', `Erreur inattendue : ${err.message}`, { stack: err.stack });
  } finally {
    await prisma.$disconnect();
    saveLogs();

    const errors = logs.filter((l) => l.level === 'ERROR').length;
    const skips = logs.filter((l) => l.level === 'SKIP').length;
    const warns = logs.filter((l) => l.level === 'WARN').length;
    const infos = logs.filter((l) => l.level === 'INFO').length;

    console.log('\n' + '═'.repeat(60));
    console.log(`  RÉSUMÉ ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}`);
    console.log(`  ✅ Opérations : ${infos}`);
    console.log(`  ⚠️  Warnings   : ${warns}`);
    console.log(`  ⏭️  Skips       : ${skips}`);
    console.log(`  ❌ Erreurs     : ${errors}`);
    console.log('═'.repeat(60) + '\n');

    if (errors > 0) process.exit(1);
  }
}

main();
