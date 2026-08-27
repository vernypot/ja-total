import { resolveClubPrintLogos } from './clubRemainingYearEvents';

/** Build up to 8 member rows for the weekly report print template. */
export function buildUnidadReportMemberRows({
  unidad = null,
  membersById = {},
  memberDisplayName = name => name,
  roleLabel = rol => rol,
  maxRows = 8,
} = {}) {
  const rows = [];
  const assignments = unidad?.miembro_unidad
    ? [...unidad.miembro_unidad].sort((a, b) => {
      const order = { capitan: 0, secretario: 1, subcapitan: 2, sub_capitan: 2, miembro: 3 };
      return (order[a.rol] ?? 9) - (order[b.rol] ?? 9);
    })
    : [];

  for (let index = 0; index < maxRows; index += 1) {
    const assignment = assignments[index];
    const member = assignment?.miembros || membersById[assignment?.miembro_id];
    let roleHint = '';

    if (!unidad) {
      if (index === 0) roleHint = roleLabel('capitan');
      else if (index === 1) roleHint = roleLabel('secretario');
    } else if (assignment?.rol === 'capitan' || assignment?.rol === 'secretario') {
      roleHint = roleLabel(assignment.rol);
    }

    rows.push({
      number: index + 1,
      roleHint,
      name: member ? memberDisplayName(member) : '',
    });
  }

  return rows;
}

export function createUnidadWeeklyReportPayload({
  club = null,
  clubName = '',
  unidad = null,
  membersById = {},
  memberDisplayName = name => name,
  roleLabel = rol => rol,
  formsPerPage = 2,
  getAssetUrl = null,
} = {}) {
  const { clubLogoUrl, tipoLogoUrl } = resolveClubPrintLogos(club, getAssetUrl);
  const memberRows = buildUnidadReportMemberRows({
    unidad,
    membersById,
    memberDisplayName,
    roleLabel,
  });

  return {
    clubName,
    clubLogoUrl,
    tipoLogoUrl,
    unidadName: unidad?.nombre || '',
    memberRows,
    forms: Array.from({ length: formsPerPage }, (_, index) => ({ id: index + 1 })),
  };
}
