import {
  groupRequisitosBySeccion,
  nextRequisitoNumero,
} from '../mvc/models/clases.model';

const btnSmall = {
  padding: '2px 8px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  flexShrink: 0,
};

function sectionTitle(seccion) {
  const roman = seccion.numero_romano ? `${seccion.numero_romano}. ` : '';
  return `${roman}${seccion.nombre}`;
}

function RequisitoRow({
  req,
  secciones,
  t,
  editingRequisitoId,
  requisitoDraft,
  setRequisitoDraft,
  startEditRequisito,
  cancelEditRequisito,
  saveRequisito,
  removeRequisito,
}) {
  const isEditing = editingRequisitoId === req.id;

  if (isEditing) {
    return (
      <li style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '8px', marginBottom: '8px' }}>
          <label style={{ fontSize: '11px' }}>
            {t('classReqNumber')}
            <input
              type="number"
              min="1"
              value={requisitoDraft.numero}
              onChange={e => setRequisitoDraft(d => ({ ...d, numero: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqSection')}
            <select
              value={requisitoDraft.seccion_id}
              onChange={e => setRequisitoDraft(d => ({ ...d, seccion_id: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            >
              <option value="">{t('uncategorized')}</option>
              {secciones.map(s => (
                <option key={s.id} value={s.id}>{sectionTitle(s)}</option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px' }}>
          {t('requirementDescription')}
          <textarea
            value={requisitoDraft.descripcion}
            onChange={e => setRequisitoDraft(d => ({ ...d, descripcion: e.target.value }))}
            className="form-input"
            rows={2}
            style={{ margin: '4px 0 0', width: '100%', fontSize: '12px' }}
          />
        </label>
        <details style={{ marginBottom: '8px' }}>
          <summary style={{ fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            {t('requirementOptionalText')}
          </summary>
          <textarea
            value={requisitoDraft.texto_opcional}
            onChange={e => setRequisitoDraft(d => ({ ...d, texto_opcional: e.target.value }))}
            className="form-input"
            rows={2}
            placeholder={t('requirementOptionalTextPlaceholder')}
            style={{ margin: '6px 0 0', width: '100%', fontSize: '12px' }}
          />
        </details>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '8px' }}>
          {t('classReqExpectedSessions')}
          <input
            type="number"
            min={0}
            max={10}
            value={requisitoDraft.sesiones_esperadas}
            onChange={e => setRequisitoDraft(d => ({ ...d, sesiones_esperadas: e.target.value }))}
            className="form-input"
            style={{ margin: '4px 0 0', width: '72px', fontSize: '12px' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={saveRequisito} style={{ ...btnSmall, backgroundColor: '#16a34a', color: 'white' }}>
            ✓ {t('save')}
          </button>
          <button type="button" onClick={cancelEditRequisito} style={{ ...btnSmall, backgroundColor: 'var(--color-btn-neutral)', color: 'white' }}>
            ✕ {t('cancel')}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
      <span>
        {req.numero != null && <strong>{req.numero}. </strong>}
        {req.descripcion}
        {req.texto_opcional?.trim() && (
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
            {req.texto_opcional}
          </span>
        )}
        <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {req.sesiones_esperadas ?? 3} {t('planSessionsShort')} ({t('planSessionsExpected')})
        </span>
      </span>
      <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => startEditRequisito(req)}
          style={{ ...btnSmall, backgroundColor: '#2563eb', color: 'white' }}
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={() => removeRequisito(req.id)}
          style={{ ...btnSmall, backgroundColor: '#dc2626', color: 'white' }}
        >
          ✕
        </button>
      </span>
    </li>
  );
}

export default function ClaseRequisitosEditor({
  requisitos = [],
  secciones = [],
  t,
  newRequisitoForm,
  setNewRequisitoForm,
  newSeccionForm,
  setNewSeccionForm,
  editingRequisitoId,
  requisitoDraft,
  setRequisitoDraft,
  editingSeccionId,
  seccionDraft,
  setSeccionDraft,
  addRequisito,
  addSeccion,
  startEditRequisito,
  cancelEditRequisito,
  saveRequisito,
  removeRequisito,
  startEditSeccion,
  cancelEditSeccion,
  saveSeccion,
  removeSeccion,
}) {
  const { grouped, ungrouped } = groupRequisitosBySeccion(requisitos, secciones, {
    includeEmptySections: true,
  });

  const suggestNumero = newRequisitoForm.seccion_id
    ? nextRequisitoNumero(requisitos, newRequisitoForm.seccion_id)
    : '';

  return (
    <div style={{ display: 'grid', gap: '14px', marginTop: '8px' }}>
      {grouped.length === 0 && ungrouped.length === 0 && (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('noRequirements')}</p>
      )}

      {grouped.map(({ seccion, requisitos: sectionReqs }) => {
        const isEditingSection = editingSeccionId === seccion.id;
        return (
          <div key={seccion.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
            {isEditingSection ? (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr 72px', gap: '8px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>
                    {t('classReqPart')}
                    <select
                      value={seccionDraft.parte}
                      onChange={e => setSeccionDraft(d => ({ ...d, parte: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                    >
                      <option value="basico">{t('classReqPartBasicShort')}</option>
                      <option value="avanzado">{t('classReqPartAdvancedShort')}</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '11px' }}>
                    {t('classReqSectionRoman')}
                    <input
                      value={seccionDraft.numero_romano}
                      onChange={e => setSeccionDraft(d => ({ ...d, numero_romano: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                      placeholder="I"
                    />
                  </label>
                  <label style={{ fontSize: '11px' }}>
                    {t('sectionName')}
                    <input
                      value={seccionDraft.nombre}
                      onChange={e => setSeccionDraft(d => ({ ...d, nombre: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px' }}>
                    {t('classReqOrder')}
                    <input
                      type="number"
                      min="1"
                      value={seccionDraft.orden}
                      onChange={e => setSeccionDraft(d => ({ ...d, orden: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={saveSeccion} style={{ ...btnSmall, padding: '4px 10px', backgroundColor: '#16a34a', color: 'white' }}>
                    ✓ {t('save')}
                  </button>
                  <button type="button" onClick={cancelEditSeccion} style={{ ...btnSmall, padding: '4px 10px', backgroundColor: 'var(--color-btn-neutral)', color: 'white' }}>
                    ✕ {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase' }}>
                    {seccion.parte === 'avanzado' ? t('classReqPartAdvanced') : t('classReqPartBasic')}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>
                    {sectionTitle(seccion)}
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9ca3af' }}>
                      ({t('classReqOrder')}: {seccion.orden ?? '—'})
                    </span>
                  </div>
                </div>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" onClick={() => startEditSeccion(seccion)} style={{ ...btnSmall, backgroundColor: '#2563eb', color: 'white' }}>
                    ✏️
                  </button>
                  <button type="button" onClick={() => removeSeccion(seccion.id)} style={{ ...btnSmall, backgroundColor: '#dc2626', color: 'white' }}>
                    ✕
                  </button>
                </span>
              </div>
            )}

            {sectionReqs.length === 0 ? (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>{t('noRequirements')}</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#4b5563' }}>
                {sectionReqs.map(req => (
                  <RequisitoRow
                    key={req.id}
                    req={req}
                    secciones={secciones}
                    t={t}
                    editingRequisitoId={editingRequisitoId}
                    requisitoDraft={requisitoDraft}
                    setRequisitoDraft={setRequisitoDraft}
                    startEditRequisito={startEditRequisito}
                    cancelEditRequisito={cancelEditRequisito}
                    saveRequisito={saveRequisito}
                    removeRequisito={removeRequisito}
                  />
                ))}
              </ol>
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div style={{ border: '1px dashed #d1d5db', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>{t('uncategorized')}</div>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            {ungrouped.map(req => (
              <RequisitoRow
                key={req.id}
                req={req}
                secciones={secciones}
                t={t}
                editingRequisitoId={editingRequisitoId}
                requisitoDraft={requisitoDraft}
                setRequisitoDraft={setRequisitoDraft}
                startEditRequisito={startEditRequisito}
                cancelEditRequisito={cancelEditRequisito}
                saveRequisito={saveRequisito}
                removeRequisito={removeRequisito}
              />
            ))}
          </ol>
        </div>
      )}

      <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <strong style={{ fontSize: '12px' }}>➕ {t('addRequirement')}</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '8px', marginTop: '8px' }}>
          <label style={{ fontSize: '11px' }}>
            {t('classReqNumber')}
            <input
              type="number"
              min="1"
              value={newRequisitoForm.numero}
              onChange={e => setNewRequisitoForm(f => ({ ...f, numero: e.target.value }))}
              placeholder={String(suggestNumero || '')}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqSection')}
            <select
              value={newRequisitoForm.seccion_id}
              onChange={e => {
                const seccionId = e.target.value;
                setNewRequisitoForm(f => ({
                  ...f,
                  seccion_id: seccionId,
                  numero: seccionId ? String(nextRequisitoNumero(requisitos, seccionId)) : f.numero,
                }));
              }}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            >
              <option value="">{t('uncategorized')}</option>
              {secciones.map(s => (
                <option key={s.id} value={s.id}>{sectionTitle(s)}</option>
              ))}
            </select>
          </label>
        </div>
        <input
          value={newRequisitoForm.descripcion}
          onChange={e => setNewRequisitoForm(f => ({ ...f, descripcion: e.target.value }))}
          placeholder={t('requirementDescription')}
          className="form-input"
          style={{ margin: '8px 0 0', width: '100%', fontSize: '12px' }}
        />
        <details style={{ marginTop: '8px' }}>
          <summary style={{ fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            {t('requirementOptionalText')}
          </summary>
          <input
            value={newRequisitoForm.texto_opcional}
            onChange={e => setNewRequisitoForm(f => ({ ...f, texto_opcional: e.target.value }))}
            placeholder={t('requirementOptionalTextPlaceholder')}
            className="form-input"
            style={{ margin: '6px 0 0', width: '100%', fontSize: '12px' }}
          />
        </details>
        <label style={{ display: 'block', fontSize: '11px', marginTop: '8px' }}>
          {t('classReqExpectedSessions')}
          <input
            type="number"
            min={0}
            max={10}
            value={newRequisitoForm.sesiones_esperadas}
            onChange={e => setNewRequisitoForm(f => ({ ...f, sesiones_esperadas: e.target.value }))}
            className="form-input"
            style={{ margin: '4px 0 0', width: '72px', fontSize: '12px' }}
          />
        </label>
        <button
          type="button"
          onClick={addRequisito}
          style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          ➕ {t('addRequirement')}
        </button>
      </div>

      <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
        <strong style={{ fontSize: '12px' }}>➕ {t('addSection')}</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr 72px', gap: '8px', marginTop: '8px' }}>
          <label style={{ fontSize: '11px' }}>
            {t('classReqPart')}
            <select
              value={newSeccionForm.parte}
              onChange={e => setNewSeccionForm(f => ({ ...f, parte: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            >
              <option value="basico">{t('classReqPartBasicShort')}</option>
              <option value="avanzado">{t('classReqPartAdvancedShort')}</option>
            </select>
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqSectionRoman')}
            <input
              value={newSeccionForm.numero_romano}
              onChange={e => setNewSeccionForm(f => ({ ...f, numero_romano: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
              placeholder="VIII"
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('sectionName')}
            <input
              value={newSeccionForm.nombre}
              onChange={e => setNewSeccionForm(f => ({ ...f, nombre: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqOrder')}
            <input
              type="number"
              min="1"
              value={newSeccionForm.orden}
              onChange={e => setNewSeccionForm(f => ({ ...f, orden: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addSeccion}
          style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          ➕ {t('addSection')}
        </button>
      </div>
    </div>
  );
}
