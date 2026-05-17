import { v4 as uuidv4 } from 'uuid';
import { createCipheriv, randomBytes } from 'crypto';
import { EspaceApprenantRepository } from './espace-apprenant.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';

const LIEN_EXPIRATION_HEURES = 24; // RM-26 : lien valide 24h
const AES_256_KEY_LENGTH = 32;

export class AttestationService {
  constructor(
    private readonly espaceRepo: EspaceApprenantRepository,
    private readonly audit: AuditLogger
  ) {}

  private sanitizePdfText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' ');
  }

  private buildPdfBuffer(lines: string[]): Buffer {
    const sanitizedLines = lines.map((line) => this.sanitizePdfText(line)).filter(Boolean);
    const content = [
      'BT',
      '/F1 16 Tf',
      '72 790 Td',
      `(${sanitizedLines[0] || 'ATTESTATION'}) Tj`,
      '/F1 11 Tf',
      ...sanitizedLines.slice(1).map((line) => `T* (${line}) Tj`),
      'ET',
    ].join('\n');

    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    const chunks: string[] = ['%PDF-1.4\n'];
    const offsets = [0];
    let currentOffset = Buffer.byteLength(chunks[0], 'utf8');

    objects.forEach((object, index) => {
      offsets.push(currentOffset);
      const serialized = `${index + 1} 0 obj\n${object}\nendobj\n`;
      chunks.push(serialized);
      currentOffset += Buffer.byteLength(serialized, 'utf8');
    });

    const xrefOffset = currentOffset;
    const xrefEntries = ['0000000000 65535 f '];
    for (let i = 1; i < offsets.length; i += 1) {
      xrefEntries.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
    }

    const trailer = [
      'xref',
      `0 ${objects.length + 1}`,
      ...xrefEntries,
      'trailer',
      `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
      'startxref',
      `${xrefOffset}`,
      '%%EOF',
      '',
    ].join('\n');

    chunks.push(trailer);
    return Buffer.from(chunks.join(''), 'utf8');
  }

  // RM-26 : attestation disponible si dossier PAYE + session CLOTUREE
  async verifierDisponibilite(dossier_id: string, apprenant_id: string) {
    const dossier = await this.espaceRepo.findDossierById(dossier_id, apprenant_id);
    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    if (dossier.apprenant_id !== apprenant_id) throw new Error('FORBIDDEN');

    // Condition 1 : dossier PAYE
    if (dossier.statut !== 'PAYE') throw new Error('ATTESTATION_DOSSIER_NON_PAYE');

    // Condition 2 : session CLOTUREE (RM-26)
    if (!dossier.session || dossier.session.statut !== 'CLOTUREE') {
      throw new Error('ATTESTATION_SESSION_NON_CLOTUREE');
    }

    return dossier;
  }

  // Génération URL signée attestation (MT-02 : AES-256)
  async genererLienAttestation(dossier_id: string, apprenant_id: string): Promise<string> {
    const dossier = await this.verifierDisponibilite(dossier_id, apprenant_id);

    // Token signé avec expiration 24h (MT-02)
    const token = uuidv4();
    const expiration = new Date(Date.now() + LIEN_EXPIRATION_HEURES * 3600 * 1000);

    // Chiffrement AES-256 du token (MT-02)
    const key = this.getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const payload = JSON.stringify({ token, dossier_id, apprenant_id, expiration });
    const encrypted = cipher.update(payload, 'utf8', 'hex') + cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    await this.audit.info('ATTESTATION_GENEREE', {
      dossier_id,
      apprenant_id,
      formation: dossier.formation?.intitule
    });

    return `/api/attestations/${dossier_id}/download?token=${encrypted}&iv=${iv.toString('hex')}&tag=${tag}`;
  }

  // Génération PDF simple pour téléchargement local
  async genererPdfAttestation(dossier_id: string, apprenant_id: string) {
    const dossier = await this.verifierDisponibilite(dossier_id, apprenant_id);
    const dossierData = dossier as any;
    const formation = dossierData.formation || {};
    const session = dossierData.session || {};
    const pdfBuffer = this.buildPdfBuffer([
      'ATTESTATION DE FORMATION',
      `Dossier: ${dossierData.id || dossier_id}`,
      `Apprenant: ${[dossierData.apprenant?.prenoms, dossierData.apprenant?.nom].filter(Boolean).join(' ') || dossierData.apprenant_id || apprenant_id}`,
      `Formation: ${formation.intitule || formation.titre || 'N/A'}`,
      `Session: ${session.date_debut ? new Date(session.date_debut).toLocaleDateString('fr-FR') : '-'} au ${session.date_fin ? new Date(session.date_fin).toLocaleDateString('fr-FR') : '-'}`,
      `Date de generation: ${new Date().toLocaleDateString('fr-FR')}`,
      'Document officiel FORGES',
    ]);

    const slug = this.sanitizePdfText(formation.intitule || formation.titre || 'attestation')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      filename: `attestation-${slug || dossier_id}.pdf`,
      buffer: pdfBuffer,
    };
  }

  // Génération PDF attestation
  genererContenuPDF(dossier: any): object {
    return {
      uuid: uuidv4(),                           // RM-26 : UUID unique
      nom: `${dossier.apprenant?.prenoms} ${dossier.apprenant?.nom}`,
      formation: dossier.formation?.intitule,
      duree_jours: dossier.formation?.duree_jours,
      date_debut: dossier.session?.date_debut,
      date_fin: dossier.session?.date_fin,
      date_generation: new Date().toISOString(),
      cachet: 'GIE FORGES AGRÉGATEUR',          // RM-26 : cachet électronique
    };
  }

  private getEncryptionKey(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY;

    if (!rawKey) {
      throw new Error('INVALID_ENCRYPTION_KEY');
    }

    const trimmedKey = rawKey.trim();
    const isHexKey = /^[0-9a-fA-F]+$/.test(trimmedKey) && trimmedKey.length === AES_256_KEY_LENGTH * 2;
    const key = isHexKey ? Buffer.from(trimmedKey, 'hex') : Buffer.from(trimmedKey, 'base64');

    if (key.length !== AES_256_KEY_LENGTH) {
      throw new Error('INVALID_ENCRYPTION_KEY');
    }

    return key;
  }
}
