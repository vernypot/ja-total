export function estadoLabel(estado, t) {
  if (estado === 'activo') return t('active');
  if (estado === 'inactivo') return t('inactive');
  if (estado === 'suspendido') return t('suspended');
  return estado;
}

export function attendanceLabel(estado, t) {
  if (estado === 'a_tiempo') return t('attendanceOnTime');
  if (estado === 'tarde') return t('attendanceLate');
  if (estado === 'ausente') return t('attendanceAbsent');
  return t('attendancePending');
}

export function confirmationLabel(estado, t) {
  if (estado === 'confirmado') return t('confirmationConfirmed');
  if (estado === 'rechazado') return t('confirmationDeclined');
  return t('confirmationPending');
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
