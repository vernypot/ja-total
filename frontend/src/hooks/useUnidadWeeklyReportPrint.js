import { useCallback, useEffect, useState } from 'react';
import { getCarnetAssetUrl } from '../mvc/models/carnet.model';
import { clubDisplayName } from '../utils/club';
import { createUnidadWeeklyReportPayload } from '../utils/unidadWeeklyReportPrint';
import { printUnidadWeeklyReport } from '../utils/printUnidadWeeklyReport';

export function useUnidadWeeklyReportPrint({
  club,
  membersById,
  memberDisplayName,
  roleLabel,
}) {
  const [printPayload, setPrintPayload] = useState(null);

  const printWeeklyReportTemplate = useCallback((unidad = null) => {
    setPrintPayload(createUnidadWeeklyReportPayload({
      club,
      clubName: clubDisplayName(club),
      unidad,
      membersById,
      memberDisplayName,
      roleLabel,
      getAssetUrl: getCarnetAssetUrl,
    }));
  }, [club, membersById, memberDisplayName, roleLabel]);

  useEffect(() => {
    if (!printPayload) return undefined;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      printUnidadWeeklyReport().finally(() => {
        if (!cancelled) {
          window.setTimeout(() => setPrintPayload(null), 300);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [printPayload]);

  return {
    printWeeklyReportTemplate,
    unidadReportPrintPayload: printPayload,
  };
}
