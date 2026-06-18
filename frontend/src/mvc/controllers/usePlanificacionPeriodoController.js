import { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import * as PlanModel from '../models/planificacion.model';
import * as ClasesModel from '../models/clases.model';
import * as ClubesModel from '../models/clubes.model';
import * as TiposEventoModel from '../models/tiposEvento.model';
import { printPlanPeriodo } from '../../utils/printPlanPeriodo';

const emptyForm = () => ({
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  num_reuniones: '8',
  notas: '',
  claseIds: [],
});

export function usePlanificacionPeriodoController() {
  const { user, userData } = useContext(AuthContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId, canSwitchIglesia, hasIglesiaAssignment, assignedIglesiaActive } = useScopedIglesia();
  const userRole = getUserRole(user, userData);
  const canManage = canManageClubs(userRole);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedClub = params.get('club');
  const clubId = requestedClub || activeClub?.id || '';

  const [clubs, setClubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [availableClases, setAvailableClases] = useState([]);
  const [expandedPlanId, setExpandedPlanId] = useState('');
  const [planDetail, setPlanDetail] = useState(null);
  const [requisitosPool, setRequisitosPool] = useState([]);
  const [assignmentsByMeeting, setAssignmentsByMeeting] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState('');
  const [planForm, setPlanForm] = useState(emptyForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [printPayload, setPrintPayload] = useState(null);
  const [printingPlanId, setPrintingPlanId] = useState('');

  const activeClubData = useMemo(
    () => clubs.find(c => c.id === clubId) || (activeClub?.id === clubId ? activeClub : null),
    [clubs, clubId, activeClub]
  );

  const filteredPlans = useMemo(
    () => filterBySearch(plans, searchQuery, p => [p.nombre, p.fecha_inicio, p.fecha_fin]),
    [plans, searchQuery]
  );

  const assignedIds = useMemo(
    () => PlanModel.getAssignedRequisitoIdsFromMap(assignmentsByMeeting),
    [assignmentsByMeeting]
  );

  const unassignedRequisitos = useMemo(
    () => requisitosPool.filter(r => !assignedIds.has(r.id)),
    [requisitosPool, assignedIds]
  );

  const groupedUnassignedPool = useMemo(
    () => ClasesModel.groupRequisitosByClaseAndSeccion(unassignedRequisitos, planDetail?.clases || []),
    [unassignedRequisitos, planDetail?.clases]
  );

  async function loadClubs() {
    const { data, error: clubsError } = await ClubesModel.fetchClubes({
      iglesiaId: effectiveIglesiaId,
      showInactive: false,
    });
    if (clubsError) {
      setError('Error loading clubs: ' + clubsError.message);
      return;
    }
    setClubs(data || []);
  }

  async function loadAvailableClases() {
    if (!clubId) {
      setAvailableClases([]);
      return;
    }
    const { data: club } = await ClubesModel.fetchClubById(clubId);
    const tipoId = club?.tipo_id || activeClubData?.tipo_id;
    const [{ data: allClases }, { data: tipos }] = await Promise.all([
      ClasesModel.fetchClasesProgresivas({ showInactive: false }),
      ClasesModel.fetchTiposClub(),
    ]);
    setAvailableClases(ClasesModel.filterClasesByTipo(allClases || [], tipoId, tipos || []));
  }

  async function loadPlans() {
    if (!clubId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: plansError } = await PlanModel.fetchPlansByClub(clubId, { showInactive });
    if (plansError) {
      setError('Error loading plans: ' + plansError.message);
      setPlans([]);
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  }

  async function loadPlanDetail(planId) {
    if (!planId) {
      setPlanDetail(null);
      setRequisitosPool([]);
      setAssignmentsByMeeting({});
      return;
    }
    setDetailLoading(true);
    setError('');
    const detail = await PlanModel.fetchPlanDetail(planId);
    if (detail.error) {
      setError('Error loading plan: ' + detail.error.message);
      setDetailLoading(false);
      return;
    }

    const claseIds = (detail.clases || []).map(c => c.clase_progresiva_id);
    let pool = [];
    if (claseIds.length) {
      const { data: reqs, error: reqError } = await ClasesModel.fetchRequisitosForClases(claseIds);
      if (reqError) {
        setError('Error loading requirements: ' + reqError.message);
      } else {
        const nameByClaseId = {};
        for (const link of detail.clases || []) {
          nameByClaseId[link.clase_progresiva_id] = link.clases_progresivas?.nombre;
        }
        pool = (reqs || []).map(r => ({
          ...r,
          clases_progresivas: {
            id: r.clase_id,
            nombre: nameByClaseId[r.clase_id],
          },
        }));
      }
    }

    setPlanDetail(detail);
    setRequisitosPool(pool);
    setAssignmentsByMeeting(PlanModel.mapAssignmentsByMeeting(detail.assignments));
    setDetailLoading(false);
  }

  function toggleExpandPlan(planId) {
    if (expandedPlanId === planId) {
      setExpandedPlanId('');
      setPlanDetail(null);
      setRequisitosPool([]);
      setAssignmentsByMeeting({});
      return;
    }
    setExpandedPlanId(planId);
    loadPlanDetail(planId);
  }

  function startCreate() {
    setEditingPlanId('');
    setPlanForm(emptyForm());
    setShowForm(true);
  }

  function startEdit(plan) {
    setEditingPlanId(plan.id);
    const claseIds = planDetail?.clases?.map(c => c.clase_progresiva_id).filter(Boolean) || [];
    setPlanForm({
      nombre: plan.nombre || '',
      fecha_inicio: plan.fecha_inicio || '',
      fecha_fin: plan.fecha_fin || '',
      num_reuniones: String(plan.num_reuniones || 8),
      notas: plan.notas || '',
      claseIds: expandedPlanId === plan.id ? claseIds : [],
    });
    if (expandedPlanId !== plan.id) {
      PlanModel.fetchPlanClasses(plan.id).then(({ data }) => {
        setPlanForm(f => ({
          ...f,
          claseIds: (data || []).map(c => c.clase_progresiva_id),
        }));
      });
    }
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingPlanId('');
    setPlanForm(emptyForm());
  }

  async function savePlan() {
    if (!canManage || !clubId) return;
    const nombre = planForm.nombre.trim();
    const numReuniones = Number(planForm.num_reuniones);
    if (!nombre || !planForm.fecha_inicio || !planForm.fecha_fin || !numReuniones || numReuniones < 1) {
      setError('Fill in name, dates, and number of meetings.');
      return;
    }
    if (planForm.fecha_fin < planForm.fecha_inicio) {
      setError('End date must be on or after start date.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      nombre,
      fechaInicio: planForm.fecha_inicio,
      fechaFin: planForm.fecha_fin,
      numReuniones,
      notas: planForm.notas,
    };

    let planId = editingPlanId;
    if (editingPlanId) {
      const { data, error: updateError } = await PlanModel.updatePlan(editingPlanId, payload);
      if (updateError) {
        setError('Error updating plan: ' + updateError.message);
        setSaving(false);
        return;
      }
      planId = data?.id || editingPlanId;
    } else {
      const { data, error: createError } = await PlanModel.createPlan({
        clubId,
        ...payload,
        claseIds: planForm.claseIds,
      });
      if (createError) {
        setError('Error creating plan: ' + createError.message);
        setSaving(false);
        return;
      }
      planId = data?.id;
    }

    if (editingPlanId && planId) {
      const linkError = await PlanModel.setPlanClasses(planId, planForm.claseIds);
      if (linkError) {
        setError('Error updating classes: ' + linkError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    cancelForm();
    await loadPlans();
    if (planId) {
      setExpandedPlanId(planId);
      await loadPlanDetail(planId);
    }
  }

  async function deactivatePlan(planId) {
    if (!canManage) return;
    setError('');
    const { error: deactError } = await PlanModel.deactivatePlan(planId);
    if (deactError) {
      setError('Error deactivating plan: ' + deactError.message);
      return;
    }
    if (expandedPlanId === planId) {
      setExpandedPlanId('');
      setPlanDetail(null);
    }
    loadPlans();
  }

  const assignRequisito = useCallback(async (reunionId, claseRequisitoId) => {
    if (!canManage || !expandedPlanId) return false;
    setError('');

    const requisito = requisitosPool.find(r => r.id === claseRequisitoId);
    if (!requisito) return false;

    const previous = assignmentsByMeeting;
    const orden = (previous[reunionId]?.length || 0) + 1;
    const localRow = PlanModel.buildLocalAssignment(reunionId, requisito, orden);
    setAssignmentsByMeeting(
      PlanModel.moveAssignmentLocal(previous, {
        requisitoId: claseRequisitoId,
        toReunionId: reunionId,
        assignmentRow: localRow,
      })
    );

    const { data, error: assignError } = await PlanModel.assignRequisitoToMeeting(
      reunionId,
      claseRequisitoId,
      orden
    );
    if (assignError) {
      setAssignmentsByMeeting(previous);
      setError('Error assigning requirement: ' + assignError.message);
      return false;
    }

    if (data?.id) {
      setAssignmentsByMeeting(current =>
        PlanModel.moveAssignmentLocal(current, {
          requisitoId: claseRequisitoId,
          toReunionId: reunionId,
          assignmentRow: PlanModel.buildLocalAssignment(reunionId, requisito, data.orden ?? orden, data),
        })
      );
    }

    return true;
  }, [canManage, expandedPlanId, assignmentsByMeeting, requisitosPool]);

  const unassignRequisito = useCallback(async (reunionId, claseRequisitoId) => {
    if (!canManage || !expandedPlanId) return false;
    setError('');

    const previous = assignmentsByMeeting;
    setAssignmentsByMeeting(
      PlanModel.moveAssignmentLocal(previous, { requisitoId: claseRequisitoId })
    );

    const { error: removeError } = await PlanModel.removeRequisitoFromMeeting(reunionId, claseRequisitoId);
    if (removeError) {
      setAssignmentsByMeeting(previous);
      setError('Error removing requirement: ' + removeError.message);
      return false;
    }

    return true;
  }, [canManage, expandedPlanId, assignmentsByMeeting]);

  const updateMeeting = useCallback(async (reunionId, { titulo, tipoEventoId, notas, fecha, hora, lugar }) => {
    if (!canManage) return false;
    setError('');

    const previousReuniones = planDetail?.reuniones || [];
    const currentReunion = previousReuniones.find(reunion => reunion.id === reunionId);
    const matchedTipo = tiposEvento.find(item => item.id === tipoEventoId);

    setPlanDetail(prev => ({
      ...prev,
      reuniones: (prev?.reuniones || []).map(reunion => {
        if (reunion.id !== reunionId) return reunion;
        return {
          ...reunion,
          ...(titulo !== undefined ? { titulo: titulo?.trim() || null } : {}),
          ...(notas !== undefined ? { notas: notas?.trim() || null } : {}),
          ...(fecha !== undefined ? { fecha: fecha || null } : {}),
          ...(hora !== undefined ? { hora: hora || null } : {}),
          ...(lugar !== undefined ? { lugar: lugar?.trim() || null } : {}),
          ...(tipoEventoId !== undefined ? {
            tipo_evento_id: tipoEventoId || null,
            tipos_evento: tipoEventoId && matchedTipo
              ? { id: matchedTipo.id, nombre: matchedTipo.nombre }
              : null,
          } : {}),
        };
      }),
    }));

    const { data, error: updateError } = await PlanModel.updateMeeting(reunionId, {
      titulo,
      tipoEventoId,
      notas,
      fecha,
      hora,
      lugar,
    });
    if (updateError) {
      setPlanDetail(prev => ({ ...prev, reuniones: previousReuniones }));
      setError('Error updating meeting: ' + updateError.message);
      return false;
    }

    let updatedReunion = {
      ...(currentReunion || {}),
      ...(data || {}),
      ...(titulo !== undefined ? { titulo: titulo?.trim() || null } : {}),
      ...(notas !== undefined ? { notas: notas?.trim() || null } : {}),
      ...(fecha !== undefined ? { fecha: fecha || null } : {}),
      ...(hora !== undefined ? { hora: hora || null } : {}),
      ...(lugar !== undefined ? { lugar: lugar?.trim() || null } : {}),
      ...(tipoEventoId !== undefined ? {
        tipo_evento_id: tipoEventoId || null,
        tipos_evento: tipoEventoId && matchedTipo
          ? { id: matchedTipo.id, nombre: matchedTipo.nombre }
          : null,
      } : {}),
    };

    if (!updatedReunion.fecha) {
      const { data: unsynced, error: unsyncError } = await PlanModel.unsyncMeetingFromClubAgenda(updatedReunion);
      if (unsyncError) {
        setPlanDetail(prev => ({ ...prev, reuniones: previousReuniones }));
        setError('Error removing meeting from agenda: ' + unsyncError.message);
        return false;
      }
      updatedReunion = { ...updatedReunion, ...(unsynced || {}), evento_id: null };
    } else if (clubId) {
      const { data: synced, error: syncError } = await PlanModel.syncMeetingToClubAgenda({
        reunion: updatedReunion,
        clubId,
        clubName: activeClubData?.nombre || activeClubData?.clubes?.nombre || '',
      });
      if (syncError) {
        setPlanDetail(prev => ({ ...prev, reuniones: previousReuniones }));
        setError('Error adding meeting to club agenda: ' + syncError.message);
        return false;
      }
      updatedReunion = {
        ...updatedReunion,
        ...(synced?.reunion || {}),
        evento_id: synced?.evento_id || synced?.reunion?.evento_id || updatedReunion.evento_id,
      };
    }

    setPlanDetail(prev => ({
      ...prev,
      reuniones: (prev?.reuniones || []).map(reunion =>
        reunion.id === reunionId ? { ...reunion, ...updatedReunion } : reunion
      ),
    }));

    return true;
  }, [canManage, planDetail?.reuniones, tiposEvento, clubId, activeClubData]);

  function selectClub(id) {
    if (id) navigate(`/dashboard/planificacion?club=${id}`);
    else navigate('/dashboard/planificacion');
  }

  async function printPlan(planId) {
    if (!clubId || !planId) return;
    setPrintingPlanId(planId);
    setError('');
    const result = await PlanModel.fetchPlanPrintPayload(planId, clubId);
    setPrintingPlanId('');
    if (result.error) {
      setError('Error preparing print: ' + result.error.message);
      return;
    }
    setPrintPayload(result);
  }

  useEffect(() => {
    if (!printPayload) return undefined;
    const frame = requestAnimationFrame(() => {
      printPlanPeriodo();
      window.setTimeout(() => setPrintPayload(null), 300);
    });
    return () => cancelAnimationFrame(frame);
  }, [printPayload]);

  useEffect(() => {
    loadClubs();
  }, [effectiveIglesiaId]);

  useEffect(() => {
    if (requestedClub && clubs.some(c => c.id === requestedClub)) {
      updateActiveClub(clubs.find(c => c.id === requestedClub));
    }
  }, [requestedClub, clubs]);

  useEffect(() => {
    loadPlans();
    loadAvailableClases();
  }, [clubId, showInactive]);

  useEffect(() => {
    TiposEventoModel.fetchTiposEvento({ showInactive: false }).then(({ data }) => {
      setTiposEvento(data || []);
    });
  }, []);

  return {
    clubId,
    clubs,
    activeClubData,
    plans: filteredPlans,
    availableClases,
    expandedPlanId,
    planDetail,
    reuniones: planDetail?.reuniones || [],
    assignmentsByMeeting,
    unassignedRequisitos,
    groupedUnassignedPool,
    requisitosPool,
    error,
    loading,
    detailLoading,
    showForm,
    editingPlanId,
    planForm,
    setPlanForm,
    searchQuery,
    setSearchQuery,
    showInactive,
    setShowInactive,
    saving,
    canManage,
    canSwitchIglesia,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    effectiveIglesiaId,
    startCreate,
    startEdit,
    cancelForm,
    savePlan,
    deactivatePlan,
    toggleExpandPlan,
    assignRequisito,
    unassignRequisito,
    updateMeeting,
    tiposEvento,
    printPlan,
    printPayload,
    printingPlanId,
    selectClub,
    assignedCount: PlanModel.countAssignedRequisitos(assignmentsByMeeting),
    poolCount: requisitosPool.length,
  };
}
