import { useEffect, useState, useMemo, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as ClasesModel from '../models/clases.model';
import * as MiembrosModel from '../models/miembros.model';

function getClaseFromLink(row) {
  return row.clases_progresivas || null;
}

function getLinkClaseId(row) {
  return row.clase_progresiva_id || row.clase_id || row.clases_progresivas?.id;
}

function userDisplayName(userData) {
  if (!userData) return '';
  return [userData.nombre, userData.apellido1, userData.apellido2].filter(Boolean).join(' ');
}

export function useMiembroClasesController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));
  const defaultValidatorName = userDisplayName(userData);
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [requisitosByClase, setRequisitosByClase] = useState({});
  const [completionsByAssignment, setCompletionsByAssignment] = useState({});
  const [memberTipos, setMemberTipos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClaseId, setSelectedClaseId] = useState('');
  const [savingRequisitoKey, setSavingRequisitoKey] = useState(null);
  const [savingAssignmentId, setSavingAssignmentId] = useState(null);

  const assignedIds = useMemo(
    () => new Set(assigned.map(row => getLinkClaseId(row)).filter(Boolean)),
    [assigned]
  );

  const unassigned = useMemo(
    () => available.filter(c => !assignedIds.has(c.id)),
    [available, assignedIds]
  );

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const [
      { data: assignedRows, error: assignedError },
      { tipoIds, tipos, error: tiposError },
      { data: tiposClub },
      { data: allClases, error: clasesError },
    ] = await Promise.all([
      ClasesModel.fetchMiembroClases(miembroId),
      MiembrosModel.fetchMiembroClubTipoIds(miembroId),
      ClasesModel.fetchTiposClub(),
      ClasesModel.fetchClasesProgresivas({ showInactive: false }),
    ]);

    if (assignedError) {
      setError('Error loading member classes: ' + assignedError.message);
      setLoading(false);
      return;
    }
    if (tiposError) {
      setError('Error loading member clubs: ' + tiposError.message);
      setLoading(false);
      return;
    }
    if (clasesError) {
      setError('Error loading classes: ' + clasesError.message);
      setLoading(false);
      return;
    }

    const filtered = ClasesModel.filterClasesByTipos(allClases || [], tipoIds, tiposClub || []);
    setAssigned(assignedRows || []);
    setAvailable(filtered);
    setMemberTipos(tipos);

    const assignmentIds = (assignedRows || []).map(row => row.id).filter(Boolean);
    if (assignmentIds.length) {
      await Promise.all(
        assignmentIds.map(id => ClasesModel.initMiembroClaseRequisitos(id))
      );
    }

    const claseIds = [
      ...new Set([
        ...filtered.map(c => c.id),
        ...(assignedRows || []).map(getLinkClaseId).filter(Boolean),
      ]),
    ];
    if (claseIds.length) {
      const [{ data: reqs }, { data: completionRows, error: completionError }] = await Promise.all([
        ClasesModel.fetchRequisitosForClases(claseIds),
        assignmentIds.length
          ? ClasesModel.fetchMiembroClaseRequisitos(assignmentIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (completionError) {
        setError('Error loading requirement progress: ' + completionError.message);
      }

      const map = {};
      for (const r of reqs || []) {
        if (!map[r.clase_id]) map[r.clase_id] = [];
        map[r.clase_id].push(r);
      }
      setRequisitosByClase(map);
      setCompletionsByAssignment(ClasesModel.mapCompletionsByAssignment(completionRows));
    } else {
      setRequisitosByClase({});
      setCompletionsByAssignment({});
    }

    setLoading(false);
  }

  async function assignClase() {
    if (!canManage || !selectedClaseId) return;
    setError('');
    const { error: assignError } = await ClasesModel.assignClaseToMiembro(miembroId, selectedClaseId);
    if (assignError) {
      setError('Error assigning class: ' + assignError.message);
      return;
    }
    setSelectedClaseId('');
    load();
  }

  async function unassignClase(linkId) {
    if (!canManage) return;
    setError('');
    const { error: unassignError } = await ClasesModel.unassignClaseFromMiembro(linkId);
    if (unassignError) {
      setError('Error deactivating class: ' + unassignError.message);
      return;
    }
    load();
  }

  const saveRequisitoCompletion = useCallback(async (assignmentId, claseRequisitoId, draft) => {
    if (!canManage || !assignmentId) return;
    setError('');
    setSavingRequisitoKey(`${assignmentId}:${claseRequisitoId}`);

    const { data, error: saveError } = await ClasesModel.upsertMiembroClaseRequisito({
      assignmentId,
      claseRequisitoId,
      completado: draft.completado,
      fechaCompletado: draft.completado ? (draft.fecha_completado || null) : null,
      validadoPorUsuarioId: userData?.id || user?.id || null,
      validadoPorNombre: draft.validado_por_nombre?.trim() || null,
      comentarios: draft.comentarios?.trim() || null,
      textoReemplazo: draft.texto_reemplazo?.trim() || null,
      usarTextoAlternativo: draft.usar_texto_alternativo || false,
    });

    setSavingRequisitoKey(null);

    if (saveError) {
      setError('Error saving requirement: ' + saveError.message);
      return false;
    }

    if (data) {
      setCompletionsByAssignment(prev => ({
        ...prev,
        [assignmentId]: {
          ...(prev[assignmentId] || {}),
          [claseRequisitoId]: data,
        },
      }));
    }

    return true;
  }, [canManage, user?.id, userData?.id]);

  const saveAssignmentProgress = useCallback(async (assignmentId, draft) => {
    if (!canManage || !assignmentId) return false;
    setError('');
    setSavingAssignmentId(assignmentId);

    const { data, error: saveError } = await ClasesModel.updateMiembroClaseProgresiva(assignmentId, {
      completado: draft.completado,
      fechaCompletado: draft.completado ? (draft.fecha_completado || null) : null,
      tieneInvestidura: draft.tiene_investidura,
      investiduraFecha: draft.tiene_investidura ? (draft.investidura_fecha || null) : null,
      investiduraLugar: draft.tiene_investidura ? (draft.investidura_lugar?.trim() || null) : null,
      investiduraValidadoPorUsuarioId: draft.tiene_investidura ? (userData?.id || user?.id || null) : null,
      investiduraValidadoPorNombre: draft.tiene_investidura
        ? (draft.investidura_validado_por_nombre?.trim() || null)
        : null,
    });

    setSavingAssignmentId(null);

    if (saveError) {
      setError('Error saving class progress: ' + saveError.message);
      return false;
    }

    if (data) {
      setAssigned(prev => prev.map(row => (row.id === assignmentId ? { ...row, ...data } : row)));
    }

    return true;
  }, [canManage, user?.id, userData?.id]);

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    assigned,
    unassigned,
    requisitosByClase,
    completionsByAssignment,
    memberTipos,
    error,
    loading,
    selectedClaseId,
    setSelectedClaseId,
    assignClase,
    unassignClase,
    saveRequisitoCompletion,
    saveAssignmentProgress,
    savingRequisitoKey,
    savingAssignmentId,
    canManage,
    defaultValidatorName,
    getClaseFromLink,
    getLinkClaseId,
  };
}
