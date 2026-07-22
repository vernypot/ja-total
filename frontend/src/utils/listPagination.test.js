import { describe, expect, it } from 'vitest';
import {
  getDefaultListPageSize,
  getListPageRange,
  paginateItems,
} from './listPagination';

describe('listPagination', () => {
  const items = Array.from({ length: 35 }, (_, index) => index + 1);

  it('uses 30 on desktop and 15 on mobile defaults', () => {
    expect(getDefaultListPageSize(false)).toBe(30);
    expect(getDefaultListPageSize(true)).toBe(15);
  });

  it('paginates items for the requested page', () => {
    expect(paginateItems(items, 1, 30)).toHaveLength(30);
    expect(paginateItems(items, 2, 30)).toEqual([31, 32, 33, 34, 35]);
    expect(paginateItems(items, 1, 15)[0]).toBe(1);
    expect(paginateItems(items, 1, 15)[14]).toBe(15);
  });

  it('returns page range metadata', () => {
    expect(getListPageRange(2, 30, 35)).toEqual({
      start: 31,
      end: 35,
      totalPages: 2,
      page: 2,
    });
  });

  it('returns stable metadata while the list is empty', () => {
    expect(getListPageRange(undefined, 30, 0)).toEqual({
      start: 0,
      end: 0,
      totalPages: 1,
      page: 1,
    });
  });

  it('recovers from invalid page values after data loads', () => {
    expect(getListPageRange(undefined, 30, 35)).toEqual({
      start: 1,
      end: 30,
      totalPages: 2,
      page: 1,
    });
  });
});
