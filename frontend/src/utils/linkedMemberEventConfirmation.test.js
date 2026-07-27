import { describe, expect, it } from 'vitest';
import { buildLinkedMemberSelfEventRow } from './linkedMemberEventConfirmation';

describe('buildLinkedMemberSelfEventRow', () => {
  const evento = {
    id: 'evt-1',
    nombre: 'Club meeting',
    requiere_confirmacion: true,
    estado: 'activo',
  };

  it('returns null when no linked member', () => {
    expect(buildLinkedMemberSelfEventRow([{ miembro_id: 'm-1', id: 'em-1' }], evento, null)).toBeNull();
  });

  it('returns null when linked member is not assigned', () => {
    expect(buildLinkedMemberSelfEventRow([{ miembro_id: 'm-2', id: 'em-1' }], evento, 'm-1')).toBeNull();
  });

  it('attaches evento when assignment row lacks nested eventos', () => {
    const row = { id: 'em-1', miembro_id: 'm-1', confirmacion_estado: 'pendiente' };
    const result = buildLinkedMemberSelfEventRow([row], evento, 'm-1');
    expect(result.eventos).toEqual(evento);
  });

  it('keeps existing nested eventos', () => {
    const nested = { ...evento, nombre: 'Nested' };
    const row = { id: 'em-1', miembro_id: 'm-1', eventos: nested };
    const result = buildLinkedMemberSelfEventRow([row], evento, 'm-1');
    expect(result.eventos).toEqual(nested);
  });
});
