/** DB columns used for member list/display name resolution. */
export const MIEMBRO_NAME_FIELDS = 'nombre,apellido1,apellido2,nombre_opcional,apellido_opcional';

export function memberDisplayFirstName(member) {
  if (!member) return '';
  const optional = String(member.nombre_opcional || '').trim();
  if (optional) return optional;
  return String(member.nombre || '').trim();
}

export function memberDisplayLastName(member) {
  if (!member) return '';
  const optional = String(member.apellido_opcional || '').trim();
  if (optional) return optional;
  return String(member.apellido1 || '').trim();
}

/** Listing name: optional overrides, otherwise first name + first last name. */
export function memberDisplayName(member) {
  if (!member) return '';
  return [memberDisplayFirstName(member), memberDisplayLastName(member)].filter(Boolean).join(' ');
}

/** Legal / registered full name (all stored name parts). */
export function memberLegalFullName(member) {
  if (!member) return '';
  return [member.nombre, member.apellido1, member.apellido2].filter(Boolean).join(' ');
}
