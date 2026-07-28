export function clubDisplayName(club) {
  if (!club) return '';
  const nombre = club.nombre || '';
  const tipo = club.tipos_club?.nombre
    || club.tipo_nombre
    || club.tipoNombre
    || club.club_tipo
    || '';
  return tipo ? `${nombre} · ${tipo}` : nombre;
}
