import { useLanguage } from '../hooks/useLanguage';
import { NOTICIA_PLACEMENTS, normalizePlacements, togglePlacement } from '../constants/noticiaPlacements';

export default function NoticiaPlacementsField({ value, onChange }) {
  const { t } = useLanguage();
  const selected = normalizePlacements(value);

  return (
    <fieldset className="noticia-fieldset">
      <legend>{t('noticiasFieldPlacements')}</legend>
      <p className="noticia-fieldset-hint">{t('noticiasFieldPlacementsHint')}</p>
      <div className="noticia-choice-grid">
        {NOTICIA_PLACEMENTS.map(placement => (
          <label
            key={placement.id}
            className={`noticia-choice-option${selected.includes(placement.id) ? ' is-selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(placement.id)}
              onChange={() => onChange(togglePlacement(selected, placement.id))}
            />
            <span>
              <strong className="noticia-choice-option__label">{t(placement.labelKey)}</strong>
              <span className="noticia-choice-option__hint">{t(`${placement.labelKey}Hint`)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NoticiaPlacementBadges({ placements, t }) {
  const selected = normalizePlacements(placements);
  return (
    <>
      {selected.map(id => {
        const meta = NOTICIA_PLACEMENTS.find(p => p.id === id);
        return (
          <span key={id} className="noticia-placement-badge">
            {t(meta?.labelKey || id)}
          </span>
        );
      })}
    </>
  );
}
