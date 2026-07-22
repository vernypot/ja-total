export const LIST_PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
export const LIST_PAGE_SIZE_DESKTOP_DEFAULT = 30;
export const LIST_PAGE_SIZE_MOBILE_DEFAULT = 15;

export function getDefaultListPageSize(isMobile) {
  return isMobile ? LIST_PAGE_SIZE_MOBILE_DEFAULT : LIST_PAGE_SIZE_DESKTOP_DEFAULT;
}

function normalizePageSize(pageSize) {
  const parsed = Number(pageSize);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return LIST_PAGE_SIZE_DESKTOP_DEFAULT;
}

function normalizePage(page, totalPages) {
  const parsed = Number(page);
  const safeTotalPages = Math.max(1, totalPages);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, safeTotalPages);
}

export function paginateItems(items, page, pageSize) {
  const list = items || [];
  if (list.length === 0) return [];

  const safePageSize = normalizePageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(list.length / safePageSize));
  const safePage = normalizePage(page, totalPages);
  const start = (safePage - 1) * safePageSize;

  return list.slice(start, start + safePageSize);
}

export function getListPageRange(page, pageSize, totalItems) {
  const safePageSize = normalizePageSize(pageSize);
  const totalPages = totalItems
    ? Math.max(1, Math.ceil(totalItems / safePageSize))
    : 1;
  const safePage = normalizePage(page, totalPages);

  if (!totalItems) {
    return { start: 0, end: 0, totalPages, page: safePage };
  }

  const start = (safePage - 1) * safePageSize + 1;
  const end = Math.min(safePage * safePageSize, totalItems);

  return { start, end, totalPages, page: safePage };
}
