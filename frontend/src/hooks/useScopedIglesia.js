import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { IglesiaContext } from '../context/IglesiaContext';
import { getUserRole, isSuperAdmin } from '../utils/permissions';

export function useScopedIglesia() {
  const { user, userData } = useContext(AuthContext);
  const { activeIglesia } = useContext(IglesiaContext);
  const role = getUserRole(user, userData);
  const superadmin = isSuperAdmin(role);

  const assignedIglesiaId = userData?.iglesia_id || null;
  const assignedIglesiaActive = userData?.iglesia_estado === 'activo';

  const effectiveIglesiaId = useMemo(() => {
    if (superadmin) return activeIglesia || null;
    if (!assignedIglesiaId || !assignedIglesiaActive) return null;
    return assignedIglesiaId;
  }, [superadmin, activeIglesia, assignedIglesiaId, assignedIglesiaActive]);

  return {
    role,
    isSuperAdmin: superadmin,
    canSwitchIglesia: superadmin,
    assignedIglesiaId,
    assignedIglesiaActive,
    assignedIglesiaNombre: userData?.iglesia_nombre || null,
    effectiveIglesiaId,
    hasIglesiaAssignment: Boolean(assignedIglesiaId),
  };
}
