import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  MEMBER_PERSONAL_COLUMNS,
  MEMBER_CONTACT_COLUMNS,
  MEMBER_TEMPLATE_COLUMNS,
  buildMemberTemplateInstructions,
  parseMemberSpreadsheet,
  validateMemberRows,
} from './memberBulkUpload';

/** Keys from DatosPersonalesView personal-data form — keep in sync with member profile tab. */
const PERSONAL_DATA_FIELD_KEYS = [
  'nombre',
  'apellido1',
  'apellido2',
  'fecha_nacimiento',
  'genero',
  'documento',
  'telefono',
  'celular',
  'ciudad',
  'direccion',
];

const t = key => key;

function emptyRaw(overrides = {}) {
  return {
    nombre: '',
    apellido1: '',
    apellido2: '',
    fecha_nacimiento: '',
    documento: '',
    genero: '',
    telefono: '',
    celular: '',
    direccion: '',
    ciudad: '',
    contacto_nombre: '',
    contacto_celular: '',
    contacto_relacion: '',
    ...overrides,
  };
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
    expect(instructions).not.toContain('bulkTemplatePostImportContacts');
  });
});

describe('parseMemberSpreadsheet', () => {
  it('parses standard template headers and example row with contact', async () => {
    const headers = MEMBER_TEMPLATE_COLUMNS.map(col => (col === 'nombre' ? 'nombre*' : col));
    const row = [
      'Ana', 'López', 'Ruiz', '2010-05-20', 'DOC-1', 'F', '', '809-555-0000',
      'Calle 1', 'SD', 'Rosa Ruiz', '809-555-9999', 'Madre',
    ];
    const buffer = workbookBuffer([headers, row]);
    const { rows, error } = await parseMemberSpreadsheet(fileFromBuffer(buffer));

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].raw.contacto_nombre).toBe('Rosa Ruiz');
    expect(rows[0].raw.contacto_celular).toBe('809-555-9999');
    expect(rows[0].raw.contacto_relacion).toBe('Madre');
  });

  it('ignores instruction sheet and reads data sheet', async () => {
    const headers = MEMBER_TEMPLATE_COLUMNS;
    const buffer = workbookBuffer([headers, ['Pedro', '', '', '', '', 'M', '', '', '', '', '', '', '']]);
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
      [{ rowNumber: 2, raw: emptyRaw({ nombre: 'Carlos', genero: 'M' }) }],
      { activeClub, t },
    );
    expect(result.validCount).toBe(1);
    expect(result.results[0].member.contact).toBeNull();
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
