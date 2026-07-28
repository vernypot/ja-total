import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as MemberPortalModel from '../mvc/models/memberPortal.model';

export const MemberPortalContext = createContext();

export function MemberPortalProvider({ children }) {
  const [session, setSession] = useState(() => MemberPortalModel.getStoredPortalSession());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const stored = MemberPortalModel.getStoredPortalSession();
      if (!stored?.sessionToken) {
        if (!cancelled) {
          setSession(null);
          setReady(true);
        }
        return;
      }

      const { data: miembroId, error } = await MemberPortalModel.verifyPortalSession(stored.sessionToken);
      if (!cancelled) {
        if (error || !miembroId) {
          MemberPortalModel.clearPortalSession();
          setSession(null);
        } else {
          setSession(stored);
        }
        setReady(true);
      }
    }

    verify();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const token = session?.sessionToken;
    if (!token) return undefined;

    const timer = window.setInterval(async () => {
      await MemberPortalModel.verifyPortalSession(token);
    }, 120_000);

    return () => window.clearInterval(timer);
  }, [session?.sessionToken]);

  const login = useCallback(async (token, pin) => {
    const { data, error } = await MemberPortalModel.loginPortal(token, pin);
    if (error) return { error };

    const nextSession = {
      sessionToken: data.sessionToken,
      miembroId: data.miembroId,
      memberName: data.memberName,
      expiresAt: data.expiresAt,
    };
    MemberPortalModel.storePortalSession(nextSession);
    setSession(nextSession);
    return { data: nextSession, error: null };
  }, []);

  const loginQr = useCallback(async (token) => {
    const { data, error } = await MemberPortalModel.loginPortalQr(token);
    if (error) return { error };

    const nextSession = {
      sessionToken: data.sessionToken,
      miembroId: data.miembroId,
      memberName: data.memberName,
      expiresAt: data.expiresAt,
    };
    MemberPortalModel.storePortalSession(nextSession);
    setSession(nextSession);
    return { data: nextSession, error: null };
  }, []);

  const establishSession = useCallback((nextSession) => {
    if (!nextSession?.sessionToken) return;
    MemberPortalModel.storePortalSession(nextSession);
    setSession(nextSession);
  }, []);

  const logout = useCallback(async () => {
    await MemberPortalModel.logoutPortal(session?.sessionToken);
    setSession(null);
    window.location.href = '/';
  }, [session?.sessionToken]);

  const value = useMemo(() => ({
    session,
    ready,
    isAuthenticated: Boolean(session?.sessionToken),
    login,
    loginQr,
    establishSession,
    logout,
  }), [session, ready, login, loginQr, establishSession, logout]);

  return (
    <MemberPortalContext.Provider value={value}>
      {children}
    </MemberPortalContext.Provider>
  );
}

export function useMemberPortal() {
  return useContext(MemberPortalContext);
}
