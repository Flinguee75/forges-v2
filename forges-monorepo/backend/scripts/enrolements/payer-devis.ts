/**
 * Script de confirmation de paiement d'un devis (étape 6 du workflow organisation).
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/enrolements/payer-devis.ts \
 *     --devis FORGES-DEVIS-2026-001
 *
 * Ce script (RM-41 — paiement organisation sur devis) :
 *   1. Passe le devis en statut PAYE
 *   2. Active les vouchers liés (EN_ATTENTE -> ACTIF)
 *   3. Crée les dossiers PAYE pour chaque apprenant de l'organisation
 *   4. Envoie les emails de confirmation a chaque apprenant
 *
 * Variable EMAIL_TEST_OVERRIDE : redirige tous les emails vers cette adresse.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { EmailService } from '../../src/shared/email/email.service';

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('DATABASE_URL requis');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?connection_limit=3` } },
});

const args = process.argv.slice(2);
const devisFlag = args.indexOf('--devis');
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';

if (devisFlag === -1) {
  console.error('Usage: payer-devis.ts --devis <numero_devis_ou_id> [--dry-run]');
  process.exit(1);
}

const devisRef = args[devisFlag + 1];
const EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE || null;

function resolveEmail(email: string): string {
  return EMAIL_OVERRIDE || email;
}

async function run() {
  console.log(`\n=== Confirmation paiement devis: ${devisRef} ${dryRun ? '(DRY-RUN)' : ''} ===\n`);

  // Charger le devis
  const devis = await prisma.devis.findFirst({
    where: {
      OR: [{ numero_devis: devisRef }, { id: devisRef }],
    },
    include: {
      organisation: true,
      formation: true,
      session: true,
    },
  });

  if (!devis) {
    console.error(`Devis introuvable: ${devisRef}`);
    process.exit(1);
  }

  if (devis.statut === 'PAYE') {
    console.error(`Devis déjà en statut PAYE. Rien à faire.`);
    process.exit(0);
  }

  if (devis.statut === 'ANNULE') {
    console.error(`Devis ANNULE. Impossible de valider le paiement.`);
    process.exit(1);
  }

  console.log(`Devis     : ${devis.numero_devis}`);
  console.log(`Org       : ${devis.organisation.raison_sociale}`);
  console.log(`Formation : ${devis.formation.intitule}`);
  console.log(`Session   : ${devis.session ? `${devis.session.date_debut.toLocaleDateString('fr-FR')} — ${devis.session.date_fin.toLocaleDateString('fr-FR')}` : '(pas de session)'}`);
  console.log(`Montant   : ${devis.montant_total_xof.toLocaleString('fr-FR')} FCFA`);
  console.log(`Places    : ${devis.nb_places}\n`);

  // --- Etape 1: Passer le devis en PAYE ---
  console.log('[1/4] Passage devis en PAYE...');
  if (!dryRun) {
    await prisma.devis.update({
      where: { id: devis.id },
      data: { statut: 'PAYE', paid_at: new Date() },
    });
  }
  console.log(`  -> ${dryRun ? '[DRY] ' : ''}Devis ${devis.numero_devis} -> PAYE`);

  // --- Etape 2: Activer les vouchers liés ---
  console.log('[2/4] Activation des vouchers...');
  const vouchers = await prisma.voucherOrganisation.findMany({
    where: { devis_id: devis.id },
  });

  if (vouchers.length === 0) {
    console.log('  ! Aucun voucher lié à ce devis. Vérifiez que import-groupe.ts a bien été exécuté.');
  }

  for (const voucher of vouchers) {
    if (!dryRun) {
      await prisma.voucherOrganisation.update({
        where: { id: voucher.id },
        data: { statut: 'ACTIF' },
      });
    }
    console.log(`  -> ${dryRun ? '[DRY] ' : ''}Voucher ${voucher.code} -> ACTIF`);
  }

  // --- Etape 3: Créer les dossiers PAYE pour chaque apprenant ---
  console.log('[3/4] Création des dossiers PAYE...');
  const apprenants = await prisma.apprenant.findMany({
    where: { organisation_id: devis.organisation_id },
  });

  const emailService = new EmailService();
  const dossierIds: string[] = [];

  for (let i = 0; i < apprenants.length; i++) {
    const apprenant = apprenants[i];
    const voucher = vouchers[i] || null;

    // Vérifier si un dossier existe déjà pour cet apprenant/formation/session
    const dossierExistant = await prisma.dossier.findFirst({
      where: {
        apprenant_id: apprenant.id,
        formation_id: devis.formation_id,
        ...(devis.session_id ? { session_id: devis.session_id } : {}),
      },
    });

    if (dossierExistant) {
      console.log(`  -> Dossier existant pour ${apprenant.nom} ${apprenant.prenoms} (${dossierExistant.statut})`);
      dossierIds.push(dossierExistant.id);
      continue;
    }

    let dossierId: string;

    if (!dryRun) {
      const dossier = await prisma.dossier.create({
        data: {
          apprenant_id: apprenant.id,
          formation_id: devis.formation_id,
          session_id: devis.session_id || null,
          // RM-41 : voucher organisation 100% -> PAYE directement, sans NGSER
          statut: 'PAYE',
          source_financement: 'VOUCHER_ORGANISATION',
          voucher_organisation_id: voucher?.id || null,
          voucher_code: voucher?.code || null,
          montant_remise: devis.tarif_unitaire_xof,
        },
      });
      dossierId = dossier.id;

      // Mettre à jour quota utilisé du voucher
      if (voucher) {
        await prisma.voucherOrganisation.update({
          where: { id: voucher.id },
          data: { quota_utilise: { increment: 1 }, date_derniere_utilisation: new Date() },
        });
      }

      // Mettre à jour le nb_inscrits de la session
      if (devis.session_id) {
        await prisma.session.update({
          where: { id: devis.session_id },
          data: { nb_inscrits: { increment: 1 }, places_restantes: { decrement: 1 } },
        });
      }

      // Créer le paiement associé (methode VOUCHER_ORGANISATION, statut CONFIRME)
      await prisma.paiement.create({
        data: {
          dossier_id: dossierId,
          montant_catalogue: devis.tarif_unitaire_xof,
          montant_final: 0,
          methode: 'VOUCHER_ORGANISATION',
          statut: 'CONFIRME',
          reduction_appliquee: devis.tarif_unitaire_xof,
        },
      });
    } else {
      dossierId = `DRY-DOSSIER-${apprenant.id.slice(-6)}`;
    }

    dossierIds.push(dossierId);
    console.log(`  -> ${dryRun ? '[DRY] ' : ''}Dossier ${dossierId} [PAYE] pour ${apprenant.nom} ${apprenant.prenoms}`);
  }

  // --- Etape 4: Emails de confirmation ---
  console.log('[4/4] Envoi emails de confirmation...');
  const org = devis.organisation;
  const formation = devis.formation;
  const session = devis.session;

  const dateDebutStr = session
    ? session.date_debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'à confirmer';
  const dateFinStr = session
    ? session.date_fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'à confirmer';

  for (const apprenant of apprenants) {
    const destinataire = resolveEmail(apprenant.email);

    if (!dryRun) {
      // Email 1 : confirmation d'inscription (place confirmée)
      await emailService.sendEnrolementConfirmationApprenant({
        to: destinataire,
        prenoms: apprenant.prenoms,
        nom: apprenant.nom,
        organisation: org.raison_sociale,
        formation: formation.intitule,
        session: {
          date_debut: session.date_debut,
          date_fin: session.date_fin,
          lieu: session.lieu || null,
        },
      });

      // Email 2 : confirmation paiement
      await emailService.sendPaiementConfirme(destinataire, formation.intitule);
    }

    console.log(`  -> ${dryRun ? '[DRY] ' : ''}Emails envoyes a ${apprenant.prenoms} ${apprenant.nom} <${destinataire}>`);
  }

  // --- Resume ---
  console.log('\n=== Resume ===');
  console.log(`Devis          : ${devis.numero_devis} -> PAYE`);
  console.log(`Vouchers actives: ${vouchers.length}`);
  console.log(`Dossiers PAYE  : ${dossierIds.length}`);
  console.log(`Emails envoyes : ${apprenants.length} apprenants`);
  console.log(`Session        : ${dateDebutStr} — ${dateFinStr}`);
  if (dryRun) console.log('\n[DRY-RUN] Aucune donnee ecrite.');
  console.log('\nProchaine etape : rappel J-7 avec scripts/enrolements/rappel-j7.ts');
}

run()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur payer-devis:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
