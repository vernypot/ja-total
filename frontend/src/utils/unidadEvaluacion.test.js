import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  sb: {},
}));

import {
  buildCantidadMap,
  computeAllUnidadEvaluations,
  computeUnidadEvaluation,
  computeUnidadPercentages,
  countMemberAttendanceBreakdown,
  filterRowsForUnidadValidationPeriod,
  isEventOnOrAfterValidationStart,
  isUnidadValidationActive,
  normalizeEvalConfig,
  parsePoints,
  toEvalPercent,
} from './unidadEvaluacion';
import { createMemberMergedAttendanceHelpers } from '../mvc/models/eventos.model';

const baseConfig = {
  confirmacion_activa: true,
  confirmacion_puntos: 10,
  a_tiempo_activa: true,
  a_tiempo_puntos: 10,
  tarde_activa: true,
  tarde_puntos: 5,
  ausente_injustificada_activa: true,
  ausente_injustificada_puntos: 0,
  ausente_justificada_activa: true,
  ausente_justificada_puntos: 0,
  cuota_activa: false,
  cuota_puntos: 0,
};

const pastEvent = {
  id: 'e1',
  fecha: '2020-01-01',
  hora: '19:00:00',
  estado: 'finalizado',
  requiere_confirmacion: true,
  clubes: { iglesias: { timezone: 'America/Bogota' } },
};

describe('toEvalPercent', () => {
  it('returns null when max is zero', () => {
    expect(toEvalPercent(5, 0)).toBeNull();
  });

  it('clamps between 0 and 100', () => {
    expect(toEvalPercent(150, 100)).toBe(100);
    expect(toEvalPercent(-5, 100)).toBe(0);
  });
});

describe('computeUnidadEvaluation percentages', () => {
  it('returns efficiency and excellence percentages', () => {
    const result = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [{
        miembro_id: 'm1',
        confirmacion_estado: 'confirmado',
        evento_asistencia: { estado: 'a_tiempo' },
        eventos: pastEvent,
      }],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
    });

    expect(result.efficiencyPercent).toBe(100);
    expect(result.excellencePercent).toBe(100);
  });

  it('normalizes by member count so same performance yields similar percentages', () => {
    const eventRow = {
      confirmacion_estado: 'confirmado',
      evento_asistencia: { estado: 'a_tiempo' },
      eventos: pastEvent,
    };

    const smallUnit = computeUnidadEvaluation({
      unidad: {
        id: 'small',
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [{ miembro_id: 'm1', ...eventRow }],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
    });

    const largeUnit = computeUnidadEvaluation({
      unidad: {
        id: 'large',
        miembro_unidad: [
          { miembro_id: 'm1' },
          { miembro_id: 'm2' },
          { miembro_id: 'm3' },
        ],
      },
      memberEventRows: [
        { miembro_id: 'm1', ...eventRow, eventos: { ...pastEvent, id: 'e1' } },
        { miembro_id: 'm2', ...eventRow, eventos: { ...pastEvent, id: 'e2' } },
        { miembro_id: 'm3', ...eventRow, eventos: { ...pastEvent, id: 'e3' } },
      ],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
    });

    expect(smallUnit.efficiencyPercent).toBe(largeUnit.efficiencyPercent);
    expect(smallUnit.excellencePercent).toBe(largeUnit.excellencePercent);
  });

  it('includes additional items in excellence per member', () => {
    const result = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        miembro_unidad: [
          { miembro_id: 'm1' },
          { miembro_id: 'm2' },
        ],
      },
      memberEventRows: [],
      config: baseConfig,
      evalItems: [{ id: 'item-1', puntos: 10 }],
      cantidadMap: buildCantidadMap([
        { unidad_id: 'u1', eval_item_id: 'item-1', cantidad: 2 },
      ]),
    });

    expect(result.otherPoints).toBe(20);
    expect(result.excellencePercent).toBe(100);
  });
});

describe('validation start date', () => {
  it('filters rows to events on or after the start date', () => {
    const rows = [
      { eventos: { ...pastEvent, id: 'e1', fecha: '2019-12-01' } },
      { eventos: { ...pastEvent, id: 'e2', fecha: '2020-02-01' } },
    ];

    expect(filterRowsForUnidadValidationPeriod(rows, '2020-01-01')).toHaveLength(1);
    expect(filterRowsForUnidadValidationPeriod(rows, null)).toHaveLength(2);
    expect(isEventOnOrAfterValidationStart({ fecha: '2020-01-01' }, '2020-01-01')).toBe(true);
    expect(isEventOnOrAfterValidationStart({ fecha: '2019-12-31' }, '2020-01-01')).toBe(false);
  });

  it('returns null percentages when validation has not started yet', () => {
    const futureStart = '2099-01-01';
    expect(isUnidadValidationActive(futureStart, new Date('2020-01-01'))).toBe(false);

    const result = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        evaluacion_inicio_fecha: futureStart,
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [{
        miembro_id: 'm1',
        confirmacion_estado: 'confirmado',
        evento_asistencia: { estado: 'a_tiempo' },
        eventos: pastEvent,
      }],
      config: baseConfig,
      evalItems: [{ id: 'item-1', puntos: 10 }],
      cantidadMap: buildCantidadMap([
        { unidad_id: 'u1', eval_item_id: 'item-1', cantidad: 5 },
      ]),
    });

    expect(result.validationActive).toBe(false);
    expect(result.efficiencyPercent).toBeNull();
    expect(result.excellencePercent).toBeNull();
    expect(result.otherPoints).toBe(0);
  });

  it('excludes events before validation start from scores', () => {
    const result = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        evaluacion_inicio_fecha: '2020-06-01',
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [
        {
          miembro_id: 'm1',
          confirmacion_estado: 'confirmado',
          evento_asistencia: { estado: 'a_tiempo' },
          eventos: { ...pastEvent, id: 'e1', fecha: '2020-01-01' },
        },
        {
          miembro_id: 'm1',
          confirmacion_estado: 'pendiente',
          evento_asistencia: { estado: 'ausente' },
          eventos: { ...pastEvent, id: 'e2', fecha: '2020-07-01', requiere_confirmacion: false },
        },
      ],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
    });

    expect(result.validationActive).toBe(true);
    expect(result.breakdown.a_tiempo).toBe(0);
    expect(result.efficiencyPercent).toBe(0);
  });
});

describe('countMemberAttendanceBreakdown', () => {
  it('counts confirmation, on-time, late, and absence types independently', () => {
    const rows = [
      {
        eventos: { ...pastEvent, id: 'e1' },
        confirmacion_estado: 'confirmado',
        evento_asistencia: { estado: 'a_tiempo' },
      },
      {
        eventos: { ...pastEvent, id: 'e2', requiere_confirmacion: false },
        confirmacion_estado: 'pendiente',
        evento_asistencia: { estado: 'tarde' },
      },
    ];

    const helpers = createMemberMergedAttendanceHelpers(rows);
    const counts = countMemberAttendanceBreakdown(rows, helpers);

    expect(counts.confirmacion).toBe(1);
    expect(counts.a_tiempo).toBe(1);
    expect(counts.tarde).toBe(1);
  });
});

describe('computeAllUnidadEvaluations', () => {
  it('returns scores keyed by unidad id', () => {
    const scores = computeAllUnidadEvaluations({
      unidades: [{ id: 'u1', miembro_unidad: [] }],
      memberEventRows: [],
      config: normalizeEvalConfig(null),
      evalItems: [],
      cantidades: [],
    });

    expect(scores.u1.efficiencyPercent).toBeNull();
    expect(scores.u1.excellencePercent).toBeNull();
  });
});

describe('parsePoints', () => {
  it('rejects negative and invalid values', () => {
    expect(parsePoints('-1', 3)).toBe(3);
    expect(parsePoints('abc', 3)).toBe(3);
  });
});

describe('computeUnidadPercentages', () => {
  it('returns null percentages for empty units', () => {
    expect(computeUnidadPercentages({
      memberIds: [],
      relevantRows: [],
      helpers: { getAsistenciaFromRow: () => null, memberAttendedEvent: () => false },
      config: baseConfig,
      otherPoints: 0,
    })).toEqual({
      memberCount: 0,
      efficiencyPercent: null,
      excellencePercent: null,
    });
  });
});
