export function estadoLabel(estado, t) {
  if (estado === 'activo') return t('active');
  if (estado === 'inactivo') return t('inactive');
  if (estado === 'suspendido') return t('suspended');
  return estado;
}

export function roleLabel(rol, t) {
  const map = {
    user: 'roleUser',
    admin: 'roleAdmin',
    superadmin: 'roleSuperadmin',
    member: 'roleMember',
    coordinator: 'roleCoordinator',
  };
  return t(map[rol] || rol);
}
