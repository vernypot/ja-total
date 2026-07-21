import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import '../styles/eventDescription.css';

export default function EventDescriptionToggle({ description, className = '' }) {
  const { t } = useLanguage();
  const text = description?.trim();
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className={`event-description-toggle ${className}`.trim()}>
      <button
        type="button"
        className="event-description-toggle__btn"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
      >
        {expanded ? t('eventHideDescription') : t('eventShowDescription')}
      </button>
      {expanded && (
        <p className="event-description-toggle__text">{text}</p>
      )}
    </div>
  );
}
