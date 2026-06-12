import { useEffect, useState, useMemo, useContext } from 'react';
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

export function useMiembroClasesController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [requisitosByClase, setRequisitosByClase] = useState({});
  const [memberTipos, setMemberTipos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClaseId, setSelectedClaseId] = useState('');

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

    const claseIds = [
      ...new Set([
        ...filtered.map(c => c.id),
        ...(assignedRows || []).map(getLinkClaseId).filter(Boolean),
      ]),
    ];
    if (claseIds.length) {
      const { data: reqs } = await ClasesModel.fetchRequisitosForClases(claseIds);
      const map = {};
      for (const r of reqs || []) {
        if (!map[r.clase_id]) map[r.clase_id] = [];
        map[r.clase_id].push(r);
      }
      setRequisitosByClase(map);
    } else {
      setRequisitosByClase({});
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
      setError('Error removing class: ' + unassignError.message);
      return;
    }
    load();
  }

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    assigned,
    unassigned,
    requisitosByClase,
    memberTipos,
    error,
    loading,
    selectedClaseId,
    setSelectedClaseId,
    assignClase,
    unassignClase,
    canManage,
    getClaseFromLink,
    getLinkClaseId,
  };
}
