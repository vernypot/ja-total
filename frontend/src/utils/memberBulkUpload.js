import * as XLSX from 'xlsx';
import { isValidEmail } from './validation';

/** Columns recognized in uploads but never validated or imported (estado is always activo). */
export const MEMBER_IMPORT_IGNORED_COLUMNS = ['estado', 'club_nombre'];

/** Personal-data fields importable via bulk upload (matches DatosPersonalesView / member profile tab). */
export const MEMBER_PERSONAL_COLUMNS = [
  'nombre',
  'apellido1',
  'apellido2',
  'nombre_opcional',
  'apellido_opcional',
  'fecha_nacimiento',
  'documento',
  'genero',
  'email',
  'telefono',
  'celular',
  'direccion',
  'ciudad',
];

/** Optional emergency contact (one per row; maps to Contacts tab). */
export const MEMBER_CONTACT_COLUMNS = [
  'contacto_nombre',
  'contacto_celular',
  'contacto_relacion',
];

export const MEMBER_TEMPLATE_COLUMNS = [
  ...MEMBER_PERSONAL_COLUMNS,
  ...MEMBER_CONTACT_COLUMNS,
];

/** Profile features filled in after import (not in spreadsheet). */
export const MEMBER_BULK_POST_IMPORT_FEATURES = [
  'photo',
  'medicalData',
  'clubAssignmentsExtra',
  'classes',
  'specialties',
];

const HEADER_ALIASES = {
  club_nombre: ['club_nombre', 'club', 'club name', 'nombre club'],
  nombre: ['nombre', 'name', 'first name', 'first_name', 'nombres'],
  apellido1: ['apellido1', 'apellido 1', 'last name 1', 'lastname1', 'primer apellido'],
  apellido2: ['apellido2', 'apellido 2', 'last name 2', 'lastname2', 'segundo apellido'],
  nombre_opcional: ['nombre_opcional', 'nombre opcional', 'optional name', 'preferred name', 'display name'],
  apellido_opcional: ['apellido_opcional', 'apellido opcional', 'optional last name', 'preferred last name'],
  fecha_nacimiento: ['fecha_nacimiento', 'fecha nacimiento', 'birth date', 'birthdate', 'fecha', 'fecha de nacimiento'],
  documento: ['documento', 'document', 'id', 'cedula', 'cédula', 'dni'],
  genero: ['genero', 'género', 'gender', 'sexo'],
  email: ['email', 'correo', 'e-mail', 'correo electronico', 'correo electrónico', 'mail'],
  telefono: ['telefono', 'teléfono', 'phone', 'tel'],
  celular: ['celular', 'cellphone', 'mobile', 'móvil', 'movil'],
  direccion: ['direccion', 'dirección', 'address'],
  ciudad: ['ciudad', 'city'],
  contacto_nombre: ['contacto_nombre', 'contacto nombre', 'contact name', 'emergency contact', 'nombre contacto', 'contacto'],
  contacto_celular: ['contacto_celular', 'contacto celular', 'contact phone', 'contact cellphone', 'contact mobile', 'telefono contacto', 'tel contacto'],
  contacto_relacion: ['contacto_relacion', 'contacto relacion', 'contact relationship', 'relationship', 'parentesco', 'relacion contacto'],
  estado: ['estado', 'status', 'estado miembro', 'member status'],
};

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ');
}

function mapHeaders(rawHeaders) {
  const mapping = {};
  rawHeaders.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
        if (mapping[field] === undefined) mapping[field] = index;
        break;
      }
    }
  });
  return mapping;
}

function buildPositionalMapping(headerRow) {
  const normalized = (headerRow || []).map(h => normalizeHeader(h));
  const hasClubFirst = normalized.some(h => h.includes('club'));
  const clubIdx = normalized.findIndex(h => h.includes('club'));
  const startCol = hasClubFirst && clubIdx === 0 ? 1 : 0;
  const mapping = {};
  MEMBER_TEMPLATE_COLUMNS.forEach((field, i) => {
    mapping[field] = startCol + i;
  });
  return mapping;
}

function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const mapping = mapHeaders(rows[i] || []);
    if (mapping.nombre !== undefined) return i;
  }
  return -1;
}

function isInstructionSheet(name) {
  return /instruc|instruct/i.test(name || '');
}

function getSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
}

function findBestDataSheet(workbook) {
  const candidates = [];

  for (const name of workbook.SheetNames) {
    if (isInstructionSheet(name)) continue;

    const rows = getSheetRows(workbook, name);
    if (!rows.length) continue;

    let headerIdx = findHeaderRowIndex(rows);
    let mapping = headerIdx >= 0 ? mapHeaders(rows[headerIdx]) : null;

    if (headerIdx < 0 && rows[0]?.length > 0) {
      headerIdx = 0;
      mapping = buildPositionalMapping(rows[0]);
    }

    if (!mapping || mapping.nombre === undefined) continue;

    const dataRows = rows.slice(headerIdx + 1).filter(row =>
      row.some(cell => String(cell ?? '').trim() !== '')
    );

    const parsedCount = dataRows.filter(row => {
      const nombre = cellValue(row, mapping.nombre);
      return nombre.length > 0;
    }).length;

    candidates.push({ name, rows, headerIdx, mapping, parsedCount, dataRows: dataRows.length });
  }

  if (candidates.length === 0) {
    const fallbackName = workbook.SheetNames.find(n => !isInstructionSheet(n)) || workbook.SheetNames[0];
    const rows = getSheetRows(workbook, fallbackName);
    const headerIdx = findHeaderRowIndex(rows);
    const mapping = headerIdx >= 0
      ? mapHeaders(rows[headerIdx])
      : buildPositionalMapping(rows[0] || []);

    return {
      name: fallbackName,
      rows,
      headerIdx: headerIdx >= 0 ? headerIdx : 0,
      mapping,
    };
  }

  candidates.sort((a, b) => b.parsedCount - a.parsedCount || b.dataRows - a.dataRows);
  return candidates[0];
}

function cellRawValue(row, index) {
  if (index === undefined || !row) return '';
  const value = row[index];
  if (value === null || value === undefined) return '';
  return value;
}

function cellValue(row, index) {
  const value = cellRawValue(row, index);
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function rowToRecord(row, mapping) {
  const record = {};
  for (const field of MEMBER_TEMPLATE_COLUMNS) {
    const rawValue = cellRawValue(row, mapping[field]);
    record[field] = field === 'fecha_nacimiento'
      ? rawValue
      : (rawValue instanceof Date ? rawValue.toISOString().slice(0, 10) : String(rawValue ?? '').trim());
  }
  return record;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeYear(year) {
  const y = Number(year);
  if (Number.isNaN(y)) return null;
  if (y >= 100) return y;
  return y > 30 ? 1900 + y : 2000 + y;
}

function toISODateParts(year, month, day) {
  const y = normalizeYear(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || Number.isNaN(m) || Number.isNaN(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function excelSerialToISO(serial) {
  const n = Math.floor(Number(serial));
  if (Number.isNaN(n) || n < 1 || n > 60000) return null;
  const date = new Date(Date.UTC(1899, 11, 30 + n));
  return toISODateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function parseSlashOrDashDate(text) {
  const match = String(text).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s|T|$)/);
  if (!match) return null;

  let day = Number(match[1]);
  let month = Number(match[2]);
  const year = Number(match[3]);

  if (month > 12 && day <= 12) {
    [day, month] = [month, day];
  }

  return toISODateParts(year, month, day);
}

export function parseDateValue(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: true, value: null };
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const iso = toISODateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
    return iso ? { valid: true, value: iso } : { valid: false, value: null };
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    const iso = excelSerialToISO(value);
    return iso ? { valid: true, value: iso } : { valid: false, value: null };
  }

  const text = String(value).trim();
  if (!text) return { valid: true, value: null };

  const isoPrefix = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) {
    const iso = toISODateParts(Number(isoPrefix[1]), Number(isoPrefix[2]), Number(isoPrefix[3]));
    if (iso) return { valid: true, value: iso };
  }

  const slashOrDash = parseSlashOrDashDate(text);
  if (slashOrDash) return { valid: true, value: slashOrDash };

  const serial = Number(text);
  if (!Number.isNaN(serial) && serial >= 1 && serial < 60000) {
    const iso = excelSerialToISO(serial);
    if (iso) return { valid: true, value: iso };
  }

  return { valid: false, value: null };
}

function hasMemberData(record) {
  return MEMBER_PERSONAL_COLUMNS.some(field => record[field]);
}

function hasContactData(record) {
  return MEMBER_CONTACT_COLUMNS.some(field => record[field]);
}

function buildContactFromRaw(raw) {
  if (!hasContactData(raw)) return null;
  return {
    nombre: raw.contacto_nombre?.trim() || '',
    telefono: raw.contacto_celular?.trim() || '',
    relacion: raw.contacto_relacion?.trim() || null,
  };
}

function normalizeGender(value) {
  if (!value) return { valid: true, value: null };
  const text = String(value).trim().toLowerCase();
  const map = {
    m: 'M',
    f: 'F',
    masculino: 'M',
    femenino: 'F',
    male: 'M',
    female: 'F',
    otro: 'Otro',
    other: 'Otro',
  };
  if (map[text]) return { valid: true, value: map[text] };
  return { valid: false, value: null };
}

const COLUMN_LABEL_KEYS = {
  nombre: 'firstName',
  apellido1: 'lastName1',
  apellido2: 'lastName2',
  fecha_nacimiento: 'birthDate',
  documento: 'document',
  genero: 'gender',
  email: 'email',
  telefono: 'phone',
  celular: 'cellphone',
  direccion: 'address',
  ciudad: 'city',
  contacto_nombre: 'contactName',
  contacto_celular: 'contactCellphone',
  contacto_relacion: 'relationship',
};

export function buildMemberTemplateInstructions({ t, activeClubName = '' }) {
  const columnRows = MEMBER_TEMPLATE_COLUMNS.map(col => {
    const label = col === 'nombre' ? `${col}*` : col;
    return [label, t(COLUMN_LABEL_KEYS[col] || col)];
  });

  return [
    [t('bulkTemplateOverview')],
    [t('bulkRequiredFields')],
    [t('bulkTemplateEstadoHint')],
    activeClubName ? [`${t('bulkAssignedClub')}: ${activeClubName}`] : [t('bulkSelectClubFirst')],
    [t('bulkTemplateMultiClub')],
    [''],
    [t('bulkTemplateColumnsHeader')],
    ...columnRows,
    [''],
    [t('bulkTemplateDateFormats')],
    [t('bulkTemplateGenderValues')],
    [t('bulkTemplateEmailHint')],
    [t('bulkTemplateDuplicates')],
    [t('bulkTemplateContactHint')],
    [''],
    [t('bulkTemplateNotIncluded')],
    [t('bulkTemplatePostImportPhoto')],
    [t('bulkTemplatePostImportMedical')],
    [t('bulkTemplatePostImportExtraClubs')],
    [t('bulkTemplatePostImportClasses')],
    [''],
    [t('bulkTemplateFileFormats')],
  ];
}

export function downloadMemberTemplate({ t, activeClubName = '' }) {
  const headers = MEMBER_TEMPLATE_COLUMNS.map(col =>
    col === 'nombre' ? `${col}*` : col
  );

  const example = MEMBER_TEMPLATE_COLUMNS.map(col => {
    if (col === 'nombre') return 'Juan';
    if (col === 'apellido1') return 'Pérez';
    if (col === 'apellido2') return 'García';
    if (col === 'fecha_nacimiento') return '2000-01-15';
    if (col === 'genero') return 'M';
    if (col === 'email') return 'juan.perez@example.com';
    if (col === 'documento') return '001-0000000-0';
    if (col === 'telefono') return '809-555-0100';
    if (col === 'celular') return '809-555-0101';
    if (col === 'direccion') return 'Calle Principal 123';
    if (col === 'ciudad') return 'Santo Domingo';
    if (col === 'contacto_nombre') return 'María Pérez';
    if (col === 'contacto_celular') return '809-555-0200';
    if (col === 'contacto_relacion') return 'Madre';
    return '';
  });

  const instructions = buildMemberTemplateInstructions({ t, activeClubName });

  const dataSheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, t('bulkTemplateSheet'));
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, t('bulkInstructionsSheet'));
  XLSX.writeFile(workbook, 'plantilla_miembros.xlsx');
}

function parseEmailValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: true, value: null };
  }
  const email = String(value).trim().toLowerCase();
  return isValidEmail(email)
    ? { valid: true, value: email }
    : { valid: false, value: null };
}

export async function parseMemberSpreadsheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const { rows, headerIdx, mapping } = findBestDataSheet(workbook);

  if (!rows.length || headerIdx >= rows.length) {
    return { rows: [], error: 'bulkNoRows' };
  }

  const dataRows = rows.slice(headerIdx + 1).filter(row =>
    row.some(cell => String(cell ?? '').trim() !== '')
  );

  const parsed = dataRows
    .map((row, index) => ({
      rowNumber: headerIdx + index + 2,
      raw: rowToRecord(row, mapping),
    }))
    .filter(({ raw }) => hasMemberData(raw));

  if (parsed.length === 0) {
    return { rows: [], error: 'bulkNoRows' };
  }

  return { rows: parsed, error: null };
}

export function validateMemberRows(parsedRows, { activeClub, t }) {
  if (!activeClub?.id) {
    return {
      results: [],
      validCount: 0,
      invalidCount: 0,
      error: 'bulkSelectClubFirst',
    };
  }

  const seen = new Set();
  const results = [];

  for (const { rowNumber, raw } of parsedRows) {
    const errors = [];

    if (!raw.nombre) {
      errors.push(t('bulkErrNombreRequired'));
    }

    const dateResult = parseDateValue(raw.fecha_nacimiento);
    if (!dateResult.valid) errors.push(t('bulkErrInvalidDate'));

    const genderResult = normalizeGender(raw.genero);
    if (!genderResult.valid) errors.push(t('bulkErrInvalidGender'));

    const emailResult = parseEmailValue(raw.email);
    if (!emailResult.valid) errors.push(t('bulkErrInvalidEmail'));

    const contact = buildContactFromRaw(raw);
    if (contact) {
      if (!contact.nombre) errors.push(t('bulkErrContactNombreRequired'));
      if (!contact.telefono) errors.push(t('bulkErrContactTelefonoRequired'));
    }

    const dedupeKey = `${raw.nombre.toLowerCase()}::${raw.apellido1.toLowerCase()}::${raw.apellido2.toLowerCase()}`;
    if (raw.nombre && seen.has(dedupeKey)) {
      errors.push(t('bulkErrDuplicateRow'));
    } else if (raw.nombre) {
      seen.add(dedupeKey);
    }

    const member = {
      nombre: raw.nombre,
      apellido1: raw.apellido1 || null,
      apellido2: raw.apellido2 || null,
      fecha_nacimiento: dateResult.value,
      documento: raw.documento || null,
      genero: genderResult.value,
      email: emailResult.value,
      telefono: raw.telefono || null,
      celular: raw.celular || null,
      direccion: raw.direccion || null,
      ciudad: raw.ciudad || null,
      estado: 'activo',
      club_id: activeClub.id,
      club_nombre: activeClub.nombre,
      contact: contact && contact.nombre && contact.telefono ? contact : null,
    };

    results.push({
      rowNumber,
      valid: errors.length === 0,
      errors,
      member,
    });
  }

  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.length - validCount;

  return { results, validCount, invalidCount, error: null };
}
