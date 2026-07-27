import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { useListPagination } from '../../hooks/useListPagination';
import { validateForm } from '../../utils/validateForm';
import { SORTEO_TIPO, SORTEO_ESTADO } from '../../constants/sorteoTypes';
import * as SorteosModel from '../models/sorteos.model';
import * as ClubesModel from '../models/clubes.model';
import * as NoticiasModel from '../models/noticias.model';
import * as EventosModel from '../models/eventos.model';
import * as MiembrosModel from '../models/miembros.model';
import { datetimeLocalValueToIso, isoToDatetimeLocalValue } from '../../utils/eventTimezone';

const emptyForm = () => ({
  titulo: '',
  descripcion: '',
  tipo: SORTEO_TIPO.ASISTENCIA_EVENTO,
  cantidad_ganadores: 1,
  evento_id: '',
  login_desde_local: '',
  login_hasta_local: '',
  noticia_id: '',
  club_id: '',
  manualMemberIds: [],
});

function toLocalDatetimeInput(iso, timezone) {
  return iso ? isoToDatetimeLocalValue(iso, timezone) : '';
}

export function useSorteosController() {
  const { user, userData } = useContext(AuthContext);
  const { t, language } = useLanguage();
  const { effectiveIglesiaId, assignedIglesiaNombre } = useScopedIglesia();
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);
  const churchTimezone = userData?.iglesia_timezone || undefined;

  const [items, setItems] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [noticias, setNoticias] = useState([]);
  const [poolMembers, setPoolMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [preview, setPreview] = useState({ count: 0, participantes: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [closeForm, setCloseForm] = useState({ comentarios: '', ganadorIds: [] });
  const [closing, setClosing] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');

  const filteredItems = useMemo(
    () => filterBySearch(items, searchQuery, item => [item.titulo, item.descripcion, item.evento_nombre, item.noticia_titulo]),
    [items, searchQuery]
  );

  const listPagination = useListPagination(filteredItems, [searchQuery]);

  const loadReferenceData = useCallback(async () => {
    if (!effectiveIglesiaId) {
      setClubs([]);
      setEvents([]);
      setNoticias([]);
      setPoolMembers([]);
      return;
    }

    const [{ data: clubData }, { data: noticiaData }, { data: memberData }] = await Promise.all([
      ClubesModel.fetchClubesByIglesia(effectiveIglesiaId),
      NoticiasModel.fetchNoticiasByIglesia(effectiveIglesiaId, { showInactive: false }),
      MiembrosModel.fetchMiembrosByIglesia(effectiveIglesiaId, { showInactive: false }),
    ]);

    const clubList = clubData || [];
    setClubs(clubList);
    setNoticias((noticiaData || []).filter(n => n.estado === 'activo'));
    setPoolMembers(memberData || []);

    const eventLists = await Promise.all(
      clubList.map(club =>
        EventosModel.fetchEventosByClub(club.id).then(({ data }) =>
          (data || []).map(evento => ({ ...evento, club_nombre: club.nombre }))
        )
      )
    );
    setEvents(eventLists.flat().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))));
  }, [effectiveIglesiaId]);

  const load = useCallback(async () => {
    if (!effectiveIglesiaId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [{ data, error: loadError }] = await Promise.all([
      SorteosModel.fetchSorteosByIglesia(effectiveIglesiaId),
      loadReferenceData(),
    ]);

    if (loadError) {
      setError(loadError.message);
      setItems([]);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  }, [effectiveIglesiaId, loadReferenceData]);

  useEffect(() => {
    load();
  }, [load]);

  const loadPoolMembers = useCallback(async (clubId) => {
    if (!effectiveIglesiaId) return;
    if (!clubId) {
      const { data } = await MiembrosModel.fetchMiembrosByIglesia(effectiveIglesiaId, { showInactive: false });
      setPoolMembers(data || []);
      return;
    }
    const { data: rows } = await MiembrosModel.fetchMiembrosByClub(clubId);
    const members = (rows || []).map(row => row.miembros).filter(Boolean);
    setPoolMembers(members);
  }, [effectiveIglesiaId]);

  useEffect(() => {
    if (form.tipo !== SORTEO_TIPO.PERSONALIZADO) return;
    loadPoolMembers(form.club_id || '');
  }, [form.tipo, form.club_id, loadPoolMembers]);

  const buildPreviewPayload = useCallback(() => ({
    tipo: form.tipo,
    iglesiaId: effectiveIglesiaId,
    eventoId: form.evento_id || null,
    loginDesde: form.login_desde_local
      ? datetimeLocalValueToIso(form.login_desde_local, churchTimezone)
      : null,
    loginHasta: form.login_hasta_local
      ? datetimeLocalValueToIso(form.login_hasta_local, churchTimezone)
      : null,
    noticiaId: form.noticia_id || null,
    manualIds: form.manualMemberIds,
  }), [form, effectiveIglesiaId, churchTimezone]);

  const refreshPreview = useCallback(async () => {
    if (!effectiveIglesiaId || !canManage) return;
    setPreviewLoading(true);

    const { data } = await SorteosModel.previewSorteoParticipantes(buildPreviewPayload());
    setPreview(data || { count: 0, participantes: [] });
    setPreviewLoading(false);
  }, [effectiveIglesiaId, canManage, buildPreviewPayload]);

  useEffect(() => {
    if (!showForm || !canManage) return undefined;
    const timer = window.setTimeout(refreshPreview, 350);
    return () => window.clearTimeout(timer);
  }, [showForm, canManage, form, refreshPreview]);

  async function openCreateForm() {
    setEditingId('');
    setForm(emptyForm());
    setFieldErrors({});
    setPreview({ count: 0, participantes: [] });
    setShowForm(true);
  }

  function closeCreateForm() {
    setShowForm(false);
    setEditingId('');
    setForm(emptyForm());
    setFieldErrors({});
  }

  async function openDetail(sorteoId) {
    if (expandedId === sorteoId) {
      setExpandedId('');
      setDetail(null);
      return;
    }

    setExpandedId(sorteoId);
    setDetailLoading(true);
    setCloseForm({ comentarios: '', ganadorIds: [] });

    const { data, error: detailError } = await SorteosModel.fetchSorteoById(sorteoId);
    setDetailLoading(false);

    if (detailError) {
      setError(detailError.message);
      setDetail(null);
      return;
    }

    setDetail(data);
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (!canManage || !effectiveIglesiaId) return;

    const validation = validateForm('sorteo', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError);
      return;
    }

    setSaving(true);
    setError('');

    const { data: sorteoId, error: saveError } = await SorteosModel.saveSorteo({
      id: editingId || null,
      iglesiaId: effectiveIglesiaId,
      titulo: form.titulo,
      descripcion: form.descripcion,
      tipo: form.tipo,
      cantidadGanadores: Number(form.cantidad_ganadores) || 1,
      eventoId: form.evento_id || null,
      loginDesde: form.login_desde_local
        ? datetimeLocalValueToIso(form.login_desde_local, churchTimezone)
        : null,
      loginHasta: form.login_hasta_local
        ? datetimeLocalValueToIso(form.login_hasta_local, churchTimezone)
        : null,
      noticiaId: form.noticia_id || null,
      clubId: form.club_id || null,
      manualIds: form.manualMemberIds,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    closeCreateForm();
    await load();
    if (sorteoId) await openDetail(sorteoId);
  }

  async function handleCloseSorteo(sorteoId) {
    if (!canManage || !sorteoId) return;
    setClosing(true);
    setError('');

    const { error: closeError } = await SorteosModel.closeSorteo({
      sorteoId,
      comentarios: closeForm.comentarios,
      ganadorIds: closeForm.ganadorIds,
    });

    setClosing(false);

    if (closeError) {
      setError(closeError.message);
      return;
    }

    await load();
    await openDetail(sorteoId);
  }

  async function copyParticipantList(participantes) {
    const text = SorteosModel.formatParticipantListForExport(participantes);
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(t('sorteoListCopied'));
      window.setTimeout(() => setCopyNotice(''), 2500);
    } catch {
      setError(t('sorteoListCopyFailed'));
    }
  }

  function toggleManualMember(miembroId) {
    setForm(prev => {
      const set = new Set(prev.manualMemberIds);
      if (set.has(miembroId)) set.delete(miembroId);
      else set.add(miembroId);
      return { ...prev, manualMemberIds: Array.from(set) };
    });
  }

  function addManualMember(miembroId) {
    if (!miembroId) return;
    setForm(prev => {
      const set = new Set(prev.manualMemberIds);
      set.add(miembroId);
      return { ...prev, manualMemberIds: Array.from(set) };
    });
  }

  function removeManualMember(miembroId) {
    setForm(prev => ({
      ...prev,
      manualMemberIds: prev.manualMemberIds.filter(id => id !== miembroId),
    }));
  }

  return {
    canManage,
    iglesiaNombre: assignedIglesiaNombre,
    items: listPagination.pageItems,
    listPagination,
    clubs,
    events,
    noticias,
    poolMembers,
    loading,
    saving,
    previewLoading,
    error,
    fieldErrors,
    showForm,
    openCreateForm,
    closeCreateForm,
    form,
    setForm,
    preview,
    searchQuery,
    setSearchQuery,
    handleSave,
    expandedId,
    openDetail,
    detail,
    detailLoading,
    closeForm,
    setCloseForm,
    closing,
    handleCloseSorteo,
    copyParticipantList,
    copyNotice,
    toggleManualMember,
    addManualMember,
    removeManualMember,
    sorteoParticipantName: SorteosModel.sorteoParticipantName,
    formatParticipantListForExport: SorteosModel.formatParticipantListForExport,
    toLocalDatetimeInput: iso => toLocalDatetimeInput(iso, churchTimezone),
    t,
    language,
  };
}
