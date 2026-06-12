import { useLanguage } from '../../hooks/useLanguage';
import { attendanceLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import EventCheckinScanner from '../../components/EventCheckinScanner';
import { clubDisplayName } from '../../utils/club';
import '../../styles/form.css';

function AttendanceBadge({ estado, t }) {
  const colors = {
    a_tiempo: { bg: '#dcfce7', color: '#166534' },
    tarde: { bg: '#fef9c3', color: '#854d0e' },
    ausente: { bg: '#fee2e2', color: '#991b1b' },
  };
  const style = colors[estado] || { bg: '#f3f4f6', color: '#4b5563' };

  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {attendanceLabel(estado, t)}
    </span>
  );
}

function AttendanceControls({ eventoMiembroId, eventoId, current, canManage, onSet, t }) {
  if (!canManage) {
    return <AttendanceBadge estado={current} t={t} />;
  }

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {['a_tiempo', 'tarde', 'ausente'].map(estado => (
        <button
          key={estado}
          type="button"
          onClick={() => onSet(eventoMiembroId, estado, eventoId)}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            borderRadius: '4px',
            border: current === estado ? '2px solid #2563eb' : '1px solid #d1d5db',
            backgroundColor: current === estado ? '#dbeafe' : '#fff',
            cursor: 'pointer',
          }}
        >
          {attendanceLabel(estado, t)}
        </button>
      ))}
    </div>
  );
}

export default function EventosView({
  clubs,
  clubId,
  activeClubData,
  events,
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
  createEvent,
  setAttendance,
  setClubId,
  editingAttendeesEventId,
  attendeeEditIds,
  savingAttendees,
  openAttendeeEditor,
  closeAttendeeEditor,
  toggleAttendeeEditSelection,
  selectAllAttendeeEdit,
  saveEventAttendees,
  checkinByScan,
  checkinNotice,
  isEventInFuture,
  getCheckedInAtFromRow,
  getAsistenciaFromRow,
  memberDisplayName,
}) {
  const { t } = useLanguage();
  const assignAll = eventForm.memberAssignmentMode === 'all';

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>📅 {t('events')}</h1>
          {activeClubData && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
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
      {checkinNotice && <div className="alert" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{t(checkinNotice)}</div>}
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
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {!clubId ? (
        <p className="text-muted">{t('selectClubForEvents')}</p>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>{t('clubEventsList')}</h3>
            <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>

          {showForm && canManage && (
            <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0 }}>{t('newEvent')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
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
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('eventDate')}</label>
                  <input
                    type="date"
                    value={eventForm.fecha}
                    onChange={e => setEventForm({ ...eventForm, fecha: e.target.value })}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('eventTime')}</label>
                  <input
                    type="time"
                    value={eventForm.hora}
                    onChange={e => setEventForm({ ...eventForm, hora: e.target.value })}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('eventPlace')}</label>
                  <input
                    type="text"
                    value={eventForm.lugar}
                    onChange={e => setEventForm({ ...eventForm, lugar: e.target.value })}
                    placeholder={t('eventPlace')}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>{t('assignMembersToEvent')}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="memberAssignmentMode"
                      checked={assignAll}
                      onChange={() => setMemberAssignmentMode('all')}
                    />
                    {t('addAllActiveMembers')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="memberAssignmentMode"
                      checked={!assignAll}
                      onChange={() => setMemberAssignmentMode('specific')}
                    />
                    {t('addSpecificMembers')}
                  </label>
                </div>

                {clubMembers.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>{t('noMembersInClub')}</p>
                ) : assignAll ? (
                  <p style={{ color: '#166534', fontSize: '14px', margin: 0, padding: '10px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                    {t('allActiveMembersHint').replace('{count}', String(clubMembers.length))}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                      <button type="button" onClick={selectAllMembers} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
                        {t('selectAll')}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      {clubMembers.map(m => (
                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={eventForm.selectedMemberIds.includes(m.id)}
                            onChange={() => toggleMemberSelection(m.id)}
                          />
                          {memberDisplayName(m)}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button onClick={createEvent} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ✓ {t('save')}
              </button>
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
                const isFuture = isEventInFuture(evento);
                const rows = assignments[evento.id] || [];
                const recordedCount = rows.filter(row => getAsistenciaFromRow(row)).length;

                return (
                  <div key={evento.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', backgroundColor: expanded || editingAttendees ? '#f0f9ff' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong>{evento.nombre || t('eventUntitled')}</strong>
                            {isFuture && (
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
                          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            {evento.fecha} · {String(evento.hora).slice(0, 5)} · {evento.lugar}
                          </div>
                          {expanded && rows.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                              {t('attendanceSummary')
                                .replace('{assigned}', String(rows.length))
                                .replace('{recorded}', String(recordedCount))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                          {canManage && isFuture && (
                            <button
                              type="button"
                              onClick={() => (editingAttendees ? closeAttendeeEditor() : openAttendeeEditor(evento.id))}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: editingAttendees ? '#6b7280' : '#0891b2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              {editingAttendees ? t('cancel') : t('updateAttendees')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleEventExpand(evento.id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              backgroundColor: expanded ? '#6b7280' : '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {expanded ? t('hideAttendanceList') : t('showAttendanceList')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {editingAttendees && canManage && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#fffbeb' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{t('editAttendees')}</h4>
                        {clubMembers.length === 0 ? (
                          <p className="text-muted" style={{ margin: 0 }}>{t('noMembersInClub')}</p>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                              <button type="button" onClick={selectAllAttendeeEdit} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
                                {t('selectAll')}
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px' }}>
                              {clubMembers.map(m => (
                                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                  <input
                                    type="checkbox"
                                    checked={attendeeEditIds.includes(m.id)}
                                    onChange={() => toggleAttendeeEditSelection(m.id)}
                                  />
                                  {memberDisplayName(m)}
                                </label>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => saveEventAttendees(evento.id)}
                              disabled={savingAttendees}
                              style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: savingAttendees ? 'not-allowed' : 'pointer', opacity: savingAttendees ? 0.7 : 1 }}
                            >
                              ✓ {t('saveAttendees')}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {expanded && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{t('attendanceList')}</h4>
                        {canManage && (
                          <EventCheckinScanner
                            eventoId={evento.id}
                            disabled={isFuture}
                            onCheckin={token => checkinByScan(evento.id, token)}
                          />
                        )}
                        {rows.length === 0 ? (
                          <p className="text-muted" style={{ margin: 0 }}>{t('noMembersAssignedToEvent')}</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '10px', marginTop: canManage ? '12px' : 0 }}>
                            {rows.map(row => {
                              const checkedInAt = getCheckedInAtFromRow(row);
                              return (
                              <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <span>{memberDisplayName(row.miembros)}</span>
                                  {checkedInAt && (
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                      {t('checkedInAt')}: {new Date(checkedInAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                <AttendanceControls
                                  eventoMiembroId={row.id}
                                  eventoId={evento.id}
                                  current={getAsistenciaFromRow(row)}
                                  canManage={canManage}
                                  onSet={setAttendance}
                                  t={t}
                                />
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
