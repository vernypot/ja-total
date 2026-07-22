import { useLanguage } from '../../hooks/useLanguage';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import PlanAgendaBoard from '../../components/PlanAgendaBoard';
import PlanPeriodoPrint from '../../components/PlanPeriodoPrint';
import PlanSessionsSummary from '../../components/PlanSessionsSummary';
import { PageHelpLink } from '../../components/PageHelp';
import FormField from '../../components/FormField';
import DatePickerInput from '../../components/DatePickerInput';
import { clubDisplayName } from '../../utils/club';
import '../../styles/form.css';
import '../../styles/planPeriodoPrint.css';

function toggleClaseId(ids, id) {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
}

export default function PlanificacionPeriodoView({
  clubs,
  clubId,
  activeClubData,
  plans,
  availableClases,
  expandedPlanId,
  planDetail,
  reuniones,
  assignmentsByMeeting,
  unassignedRequisitos,
  groupedUnassignedPool,
  assignedCount,
  totalAssignedSessions,
  poolCount,
  error,
  loading,
  detailLoading,
  showForm,
  editingPlanId,
  planForm,
  setPlanForm,
  fieldErrors = {},
  searchQuery,
  setSearchQuery,
  showInactive,
  setShowInactive,
  saving,
  canManage,
  iglesiaScopeReady,
  startCreate,
  startEdit,
  cancelForm,
  savePlan,
  deactivatePlan,
  toggleExpandPlan,
  assignRequisito,
  unassignRequisito,
  updateAssignmentSesiones,
  updateMeeting,
  tiposEvento,
  printPlan,
  printPayload,
  printingPlanId,
  selectClub,
  listPagination,
}) {
  const { t, language } = useLanguage();

  if (!iglesiaScopeReady) {
    return <p>{t('loading')}</p>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>📋 {t('periodPlanning')} <PageHelpLink pageId="periodPlanning" /></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '14px' }}>{t('periodPlanningHint')}</p>
        </div>
        {canManage && clubId && (
          <button
            type="button"
            onClick={startCreate}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ➕ {t('newPlan')}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '14px', fontWeight: 600 }}>
          {t('clubs')}:
          <select
            value={clubId}
            onChange={e => selectClub(e.target.value)}
            style={{ marginLeft: '8px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
          >
            <option value="">{t('selectClub')}</option>
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{clubDisplayName(c)}</option>
            ))}
          </select>
        </label>
        {activeClubData && (
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {activeClubData.tipos_club?.nombre || activeClubData.club_tipo || ''}
          </span>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginLeft: 'auto' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          {t('showInactive')}
        </label>
      </div>

      {!clubId ? (
        <p className="text-muted">{t('selectClubForPlans')}</p>
      ) : (
        <>
          <ListSearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('searchPlans')} />

          <ListPagination {...listPagination} />

          {showForm && canManage && (
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>
                {editingPlanId ? t('editPlan') : t('newPlan')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                <FormField label={t('planName')} htmlFor="plan-nombre" error={fieldErrors.nombre} required className="form-field--full">
                  <input
                    id="plan-nombre"
                    className="form-input"
                    value={planForm.nombre}
                    onChange={e => setPlanForm(f => ({ ...f, nombre: e.target.value }))}
                    style={{ marginTop: '4px', width: '100%' }}
                    aria-invalid={Boolean(fieldErrors.nombre)}
                  />
                </FormField>
                <FormField label={t('planStartDate')} htmlFor="plan-inicio" error={fieldErrors.fecha_inicio} required>
                  <DatePickerInput
                    id="plan-inicio"
                    className="form-input"
                    value={planForm.fecha_inicio}
                    onChange={e => setPlanForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    style={{ marginTop: '4px', width: '100%' }}
                    aria-invalid={Boolean(fieldErrors.fecha_inicio)}
                    required
                  />
                </FormField>
                <FormField label={t('planEndDate')} htmlFor="plan-fin" error={fieldErrors.fecha_fin} required>
                  <DatePickerInput
                    id="plan-fin"
                    className="form-input"
                    value={planForm.fecha_fin}
                    onChange={e => setPlanForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    style={{ marginTop: '4px', width: '100%' }}
                    aria-invalid={Boolean(fieldErrors.fecha_fin)}
                    required
                  />
                </FormField>
                <FormField label={t('planNumMeetings')} htmlFor="plan-reuniones" error={fieldErrors.num_reuniones} required>
                  <input
                    id="plan-reuniones"
                    type="number"
                    min="1"
                    className="form-input"
                    value={planForm.num_reuniones}
                    onChange={e => setPlanForm(f => ({ ...f, num_reuniones: e.target.value }))}
                    style={{ marginTop: '4px', width: '100%' }}
                    aria-invalid={Boolean(fieldErrors.num_reuniones)}
                  />
                </FormField>
              </div>

              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('planIncludedClasses')}</span>
                <p style={{ margin: '4px 0 8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('planIncludedClassesHint')}</p>
                {availableClases.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>{t('noClassesForClub')}</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableClases.map(clase => (
                      <label
                        key={clase.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          padding: '4px 8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: planForm.claseIds.includes(clase.id) ? '#eff6ff' : '#fff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={planForm.claseIds.includes(clase.id)}
                          onChange={() => setPlanForm(f => ({
                            ...f,
                            claseIds: toggleClaseId(f.claseIds, clase.id),
                          }))}
                        />
                        {clase.nombre}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label style={{ display: 'block', marginTop: '12px', fontSize: '13px' }}>
                {t('notes')}
                <textarea
                  className="form-input"
                  rows={2}
                  value={planForm.notas}
                  onChange={e => setPlanForm(f => ({ ...f, notas: e.target.value }))}
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={savePlan}
                  style={{ padding: '8px 14px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {saving ? t('saving') : t('save')}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p>{t('loading')}</p>
          ) : plans.length === 0 ? (
            <p className="text-muted">{t('noPlans')}</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {plans.map(plan => {
                const expanded = expandedPlanId === plan.id;
                const claseCount = expanded && planDetail?.clases
                  ? planDetail.clases.length
                  : null;
                return (
                  <div key={plan.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
                    <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <strong style={{ fontSize: '15px' }}>{plan.nombre}</strong>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {plan.fecha_inicio} → {plan.fecha_fin}
                          {' · '}
                          {plan.num_reuniones} {t('planMeetings')}
                          {claseCount != null && (
                            <> · {claseCount} {t('planClasses')}</>
                          )}
                          {expanded && (
                            <> · {assignedCount}/{poolCount} {t('planReqsAssigned')}</>
                          )}
                          {expanded && totalAssignedSessions != null && (
                            <> · {totalAssignedSessions} {t('planSessionsShort')}</>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => printPlan(plan.id)}
                          disabled={printingPlanId === plan.id}
                          title={t('planPrintHint')}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: printingPlanId === plan.id ? 'wait' : 'pointer',
                            backgroundColor: '#fff',
                            color: '#374151',
                            fontWeight: 600,
                          }}
                        >
                          🖨 {printingPlanId === plan.id ? t('loading') : t('printPlan')}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleExpandPlan(plan.id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            border: `1px solid ${expanded ? '#93c5fd' : '#2563eb'}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: expanded ? '#eff6ff' : '#fff',
                            color: expanded ? '#1d4ed8' : '#2563eb',
                            fontWeight: 600,
                          }}
                        >
                          {expanded ? t('collapse') : t('openPlan')}
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(plan)}
                              style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                            {plan.estado === 'activo' && (
                              <button
                                type="button"
                                onClick={() => deactivatePlan(plan.id)}
                                style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                ✕
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f3f4f6' }}>
                        {detailLoading ? (
                          <p style={{ margin: '12px 0', fontSize: '13px' }}>{t('loading')}</p>
                        ) : (planDetail?.clases || []).length === 0 ? (
                          <p style={{ margin: '12px 0', fontSize: '13px', color: '#b45309' }}>
                            {t('planSelectClassesFirst')}
                          </p>
                        ) : reuniones.length === 0 ? (
                          <p style={{ margin: '12px 0', fontSize: '13px', color: '#b45309' }}>
                            {t('planNoMeetings')}
                          </p>
                        ) : (
                          <>
                            <PlanAgendaBoard
                              reuniones={reuniones}
                              assignmentsByMeeting={assignmentsByMeeting}
                              unassignedRequisitos={unassignedRequisitos}
                              groupedUnassignedPool={groupedUnassignedPool}
                              canManage={canManage}
                              tiposEvento={tiposEvento}
                              defaultClubPlace={activeClubData?.nombre || ''}
                              onAssign={assignRequisito}
                              onUnassign={unassignRequisito}
                              onUpdateAssignmentSesiones={updateAssignmentSesiones}
                              onUpdateMeeting={updateMeeting}
                              t={t}
                            />
                            <PlanSessionsSummary
                              reuniones={reuniones}
                              assignmentsByMeeting={assignmentsByMeeting}
                              t={t}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
        </>
      )}

      {printPayload && (
        <div className="plan-print-source" aria-hidden="true">
          <PlanPeriodoPrint
            plan={printPayload.plan}
            clubName={clubDisplayName(activeClubData)}
            groupedTimeline={printPayload.groupedTimeline}
            sessionsSummary={printPayload.sessionsSummary}
            t={t}
            language={language}
          />
        </div>
      )}
    </div>
  );
}
