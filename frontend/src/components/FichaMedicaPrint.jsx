import { formatBloodType, memberFullName } from '../mvc/models/carnet.model';
import { getMiembroPhotoDisplayUrl } from '../mvc/models/miembros.model';

function formatDate(value, language = 'es') {
  if (!value) return '—';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPrintedAt(language = 'es') {
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return new Date().toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FieldRow({ label, value, fullWidth = false }) {
  return (
    <div className={`ficha-medica-field${fullWidth ? ' ficha-medica-field-full' : ''}`}>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="ficha-medica-block">
      <h2>{title}</h2>
      <dl className="ficha-medica-grid">{children}</dl>
    </section>
  );
}

export default function FichaMedicaPrint({
  member,
  medical,
  contacts = [],
  clubs = [],
  language = 'es',
  t,
}) {
  const photoUrl = getMiembroPhotoDisplayUrl(member?.foto_url);
  const fullName = memberFullName(member);
  const bloodType = formatBloodType(medical?.tipo_sangre, medical?.factor_rh);
  const activeContacts = contacts.filter(c => (c.estado || 'activo') === 'activo');
  const clubNames = clubs.map(c => c.nombre).filter(Boolean).join(', ');

  return (
    <div className="ficha-medica-sheet">
      <header className="ficha-medica-header">
        <div>
          <p className="ficha-medica-eyebrow">JA Total</p>
          <h1>{t('medicalRecordSheet')}</h1>
        </div>
        <div className="ficha-medica-printed-at">
          {t('printedOn')}: {formatPrintedAt(language)}
        </div>
      </header>

      <div className="ficha-medica-member-row">
        <div className="ficha-medica-photo-wrap">
          {photoUrl ? (
            <img src={photoUrl} alt={fullName} className="ficha-medica-photo" />
          ) : (
            <div className="ficha-medica-photo ficha-medica-photo-empty">👤</div>
          )}
        </div>
        <div className="ficha-medica-member-summary">
          <h2>{fullName || '—'}</h2>
          {clubNames && <p className="ficha-medica-clubs">{clubNames}</p>}
        </div>
      </div>

      <Block title={t('personalData')}>
        <FieldRow label={t('birthDate')} value={formatDate(member?.fecha_nacimiento, language)} />
        <FieldRow label={t('gender')} value={member?.genero} />
        <FieldRow label={t('document')} value={member?.documento} />
        <FieldRow label={t('phone')} value={member?.telefono} />
        <FieldRow label={t('cellphone')} value={member?.celular} />
        <FieldRow label={t('city')} value={member?.ciudad} />
        <FieldRow label={t('address')} value={member?.direccion} fullWidth />
      </Block>

      <Block title={t('tabMedicalData')}>
        <FieldRow label={t('bloodType')} value={medical?.tipo_sangre} />
        <FieldRow label={t('rhFactor')} value={medical?.factor_rh} />
        <FieldRow label={t('bloodTypeFull')} value={bloodType} />
        <FieldRow label={t('healthInsurance')} value={medical?.aseguradora} />
        <FieldRow label={t('insurancePolicy')} value={medical?.poliza} />
        <FieldRow
          label={t('denominationalInsurance')}
          value={
            medical?.seguro_denominacional
              ? `${t('yes')}${medical?.seguro_denominacional_fecha ? ` — ${medical.seguro_denominacional_fecha}` : ''}`
              : t('no')
          }
        />
        <FieldRow label={t('allergies')} value={medical?.alergias} fullWidth />
        <FieldRow label={t('medications')} value={medical?.medicamentos} fullWidth />
        <FieldRow label={t('medicalConditions')} value={medical?.enfermedades} fullWidth />
        <FieldRow label={t('medicalNotes')} value={medical?.observaciones} fullWidth />
      </Block>

      <section className="ficha-medica-block">
        <h2>{t('tabContacts')}</h2>
        {activeContacts.length === 0 ? (
          <p className="ficha-medica-empty">{t('noContacts')}</p>
        ) : (
          <table className="ficha-medica-contacts">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('phone')}</th>
                <th>{t('relationship')}</th>
              </tr>
            </thead>
            <tbody>
              {activeContacts.map(contact => (
                <tr key={contact.id}>
                  <td>{contact.nombre || '—'}</td>
                  <td>{contact.telefono || '—'}</td>
                  <td>{contact.relacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="ficha-medica-footer">
        <p>{t('medicalRecordFooter')}</p>
      </footer>
    </div>
  );
}
