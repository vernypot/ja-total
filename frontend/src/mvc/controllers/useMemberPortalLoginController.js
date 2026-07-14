import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemberPortal } from '../../context/MemberPortalContext';
import { parseTokenFromQrPayload } from '../models/carnet.model';
import * as MemberPortalModel from '../models/memberPortal.model';

function mapPortalLoginError(message, t) {
  const text = String(message || '');
  if (text.includes('PIN is only required on first login')) {
    return t('portalPinMigrationRequired');
  }
  return text || t('portalLoginFailed');
}

export function useMemberPortalLoginController() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, isAuthenticated, ready, login } = useMemberPortal();

  const [token, setToken] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [memberPreview, setMemberPreview] = useState(null);
  const [step, setStep] = useState('scan');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  const goToDashboard = useCallback(() => {
    navigate('/dashboard/home', { replace: true });
  }, [navigate]);

  const resolveToken = useCallback(async (rawToken) => {
    const normalized = parseTokenFromQrPayload(rawToken);
    if (!normalized) return;

    setToken(normalized);
    setPin('');
    setPinConfirm('');
    setError('');
    setResolving(true);

    const { data, error: resolveError } = await MemberPortalModel.resolvePortalToken(normalized);
    setResolving(false);

    if (resolveError) {
      setMemberPreview(null);
      setStep('scan');
      setError(resolveError.message);
      return;
    }

    if (!data) {
      setMemberPreview(null);
      setStep('scan');
      setError(t('portalInvalidToken'));
      return;
    }

    setMemberPreview(data);

    if (session?.miembroId === data.miembroId && isAuthenticated) {
      goToDashboard();
      return;
    }

    setStep('pin');
  }, [goToDashboard, isAuthenticated, session?.miembroId, t]);

  async function submitLogin(event) {
    event?.preventDefault();

    if (!token) {
      setError(t('portalTokenRequired'));
      return;
    }

    if (!MemberPortalModel.isValidPortalPin(pin)) {
      setError(t('portalPinInvalid'));
      return;
    }

    if (memberPreview?.needsPinSetup) {
      if (!MemberPortalModel.isValidPortalPin(pinConfirm)) {
        setError(t('portalPinConfirmInvalid'));
        return;
      }
      if (pin !== pinConfirm) {
        setError(t('portalPinConfirmMismatch'));
        return;
      }
    }

    setLoading(true);
    setError('');

    const { error: loginError } = await login(token, pin);
    setLoading(false);

    if (loginError) {
      setError(mapPortalLoginError(loginError.message, t));
      return;
    }

    goToDashboard();
  }

  function scanAgain() {
    setToken('');
    setPin('');
    setPinConfirm('');
    setMemberPreview(null);
    setStep('scan');
    setError('');
  }

  useEffect(() => {
    if (!ready) return;
    if (isAuthenticated) {
      goToDashboard();
    }
  }, [ready, isAuthenticated, goToDashboard]);

  useEffect(() => {
    if (!ready) return;
    const tokenFromUrl = parseTokenFromQrPayload(params.get('t') || '');
    if (tokenFromUrl) resolveToken(tokenFromUrl);
  }, [ready, params, resolveToken]);

  return {
    token,
    setToken,
    pin,
    setPin,
    pinConfirm,
    setPinConfirm,
    memberPreview,
    step,
    error,
    loading,
    resolving,
    resolveToken,
    submitLogin,
    scanAgain,
  };
}
