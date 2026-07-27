import { useEffect, useRef } from 'react';
import * as UsuarioUsageModel from '../mvc/models/usuarioUsage.model';

const HEARTBEAT_MS = 60_000;

export function useAppUsageTracking(enabled) {
  const sessionIdRef = useRef(null);
  const endingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let heartbeatTimer = null;
    endingRef.current = false;

    async function ensureSession() {
      const storedId = UsuarioUsageModel.getStoredStaffSessionId();
      if (storedId) {
        const { data: ok } = await UsuarioUsageModel.recordStaffAppHeartbeat(storedId);
        if (ok) {
          sessionIdRef.current = storedId;
          return;
        }
      }

      const { data: sessionId } = await UsuarioUsageModel.startStaffAppSession();
      if (sessionId) {
        sessionIdRef.current = sessionId;
      }
    }

    async function heartbeat() {
      const sessionId = sessionIdRef.current || UsuarioUsageModel.getStoredStaffSessionId();
      if (!sessionId) {
        await ensureSession();
        return;
      }
      await UsuarioUsageModel.recordStaffAppHeartbeat(sessionId);
    }

    async function endSession() {
      if (endingRef.current) return;
      endingRef.current = true;
      const sessionId = sessionIdRef.current || UsuarioUsageModel.getStoredStaffSessionId();
      if (sessionId) {
        await UsuarioUsageModel.endStaffAppSession(sessionId);
      }
      sessionIdRef.current = null;
    }

    ensureSession();
    heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        heartbeat();
      } else {
        heartbeat();
      }
    };

    window.addEventListener('pagehide', endSession);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      window.removeEventListener('pagehide', endSession);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      endSession();
    };
  }, [enabled]);
}

export async function endActiveStaffAppSession() {
  const sessionId = UsuarioUsageModel.getStoredStaffSessionId();
  if (sessionId) {
    await UsuarioUsageModel.endStaffAppSession(sessionId);
  }
}
