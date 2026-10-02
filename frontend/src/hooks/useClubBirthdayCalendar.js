import { useEffect, useMemo, useState } from 'react';
import * as MensajesModel from '../mvc/models/mensajes.model';
import {
  buildBirthdayCalendarEvents,
  readBirthdayPreference,
  writeBirthdayPreference,
} from '../utils/birthdayCalendar';

export function useClubBirthdayCalendar({
  clubId,
  club,
  startDate,
  endDate,
  sessionToken = null,
}) {
  const clubEnabled = club?.calendario_cumpleanos_activo === true;
  const [members, setMembers] = useState([]);
  const [rpcEnabled, setRpcEnabled] = useState(clubEnabled);
  const [showBirthdays, setShowBirthdaysState] = useState(() => readBirthdayPreference(clubId, true));

  useEffect(() => {
    setShowBirthdaysState(readBirthdayPreference(clubId, true));
  }, [clubId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!clubId) {
        setMembers([]);
        setRpcEnabled(false);
        return;
      }

      if (!sessionToken && club && club.calendario_cumpleanos_activo !== true) {
        setMembers([]);
        setRpcEnabled(false);
        return;
      }

      const { data, error } = await MensajesModel.fetchClubBirthdays(clubId, { sessionToken });
      if (cancelled) return;
      if (error) {
        setMembers([]);
        setRpcEnabled(false);
        return;
      }

      const enabled = sessionToken ? data?.enabled === true : clubEnabled;
      setRpcEnabled(enabled);
      setMembers(enabled ? (data?.members || []) : []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubId, clubEnabled, sessionToken, club?.calendario_cumpleanos_activo]);

  const enabled = sessionToken ? rpcEnabled : clubEnabled;

  function setShowBirthdays(next) {
    const value = Boolean(next);
    setShowBirthdaysState(value);
    writeBirthdayPreference(clubId, value);
  }

  const birthdayEvents = useMemo(() => {
    if (!enabled || !showBirthdays) return [];
    return buildBirthdayCalendarEvents({
      members,
      clubId,
      startDate,
      endDate,
    });
  }, [enabled, showBirthdays, members, clubId, startDate, endDate]);

  return {
    birthdayCalendarEnabled: enabled,
    showBirthdays: enabled && showBirthdays,
    setShowBirthdays,
    birthdayEvents,
    birthdayMembers: members,
  };
}
