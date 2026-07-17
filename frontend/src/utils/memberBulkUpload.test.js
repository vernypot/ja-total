import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  MEMBER_PERSONAL_COLUMNS,
  MEMBER_CONTACT_COLUMNS,
  MEMBER_TEMPLATE_COLUMNS,
  buildMemberTemplateInstructions,
  parseMemberSpreadsheet,
  parseDateValue,
  validateMemberRows,
} from './memberBulkUpload';

/** Keys from DatosPersonalesView personal-data form — keep in sync with member profile tab. */
const PERSONAL_DATA_FIELD_KEYS = [
  'nombre',
  'apellido1',
  'apellido2',
  'nombre_opcional',
  'apellido_opcional',
  'fecha_nacimiento',
  'genero',
  'documento',
  'email',
  'telefono',
  'celular',
  'ciudad',
  'direccion',
];

const t = key => key;

function emptyRaw(overrides = {}) {
  const base = {};
  for (const col of MEMBER_TEMPLATE_COLUMNS) base[col] = '';
  return { ...base, ...overrides };
}

function workbookBuffer(rows, { dataSheet = 'Members', instructionSheet = 'Instructions' } = {}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), dataSheet);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(buildMemberTemplateInstructions({ t, activeClubName: 'Club Test' })),
    instructionSheet,
  );
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function fileFromBuffer(buffer) {
  return { arrayBuffer: () => Promise.resolve(buffer) };
}

describe('memberBulkUpload template columns', () => {
  it('includes personal data fields matching member profile tab', () => {
    expect([...MEMBER_PERSONAL_COLUMNS].sort()).toEqual([...PERSONAL_DATA_FIELD_KEYS].sort());
  });

  it('appends optional emergency contact columns', () => {
    expect(MEMBER_TEMPLATE_COLUMNS).toEqual([...MEMBER_PERSONAL_COLUMNS, ...MEMBER_CONTACT_COLUMNS]);
    expect(MEMBER_CONTACT_COLUMNS).toEqual(['contacto_nombre', 'contacto_celular', 'contacto_relacion']);
  });

  it('documents contact import in instructions', () => {
    const instructions = buildMemberTemplateInstructions({ t, activeClubName: 'Club A' }).flat().join(' ');
    expect(instructions).toContain('bulkTemplateContactHint');
    expect(instructions).toContain('bulkTemplateEstadoHint');
    expect(instructions).not.toContain('bulkTemplatePostImportContacts');
  });
});

describe('validateMemberRows estado handling', () => {
  const activeClub = { id: 'club-1', nombre: 'Conquistadores' };

  it('always sets imported members to activo regardless of spreadsheet estado', () => {
    const result = validateMemberRows(
      [{ rowNumber: 2, raw: emptyRaw({ nombre: 'Carlos', genero: 'M' }) }],
      { activeClub, t },
    );
    expect(result.results[0].member.estado).toBe('activo');
  });
});

describe('parseDateValue', () => {
  it('accepts common Excel date formats', () => {
    expect(parseDateValue('2000-01-15')).toEqual({ valid: true, value: '2000-01-15' });
    expect(parseDateValue('15/01/2000')).toEqual({ valid: true, value: '2000-01-15' });
    expect(parseDateValue('15/01/00')).toEqual({ valid: true, value: '2000-01-15' });
    expect(parseDateValue('15-01-2000')).toEqual({ valid: true, value: '2000-01-15' });
    expect(parseDateValue('01/01/2000 0:00')).toEqual({ valid: true, value: '2000-01-01' });
    expect(parseDateValue(36526)).toEqual({ valid: true, value: '2000-01-01' });
    expect(parseDateValue('36526')).toEqual({ valid: true, value: '2000-01-01' });
    expect(parseDateValue(new Date(2000, 0, 15))).toEqual({ valid: true, value: '2000-01-15' });
  });

  it('treats empty birth dates as optional', () => {
    expect(parseDateValue('')).toEqual({ valid: true, value: null });
    expect(parseDateValue(null)).toEqual({ valid: true, value: null });
  });

  it('rejects invalid birth dates', () => {
    expect(parseDateValue('not-a-date').valid).toBe(false);
    expect(parseDateValue('31/02/2000').valid).toBe(false);
  });
});

describe('parseMemberSpreadsheet', () => {
  it('parses Excel serial date cells', async () => {
    const row = MEMBER_TEMPLATE_COLUMNS.map(col => (col === 'nombre' ? 'Juan' : ''));
    const ws = XLSX.utils.aoa_to_sheet([MEMBER_TEMPLATE_COLUMNS, row]);
    const dateIdx = MEMBER_TEMPLATE_COLUMNS.indexOf('fecha_nacimiento');
    ws[XLSX.utils.encode_cell({ r: 1, c: dateIdx })] = { t: 'n', v: 36526 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const { rows, error } = await parseMemberSpreadsheet(fileFromBuffer(buffer));

    expect(error).toBeNull();
    expect(rows[0].raw.fecha_nacimiento).toBe(36526);
    const validation = validateMemberRows(rows, { activeClub: { id: 'c1', nombre: 'Club' }, t });
    expect(validation.results[0].valid).toBe(true);
    expect(validation.results[0].member.fecha_nacimiento).toBe('2000-01-01');
  });

  it('parses standard template headers and example row with contact', async () => {
    const headers = MEMBER_TEMPLATE_COLUMNS.map(col => (col === 'nombre' ? 'nombre*' : col));
    const row = MEMBER_TEMPLATE_COLUMNS.map(col => {
      if (col === 'nombre') return 'Ana';
      if (col === 'apellido1') return 'López';
      if (col === 'apellido2') return 'Ruiz';
      if (col === 'fecha_nacimiento') return '2010-05-20';
      if (col === 'documento') return 'DOC-1';
      if (col === 'genero') return 'F';
      if (col === 'email') return 'ana@example.com';
      if (col === 'celular') return '809-555-0000';
      if (col === 'direccion') return 'Calle 1';
      if (col === 'ciudad') return 'SD';
      if (col === 'contacto_nombre') return 'Rosa Ruiz';
      if (col === 'contacto_celular') return '809-555-9999';
      if (col === 'contacto_relacion') return 'Madre';
      return '';
    });
    const buffer = workbookBuffer([headers, row]);
    const { rows, error } = await parseMemberSpreadsheet(fileFromBuffer(buffer));

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].raw.email).toBe('ana@example.com');
    expect(rows[0].raw.contacto_nombre).toBe('Rosa Ruiz');
    expect(rows[0].raw.contacto_celular).toBe('809-555-9999');
    expect(rows[0].raw.contacto_relacion).toBe('Madre');
  });

  it('ignores instruction sheet and reads data sheet', async () => {
    const headers = MEMBER_TEMPLATE_COLUMNS;
    const row = MEMBER_TEMPLATE_COLUMNS.map(col => (col === 'nombre' ? 'Pedro' : col === 'genero' ? 'M' : ''));
    const buffer = workbookBuffer([headers, row]);
    const { rows, error } = await parseMemberSpreadsheet(fileFromBuffer(buffer));

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].raw.nombre).toBe('Pedro');
  });
});

describe('validateMemberRows', () => {
  const activeClub = { id: 'club-1', nombre: 'Conquistadores' };

  it('accepts valid rows with optional contact', () => {
    const parsed = [{
      rowNumber: 2,
      raw: emptyRaw({
        nombre: 'María',
        apellido1: 'Díaz',
        genero: 'Femenino',
        contacto_nombre: 'Ana Díaz',
        contacto_celular: '809-555-1111',
        contacto_relacion: 'Madre',
      }),
    }];

    const result = validateMemberRows(parsed, { activeClub, t });
    expect(result.validCount).toBe(1);
    expect(result.results[0].member.contact).toEqual({
      nombre: 'Ana Díaz',
      telefono: '809-555-1111',
      relacion: 'Madre',
    });
  });

  it('allows rows without contact data', () => {
    const result = validateMemberRows(
      [{ rowNumber: 2, raw: emptyRaw({ nombre: 'Carlos', genero: 'M', email: 'carlos@example.com' }) }],
      { activeClub, t },
    );
    expect(result.validCount).toBe(1);
    expect(result.results[0].member.email).toBe('carlos@example.com');
    expect(result.results[0].member.contact).toBeNull();
  });

  it('rejects invalid email when provided', () => {
    const result = validateMemberRows(
      [{ rowNumber: 2, raw: emptyRaw({ nombre: 'Carlos', email: 'not-an-email' }) }],
      { activeClub, t },
    );
    expect(result.validCount).toBe(0);
    expect(result.results[0].errors).toContain('bulkErrInvalidEmail');
  });

  it('allows empty email', () => {
    const result = validateMemberRows(
      [{ rowNumber: 2, raw: emptyRaw({ nombre: 'Carlos', genero: 'M' }) }],
      { activeClub, t },
    );
    expect(result.validCount).toBe(1);
    expect(result.results[0].member.email).toBeNull();
  });

  it('requires contact name and phone when any contact field is filled', () => {
    const result = validateMemberRows(
      [{ rowNumber: 2, raw: emptyRaw({ nombre: 'Carlos', contacto_relacion: 'Padre' }) }],
      { activeClub, t },
    );
    expect(result.validCount).toBe(0);
    expect(result.results[0].errors).toContain('bulkErrContactNombreRequired');
    expect(result.results[0].errors).toContain('bulkErrContactTelefonoRequired');
  });

  it('rejects duplicate names in the same file', () => {
    const raw = emptyRaw({ nombre: 'Luis', apellido1: 'Gómez', apellido2: 'Pérez' });
    const result = validateMemberRows(
      [{ rowNumber: 2, raw }, { rowNumber: 3, raw: { ...raw } }],
      { activeClub, t },
    );
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(1);
    expect(result.results[1].errors).toContain('bulkErrDuplicateRow');
  });

  it('requires club selection before validation', () => {
    const result = validateMemberRows(
      [{ rowNumber: 2, raw: emptyRaw({ nombre: 'Test' }) }],
      { activeClub: null, t },
    );
    expect(result.error).toBe('bulkSelectClubFirst');
  });
});
