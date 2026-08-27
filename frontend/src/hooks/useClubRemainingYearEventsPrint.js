import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from './useLanguage';
import * as EventosModel from '../mvc/models/eventos.model';
import { getCarnetAssetUrl } from '../mvc/models/carnet.model';
import { groupEventosByMonth, resolveClubPrintLogos } from '../utils/clubRemainingYearEvents';
import { printClubRemainingYearEvents } from '../utils/printClubRemainingYearEvents';
import { clubDisplayName } from '../utils/club';

export function useClubRemainingYearEventsPrint({
  clubId,
  activeClubData,
  timeZone,
  onError,
}) {
  const { language } = useLanguage();
  const [printing, setPrinting] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);

  const printRemainingYearEvents = useCallback(async () => {
    if (!clubId) return;

    setPrinting(true);
    const { data, error, year, agendaUpdatedAt } = await EventosModel.fetchRemainingYearEventsForClub(
      clubId,
      new Date(),
      timeZone
    );
    setPrinting(false);

    if (error) {
      onError?.(`Error preparing print: ${error.message}`);
      return;
    }

    setPrintPayload({
      ...resolveClubPrintLogos(activeClubData, getCarnetAssetUrl),
      clubName: clubDisplayName(activeClubData),
      year,
      groupedMonths: groupEventosByMonth(data, language),
      eventCount: data.length,
      agendaUpdatedAt,
      printedAt: new Date().toISOString(),
    });
  }, [activeClubData, clubId, language, onError, timeZone]);

  useEffect(() => {
    if (!printPayload) return undefined;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      printClubRemainingYearEvents().finally(() => {
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
    printingRemainingYearEvents: printing,
    printRemainingYearEvents,
    remainingYearPrintPayload: printPayload,
  };
}
