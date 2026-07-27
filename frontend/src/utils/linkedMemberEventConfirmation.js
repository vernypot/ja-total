export function buildLinkedMemberSelfEventRow(assignments, evento, linkedMiembroId) {
  if (!linkedMiembroId || !evento?.id) return null;

  const row = (assignments || []).find(item => item.miembro_id === linkedMiembroId);
  if (!row) return null;

  return row.eventos ? row : { ...row, eventos: evento };
}
