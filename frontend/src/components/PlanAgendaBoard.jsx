import { useEffect, useState } from 'react';
import { isMeetingScheduled, normalizeMeetingHora } from '../mvc/models/planificacion.model';

const DRAG_TYPE = 'application/x-plan-requisito';

function requisitoLabel(req) {
  const num = req.numero != null ? `${req.numero}. ` : '';
  const cls = req.clases_progresivas?.nombre || req.clase_requisitos?.clases_progresivas?.nombre;
  return { num, text: req.descripcion, cls };
}

function sectionTitle(seccion) {
  const roman = seccion.numero_romano ? `${seccion.numero_romano}. ` : '';
  return `${roman}${seccion.nombre}`;
}

function RequisitoChip({ req, draggable, onDragStart, onRemove, hideClase = false, t }) {
  const { num, text, cls } = requisitoLabel(req.clase_requisitos || req);
  const requisitoId = req.clase_requisito_id || req.id;

  return (
    <div
      draggable={draggable}
      onDragStart={e => {
        if (!draggable) return;
        e.dataTransfer.setData(DRAG_TYPE, requisitoId);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(requisitoId);
      }}
      style={{
        padding: '6px 8px',
        marginBottom: '6px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        fontSize: '12px',
        cursor: draggable ? 'grab' : 'default',
        lineHeight: 1.35,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'flex-start' }}>
        <span>
          {num && <strong>{num}</strong>}
          {text}
          {!hideClase && cls && (
            <span style={{ display: 'block', fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{cls}</span>
          )}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(requisitoId)}
            style={{
              border: 'none',
              background: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
              padding: 0,
            }}
            title={t('remove')}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function DropZone({ children, onDrop, isActive, minHeight = '80px', style = {} }) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData(DRAG_TYPE);
        if (id) onDrop(id);
      }}
      style={{
        minHeight,
        padding: '8px',
        borderRadius: '6px',
        border: `1px dashed ${over || isActive ? '#2563eb' : '#d1d5db'}`,
        backgroundColor: over ? '#eff6ff' : '#fafafa',
        transition: 'background-color 0.15s',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ClasePoolGroup({
  clase,
  sections,
  ungrouped,
  total,
  canManage,
  onDragStart,
  t,
}) {
  const [expanded, setExpanded] = useState(false);
  let lastParte = null;

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 10px',
          border: 'none',
          background: '#f9fafb',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 700,
          color: '#1e40af',
          textAlign: 'left',
        }}
      >
        <span
          aria-hidden
          style={{
            fontSize: '10px',
            color: '#6b7280',
            width: '12px',
            flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          ▸
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{clase.nombre || t('progressiveClasses')}</span>
        <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '11px', flexShrink: 0 }}>({total})</span>
      </button>

      {expanded && (
        <div style={{ padding: '8px 10px 4px', borderTop: '1px solid #e5e7eb' }}>
          {sections.map(({ seccion, requisitos: sectionReqs }) => {
            const showParte = seccion.parte && seccion.parte !== lastParte;
            lastParte = seccion.parte;

            return (
              <div key={seccion.id} style={{ marginBottom: '10px' }}>
                {showParte && (
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#4338ca',
                    marginBottom: '4px',
                  }}>
                    {seccion.parte === 'avanzado' ? t('classReqPartAdvanced') : t('classReqPartBasic')}
                  </div>
                )}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '4px',
                  paddingBottom: '2px',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  {sectionTitle(seccion)}
                </div>
                {sectionReqs.map(req => (
                  <RequisitoChip
                    key={req.id}
                    req={req}
                    draggable={canManage}
                    onDragStart={onDragStart}
                    hideClase
                    t={t}
                  />
                ))}
              </div>
            );
          })}

          {ungrouped.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '4px',
                paddingBottom: '2px',
                borderBottom: '1px solid #e5e7eb',
              }}>
                {t('uncategorized')}
              </div>
              {ungrouped.map(req => (
                <RequisitoChip
                  key={req.id}
                  req={req}
                  draggable={canManage}
                  onDragStart={onDragStart}
                  hideClase
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnassignedPool({
  groupedUnassignedPool = [],
  unassignedCount = 0,
  canManage,
  draggingId,
  onDropOnPool,
  onDragStart,
  t,
}) {
  return (
    <DropZone onDrop={onDropOnPool} isActive={Boolean(draggingId)}>
      {unassignedCount === 0 ? (
        <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>{t('planAllReqsAssigned')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {groupedUnassignedPool.map(group => (
            <ClasePoolGroup
              key={group.clase.id}
              clase={group.clase}
              sections={group.sections}
              ungrouped={group.ungrouped}
              total={group.total}
              canManage={canManage}
              onDragStart={onDragStart}
              t={t}
            />
          ))}
        </div>
      )}
    </DropZone>
  );
}

function MeetingColumn({
  reunion,
  items,
  canManage,
  tiposEvento,
  defaultClubPlace = '',
  onUpdateMeeting,
  onDrop,
  onUnassign,
  onDragStart,
  t,
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [draft, setDraft] = useState({
    titulo: reunion.titulo || '',
    tipo_evento_id: reunion.tipo_evento_id || '',
    notas: reunion.notas || '',
    fecha: reunion.fecha || '',
    hora: normalizeMeetingHora(reunion.hora),
    lugar: reunion.lugar || '',
  });

  useEffect(() => {
    setDraft({
      titulo: reunion.titulo || '',
      tipo_evento_id: reunion.tipo_evento_id || '',
      notas: reunion.notas || '',
      fecha: reunion.fecha || '',
      hora: normalizeMeetingHora(reunion.hora),
      lugar: reunion.lugar || '',
    });
  }, [
    reunion.id,
    reunion.titulo,
    reunion.tipo_evento_id,
    reunion.notas,
    reunion.fecha,
    reunion.hora,
    reunion.lugar,
  ]);

  const defaultLabel = `${t('planMeeting')} ${reunion.numero}`;
  const displayTitle = reunion.titulo?.trim() || defaultLabel;
  const typeLabel = reunion.tipos_evento?.nombre;
  const isEmpty = items.length === 0;
  const scheduled = isMeetingScheduled(reunion);
  const scheduleLine = reunion.fecha
    ? `${reunion.fecha}${reunion.hora ? ` · ${normalizeMeetingHora(reunion.hora)}` : ''}`
    : '';

  async function handleSaveMeta() {
    setSavingMeta(true);
    const ok = await onUpdateMeeting(reunion.id, {
      titulo: draft.titulo,
      tipoEventoId: draft.tipo_evento_id || null,
      notas: draft.notas,
      fecha: draft.fecha || null,
      hora: draft.hora || null,
      lugar: draft.lugar || null,
    });
    setSavingMeta(false);
    if (ok) setEditing(false);
  }

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 7px',
    fontSize: '11px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    marginBottom: '6px',
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'start',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          backgroundColor: '#f9fafb',
          borderBottom: expanded ? '1px solid #e5e7eb' : 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            aria-expanded={expanded}
            title={expanded ? t('collapse') : t('expand')}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '2px 0',
              fontSize: '10px',
              color: '#6b7280',
              width: '14px',
              flexShrink: 0,
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          >
            ▸
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', lineHeight: 1.35 }}>
              {displayTitle}
              {reunion.titulo?.trim() && reunion.titulo.trim() !== defaultLabel && (
                <span style={{ display: 'block', fontWeight: 400, color: '#9ca3af', fontSize: '10px' }}>
                  {defaultLabel}
                </span>
              )}
            </div>
            {typeLabel && (
              <span style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 500,
                color: '#4338ca',
                backgroundColor: '#eef2ff',
                borderRadius: '999px',
              }}>
                {typeLabel}
              </span>
            )}
            {scheduled && (
              <span style={{
                display: 'inline-block',
                marginTop: '4px',
                marginLeft: typeLabel ? '6px' : 0,
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#166534',
                backgroundColor: '#dcfce7',
                borderRadius: '999px',
              }}>
                {t('planScheduled')} ✓
              </span>
            )}
            {scheduleLine && (
              <span style={{ display: 'block', fontWeight: 500, color: '#374151', fontSize: '11px', marginTop: '4px' }}>
                {scheduleLine}
                {reunion.lugar?.trim() && (
                  <span style={{ display: 'block', color: '#6b7280', fontWeight: 400 }}>{reunion.lugar.trim()}</span>
                )}
              </span>
            )}
            {!expanded && reunion.notas?.trim() && (
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280', lineHeight: 1.35 }}>
                {reunion.notas.trim()}
              </p>
            )}
            <span style={{ display: 'block', fontWeight: 500, color: '#6b7280', fontSize: '10px', marginTop: '4px' }}>
              {items.length} {items.length === 1 ? t('planReqSingular') : t('planReqPlural')}
            </span>
          </div>
          {canManage && expanded && (
            <button
              type="button"
              onClick={() => setEditing(prev => !prev)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#2563eb',
                padding: '2px 4px',
                flexShrink: 0,
              }}
            >
              {editing ? t('cancel') : t('edit')}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {editing && canManage && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                {t('planMeetingDetails')}
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '10px', color: '#9ca3af' }}>{t('planMeetingOptionalHint')}</p>
              <p style={{ margin: '0 0 8px', fontSize: '10px', color: '#6b7280' }}>{t('planScheduleOnSaveHint')}</p>
              <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                {t('name')}
              </label>
              <input
                type="text"
                value={draft.titulo}
                onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))}
                placeholder={defaultLabel}
                style={fieldStyle}
              />
              <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                {t('eventType')}
              </label>
              <select
                value={draft.tipo_evento_id}
                onChange={e => setDraft(d => ({ ...d, tipo_evento_id: e.target.value }))}
                style={fieldStyle}
              >
                <option value="">—</option>
                {tiposEvento.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </select>
              <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                {t('eventDate')}
              </label>
              <input
                type="date"
                value={draft.fecha}
                onChange={e => setDraft(d => ({ ...d, fecha: e.target.value }))}
                style={fieldStyle}
              />
              <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                {t('eventTime')}
              </label>
              <input
                type="time"
                value={draft.hora}
                onChange={e => setDraft(d => ({ ...d, hora: e.target.value }))}
                style={fieldStyle}
              />
              <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                {t('eventPlace')}
              </label>
              <input
                type="text"
                value={draft.lugar}
                onChange={e => setDraft(d => ({ ...d, lugar: e.target.value }))}
                placeholder={defaultClubPlace || t('eventPlace')}
                style={fieldStyle}
              />
              <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                {t('description')}
              </label>
              <textarea
                value={draft.notas}
                onChange={e => setDraft(d => ({ ...d, notas: e.target.value }))}
                rows={2}
                style={{ ...fieldStyle, resize: 'vertical', minHeight: '48px' }}
              />
              <button
                type="button"
                onClick={handleSaveMeta}
                disabled={savingMeta}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: savingMeta ? 'wait' : 'pointer',
                }}
              >
                {savingMeta ? t('loading') : t('save')}
              </button>
            </div>
          )}

          {!editing && reunion.notas?.trim() && (
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6', fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>
              {reunion.notas.trim()}
            </div>
          )}

          <DropZone
            onDrop={onDrop}
            minHeight={isEmpty ? '56px' : 'auto'}
            style={{
              flex: '1 1 auto',
              minHeight: isEmpty ? '56px' : undefined,
              height: 'auto',
              border: 'none',
              borderRadius: 0,
              backgroundColor: 'transparent',
            }}
          >
            {isEmpty ? (
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{t('planDropHere')}</p>
            ) : (
              items.map(item => (
                <RequisitoChip
                  key={item.id}
                  req={item}
                  draggable={canManage}
                  onDragStart={onDragStart}
                  onRemove={canManage ? id => onUnassign(id) : null}
                  t={t}
                />
              ))
            )}
          </DropZone>
        </>
      )}
    </div>
  );
}

export default function PlanAgendaBoard({
  reuniones = [],
  assignmentsByMeeting = {},
  unassignedRequisitos = [],
  groupedUnassignedPool = [],
  canManage = false,
  tiposEvento = [],
  defaultClubPlace = '',
  onAssign,
  onUnassign,
  onUpdateMeeting,
  t,
}) {
  const [draggingId, setDraggingId] = useState('');

  async function handleDropOnMeeting(reunionId, requisitoId) {
    if (!canManage) return;
    const currentMeeting = reuniones.find(r =>
      (assignmentsByMeeting[r.id] || []).some(a => a.clase_requisito_id === requisitoId)
    );
    if (currentMeeting?.id === reunionId) {
      setDraggingId('');
      return;
    }
    await onAssign(reunionId, requisitoId);
    setDraggingId('');
  }

  async function handleDropOnPool(requisitoId) {
    if (!canManage) return;
    const currentMeeting = reuniones.find(r =>
      (assignmentsByMeeting[r.id] || []).some(a => a.clase_requisito_id === requisitoId)
    );
    if (currentMeeting) {
      await onUnassign(currentMeeting.id, requisitoId);
    }
    setDraggingId('');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '16px', marginTop: '12px' }}>
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          {t('planUnassignedReqs')} ({unassignedRequisitos.length})
        </h4>
        <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#6b7280' }}>{t('planGroupedPoolHint')}</p>
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          <UnassignedPool
            groupedUnassignedPool={groupedUnassignedPool}
            unassignedCount={unassignedRequisitos.length}
            canManage={canManage}
            draggingId={draggingId}
            onDropOnPool={handleDropOnPool}
            onDragStart={setDraggingId}
            t={t}
          />
        </div>
        {canManage && (
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#9ca3af' }}>{t('planDragHint')}</p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
          alignItems: 'start',
        }}
      >
        {reuniones.map(reunion => {
          const items = assignmentsByMeeting[reunion.id] || [];
          return (
            <MeetingColumn
              key={reunion.id}
              reunion={reunion}
              items={items}
              canManage={canManage}
              tiposEvento={tiposEvento}
              defaultClubPlace={defaultClubPlace}
              onUpdateMeeting={onUpdateMeeting}
              onDrop={id => handleDropOnMeeting(reunion.id, id)}
              onUnassign={id => onUnassign(reunion.id, id)}
              onDragStart={setDraggingId}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );
}

export { DRAG_TYPE };
