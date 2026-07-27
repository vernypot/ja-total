import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { useListPagination } from '../../hooks/useListPagination';
import { getUserRole, isAdminOrAbove } from '../../utils/permissions';
import * as UsuarioUsageModel from '../models/usuarioUsage.model';

const PERIOD_OPTIONS = [7, 30, 90];

export function useUsuarioUsageController() {
  const { user, userData } = useContext(AuthContext);
  const { t, language } = useLanguage();
  const userRole = getUserRole(user, userData);
  const canView = isAdminOrAbove(userRole);

  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('staff');
  const [staffRows, setStaffRows] = useState([]);
  const [memberRows, setMemberRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');

  const loadStats = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [staffResult, memberResult] = await Promise.all([
      UsuarioUsageModel.fetchStaffUsageStats(days),
      UsuarioUsageModel.fetchMemberPortalUsageStats(days),
    ]);

    if (staffResult.error) {
      setError(staffResult.error.message || t('usageStatsLoadFailed'));
      setStaffRows([]);
      setMemberRows([]);
      setLoading(false);
      return;
    }

    setStaffRows(staffResult.data || []);
    setMemberRows(memberResult.data || []);
    setLoading(false);
  }, [canView, days, t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const activeRows = tab === 'staff' ? staffRows : memberRows;

  const scopedMemberRows = useMemo(() => {
    if (tab !== 'members' || memberFilter !== 'card') return activeRows;
    return activeRows.filter(row =>
      (Number(row.card_scan_count) || 0) > 0
      || (Number(row.qr_login_count) || 0) > 0
      || (Number(row.login_count) || 0) > 0
    );
  }, [activeRows, memberFilter, tab]);

  const rowsForTable = tab === 'members' ? scopedMemberRows : activeRows;

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rowsForTable;

    return rowsForTable.filter(row => {
      const haystack = tab === 'staff'
        ? [
          row.email,
          row.nombre,
          row.apellido1,
          row.apellido2,
          row.iglesia_nombre,
          row.rol,
        ].filter(Boolean).join(' ').toLowerCase()
        : [
          row.nombre,
          row.apellido1,
          row.apellido2,
          row.club_nombre,
        ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }, [rowsForTable, searchQuery, tab]);

  const summary = useMemo(() => {
    const rows = rowsForTable;
    const withLogin = rows.filter(row => row.last_login_at || (Number(row.card_scan_count) || 0) > 0);
    const activeNow = rows.filter(row => row.active_now);
    const totalUsageSeconds = rows.reduce(
      (sum, row) => sum + (Number(row.total_usage_seconds) || 0),
      0
    );
    const totalLogins = rows.reduce(
      (sum, row) => sum + (Number(row.login_count) || 0),
      0
    );
    const totalCardScans = rows.reduce(
      (sum, row) => sum + (Number(row.card_scan_count) || 0),
      0
    );
    const totalQrLogins = rows.reduce(
      (sum, row) => sum + (Number(row.qr_login_count) || 0),
      0
    );

    return {
      trackedUsers: rows.length,
      usersWithLogin: withLogin.length,
      activeNow: activeNow.length,
      totalLogins,
      totalUsageSeconds,
      totalCardScans,
      totalQrLogins,
    };
  }, [rowsForTable]);

  const listPagination = useListPagination(filteredRows, [tab, days, searchQuery, memberFilter]);

  return {
    canView,
    tab,
    setTab,
    memberFilter,
    setMemberFilter,
    days,
    setDays,
    periodOptions: PERIOD_OPTIONS,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    summary,
    rows: listPagination.pageItems,
    listPagination,
    reload: loadStats,
    formatUsageDuration: seconds => UsuarioUsageModel.formatUsageDuration(seconds, t),
    formatUsageTimestamp: iso => UsuarioUsageModel.formatUsageTimestamp(iso, language),
    staffDisplayName: UsuarioUsageModel.staffDisplayName,
    memberDisplayName: UsuarioUsageModel.memberDisplayName,
  };
}
