/**
 * Script one-shot : envoie le devis ANSSI CI a test-override@forges-test.ci
 * Usage: node -r ts-node/register/transpile-only scripts/enrolements/envoyer-devis-anssi.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../../src/shared/email/email.service';
import { genererDocxDevis } from '../../src/modules/devis/devis-docx.service';

const LOGO_PATH = path.join(__dirname, '../../../frontend/src/assets/logo_forges.png');

function getLogoBase64(): string {
  if (!fs.existsSync(LOGO_PATH)) return '';
  // Redimensionner a 120x120 via sharp si disponible, sinon passer brut
  try {
    const sharp = require('sharp');
    // sharp est async — on retourne vide ici, le caller gere
    return '';
  } catch {
    // Fallback : encode brut (lourd mais fonctionnel)
    return `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
  }
}

// Logo redimensionne charge de facon synchrone via child_process python
function getLogoBase64Sync(): string {
  if (!fs.existsSync(LOGO_PATH)) return '';
  try {
    const { execSync } = require('child_process');
    const b64 = execSync(
      `python3 -c "
from PIL import Image
import base64, io
img = Image.open('${LOGO_PATH}').convert('RGBA')
img.thumbnail((120, 120))
buf = io.BytesIO()
img.save(buf, format='PNG', optimize=True)
print(base64.b64encode(buf.getvalue()).decode(), end='')
"`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    return `data:image/png;base64,${b64}`;
  } catch {
    return `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
  }
}

const logoBase64 = getLogoBase64Sync();

const DESTINATAIRE = process.env.EMAIL_TEST_OVERRIDE || 'apprenant2@org-test.ci';

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

  // Nom de formation reel pour l'affichage email
  const devisAffichage = {
    ...devis,
    formation: { ...devis.formation, intitule: 'Masterclass GWU/CCDL' },
  };

  let docxBuffer: Buffer | undefined;
  try {
    docxBuffer = genererDocxDevis({
      numero_devis: devis.numero_devis,
      created_at: devis.created_at,
      nb_places: devis.nb_places,
      tarif_unitaire_xof: devis.tarif_unitaire_xof,
      montant_total_xof: devis.montant_total_xof,
      organisation: devis.organisation,
      formation: devisAffichage.formation,
      session: devis.session,
    });
    console.log(`Facture DOCX generee : ${docxBuffer.length} octets`);
  } catch (err: any) {
    console.warn(`DOCX non genere (non bloquant): ${err.message}`);
  }

  const sujet = `Votre facture ${devis.numero_devis} — FORGES AGREGATEUR`;
  const html = buildEmailHtml(devisAffichage);

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
    console.log(`Email avec facture DOCX envoye a ${DESTINATAIRE}`);
  } else {
    await emailService.sendEmail({ to: DESTINATAIRE, subject: sujet, html });
    console.log(`Email (sans facture) envoye a ${DESTINATAIRE}`);
  }
}

function buildEmailHtml(devis: any): string {
  const org = devis.organisation;
  const formation = devis.formation;
  const montant = devis.montant_total_xof.toLocaleString('fr-FR');
  const tarif = devis.tarif_unitaire_xof.toLocaleString('fr-FR');
  const BLEU = '#0d1b6e';
  const OR = '#FFE500';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(4,26,159,0.12);">

        <!-- HEADER -->
        <tr>
          <td style="background:${BLEU};padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="72" valign="middle">
                  ${logoBase64 ? `<img src="${logoBase64}" alt="FORGES" width="60" height="60" style="display:block;border-radius:8px;" />` : ''}
                </td>
                <td valign="middle" style="padding-left:16px;">
                  <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">FORGES AGRÉGATEUR</div>
                  <div style="color:${OR};font-size:13px;margin-top:4px;font-weight:600;">Plateforme de formations certifiantes</div>
                </td>
                <td align="right" valign="middle">
                  <div style="background:${OR};color:${BLEU};padding:8px 16px;border-radius:6px;font-weight:700;font-size:12px;text-align:center;letter-spacing:0.5px;">
                    FACTURE<br>
                    <span style="font-size:10px;font-weight:400;">${devis.numero_devis}</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BANDE OR -->
        <tr><td style="background:${OR};height:4px;"></td></tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px;">

            <p style="margin:0 0 8px;font-size:15px;color:#333;">
              Bonjour <strong>${org.contact_referent || org.raison_sociale}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              Veuillez trouver ci-jointe la facture <strong style="color:${BLEU};">${devis.numero_devis}</strong>
              etablie pour <strong>${org.raison_sociale}</strong> concernant la formation
              <strong>${formation.intitule}</strong>.
            </p>

            <!-- RECAP TABLE -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:14px;">
              <tr style="background:${BLEU};">
                <td style="padding:12px 16px;color:#ffffff;font-weight:700;">Formation</td>
                <td style="padding:12px 16px;color:${OR};font-weight:700;text-align:right;">${formation.intitule}</td>
              </tr>
              <tr style="background:#f8f9fb;">
                <td style="padding:11px 16px;color:#666;">Nombre de places</td>
                <td style="padding:11px 16px;font-weight:600;text-align:right;color:#333;">${devis.nb_places}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;color:#666;border-top:1px solid #e2e8f0;">Tarif unitaire</td>
                <td style="padding:11px 16px;font-weight:600;text-align:right;color:#333;border-top:1px solid #e2e8f0;">${tarif} FCFA</td>
              </tr>
              <tr style="background:${BLEU};">
                <td style="padding:14px 16px;color:#ffffff;font-weight:700;font-size:15px;">MONTANT TOTAL</td>
                <td style="padding:14px 16px;color:${OR};font-weight:700;font-size:18px;text-align:right;">${montant} FCFA</td>
              </tr>
            </table>

            ${devis.notes_admin ? `
            <p style="margin:20px 0 0;font-size:13px;color:#888;font-style:italic;border-left:3px solid ${OR};padding-left:12px;">${devis.notes_admin}</p>
            ` : ''}

            <p style="margin:28px 0 0;font-size:14px;color:#555;line-height:1.6;">
              La facture est jointe a cet email au format PDF.<br>
              Apres validation, notre equipe vous communiquera les acces a la plateforme FORGES.
            </p>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:${BLEU};padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#a0b0e0;font-size:12px;">
                  <strong style="color:#ffffff;">FORGES AGRÉGATEUR</strong><br>
                  contact@forges-group.com &nbsp;|&nbsp; www.forges-group.com
                </td>
                <td align="right">
                  <div style="width:8px;height:8px;background:${OR};border-radius:50%;display:inline-block;"></div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
