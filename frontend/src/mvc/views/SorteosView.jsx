import { useState } from 'react';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import FormField from '../../components/FormField';
import SorteoCustomPool from '../../components/SorteoCustomPool';
import { PageHelpLink } from '../../components/PageHelp';
import { SORTEO_TIPO, SORTEO_ESTADO } from '../../constants/sorteoTypes';
import '../../styles/sorteos.css';

function SorteoTypeBadge({ tipo, t }) {
  const labels = {
    [SORTEO_TIPO.ASISTENCIA_EVENTO]: t('sorteoTypeAttendance'),
    [SORTEO_TIPO.LOGIN_PERIODO]: t('sorteoTypeLogin'),
    [SORTEO_TIPO.NOTICIA_LEIDA]: t('sorteoTypeNewsRead'),
    [SORTEO_TIPO.PERSONALIZADO]: t('sorteoTypeCustom'),
  };
  return <span className="sorteo-type-badge">{labels[tipo] || tipo}</span>;
}

function SorteoStatusBadge({ estado, t }) {
  const closed = estado === SORTEO_ESTADO.CERRADO;
  return (
    <span className={`sorteo-status-badge${closed ? ' sorteo-status-badge--closed' : ''}`}>
      {closed ? t('sorteoStatusClosed') : t('sorteoStatusOpen')}
    </span>
  );
}

function formatDateTime(iso, language) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString(language);
}

export default function SorteosView({
  canManage,
  iglesiaNombre,
  items,
  listPagination,
  clubs,
  events,
  noticias,
  poolMembers,
  loading,
  saving,
  previewLoading,
  error,
  fieldErrors,
  showForm,
  openCreateForm,
  closeCreateForm,
  form,
  setForm,
  preview,
  searchQuery,
  setSearchQuery,
  handleSave,
  expandedId,
  openDetail,
  detail,
  detailLoading,
  closeForm,
  setCloseForm,
  closing,
  handleCloseSorteo,
  copyParticipantList,
  copyNotice,
  addManualMember,
  removeManualMember,
  sorteoParticipantName,
  t,
  language,
}) {
  const [poolSearch, setPoolSearch] = useState('');

  if (!canManage) {
    return (
      <div className="container">
        <div className="alert alert-warning">{t('sorteoNoPermission')}</div>
      </div>
    );
  }

  const detailSorteo = detail?.sorteo;
  const detailParticipants = detail?.participantes || [];
  const detailWinners = detail?.ganadores || [];
  const isClosed = detailSorteo?.estado === SORTEO_ESTADO.CERRADO;

  return (
    <div className="container sorteos-page">
      <div className="page-header">
        <div>
          <h1>🎟️ {t('sorteosTitle')} <PageHelpLink pageId="sorteos" /></h1>
          <p className="text-muted sorteos-subtitle">
            {t('sorteosSubtitle')}
            {iglesiaNombre ? ` · ${iglesiaNombre}` : ''}
          </p>
        </div>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            ➕ {t('sorteoNew')}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {copyNotice && <div className="alert alert-success">{copyNotice}</div>}

      {showForm && (
        <div className="card sorteo-form-card">
          <h3>{t('sorteoNew')}</h3>
          <form onSubmit={handleSave} className="sorteo-form">
            <div className="sorteo-form-grid">
              <FormField label={t('sorteoTitleLabel')} htmlFor="sorteo-titulo" error={fieldErrors.titulo} required>
                <input
                  id="sorteo-titulo"
                  className="form-input"
                  value={form.titulo}
                  onChange={event => setForm({ ...form, titulo: event.target.value })}
                />
              </FormField>

              <FormField label={t('sorteoWinnerCountLabel')} htmlFor="sorteo-ganadores" error={fieldErrors.cantidad_ganadores} required>
                <input
                  id="sorteo-ganadores"
                  type="number"
                  min={1}
                  className="form-input"
                  value={form.cantidad_ganadores}
                  onChange={event => setForm({ ...form, cantidad_ganadores: event.target.value })}
                />
              </FormField>

              <FormField label={t('sorteoTypeLabel')} htmlFor="sorteo-tipo" error={fieldErrors.tipo} required>
                <select
                  id="sorteo-tipo"
                  className="form-input"
                  value={form.tipo}
                  onChange={event => setForm({ ...form, tipo: event.target.value, manualMemberIds: [] })}
                >
                  <option value={SORTEO_TIPO.ASISTENCIA_EVENTO}>{t('sorteoTypeAttendance')}</option>
                  <option value={SORTEO_TIPO.LOGIN_PERIODO}>{t('sorteoTypeLogin')}</option>
                  <option value={SORTEO_TIPO.NOTICIA_LEIDA}>{t('sorteoTypeNewsRead')}</option>
                  <option value={SORTEO_TIPO.PERSONALIZADO}>{t('sorteoTypeCustom')}</option>
                </select>
              </FormField>

              <FormField label={t('description')} htmlFor="sorteo-desc">
                <textarea
                  id="sorteo-desc"
                  className="form-input"
                  rows={2}
                  value={form.descripcion}
                  onChange={event => setForm({ ...form, descripcion: event.target.value })}
                />
              </FormField>
            </div>

            {form.tipo === SORTEO_TIPO.ASISTENCIA_EVENTO && (
              <FormField label={t('events')} htmlFor="sorteo-evento" error={fieldErrors.evento_id} required>
                <select
                  id="sorteo-evento"
                  className="form-input"
                  value={form.evento_id}
                  onChange={event => setForm({ ...form, evento_id: event.target.value })}
                >
                  <option value="">{t('sorteoSelectEvent')}</option>
                  {events.map(evento => (
                    <option key={evento.id} value={evento.id}>
                      {evento.nombre || t('eventUntitled')} · {evento.fecha} · {evento.club_nombre}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {form.tipo === SORTEO_TIPO.LOGIN_PERIODO && (
              <div className="sorteo-form-grid">
                <FormField label={t('sorteoLoginFrom')} htmlFor="sorteo-login-desde" error={fieldErrors.login_desde_local} required>
                  <input
                    id="sorteo-login-desde"
                    type="datetime-local"
                    className="form-input"
                    value={form.login_desde_local}
                    onChange={event => setForm({ ...form, login_desde_local: event.target.value })}
                  />
                </FormField>
                <FormField label={t('sorteoLoginTo')} htmlFor="sorteo-login-hasta" error={fieldErrors.login_hasta_local} required>
                  <input
                    id="sorteo-login-hasta"
                    type="datetime-local"
                    className="form-input"
                    value={form.login_hasta_local}
                    onChange={event => setForm({ ...form, login_hasta_local: event.target.value })}
                  />
                </FormField>
              </div>
            )}

            {form.tipo === SORTEO_TIPO.NOTICIA_LEIDA && (
              <FormField label={t('noticias')} htmlFor="sorteo-noticia" error={fieldErrors.noticia_id} required>
                <select
                  id="sorteo-noticia"
                  className="form-input"
                  value={form.noticia_id}
                  onChange={event => setForm({ ...form, noticia_id: event.target.value })}
                >
                  <option value="">{t('sorteoSelectNews')}</option>
                  {noticias.map(noticia => (
                    <option key={noticia.id} value={noticia.id}>
                      {(noticia.titulo || '').replace(/<[^>]+>/g, '') || t('eventUntitled')} · {noticia.publicado_en}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {form.tipo === SORTEO_TIPO.PERSONALIZADO && (
              <>
                <FormField label={t('clubLabel')} htmlFor="sorteo-club">
                  <select
                    id="sorteo-club"
                    className="form-input"
                    value={form.club_id}
                    onChange={event => setForm({ ...form, club_id: event.target.value, manualMemberIds: [] })}
                  >
                    <option value="">{t('sorteoAllClubs')}</option>
                    {clubs.map(club => (
                      <option key={club.id} value={club.id}>{club.nombre}</option>
                    ))}
                  </select>
                </FormField>
                {fieldErrors.manualMemberIds && (
                  <div className="form-error">{t(fieldErrors.manualMemberIds)}</div>
                )}
                <SorteoCustomPool
                  poolMembers={poolMembers}
                  selectedIds={form.manualMemberIds}
                  onAdd={addManualMember}
                  onRemove={removeManualMember}
                  searchQuery={poolSearch}
                  setSearchQuery={setPoolSearch}
                  t={t}
                />
              </>
            )}

            <div className="sorteo-preview-banner">
              <strong>{t('sorteoEligibleCount')}:</strong>{' '}
              {previewLoading ? t('loading') : String(preview.count ?? 0)}
              <span className="text-muted"> · {t('sorteoWinnerCountHint').replace('{count}', String(form.cantidad_ganadores || 1))}</span>
            </div>

            <div className="sorteo-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? t('loading') : t('sorteoCreateAndList')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeCreateForm} disabled={saving}>
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sorteos-toolbar">
        <ListSearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('search')} />
      </div>

      {loading ? (
        <div className="loading">{t('sorteosLoading')}</div>
      ) : items.length === 0 ? (
        <p className="text-muted">{t('sorteosEmpty')}</p>
      ) : (
        <div className="sorteos-list">
          {items.map(item => (
            <article key={item.id} className="card sorteo-card">
              <div className="sorteo-card__header">
                <div>
                  <div className="sorteo-card__title-row">
                    <strong>{item.titulo}</strong>
                    <SorteoTypeBadge tipo={item.tipo} t={t} />
                    <SorteoStatusBadge estado={item.estado} t={t} />
                  </div>
                  <div className="text-muted sorteo-card__meta">
                    {t('sorteoEligibleCount')}: {item.participant_count ?? 0}
                    {' · '}
                    {t('sorteoWinnerCountLabel')}: {item.cantidad_ganadores ?? 1}
                    {item.evento_nombre && <> · {item.evento_nombre} ({item.evento_fecha})</>}
                  </div>
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => openDetail(item.id)}>
                  {expandedId === item.id ? t('sorteoHideDetail') : t('sorteoViewDetail')}
                </button>
              </div>

              {expandedId === item.id && (
                <div className="sorteo-detail">
                  {detailLoading ? (
                    <p>{t('loading')}</p>
                  ) : detailSorteo?.id === item.id ? (
                    <>
                      {detailSorteo.descripcion && (
                        <p className="sorteo-detail__desc">{detailSorteo.descripcion}</p>
                      )}

                      <div className="sorteo-detail__actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => copyParticipantList(detailParticipants)}
                        >
                          📋 {t('sorteoCopyList')}
                        </button>
                      </div>

                      <h4>{t('sorteoParticipantListTitle')}</h4>
                      <p className="text-muted">{t('sorteoParticipantListHint')}</p>
                      {detailParticipants.length === 0 ? (
                        <p className="text-muted">{t('sorteoNoParticipants')}</p>
                      ) : (
                        <ul className="sorteo-participant-list">
                          {detailParticipants.map(participant => (
                            <li key={participant.miembro_id}>{sorteoParticipantName(participant)}</li>
                          ))}
                        </ul>
                      )}

                      {isClosed ? (
                        <div className="sorteo-closed-summary">
                          <h4>{t('sorteoClosedSummary')}</h4>
                          <p className="text-muted">
                            {t('sorteoClosedAt')}: {formatDateTime(detailSorteo.cerrado_at, language)}
                          </p>
                          {detailSorteo.comentarios_cierre && (
                            <p>{detailSorteo.comentarios_cierre}</p>
                          )}
                          {detailWinners.length > 0 && (
                            <ul className="sorteo-winner-list">
                              {detailWinners.map(winner => (
                                <li key={winner.id}>
                                  #{winner.orden} · {sorteoParticipantName(winner)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <div className="sorteo-close-panel">
                          <h4>{t('sorteoCloseTitle')}</h4>
                          <p className="text-muted">{t('sorteoCloseHint')}</p>
                          <FormField label={t('sorteoWinnersLabel')} htmlFor={`sorteo-winners-${item.id}`}>
                            <select
                              id={`sorteo-winners-${item.id}`}
                              multiple
                              className="form-input sorteo-winners-select"
                              value={closeForm.ganadorIds}
                              onChange={event => {
                                const selected = Array.from(event.target.selectedOptions).map(option => option.value);
                                setCloseForm(prev => ({ ...prev, ganadorIds: selected }));
                              }}
                            >
                              {detailParticipants.map(participant => (
                                <option key={participant.miembro_id} value={participant.miembro_id}>
                                  {sorteoParticipantName(participant)}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <FormField label={t('sorteoCloseComments')} htmlFor={`sorteo-comments-${item.id}`}>
                            <textarea
                              id={`sorteo-comments-${item.id}`}
                              className="form-input"
                              rows={3}
                              value={closeForm.comentarios}
                              onChange={event => setCloseForm(prev => ({ ...prev, comentarios: event.target.value }))}
                            />
                          </FormField>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={closing}
                            onClick={() => handleCloseSorteo(item.id)}
                          >
                            {closing ? t('loading') : t('sorteoCloseAction')}
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
    </div>
  );
}
