import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  sb: {},
}));

import {
  normalizeMemberGenderForUnidad,
  memberMatchesUnidadGender,
  getAssignedMemberIds,
  roleLabel,
  attachMembersToUnidadAssignments,
} from './unidades.model';

describe('unidades.model', () => {
  it('normalizes member gender values', () => {
    expect(normalizeMemberGenderForUnidad('Masculino')).toBe('M');
    expect(normalizeMemberGenderForUnidad('Femenino')).toBe('F');
    expect(normalizeMemberGenderForUnidad('Otro')).toBeNull();
  });

  it('matches member gender to unit gender', () => {
    expect(memberMatchesUnidadGender({ genero: 'M' }, 'M')).toBe(true);
    expect(memberMatchesUnidadGender({ genero: 'F' }, 'M')).toBe(false);
  });

  it('collects assigned member ids from units', () => {
    const ids = getAssignedMemberIds([
      { miembro_unidad: [{ miembro_id: 'a' }, { miembro_id: 'b' }] },
      { miembro_unidad: [{ miembro_id: 'b' }, { miembro_id: 'c' }] },
    ]);
    expect(Array.from(ids).sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns role labels via i18n helper', () => {
    const t = key => key;
    expect(roleLabel('capitan', t)).toBe('unidadRole_capitan');
  });

  it('attaches club members to assignment rows', () => {
    const membersById = {
      m1: { id: 'm1', nombre: 'Ana', apellido1: 'Lopez' },
    };
    const enriched = attachMembersToUnidadAssignments([
      { id: 'u1', nombre: 'Unit 1', miembro_unidad: [{ id: 'a1', miembro_id: 'm1', rol: 'miembro' }] },
    ], membersById);

    expect(enriched[0].miembro_unidad[0].miembros.nombre).toBe('Ana');
  });
});
