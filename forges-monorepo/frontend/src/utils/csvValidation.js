function detectSeparator(firstLine = '') {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  if (semicolonCount > commaCount) {
    return ';';
  }

  return ',';
}

function splitCsvLine(line = '', separator = ',') {
  const cells = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === separator && !insideQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function parseB2BMembersCsv(content) {
  const raw = String(content || '').replace(/^\uFEFF/, '').trim();
  if (!raw) {
    return [];
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const separator = detectSeparator(lines[0]);
  const firstRow = splitCsvLine(lines[0], separator).map((cell) => cell.toLowerCase().trim());
  const hasHeader = firstRow.includes('email');

  if (!hasHeader) {
    // Fallback: pas d'en-tête détecté, on suppose l'ordre: email, nom, prenom
    const rows = [];
    lines.forEach((line) => {
      const cells = splitCsvLine(line, separator);
      const [email = '', nom = '', prenom = ''] = cells;
      rows.push({
        email: normalizeText(email),
        nom: normalizeText(nom),
        prenom: normalizeText(prenom),
      });
    });
    return rows;
  }

  // Créer un mapping des colonnes par leur nom d'en-tête
  const headerMap = {};
  firstRow.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    if (normalized === 'email' || normalized === 'e-mail') {
      headerMap.email = index;
    } else if (normalized === 'nom' || normalized === 'nom_famille') {
      headerMap.nom = index;
    } else if (normalized === 'prenom' || normalized === 'prenoms' || normalized === 'prénom' || normalized === 'prénoms') {
      headerMap.prenom = index;
    }
  });

  // Parser les lignes de données en utilisant le mapping
  const rows = [];
  lines.slice(1).forEach((line) => {
    const cells = splitCsvLine(line, separator);
    rows.push({
      email: normalizeText(cells[headerMap.email] || ''),
      nom: normalizeText(cells[headerMap.nom] || ''),
      prenom: normalizeText(cells[headerMap.prenom] || ''),
    });
  });

  return rows;
}

export function validateB2BImportRows(rows = [], { maxRows = 100 } = {}) {
  const errors = [];
  const warnings = [];
  const normalizedRows = [];
  const seenEmails = new Set();

  if (rows.length > maxRows) {
    errors.push({
      row: null,
      field: 'rows',
      message: `Le fichier contient ${rows.length} lignes. Le maximum autorise est ${maxRows}.`,
    });
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const email = normalizeEmail(row?.email);
    const nom = normalizeText(row?.nom);
    const prenom = normalizeText(row?.prenom);

    if (!email) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Email obligatoire.',
      });
      return;
    }

    if (!isEmail(email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Email invalide.',
      });
      return;
    }

    if (seenEmails.has(email)) {
      warnings.push({
        row: rowNumber,
        field: 'email',
        message: 'Ligne dupliquee ignoree.',
      });
      return;
    }

    seenEmails.add(email);
    normalizedRows.push({
      email,
      nom,
      prenom,
    });
  });

  return {
    rows: normalizedRows,
    errors,
    warnings,
    totalRows: rows.length,
    isValid: errors.length === 0,
  };
}

export function buildB2BImportPayload(content, options = {}) {
  const parsedRows = parseB2BMembersCsv(content);
  return validateB2BImportRows(parsedRows, options);
}

export { detectSeparator, splitCsvLine };
