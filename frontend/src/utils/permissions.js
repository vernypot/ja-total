export function getUserRole(user, userData) {
  return userData?.rol || user?.user_metadata?.role || 'user';
}

export function isSuperAdmin(role) {
  return role === 'superadmin';
}

export function isAdminOrAbove(role) {
  return role === 'admin' || role === 'superadmin';
}
