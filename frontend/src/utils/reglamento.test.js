import { describe, expect, it } from 'vitest';
import {
  buildReglamentoTree,
  computePenaltyPointsForUnidad,
  filterInfraccionesForValidationPeriod,
  getReglamentoPenaltyLeaves,
} from './reglamento';

describe('buildReglamentoTree', () => {
  it('builds nested sections items and sub-items', () => {
    const tree = buildReglamentoTree([
      { id: 's1', parent_id: null, nivel: 1, titulo: 'Sanciones', orden: 0 },
      { id: 'i1', parent_id: 's1', nivel: 2, titulo: 'Uniforme', orden: 0 },
      { id: 'si1', parent_id: 'i1', nivel: 3, titulo: 'Sin uniforme', orden: 0, puntos_penalizacion: 5 },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].children[0].titulo).toBe('Sin uniforme');
  });
});

describe('getReglamentoPenaltyLeaves', () => {
  it('returns only leaf nodes with penalty points', () => {
    const leaves = getReglamentoPenaltyLeaves([
      { id: 's1', parent_id: null, puntos_penalizacion: 0, estado: 'activo' },
      { id: 'i1', parent_id: 's1', puntos_penalizacion: 0, estado: 'activo' },
      { id: 'si1', parent_id: 'i1', puntos_penalizacion: 3, estado: 'activo' },
    ]);

    expect(leaves).toHaveLength(1);
    expect(leaves[0].id).toBe('si1');
  });
});

describe('computePenaltyPointsForUnidad', () => {
  it('sums infraction counts times rule penalty points', () => {
    const nodosById = {
      rule1: { id: 'rule1', puntos_penalizacion: 4 },
    };

    const total = computePenaltyPointsForUnidad('u1', [
      { unidad_id: 'u1', reglamento_nodo_id: 'rule1', cantidad: 2 },
      { unidad_id: 'u2', reglamento_nodo_id: 'rule1', cantidad: 1 },
    ], nodosById);

    expect(total).toBe(8);
  });

  it('filters infractions by validation start date', () => {
    const filtered = filterInfraccionesForValidationPeriod([
      { fecha: '2020-01-01' },
      { fecha: '2020-06-01' },
    ], '2020-03-01');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].fecha).toBe('2020-06-01');
  });
});
