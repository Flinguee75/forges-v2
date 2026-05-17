/**
 * Script rappel J-7 : envoie les informations pratiques aux apprenants 7 jours avant la session.
 *
 * Usage:
 *   node -r ts-node/register/transpile-only scripts/enrolements/rappel-j7.ts \
 *     --devis FORGES-DEVIS-2026-001
 *
 * Envoie a chaque apprenant ayant un dossier PAYE sur le devis :
 *   - Lieu, horaires, dress code, documents à apporter
 *   - Informations de connexion à la plateforme FORGES
 *
 * Variable EMAIL_TEST_OVERRIDE : redirige tous les emails.
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
  console.error('Usage: rappel-j7.ts --devis <numero_devis_ou_id> [--dry-run]');
  process.exit(1);
}

const devisRef = args[devisFlag + 1];
const EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE || null;

// Informations pratiques de la Masterclass GWU/CCDL
const INFOS_PRATIQUES = {
  lieu: process.env.MASTERCLASS_LIEU || 'Hôtel Ivoire — Salle Conférence A — Abidjan, Côte d\'Ivoire',
  horaires: process.env.MASTERCLASS_HORAIRES || '08h30 – 17h30 (accueil dès 08h00)',
  dress_code: 'Tenue professionnelle souhaitée',
  documents: 'Pièce d\'identité nationale ou passeport en cours de validité',
  acces_plateforme: process.env.FRONTEND_URL || 'https://forges-group.com',
  contact_logistique: process.env.EMAIL_FROM || 'contact@forges-group.com',
};

async function run() {
  console.log(`\n=== Rappel J-7 — devis: ${devisRef} ${dryRun ? '(DRY-RUN)' : ''} ===\n`);

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

  if (devis.statut !== 'PAYE') {
    console.error(`Le devis n'est pas encore en statut PAYE (statut actuel: ${devis.statut}). Confirmez d'abord le paiement.`);
    process.exit(1);
  }

  const session = devis.session;
  const formation = devis.formation;
  const org = devis.organisation;

  const dateDebutStr = session
    ? session.date_debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'à confirmer';
  const dateFinStr = session
    ? session.date_fin.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'à confirmer';

  console.log(`Formation : ${formation.intitule}`);
  console.log(`Session   : ${dateDebutStr} — ${dateFinStr}`);
  console.log(`Org       : ${org.raison_sociale}`);
  console.log(`Lieu      : ${INFOS_PRATIQUES.lieu}\n`);

  // Récupérer les dossiers PAYE liés a cette organisation + formation
  const apprenants = await prisma.apprenant.findMany({
    where: { organisation_id: devis.organisation_id },
  });

  const emailService = new EmailService();
  let compteur = 0;

  for (const apprenant of apprenants) {
    // Vérifier qu'un dossier PAYE existe pour cet apprenant
    const dossier = await prisma.dossier.findFirst({
      where: {
        apprenant_id: apprenant.id,
        formation_id: devis.formation_id,
        statut: 'PAYE',
      },
    });

    if (!dossier) {
      console.log(`  ! Pas de dossier PAYE pour ${apprenant.nom} ${apprenant.prenoms} — ignoré`);
      continue;
    }

    const destinataire = EMAIL_OVERRIDE || apprenant.email;

    if (!dryRun) {
      await emailService.sendEmail({
        to: destinataire,
        subject: `Rappel J-7 — ${formation.intitule} — Informations pratiques`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
            <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">FORGES AGRÉGATEUR</h1>
              <p style="color:#a0a8c0;margin:4px 0 0;font-size:13px;">Rappel — J-7 avant votre formation</p>
            </div>

            <div style="background:#f8f9fb;padding:32px;border-radius:0 0 8px 8px;">
              <p style="font-size:15px;color:#333;margin-top:0;">Bonjour <strong>${apprenant.prenoms} ${apprenant.nom}</strong>,</p>
              <p style="font-size:14px;color:#555;">
                Votre participation à la <strong>${formation.intitule}</strong> débute dans
                <strong>7 jours</strong>. Voici les informations pratiques pour préparer votre venue.
              </p>

              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:24px 0;">
                <div style="background:#1a1a2e;padding:12px 16px;">
                  <p style="color:#fff;margin:0;font-size:13px;font-weight:700;">Informations pratiques</p>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                  <tr>
                    <td style="padding:12px 16px;color:#666;font-weight:600;border-bottom:1px solid #f0f0f0;width:40%;">Dates</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">${dateDebutStr} au ${dateFinStr}</td>
                  </tr>
                  <tr style="background:#fafafa;">
                    <td style="padding:12px 16px;color:#666;font-weight:600;border-bottom:1px solid #f0f0f0;">Horaires</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">${INFOS_PRATIQUES.horaires}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;color:#666;font-weight:600;border-bottom:1px solid #f0f0f0;">Lieu</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">${INFOS_PRATIQUES.lieu}</td>
                  </tr>
                  <tr style="background:#fafafa;">
                    <td style="padding:12px 16px;color:#666;font-weight:600;border-bottom:1px solid #f0f0f0;">Dress code</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">${INFOS_PRATIQUES.dress_code}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;color:#666;font-weight:600;">Documents</td>
                    <td style="padding:12px 16px;">${INFOS_PRATIQUES.documents}</td>
                  </tr>
                </table>
              </div>

              <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-size:13px;color:#1e40af;">
                  <strong>Accès plateforme FORGES :</strong>
                  <a href="${INFOS_PRATIQUES.acces_plateforme}" style="color:#1e40af;">${INFOS_PRATIQUES.acces_plateforme}</a><br>
                  Connectez-vous avec l'email et le mot de passe temporaire communiqués lors de votre inscription.
                </p>
              </div>

              <p style="font-size:14px;color:#555;">
                Pour toute question logistique, contactez-nous :
                <a href="mailto:${INFOS_PRATIQUES.contact_logistique}" style="color:#1a1a2e;font-weight:600;">${INFOS_PRATIQUES.contact_logistique}</a>
              </p>

              <p style="font-size:13px;color:#888;margin-top:24px;">
                Prise en charge : <strong>${org.raison_sociale}</strong>
              </p>
            </div>
          </div>
        `,
      });
    }

    compteur++;
    console.log(`  -> ${dryRun ? '[DRY] ' : ''}Rappel J-7 envoye a ${apprenant.prenoms} ${apprenant.nom} <${destinataire}>`);
  }

  console.log(`\n=== Resume ===`);
  console.log(`Emails envoyes : ${compteur} / ${apprenants.length}`);
  if (dryRun) console.log('\n[DRY-RUN] Aucune donnee ecrite.');
}

run()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur rappel-j7:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
