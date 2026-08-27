import { describe, expect, it } from 'vitest';
import {
  buildUnidadReportMemberRows,
  createUnidadWeeklyReportPayload,
} from './unidadWeeklyReportPrint.js';

describe('buildUnidadReportMemberRows', () => {
  const roleLabel = rol => (rol === 'capitan' ? 'Capitán' : rol === 'secretario' ? 'Secretario' : rol);

  it('labels blank rows for captain and secretary', () => {
    const rows = buildUnidadReportMemberRows({ roleLabel });
    expect(rows[0].roleHint).toBe('Capitán');
    expect(rows[1].roleHint).toBe('Secretario');
    expect(rows[2].roleHint).toBe('');
  });

  it('prefills member names when a unit is provided', () => {
    const unidad = {
      miembro_unidad: [
        { rol: 'secretario', miembros: { nombres: 'Ana', apellidos: 'Lopez' } },
        { rol: 'capitan', miembros: { nombres: 'Luis', apellidos: 'Perez' } },
      ],
    };

    const rows = buildUnidadReportMemberRows({
      unidad,
      memberDisplayName: member => `${member.nombres} ${member.apellidos}`,
      roleLabel: rol => rol,
    });

    expect(rows[0].name).toBe('Luis Perez');
    expect(rows[1].name).toBe('Ana Lopez');
  });
});

describe('createUnidadWeeklyReportPayload', () => {
  it('creates two forms per page by default', () => {
    const payload = createUnidadWeeklyReportPayload({ clubName: 'Conquistadores' });
    expect(payload.clubName).toBe('Conquistadores');
    expect(payload.forms).toHaveLength(2);
    expect(payload.memberRows).toHaveLength(8);
  });
});
