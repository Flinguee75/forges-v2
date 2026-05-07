/**
 * Script one-shot : envoie le devis ANSSI CI a test-override@forges-test.ci
 * Usage: node -r ts-node/register/transpile-only scripts/enrolements/envoyer-devis-anssi.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { EmailService } from '../../src/shared/email/email.service';
import { genererDocxDevis } from '../../src/modules/devis/devis-docx.service';

const DESTINATAIRE = process.env.EMAIL_TEST_OVERRIDE || 'test-override@forges-test.ci';

const prisma = new PrismaClient({
  datasources: { db: { url: (process.env.DATABASE_URL || '') + (process.env.DATABASE_URL?.includes('connection_limit') ? '' : '?connection_limit=3') } },
});

async function main() {
  const devis = await prisma.devis.findFirst({
    where: { organisation: { raison_sociale: { contains: 'ANSSI' } } },
    include: { organisation: true, formation: true, session: true },
    orderBy: { created_at: 'desc' },
  });

  if (!devis) {
    console.error('Aucun devis ANSSI trouve en base.');
    process.exit(1);
  }

  console.log(`Devis trouve : ${devis.numero_devis}`);
  console.log(`Organisation : ${devis.organisation.raison_sociale}`);
  console.log(`Formation    : ${devis.formation.intitule}`);
  console.log(`Montant      : ${devis.montant_total_xof.toLocaleString('fr-FR')} FCFA`);
  console.log(`Destinataire : ${DESTINATAIRE} (override test)`);

  const emailService = new EmailService();

  let docxBuffer: Buffer | undefined;
  try {
    docxBuffer = genererDocxDevis({
      numero_devis: devis.numero_devis,
      created_at: devis.created_at,
      nb_places: devis.nb_places,
      tarif_unitaire_xof: devis.tarif_unitaire_xof,
      montant_total_xof: devis.montant_total_xof,
      organisation: devis.organisation,
      formation: devis.formation,
      session: devis.session,
    });
    console.log(`Devis DOCX genere : ${docxBuffer.length} octets`);
  } catch (err: any) {
    console.warn(`DOCX non genere (non bloquant): ${err.message}`);
  }

  const sujet = `Votre devis ${devis.numero_devis} — FORGES AGREGATEUR`;
  const html = buildEmailHtml(devis);

  if (docxBuffer) {
    await emailService.sendEmailWithAttachment({
      to: DESTINATAIRE,
      subject: sujet,
      html,
      attachment: {
        filename: `${devis.numero_devis}.docx`,
        content: docxBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });
    console.log(`Email avec devis DOCX envoye a ${DESTINATAIRE}`);
  } else {
    await emailService.sendEmail({ to: DESTINATAIRE, subject: sujet, html });
    console.log(`Email (sans devis) envoye a ${DESTINATAIRE}`);
  }
}

function buildEmailHtml(devis: any): string {
  const org = devis.organisation;
  const formation = devis.formation;
  const montant = devis.montant_total_xof.toLocaleString('fr-FR');
  const tarif = devis.tarif_unitaire_xof.toLocaleString('fr-FR');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
      <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">FORGES AGREGATEUR</h1>
        <p style="color: #a0a8c0; margin: 4px 0 0;">Devis de formation</p>
      </div>

      <div style="background: #f8f9fb; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="color: #555; font-size: 15px;">
          Bonjour,<br><br>
          Veuillez trouver ci-joint votre devis <strong>${devis.numero_devis}</strong>
          pour la formation <strong>${formation.intitule}</strong>.
        </p>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #888;">Organisation</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right;">${org.raison_sociale}</td>
            </tr>
            <tr style="border-top: 1px solid #f0f0f0;">
              <td style="padding: 8px 0; color: #888;">Formation</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right;">${formation.intitule}</td>
            </tr>
            <tr style="border-top: 1px solid #f0f0f0;">
              <td style="padding: 8px 0; color: #888;">Nombre de places</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right;">${devis.nb_places}</td>
            </tr>
            <tr style="border-top: 1px solid #f0f0f0;">
              <td style="padding: 8px 0; color: #888;">Tarif unitaire</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right;">${tarif} FCFA</td>
            </tr>
            <tr style="border-top: 2px solid #1a1a2e;">
              <td style="padding: 12px 0; font-weight: 700; font-size: 15px;">MONTANT TOTAL</td>
              <td style="padding: 12px 0; font-weight: 700; font-size: 18px; text-align: right; color: #1a1a2e;">${montant} FCFA</td>
            </tr>
          </table>
        </div>

        ${devis.notes_admin ? `<p style="font-size: 13px; color: #888; font-style: italic;">${devis.notes_admin}</p>` : ''}

        <p style="font-size: 13px; color: #888; margin-top: 32px;">
          Pour toute question : <a href="mailto:contact@forges-group.com" style="color: #1a1a2e;">contact@forges-group.com</a>
        </p>
      </div>
    </div>
  `;
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
