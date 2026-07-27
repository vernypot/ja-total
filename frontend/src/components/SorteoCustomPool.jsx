import { useMemo, useState } from 'react';
import { memberDisplayName } from '../utils/memberDisplayName';

const DRAG_MEMBER = 'application/x-sorteos-miembro';

function PoolChip({ member, draggable, onRemove, t }) {
  const name = memberDisplayName(member);
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (event) => {
        event.dataTransfer.setData(DRAG_MEMBER, member.id);
        event.dataTransfer.effectAllowed = 'move';
      } : undefined}
      className={`sorteo-pool-chip${draggable ? ' sorteo-pool-chip--draggable' : ''}`}
      title={name}
    >
      <span>{name}</span>
      {onRemove && (
        <button type="button" className="sorteo-pool-chip__remove" onClick={() => onRemove(member.id)} aria-label={t('remove')}>
          ×
        </button>
      )}
    </div>
  );
}

export default function SorteoCustomPool({
  poolMembers,
  selectedIds,
  onAdd,
  onRemove,
  searchQuery,
  setSearchQuery,
  t,
}) {
  const [over, setOver] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const membersById = useMemo(
    () => new Map(poolMembers.map(member => [member.id, member])),
    [poolMembers]
  );

  const availableMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return poolMembers.filter(member => {
      if (selectedSet.has(member.id)) return false;
      if (!q) return true;
      return memberDisplayName(member).toLowerCase().includes(q);
    });
  }, [poolMembers, selectedSet, searchQuery]);

  const selectedMembers = selectedIds
    .map(id => membersById.get(id))
    .filter(Boolean);

  return (
    <div className="sorteo-custom-pool">
      <div className="sorteo-custom-pool__column">
        <div className="sorteo-custom-pool__header">
          <h4>{t('sorteoPoolAvailable')}</h4>
          <input
            type="search"
            className="form-input"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={t('search')}
          />
        </div>
        <div className="sorteo-custom-pool__list">
          {availableMembers.map(member => (
            <button
              key={member.id}
              type="button"
              className="sorteo-pool-add-btn"
              onClick={() => onAdd(member.id)}
            >
              + {memberDisplayName(member)}
            </button>
          ))}
          {availableMembers.length === 0 && (
            <p className="text-muted">{t('sorteoPoolEmpty')}</p>
          )}
        </div>
      </div>

      <div
        className={`sorteo-custom-pool__column sorteo-custom-pool__selected${over ? ' sorteo-custom-pool__selected--over' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const memberId = event.dataTransfer.getData(DRAG_MEMBER);
          if (memberId) onAdd(memberId);
        }}
      >
        <div className="sorteo-custom-pool__header">
          <h4>{t('sorteoPoolSelected')}</h4>
          <span className="text-muted">{selectedMembers.length}</span>
        </div>
        <div className="sorteo-custom-pool__list sorteo-custom-pool__list--chips">
          {selectedMembers.map(member => (
            <PoolChip key={member.id} member={member} draggable onRemove={onRemove} t={t} />
          ))}
          {selectedMembers.length === 0 && (
            <p className="text-muted">{t('sorteoPoolDropHint')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
