import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getUserRole,
  isSuperAdmin,
  isAdminOrAbove,
  isReadOnlyUser,
  canManageUsers,
  canManageMembers,
  canManageClubs,
  canManageClasses,
  canManageIglesiaProfile,
  canManageChurchData,
  canCreateIglesia,
} from '../utils/permissions';

export function usePermissions() {
  const { user, userData } = useContext(AuthContext);
  const role = getUserRole(user, userData);

  return {
    user,
    userData,
    role,
    isSuperAdmin: isSuperAdmin(role),
    isAdminOrAbove: isAdminOrAbove(role),
    isReadOnlyUser: isReadOnlyUser(role),
    canManageUsers: canManageUsers(role),
    canManageMembers: canManageMembers(role),
    canManageClubs: canManageClubs(role),
    canManageClasses: canManageClasses(role),
    canManageIglesias: canManageIglesiaProfile(role),
    canManageChurchData: canManageChurchData(role),
    canCreateIglesia: canCreateIglesia(role),
  };
}
