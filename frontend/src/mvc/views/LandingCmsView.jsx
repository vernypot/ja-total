import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{label}</label>
      {children}
    </div>
  );
}

function BilingualFields({ form, setForm, fields, t }) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {fields.map(({ key, labelKey, multiline = false }) => (
        <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label={`${t(labelKey)} (${t('spanish')})`}>
            {multiline ? (
              <textarea
                value={form[`${key}_es`] || ''}
                onChange={e => setForm({ ...form, [`${key}_es`]: e.target.value })}
                className="form-input"
                rows={3}
                style={{ margin: 0, width: '100%' }}
              />
            ) : (
              <input
                type="text"
                value={form[`${key}_es`] || ''}
                onChange={e => setForm({ ...form, [`${key}_es`]: e.target.value })}
                className="form-input"
                style={{ margin: 0, width: '100%' }}
              />
            )}
          </Field>
          <Field label={`${t(labelKey)} (${t('english')})`}>
            {multiline ? (
              <textarea
                value={form[`${key}_en`] || ''}
                onChange={e => setForm({ ...form, [`${key}_en`]: e.target.value })}
                className="form-input"
                rows={3}
                style={{ margin: 0, width: '100%' }}
              />
            ) : (
              <input
                type="text"
                value={form[`${key}_en`] || ''}
                onChange={e => setForm({ ...form, [`${key}_en`]: e.target.value })}
                className="form-input"
                style={{ margin: 0, width: '100%' }}
              />
            )}
          </Field>
        </div>
      ))}
    </div>
  );
}

function ItemFormFields({ itemForm, updateItemContent, updateItemStyle, updateItemField, t }) {
  if (!itemForm) return null;
  const type = itemForm.item_type;

  const textFields = [];
  if (type === 'slide') {
    textFields.push('eyebrow', 'title', 'text');
  } else if (type === 'hero_card' || type === 'program') {
    textFields.push('title', 'text');
  } else if (type === 'stat') {
    textFields.push('value', 'label');
  } else if (type === 'event') {
    textFields.push('date', 'time', 'title', 'place');
  } else if (type === 'news') {
    textFields.push('date', 'category', 'title', 'excerpt');
  } else if (type === 'contact') {
    textFields.push('email', 'phone');
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {textFields.map(field => (
        <div key={field} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label={`${field} (${t('spanish')})`}>
            {field === 'excerpt' || field === 'text' ? (
              <textarea
                value={itemForm.content_es?.[field] || ''}
                onChange={e => updateItemContent('es', field, e.target.value)}
                className="form-input"
                rows={3}
                style={{ margin: 0, width: '100%' }}
              />
            ) : (
              <input
                type="text"
                value={itemForm.content_es?.[field] || ''}
                onChange={e => updateItemContent('es', field, e.target.value)}
                className="form-input"
                style={{ margin: 0, width: '100%' }}
              />
            )}
          </Field>
          <Field label={`${field} (${t('english')})`}>
            {field === 'excerpt' || field === 'text' ? (
              <textarea
                value={itemForm.content_en?.[field] || ''}
                onChange={e => updateItemContent('en', field, e.target.value)}
                className="form-input"
                rows={3}
                style={{ margin: 0, width: '100%' }}
              />
            ) : (
              <input
                type="text"
                value={itemForm.content_en?.[field] || ''}
                onChange={e => updateItemContent('en', field, e.target.value)}
                className="form-input"
                style={{ margin: 0, width: '100%' }}
              />
            )}
          </Field>
        </div>
      ))}

      {(type === 'program' || type === 'hero_card') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label={t('landingItemIcon')}>
            <select
              value={itemForm.style_json?.icon || 'pathfinders'}
              onChange={e => updateItemStyle('icon', e.target.value)}
              className="form-input"
              style={{ margin: 0, width: '100%' }}
            >
              <option value="ministerios">All ministries</option>
              <option value="pathfinders">Pathfinders</option>
              <option value="adventurers">Adventurers</option>
              <option value="masterguide">Guías Mayores</option>
            </select>
          </Field>
          {type === 'hero_card' && <div />}
        </div>
      )}

      {type === 'slide' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label={t('landingItemScreenshot')}>
            <select
              value={itemForm.style_json?.screenshot || 'members'}
              onChange={e => updateItemStyle('screenshot', e.target.value)}
              className="form-input"
              style={{ margin: 0, width: '100%' }}
            >
              <option value="members">Members</option>
              <option value="progress">Classes & progress</option>
              <option value="carnets">Events & ID cards</option>
            </select>
          </Field>
          {type === 'slide' && (
            <Field label={t('landingItemAccent')}>
              <select
                value={itemForm.style_json?.accent || 'gold'}
                onChange={e => updateItemStyle('accent', e.target.value)}
                className="form-input"
                style={{ margin: 0, width: '100%' }}
              >
                <option value="gold">Gold</option>
                <option value="teal">Teal</option>
                <option value="navy">Navy</option>
              </select>
            </Field>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <Field label={t('order')}>
          <input
            type="number"
            value={itemForm.orden || 0}
            onChange={e => updateItemField('orden', Number(e.target.value))}
            className="form-input"
            style={{ margin: 0, width: '100%' }}
          />
        </Field>
        <Field label={t('status')}>
          <select
            value={itemForm.estado || 'activo'}
            onChange={e => updateItemField('estado', e.target.value)}
            className="form-input"
            style={{ margin: 0, width: '100%' }}
          >
            <option value="activo">{t('active')}</option>
            <option value="inactivo">{t('inactive')}</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function RowActions({ actions, disabled = false }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {actions.map(action => (
        <button
          key={action.key}
          type="button"
          title={action.title}
          disabled={disabled || action.disabled}
          onClick={action.onClick}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            backgroundColor: action.tone === 'danger' ? '#fee2e2' : action.tone === 'success' ? '#dcfce7' : '#fff',
            color: action.tone === 'danger' ? '#991b1b' : action.tone === 'success' ? '#166534' : '#111',
            cursor: disabled || action.disabled ? 'not-allowed' : 'pointer',
            opacity: disabled || action.disabled ? 0.5 : 1,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function itemPreviewLabel(item) {
  return item.content_es?.title
    || item.content_es?.value
    || item.content_es?.date
    || item.content_es?.email
    || item.content_es?.eyebrow
    || '—';
}

export default function LandingCmsView({
  canManage,
  activeTab,
  setActiveTab,
  sections,
  items,
  settings,
  selectedSectionKey,
  sectionForm,
  setSectionForm,
  itemForm,
  setItemForm,
  showSectionForm,
  showItemForm,
  loading,
  saving,
  error,
  notice,
  hasTable,
  themeFields,
  sectionLabels,
  itemTypes,
  selectSection,
  openNewSectionForm,
  openEditSection,
  saveSection,
  removeSection,
  toggleSectionVisibility,
  moveSection,
  reindexSections,
  openNewItemForm,
  openEditItem,
  updateItemContent,
  updateItemStyle,
  updateItemField,
  saveItem,
  removeItem,
  toggleItemVisibility,
  moveItem,
  reindexItems,
  saveTheme,
  updateThemeField,
  updateSectionStyle,
  setShowSectionForm,
  setShowItemForm,
}) {
  const { t } = useLanguage();

  if (!canManage) {
    return <div className="container"><div className="alert alert-error">{t('accessDenied')}</div></div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🌐 {t('landingCmsTitle')} <PageHelpLink pageId="landingCms" /></h1>
          <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)' }}>{t('landingCmsHint')}</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="landing-btn landing-btn-primary" style={{ textDecoration: 'none' }}>
          {t('landingPreview')}
        </a>
      </div>

      {!hasTable && (
        <div className="alert alert-error">{t('landingCmsSchemaMissing')}</div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{t(notice)}</div>}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['sections', 'theme'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === tab ? '#2563eb' : '#e5e7eb',
              color: activeTab === tab ? '#fff' : '#111',
              fontWeight: 'bold',
            }}
          >
            {tab === 'sections' ? t('landingCmsSectionsTab') : t('landingCmsThemeTab')}
          </button>
        ))}
      </div>

      {activeTab === 'theme' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('landingCmsThemeTab')}</h3>
          {loading ? (
            <p>{t('loading')}</p>
          ) : !settings ? (
            <p className="text-muted">{t('landingCmsNoSettings')}</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {themeFields.map(({ key, labelKey }) => (
                  <Field key={key} label={t(labelKey)}>
                    {key.includes('color') ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="color"
                          value={settings[key] || '#000000'}
                          onChange={e => updateThemeField(key, e.target.value)}
                          style={{ width: '48px', height: '38px', border: 'none', background: 'none' }}
                        />
                        <input
                          type="text"
                          value={settings[key] || ''}
                          onChange={e => updateThemeField(key, e.target.value)}
                          className="form-input"
                          style={{ margin: 0, flex: 1 }}
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={settings[key] || ''}
                        onChange={e => updateThemeField(key, e.target.value)}
                        className="form-input"
                        style={{ margin: 0, width: '100%' }}
                      />
                    )}
                  </Field>
                ))}
              </div>
              <button
                type="button"
                onClick={saveTheme}
                disabled={saving}
                style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                ✓ {t('save')}
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === 'sections' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', alignItems: 'start' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{t('landingCmsSectionsTab')}</h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" onClick={reindexSections} disabled={saving} style={{ fontSize: '12px' }}>
                  ↕ {t('landingReindex')}
                </button>
                <button type="button" onClick={openNewSectionForm} style={{ fontSize: '12px' }}>➕ {t('add')}</button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {sections.map((section, index) => {
                const selected = selectedSectionKey === section.section_key;
                return (
                  <div
                    key={section.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: selected ? '2px solid #2563eb' : '1px solid #e5e7eb',
                      backgroundColor: selected ? '#eff6ff' : '#fff',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => selectSection(section.section_key)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{sectionLabels[section.section_key] || section.section_key}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        #{section.orden} · {section.visible ? t('visible') : t('hidden')} · {section.estado}
                      </div>
                    </button>
                    <div style={{ marginTop: '8px' }}>
                      <RowActions
                        disabled={saving}
                        actions={[
                          { key: 'up', label: '↑', title: t('moveUp'), disabled: index === 0, onClick: () => moveSection(section.id, 'up') },
                          { key: 'down', label: '↓', title: t('moveDown'), disabled: index === sections.length - 1, onClick: () => moveSection(section.id, 'down') },
                          { key: 'toggle', label: section.visible ? t('hide') : t('show'), title: section.visible ? t('hide') : t('show'), onClick: () => toggleSectionVisibility(section) },
                          { key: 'edit', label: `✏️ ${t('edit')}`, title: t('edit'), onClick: () => openEditSection(section) },
                          { key: 'delete', label: `🗑 ${t('delete')}`, title: t('delete'), tone: 'danger', onClick: () => removeSection(section.id) },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>{sectionLabels[selectedSectionKey] || selectedSectionKey}</h3>
                <button type="button" onClick={() => setShowSectionForm(true)}>✏️ {t('edit')}</button>
              </div>

              {showSectionForm ? (
                <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <BilingualFields
                    form={sectionForm}
                    setForm={setSectionForm}
                    fields={[
                      { key: 'eyebrow', labelKey: 'landingFieldEyebrow' },
                      { key: 'title', labelKey: 'landingFieldTitle' },
                      { key: 'body', labelKey: 'landingFieldBody', multiline: true },
                      { key: 'cta_text', labelKey: 'landingFieldCta' },
                    ]}
                    t={t}
                  />

                  {!sectionForm.id && (
                    <div style={{ marginTop: '12px' }}>
                      <Field label={t('key')}>
                        <input
                          type="text"
                          value={sectionForm.section_key || ''}
                          onChange={e => setSectionForm({ ...sectionForm, section_key: e.target.value })}
                          className="form-input"
                          style={{ margin: 0, width: '100%' }}
                        />
                      </Field>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' }}>
                    <Field label={t('landingFieldAnchor')}>
                      <input type="text" value={sectionForm.anchor_id || ''} onChange={e => setSectionForm({ ...sectionForm, anchor_id: e.target.value })} className="form-input" style={{ margin: 0, width: '100%' }} />
                    </Field>
                    <Field label={t('order')}>
                      <input type="number" value={sectionForm.orden || 0} onChange={e => setSectionForm({ ...sectionForm, orden: Number(e.target.value) })} className="form-input" style={{ margin: 0, width: '100%' }} />
                    </Field>
                    <Field label={t('status')}>
                      <select value={sectionForm.estado || 'activo'} onChange={e => setSectionForm({ ...sectionForm, estado: e.target.value })} className="form-input" style={{ margin: 0, width: '100%' }}>
                        <option value="activo">{t('active')}</option>
                        <option value="inactivo">{t('inactive')}</option>
                      </select>
                    </Field>
                    <Field label={t('visible')}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={Boolean(sectionForm.visible)} onChange={e => setSectionForm({ ...sectionForm, visible: e.target.checked })} />
                        {t('landingSectionVisible')}
                      </label>
                    </Field>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                    <Field label={t('landingSectionBg')}>
                      <input type="color" value={sectionForm.style_json?.background_color || '#ffffff'} onChange={e => updateSectionStyle('background_color', e.target.value)} style={{ width: '100%', height: '38px' }} />
                    </Field>
                    <Field label={t('landingSectionTextColor')}>
                      <input type="color" value={sectionForm.style_json?.text_color || '#334155'} onChange={e => updateSectionStyle('text_color', e.target.value)} style={{ width: '100%', height: '38px' }} />
                    </Field>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={saveSection} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px' }}>✓ {t('save')}</button>
                    <button type="button" onClick={() => setShowSectionForm(false)} style={{ padding: '8px 16px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px' }}>✕ {t('cancel')}</button>
                    {sectionForm.id && (
                      <button type="button" onClick={() => removeSection(sectionForm.id)} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px' }}>🗑️ {t('delete')}</button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted">{t('landingCmsSectionHint')}</p>
              )}
            </div>

            {itemTypes.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0 }}>{t('landingCmsItemsTitle')}</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={reindexItems} disabled={saving || items.length === 0} style={{ padding: '6px 10px', fontSize: '12px' }}>
                      ↕ {t('landingReindex')}
                    </button>
                    {itemTypes.map(type => (
                      <button key={type} type="button" onClick={() => openNewItemForm(type)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                        ➕ {type}
                      </button>
                    ))}
                  </div>
                </div>

                {showItemForm && itemForm && (
                  <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '16px' }}>
                    <h4 style={{ marginTop: 0 }}>{itemForm.id ? t('edit') : t('add')} · {itemForm.item_type}</h4>
                    <ItemFormFields
                      itemForm={itemForm}
                      updateItemContent={updateItemContent}
                      updateItemStyle={updateItemStyle}
                      updateItemField={updateItemField}
                      t={t}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={saveItem} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px' }}>✓ {t('save')}</button>
                      <button type="button" onClick={() => { setShowItemForm(false); setItemForm(null); }} style={{ padding: '8px 16px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px' }}>✕ {t('cancel')}</button>
                      {itemForm.id && (
                        <button type="button" onClick={() => removeItem(itemForm.id)} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px' }}>🗑 {t('delete')}</button>
                      )}
                    </div>
                  </div>
                )}

                {loading ? (
                  <p>{t('loading')}</p>
                ) : items.length === 0 ? (
                  <p className="text-muted">{t('landingCmsNoItems')}</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {items.map((item, index) => (
                      <div key={item.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', opacity: item.estado === 'activo' ? 1 : 0.65 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong>{item.item_type}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>#{item.orden}</span>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor: item.estado === 'activo' ? '#dcfce7' : '#f3f4f6',
                                color: item.estado === 'activo' ? '#166534' : '#6b7280',
                              }}>
                                {item.estado === 'activo' ? t('visible') : t('hidden')}
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#374151', marginTop: '6px' }}>
                              {itemPreviewLabel(item)}
                            </div>
                          </div>
                          <RowActions
                            disabled={saving}
                            actions={[
                              { key: 'up', label: '↑', title: t('moveUp'), disabled: index === 0, onClick: () => moveItem(item.id, 'up') },
                              { key: 'down', label: '↓', title: t('moveDown'), disabled: index === items.length - 1, onClick: () => moveItem(item.id, 'down') },
                              { key: 'toggle', label: item.estado === 'activo' ? t('hide') : t('show'), title: item.estado === 'activo' ? t('hide') : t('show'), onClick: () => toggleItemVisibility(item) },
                              { key: 'edit', label: `✏️ ${t('edit')}`, title: t('edit'), onClick: () => openEditItem(item) },
                              { key: 'delete', label: `🗑 ${t('delete')}`, title: t('delete'), tone: 'danger', onClick: () => removeItem(item.id) },
                            ]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
