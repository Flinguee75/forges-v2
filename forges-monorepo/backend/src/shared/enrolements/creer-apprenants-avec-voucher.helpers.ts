import { getMissingHeaders, parseCsvTable } from '../csv/csv-parser';

export type CsvApprenantAvecVoucher = {
  lineNumber: number;
  nom: string;
  prenom: string;
  email: string;
  organisation: string;
  voucher: string | null;
};

export type InscriptionVoucherInput = {
  session_id: string;
  apprenantId: string;
  source_financement: 'RETAIL';
  voucher_code: string | null;
  code_apporteur: null;
};

function requireTrimmed(value: string | undefined, fieldName: string, lineNumber?: number) {
  const trimmed = value?.trim() || '';
  if (!trimmed) {
    const lineInfo = lineNumber ? ` (ligne ${lineNumber})` : '';
    throw new Error(`Champ requis manquant${lineInfo}: ${fieldName}`);
  }

  return trimmed;
}

export function normalizeVoucher(value: string | undefined) {
  const trimmed = value?.trim() || '';
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCsvApprenantsAvecVoucher(csvContent: string): CsvApprenantAvecVoucher[] {
  const parsed = parseCsvTable(csvContent);
  const requiredHeaders = ['nom', 'prenom', 'email', 'organisation', 'voucher'];
  const missingHeaders = getMissingHeaders(parsed.headers, requiredHeaders);

  if (missingHeaders.length > 0) {
    throw new Error(`Colonnes CSV manquantes: ${missingHeaders.join(', ')}`);
  }

  const seenEmails = new Map<string, number>();
  const duplicateEmails: Array<{ email: string; firstLine: number; secondLine: number }> = [];

  parsed.rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const email = requireTrimmed(row.email, 'email', lineNumber).toLowerCase();

    if (seenEmails.has(email)) {
      duplicateEmails.push({ email, firstLine: seenEmails.get(email) || lineNumber, secondLine: lineNumber });
      return;
    }

    seenEmails.set(email, lineNumber);
  });

  if (duplicateEmails.length > 0) {
    const details = duplicateEmails.map((dup) => `${dup.email} (lignes ${dup.firstLine} et ${dup.secondLine})`).join(', ');
    throw new Error(`Doublon email détecté dans le CSV: ${details}`);
  }

  return parsed.rows.map((row, index) => ({
    lineNumber: index + 2,
    nom: requireTrimmed(row.nom, 'nom', index + 2),
    prenom: requireTrimmed(row.prenom, 'prenom', index + 2),
    email: requireTrimmed(row.email, 'email', index + 2).toLowerCase(),
    organisation: requireTrimmed(row.organisation, 'organisation', index + 2),
    voucher: normalizeVoucher(row.voucher),
  })) satisfies CsvApprenantAvecVoucher[];
}

export function buildInscriptionVoucherInput(params: {
  sessionId: string;
  apprenantId: string;
  voucher: string | null;
}): InscriptionVoucherInput {
  return {
    session_id: params.sessionId,
    apprenantId: params.apprenantId,
    source_financement: 'RETAIL',
    voucher_code: params.voucher,
    code_apporteur: null,
  };
}

export function buildVoucherEnrollmentConfirmationEmail(params: {
  prenom: string;
  formationLabel: string;
  paymentUrl: string;
}) {
  return buildEnrollmentConfirmationEmail({
    prenoms: params.prenom,
    nom: '',
    organisation: '',
    formation: params.formationLabel,
    paymentUrl: params.paymentUrl,
  });
}
import { buildEnrollmentConfirmationEmail } from '../email/enrollment-confirmation-email.formatter';
