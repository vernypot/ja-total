import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import DatePickerInput from '../../components/DatePickerInput';
import FichaMedicaPrint from '../../components/FichaMedicaPrint';
import { BLOOD_TYPES, RH_FACTORS, isDenominationalInsuranceNearExpiry } from '../models/datosMedicos.model';
import '../../styles/form.css';
import '../../styles/fichaMedica.css';

const FIELDS = [
  { key: 'tipo_sangre', labelKey: 'bloodType', input: 'bloodType' },
  { key: 'factor_rh', labelKey: 'rhFactor', input: 'rhFactor' },
  { key: 'aseguradora', labelKey: 'healthInsurance' },
  { key: 'poliza', labelKey: 'insurancePolicy' },
  { key: 'seguro_denominacional', labelKey: 'denominationalInsurance', input: 'denominationalInsurance', fullWidth: true },
  { key: 'alergias', labelKey: 'allergies', fullWidth: true, multiline: true },
  { key: 'medicamentos', labelKey: 'medications', fullWidth: true, multiline: true },
  { key: 'enfermedades', labelKey: 'medicalConditions', fullWidth: true, multiline: true },
  { key: 'observaciones', labelKey: 'medicalNotes', fullWidth: true, multiline: true },
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function DenominationalInsuranceNotice({ enabled, fecha, t }) {
  let messageKey = null;

  if (!enabled) {
    messageKey = 'denominationalInsurancePending';
  } else if (isDenominationalInsuranceNearExpiry(fecha)) {
    messageKey = 'denominationalInsuranceNearExpiry';
  }

  if (!messageKey) return null;

  return (
    <p
      className="alert alert-warning"
      style={{ margin: '8px 0 0', padding: '8px 10px', fontSize: '13px' }}
    >
      {t(messageKey)}
    </p>
  );
}

function renderFieldInput({ field, form, setForm, editing, data, t }) {
  const { key, input, multiline } = field;

  if (!editing) {
    if (input === 'denominationalInsurance') {
      return (
        <div>
          <div>{data?.seguro_denominacional ? t('yes') : t('no')}</div>
          {data?.seguro_denominacional && data?.seguro_denominacional_fecha && (
            <div style={{ marginTop: '4px', color: 'var(--color-text-muted)' }}>
              {t('denominationalInsuranceDate')}: {data.seguro_denominacional_fecha}
            </div>
          )}
          <DenominationalInsuranceNotice
            enabled={data?.seguro_denominacional}
            fecha={data?.seguro_denominacional_fecha}
            t={t}
          />
        </div>
      );
    }
    return <div style={{ whiteSpace: 'pre-wrap' }}>{data?.[key] || '—'}</div>;
  }

  if (input === 'denominationalInsurance') {
    return (
      <div style={{ display: 'grid', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(form.seguro_denominacional)}
            onChange={e => {
              const checked = e.target.checked;
              setForm(prev => ({
                ...prev,
                seguro_denominacional: checked,
                seguro_denominacional_fecha: checked
                  ? (prev.seguro_denominacional_fecha || todayIsoDate())
                  : '',
              }));
            }}
          />
          <span>{t('denominationalInsurance')}</span>
        </label>
        <label style={{ display: 'grid', gap: '4px' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{t('denominationalInsuranceDate')}</span>
          <DatePickerInput
            value={form.seguro_denominacional_fecha}
            disabled={!form.seguro_denominacional}
            onChange={e => setForm(prev => ({ ...prev, seguro_denominacional_fecha: e.target.value }))}
            className="form-input"
            style={{ margin: 0 }}
          />
        </label>
        <DenominationalInsuranceNotice
          enabled={form.seguro_denominacional}
          fecha={form.seguro_denominacional_fecha}
          t={t}
        />
      </div>
    );
  }

  if (input === 'bloodType') {
    return (
      <select
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="form-input"
        style={{ margin: 0 }}
      >
        <option value="">{t('selectBloodType')}</option>
        {BLOOD_TYPES.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    );
  }

  if (input === 'rhFactor') {
    return (
      <select
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="form-input"
        style={{ margin: 0 }}
      >
        <option value="">{t('selectRhFactor')}</option>
        {RH_FACTORS.map(factor => (
          <option key={factor} value={factor}>{factor}</option>
        ))}
      </select>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="form-input"
        rows={3}
        style={{ margin: 0, resize: 'vertical' }}
      />
    );
  }

  return (
    <input
      value={form[key]}
      onChange={e => setForm({ ...form, [key]: e.target.value })}
      className="form-input"
      style={{ margin: 0 }}
    />
  );
}

export default function DatosMedicosView({
  data,
  member,
  contacts,
  clubs,
  language,
  form,
  setForm,
  editing,
  error,
  saveError,
  loading,
  saving,
  canManage,
  startEdit,
  startAdd,
  cancelEdit,
  save,
  printFicha,
  hasRecord,
}) {
  const { t } = useLanguage();
  const canPrint = Boolean(member);
  const fichaProps = {
    member,
    medical: editing ? form : data,
    contacts,
    clubs,
    language,
    t,
  };

  if (loading) return <div className="loading">{t('loadingData')}</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="ficha-medica-screen" style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <h3 style={{ margin: 0 }}>{t('tabMedicalData')} <PageHelpLink pageId="memberMedical" compact /></h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {canPrint && (
            <button type="button" onClick={printFicha} className="ficha-medica-print-btn no-print">
              🖨 {t('printMedicalRecord')}
            </button>
          )}
          {canManage && !editing && (
            <button type="button" onClick={hasRecord ? startEdit : startAdd} className="btn btn-sm btn-edit no-print">
              {hasRecord ? `✏️ ${t('edit')}` : `➕ ${t('addMedicalData')}`}
            </button>
          )}
        </div>
      </div>

      {canPrint && (
        <p className="ficha-medica-print-hint no-print">{t('medicalRecordPrintHint')}</p>
      )}

      {saveError && <div className="alert alert-error">{saveError}</div>}

      {!hasRecord && !editing ? (
        <p className="text-muted">{t('noMedicalData')}</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {FIELDS.map(field => (
            <div
              key={field.key}
              style={{
                gridColumn: field.fullWidth ? '1 / -1' : undefined,
                padding: '15px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
              }}
            >
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2563eb' }}>
                {t(field.labelKey)}
              </label>
              {renderFieldInput({ field, form, setForm, editing, data, t })}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            ✓ {saving ? t('saving') : t('save')}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-btn-neutral)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            ✕ {t('cancel')}
          </button>
        </div>
      )}

      {canPrint && (
        <div className="ficha-medica-print-source" aria-hidden="true">
          <FichaMedicaPrint {...fichaProps} />
        </div>
      )}
    </div>
  );
}
