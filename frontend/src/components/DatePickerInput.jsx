import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../hooks/useLanguage';
import {
  buildCalendarCells,
  dateFromKey,
  isValidDateKey,
  safeLocaleDateString,
  toDateKey,
} from '../utils/calendar';
import '../styles/datePicker.css';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function viewDateFromValue(value) {
  if (isValidDateKey(value)) return dateFromKey(value);
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export default function DatePickerInput({
  id: idProp,
  value = '',
  onChange,
  className = 'form-input',
  style,
  disabled = false,
  required = false,
  min,
  max,
  placeholder = '',
  'aria-invalid': ariaInvalid,
}) {
  const { t, language } = useLanguage();
  const autoId = useId();
  const id = idProp || autoId;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => viewDateFromValue(value));

  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const todayKey = toDateKey(new Date());
  const monthLabel = safeLocaleDateString(viewDate, locale, { month: 'long', year: 'numeric' });
  const cells = buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth());

  useEffect(() => {
    if (open) setViewDate(viewDateFromValue(value));
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function isDisabledKey(dateKey) {
    if (!dateKey) return true;
    if (min && dateKey < min) return true;
    if (max && dateKey > max) return true;
    return false;
  }

  function handleSelect(dateKey) {
    if (isDisabledKey(dateKey)) return;
    onChange?.({ target: { value: dateKey } });
    setOpen(false);
  }

  function closeModal() {
    setOpen(false);
  }

  function goToPreviousMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function goToToday() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    handleSelect(todayKey);
  }

  const displayValue = isValidDateKey(value)
    ? safeLocaleDateString(dateFromKey(value), locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : '';

  return (
    <div className="date-picker">
      <button
        type="button"
        id={id}
        className={`date-picker-trigger ${className}`.trim()}
        style={style}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={ariaInvalid || undefined}
        aria-required={required || undefined}
        onClick={() => {
          if (!disabled) setOpen(isOpen => !isOpen);
        }}
      >
        <span className={displayValue ? '' : 'date-picker-trigger__placeholder'}>
          {displayValue || placeholder || t('select')}
        </span>
      </button>

      {open && createPortal(
        <div className="date-picker-overlay" onClick={closeModal} role="presentation">
          <div
            className="date-picker-modal"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-month-label`}
          >
            <div className="date-picker-modal-top">
              <div id={`${id}-month-label`} className="date-picker-month-label">
                {monthLabel}
              </div>
              <button
                type="button"
                className="date-picker-close-btn"
                onClick={closeModal}
                aria-label={t('close')}
              >
                ✕
              </button>
            </div>

            <div className="date-picker-header">
              <button type="button" className="date-picker-nav-btn" onClick={goToPreviousMonth} aria-label={t('calendarPreviousMonth')}>
                ←
              </button>
              <span className="date-picker-header-spacer" aria-hidden />
              <button type="button" className="date-picker-nav-btn" onClick={goToNextMonth} aria-label={t('calendarNextMonth')}>
                →
              </button>
            </div>

            <div className="date-picker-weekdays">
              {WEEKDAY_KEYS.map(key => (
                <div key={key} className="date-picker-weekday">
                  {t(`weekday${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                </div>
              ))}
            </div>

            <div className="date-picker-grid">
              {cells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="date-picker-day date-picker-day--empty" aria-hidden />;
                }

                const dateKey = toDateKey(date);
                const isSelected = value === dateKey;
                const isToday = dateKey === todayKey;
                const isDisabled = isDisabledKey(dateKey);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={[
                      'date-picker-day',
                      isSelected ? 'date-picker-day--selected' : '',
                      isToday ? 'date-picker-day--today' : '',
                      isDisabled ? 'date-picker-day--disabled' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => handleSelect(dateKey)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="date-picker-footer">
              <button type="button" className="date-picker-today-btn" onClick={goToToday}>
                {t('today')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
