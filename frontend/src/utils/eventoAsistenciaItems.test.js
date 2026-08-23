import { describe, expect, it } from 'vitest';
import {
  createPresetAsistenciaItem,
  formatAsistenciaItemLine,
  sanitizeAsistenciaItemsForSave,
} from './eventoAsistenciaItems';
import { EVENTO_ASISTENCIA_ITEM_TIPO } from '../constants/eventoAsistenciaItems';

describe('eventoAsistenciaItems', () => {
  it('creates preset items with default labels', () => {
    const t = key => ({ eventItemCuota: 'Cuota', eventItemBible: 'Biblia' }[key] || key);
    const item = createPresetAsistenciaItem(EVENTO_ASISTENCIA_ITEM_TIPO.CUOTA, { t });
    expect(item.tipo).toBe('cuota');
    expect(item.etiqueta).toBe('Cuota');
  });

  it('sanitizes custom items and drops empty labels', () => {
    const rows = sanitizeAsistenciaItemsForSave([
      { tipo: 'personalizado', etiqueta: 'Uniforme', detalle: 'Completo', orden: 0 },
      { tipo: 'personalizado', etiqueta: '  ', detalle: 'ignored', orden: 1 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].etiqueta).toBe('Uniforme');
    expect(rows[0].orden).toBe(0);
  });

  it('formats lines with optional detail', () => {
    expect(formatAsistenciaItemLine({
      tipo: 'biblia',
      etiqueta: 'Biblia',
      detalle: 'RVR 1960',
    })).toBe('Biblia: RVR 1960');
  });
});
