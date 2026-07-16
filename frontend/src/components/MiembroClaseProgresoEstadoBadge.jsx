import {
  miembroClaseProgresoEstadoLabel,
  miembroClaseProgresoEstadoStyle,
  resolveMiembroClaseProgresoEstado,
} from '../constants/miembroClaseProgresoEstado';

export default function MiembroClaseProgresoEstadoBadge({ assignment, t, compact = false }) {
  const estado = resolveMiembroClaseProgresoEstado(assignment);
  const style = miembroClaseProgresoEstadoStyle(estado);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: compact ? '2px 8px' : '4px 10px',
        borderRadius: '999px',
        fontSize: compact ? '11px' : '12px',
        fontWeight: 700,
        lineHeight: 1.3,
        backgroundColor: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {miembroClaseProgresoEstadoLabel(estado, t)}
    </span>
  );
}
