import { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageMembers } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import * as MiembrosModel from '../models/miembros.model';
import * as IglesiasModel from '../models/iglesias.model';
import * as ClubesModel from '../models/clubes.model';
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

  const filteredData = useMemo(
    () => filterBySearch(data, searchQuery, m => [
      m.nombre,
      m.apellido1,
      m.apellido2,
      m.documento,
      m.celular,
      m.email,
    ]),
    [data, searchQuery]
  );

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
    navigate('/dashboard/miembro/new');
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
  useEffect(() => { loadIglesias(); loadClubs(); }, [effectiveIglesiaId, clubId]);
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
  };
}
