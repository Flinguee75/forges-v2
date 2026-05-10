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
    execSync(`soffice --headless --convert-to pdf --outdir "${tmpDir}" "${docxPath}"`, { timeout: 30000 });

    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF_CONVERSION_FAILED');
    }

    return fs.readFileSync(pdfPath);
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
      fs.rmdirSync(tmpDir);
    } catch {
      // ignore cleanup errors
    }
  }
}
