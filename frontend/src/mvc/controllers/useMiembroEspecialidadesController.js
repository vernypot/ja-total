import { useEffect, useState, useMemo, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData, canRequestMemberApprovalFor } from '../../utils/permissions';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useListPagination } from '../../hooks/useListPagination';
import * as EspecialidadesModel from '../models/especialidades.model';
import * as MiembrosModel from '../models/miembros.model';
import { fetchTiposClub } from '../models/clases.model';

function getEspecialidadFromLink(row) {
  return row.especialidades || null;
}

function getLinkEspecialidadId(row) {
  return row.especialidad_id || row.especialidades?.id;
}

function userDisplayName(userData) {
  if (!userData) return '';
  return [userData.nombre, userData.apellido1, userData.apellido2].filter(Boolean).join(' ');
}

export function useMiembroEspecialidadesController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const { linkedMiembroId } = useDashboardAuth();
  const role = getUserRole(user, userData);
  const canManage = canManageChurchData(role);
  const canRequestApproval = canRequestMemberApprovalFor(role, miembroId, linkedMiembroId);
  const defaultValidatorName = userDisplayName(userData);
  const [assigned, setAssigned] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [requisitosByEsp, setRequisitosByEsp] = useState({});
  const [completionsByAssignment, setCompletionsByAssignment] = useState({});
  const [memberTipos, setMemberTipos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEspecialidadId, setSelectedEspecialidadId] = useState('');
  const [secciones, setSecciones] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [reviewingSolicitudId, setReviewingSolicitudId] = useState(null);
  const [savingRequisitoKey, setSavingRequisitoKey] = useState(null);
  const [savingAssignmentId, setSavingAssignmentId] = useState(null);
  const [requestingKey, setRequestingKey] = useState(null);

  const solicitudesByAssignment = useMemo(
    () => EspecialidadesModel.mapSolicitudesByAssignment(solicitudes),
    [solicitudes]
  );

  const assignedIds = useMemo(
    () => new Set(assigned.map(row => getLinkEspecialidadId(row)).filter(Boolean)),
    [assigned]
  );

  const unassigned = useMemo(
    () => EspecialidadesModel.filterAssignableEspecialidades(
      catalog.filter(e => !assignedIds.has(e.id)),
      requisitosByEsp
    ),
    [catalog, assignedIds, requisitosByEsp]
  );

  const {
    pageItems: paginatedAssigned,
    ...listPagination
  } = useListPagination(assigned, [miembroId]);

  const {
    pageItems: paginatedUnassigned,
    ...unassignedListPagination
  } = useListPagination(unassigned, [miembroId]);

  const unassignedGrouped = useMemo(() => {
    const sectionCatalog = EspecialidadesModel.collectSeccionesFromEspecialidades(paginatedUnassigned, secciones);
    if (!sectionCatalog.length && !paginatedUnassigned.some(e => e.seccion_id || e.especialidad_secciones?.id)) {
      return null;
    }
    return EspecialidadesModel.groupEspecialidadesBySeccion(paginatedUnassigned, sectionCatalog);
  }, [paginatedUnassigned, secciones]);

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const [
      { data: assignedRows, error: assignedError },
      { tipoIds, tipos, error: tiposError },
      { data: tiposClub },
      { data: catalogRows, error: catalogError, secciones: seccionesData },
      { data: solicitudRows, error: solicitudesError },
    ] = await Promise.all([
      EspecialidadesModel.fetchMiembroEspecialidades(miembroId),
      MiembrosModel.fetchMiembroClubTipoIds(miembroId),
      fetchTiposClub(),
      EspecialidadesModel.fetchEspecialidadesCatalogSorted({ showInactive: false }),
      canManage || canRequestApproval
        ? EspecialidadesModel.fetchMiembroEspecialidadAprobacionSolicitudes(miembroId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (assignedError) {
      setError('Error loading member specialties: ' + assignedError.message);
      setLoading(false);
      return;
    }
    if (tiposError) {
      setError('Error loading member clubs: ' + tiposError.message);
      setLoading(false);
      return;
    }
    if (catalogError) {
      setError('Error loading specialties: ' + catalogError.message);
      setLoading(false);
      return;
    }
    if (solicitudesError) {
      const permissionDenied = (solicitudesError.message || '').includes('permission denied');
      if (canRequestApproval && permissionDenied) {
        setSolicitudes([]);
      } else {
        setError('Error loading approval requests: ' + solicitudesError.message);
        setLoading(false);
        return;
      }
    } else {
      setSolicitudes(solicitudRows || []);
    }

    const filtered = EspecialidadesModel.filterEspecialidadesByTipos(
      catalogRows || [],
      tipoIds,
      tiposClub || []
    );

    setAssigned(assignedRows || []);
    setCatalog(filtered);
    setMemberTipos(tipos);
    setSecciones(seccionesData || []);

    const assignmentIds = (assignedRows || []).map(row => row.id).filter(Boolean);
    if (assignmentIds.length) {
      await Promise.all(
        assignmentIds.map(id => EspecialidadesModel.initMiembroEspecialidadRequisitos(id))
      );
    }

    const espIds = [
      ...new Set([
        ...filtered.map(e => e.id),
        ...(assignedRows || []).map(getLinkEspecialidadId).filter(Boolean),
      ]),
    ];
    if (espIds.length) {
      const [{ data: reqs }, { data: completionRows, error: completionError }] = await Promise.all([
        EspecialidadesModel.fetchRequisitosForEspecialidades(espIds, { showInactive: true }),
        assignmentIds.length
          ? EspecialidadesModel.fetchMiembroEspecialidadRequisitos(assignmentIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const map = {};
      for (const r of reqs || []) {
        if (!map[r.especialidad_id]) map[r.especialidad_id] = [];
        map[r.especialidad_id].push(r);
      }
      setRequisitosByEsp(map);
      if (completionError) {
        setError('Error loading specialty requirements: ' + completionError.message);
      } else {
        setCompletionsByAssignment(EspecialidadesModel.mapCompletionsByAssignment(completionRows || []));
      }
    } else {
      setRequisitosByEsp({});
      setCompletionsByAssignment({});
    }

    setLoading(false);
  }

  async function assignEspecialidad() {
    if (!canManage || !selectedEspecialidadId) return;
    setError('');
    const { error: assignError } = await EspecialidadesModel.assignEspecialidadToMiembro(
      miembroId,
      selectedEspecialidadId
    );
    if (assignError) {
      setError('Error assigning specialty: ' + assignError.message);
      return;
    }
    setSelectedEspecialidadId('');
    load();
  }

  async function unassignEspecialidad(linkId) {
    if (!canManage) return;
    setError('');
    const { error: unassignError } = await EspecialidadesModel.unassignEspecialidadFromMiembro(linkId);
    if (unassignError) {
      setError('Error removing specialty: ' + unassignError.message);
      return;
    }
    load();
  }

  const saveRequisitoCompletion = useCallback(async (assignmentId, especialidadRequisitoId, draft) => {
    if (!canManage || !assignmentId) return false;
    setError('');
    setSavingRequisitoKey(`${assignmentId}:${especialidadRequisitoId}`);

    const { data, error: saveError } = await EspecialidadesModel.upsertMiembroEspecialidadRequisito({
      assignmentId,
      especialidadRequisitoId,
      completado: draft.completado,
      fechaCompletado: draft.completado ? (draft.fecha_completado || null) : null,
      validadoPorUsuarioId: userData?.id || user?.id || null,
      validadoPorNombre: draft.validado_por_nombre?.trim() || null,
      comentarios: draft.comentarios?.trim() || null,
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
          [especialidadRequisitoId]: data,
        },
      }));
      if (draft.completado) {
        setSolicitudes(prev => prev.map(row => (
          row.miembro_especialidad_id === assignmentId
            && row.especialidad_requisito_id === especialidadRequisitoId
            && row.estado === 'pendiente'
            ? { ...row, estado: 'aprobado' }
            : row
        )));
      }
    }

    return true;
  }, [canManage, user?.id, userData?.id]);

  const saveAssignmentProgress = useCallback(async (assignmentId, draft) => {
    if (!canManage || !assignmentId) return false;
    setError('');
    setSavingAssignmentId(assignmentId);

    const { error: saveError } = await EspecialidadesModel.upsertMiembroEspecialidadProgress({
      assignmentId,
      completado: draft.completado,
      fechaCompletado: draft.completado ? (draft.fecha_completado || null) : null,
      validadoPorUsuarioId: userData?.id || user?.id || null,
      validadoPorNombre: draft.validado_por_nombre?.trim() || null,
      comentarios: draft.comentarios?.trim() || null,
    });

    setSavingAssignmentId(null);

    if (saveError) {
      setError('Error saving specialty: ' + saveError.message);
      return false;
    }

    await load();
    return true;
  }, [canManage, user?.id, userData?.id]);

  const reviewSolicitud = useCallback(async (solicitudId, aprobar, comentarioLider = null) => {
    if (!canManage || !solicitudId) return false;
    setError('');
    setReviewingSolicitudId(solicitudId);

    const { error: reviewError } = await EspecialidadesModel.reviewMiembroEspecialidadAprobacionSolicitud({
      solicitudId,
      aprobar,
      comentarioLider,
      revisorUsuarioId: userData?.id || user?.id || null,
      revisorNombre: defaultValidatorName || null,
    });

    setReviewingSolicitudId(null);

    if (reviewError) {
      setError('Error reviewing approval request: ' + reviewError.message);
      return false;
    }

    await load();
    return true;
  }, [canManage, defaultValidatorName, user?.id, userData?.id]);

  const requestRequisitoApproval = useCallback(async (assignmentId, especialidadRequisitoId, comentario) => {
    if (!canRequestApproval || !miembroId || !assignmentId || !especialidadRequisitoId) return false;
    setError('');
    setRequestingKey(`${assignmentId}:${especialidadRequisitoId}`);

    const { error: requestError } = await EspecialidadesModel.staffRequestEspecialidadRequisitoApproval(
      miembroId,
      assignmentId,
      especialidadRequisitoId,
      comentario
    );

    setRequestingKey(null);

    if (requestError) {
      setError('Error requesting approval: ' + requestError.message);
      return false;
    }

    await load();
    return true;
  }, [canRequestApproval, miembroId]);

  const requestEspecialidadApproval = useCallback(async (assignmentId, comentario) => {
    if (!canRequestApproval || !miembroId || !assignmentId) return false;
    setError('');
    setRequestingKey(`${assignmentId}:especialidad`);

    const { error: requestError } = await EspecialidadesModel.staffRequestEspecialidadApproval(
      miembroId,
      assignmentId,
      comentario
    );

    setRequestingKey(null);

    if (requestError) {
      setError('Error requesting approval: ' + requestError.message);
      return false;
    }

    await load();
    return true;
  }, [canRequestApproval, miembroId]);

  useEffect(() => {
    load();
  }, [miembroId, linkedMiembroId]);

  return {
    assigned: paginatedAssigned,
    unassigned: paginatedUnassigned,
    listPagination,
    unassignedListPagination,
    unassignedGrouped,
    requisitosByEsp,
    completionsByAssignment,
    solicitudes,
    solicitudesByAssignment,
    reviewSolicitud,
    reviewingSolicitudId,
    requestRequisitoApproval: canRequestApproval ? requestRequisitoApproval : null,
    requestEspecialidadApproval: canRequestApproval ? requestEspecialidadApproval : null,
    requestingKey,
    saveRequisitoCompletion,
    saveAssignmentProgress,
    savingRequisitoKey,
    savingAssignmentId,
    memberTipos,
    error,
    loading,
    selectedEspecialidadId,
    setSelectedEspecialidadId,
    assignEspecialidad,
    unassignEspecialidad,
    canManage,
    canRequestApproval,
    defaultValidatorName,
    getEspecialidadFromLink,
    getLinkEspecialidadId,
  };
}
