import { Fragment } from 'react';

function MemberNameCell({ row }) {
  if (row.roleHint) {
    return (
      <span className="unidad-report-role-label">
        {row.roleHint}:
        {row.name ? ` ${row.name}` : ''}
      </span>
    );
  }

  return row.name || '\u00A0';
}

function ReportForm({
  formId,
  clubName,
  clubLogoUrl = '',
  tipoLogoUrl = '',
  unidadName,
  memberRows,
  t,
}) {
  return (
    <section className="unidad-report-form" key={formId}>
      <div className="unidad-report-header">
        <div className="unidad-report-logos">
          {tipoLogoUrl ? (
            <img
              src={tipoLogoUrl}
              alt=""
              className="unidad-report-logo unidad-report-logo--tipo"
            />
          ) : (
            <div className="unidad-report-logo unidad-report-logo--tipo unidad-report-logo--empty" />
          )}
          {clubLogoUrl ? (
            <img
              src={clubLogoUrl}
              alt=""
              className="unidad-report-logo unidad-report-logo--club"
            />
          ) : (
            <div className="unidad-report-logo unidad-report-logo--club unidad-report-logo--empty" />
          )}
        </div>
        <h2 className="unidad-report-title">{t('unidadReportPrintTitle')}</h2>
      </div>

      <div className="unidad-report-body">
        <div className="unidad-report-meta">
          <div className="unidad-report-field">
            {t('unidadReportPrintClub')}:{' '}
            <span className="unidad-report-field-fill">{clubName || ' '}</span>
          </div>
          <div className="unidad-report-field">
            {t('unidadReportPrintUnidad')}:{' '}
            <span className="unidad-report-field-fill">{unidadName || ' '}</span>
          </div>
          <div className="unidad-report-field">
            {t('unidadReportPrintConsejero')}:{' '}
            <span className="unidad-report-field-fill">&nbsp;</span>
          </div>
        </div>

        <div className="unidad-report-meta-line">
          <div className="unidad-report-field">
            {t('unidadReportPrintMeeting')}: <span className="unidad-report-field-fill">&nbsp;</span>
          </div>
          <div className="unidad-report-field">
            {t('unidadReportPrintDate')}: <span className="unidad-report-field-fill">&nbsp;</span>
          </div>
          <div className="unidad-report-field">
            {t('unidadReportPrintDay')}: <span className="unidad-report-field-fill">&nbsp;</span>
          </div>
          <div className="unidad-report-field">
            {t('unidadReportPrintSchedule')}: <span className="unidad-report-field-fill">&nbsp;</span>
          </div>
        </div>

        <table className="unidad-report-table">
          <thead>
            <tr>
              <th className="unidad-report-col-num">N°</th>
              <th className="unidad-report-col-name">{t('unidadReportPrintMember')}</th>
              <th className="unidad-report-col-vertical">{t('unidadReportPrintPunctuality')}</th>
              <th className="unidad-report-col-vertical">{t('unidadReportPrintUniform')}</th>
              <th className="unidad-report-col-vertical">{t('unidadReportPrintDiscipline')}</th>
              <th className="unidad-report-col-vertical">{t('unidadReportPrintMaterials')}</th>
              <th className="unidad-report-col-score">{t('unidadReportPrintCuota')}</th>
              <th className="unidad-report-col-score">{t('unidadReportPrintTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {memberRows.map(row => (
              <tr key={`${formId}-${row.number}`}>
                <td>{row.number}</td>
                <td className="unidad-report-name-cell">
                  <MemberNameCell row={row} />
                </td>
                <td className="unidad-report-score-cell">&nbsp;</td>
                <td className="unidad-report-score-cell">&nbsp;</td>
                <td className="unidad-report-score-cell">&nbsp;</td>
                <td className="unidad-report-score-cell">&nbsp;</td>
                <td className="unidad-report-score-cell">&nbsp;</td>
                <td className="unidad-report-score-cell">&nbsp;</td>
              </tr>
            ))}
            <tr className="unidad-report-total-row">
              <td colSpan={2}>{t('unidadReportPrintItemsTotal')}</td>
              <td className="unidad-report-score-cell">&nbsp;</td>
              <td className="unidad-report-score-cell">&nbsp;</td>
              <td className="unidad-report-score-cell">&nbsp;</td>
              <td className="unidad-report-score-cell">&nbsp;</td>
              <td className="unidad-report-score-cell">&nbsp;</td>
              <td className="unidad-report-score-cell">&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <div className="unidad-report-notes">
          <p className="unidad-report-notes-label">{t('unidadReportPrintNotes')}</p>
          <div className="unidad-report-notes-lines" />
        </div>
      </div>
    </section>
  );
}

export default function UnidadWeeklyReportPrint({
  clubName = '',
  clubLogoUrl = '',
  tipoLogoUrl = '',
  unidadName = '',
  memberRows = [],
  forms = [{ id: 1 }, { id: 2 }],
  t,
}) {
  return (
    <div className="unidad-report-document">
      <div className="unidad-report-page">
        {forms.map((form, index) => (
          <Fragment key={form.id}>
            {index > 0 && <div className="unidad-report-cut-line" aria-hidden="true" />}
            <div className="unidad-report-page-slot">
              <ReportForm
                formId={form.id}
                clubName={clubName}
                clubLogoUrl={clubLogoUrl}
                tipoLogoUrl={tipoLogoUrl}
                unidadName={unidadName}
                memberRows={memberRows}
                t={t}
              />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
