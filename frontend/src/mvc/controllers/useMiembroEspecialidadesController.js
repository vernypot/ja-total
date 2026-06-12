import { useEffect, useState, useMemo, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as EspecialidadesModel from '../models/especialidades.model';
import * as MiembrosModel from '../models/miembros.model';
import { fetchTiposClub } from '../models/clases.model';

function getEspecialidadFromLink(row) {
  return row.especialidades || null;
}

function getLinkEspecialidadId(row) {
  return row.especialidad_id || row.especialidades?.id;
}

export function useMiembroEspecialidadesController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));
  const [assigned, setAssigned] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [requisitosByEsp, setRequisitosByEsp] = useState({});
  const [memberTipos, setMemberTipos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEspecialidadId, setSelectedEspecialidadId] = useState('');

  const assignedIds = useMemo(
    () => new Set(assigned.map(row => getLinkEspecialidadId(row)).filter(Boolean)),
    [assigned]
  );

  const unassigned = useMemo(
    () => catalog.filter(e => !assignedIds.has(e.id)),
    [catalog, assignedIds]
  );

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const [
      { data: assignedRows, error: assignedError },
      { tipoIds, tipos, error: tiposError },
      { data: tiposClub },
      { data: catalogRows, error: catalogError },
    ] = await Promise.all([
      EspecialidadesModel.fetchMiembroEspecialidades(miembroId),
      MiembrosModel.fetchMiembroClubTipoIds(miembroId),
      fetchTiposClub(),
      EspecialidadesModel.fetchEspecialidadesCatalogSorted({ showInactive: false }),
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

    const filtered = EspecialidadesModel.filterEspecialidadesByTipos(
      catalogRows || [],
      tipoIds,
      tiposClub || []
    );

    setAssigned(assignedRows || []);
    setCatalog(filtered);
    setMemberTipos(tipos);

    const espIds = [
      ...new Set([
        ...filtered.map(e => e.id),
        ...(assignedRows || []).map(getLinkEspecialidadId).filter(Boolean),
      ]),
    ];
    if (espIds.length) {
      const { data: reqs } = await EspecialidadesModel.fetchRequisitosForEspecialidades(espIds);
      const map = {};
      for (const r of reqs || []) {
        if (!map[r.especialidad_id]) map[r.especialidad_id] = [];
        map[r.especialidad_id].push(r);
      }
      setRequisitosByEsp(map);
    } else {
      setRequisitosByEsp({});
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

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    assigned,
    unassigned,
    requisitosByEsp,
    memberTipos,
    error,
    loading,
    selectedEspecialidadId,
    setSelectedEspecialidadId,
    assignEspecialidad,
    unassignEspecialidad,
    canManage,
    getEspecialidadFromLink,
    getLinkEspecialidadId,
  };
}
