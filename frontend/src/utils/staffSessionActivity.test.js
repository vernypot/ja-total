import { describe, expect, it, beforeEach } from 'vitest';
import {
  STAFF_LAST_ACTIVITY_KEY,
  STAFF_SESSION_INACTIVITY_MS,
  clearStaffActivity,
  getStaffLastActivityAt,
  isStaffSessionIdle,
  touchStaffActivity,
} from './staffSessionActivity';

function installLocalStorageMock() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe('staffSessionActivity', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('detects idle after 30 minutes without activity', () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    touchStaffActivity(now);
    expect(isStaffSessionIdle(now + STAFF_SESSION_INACTIVITY_MS)).toBe(true);
    expect(isStaffSessionIdle(now + STAFF_SESSION_INACTIVITY_MS - 1)).toBe(false);
  });

  it('stores and reads last activity timestamp', () => {
    touchStaffActivity(1_700_000_000_000);
    expect(getStaffLastActivityAt()).toBe(1_700_000_000_000);
    expect(localStorage.getItem(STAFF_LAST_ACTIVITY_KEY)).toBe('1700000000000');
  });

  it('clears stored activity', () => {
    touchStaffActivity(Date.now());
    clearStaffActivity();
    expect(localStorage.getItem(STAFF_LAST_ACTIVITY_KEY)).toBeNull();
  });
});
