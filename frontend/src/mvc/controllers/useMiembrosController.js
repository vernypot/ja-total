import { useEffect, useState, useContext, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageMembers } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { clubDisplayName } from '../../utils/club';
import * as MiembrosModel from '../models/miembros.model';
import * as MiembrosFiltersModel from '../models/miembrosFilters.model';
import * as IglesiasModel from '../models/iglesias.model';
import * as ClubesModel from '../models/clubes.model';
import * as CargosModel from '../models/cargos.model';
import * as ClasesModel from '../models/clases.model';
import * as EspecialidadesModel from '../models/especialidades.model';
import * as EventosModel from '../models/eventos.model';
import {
  downloadMemberTemplate,
  parseMemberSpreadsheet,
  validateMemberRows,
} from '../../utils/memberBulkUpload';

export function useMiembrosController() {
  const { user, userData } = useContext(AuthContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const {
    effectiveIglesiaId,
    canSwitchIglesia,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    assignedIglesiaNombre,
  } = useScopedIglesia();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clubId = params.get('club') || activeClub?.id;
  const userRole = getUserRole(user, userData);
  const canManage = canManageMembers(userRole);
  const fileInputRef = useRef(null);

  const [data, setData] = useState([]);
  const [clubsData, setClubsData] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [hideBoardMembers, setHideBoardMembers] = useState(false);
  const [boardMemberIds, setBoardMemberIds] = useState([]);
  const [activeIglesiaData, setActiveIglesiaData] = useState(null);

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [assigningKey, setAssigningKey] = useState(null);
  const [assignmentError, setAssignmentError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkActionMessage, setBulkActionMessage] = useState('');
  const [bulkActionError, setBulkActionError] = useState('');
  const [bulkClubId, setBulkClubId] = useState('');
  const [memberFilters, setMemberFilters] = useState({ ...MiembrosFiltersModel.EMPTY_MEMBER_FILTERS });
  const [filterMemberIds, setFilterMemberIds] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [filterClases, setFilterClases] = useState([]);
  const [filterEspecialidades, setFilterEspecialidades] = useState([]);
  const [filterEventos, setFilterEventos] = useState([]);
  const [filterRequisitos, setFilterRequisitos] = useState([]);
  const [tiposClub, setTiposClub] = useState([]);

  const clubTipoId = activeClub?.tipo_id || clubsData.find(c => c.id === clubId)?.tipo_id || null;

  const scopedFilterClases = useMemo(() => {
    if (!clubTipoId) return filterClases;
    return ClasesModel.filterClasesByTipo(filterClases, clubTipoId, tiposClub);
  }, [filterClases, clubTipoId, tiposClub]);

  const scopedFilterEspecialidades = useMemo(() => {
    if (!clubTipoId) return filterEspecialidades;
    return EspecialidadesModel.filterEspecialidadesByTipo(filterEspecialidades, clubTipoId, tiposClub);
  }, [filterEspecialidades, clubTipoId, tiposClub]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (memberFilters.claseId) count += 1;
    if (memberFilters.claseId && memberFilters.claseEstadoProgreso) count += 1;
    if (memberFilters.requisitoId) count += 1;
    if (memberFilters.minAge !== '' && memberFilters.minAge != null) count += 1;
    if (memberFilters.maxAge !== '' && memberFilters.maxAge != null) count += 1;
    if (memberFilters.especialidadId) count += 1;
    if (memberFilters.eventoId) count += 1;
    return count;
  }, [memberFilters]);

  const filteredData = useMemo(() => {
    const searched = filterBySearch(data, searchQuery, m => [
      m.nombre,
      m.apellido1,
      m.apellido2,
      m.nombre_opcional,
      m.apellido_opcional,
      m.documento,
      m.celular,
      m.email,
    ]);

    let rows = searched;

    if (hideBoardMembers && boardMemberIds.length > 0) {
      const hideSet = new Set(boardMemberIds);
      rows = rows.filter(m => !hideSet.has(m.id));
    }

    if (MiembrosFiltersModel.hasActiveMemberFilters(memberFilters)) {
      const needsRemoteFilter = Boolean(
        memberFilters.claseId
        || memberFilters.especialidadId
        || memberFilters.eventoId,
      );

      if (needsRemoteFilter && !filterLoading && filterMemberIds) {
        rows = rows.filter(m => filterMemberIds.has(m.id));
      }

      const hasAgeFilter = memberFilters.minAge !== '' || memberFilters.maxAge !== '';
      if (hasAgeFilter) {
        rows = rows.filter(m => MiembrosFiltersModel.memberMatchesAgeRange(
          m,
          memberFilters.minAge,
          memberFilters.maxAge,
        ));
      }
    }

    return rows;
  }, [data, searchQuery, hideBoardMembers, boardMemberIds, memberFilters, filterMemberIds, filterLoading]);

  async function load() {
    if (!effectiveIglesiaId) {
      setData([]);
      return;
    }

    const { data: rows, error } = await MiembrosModel.fetchMiembrosByIglesia(effectiveIglesiaId, {
      clubFilter: clubId || undefined,
      showInactive,
    });

    if (error) {
      console.error('Error loading members:', error);
      setData([]);
      return;
    }
    setData(rows || []);
  }

  async function loadBoardMemberIds() {
    if (!effectiveIglesiaId || !clubsData.length) {
      setBoardMemberIds([]);
      return;
    }

    const { memberIds, error } = await CargosModel.fetchDirectivaMemberIds(clubsData, {
      clubFilter: clubId || undefined,
    });

    if (error) {
      console.error('Error loading board members:', error);
      setBoardMemberIds([]);
      return;
    }

    setBoardMemberIds(memberIds || []);
  }

  async function loadIglesias() {
    if (!effectiveIglesiaId) {
      setActiveIglesiaData(null);
      return;
    }

    const { data: igData } = await IglesiasModel.fetchIglesiaById(effectiveIglesiaId);
    setActiveIglesiaData(igData || (assignedIglesiaNombre ? { id: effectiveIglesiaId, nombre: assignedIglesiaNombre } : null));
  }

  async function loadClubs() {
    if (effectiveIglesiaId) {
      const { data: clubData } = await ClubesModel.fetchClubesByIglesia(effectiveIglesiaId);
      setClubsData(clubData || []);

      if (clubId && clubData?.length) {
        const club = clubData.find(c => c.id === clubId);
        if (club) {
          updateActiveClub(club);
        } else if (!canSwitchIglesia) {
          navigate('/dashboard/miembros', { replace: true });
        }
      }
    } else {
      setClubsData([]);
    }
  }

  async function loadFilterCatalogs() {
    if (!effectiveIglesiaId) {
      setFilterClases([]);
      setFilterEspecialidades([]);
      setFilterEventos([]);
      setTiposClub([]);
      return;
    }

    const [
      { data: clasesRows },
      { data: tiposRows },
      { data: espCatalog },
      { data: clubRows },
    ] = await Promise.all([
      ClasesModel.fetchClasesProgresivas({ showInactive: false }),
      ClasesModel.fetchTiposClub(),
      EspecialidadesModel.fetchEspecialidadesCatalogSorted({ showInactive: false }),
      ClubesModel.fetchClubesByIglesia(effectiveIglesiaId),
    ]);

    setFilterClases(clasesRows || []);
    setTiposClub(tiposRows || []);
    setFilterEspecialidades(espCatalog?.data || []);

    const clubs = clubRows || [];
    const targetClubs = clubId ? clubs.filter(c => c.id === clubId) : clubs;
    const eventoResults = await Promise.all(
      targetClubs.map(async club => {
        const { data } = await EventosModel.fetchEventosByClub(club.id, { showInactive: false });
        return (data || []).map(evento => ({
          ...evento,
          clubNombre: clubDisplayName(club),
        }));
      }),
    );

    const eventos = eventoResults
      .flat()
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));

    setFilterEventos(eventos);
  }

  async function loadFilterRequisitos(claseId) {
    if (!claseId) {
      setFilterRequisitos([]);
      return;
    }

    const { data } = await ClasesModel.fetchRequisitosByClase(claseId);
    setFilterRequisitos(data || []);
  }

  const updateMemberFilters = useCallback((patch) => {
    setMemberFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const clearMemberFilters = useCallback(() => {
    setMemberFilters({ ...MiembrosFiltersModel.EMPTY_MEMBER_FILTERS });
    setFilterError('');
  }, []);

  function clearMemberSelection() {
    setSelectedMemberIds([]);
  }

  function toggleMemberSelection(memberId) {
    setSelectedMemberIds(prev => (
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    ));
  }

  function selectAllMembers() {
    setSelectedMemberIds(filteredData.map(m => m.id));
  }

  async function bulkSetEstado(estado, t) {
    if (!canManage || selectedMemberIds.length === 0) return;

    const successKey = estado === 'activo' ? 'bulkActionActivatedSuccess' : 'bulkActionDeactivatedSuccess';
    const confirmKey = estado === 'activo' ? 'bulkConfirmActivate' : 'bulkConfirmDeactivate';
    const confirmed = window.confirm(
      t(confirmKey).replace('{count}', String(selectedMemberIds.length))
    );
    if (!confirmed) return;

    setBulkUpdating(true);
    setBulkActionMessage('');
    setBulkActionError('');

    const errors = [];
    for (const id of selectedMemberIds) {
      const { error } = await MiembrosModel.updateMiembroEstado(id, estado);
      if (error) errors.push(error.message);
    }

    setBulkUpdating(false);

    if (errors.length > 0) {
      setBulkActionError(t('bulkActionError'));
      return;
    }

    setBulkActionMessage(t(successKey).replace('{count}', String(selectedMemberIds.length)));
    clearMemberSelection();
    load();
  }

  async function bulkAssignClub(t) {
    if (!canManage || selectedMemberIds.length === 0 || !bulkClubId) return;

    const club = clubsData.find(c => c.id === bulkClubId);
    const clubName = club?.nombre || '';
    const confirmed = window.confirm(
      t('bulkConfirmAssignClub')
        .replace('{count}', String(selectedMemberIds.length))
        .replace('{club}', clubName)
    );
    if (!confirmed) return;

    setBulkUpdating(true);
    setBulkActionMessage('');
    setBulkActionError('');

    const errors = [];
    for (const id of selectedMemberIds) {
      const { error } = await MiembrosModel.assignMiembroToClub(id, bulkClubId);
      if (error) errors.push(error.message);
    }

    setBulkUpdating(false);

    if (errors.length > 0) {
      setBulkActionError(t('bulkActionError'));
      return;
    }

    setBulkActionMessage(
      t('bulkActionAssignClubSuccess')
        .replace('{count}', String(selectedMemberIds.length))
        .replace('{club}', clubName)
    );
    clearMemberSelection();
    load();
  }

  async function bulkUnassignClub(t) {
    if (!canManage || selectedMemberIds.length === 0 || !bulkClubId) return;

    const club = clubsData.find(c => c.id === bulkClubId);
    const clubName = club?.nombre || '';
    const confirmed = window.confirm(
      t('bulkConfirmUnassignClub')
        .replace('{count}', String(selectedMemberIds.length))
        .replace('{club}', clubName)
    );
    if (!confirmed) return;

    setBulkUpdating(true);
    setBulkActionMessage('');
    setBulkActionError('');

    const errors = [];
    for (const id of selectedMemberIds) {
      const member = data.find(m => m.id === id);
      if (!member?.clubIds?.includes(bulkClubId)) continue;
      const { error } = await MiembrosModel.unassignMiembroFromClub(id, bulkClubId);
      if (error) errors.push(error.message);
    }

    setBulkUpdating(false);

    if (errors.length > 0) {
      setBulkActionError(t('bulkActionError'));
      return;
    }

    setBulkActionMessage(
      t('bulkActionUnassignClubSuccess')
        .replace('{count}', String(selectedMemberIds.length))
        .replace('{club}', clubName)
    );
    clearMemberSelection();
    load();
  }

  async function toggleEstado(miembro) {
    if (!canManage) {
      alert('Solo administradores pueden cambiar estado');
      return;
    }

    const nuevo = miembro.estado === 'activo' ? 'inactivo' : 'activo';
    const { error } = await MiembrosModel.updateMiembroEstado(miembro.id, nuevo);
    if (error) {
      alert('Error updating status');
      return;
    }
    load();
  }

  function navigateToMiembro(id) {
    navigate(`/dashboard/miembro/${id}`);
  }

  function navigateToNewMiembro() {
    navigate(clubId ? `/dashboard/miembro/new?club=${clubId}` : '/dashboard/miembro/new');
  }

  function filterByClub(newClubId) {
    const club = clubsData.find(c => c.id === newClubId);
    if (club) updateActiveClub(club);
    if (newClubId) {
      navigate(`/dashboard/miembros?club=${newClubId}`);
    } else {
      navigate('/dashboard/miembros');
    }
  }

  async function toggleClubAssignment(miembro, clubId, assigned) {
    if (!canManage) return;

    const key = `${miembro.id}-${clubId}`;
    setAssigningKey(key);
    setAssignmentError('');

    const { error } = assigned
      ? await MiembrosModel.assignMiembroToClub(miembro.id, clubId)
      : await MiembrosModel.unassignMiembroFromClub(miembro.id, clubId);

    if (error) {
      setAssignmentError(error.message);
    } else {
      setData(prev => prev.map(row => {
        if (row.id !== miembro.id) return row;
        const clubIds = new Set(row.clubIds || []);
        if (assigned) clubIds.add(clubId);
        else clubIds.delete(clubId);
        return { ...row, clubIds: Array.from(clubIds) };
      }));
      await load();
    }

    setAssigningKey(null);
  }

  function handleDownloadTemplate(t) {
    const activeClub = clubId ? clubsData.find(c => c.id === clubId) : null;
    downloadMemberTemplate({
      t,
      activeClubName: activeClub?.nombre || '',
    });
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setValidationResults(null);
    setBulkMessage('');
    setBulkError('');
  }

  async function handleValidateFile(t) {
    if (!selectedFile) return;

    const activeClub = clubId ? clubsData.find(c => c.id === clubId) : null;
    if (!activeClub) {
      setBulkError(t('bulkSelectClubFirst'));
      return;
    }

    setIsValidating(true);
    setBulkMessage('');
    setBulkError('');
    setValidationResults(null);

    try {
      const { rows, error } = await parseMemberSpreadsheet(selectedFile);
      if (error) {
        setBulkError(t(error));
        return;
      }

      const validation = validateMemberRows(rows, { activeClub, t });
      if (validation.error) {
        setBulkError(t(validation.error));
        return;
      }

      setValidationResults(validation);
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setIsValidating(false);
    }
  }

  async function handleImportMembers(t) {
    if (!validationResults || validationResults.invalidCount > 0) return;

    const validRows = validationResults.results.filter(r => r.valid);
    if (validRows.length === 0) return;

    const confirmed = window.confirm(
      t('bulkConfirmImport').replace('{count}', validRows.length)
    );
    if (!confirmed) return;

    setIsImporting(true);
    setBulkMessage('');
    setBulkError('');

    try {
      const { created, errors } = await MiembrosModel.bulkCreateMiembros(validRows);

      if (errors.length > 0) {
        setBulkError(`${t('bulkImportError')}: ${errors.map(e => `Row ${e.rowNumber}: ${e.message}`).join('; ')}`);
      }

      if (created.length > 0) {
        setBulkMessage(t('bulkImportSuccess').replace('{count}', created.length));
        setSelectedFile(null);
        setValidationResults(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
      }
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setIsImporting(false);
    }
  }

  function clearBulkUpload() {
    setSelectedFile(null);
    setValidationResults(null);
    setBulkMessage('');
    setBulkError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  useEffect(() => { load(); }, [clubId, showInactive, effectiveIglesiaId]);
  useEffect(() => { loadIglesias(); loadClubs(); loadFilterCatalogs(); }, [effectiveIglesiaId, clubId]);
  useEffect(() => { loadFilterRequisitos(memberFilters.claseId); }, [memberFilters.claseId]);
  useEffect(() => { loadBoardMemberIds(); }, [clubsData, clubId, effectiveIglesiaId]);

  useEffect(() => {
    if (!MiembrosFiltersModel.hasActiveMemberFilters(memberFilters)) {
      setFilterMemberIds(null);
      setFilterError('');
      setFilterLoading(false);
      return undefined;
    }

    const needsRemoteFilter = Boolean(
      memberFilters.claseId
      || memberFilters.especialidadId
      || memberFilters.eventoId,
    );

    if (!needsRemoteFilter) {
      setFilterMemberIds(null);
      setFilterError('');
      setFilterLoading(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setFilterLoading(true);
      setFilterError('');

      try {
        const sets = [];

        const claseFilterOptions = {
          estadoProgreso: memberFilters.claseEstadoProgreso || '',
        };

        if (memberFilters.claseId && memberFilters.requisitoId) {
          const { memberIds, error } = await MiembrosFiltersModel.fetchMemberIdsWithCompletedRequisito(
            memberFilters.claseId,
            memberFilters.requisitoId,
            claseFilterOptions,
          );
          if (error) throw error;
          sets.push(new Set(memberIds));
        } else if (memberFilters.claseId) {
          const { memberIds, error } = await MiembrosFiltersModel.fetchMemberIdsAssignedToClase(
            memberFilters.claseId,
            claseFilterOptions,
          );
          if (error) throw error;
          sets.push(new Set(memberIds));
        }

        if (memberFilters.especialidadId) {
          const { memberIds, error } = await MiembrosFiltersModel.fetchMemberIdsWithEspecialidad(
            memberFilters.especialidadId,
          );
          if (error) throw error;
          sets.push(new Set(memberIds));
        }

        if (memberFilters.eventoId) {
          const { memberIds, error } = await MiembrosFiltersModel.fetchMemberIdsAttendedEvento(
            memberFilters.eventoId,
          );
          if (error) throw error;
          sets.push(new Set(memberIds));
        }

        if (cancelled) return;

        const scopeIds = new Set(data.map(m => m.id));
        let result = scopeIds;
        for (const set of sets) {
          result = new Set([...result].filter(id => set.has(id)));
        }
        setFilterMemberIds(result);
      } catch (err) {
        if (!cancelled) {
          setFilterError(err?.message || String(err));
          setFilterMemberIds(new Set());
        }
      } finally {
        if (!cancelled) setFilterLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [memberFilters, data]);
  useEffect(() => {
    setSelectedMemberIds(prev => prev.filter(id => filteredData.some(m => m.id === id)));
  }, [filteredData]);
  useEffect(() => {
    if (clubId) {
      setBulkClubId(clubId);
    }
  }, [clubId]);
  useEffect(() => {
    if (clubId && clubsData.length > 0) {
      const club = clubsData.find(c => c.id === clubId);
      if (club && activeClub?.id !== club.id) {
        updateActiveClub(club);
      }
    }
  }, [clubId, clubsData]);

  return {
    data: filteredData,
    searchQuery,
    setSearchQuery,
    clubsData,
    showInactive,
    setShowInactive,
    hideBoardMembers,
    setHideBoardMembers,
    activeIglesiaData,
    iglesiaScopeReady: canSwitchIglesia || (hasIglesiaAssignment && assignedIglesiaActive),
    clubId,
    activeClub,
    canManage,
    toggleEstado,
    navigateToMiembro,
    navigateToNewMiembro,
    filterByClub,
    toggleClubAssignment,
    assigningKey,
    assignmentError,
    showBulkUpload,
    setShowBulkUpload,
    fileInputRef,
    selectedFile,
    handleFileSelect,
    handleDownloadTemplate,
    handleValidateFile,
    handleImportMembers,
    clearBulkUpload,
    validationResults,
    bulkMessage,
    bulkError,
    isValidating,
    isImporting,
    selectedMemberIds,
    toggleMemberSelection,
    selectAllMembers,
    clearMemberSelection,
    bulkUpdating,
    bulkActionMessage,
    bulkActionError,
    bulkClubId,
    setBulkClubId,
    bulkActivate: t => bulkSetEstado('activo', t),
    bulkDeactivate: t => bulkSetEstado('inactivo', t),
    bulkAssignClub,
    bulkUnassignClub,
    memberFilters,
    updateMemberFilters,
    clearMemberFilters,
    filterLoading,
    filterError,
    activeFilterCount,
    filterClases: scopedFilterClases,
    filterRequisitos,
    filterEspecialidades: scopedFilterEspecialidades,
    filterEventos,
  };
}
