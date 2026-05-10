import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { genererDocxDevis } from './devis-docx.service';

function writeTempFile(dir: string, filename: string, content: Buffer): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function convertDocxToPdf(docxPath: string, outDir: string): Buffer {
  const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');
  const commands = ['soffice', 'libreoffice'];

  for (const command of commands) {
    try {
      execSync(`${command} --headless --convert-to pdf --outdir "${outDir}" "${docxPath}"`, {
        timeout: 30000,
        stdio: 'pipe',
      });

      if (fs.existsSync(pdfPath)) {
        return fs.readFileSync(pdfPath);
      }
    } catch {
      // On tente le convertisseur suivant.
    }
  }

  throw new Error('PDF_CONVERSION_UNAVAILABLE');
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

  try {
    return convertDocxToPdf(docxPath, tmpDir);
  } finally {
    try {
      if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
    } catch {
      // ignore cleanup errors
    }

    try {
      const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');
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
