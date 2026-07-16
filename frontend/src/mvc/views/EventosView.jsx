import { useLanguage } from '../../hooks/useLanguage';
import ListSearchInput from '../../components/ListSearchInput';
import FormField from '../../components/FormField';
import { PageHelpLink } from '../../components/PageHelp';
import {
  AttendanceControls,
  ConfirmationControls,
  EventActionButton,
} from '../../components/EventAttendanceControls';
import { clubDisplayName } from '../../utils/club';
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
  };
  const style = styles[estado] || styles.inactivo;
  const labels = {
    cancelado: t('eventStatusCancelled'),
    inactivo: t('eventStatusInactive'),
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

function EventDetailsFields({ eventForm, setEventForm, tiposEvento, fieldErrors = {}, t }) {
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
        <input
          id="event-fecha"
          type="date"
          value={eventForm.fecha}
          onChange={e => setEventForm({ ...eventForm, fecha: e.target.value })}
          className="form-input"
          style={{ margin: 0 }}
          aria-invalid={Boolean(fieldErrors.fecha)}
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

export default function EventosView({
  clubs,
  clubId,
  activeClubData,
  events,
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
  startEvent,
  sortEventAttendanceRows,
  isEventInFuture,
  getCheckedInAtFromRow,
  getAsistenciaFromRow,
  getConfirmacionFromRow,
  eventRequiresConfirmation,
  getTipoEventoNombre,
  memberDisplayName,
}) {
  const { t } = useLanguage();

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
                const isActive = !evento.estado || evento.estado === 'activo';
                const rows = sortEventAttendanceRows(assignments[evento.id] || []);
                const recordedCount = rows.filter(row => getAsistenciaFromRow(row)).length;
                const confirmedCount = rows.filter(row => getConfirmacionFromRow(row) === 'confirmado').length;
                const tipoNombre = getTipoEventoNombre(evento);
                const needsConfirmation = eventRequiresConfirmation(evento);

                return (
                  <div key={evento.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', opacity: isActive ? 1 : 0.85 }}>
                    <div style={{ padding: '14px 16px', backgroundColor: expanded || editingAttendees || isEditing ? '#f0f9ff' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {evento.fecha} · {String(evento.hora).slice(0, 5)} · {evento.lugar}
                            {tipoNombre && <> · {tipoNombre}</>}
                          </div>
                          {needsConfirmation && (
                            <div style={{ fontSize: '12px', color: '#854d0e', marginTop: '4px' }}>
                              {t('eventRequiresConfirmationBadge')}
                              {assignments[evento.id] && rows.length > 0 && (
                                <> · {t('confirmationSummary').replace('{confirmed}', String(confirmedCount)).replace('{assigned}', String(rows.length))}</>
                              )}
                            </div>
                          )}
                          {!needsConfirmation && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                              {rows.length > 0
                                ? t('attendanceSummary')
                                  .replace('{assigned}', String(rows.length))
                                  .replace('{recorded}', String(recordedCount))
                                : t('eventQrAttendanceHint')}
                            </div>
                          )}
                          {needsConfirmation && assignments[evento.id] && rows.length > 0 && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                              {t('attendanceSummary')
                                .replace('{assigned}', String(rows.length))
                                .replace('{recorded}', String(recordedCount))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                          {canManage && (
                            <>
                              {isActive && (
                                <EventActionButton
                                  tone="success"
                                  onClick={() => startEvent(evento.id)}
                                >
                                  ▶ {t('startEvent')}
                                </EventActionButton>
                              )}
                              <EventActionButton
                                tone={isEditing ? 'muted' : 'primary'}
                                onClick={() => (isEditing ? closeEditForm() : openEditForm(evento))}
                              >
                                {isEditing ? t('cancel') : `✏️ ${t('edit')}`}
                              </EventActionButton>
                              <EventActionButton
                                tone={expanded ? 'muted' : 'info'}
                                onClick={() => toggleEventExpand(evento.id)}
                              >
                                {expanded ? t('hideAttendanceList') : t('manageAttendance')}
                              </EventActionButton>
                              {isActive && (
                                <>
                                  <EventActionButton tone="warning" onClick={() => cancelEvent(evento.id)}>
                                    {t('cancelEvent')}
                                  </EventActionButton>
                                  <EventActionButton tone="danger" onClick={() => deactivateEvent(evento.id)}>
                                    {t('deactivate')}
                                  </EventActionButton>
                                </>
                              )}
                              {!isActive && (
                                <EventActionButton tone="success" onClick={() => reactivateEvent(evento.id)}>
                                  {t('activate')}
                                </EventActionButton>
                              )}
                              {isFuture && needsConfirmation && isActive && (
                                <EventActionButton
                                  tone={editingAttendees ? 'muted' : 'info'}
                                  onClick={() => (editingAttendees ? closeAttendeeEditor() : openAttendeeEditor(evento.id))}
                                >
                                  {editingAttendees ? t('cancel') : t('updateAttendees')}
                                </EventActionButton>
                              )}
                            </>
                          )}
                          {!canManage && (
                            <EventActionButton
                              tone={expanded ? 'muted' : 'primary'}
                              onClick={() => toggleEventExpand(evento.id)}
                            >
                              {expanded ? t('hideAttendanceList') : t('showAttendanceList')}
                            </EventActionButton>
                          )}
                        </div>
                      </div>
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
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                          {canManage ? t('manageAttendance') : t('attendanceList')}
                        </h4>
                        {canManage && (
                          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                            {needsConfirmation ? t('manageAttendanceHint') : t('manageAttendanceQrHint')}
                          </p>
                        )}
                        {canManage && rows.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {needsConfirmation && (
                              <EventActionButton
                                tone="success"
                                disabled={bulkUpdatingEventId === evento.id}
                                onClick={() => confirmAllPending(evento.id)}
                              >
                                {t('confirmAllPending')}
                              </EventActionButton>
                            )}
                            <EventActionButton
                              tone="info"
                              disabled={bulkUpdatingEventId === evento.id}
                              onClick={() => setAllAttendance(evento.id, 'a_tiempo')}
                            >
                              {t('markAllOnTime')}
                            </EventActionButton>
                            <EventActionButton
                              tone="danger"
                              disabled={bulkUpdatingEventId === evento.id}
                              onClick={() => setAllAttendance(evento.id, 'ausente')}
                            >
                              {t('markAllAbsent')}
                            </EventActionButton>
                          </div>
                        )}
                        {canManage && isActive && (
                          <div className="event-start-scan-cta">
                            <p>{t('startEventScanHint')}</p>
                            <EventActionButton tone="success" onClick={() => startEvent(evento.id)}>
                              ▶ {t('startEvent')}
                            </EventActionButton>
                          </div>
                        )}
                        {rows.length === 0 ? (
                          <p className="text-muted" style={{ margin: 0 }}>
                            {needsConfirmation ? t('noMembersAssignedToEvent') : t('eventQrAttendanceEmpty')}
                          </p>
                        ) : (
                          <div style={{ display: 'grid', gap: '10px', marginTop: canManage ? '12px' : 0 }}>
                            {rows.map(row => {
                              const checkedInAt = getCheckedInAtFromRow(row);
                              const confirmacion = getConfirmacionFromRow(row);
                              return (
                              <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <span>{memberDisplayName(row.miembros)}</span>
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
                                      t={t}
                                    />
                                  </div>
                                </div>
                              </div>
                            );})}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
