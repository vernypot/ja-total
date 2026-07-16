import { useState } from 'react';

const DRAG_MEMBER = 'application/x-unidades-miembro';

function MemberChip({ member, memberDisplayName, onDragStart, draggable, onRemove, t, subtitle }) {
  const name = memberDisplayName(member);
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.dataTransfer.setData(DRAG_MEMBER, member.id);
        e.dataTransfer.effectAllowed = 'move';
      } : undefined}
      className={`unidades-chip${draggable ? ' unidades-chip--draggable' : ''}`}
      title={name}
    >
      <div className="unidades-chip__text">
        <span className="unidades-chip__label">{name}</span>
        {subtitle && <span className="unidades-chip__subtitle">{subtitle}</span>}
      </div>
      {onRemove && (
        <button
          type="button"
          className="unidades-chip__remove"
          onClick={() => onRemove()}
          aria-label={t('remove')}
        >
          ×
        </button>
      )}
    </div>
  );
}

function UnidadCard({
  unidad,
  canManage,
  membersById,
  memberDisplayName,
  genderLabel,
  roleLabel,
  roles,
  onEdit,
  onRemove,
  onDropMember,
  onRemoveMember,
  onRoleChange,
  savingUnidadId,
  assigningKey,
  t,
}) {
  const [over, setOver] = useState(false);
  const assignments = unidad.miembro_unidad || [];
  const isSaving = savingUnidadId === unidad.id;
  const isAssigning = Boolean(assigningKey?.startsWith(`${unidad.id}:`));

  function handleDragOver(e) {
    if (!canManage) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOver(true);
  }

  function handleDrop(e) {
    e.preventDefault();
    setOver(false);
    if (!canManage) return;
    const memberId = e.dataTransfer.getData(DRAG_MEMBER);
    if (memberId) onDropMember(unidad.id, memberId);
  }

  return (
    <article
      className={`unidades-card${over ? ' unidades-card--over' : ''}${isAssigning ? ' unidades-card--saving' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <div className="unidades-card__header">
        <div>
          <h3 className="unidades-card__title">{unidad.nombre}</h3>
          <p className="unidades-card__meta">
            {genderLabel(unidad.genero)} · {assignments.length} {t('unidadMembersCount')}
          </p>
          {unidad.descripcion && (
            <p className="unidades-card__description">{unidad.descripcion}</p>
          )}
        </div>
        {canManage && (
          <div className="unidades-card__actions">
            <button type="button" className="btn btn-sm btn-edit" onClick={() => onEdit(unidad)} disabled={isSaving}>
              {t('edit')}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ color: '#b91c1c', border: '1px solid #fecaca', background: '#fff' }}
              onClick={() => onRemove(unidad.id)}
              disabled={isSaving}
            >
              {t('remove')}
            </button>
          </div>
        )}
      </div>

      <div className="unidades-card__members">
        <span className="unidades-field__label">{t('unidadMembersInUnit')}</span>
        <div className="unidades-dropzone unidades-dropzone--embedded">
          {assignments.length === 0 ? (
            <span className="unidades-dropzone__hint">{t('unidadDropHint')}</span>
          ) : (
            <div className="unidades-assignment-list">
              {assignments.map(row => {
                const member = row.miembros || membersById[row.miembro_id];
                if (!member) return null;
                const busy = assigningKey === row.id || assigningKey === `role:${row.id}`;

                return (
                  <div key={row.id} className="unidades-assignment-row">
                    <MemberChip
                      member={member}
                      memberDisplayName={memberDisplayName}
                      draggable={canManage && !busy}
                      t={t}
                    />
                    {canManage ? (
                      <select
                        className="form-input unidades-role-select"
                        value={row.rol || 'miembro'}
                        disabled={busy}
                        onChange={(e) => onRoleChange(row.id, e.target.value)}
                      >
                        {roles.map(rol => (
                          <option key={rol} value={rol}>{roleLabel(rol)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="unidades-role-badge">{roleLabel(row.rol || 'miembro')}</span>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        className="unidades-chip__remove unidades-assignment-remove"
                        onClick={() => onRemoveMember(row.id)}
                        disabled={busy}
                        aria-label={t('remove')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {canManage && assignments.length > 0 && (
            <span className="unidades-dropzone__hint unidades-dropzone__hint--inline">
              {t('unidadDropHint')}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function UnidadesBoard({
  canManage,
  poolMembers,
  unidades,
  membersById,
  memberDisplayName,
  genderLabel,
  roleLabel,
  roles,
  onEditUnidad,
  onRemoveUnidad,
  addMemberToUnidad,
  removeMemberFromUnidad,
  updateMemberRole,
  savingUnidadId,
  assigningKey,
  t,
}) {
  return (
    <div className="unidades-board">
      <section className="unidades-pool">
        <div className="unidades-pool__header">
          <h2 className="unidades-section-title">{t('unidadMemberPool')}</h2>
          <p className="unidades-section-hint">{t('unidadPoolHint')}</p>
        </div>
        <div className="unidades-chip-list unidades-pool__list">
          {poolMembers.length === 0 ? (
            <p className="unidades-empty">{t('unidadNoPoolMembers')}</p>
          ) : (
            poolMembers.map(member => (
              <MemberChip
                key={member.id}
                member={member}
                memberDisplayName={memberDisplayName}
                draggable={canManage}
                subtitle={genderLabel(member.genero) || t('unidadGenderUnknown')}
                t={t}
              />
            ))
          )}
        </div>
      </section>

      <section className="unidades-list">
        <div className="unidades-list__header">
          <div>
            <h2 className="unidades-section-title">{t('unidadListTitle')}</h2>
            <p className="unidades-section-hint">{t('unidadListHint')}</p>
          </div>
        </div>

        {unidades.length === 0 ? (
          <p className="unidades-empty">{t('unidadEmpty')}</p>
        ) : (
          <div className="unidades-list__grid">
            {unidades.map(unidad => (
              <UnidadCard
                key={unidad.id}
                unidad={unidad}
                canManage={canManage}
                membersById={membersById}
                memberDisplayName={memberDisplayName}
                genderLabel={genderLabel}
                roleLabel={roleLabel}
                roles={roles}
                onEdit={onEditUnidad}
                onRemove={onRemoveUnidad}
                onDropMember={addMemberToUnidad}
                onRemoveMember={removeMemberFromUnidad}
                onRoleChange={updateMemberRole}
                savingUnidadId={savingUnidadId}
                assigningKey={assigningKey}
                t={t}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
