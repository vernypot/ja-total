import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { MemberPortalContext } from './MemberPortalContext';
import * as MemberPortalModel from '../mvc/models/memberPortal.model';
import * as UsuariosModel from '../mvc/models/usuarios.model';
import { memberDisplayName } from '../utils/memberDisplayName';
import {
  LOGIN_ENTRIES,
  VIEW_MODES,
  getStoredLoginEntry,
  resolveInitialViewMode,
  setStoredLoginEntry,
  setStoredViewMode,
} from '../utils/dashboardViewMode';
import { DASHBOARD_HOME_PATH, PORTAL_PROFILE_PATH } from '../utils/dashboardRoutes';

export const DashboardViewModeContext = createContext(null);

export function DashboardViewModeProvider({ children }) {
  const { user } = useContext(AuthContext);
  const {
    session,
    ready: portalReady,
    isAuthenticated,
    establishSession,
  } = useContext(MemberPortalContext);
  const navigate = useNavigate();

  const isStaff = Boolean(user);
  const isPortalSession = Boolean(session?.sessionToken);

  const [linkedMiembro, setLinkedMiembro] = useState(null);
  const [linkedStaffAccess, setLinkedStaffAccess] = useState(false);
  const [loadingLinkedAccess, setLoadingLinkedAccess] = useState(true);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [switchError, setSwitchError] = useState('');

  const [viewMode, setViewModeState] = useState(() => resolveInitialViewMode({
    isStaff,
    isPortalSession,
  }));

  const setViewMode = useCallback((mode) => {
    setViewModeState(mode);
    setStoredViewMode(mode);
  }, []);

  useEffect(() => {
    if (!portalReady) return;

    let cancelled = false;

    async function loadLinkedAccess() {
      setLoadingLinkedAccess(true);
      setSwitchError('');

      try {
        if (isStaff) {
          const { data, error } = await UsuariosModel.fetchCurrentUsuarioLinkedMiembro();
          if (cancelled) return;
          if (error) {
            setLinkedMiembro(null);
          } else {
            setLinkedMiembro(data || null);
          }
          setLinkedStaffAccess(true);
          return;
        }

        if (isPortalSession && session?.sessionToken) {
          const { data, error } = await MemberPortalModel.checkPortalLinkedStaffAccess(
            session.sessionToken
          );
          if (cancelled) return;
          setLinkedStaffAccess(Boolean(!error && data));
          setLinkedMiembro(session?.miembroId ? { id: session.miembroId } : null);
          return;
        }

        if (!cancelled) {
          setLinkedMiembro(null);
          setLinkedStaffAccess(false);
        }
      } finally {
        if (!cancelled) setLoadingLinkedAccess(false);
      }
    }

    loadLinkedAccess();

    return () => {
      cancelled = true;
    };
  }, [isStaff, isPortalSession, session?.sessionToken, session?.miembroId, portalReady]);

  useEffect(() => {
    if (!portalReady) return;

    const loginEntry = getStoredLoginEntry();
    if (loginEntry === LOGIN_ENTRIES.STAFF && isStaff) {
      setViewMode(VIEW_MODES.ADMIN);
      return;
    }

    if (loginEntry === LOGIN_ENTRIES.PORTAL && isPortalSession && !isStaff) {
      setViewMode(VIEW_MODES.MEMBER);
    }
  }, [isStaff, isPortalSession, portalReady, setViewMode]);

  const linkedMiembroId = linkedMiembro?.id || null;
  const linkedMemberName = memberDisplayName(linkedMiembro) || session?.memberName || '';

  const hasMemberPortalSessionForLinkedMember = Boolean(
    linkedMiembroId
    && session?.miembroId
    && session.miembroId === linkedMiembroId
  );

  const canUseMemberView = Boolean(
    linkedMiembroId && (isPortalSession || isStaff)
  );

  const canUseAdminView = isStaff || linkedStaffAccess;

  const canSwitchViewMode = Boolean(
    canUseMemberView && canUseAdminView
  );

  const isMemberView = viewMode === VIEW_MODES.MEMBER && canUseMemberView;

  const ensureLinkedPortalSession = useCallback(async () => {
    if (hasMemberPortalSessionForLinkedMember) {
      return { error: null };
    }

    const { data, error } = await MemberPortalModel.startLinkedMemberPortalSession();
    if (error) return { error };

    establishSession({
      sessionToken: data.sessionToken,
      miembroId: data.miembroId,
      memberName: data.memberName,
      expiresAt: data.expiresAt,
    });

    return { error: null };
  }, [establishSession, hasMemberPortalSessionForLinkedMember]);

  const switchToMemberView = useCallback(async () => {
    if (!canUseMemberView || switchingMode) return { error: null };

    setSwitchingMode(true);
    setSwitchError('');

    const { error } = isStaff
      ? await ensureLinkedPortalSession()
      : { error: null };

    setSwitchingMode(false);

    if (error) {
      setSwitchError(error.message || 'Failed to open member view');
      return { error };
    }

    setViewMode(VIEW_MODES.MEMBER);
    navigate(PORTAL_PROFILE_PATH);
    return { error: null };
  }, [
    canUseMemberView,
    ensureLinkedPortalSession,
    isStaff,
    navigate,
    setViewMode,
    switchingMode,
  ]);

  const switchToAdminView = useCallback(async () => {
    if (!canUseAdminView || switchingMode) return { error: null };

    if (!isStaff) {
      setStoredLoginEntry(LOGIN_ENTRIES.STAFF);
      setViewMode(VIEW_MODES.ADMIN);
      navigate('/login', { state: { from: DASHBOARD_HOME_PATH } });
      return { error: null };
    }

    setViewMode(VIEW_MODES.ADMIN);
    navigate(DASHBOARD_HOME_PATH);
    return { error: null };
  }, [canUseAdminView, isStaff, navigate, setViewMode, switchingMode]);

  useEffect(() => {
    if (!portalReady || !isStaff || viewMode !== VIEW_MODES.MEMBER || !linkedMiembroId) return;
    if (hasMemberPortalSessionForLinkedMember || switchingMode) return;

    let cancelled = false;

    async function restoreMemberSession() {
      const { error } = await ensureLinkedPortalSession();
      if (!cancelled && error) {
        setSwitchError(error.message || 'Failed to restore member view');
        setViewMode(VIEW_MODES.ADMIN);
      }
    }

    restoreMemberSession();

    return () => {
      cancelled = true;
    };
  }, [
    ensureLinkedPortalSession,
    hasMemberPortalSessionForLinkedMember,
    isStaff,
    linkedMiembroId,
    portalReady,
    setViewMode,
    switchingMode,
    viewMode,
  ]);

  const value = useMemo(() => ({
    viewMode,
    isMemberView,
    canSwitchViewMode,
    canUseMemberView,
    canUseAdminView,
    linkedMiembroId,
    linkedMemberName,
    loadingLinkedAccess,
    switchingMode,
    switchError,
    switchToMemberView,
    switchToAdminView,
  }), [
    viewMode,
    isMemberView,
    canSwitchViewMode,
    canUseMemberView,
    canUseAdminView,
    linkedMiembroId,
    linkedMemberName,
    loadingLinkedAccess,
    switchingMode,
    switchError,
    switchToMemberView,
    switchToAdminView,
  ]);

  return (
    <DashboardViewModeContext.Provider value={value}>
      {children}
    </DashboardViewModeContext.Provider>
  );
}

export function useDashboardViewMode() {
  const context = useContext(DashboardViewModeContext);
  if (!context) {
    throw new Error('useDashboardViewMode must be used within DashboardViewModeProvider');
  }
  return context;
}
