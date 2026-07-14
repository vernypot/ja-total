import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  sb: {},
}));

import { isValidPortalPin } from './memberPortal.model';

describe('memberPortal.model', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidPortalPin('1234')).toBe(true);
    expect(isValidPortalPin('0000')).toBe(true);
  });

  it('rejects invalid PIN formats', () => {
    expect(isValidPortalPin('123')).toBe(false);
    expect(isValidPortalPin('12345')).toBe(false);
    expect(isValidPortalPin('12a4')).toBe(false);
    expect(isValidPortalPin('')).toBe(false);
  });
});
