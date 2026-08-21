import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  STAFF_LAST_ACTIVITY_KEY,
  clearStaffActivity,
  isStaffSessionIdle,
  touchStaffActivity,
} from '../utils/staffSessionActivity';

const CHECK_INTERVAL_MS = 60_000;
const ACTIVITY_THROTTLE_MS = 30_000;

export function useStaffSessionIdleTimeout(enabled) {
  const { logout } = useContext(AuthContext);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  const lastTouchRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    touchStaffActivity();

    function maybeLogout() {
      if (!isStaffSessionIdle()) return;
      clearStaffActivity();
      logoutRef.current();
    }

    function onActivity() {
      const now = Date.now();
      if (now - lastTouchRef.current < ACTIVITY_THROTTLE_MS) return;
      lastTouchRef.current = now;
      touchStaffActivity(now);
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, onActivity, { passive: true });
    });

    function onStorage(event) {
      if (event.key === STAFF_LAST_ACTIVITY_KEY) {
        maybeLogout();
      }
    }
    window.addEventListener('storage', onStorage);

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        maybeLogout();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    const timer = window.setInterval(maybeLogout, CHECK_INTERVAL_MS);

    return () => {
      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, onActivity);
      });
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(timer);
    };
  }, [enabled]);
}
