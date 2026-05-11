export type CsvRecord = Record<string, string>;

export interface ParsedCsvTable {
  headers: string[];
  rows: CsvRecord[];
  delimiter: string;
}

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, '');
}

function detectDelimiter(headerLine: string) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;

  if (semicolonCount > commaCount) {
    return ';';
  }

  return ',';
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map((value) => stripBom(value));
}

export function parseCsvTable(csvContent: string): ParsedCsvTable {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: ',' };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.trim());

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row: CsvRecord = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  return { headers, rows, delimiter };
}

export function getMissingHeaders(headers: string[], requiredHeaders: string[]) {
  return requiredHeaders.filter((header) => !headers.includes(header));
}

export function normalizeXofAmount(value: string) {
  const digits = `${value}`.replace(/[^\d-]/g, '');
  if (!digits) {
    return Number.NaN;
  }

  return Number(digits);
}
