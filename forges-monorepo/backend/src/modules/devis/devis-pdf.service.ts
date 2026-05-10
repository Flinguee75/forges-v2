import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import { genererDocxDevis } from './devis-docx.service';

const LOGO_PATH = path.join(__dirname, '../../../../frontend/src/assets/logo_forges.png');

function writeTempFile(dir: string, filename: string, content: Buffer): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function getLogoBuffer(): Buffer | null {
  try {
    if (!fs.existsSync(LOGO_PATH)) return null;
    return fs.readFileSync(LOGO_PATH);
  } catch {
    return null;
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Non renseignee';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMontant(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('fr-FR') + ' FCFA';
}

function buildFallbackPdf(params: {
  devis: any;
  organisation: any;
  formation: any;
  session: any;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logo = getLogoBuffer();
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.fillColor('#1B4F72');
    if (logo) {
      try {
        doc.image(logo, left, 32, { fit: [64, 64] });
      } catch {
        // Logo optionnel.
      }
    }

    doc.fontSize(20).text('FORGES AGRÉGATEUR', left + 84, 36, { continued: false });
    doc.fontSize(11).fillColor('#566573').text(`Devis ${params.devis.numero_devis}`, left + 84, 62);

    doc.moveDown(2);
    doc.moveTo(left, 110).lineTo(left + width, 110).strokeColor('#D5D8DC').stroke();

    doc.moveDown(1.2);
    doc.fontSize(12).fillColor('#1C2833');
    doc.text(`Organisation : ${params.organisation?.raison_sociale || ''}`);
    doc.text(`Contact référent : ${params.organisation?.contact_referent || ''}`);
    doc.text(`Formation : ${params.formation?.intitule || ''}`);

    const sessionLabel = params.session?.date_debut && params.session?.date_fin
      ? `Du ${formatDate(params.session.date_debut)} au ${formatDate(params.session.date_fin)}`
      : 'Session non renseignée';
    doc.text(`Session : ${sessionLabel}`);

    doc.moveDown(0.8);
    doc.fontSize(11).fillColor('#566573');
    doc.text(`Date d'émission : ${formatDate(params.devis.created_at)}`);
    doc.text(`Nombre de places : ${params.devis.nb_places}`);
    doc.text(`Tarif unitaire : ${formatMontant(params.devis.tarif_unitaire_xof)}`);
    doc.text(`Montant total : ${formatMontant(params.devis.montant_total_xof)}`);

    if (params.devis.notes_admin) {
      doc.moveDown(0.8);
      doc.fillColor('#D35400').fontSize(10).text(`Note : ${params.devis.notes_admin}`, {
        width,
      });
    }

    doc.moveDown(1.5);
    doc.fillColor('#1C2833').fontSize(11).text(
      'Le devis est joint à cet email au format PDF. Ce document reprend les informations officielles du devis et de la session sélectionnée.',
      { width }
    );

    doc.end();
  });
}

export async function genererPdfDevis(params: {
  devis: any;
  organisation: any;
  formation: any;
  session: any;
}): Promise<Buffer> {
  const docxBuffer = genererDocxDevis({
    numero_devis: params.devis.numero_devis,
    created_at: params.devis.created_at,
    nb_places: params.devis.nb_places,
    tarif_unitaire_xof: params.devis.tarif_unitaire_xof,
    montant_total_xof: params.devis.montant_total_xof,
    organisation: params.organisation,
    formation: params.formation,
    session: params.session,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forges-devis-'));
  const baseName = `${params.devis.numero_devis}-${randomUUID()}`;
  const docxPath = writeTempFile(tmpDir, `${baseName}.docx`, docxBuffer);
  const pdfPath = path.join(tmpDir, `${baseName}.pdf`);

  try {
    try {
      execSync(`soffice --headless --convert-to pdf --outdir "${tmpDir}" "${docxPath}"`, { timeout: 30000 });
      if (fs.existsSync(pdfPath)) {
        return fs.readFileSync(pdfPath);
      }
    } catch {
      // Fallback natif ci-dessous.
    }

    return await buildFallbackPdf(params);
  } finally {
    try {
      if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
    } catch {
      // ignore cleanup errors
    }

    try {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    } catch {
      // ignore cleanup errors
    }

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
