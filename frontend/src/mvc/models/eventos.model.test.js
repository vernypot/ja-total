import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  sb: {},
}));

import {
  canMemberConfirmEvent,
  canMemberCancelEventConfirmation,
  computeCheckinAttendanceEstado,
  computeEventAttendanceSummary,
  computeEventCuotaSummary,
  groupEventAttendanceAttendees,
  computeMemberAttendanceStats,
  eventRequiresConfirmation,
  getAsistenciaFromRow,
  getEventoIdFromRow,
  getEventoMiembroRowId,
  isEventoActive,
  isEventoEnded,
  isEventoIncludedInMemberStats,
  isEventoExcludedFromAttendance,
  memberAttendedEvent,
  shouldCorrectLateCheckin,
  wasMemberCheckedInToEvent,
} from './eventos.model';
import { patchPortalEventRowConfirmation } from './memberPortal.model';

describe('isEventoActive', () => {
  it('treats missing estado as active', () => {
    expect(isEventoActive({})).toBe(true);
  });

  it('treats finalizado as not active', () => {
    expect(isEventoActive({ estado: 'finalizado' })).toBe(false);
  });
});

describe('isEventoEnded', () => {
  it('detects finalizado estado', () => {
    expect(isEventoEnded({ estado: 'finalizado' })).toBe(true);
    expect(isEventoEnded({ estado: 'activo' })).toBe(false);
  });
});

describe('isEventoIncludedInMemberStats', () => {
  it('includes active and ended events', () => {
    expect(isEventoIncludedInMemberStats({ estado: 'activo' })).toBe(true);
    expect(isEventoIncludedInMemberStats({ estado: 'finalizado' })).toBe(true);
    expect(isEventoIncludedInMemberStats({})).toBe(true);
  });

  it('excludes cancelled and inactive events', () => {
    expect(isEventoIncludedInMemberStats({ estado: 'cancelado' })).toBe(false);
    expect(isEventoIncludedInMemberStats({ estado: 'inactivo' })).toBe(false);
  });

  it('excludes events removed from attendance registry', () => {
    expect(isEventoIncludedInMemberStats({ estado: 'activo', excluir_registro_asistencia: true })).toBe(false);
    expect(isEventoExcludedFromAttendance({ excluir_registro_asistencia: true })).toBe(true);
    expect(isEventoExcludedFromAttendance({ excluir_registro_asistencia: false })).toBe(false);
  });
});

describe('computeMemberAttendanceStats', () => {
  const helpers = {
    getEventoFromRow: row => row.eventos,
    getAsistenciaFromRow: row => row.evento_asistencia?.estado,
    getConfirmacionFromRow: () => 'confirmado',
    eventRequiresConfirmation: () => false,
  };

  it('counts ended past events and skips cancelled events', () => {
    const stats = computeMemberAttendanceStats([
      {
        eventos: {
          fecha: '2020-01-01',
          hora: '19:00:00',
          estado: 'finalizado',
          clubes: { iglesias: { timezone: 'America/Bogota' } },
        },
        evento_asistencia: { estado: 'a_tiempo' },
      },
      {
        eventos: {
          fecha: '2020-01-02',
          hora: '19:00:00',
          estado: 'cancelado',
          clubes: { iglesias: { timezone: 'America/Bogota' } },
        },
        evento_asistencia: { estado: 'a_tiempo' },
      },
    ], helpers);

    expect(stats.assigned).toBe(1);
    expect(stats.pastAssigned).toBe(1);
    expect(stats.attended).toBe(1);
    expect(stats.onTime).toBe(1);
  });

  it('skips events excluded from attendance registry', () => {
    const stats = computeMemberAttendanceStats([
      {
        eventos: {
          fecha: '2020-01-01',
          hora: '19:00:00',
          estado: 'finalizado',
          excluir_registro_asistencia: true,
          clubes: { iglesias: { timezone: 'America/Bogota' } },
        },
        evento_asistencia: { estado: 'a_tiempo' },
      },
    ], helpers);

    expect(stats.assigned).toBe(0);
    expect(stats.attended).toBe(0);
  });
});

describe('canMemberConfirmEvent', () => {
  const futureDate = '2099-12-31';
  const baseEvento = {
    id: 'evt-1',
    fecha: futureDate,
    hora: '19:00:00',
    estado: 'activo',
    requiere_confirmacion: true,
    clubes: { iglesias: { timezone: 'America/Bogota' } },
  };

  it('allows confirmation for assigned future invite events', () => {
    expect(canMemberConfirmEvent({
      id: 'em-1',
      eventos: baseEvento,
    })).toBe(true);
  });

  it('allows RSVP for general club events without an assignment row', () => {
    expect(canMemberConfirmEvent({
      id: null,
      evento_id: 'evt-1',
      confirmacion_estado: 'pendiente',
      eventos: { ...baseEvento, requiere_confirmacion: false },
    })).toBe(true);
  });

  it('allows confirmation on the event date when no start time is set', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    expect(canMemberConfirmEvent({
      id: 'em-2',
      eventos: {
        ...baseEvento,
        fecha: todayKey,
        hora: null,
      },
    }, today)).toBe(true);
  });

  it('blocks past events', () => {
    expect(canMemberConfirmEvent({
      id: 'em-3',
      eventos: {
        ...baseEvento,
        fecha: '2020-01-01',
        hora: '10:00:00',
      },
    })).toBe(false);
  });

  it('blocks ended events', () => {
    expect(canMemberConfirmEvent({
      id: 'em-ended',
      eventos: {
        ...baseEvento,
        estado: 'finalizado',
      },
    })).toBe(false);
  });

  it('does not prompt again after the member responds', () => {
    expect(canMemberConfirmEvent({
      id: 'em-4',
      confirmacion_estado: 'confirmado',
      eventos: baseEvento,
    })).toBe(false);

    expect(canMemberConfirmEvent({
      id: 'em-5',
      confirmacion_estado: 'rechazado',
      eventos: baseEvento,
    })).toBe(false);
  });

  it('allows canceling a prior response before the event', () => {
    const respondedRow = {
      id: 'em-6',
      confirmacion_estado: 'confirmado',
      eventos: baseEvento,
    };

    expect(canMemberCancelEventConfirmation(respondedRow)).toBe(true);
    expect(canMemberConfirmEvent(respondedRow)).toBe(false);
  });

  it('resolves ids from alternate row shapes', () => {
    expect(getEventoMiembroRowId({ evento_miembro_id: 'em-alt' })).toBe('em-alt');
    expect(getEventoIdFromRow({ evento_id: 'evt-alt', eventos: baseEvento })).toBe('evt-1');
    expect(eventRequiresConfirmation({ requiere_confirmacion: false })).toBe(false);
  });
});

describe('patchPortalEventRowConfirmation', () => {
  it('updates matching rows by assignment or event id', () => {
    const rows = [{
      id: null,
      evento_id: 'evt-1',
      confirmacion_estado: 'pendiente',
      eventos: { id: 'evt-1', nombre: 'Meeting' },
    }];

    const patched = patchPortalEventRowConfirmation(rows, {
      eventoId: 'evt-1',
      confirmacionEstado: 'confirmado',
      savedRow: { id: 'em-new', evento_id: 'evt-1', confirmacion_estado: 'confirmado' },
    });

    expect(patched[0].id).toBe('em-new');
    expect(patched[0].confirmacion_estado).toBe('confirmado');
  });
});

describe('computeEventAttendanceSummary', () => {
  it('aggregates confirmation and attendance counts', () => {
    const rows = [
      {
        id: '1',
        miembros: { nombre: 'Ana', apellido1: 'López' },
        confirmacion_estado: 'confirmado',
        confirmado_at: '2026-07-10T15:30:00Z',
        evento_asistencia: { estado: 'a_tiempo' },
      },
      {
        id: '2',
        miembros: { nombre: 'Ben', apellido1: 'Pérez' },
        confirmacion_estado: 'pendiente',
        evento_asistencia: { estado: 'tarde' },
      },
      {
        id: '3',
        miembros: { nombre: 'Cara', apellido1: 'Díaz' },
        confirmacion_estado: 'rechazado',
        evento_asistencia: { estado: 'ausente' },
      },
      {
        id: '4',
        miembros: { nombre: 'Dan', apellido1: 'Ruiz' },
        confirmacion_estado: 'confirmado',
      },
    ];

    const { stats, attendees } = computeEventAttendanceSummary(rows, { needsConfirmation: true });

    expect(stats).toMatchObject({
      assigned: 4,
      confirmed: 2,
      pendingConfirmation: 1,
      declined: 1,
      onTime: 1,
      late: 1,
      absent: 1,
      notRecorded: 1,
    });
    expect(attendees.map(item => item.name)).toEqual(['Ana López', 'Ben Pérez', 'Cara Díaz', 'Dan Ruiz']);
    expect(attendees.find(item => item.id === '1')?.confirmadoAt).toBe('2026-07-10T15:30:00Z');
    expect(attendees.find(item => item.id === '2')?.confirmadoAt).toBeNull();
  });

  it('groups attendees by confirmation or attendance status', () => {
    const attendees = [
      { id: '1', name: 'Ana', confirmacion: 'confirmado', asistencia: 'a_tiempo' },
      { id: '2', name: 'Ben', confirmacion: 'pendiente', asistencia: null },
      { id: '3', name: 'Cara', confirmacion: 'rechazado', asistencia: 'ausente' },
    ];

    expect(groupEventAttendanceAttendees(attendees, { needsConfirmation: true }).map(group => group.key))
      .toEqual(['confirmado', 'pendiente', 'rechazado']);

    expect(groupEventAttendanceAttendees(attendees, { needsConfirmation: false }).map(group => group.key))
      .toEqual(['a_tiempo', 'ausente', 'pending']);
  });
});

describe('memberAttendedEvent', () => {
  it('returns true for on-time and late attendance', () => {
    expect(memberAttendedEvent({
      evento_asistencia: { estado: 'a_tiempo' },
    })).toBe(true);
    expect(memberAttendedEvent({
      evento_asistencia: { estado: 'tarde' },
    })).toBe(true);
  });

  it('returns false when absent or pending', () => {
    expect(memberAttendedEvent({
      evento_asistencia: { estado: 'ausente' },
    })).toBe(false);
    expect(memberAttendedEvent({})).toBe(false);
  });

  it('reads nested attendance arrays', () => {
    expect(getAsistenciaFromRow({
      evento_asistencia: [{ estado: 'a_tiempo' }],
    })).toBe('a_tiempo');
  });
});

describe('computeEventCuotaSummary', () => {
  const evento = { cuota_aplica: true, cuota_monto_override: 10 };
  const club = { cuota_moneda_simbolo: '$' };

  it('returns applies false when event has no cuota', () => {
    expect(computeEventCuotaSummary([], { evento: { cuota_aplica: false }, club })).toEqual({
      applies: false,
      totalCollected: 0,
      paidCount: 0,
      attendedCount: 0,
      unpaidCount: 0,
    });
  });

  it('sums paid cuotas for attended members only', () => {
    const rows = [
      {
        id: '1',
        cuota_pagada: true,
        evento_asistencia: { estado: 'a_tiempo' },
      },
      {
        id: '2',
        cuota_pagada: true,
        cuota_monto_override: 15,
        evento_asistencia: { estado: 'tarde' },
      },
      {
        id: '3',
        cuota_pagada: false,
        evento_asistencia: { estado: 'a_tiempo' },
      },
      {
        id: '4',
        cuota_pagada: true,
        evento_asistencia: { estado: 'ausente' },
      },
    ];

    expect(computeEventCuotaSummary(rows, { evento, club })).toEqual({
      applies: true,
      totalCollected: 25,
      paidCount: 2,
      attendedCount: 3,
      unpaidCount: 1,
    });
  });
});

describe('wasMemberCheckedInToEvent', () => {
  it('returns true when checked_in_at is set', () => {
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'ausente', checked_in_at: '2026-07-13T01:00:00Z' },
    })).toBe(true);
  });

  it('returns true for on-time or late attendance without timestamp', () => {
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'a_tiempo' },
    })).toBe(true);
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'tarde' },
    })).toBe(true);
  });

  it('returns false when absent or not yet checked in', () => {
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'ausente' },
    })).toBe(false);
    expect(wasMemberCheckedInToEvent({})).toBe(false);
  });
});

describe('shouldCorrectLateCheckin', () => {
  const evento = { fecha: '2026-07-13', hora: '19:00:00' };

  it('detects false late from UTC-based server comparison', () => {
    expect(shouldCorrectLateCheckin(
      {
        evento_miembro_id: 'em-1',
        estado: 'tarde',
        checked_in_at: '2026-07-13T23:55:00.000Z',
      },
      {
        ...evento,
        clubes: { iglesias: { timezone: 'America/Bogota' } },
      }
    )).toBe(true);
  });

  it('does not correct genuine late check-ins', () => {
    expect(shouldCorrectLateCheckin(
      {
        evento_miembro_id: 'em-1',
        estado: 'tarde',
        checked_in_at: '2026-07-14T00:20:00.000Z',
      },
      evento
    )).toBe(false);
  });
});

describe('event attendance merge helpers', () => {
  const events = [
    { id: 'a', club_id: 'club-1', fecha: '2026-07-13', hora: '09:00:00', estado: 'activo', nombre: 'Morning block' },
    { id: 'b', club_id: 'club-1', fecha: '2026-07-13', hora: '14:00:00', estado: 'activo', nombre: 'Afternoon block' },
    { id: 'c', club_id: 'club-1', fecha: '2026-07-14', hora: '10:00:00', estado: 'activo', nombre: 'Other day' },
    { id: 'd', club_id: 'club-1', fecha: '2026-07-13', hora: '16:00:00', estado: 'activo', nombre: 'Merged', asistencia_grupo_id: 'grupo-1' },
    { id: 'e', club_id: 'club-1', fecha: '2026-07-13', hora: '17:00:00', estado: 'activo', nombre: 'Merged 2', asistencia_grupo_id: 'grupo-1' },
  ];

  it('finds same-day merge targets across grouped and ungrouped events', async () => {
    const { getSameDateEventoMergeTargets, getGrupoSiblingEventos } = await import('./eventos.model');
    const anchor = events[0];
    expect(getSameDateEventoMergeTargets(events, anchor).map(e => e.id)).toEqual(['b', 'd', 'e']);
    expect(getGrupoSiblingEventos(events, events[3]).map(e => e.id)).toEqual(['e']);
    expect(getGrupoSiblingEventos(events, events[3]).length).toBe(1);
  });
});

describe('computeCheckinAttendanceEstado', () => {
  const evento = { fecha: '2026-07-13', hora: '19:00:00' };

  it('marks early check-in as on time', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-13T23:30:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('a_tiempo');
  });

  it('marks check-in within 3 minutes after scheduled start as on time', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-14T00:02:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('a_tiempo');
  });

  it('marks check-in more than 3 minutes after scheduled start as late', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-14T00:05:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('tarde');
  });

  it('uses actividad_inicio_at when set', () => {
    const withActivityStart = {
      ...evento,
      actividad_inicio_at: '2026-07-14T01:00:00.000Z',
    };

    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-14T01:02:00.000Z'),
      withActivityStart,
      { timeZone: 'America/Bogota' }
    )).toBe('a_tiempo');

    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-14T01:04:00.000Z'),
      withActivityStart,
      { timeZone: 'America/Bogota' }
    )).toBe('tarde');
  });
});
