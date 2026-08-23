import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';
import {
  getDefaultListPageSize,
  getListPageRange,
  LIST_PAGE_SIZE_DESKTOP_DEFAULT,
  LIST_PAGE_SIZE_OPTIONS,
  paginateItems,
} from '../utils/listPagination';

export function useListPagination(items, resetDeps = [], options = {}) {
  const {
    defaultPageSize,
    pageSizeOptions = LIST_PAGE_SIZE_OPTIONS,
  } = options;
  const fixedPageSize = Number.isFinite(Number(defaultPageSize)) && Number(defaultPageSize) > 0
    ? Number(defaultPageSize)
    : null;
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [pageSize, setPageSize] = useState(fixedPageSize ?? LIST_PAGE_SIZE_DESKTOP_DEFAULT);
  const [page, setPage] = useState(1);
  const [pageSizeCustomized, setPageSizeCustomized] = useState(false);

  const totalItems = items?.length ?? 0;
  const { totalPages, page: safePage } = getListPageRange(page, pageSize, totalItems);

  useEffect(() => {
    if (!pageSizeCustomized && !fixedPageSize) {
      setPageSize(getDefaultListPageSize(isMobile));
    }
  }, [isMobile, pageSizeCustomized, fixedPageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, totalItems, ...resetDeps]);

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  const pageItems = useMemo(
    () => paginateItems(items, safePage, pageSize),
    [items, safePage, pageSize]
  );

  function handleSetPageSize(nextPageSize) {
    setPageSizeCustomized(true);
    setPageSize(nextPageSize);
  }

  const { start, end } = getListPageRange(safePage, pageSize, totalItems);

  return {
    pageItems,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    totalItems,
    totalPages,
    pageStart: start,
    pageEnd: end,
    pageSizeOptions,
  };
}
