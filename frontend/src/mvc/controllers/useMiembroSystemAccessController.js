import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { validateForm } from '../../utils/validateForm';
import { generateTemporaryPassword } from '../../utils/passwordValidation';
import * as UsuariosModel from '../models/usuarios.model';
import * as AuthModel from '../models/auth.model';
import * as IglesiasModel from '../models/iglesias.model';
import * as MiembrosModel from '../models/miembros.model';

const EMPTY_PROMOTE_FORM = {
  email: '',
  rol: 'user',
  rol_iglesia: 'member',
  iglesia_id: '',
  password: '',
  confirmPassword: '',
  sendSetupEmail: false,
};

export function useMiembroSystemAccessController(miembroId) {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const userRole = getUserRole(user, userData);
  const canManage = isSuperAdmin(userRole);

  const [linkedUsuario, setLinkedUsuario] = useState(null);
  const [unlinkedUsuarios, setUnlinkedUsuarios] = useState([]);
  const [iglesias, setIglesias] = useState([]);
  const [loading, setLoading] = useState(Boolean(miembroId && canManage));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPromoteForm, setShowPromoteForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [promoteForm, setPromoteForm] = useState(EMPTY_PROMOTE_FORM);
  const [linkUsuarioId, setLinkUsuarioId] = useState('');

  const load = useCallback(async () => {
    if (!miembroId || !canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [linkedResult, unlinkedResult, iglesiasResult, iglesiaResult, memberResult] = await Promise.all([
      UsuariosModel.fetchLinkedUsuarioForMiembro(miembroId),
      UsuariosModel.fetchUnlinkedUsuarios(),
      IglesiasModel.fetchActiveIglesias(),
      MiembrosModel.fetchMiembroPrimaryIglesiaId(miembroId),
      MiembrosModel.fetchMiembroById(miembroId),
    ]);

    if (linkedResult.error) {
      setError(linkedResult.error.message);
      setLinkedUsuario(null);
    } else {
      setLinkedUsuario(linkedResult.data);
    }

    if (!unlinkedResult.error) {
      setUnlinkedUsuarios(unlinkedResult.data || []);
    }

    if (!iglesiasResult.error) {
      setIglesias(iglesiasResult.data || []);
    }

    setPromoteForm(prev => ({
      ...prev,
      iglesia_id: iglesiaResult.iglesiaId || prev.iglesia_id || '',
      email: memberResult.data?.email || prev.email || '',
    }));

    setLoading(false);
  }, [canManage, miembroId]);

  useEffect(() => {
    load();
  }, [load]);

  async function promoteMember() {
    setError('');
    setSuccess('');
    setFieldErrors({});

    const validation = validateForm('usuario', {
      ...promoteForm,
      editingId: null,
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    if (!promoteForm.iglesia_id) {
      setError(t('iglesiaMustBeActive'));
      return;
    }

    setSaving(true);

    const password = promoteForm.sendSetupEmail
      ? generateTemporaryPassword()
      : promoteForm.password;

    const { error: saveError } = await UsuariosModel.promoteMiembroToUsuario({
      miembroId,
      email: promoteForm.email,
      password,
      rol: promoteForm.rol,
      rolIglesia: promoteForm.rol_iglesia,
      iglesiaId: promoteForm.iglesia_id,
    });

    if (saveError) {
      setSaving(false);
      const msg = saveError.message || '';
      setError(
        msg.includes('admin_promote_miembro_to_usuario') || msg.includes('USUARIO_MIEMBRO_LINK')
          ? `${t('memberPromoteFailed')}: ${msg} ${t('runSqlMigrationHint')}`
          : msg.includes('already exists')
            ? t('authAccountExists')
            : `${t('memberPromoteFailed')}: ${msg}`
      );
      return;
    }

    if (promoteForm.sendSetupEmail) {
      const emailResult = await AuthModel.sendPasswordResetEmail(promoteForm.email.trim());
      if (emailResult.error) {
        setSuccess(t('memberPromotedSetupEmailFailed'));
      } else {
        setSuccess(t('memberPromotedSetupEmailSent'));
      }
    } else {
      setSuccess(t('memberPromotedSuccess'));
    }

    setShowPromoteForm(false);
    setPromoteForm(EMPTY_PROMOTE_FORM);
    setSaving(false);
    await load();
  }

  async function linkExistingUser() {
    if (!linkUsuarioId) {
      setError(t('selectUserToLink'));
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: saveError } = await UsuariosModel.linkUsuarioMiembro(miembroId, linkUsuarioId);
    setSaving(false);

    if (saveError) {
      setError(`${t('memberLinkFailed')}: ${saveError.message}`);
      return;
    }

    setSuccess(t('memberLinkSuccess'));
    setShowLinkForm(false);
    setLinkUsuarioId('');
    await load();
  }

  async function unlinkUser() {
    setSaving(true);
    setError('');
    setSuccess('');

    const { error: saveError } = await UsuariosModel.unlinkUsuarioMiembro(miembroId);
    setSaving(false);

    if (saveError) {
      setError(`${t('memberUnlinkFailed')}: ${saveError.message}`);
      return;
    }

    setSuccess(t('memberUnlinkSuccess'));
    await load();
  }

  async function deactivateSystemAccess() {
    if (!linkedUsuario?.id) return;
    if (linkedUsuario.id === user?.id || linkedUsuario.id === userData?.id) {
      setError(t('cannotDeactivateSelf'));
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: saveError } = await UsuariosModel.setUsuarioSystemAccess(linkedUsuario.id, false);
    setSaving(false);

    if (saveError) {
      setError(`${t('userDeactivateFailed')}: ${saveError.message}`);
      return;
    }

    setSuccess(t('userDeactivatedMemberAccessKept'));
    await load();
  }

  async function reactivateSystemAccess() {
    if (!linkedUsuario?.id) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: saveError } = await UsuariosModel.setUsuarioSystemAccess(linkedUsuario.id, true);
    setSaving(false);

    if (saveError) {
      setError(`${t('userActivateFailed')}: ${saveError.message}`);
      return;
    }

    setSuccess(t('userReactivatedSuccess'));
    await load();
  }

  return {
    canManage,
    linkedUsuario,
    unlinkedUsuarios,
    iglesias,
    loading,
    error,
    success,
    fieldErrors,
    saving,
    showPromoteForm,
    setShowPromoteForm,
    showLinkForm,
    setShowLinkForm,
    promoteForm,
    setPromoteForm,
    linkUsuarioId,
    setLinkUsuarioId,
    promoteMember,
    linkExistingUser,
    unlinkUser,
    deactivateSystemAccess,
    reactivateSystemAccess,
  };
}
