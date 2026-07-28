import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import FormField from '../../components/FormField';
import DatePickerInput from '../../components/DatePickerInput';
import { PageHelpLink } from '../../components/PageHelp';
import {
  AttendanceControls,
  ConfirmationControls,
  EventActionButton,
} from '../../components/EventAttendanceControls';
import { clubDisplayName } from '../../utils/club';
import EventDescriptionToggle from '../../components/EventDescriptionToggle';
import HorizontalScrollRow from '../../components/HorizontalScrollRow';
import EventListActionsModal, { EventListOverflowTrigger } from '../../components/EventListActionsModal';
import LinkedMemberEventConfirmSection from '../../components/LinkedMemberEventConfirmSection';
import * as EventosModel from '../models/eventos.model';
import '../../styles/form.css';

function FormSection({ title, children, className = '' }) {
  return (
    <section className={`form-section-block ${className}`.trim()}>
      {title && <h5 className="form-section-title">{title}</h5>}
      {children}
    </section>
  );
}

function ChoiceOption({ type = 'checkbox', name, checked, onChange, label, hint, className = '' }) {
  return (
    <label className={`form-choice-option ${checked ? 'form-choice-option--selected' : ''} ${className}`.trim()}>
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span className="form-choice-option__text">
        <span className="form-choice-option__label">{label}</span>
        {hint && <span className="form-choice-option__hint">{hint}</span>}
      </span>
    </label>
  );
}

function MemberCheckboxGrid({ members, selectedIds, onToggle, onSelectAll, t, memberDisplayName }) {
  const selectedCount = selectedIds.length;

  return (
    <>
      <div className="form-member-grid-toolbar">
        <span className="form-member-grid-count">
          {t('membersSelectedCount')
            .replace('{selected}', String(selectedCount))
            .replace('{total}', String(members.length))}
        </span>
        <button type="button" onClick={onSelectAll} className="form-link-btn">
          {t('selectAll')}
        </button>
      </div>
      <div className="form-member-grid">
        {members.map(m => (
          <ChoiceOption
            key={m.id}
            checked={selectedIds.includes(m.id)}
            onChange={() => onToggle(m.id)}
            label={memberDisplayName(m)}
          />
        ))}
      </div>
    </>
  );
}

function EventStatusBadge({ estado, t }) {
  if (!estado || estado === 'activo') return null;

  const styles = {
    cancelado: { bg: '#fee2e2', color: '#991b1b' },
    inactivo: { bg: '#f3f4f6', color: '#4b5563' },
    finalizado: { bg: '#e0e7ff', color: '#3730a3' },
  };
  const style = styles[estado] || styles.inactivo;
  const labels = {
    cancelado: t('eventStatusCancelled'),
    inactivo: t('eventStatusInactive'),
    finalizado: t('eventStatusEnded'),
  };

  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '2px 8px',
      borderRadius: '999px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {labels[estado] || estado}
    </span>
  );
}

function EventDetailsFields({
  eventForm,
  setEventForm,
  tiposEvento,
  fieldErrors = {},
  t,
  showActivityStart = false,
}) {
  return (
    <div className="event-form-fields">
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('eventName')}</label>
        <input
          type="text"
          value={eventForm.nombre}
          onChange={e => setEventForm({ ...eventForm, nombre: e.target.value })}
          placeholder={t('eventNameOptional')}
          className="form-input"
          style={{ margin: 0 }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('eventType')}</label>
        <select
          value={eventForm.tipo_evento_id}
          onChange={e => setEventForm({ ...eventForm, tipo_evento_id: e.target.value })}
          className="form-input"
          style={{ margin: 0 }}
        >
          <option value="">{t('selectEventType')}</option>
          {tiposEvento.map(tipo => (
            <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
          ))}
        </select>
      </div>
      <FormField label={t('eventDate')} htmlFor="event-fecha" error={fieldErrors.fecha} required>
        <DatePickerInput
          id="event-fecha"
          value={eventForm.fecha}
          onChange={e => setEventForm({ ...eventForm, fecha: e.target.value })}
          className="form-input"
          style={{ margin: 0 }}
          aria-invalid={Boolean(fieldErrors.fecha)}
          required
        />
      </FormField>
      <FormField label={t('eventTime')} htmlFor="event-hora" error={fieldErrors.hora} required>
        <input
          id="event-hora"
          type="time"
          value={eventForm.hora}
          onChange={e => setEventForm({ ...eventForm, hora: e.target.value })}
          className="form-input"
          style={{ margin: 0 }}
          aria-invalid={Boolean(fieldErrors.hora)}
        />
      </FormField>
      {showActivityStart && (
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label={t('eventActivityStartField')} htmlFor="event-actividad-inicio">
            <input
              id="event-actividad-inicio"
              type="datetime-local"
              value={eventForm.actividad_inicio_local || ''}
              onChange={e => setEventForm({ ...eventForm, actividad_inicio_local: e.target.value })}
              className="form-input"
              style={{ margin: 0 }}
            />
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: '13px' }}>
              {t('eventActivityStartFieldHint')}
            </p>
          </FormField>
        </div>
      )}
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField label={t('eventPlace')} htmlFor="event-lugar" error={fieldErrors.lugar} required>
          <input
            id="event-lugar"
            type="text"
            value={eventForm.lugar}
            onChange={e => setEventForm({ ...eventForm, lugar: e.target.value })}
            placeholder={t('eventPlace')}
            className="form-input"
            style={{ margin: 0 }}
            aria-invalid={Boolean(fieldErrors.lugar)}
          />
        </FormField>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField label={t('eventDescription')} htmlFor="event-descripcion">
          <textarea
            id="event-descripcion"
            value={eventForm.descripcion}
            onChange={e => setEventForm({ ...eventForm, descripcion: e.target.value })}
            placeholder={t('eventDescriptionOptional')}
            className="form-input"
            rows={3}
            maxLength={500}
            style={{ margin: 0, resize: 'vertical' }}
          />
        </FormField>
      </div>
    </div>
  );
}

function EventConfirmationAndAttendeesFields({
  eventForm,
  setEventForm,
  clubMembers,
  setMemberAssignmentMode,
  toggleMemberSelection,
  selectAllMembers,
  t,
  memberDisplayName,
  memberAssignmentName = 'memberAssignmentMode',
}) {
  const assignAll = eventForm.memberAssignmentMode === 'all';

  return (
    <>
      <FormSection title={t('eventOptionsSection')}>
        <div className="form-choice-group">
          <ChoiceOption
            checked={eventForm.requiere_confirmacion}
            onChange={e => setEventForm({ ...eventForm, requiere_confirmacion: e.target.checked })}
            label={t('eventRequiresConfirmation')}
            hint={eventForm.requiere_confirmacion
              ? t('eventRequiresConfirmationHint')
              : t('eventNoConfirmationHint')}
          />
        </div>
      </FormSection>

      {eventForm.requiere_confirmacion && (
        <FormSection title={t('assignMembersToEvent')}>
          <div className="form-choice-group form-choice-group--grid">
            <ChoiceOption
              type="radio"
              name={memberAssignmentName}
              checked={assignAll}
              onChange={() => setMemberAssignmentMode('all')}
              label={t('addAllActiveMembers')}
              hint={clubMembers.length > 0
                ? t('allActiveMembersHint').replace('{count}', String(clubMembers.length))
                : t('noMembersInClub')}
            />
            <ChoiceOption
              type="radio"
              name={memberAssignmentName}
              checked={!assignAll}
              onChange={() => setMemberAssignmentMode('specific')}
              label={t('addSpecificMembers')}
              hint={t('addSpecificMembersHint')}
            />
          </div>

          {!assignAll && clubMembers.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <MemberCheckboxGrid
                members={clubMembers}
                selectedIds={eventForm.selectedMemberIds}
                onToggle={toggleMemberSelection}
                onSelectAll={selectAllMembers}
                t={t}
                memberDisplayName={memberDisplayName}
              />
            </div>
          )}

          {clubMembers.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: '14px 0 0' }}>{t('noMembersInClub')}</p>
          )}
        </FormSection>
      )}
    </>
  );
}

function EventMergeAttendanceModal({
  mergeAnchorEvent,
  mergeCandidates,
  mergeTargetEventId,
  setMergeTargetEventId,
  mergingAttendance,
  confirmMergeAttendance,
  closeMergeAttendance,
  formatEventTime,
  t,
}) {
  if (!mergeAnchorEvent) return null;

  return (
    <div className="event-merge-modal-backdrop">
      <div className="event-merge-modal card">
        <h3 style={{ marginTop: 0 }}>{t('eventMergeTitle')}</h3>
        <p className="text-muted" style={{ marginTop: 0 }}>{t('eventMergeHint')}</p>

        <div className="event-merge-modal__anchor">
          <span className="event-merge-modal__anchor-label">{t('eventMergeThisEvent')}</span>
          <strong>{mergeAnchorEvent.nombre || t('eventUntitled')}</strong>
          <span className="text-muted" style={{ marginLeft: '8px' }}>
            {mergeAnchorEvent.fecha} · {formatEventTime(mergeAnchorEvent.hora)}
          </span>
        </div>

        {mergeCandidates.length === 0 ? (
          <p className="text-muted">{t('eventMergeNoTargets')}</p>
        ) : (
          <div className="event-merge-modal__list">
            <p className="event-merge-modal__list-label">{t('eventMergeSelectTargetLabel')}</p>
            {mergeCandidates.map(candidate => (
              <label key={candidate.id} className="event-merge-modal__option">
                <input
                  type="radio"
                  name="event-merge-target"
                  checked={mergeTargetEventId === candidate.id}
                  onChange={() => setMergeTargetEventId(candidate.id)}
                />
                <span>
                  <strong>{candidate.nombre || t('eventUntitled')}</strong>
                  <span className="text-muted" style={{ marginLeft: '8px' }}>
                    {formatEventTime(candidate.hora)}
                    {candidate.lugar ? ` · ${candidate.lugar}` : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="event-merge-modal__actions">
          <EventActionButton
            tone="success"
            onClick={confirmMergeAttendance}
            disabled={!mergeTargetEventId || mergingAttendance || mergeCandidates.length === 0}
          >
            {mergingAttendance ? t('loading') : t('eventMergeConfirm')}
          </EventActionButton>
          <EventActionButton tone="muted" onClick={closeMergeAttendance} disabled={mergingAttendance}>
            {t('cancel')}
          </EventActionButton>
        </div>
      </div>
    </div>
  );
}

export default function EventosView({
  clubs,
  clubId,
  activeClubData,
  events,
  allClubEvents,
  tiposEvento,
  clubMembers,
  expandedEventId,
  assignments,
  error,
  loading,
  showForm,
  openEventForm,
  closeEventForm,
  eventForm,
  setEventForm,
  setMemberAssignmentMode,
  searchQuery,
  setSearchQuery,
  canManage,
  iglesiaScopeReady,
  toggleEventExpand,
  toggleMemberSelection,
  selectAllMembers,
  saveEvent,
  setConfirmation,
  setAttendance,
  setClubId,
  showInactive,
  setShowInactive,
  editingEventId,
  openEditForm,
  closeEditForm,
  cancelEvent,
  deactivateEvent,
  reactivateEvent,
  endEvent,
  savingEvent,
  fieldErrors = {},
  bulkUpdatingEventId,
  confirmAllPending,
  setAllAttendance,
  editingAttendeesEventId,
  attendeeEditIds,
  savingAttendees,
  openAttendeeEditor,
  closeAttendeeEditor,
  toggleAttendeeEditSelection,
  selectAllAttendeeEdit,
  saveEventAttendees,
  manualAddEventId,
  manualAddForm,
  setManualAddForm,
  manualAddFieldErrors,
  savingManualAdd,
  openManualAddMember,
  closeManualAddMember,
  saveManualAddMember,
  initializeEvent,
  scanAttendees,
  initializingEventId,
  isEventoActive,
  isEventoEnded,
  sortEventAttendanceRows,
  isEventInFuture,
  getCheckedInAtFromRow,
  getAsistenciaFromRow,
  getConfirmacionFromRow,
  getManualAddJustificationFromRow,
  eventRequiresConfirmation,
  getTipoEventoNombre,
  memberDisplayName,
  formatEventTime,
  formatEventTimestamp,
  mergeAnchorEvent,
  mergeCandidates,
  mergeTargetEventId,
  setMergeTargetEventId,
  mergingAttendance,
  openMergeAttendance,
  closeMergeAttendance,
  confirmMergeAttendance,
  unmergeAttendance,
  excludeFromAttendanceRegistry,
  restoreToAttendanceRegistry,
  canCombineEventoAttendance,
  getGrupoSiblingEventos,
  isEventoExcludedFromAttendance,
  formatMergedEventoLabels,
  listPagination,
  getSelfEventRow,
  updateSelfConfirmation,
  savingSelfConfirmationId,
}) {
  const { t } = useLanguage();
  const [overflowMenuEventId, setOverflowMenuEventId] = useState(null);
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  function buildConfirmBeforeConfirmation(eventName, memberName) {
    return (estado, proceed) => {
      if (estado !== 'rechazado') {
        proceed();
        return;
      }
      askConfirm({
        title: t('confirmRejectConfirmationTitle'),
        message: t('confirmRejectConfirmationMessage'),
        highlight: memberName || eventName,
        confirmLabel: t('approvalRequestReject'),
        onConfirm: proceed,
      });
    };
  }

  function buildConfirmBeforeAttendance(eventName, memberName) {
    return (estado, proceed) => {
      if (estado !== 'ausente') {
        proceed();
        return;
      }
      askConfirm({
        title: t('confirmMarkAbsentTitle'),
        message: t('confirmMarkAbsentMessage'),
        highlight: memberName || eventName,
        confirmLabel: t('attendanceAbsent'),
        onConfirm: proceed,
      });
    };
  }

  function confirmCancelEvent(evento) {
    askConfirm({
      title: t('confirmCancelEventTitle'),
      message: t('cancelEventConfirm'),
      highlight: evento.nombre || t('eventUntitled'),
      confirmLabel: t('cancelEvent'),
      onConfirm: async () => { await cancelEvent(evento.id); },
    });
  }

  function confirmDeactivateEvent(evento) {
    askConfirm({
      title: t('confirmDeactivateEventTitle'),
      message: t('deactivateEventConfirm'),
      highlight: evento.nombre || t('eventUntitled'),
      confirmLabel: t('deactivate'),
      onConfirm: async () => { await deactivateEvent(evento.id); },
    });
  }

  function confirmEndEvent(evento) {
    askConfirm({
      title: t('confirmEndEventTitle'),
      message: t('endEventConfirm'),
      highlight: evento.nombre || t('eventUntitled'),
      confirmLabel: t('endEvent'),
      onConfirm: async () => { await endEvent(evento.id); },
    });
  }

  function confirmExcludeFromAttendance(evento) {
    askConfirm({
      title: t('confirmExcludeFromAttendanceTitle'),
      message: t('confirmExcludeFromAttendanceMessage'),
      highlight: evento.nombre || t('eventUntitled'),
      confirmLabel: t('eventExcludeFromAttendanceAction'),
      onConfirm: async () => { await excludeFromAttendanceRegistry(evento.id); },
    });
  }

  function confirmRestoreToAttendance(evento) {
    askConfirm({
      title: t('confirmRestoreToAttendanceTitle'),
      message: t('confirmRestoreToAttendanceMessage'),
      highlight: evento.nombre || t('eventUntitled'),
      confirmLabel: t('eventRestoreToAttendanceAction'),
      onConfirm: async () => { await restoreToAttendanceRegistry(evento.id); },
    });
  }

  function confirmAllPendingForEvent(evento) {
    askConfirm({
      title: t('confirmAllPendingTitle'),
      message: t('confirmAllPendingConfirm'),
      highlight: evento.nombre || t('eventUntitled'),
      confirmLabel: t('confirmAllPending'),
      onConfirm: async () => { await confirmAllPending(evento.id); },
    });
  }

  function confirmSetAllAttendance(evento, estado) {
    const isAbsent = estado === 'ausente';
    askConfirm({
      title: isAbsent ? t('confirmMarkAllAbsentTitle') : t('confirmMarkAllOnTimeTitle'),
      message: t(isAbsent ? 'markAllAbsentConfirm' : 'markAllOnTimeConfirm'),
      highlight: evento.nombre || t('eventUntitled'),
      confirmLabel: isAbsent ? t('markAllAbsent') : t('markAllOnTime'),
      onConfirm: async () => { await setAllAttendance(evento.id, estado); },
    });
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>📅 {t('events')} <PageHelpLink pageId="events" /></h1>
          {activeClubData && (
            <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {t('clubLabel')}: <strong>{clubDisplayName(activeClubData)}</strong>
            </p>
          )}
        </div>
        {canManage && clubId && (
          <button
            onClick={() => (showForm ? closeEventForm() : openEventForm())}
            style={{
              padding: '10px 15px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {showForm ? `✕ ${t('cancel')}` : `➕ ${t('newEvent')}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!iglesiaScopeReady && (
        <div className="alert alert-error">{t('noActiveIglesiaAssignment')}</div>
      )}

      <div className="card" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>{t('selectClub')}</label>
        <select
          value={clubId}
          onChange={e => setClubId(e.target.value)}
          className="form-input"
          style={{ maxWidth: '400px' }}
        >
          <option value="">{t('selectClub')}</option>
          {clubs.map(c => (
            <option key={c.id} value={c.id}>{clubDisplayName(c)}</option>
          ))}
        </select>
      </div>

      {!clubId ? (
        <p className="text-muted">{t('selectClubForEvents')}</p>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>{t('clubEventsList')}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                {t('showInactiveEvents')}
              </label>
              <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>

          {showForm && canManage && (
            <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '16px' }}>{t('newEvent')}</h4>

              <div className="event-form-layout">
                <FormSection title={t('eventDetailsSection')}>
                  <EventDetailsFields
                    eventForm={eventForm}
                    setEventForm={setEventForm}
                    tiposEvento={tiposEvento}
                    fieldErrors={fieldErrors}
                    t={t}
                  />
                </FormSection>

                <EventConfirmationAndAttendeesFields
                  eventForm={eventForm}
                  setEventForm={setEventForm}
                  clubMembers={clubMembers}
                  setMemberAssignmentMode={setMemberAssignmentMode}
                  toggleMemberSelection={toggleMemberSelection}
                  selectAllMembers={selectAllMembers}
                  t={t}
                  memberDisplayName={memberDisplayName}
                />

                <div className="event-form-actions">
                  <button onClick={saveEvent} disabled={savingEvent} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: savingEvent ? 'not-allowed' : 'pointer', opacity: savingEvent ? 0.7 : 1 }}>
                    ✓ {t('save')}
                  </button>
                  <button type="button" onClick={closeEventForm} style={{ padding: '10px 20px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    ✕ {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ListPagination {...listPagination} />

          {loading ? (
            <div className="loading">{t('loadingEvents')}</div>
          ) : events.length === 0 ? (
            <p className="text-muted">{t('noEvents')}</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {events.map(evento => {
                const expanded = expandedEventId === evento.id;
                const editingAttendees = editingAttendeesEventId === evento.id;
                const isEditing = editingEventId === evento.id;
                const isFuture = isEventInFuture(evento);
                const isActive = isEventoActive(evento);
                const isEnded = isEventoEnded(evento);
                const rows = sortEventAttendanceRows(assignments[evento.id] || []);
                const recordedCount = rows.filter(row => getAsistenciaFromRow(row)).length;
                const confirmedCount = rows.filter(row => getConfirmacionFromRow(row) === 'confirmado').length;
                const tipoNombre = getTipoEventoNombre(evento);
                const needsConfirmation = eventRequiresConfirmation(evento);
                const assignedMemberIds = new Set(rows.map(row => row.miembro_id));
                const availableManualAddMembers = clubMembers.filter(m => !assignedMemberIds.has(m.id));
                const showingManualAdd = manualAddEventId === evento.id;
                const grupoSiblings = getGrupoSiblingEventos(allClubEvents, evento);
                const isExcluded = isEventoExcludedFromAttendance(evento);
                const canCombineEvent = canManage && isActive && !isExcluded && canCombineEventoAttendance(allClubEvents, evento);
                const selfRow = getSelfEventRow?.(evento, rows) || null;
                const showSelfConfirmInRow = Boolean(
                  updateSelfConfirmation
                  && !isExcluded
                  && selfRow
                  && EventosModel.eventRequiresConfirmation(evento)
                  && EventosModel.canMemberConfirmEvent(selfRow)
                );

                return (
                  <div
                    key={evento.id}
                    className={[
                      'event-list-card',
                      !isActive && !isEnded ? 'event-list-card--inactive' : '',
                      isEnded ? 'event-list-card--ended' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className={`event-list-card__summary${expanded || editingAttendees || isEditing ? ' is-active' : ''}`}>
                      <div className="event-list-card__header">
                        <div className="event-list-card__info">
                          <div className="event-list-card__title-row">
                            <strong>{evento.nombre || t('eventUntitled')}</strong>
                            <EventStatusBadge estado={evento.estado} t={t} />
                            {isFuture && isActive && (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor: '#dbeafe',
                                color: '#1d4ed8',
                              }}>
                                {t('upcomingEvent')}
                              </span>
                            )}
                          </div>
                          <div className="event-list-card__meta">
                            {evento.fecha} · {formatEventTime(evento.hora)} · {evento.lugar}
                            {tipoNombre && <> · {tipoNombre}</>}
                          </div>
                          <EventDescriptionToggle description={evento.descripcion} />
                          {evento.asistencia_grupo_id && grupoSiblings.length > 0 && !isExcluded && (
                            <div className="event-merge-badge">
                              {t('eventMergedAttendanceBadge')}: {formatMergedEventoLabels([evento, ...grupoSiblings])}
                            </div>
                          )}
                          {isExcluded && (
                            <div className="event-excluded-badge">
                              {t('eventExcludedFromAttendanceBadge')}
                            </div>
                          )}
                          {needsConfirmation && !isExcluded && (
                            <div className="event-list-card__hint event-list-card__hint--confirm">
                              {t('eventRequiresConfirmationBadge')}
                              {assignments[evento.id] && rows.length > 0 && (
                                <> · {t('confirmationSummary').replace('{confirmed}', String(confirmedCount)).replace('{assigned}', String(rows.length))}</>
                              )}
                            </div>
                          )}
                          {!needsConfirmation && !isExcluded && (
                            <div className="event-list-card__hint event-list-card__hint--muted">
                              {rows.length > 0
                                ? t('attendanceSummary')
                                  .replace('{assigned}', String(rows.length))
                                  .replace('{recorded}', String(recordedCount))
                                : t('eventQrAttendanceHint')}
                            </div>
                          )}
                          {isExcluded && (
                            <div className="event-list-card__hint event-list-card__hint--warn">
                              {t('eventExcludedFromAttendanceHint')}
                            </div>
                          )}
                          {needsConfirmation && assignments[evento.id] && rows.length > 0 && !isExcluded && (
                            <div className="event-list-card__hint event-list-card__hint--muted">
                              {t('attendanceSummary')
                                .replace('{assigned}', String(rows.length))
                                .replace('{recorded}', String(recordedCount))}
                            </div>
                          )}
                        </div>
                        <HorizontalScrollRow className="event-list-card__actions">
                          {canManage && isActive && !isExcluded && (
                            <>
                              <EventActionButton
                                tone="primary"
                                onClick={() => initializeEvent(evento.id)}
                                disabled={Boolean(evento.actividad_inicio_at || evento.evento_asistencia_grupo?.actividad_inicio_at) || initializingEventId === evento.id}
                              >
                                ▶ {initializingEventId === evento.id ? t('loading') : t('initializeEvent')}
                              </EventActionButton>
                              <EventActionButton
                                tone="success"
                                onClick={() => scanAttendees(evento.id)}
                              >
                                ▶ {t('scanAttendees')}
                              </EventActionButton>
                              {canCombineEvent && (
                                <EventActionButton
                                  tone="info"
                                  onClick={() => openMergeAttendance(evento.id)}
                                >
                                  🔗 {t('eventMergeAction')}
                                </EventActionButton>
                              )}
                              {evento.asistencia_grupo_id && (
                                <EventActionButton
                                  tone="warning"
                                  onClick={() => unmergeAttendance(evento.id)}
                                >
                                  {t('eventUnmergeAction')}
                                </EventActionButton>
                              )}
                            </>
                          )}
                          {canManage && isActive && (
                            <EventActionButton tone="muted" onClick={() => confirmEndEvent(evento)}>
                              ⏹ {t('endEvent')}
                            </EventActionButton>
                          )}
                          {canManage && !isActive && (
                            <EventActionButton tone="success" onClick={() => reactivateEvent(evento.id)}>
                              {t('activate')}
                            </EventActionButton>
                          )}
                          <EventListOverflowTrigger
                            t={t}
                            onClick={() => setOverflowMenuEventId(evento.id)}
                          />
                        </HorizontalScrollRow>
                      </div>
                      {showSelfConfirmInRow && (
                        <LinkedMemberEventConfirmSection
                          evento={evento}
                          selfRow={selfRow}
                          updateConfirmation={updateSelfConfirmation}
                          savingConfirmationId={savingSelfConfirmationId}
                          t={t}
                          className="event-list-self-confirm"
                        />
                      )}
                      <EventListActionsModal
                        open={overflowMenuEventId === evento.id}
                        onClose={() => setOverflowMenuEventId(null)}
                        evento={evento}
                        t={t}
                        canManage={canManage}
                        isActive={isActive}
                        isExcluded={isExcluded}
                        isFuture={isFuture}
                        needsConfirmation={needsConfirmation}
                        isEditing={isEditing}
                        expanded={expanded}
                        editingAttendees={editingAttendees}
                        selfRow={selfRow}
                        updateSelfConfirmation={updateSelfConfirmation}
                        savingSelfConfirmationId={savingSelfConfirmationId}
                        onEdit={() => (isEditing ? closeEditForm() : openEditForm(evento))}
                        onManageAttendance={() => toggleEventExpand(evento.id)}
                        onUpdateAttendees={() => (editingAttendees ? closeAttendeeEditor() : openAttendeeEditor(evento.id))}
                        onExclude={() => confirmExcludeFromAttendance(evento)}
                        onRestore={() => confirmRestoreToAttendance(evento)}
                        onCancelEvent={() => confirmCancelEvent(evento)}
                        onDeactivate={() => confirmDeactivateEvent(evento)}
                        onShowAttendanceList={!canManage ? () => toggleEventExpand(evento.id) : undefined}
                      />
                    </div>

                    {isEditing && canManage && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#fffbeb' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{t('editEvent')}</h4>
                        <div className="event-form-layout">
                          <FormSection title={t('eventDetailsSection')}>
                            <EventDetailsFields
                              eventForm={eventForm}
                              setEventForm={setEventForm}
                              tiposEvento={tiposEvento}
                              fieldErrors={fieldErrors}
                              t={t}
                              showActivityStart
                            />
                          </FormSection>

                          <EventConfirmationAndAttendeesFields
                            eventForm={eventForm}
                            setEventForm={setEventForm}
                            clubMembers={clubMembers}
                            setMemberAssignmentMode={setMemberAssignmentMode}
                            toggleMemberSelection={toggleMemberSelection}
                            selectAllMembers={selectAllMembers}
                            t={t}
                            memberDisplayName={memberDisplayName}
                            memberAssignmentName="editMemberAssignmentMode"
                          />

                          <div className="event-form-actions">
                            <EventActionButton tone="success" onClick={saveEvent} disabled={savingEvent}>
                              ✓ {t('save')}
                            </EventActionButton>
                            <EventActionButton tone="muted" onClick={closeEditForm}>
                              ✕ {t('cancel')}
                            </EventActionButton>
                          </div>
                        </div>
                      </div>
                    )}

                    {editingAttendees && canManage && needsConfirmation && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#fffbeb' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{t('editAttendees')}</h4>
                        {clubMembers.length === 0 ? (
                          <p className="text-muted" style={{ margin: 0 }}>{t('noMembersInClub')}</p>
                        ) : (
                          <>
                            <MemberCheckboxGrid
                              members={clubMembers}
                              selectedIds={attendeeEditIds}
                              onToggle={toggleAttendeeEditSelection}
                              onSelectAll={selectAllAttendeeEdit}
                              t={t}
                              memberDisplayName={memberDisplayName}
                            />
                            <button
                              type="button"
                              onClick={() => saveEventAttendees(evento.id)}
                              disabled={savingAttendees}
                              style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: savingAttendees ? 'not-allowed' : 'pointer', opacity: savingAttendees ? 0.7 : 1 }}
                            >
                              ✓ {t('saveAttendees')}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {expanded && (
                      <div className="event-attendance-panel">
                        {isExcluded ? (
                          <div className="event-excluded-panel">
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                              {t('eventExcludedFromAttendanceBadge')}
                            </h4>
                            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#92400e' }}>
                              {t('eventExcludedFromAttendanceHint')}
                            </p>
                            {canManage && (
                              <EventActionButton
                                tone="success"
                                onClick={() => confirmRestoreToAttendance(evento)}
                              >
                                ↩ {t('eventRestoreToAttendanceAction')}
                              </EventActionButton>
                            )}
                          </div>
                        ) : (
                          <>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                          {canManage ? t('manageAttendance') : t('attendanceList')}
                        </h4>
                        {canManage && (
                          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                            {needsConfirmation ? t('manageAttendanceHint') : t('manageAttendanceQrHint')}
                          </p>
                        )}
                        {canManage && rows.length > 0 && (
                          <HorizontalScrollRow className="event-list-bulk-actions" style={{ marginBottom: '12px' }}>
                            {needsConfirmation && (
                              <EventActionButton
                                tone="success"
                                disabled={bulkUpdatingEventId === evento.id}
                                onClick={() => confirmAllPendingForEvent(evento)}
                              >
                                {t('confirmAllPending')}
                              </EventActionButton>
                            )}
                            <EventActionButton
                              tone="info"
                              disabled={bulkUpdatingEventId === evento.id}
                              onClick={() => confirmSetAllAttendance(evento, 'a_tiempo')}
                            >
                              {t('markAllOnTime')}
                            </EventActionButton>
                            <EventActionButton
                              tone="danger"
                              disabled={bulkUpdatingEventId === evento.id}
                              onClick={() => confirmSetAllAttendance(evento, 'ausente')}
                            >
                              {t('markAllAbsent')}
                            </EventActionButton>
                          </HorizontalScrollRow>
                        )}
                        {canManage && (isActive || isEnded) && (
                          <div style={{ marginBottom: '12px', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                            {showingManualAdd ? (
                              <form
                                onSubmit={event => {
                                  event.preventDefault();
                                  saveManualAddMember(evento.id);
                                }}
                              >
                                <h5 style={{ margin: '0 0 8px', fontSize: '13px' }}>{t('addMemberManually')}</h5>
                                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                  {t('manualAddJustificationHint')}
                                </p>
                                {availableManualAddMembers.length === 0 ? (
                                  <p className="text-muted" style={{ margin: 0 }}>{t('manualAddMemberNoneAvailable')}</p>
                                ) : (
                                  <>
                                    <FormField
                                      label={t('clubDirectivaMember')}
                                      htmlFor={`manual-add-member-${evento.id}`}
                                      error={manualAddFieldErrors.miembroId}
                                      required
                                    >
                                      <select
                                        id={`manual-add-member-${evento.id}`}
                                        className="form-input"
                                        value={manualAddForm.miembroId}
                                        onChange={event => setManualAddForm(form => ({ ...form, miembroId: event.target.value }))}
                                      >
                                        <option value="">{t('selectMember')}</option>
                                        {availableManualAddMembers.map(member => (
                                          <option key={member.id} value={member.id}>
                                            {memberDisplayName(member)}
                                          </option>
                                        ))}
                                      </select>
                                    </FormField>
                                    <FormField
                                      label={t('manualAddJustificationLabel')}
                                      htmlFor={`manual-add-just-${evento.id}`}
                                      error={manualAddFieldErrors.justificacion}
                                      required
                                    >
                                      <textarea
                                        id={`manual-add-just-${evento.id}`}
                                        className="form-input"
                                        rows={3}
                                        value={manualAddForm.justificacion}
                                        onChange={event => setManualAddForm(form => ({ ...form, justificacion: event.target.value }))}
                                        placeholder={t('manualAddJustificationPlaceholder')}
                                      />
                                    </FormField>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <button
                                        type="submit"
                                        disabled={savingManualAdd}
                                        style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: savingManualAdd ? 'not-allowed' : 'pointer', opacity: savingManualAdd ? 0.7 : 1 }}
                                      >
                                        ✓ {t('addMemberManually')}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={savingManualAdd}
                                        onClick={closeManualAddMember}
                                        style={{ padding: '8px 16px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: savingManualAdd ? 'not-allowed' : 'pointer' }}
                                      >
                                        {t('cancel')}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </form>
                            ) : (
                              <>
                                <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                  {t('manualAddJustificationHint')}
                                </p>
                                <EventActionButton
                                  tone="info"
                                  onClick={() => openManualAddMember(evento.id)}
                                  disabled={availableManualAddMembers.length === 0}
                                >
                                  ➕ {t('addMemberManually')}
                                </EventActionButton>
                              </>
                            )}
                          </div>
                        )}
                        {canManage && isActive && (
                          <div className="event-checkin-actions event-checkin-actions--inline">
                            <div className="event-start-scan-cta">
                              <p>{t('initializeEventHint')}</p>
                              <EventActionButton
                                tone="primary"
                                onClick={() => initializeEvent(evento.id)}
                                disabled={Boolean(evento.actividad_inicio_at || evento.evento_asistencia_grupo?.actividad_inicio_at) || initializingEventId === evento.id}
                              >
                                ▶ {initializingEventId === evento.id ? t('loading') : t('initializeEvent')}
                              </EventActionButton>
                              {evento.actividad_inicio_at && (
                                <p className="text-muted" style={{ margin: '8px 0 0', fontSize: '13px' }}>
                                  {t('eventInitializedAt')}: {formatEventTimestamp(evento.actividad_inicio_at)}
                                </p>
                              )}
                            </div>
                            <div className="event-start-scan-cta">
                              <p>{t('scanAttendeesHint')}</p>
                              <EventActionButton tone="success" onClick={() => scanAttendees(evento.id)}>
                                ▶ {t('scanAttendees')}
                              </EventActionButton>
                            </div>
                            {canCombineEvent && (
                              <div className="event-start-scan-cta">
                                <p>{t('eventMergeHint')}</p>
                                <EventActionButton tone="info" onClick={() => openMergeAttendance(evento.id)}>
                                  🔗 {t('eventMergeAction')}
                                </EventActionButton>
                              </div>
                            )}
                            {evento.asistencia_grupo_id && (
                              <div className="event-start-scan-cta">
                                <p>{t('eventMergedAttendanceHint')}</p>
                                <EventActionButton tone="warning" onClick={() => unmergeAttendance(evento.id)}>
                                  {t('eventUnmergeAction')}
                                </EventActionButton>
                              </div>
                            )}
                          </div>
                        )}
                        {rows.length === 0 ? (
                          <p className="text-muted" style={{ margin: 0 }}>
                            {needsConfirmation ? t('noMembersAssignedToEvent') : t('eventQrAttendanceEmpty')}
                          </p>
                        ) : (
                          <div className={`event-attendance-list${canManage ? '' : ' event-attendance-list--no-offset'}`}>
                            {rows.map(row => {
                              const checkedInAt = getCheckedInAtFromRow(row);
                              const confirmacion = getConfirmacionFromRow(row);
                              const manualJustification = getManualAddJustificationFromRow(row);
                              const memberName = memberDisplayName(row.miembros);
                              const eventName = evento.nombre || t('eventUntitled');
                              return (
                              <div key={row.id} className="event-attendance-list-item">
                                <div>
                                  <span>{memberDisplayName(row.miembros)}</span>
                                  {manualJustification && (
                                    <div style={{ fontSize: '11px', color: '#854d0e', marginTop: '4px' }}>
                                      {t('manualAddJustificationBadge')}: {manualJustification}
                                    </div>
                                  )}
                                  {checkedInAt && (
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                      {t('checkedInAt')}: {new Date(checkedInAt).toLocaleString()}
                                      <span className="checkin-session-qr-badge">{t('checkinViaQr')}</span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                  {needsConfirmation && (
                                    <div>
                                      <div className="event-attendance-row-label">{t('attendanceConfirmation')}</div>
                                      <ConfirmationControls
                                        eventoMiembroId={row.id}
                                        eventoId={evento.id}
                                        current={confirmacion}
                                        canManage={canManage}
                                        onSet={setConfirmation}
                                        confirmBeforeSet={buildConfirmBeforeConfirmation(eventName, memberName)}
                                        t={t}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <div className="event-attendance-row-label">{t('attendanceList')}</div>
                                    <AttendanceControls
                                      eventoMiembroId={row.id}
                                      eventoId={evento.id}
                                      current={getAsistenciaFromRow(row)}
                                      canManage={canManage}
                                      onSet={setAttendance}
                                      confirmBeforeSet={buildConfirmBeforeAttendance(eventName, memberName)}
                                      t={t}
                                    />
                                  </div>
                                </div>
                              </div>
                            );})}
                          </div>
                        )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
        </div>
      )}
      <EventMergeAttendanceModal
        mergeAnchorEvent={mergeAnchorEvent}
        mergeCandidates={mergeCandidates}
        mergeTargetEventId={mergeTargetEventId}
        setMergeTargetEventId={setMergeTargetEventId}
        mergingAttendance={mergingAttendance}
        confirmMergeAttendance={confirmMergeAttendance}
        closeMergeAttendance={closeMergeAttendance}
        formatEventTime={formatEventTime}
        t={t}
      />
      {confirmDialog}
    </div>
  );
}
