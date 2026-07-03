import { useLanguage } from '../hooks/useLanguage';
import { NOTICIA_AUDIENCES, normalizeAudience, audienceRequiresClub } from '../constants/noticiaAudience';

export default function NoticiaAudienceField({ value, clubId, clubs = [], onChange }) {
  const { t } = useLanguage();
  const audience = normalizeAudience(value);

  return (
    <fieldset className="noticia-fieldset">
      <legend>{t('noticiasFieldAudience')}</legend>
      <p className="noticia-fieldset-hint">{t('noticiasFieldAudienceHint')}</p>
      <div className="noticia-choice-grid noticia-choice-grid--stack">
        {NOTICIA_AUDIENCES.map(option => (
          <label
            key={option.id}
            className={`noticia-choice-option${audience === option.id ? ' is-selected' : ''}`}
          >
            <input
              type="radio"
              name="noticia-audience"
              checked={audience === option.id}
              onChange={() => onChange({ audience: option.id, clubId: option.id === 'club' ? clubId : '' })}
            />
            <span>
              <strong className="noticia-choice-option__label">{t(option.labelKey)}</strong>
              <span className="noticia-choice-option__hint">{t(`${option.labelKey}Hint`)}</span>
            </span>
          </label>
        ))}
      </div>
      {audienceRequiresClub(audience) && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{t('noticiasFieldTargetClub')}</span>
          <select
            className="form-input"
            value={clubId || ''}
            onChange={e => onChange({ audience, clubId: e.target.value })}
            style={{ margin: 0, maxWidth: '420px' }}
          >
            <option value="">{t('noticiasFieldTargetClubPlaceholder')}</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id}>{club.nombre}</option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}

export function NoticiaAudienceBadge({ audience, clubName, t }) {
  const key = normalizeAudience(audience);
  const meta = NOTICIA_AUDIENCES.find(a => a.id === key);
  const label = key === 'club' && clubName
    ? `${t(meta?.labelKey || key)} · ${clubName}`
    : t(meta?.labelKey || key);

  return (
    <span className="noticia-audience-badge">
      {label}
    </span>
  );
}
