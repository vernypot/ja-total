import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { applyMiembroClaseProgresoEstadoToDraft } from '../../constants/miembroClaseProgresoEstado';
import * as ClasesModel from '../models/clases.model';
import * as EspecialidadesModel from '../models/especialidades.model';
import * as MiembrosModel from '../models/miembros.model';
import * as EventosModel from '../models/eventos.model';

const ACTION_TYPES = ['requisito', 'seccion', 'especialidad', 'investidura', 'asignar_clase'];

function userDisplayName(userData) {
  if (!userData) return '';
  return [userData.nombre, userData.apellido1, userData.apellido2].filter(Boolean).join(' ');
}

function createBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyBlock() {
  return {
    id: createBlockId(),
    actionType: 'requisito',
    claseId: '',
    requisitoId: '',
    seccionId: '',
    especialidadId: '',
    memberIds: [],
  };
}

function sectionTitle(seccion) {
  const roman = seccion?.numero_romano ? `${seccion.numero_romano}. ` : '';
  return `${roman}${seccion?.nombre || ''}`;
}

function requisitoLabel(req) {
  const num = req?.numero != null ? `${req.numero}. ` : '';
  return `${num}${req?.descripcion || ''}`;
}

function requiresExistingClaseAssignment(actionType) {
  return actionType === 'requisito' || actionType === 'seccion';
}

async function buildAssignmentMap(memberIds, claseId) {
  const { data, error } = await ClasesModel.fetchMiembroClaseAssignmentsForMembers(memberIds, claseId);
  if (error) throw error;

  const map = {};
  for (const row of data || []) {
    if (row.miembro_id && row.id) map[row.miembro_id] = row.id;
  }
  return map;
}

export function useBloquesCompletadosController() {
  const { user, userData } = useContext(AuthContext);
  const { activeClub } = useContext(ClubContext);
  const { effectiveIglesiaId } = useScopedIglesia();
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const clubId = params.get('club') || activeClub?.id;
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);
  const defaultValidatorName = userDisplayName(userData);

  const [members, setMembers] = useState([]);
  const [clases, setClases] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [tiposClub, setTiposClub] = useState([]);
  const [requisitosByClase, setRequisitosByClase] = useState({});
  const [seccionesByClase, setSeccionesByClase] = useState({});
  const [blocks, setBlocks] = useState([emptyBlock()]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingBlockId, setApplyingBlockId] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyError, setApplyError] = useState('');
  const [pendingApply, setPendingApply] = useState(null);
  const [validatingApplyBlockId, setValidatingApplyBlockId] = useState(null);

  const clubTipoId = activeClub?.tipo_id || null;

  const filteredMembers = useMemo(() => {
    return filterBySearch(members, searchQuery, m => [
      m.nombre,
      m.apellido1,
      m.apellido2,
      m.documento,
      m.celular,
      m.email,
    ]);
  }, [members, searchQuery]);

  const membersById = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  const scopedClases = useMemo(() => {
    if (!clubTipoId) return clases;
    return ClasesModel.filterClasesByTipo(clases, clubTipoId, tiposClub);
  }, [clases, clubTipoId, tiposClub]);

  const scopedEspecialidades = useMemo(() => {
    if (!clubTipoId) return especialidades;
    return EspecialidadesModel.filterEspecialidadesByTipo(especialidades, clubTipoId, tiposClub);
  }, [especialidades, clubTipoId, tiposClub]);

  const assignedMemberIds = useMemo(() => {
    const ids = new Set();
    for (const block of blocks) {
      for (const id of block.memberIds) ids.add(id);
    }
    return ids;
  }, [blocks]);

  const poolMembers = useMemo(
    () => filteredMembers.filter(m => !assignedMemberIds.has(m.id)),
    [filteredMembers, assignedMemberIds],
  );

  async function ensureClaseCatalog(claseId) {
    if (!claseId || requisitosByClase[claseId]) return;
    const [{ data: reqs }, { data: secciones }] = await Promise.all([
      ClasesModel.fetchRequisitosByClase(claseId),
      ClasesModel.fetchRequisitoSeccionesByClase(claseId),
    ]);
    setRequisitosByClase(prev => ({ ...prev, [claseId]: reqs || [] }));
    setSeccionesByClase(prev => ({ ...prev, [claseId]: secciones || [] }));
  }

  async function load() {
    if (!effectiveIglesiaId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [
      { data: memberRows, error: membersError },
      { data: clasesRows, error: clasesError },
      { data: tiposRows },
      { data: espRows, error: espError },
    ] = await Promise.all([
      MiembrosModel.fetchMiembrosByIglesia(effectiveIglesiaId, {
        clubFilter: clubId || undefined,
        showInactive: false,
      }),
      ClasesModel.fetchClasesProgresivas({ showInactive: false }),
      ClasesModel.fetchTiposClub(),
      EspecialidadesModel.fetchEspecialidadesCatalogSorted({ showInactive: false }),
    ]);

    if (membersError) {
      setError(membersError.message);
      setLoading(false);
      return;
    }
    if (clasesError) {
      setError(clasesError.message);
      setLoading(false);
      return;
    }
    if (espError) {
      setError(espError.message);
      setLoading(false);
      return;
    }

    setMembers(memberRows || []);
    setClases(clasesRows || []);
    setTiposClub(tiposRows || []);
    setEspecialidades(espRows?.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [effectiveIglesiaId, clubId]);

  useEffect(() => {
    const claseIds = new Set();
    for (const block of blocks) {
      if (block.claseId) claseIds.add(block.claseId);
    }
    for (const claseId of claseIds) {
      ensureClaseCatalog(claseId);
    }
  }, [blocks]);

  const updateBlock = useCallback((blockId, patch) => {
    setBlocks(prev => prev.map(b => (b.id === blockId ? { ...b, ...patch } : b)));
  }, []);

  const addBlock = useCallback(() => {
    setBlocks(prev => [...prev, emptyBlock()]);
  }, []);

  const removeBlock = useCallback((blockId) => {
    setBlocks(prev => (prev.length <= 1 ? prev : prev.filter(b => b.id !== blockId)));
  }, []);

  const addMemberToBlock = useCallback((blockId, memberId) => {
    if (!memberId) return;
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      if (b.memberIds.includes(memberId)) return b;
      return { ...b, memberIds: [...b.memberIds, memberId] };
    }));
  }, []);

  const removeMemberFromBlock = useCallback((blockId, memberId) => {
    setBlocks(prev => prev.map(b => (
      b.id === blockId
        ? { ...b, memberIds: b.memberIds.filter(id => id !== memberId) }
        : b
    )));
  }, []);

  async function ensureAssignment(miembroId, claseId) {
    const { data: existing } = await ClasesModel.fetchMiembroClaseAssignmentsForMembers([miembroId], claseId);
    if (existing?.length) return existing[0].id;

    const { error: assignError } = await ClasesModel.assignClaseToMiembro(miembroId, claseId);
    if (assignError) throw assignError;

    const { data: created, error: fetchError } = await ClasesModel.fetchMiembroClaseAssignmentsForMembers(
      [miembroId],
      claseId,
    );
    if (fetchError) throw fetchError;
    if (!created?.length) throw new Error('Could not create class assignment');
    return created[0].id;
  }

  function validateBlock(block) {
    if (!block.memberIds.length) return t('completedBlocksNoMembers');
    if (block.actionType === 'especialidad') {
      if (!block.especialidadId) return t('completedBlocksSelectEspecialidad');
      return null;
    }
    if (!block.claseId) return t('completedBlocksSelectClase');
    if (block.actionType === 'asignar_clase') return null;
    if (block.actionType === 'requisito' && !block.requisitoId) return t('completedBlocksSelectRequisito');
    if (block.actionType === 'seccion' && !block.seccionId) return t('completedBlocksSelectSeccion');
    return null;
  }

  function blockSummary(block) {
    if (block.actionType === 'especialidad') {
      const esp = scopedEspecialidades.find(e => e.id === block.especialidadId);
      return esp?.nombre || t('completedBlocksActionEspecialidad');
    }
    const clase = scopedClases.find(c => c.id === block.claseId);
    const claseName = clase?.nombre || '';
    if (block.actionType === 'asignar_clase') {
      return `${t('completedBlocksActionAsignarClase')}: ${claseName}`;
    }
    if (block.actionType === 'investidura') {
      return `${t('completedBlocksActionInvestidura')}: ${claseName}`;
    }
    if (block.actionType === 'seccion') {
      const seccion = (seccionesByClase[block.claseId] || []).find(s => s.id === block.seccionId);
      return `${sectionTitle(seccion)} (${claseName})`;
    }
    const req = (requisitosByClase[block.claseId] || []).find(r => r.id === block.requisitoId);
    return `${requisitoLabel(req)} (${claseName})`;
  }

  async function applyRequisitosToMember(assignmentId, requisitoIds, fechaCompletado) {
    await ClasesModel.initMiembroClaseRequisitos(assignmentId);
    for (const requisitoId of requisitoIds) {
      const { error } = await ClasesModel.upsertMiembroClaseRequisito({
        assignmentId,
        claseRequisitoId: requisitoId,
        completado: true,
        fechaCompletado,
        validadoPorUsuarioId: userData?.id || user?.id || null,
        validadoPorNombre: defaultValidatorName || null,
      });
      if (error) throw error;
    }
  }

  function requestApplyBlock(block) {
    if (!canManage) return;
    const validationError = validateBlock(block);
    if (validationError) {
      setApplyError(validationError);
      return;
    }

    setApplyError('');
    setValidatingApplyBlockId(block.id);

    (async () => {
      try {
        let assignmentByMemberId = {};

        if (requiresExistingClaseAssignment(block.actionType)) {
          assignmentByMemberId = await buildAssignmentMap(block.memberIds, block.claseId);
          const missingIds = block.memberIds.filter(id => !assignmentByMemberId[id]);

          if (missingIds.length) {
            const clase = scopedClases.find(c => c.id === block.claseId);
            const claseName = clase?.nombre || '';
            const memberLines = missingIds
              .map(id => EventosModel.memberDisplayName(membersById[id]))
              .filter(Boolean)
              .map(name => `• ${name}`)
              .join('\n');

            setApplyError(
              `${t('completedBlocksMissingClaseAssignment').replace('{clase}', claseName)}\n${memberLines}`,
            );
            return;
          }
        }

        setPendingApply({
          block,
          summary: blockSummary(block),
          count: block.memberIds.length,
          members: block.memberIds
            .map(id => ({ id, name: EventosModel.memberDisplayName(membersById[id]) }))
            .filter(row => row.name),
          assignmentByMemberId,
        });
      } catch (err) {
        setApplyError(err?.message || String(err));
      } finally {
        setValidatingApplyBlockId(null);
      }
    })();
  }

  function cancelApplyBlock() {
    if (applyingBlockId) return;
    setPendingApply(null);
  }

  async function confirmApplyBlock() {
    if (!canManage || !pendingApply?.block) return;
    const { block, assignmentByMemberId = {} } = pendingApply;
    await executeApplyBlock(block, assignmentByMemberId);
    setPendingApply(null);
  }

  async function executeApplyBlock(block, assignmentByMemberId = {}) {
    setApplyingBlockId(block.id);
    setApplyError('');
    setApplyMessage('');

    const fechaCompletado = new Date().toISOString().slice(0, 10);
    const errors = [];
    let successCount = 0;

    let existingClaseAssignmentMemberIds = null;
    if (block.actionType === 'asignar_clase') {
      const assignmentMap = await buildAssignmentMap(block.memberIds, block.claseId);
      existingClaseAssignmentMemberIds = new Set(Object.keys(assignmentMap));
    }

    for (const memberId of block.memberIds) {
      const memberName = EventosModel.memberDisplayName(membersById[memberId]);
      try {
        if (block.actionType === 'especialidad') {
          const { error: espError } = await EspecialidadesModel.assignEspecialidadToMiembro(
            memberId,
            block.especialidadId,
          );
          if (espError) throw espError;
        } else if (block.actionType === 'asignar_clase') {
          if (existingClaseAssignmentMemberIds?.has(memberId)) {
            successCount += 1;
            continue;
          }
          const { error: assignError } = await ClasesModel.assignClaseToMiembro(memberId, block.claseId);
          if (assignError) throw assignError;
        } else {
          let assignmentId = null;

          if (requiresExistingClaseAssignment(block.actionType)) {
            assignmentId = assignmentByMemberId[memberId];
            if (!assignmentId) throw new Error(t('completedBlocksMemberMissingClase'));
          } else {
            assignmentId = await ensureAssignment(memberId, block.claseId);
          }

          if (block.actionType === 'investidura') {
            const draft = applyMiembroClaseProgresoEstadoToDraft(
              { estado_progreso: 'investida' },
              'investida',
              defaultValidatorName,
            );
            const { error: progressError } = await ClasesModel.updateMiembroClaseProgresiva(assignmentId, {
              estadoProgreso: draft.estado_progreso,
              completado: draft.completado,
              fechaCompletado: draft.fecha_completado || fechaCompletado,
              tieneInvestidura: draft.tiene_investidura,
              investiduraFecha: draft.investidura_fecha || fechaCompletado,
              investiduraLugar: draft.investidura_lugar?.trim() || null,
              investiduraValidadoPorUsuarioId: userData?.id || user?.id || null,
              investiduraValidadoPorNombre: draft.investidura_validado_por_nombre?.trim() || defaultValidatorName || null,
            });
            if (progressError) throw progressError;
          } else if (block.actionType === 'requisito') {
            await applyRequisitosToMember(assignmentId, [block.requisitoId], fechaCompletado);
          } else if (block.actionType === 'seccion') {
            const reqs = (requisitosByClase[block.claseId] || []).filter(
              r => (r.seccion_id || r.clase_requisito_secciones?.id) === block.seccionId,
            );
            if (!reqs.length) throw new Error(t('completedBlocksEmptySeccion'));
            await applyRequisitosToMember(
              assignmentId,
              reqs.map(r => r.id),
              fechaCompletado,
            );
          }
        }
        successCount += 1;
      } catch (err) {
        errors.push(`${memberName}: ${err?.message || String(err)}`);
      }
    }

    setApplyingBlockId(null);

    if (errors.length) {
      setApplyError(errors.join('\n'));
    }
    if (successCount) {
      setApplyMessage(
        t('completedBlocksApplySuccess')
          .replace('{count}', String(successCount))
          .replace('{total}', String(block.memberIds.length)),
      );
      setBlocks(prev => prev.map(b => (
        b.id === block.id ? { ...b, memberIds: [] } : b
      )));
    }
  }

  function getRequisitosForBlock(block) {
    return requisitosByClase[block.claseId] || [];
  }

  function getSeccionesForBlock(block) {
    const secciones = seccionesByClase[block.claseId] || [];
    const reqs = requisitosByClase[block.claseId] || [];
    return secciones.filter(seccion =>
      reqs.some(r => (r.seccion_id || r.clase_requisito_secciones?.id) === seccion.id),
    );
  }

  return {
    canManage,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    poolMembers,
    blocks,
    addBlock,
    removeBlock,
    updateBlock,
    addMemberToBlock,
    removeMemberFromBlock,
    requestApplyBlock,
    cancelApplyBlock,
    confirmApplyBlock,
    pendingApply,
    applyingBlockId,
    validatingApplyBlockId,
    applyMessage,
    applyError,
    scopedClases,
    scopedEspecialidades,
    getRequisitosForBlock,
    getSeccionesForBlock,
    membersById,
    memberDisplayName: EventosModel.memberDisplayName,
    actionTypes: ACTION_TYPES,
    sectionTitle,
    requisitoLabel,
    t,
  };
}
