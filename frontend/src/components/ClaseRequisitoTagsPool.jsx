import '../styles/clase-requisito-tags.css';

const DRAG_MIME = 'application/x-clase-requisito-tag';

export function ClaseRequisitoTagChip({
  tag,
  draggable = false,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging = false,
  className = '',
  removeLabel,
}) {
  return (
    <span
      className={`clase-requisito-tag-chip${isDragging ? ' is-dragging' : ''}${className ? ` ${className}` : ''}`}
      draggable={draggable}
      onDragStart={e => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData(DRAG_MIME, tag.id);
        e.dataTransfer.setData('text/plain', tag.nombre);
        onDragStart?.(tag);
      }}
      onDragEnd={onDragEnd}
      title={draggable ? tag.nombre : undefined}
    >
      {tag.nombre}
      {onRemove && (
        <button
          type="button"
          className="clase-requisito-tag-chip__remove"
          aria-label={removeLabel || `Remove ${tag.nombre}`}
          onClick={e => {
            e.stopPropagation();
            onRemove(tag);
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

export default function ClaseRequisitoTagsPool({
  tags = [],
  t,
  newTagName = '',
  onNewTagNameChange,
  onCreateTag,
  onDeleteTag,
  draggingTagId,
  onDragStart,
  onDragEnd,
  missingSchema = false,
}) {
  return (
    <div className="clase-requisito-tags-pool">
      <h4 className="clase-requisito-tags-pool__title">{t('classReqTagPoolTitle')}</h4>
      <p className="clase-requisito-tags-pool__hint">{t('classReqTagPoolHint')}</p>

      {missingSchema && (
        <p className="clase-requisito-tags-pool__empty">{t('classReqTagMissingSchema')}</p>
      )}

      <div className="clase-requisito-tags-pool__chips">
        {!missingSchema && tags.length === 0 && (
          <span className="clase-requisito-tags-pool__empty">{t('classReqTagPoolEmpty')}</span>
        )}
        {tags.map(tag => (
          <ClaseRequisitoTagChip
            key={tag.id}
            tag={tag}
            draggable
            isDragging={draggingTagId === tag.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onRemove={onDeleteTag}
            removeLabel={t('classReqTagDelete')}
          />
        ))}
      </div>

      <div className="clase-requisito-tags-pool__create">
        <input
          type="text"
          className="form-input"
          value={newTagName}
          onChange={e => onNewTagNameChange(e.target.value)}
          placeholder={t('classReqTagNamePlaceholder')}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCreateTag?.();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCreateTag}
          disabled={!newTagName.trim()}
        >
          {t('classReqTagCreate')}
        </button>
      </div>
    </div>
  );
}

export { DRAG_MIME };
