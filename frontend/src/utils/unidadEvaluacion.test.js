import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  sb: {},
}));

import {
  ATTENDANCE_SCORE_WITH_CONFIRMATION,
  ATTENDANCE_SCORE_WITHOUT_CONFIRMATION,
  buildCantidadMap,
  computeAllUnidadEvaluations,
  computeEventAttendanceScore,
  computeMemberEvalAttendanceScore,
  buildMemberEvalScoreDetail,
  buildUnidadEvalScoreDetail,
  resolveEventScoreSituationKey,
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
import { createMemberMergedAttendanceHelpers as createHelpers } from '../mvc/models/eventos.model';

const baseConfig = normalizeEvalConfig(null);

const pastEvent = {
  id: 'e1',
  fecha: '2020-01-01',
  hora: '19:00:00',
  estado: 'finalizado',
  requiere_confirmacion: true,
  clubes: { iglesias: { timezone: 'America/Bogota' } },
};

function row(overrides = {}) {
  return {
    miembro_id: 'm1',
    confirmacion_estado: 'pendiente',
    evento_asistencia: { estado: 'ausente' },
    eventos: pastEvent,
    ...overrides,
  };
}

describe('computeEventAttendanceScore', () => {
  it('scores meetings without confirmation using the fixed matrix', () => {
    const helpers = createHelpers([]);

    expect(computeEventAttendanceScore(row({
      eventos: { ...pastEvent, requiere_confirmacion: false },
      evento_asistencia: { estado: 'a_tiempo' },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITHOUT_CONFIRMATION.a_tiempo);

    expect(computeEventAttendanceScore(row({
      eventos: { ...pastEvent, id: 'e2', requiere_confirmacion: false },
      evento_asistencia: { estado: 'tarde' },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITHOUT_CONFIRMATION.tarde);

    expect(computeEventAttendanceScore(row({
      eventos: { ...pastEvent, id: 'e3', requiere_confirmacion: false },
      evento_asistencia: { estado: 'ausente', justificada: true },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITHOUT_CONFIRMATION.ausente_justificada);

    expect(computeEventAttendanceScore(row({
      eventos: { ...pastEvent, id: 'e4', requiere_confirmacion: false },
      evento_asistencia: { estado: 'ausente' },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITHOUT_CONFIRMATION.ausente_injustificada);
  });

  it('applies confirmation-aware scores', () => {
    const helpers = createHelpers([]);

    expect(computeEventAttendanceScore(row({
      confirmacion_estado: 'confirmado',
      evento_asistencia: { estado: 'a_tiempo' },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITH_CONFIRMATION.confirmado_a_tiempo);

    expect(computeEventAttendanceScore(row({
      confirmacion_estado: 'pendiente',
      evento_asistencia: { estado: 'a_tiempo' },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITH_CONFIRMATION.no_confirmado_a_tiempo);

    expect(computeEventAttendanceScore(row({
      confirmacion_estado: 'confirmado',
      evento_asistencia: { estado: 'ausente' },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITH_CONFIRMATION.confirmado_ausente);

    expect(computeEventAttendanceScore(row({
      confirmacion_estado: 'pendiente',
      evento_asistencia: { estado: 'ausente' },
    }), helpers)).toBe(ATTENDANCE_SCORE_WITH_CONFIRMATION.no_confirmado_ausente);
  });

  it('treats justified absences as neutral even with confirmation', () => {
    const helpers = createHelpers([]);
    expect(computeEventAttendanceScore(row({
      confirmacion_estado: 'confirmado',
      evento_asistencia: { estado: 'ausente', justificada: true },
    }), helpers)).toBe(0);
  });

  it('uses editable config values when provided', () => {
    const helpers = createHelpers([]);
    const customConfig = normalizeEvalConfig({
      a_tiempo_puntos: 9,
      confirmado_ausente_puntos: -10,
    });

    expect(computeEventAttendanceScore(row({
      eventos: { ...pastEvent, requiere_confirmacion: false },
      evento_asistencia: { estado: 'a_tiempo' },
    }), helpers, customConfig)).toBe(9);

    expect(computeEventAttendanceScore(row({
      confirmacion_estado: 'confirmado',
      evento_asistencia: { estado: 'ausente' },
    }), helpers, customConfig)).toBe(-10);
  });

  it('returns null for active events that are not finished', () => {
    const helpers = createHelpers([]);
    expect(computeEventAttendanceScore(row({
      eventos: { ...pastEvent, id: 'e-active', estado: 'activo' },
      evento_asistencia: { estado: 'a_tiempo' },
    }), helpers)).toBeNull();
  });

  it('returns null when the event is excluded from evaluation scoring', () => {
    const helpers = createHelpers([]);
    expect(computeEventAttendanceScore(row({
      eventos: { ...pastEvent, id: 'e-no-eval', afecta_puntuacion: false },
      evento_asistencia: { estado: 'a_tiempo' },
    }), helpers)).toBeNull();
  });
});

describe('computeMemberEvalAttendanceScore', () => {
  it('averages only finished events and excludes cancelled ones', () => {
    const helpers = createHelpers([]);
    const result = computeMemberEvalAttendanceScore({
      memberRows: [
        row({
          confirmacion_estado: 'confirmado',
          evento_asistencia: { estado: 'a_tiempo' },
        }),
        row({
          eventos: { ...pastEvent, id: 'e-active', estado: 'activo' },
          evento_asistencia: { estado: 'a_tiempo' },
        }),
        row({
          eventos: { ...pastEvent, id: 'e-cancel', estado: 'cancelado' },
          evento_asistencia: { estado: 'a_tiempo' },
        }),
      ],
      helpers,
      config: baseConfig,
    });

    expect(result.average).toBe(10);
    expect(result.count).toBe(1);
    expect(result.validationActive).toBe(true);
  });
});

describe('buildMemberEvalScoreDetail', () => {
  it('lists finished meetings with situation and score', () => {
    const helpers = createHelpers([]);
    const detail = buildMemberEvalScoreDetail({
      memberRows: [
        row({
          confirmacion_estado: 'confirmado',
          evento_asistencia: { estado: 'a_tiempo' },
        }),
        row({
          eventos: { ...pastEvent, id: 'e2', requiere_confirmacion: false },
          evento_asistencia: { estado: 'ausente' },
        }),
      ],
      helpers,
      config: baseConfig,
    });

    expect(detail.count).toBe(2);
    expect(detail.events).toHaveLength(2);
    expect(detail.breakdown.a_tiempo).toBe(1);
    expect(detail.breakdown.ausente_injustificada).toBe(1);
    expect(resolveEventScoreSituationKey(detail.events[0].row, helpers)).toBe('confirmado_a_tiempo');
  });
});

describe('buildUnidadEvalScoreDetail', () => {
  it('aggregates member breakdowns for the unit', () => {
    const helpers = createHelpers([]);
    const detail = buildUnidadEvalScoreDetail({
      unidad: {
        id: 'u1',
        nombre: 'Unit 1',
        miembro_unidad: [{ miembro_id: 'm1' }, { miembro_id: 'm2' }],
      },
      memberEventRows: [
        { miembro_id: 'm1', ...row({
          confirmacion_estado: 'confirmado',
          evento_asistencia: { estado: 'a_tiempo' },
        }) },
        { miembro_id: 'm2', ...row({
          eventos: { ...pastEvent, id: 'e2' },
          confirmacion_estado: 'pendiente',
          evento_asistencia: { estado: 'ausente' },
        }) },
      ],
      helpers,
      config: baseConfig,
      membersById: {
        m1: { nombre: 'Ana' },
        m2: { nombre: 'Bob' },
      },
      memberDisplayNameFn: member => member.nombre,
    });

    expect(detail.members).toHaveLength(2);
    expect(detail.breakdown.a_tiempo).toBe(1);
    expect(detail.breakdown.ausente_injustificada).toBe(1);
    expect(detail.members[0].memberName).toBe('Ana');
  });
});

describe('computeUnidadEvaluation attendance average', () => {
  it('returns the average meeting score out of 10', () => {
    const result = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [row({
        confirmacion_estado: 'confirmado',
        evento_asistencia: { estado: 'a_tiempo' },
      })],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
    });

    expect(result.attendanceScoreAverage).toBe(10);
    expect(result.efficiencyPercent).toBe(10);
  });

  it('normalizes by member count so same performance yields similar averages', () => {
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

    expect(smallUnit.attendanceScoreAverage).toBe(largeUnit.attendanceScoreAverage);
  });

  it('includes additional items in excellence only', () => {
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
    expect(result.attendanceScoreAverage).toBeNull();
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

  it('returns null scores when validation has not started yet', () => {
    const futureStart = '2099-01-01';
    expect(isUnidadValidationActive(futureStart, new Date('2020-01-01'))).toBe(false);

    const result = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        evaluacion_inicio_fecha: futureStart,
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [row({
        confirmacion_estado: 'confirmado',
        evento_asistencia: { estado: 'a_tiempo' },
      })],
      config: baseConfig,
      evalItems: [{ id: 'item-1', puntos: 10 }],
      cantidadMap: buildCantidadMap([
        { unidad_id: 'u1', eval_item_id: 'item-1', cantidad: 5 },
      ]),
    });

    expect(result.validationActive).toBe(false);
    expect(result.attendanceScoreAverage).toBeNull();
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
        row({
          confirmacion_estado: 'confirmado',
          evento_asistencia: { estado: 'a_tiempo' },
          eventos: { ...pastEvent, id: 'e1', fecha: '2020-01-01' },
        }),
        row({
          confirmacion_estado: 'pendiente',
          evento_asistencia: { estado: 'ausente' },
          eventos: { ...pastEvent, id: 'e2', fecha: '2020-07-01', requiere_confirmacion: false },
        }),
      ],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
    });

    expect(result.validationActive).toBe(true);
    expect(result.breakdown.a_tiempo).toBe(0);
    expect(result.attendanceScoreAverage).toBe(-5);
  });

  it('reduces attendance average when reglamento penalties apply', () => {
    const withoutPenalty = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [row({
        confirmacion_estado: 'confirmado',
        evento_asistencia: { estado: 'a_tiempo' },
      })],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
      reglamentoInfracciones: [],
      reglamentoNodosById: {},
    });

    const withPenalty = computeUnidadEvaluation({
      unidad: {
        id: 'u1',
        miembro_unidad: [{ miembro_id: 'm1' }],
      },
      memberEventRows: [row({
        confirmacion_estado: 'confirmado',
        evento_asistencia: { estado: 'a_tiempo' },
      })],
      config: baseConfig,
      evalItems: [],
      cantidadMap: {},
      reglamentoInfracciones: [{
        unidad_id: 'u1',
        reglamento_nodo_id: 'rule1',
        cantidad: 1,
        fecha: '2020-01-01',
      }],
      reglamentoNodosById: {
        rule1: { id: 'rule1', puntos_penalizacion: 10 },
      },
    });

    expect(withoutPenalty.attendanceScoreAverage).toBe(10);
    expect(withPenalty.penaltyPoints).toBe(10);
    expect(withPenalty.attendanceScoreAverage).toBe(0);
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

    const helpers = createHelpers(rows);
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
      config: baseConfig,
      evalItems: [],
      cantidades: [],
    });

    expect(scores.u1.attendanceScoreAverage).toBeNull();
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
  it('returns null scores for empty units', () => {
    expect(computeUnidadPercentages({
      memberIds: [],
      relevantRows: [],
      helpers: { getAsistenciaFromRow: () => null, memberAttendedEvent: () => false },
      config: baseConfig,
      otherPoints: 0,
    })).toEqual({
      memberCount: 0,
      attendanceScoreAverage: null,
      excellencePercent: null,
    });
  });
});

describe('toEvalPercent', () => {
  it('returns null when max is zero', () => {
    expect(toEvalPercent(5, 0)).toBeNull();
  });

  it('clamps between 0 and 100', () => {
    expect(toEvalPercent(150, 100)).toBe(100);
    expect(toEvalPercent(-5, 100)).toBe(0);
  });
});
