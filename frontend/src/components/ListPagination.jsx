import { useLanguage } from '../hooks/useLanguage';
import '../styles/listPagination.css';

export default function ListPagination({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalItems,
  totalPages,
  pageStart,
  pageEnd,
  pageSizeOptions,
  className = '',
}) {
  const { t } = useLanguage();

  if (!totalItems) return null;

  return (
    <div className={`list-pagination ${className}`.trim()}>
      <div className="list-pagination__summary">
        {t('listPaginationShowing')
          .replace('{start}', String(pageStart))
          .replace('{end}', String(pageEnd))
          .replace('{total}', String(totalItems))}
      </div>

      <div className="list-pagination__controls">
        <label className="list-pagination__size">
          <span>{t('listPaginationRowsPerPage')}</span>
          <select
            className="form-input list-pagination__size-select"
            value={Number.isFinite(Number(pageSize)) ? pageSize : 30}
            onChange={event => setPageSize(Number(event.target.value))}
            aria-label={t('listPaginationRowsPerPage')}
          >
            {(pageSizeOptions || []).map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <div className="list-pagination__nav">
          <button
            type="button"
            className="list-pagination__nav-btn"
            disabled={page <= 1}
            onClick={() => setPage(current => Math.max(1, current - 1))}
          >
            {t('listPaginationPrevious')}
          </button>
          <span className="list-pagination__page-label">
            {t('listPaginationPage')
              .replace('{page}', String(page))
              .replace('{totalPages}', String(totalPages))}
          </span>
          <button
            type="button"
            className="list-pagination__nav-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
          >
            {t('listPaginationNext')}
          </button>
        </div>
      </div>
    </div>
  );
}
