/** Emails that always receive superadmin role in the app */
export const SUPERADMIN_EMAILS = ['walkerpottinger@gmail.com'];

export function isSuperAdminEmail(email) {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email.toLowerCase());
}

export function getUserRole(user, userData) {
  if (isSuperAdminEmail(user?.email)) return 'superadmin';
  return userData?.rol || user?.user_metadata?.role || 'user';
}

export function isSuperAdmin(role) {
  return role === 'superadmin';
}

export function isAdminOrAbove(role) {
  return role === 'admin' || role === 'superadmin';
}

export function isReadOnlyUser(role) {
  return !isAdminOrAbove(role);
}

/** Create/list system users — superadmin only */
export function canManageUsers(role) {
  return isSuperAdmin(role);
}

/** Members, clubs, member detail tabs — admin and superadmin */
export function canManageMembers(role) {
  return isAdminOrAbove(role);
}

export function canManageClubs(role) {
  return isAdminOrAbove(role);
}

/** Progressive classes / specialties catalog — superadmin only */
export function canManageClasses(role) {
  return isSuperAdmin(role);
}

/** Edit assigned iglesia profile — admin and superadmin */
export function canManageIglesiaProfile(role) {
  return isAdminOrAbove(role);
}

/** Create iglesias or change active church — superadmin only */
export function canCreateIglesia(role) {
  return isSuperAdmin(role);
}

export function canDeactivateIglesia(role) {
  return isSuperAdmin(role);
}

/** Alias used across church-scoped screens */
export function canManageChurchData(role) {
  return isAdminOrAbove(role);
}

// Legacy alias
export function canManageIglesias(role) {
  return canManageIglesiaProfile(role);
}
