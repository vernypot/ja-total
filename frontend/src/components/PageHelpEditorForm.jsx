import { useEffect, useState } from 'react';
import { contentToForm, formToContent } from '../mvc/models/pageHelp.model';

const emptyField = () => ({ name: '', description: '' });

export default function PageHelpEditorForm({
  initialContent,
  onSave,
  onCancel,
  onReset,
  saving = false,
  resetting = false,
  canReset = false,
  t,
}) {
  const [form, setForm] = useState(() => contentToForm(initialContent));
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(contentToForm(initialContent));
    setError('');
  }, [initialContent]);

  function updateField(index, key, value) {
    setForm(current => ({
      ...current,
      fields: current.fields.map((field, i) =>
        i === index ? { ...field, [key]: value } : field
      ),
    }));
  }

  function addField() {
    setForm(current => ({ ...current, fields: [...current.fields, emptyField()] }));
  }

  function removeField(index) {
    setForm(current => ({
      ...current,
      fields: current.fields.length <= 1
        ? [emptyField()]
        : current.fields.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const content = formToContent(form);
    if (!content?.title?.trim()) {
      setError(t('pageHelpTitleRequired'));
      return;
    }
    if (!content?.overview?.trim()) {
      setError(t('pageHelpOverviewRequired'));
      return;
    }
    await onSave(content);
  }

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '4px',
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '12px' }}>
          {error}
        </div>
      )}

      <label style={{ ...labelStyle, marginBottom: '10px' }}>
        {t('pageHelpFieldTitle')}
        <input
          type="text"
          value={form.title}
          onChange={e => setForm(current => ({ ...current, title: e.target.value }))}
          className="form-input"
          style={{ ...fieldStyle, marginTop: '4px' }}
          required
        />
      </label>

      <label style={{ ...labelStyle, marginBottom: '10px' }}>
        {t('pageHelpOverview')}
        <textarea
          value={form.overview}
          onChange={e => setForm(current => ({ ...current, overview: e.target.value }))}
          rows={4}
          className="form-input"
          style={{ ...fieldStyle, marginTop: '4px', resize: 'vertical' }}
          required
        />
      </label>

      <label style={{ ...labelStyle, marginBottom: '10px' }}>
        {t('pageHelpSteps')}
        <span style={{ display: 'block', fontWeight: 400, color: '#6b7280', marginBottom: '4px' }}>
          {t('pageHelpOneLineHint')}
        </span>
        <textarea
          value={form.stepsText}
          onChange={e => setForm(current => ({ ...current, stepsText: e.target.value }))}
          rows={5}
          className="form-input"
          style={{ ...fieldStyle, marginTop: '4px', resize: 'vertical' }}
        />
      </label>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ ...labelStyle, marginBottom: '6px' }}>{t('pageHelpFields')}</div>
        {form.fields.map((field, index) => (
          <div
            key={`field-${index}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.4fr auto',
              gap: '8px',
              marginBottom: '8px',
              alignItems: 'start',
            }}
          >
            <input
              type="text"
              value={field.name}
              onChange={e => updateField(index, 'name', e.target.value)}
              placeholder={t('pageHelpFieldName')}
              className="form-input"
              style={fieldStyle}
            />
            <input
              type="text"
              value={field.description}
              onChange={e => updateField(index, 'description', e.target.value)}
              placeholder={t('pageHelpFieldDescription')}
              className="form-input"
              style={fieldStyle}
            />
            <button
              type="button"
              onClick={() => removeField(index)}
              style={{
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
              }}
              title={t('remove')}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addField}
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            border: '1px dashed #93c5fd',
            borderRadius: '6px',
            background: '#eff6ff',
            color: '#1d4ed8',
            cursor: 'pointer',
          }}
        >
          + {t('pageHelpAddField')}
        </button>
      </div>

      <label style={{ ...labelStyle, marginBottom: '12px' }}>
        {t('pageHelpTips')}
        <span style={{ display: 'block', fontWeight: 400, color: '#6b7280', marginBottom: '4px' }}>
          {t('pageHelpOneLineHint')}
        </span>
        <textarea
          value={form.tipsText}
          onChange={e => setForm(current => ({ ...current, tipsText: e.target.value }))}
          rows={4}
          className="form-input"
          style={{ ...fieldStyle, marginTop: '4px', resize: 'vertical' }}
        />
      </label>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {canReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={resetting || saving}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              background: '#fff',
              color: '#b91c1c',
              cursor: resetting || saving ? 'wait' : 'pointer',
            }}
          >
            {resetting ? t('loading') : t('pageHelpResetDefault')}
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || resetting}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={saving || resetting}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '6px',
            background: '#2563eb',
            color: '#fff',
            cursor: saving || resetting ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
