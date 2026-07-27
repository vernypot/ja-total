export const SORTEO_TIPO = {
  ASISTENCIA_EVENTO: 'asistencia_evento',
  LOGIN_PERIODO: 'login_periodo',
  NOTICIA_LEIDA: 'noticia_leida',
  PERSONALIZADO: 'personalizado',
};

export const SORTEO_ESTADO = {
  ABIERTO: 'abierto',
  CERRADO: 'cerrado',
};

export const SORTEO_TIPOS = Object.values(SORTEO_TIPO);

export function isSorteoClosed(sorteo) {
  return sorteo?.estado === SORTEO_ESTADO.CERRADO;
}
