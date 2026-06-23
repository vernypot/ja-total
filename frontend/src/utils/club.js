export function clubDisplayName(club) {
  if (!club) return '';
  const nombre = club.nombre || '';
  const tipo = club.tipos_club?.nombre || club.tipoNombre || '';
  return tipo ? `${nombre} · ${tipo}` : nombre;
}
