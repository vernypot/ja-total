import FormField from './FormField';
import { EVENTO_ASISTENCIA_ITEM_TIPO } from '../constants/eventoAsistenciaItems';
import {
  createPresetAsistenciaItem,
  normalizeAsistenciaItem,
} from '../utils/eventoAsistenciaItems';
import '../styles/eventAsistenciaItems.css';

function updateItem(items, itemId, patch) {
  return items.map(item => (item.id === itemId ? { ...item, ...patch } : item));
}

export default function EventAsistenciaItemsEditor({
  items = [],
  onChange,
  t,
  disabled = false,
  title,
}) {
  function setItems(next) {
    onChange?.(next);
  }

  function addPreset(tipo) {
    setItems([
      ...items,
      createPresetAsistenciaItem(tipo, { t, orden: items.length }),
    ]);
  }

  function removeItem(itemId) {
    setItems(items.filter(item => item.id !== itemId));
  }

  function patchItem(itemId, patch) {
    setItems(updateItem(items, itemId, patch));
  }

  return (
    <section className="event-asistencia-items">
      <h5 className="form-section-title">{title || t('eventAttendeeItemsSection')}</h5>
      <p className="text-muted event-asistencia-items__hint">{t('eventAttendeeItemsHint')}</p>

      {items.length === 0 ? (
        <p className="text-muted event-asistencia-items__empty">{t('eventAttendeeItemsEmpty')}</p>
      ) : (
        <ul className="event-asistencia-items__list">
          {items.map(item => {
            const normalized = normalizeAsistenciaItem(item);
            const isCustom = normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.PERSONALIZADO;
            return (
              <li key={item.id} className="event-asistencia-items__row">
                <div className="event-asistencia-items__fields">
                  {isCustom ? (
                    <FormField label={t('eventAttendeeItemLabel')} htmlFor={`item-label-${item.id}`}>
                      <input
                        id={`item-label-${item.id}`}
                        type="text"
                        className="form-input"
                        value={normalized.etiqueta}
                        disabled={disabled}
                        placeholder={t('eventAttendeeItemLabelPlaceholder')}
                        onChange={e => patchItem(item.id, { etiqueta: e.target.value })}
                      />
                    </FormField>
                  ) : (
                    <div className="event-asistencia-items__preset-label">
                      <span className="event-asistencia-items__preset-badge">
                        {normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.CUOTA
                          ? t('eventItemCuota')
                          : t('eventItemBible')}
                      </span>
                    </div>
                  )}
                  <FormField
                    label={t('eventAttendeeItemDetail')}
                    htmlFor={`item-detail-${item.id}`}
                  >
                    <input
                      id={`item-detail-${item.id}`}
                      type="text"
                      className="form-input"
                      value={normalized.detalle}
                      disabled={disabled}
                      placeholder={t('eventAttendeeItemDetailPlaceholder')}
                      onChange={e => patchItem(item.id, { detalle: e.target.value })}
                    />
                  </FormField>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    className="event-asistencia-items__remove"
                    onClick={() => removeItem(item.id)}
                    aria-label={t('remove')}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!disabled && (
        <div className="event-asistencia-items__actions">
          <button
            type="button"
            className="event-asistencia-items__add-btn"
            onClick={() => addPreset(EVENTO_ASISTENCIA_ITEM_TIPO.CUOTA)}
          >
            + {t('eventAddItemCuota')}
          </button>
          <button
            type="button"
            className="event-asistencia-items__add-btn"
            onClick={() => addPreset(EVENTO_ASISTENCIA_ITEM_TIPO.BIBLIA)}
          >
            + {t('eventAddItemBible')}
          </button>
          <button
            type="button"
            className="event-asistencia-items__add-btn event-asistencia-items__add-btn--custom"
            onClick={() => addPreset(EVENTO_ASISTENCIA_ITEM_TIPO.PERSONALIZADO)}
          >
            + {t('eventAddItemCustom')}
          </button>
        </div>
      )}
    </section>
  );
}

export function EventAsistenciaItemsList({ items = [], t, className = '' }) {
  if (!items.length) return null;

  return (
    <ul className={`event-asistencia-items__read-list ${className}`.trim()}>
      {items.map(item => {
        const normalized = normalizeAsistenciaItem(item);
        const label = normalized.etiqueta
          || (normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.CUOTA
            ? t('eventItemCuota')
            : normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.BIBLIA
              ? t('eventItemBible')
              : t('eventAttendeeItemLabel'));
        return (
          <li key={item.id || `${label}-${normalized.orden}`}>
            <strong>{label}</strong>
            {normalized.detalle ? `: ${normalized.detalle}` : ''}
          </li>
        );
      })}
    </ul>
  );
}
