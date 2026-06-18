import { useEffect, useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { IglesiaContext } from '../../context/IglesiaContext';
import { ClubContext } from '../../context/ClubContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import * as ClasesModel from '../models/clases.model';
import * as ClubesModel from '../models/clubes.model';
import * as IglesiasModel from '../models/iglesias.model';

export function useClasesProgresivasController() {
  const { user, userData } = useContext(AuthContext);
  const { activeIglesia } = useContext(IglesiaContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const userRole = getUserRole(user, userData);
  const canManage = isSuperAdmin(userRole);

  const [data, setData] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [clubsData, setClubsData] = useState([]);
  const [activeIglesiaData, setActiveIglesiaData] = useState(null);
  const [tipoFilter, setTipoFilter] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [form, setForm] = useState({ nombre: '', tipo_id: '' });
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [requisitosByClase, setRequisitosByClase] = useState({});
  const [seccionesByClase, setSeccionesByClase] = useState({});
  const [newRequisitoForm, setNewRequisitoForm] = useState({ seccion_id: '', numero: '', descripcion: '', texto_opcional: '' });
  const [newSeccionForm, setNewSeccionForm] = useState({ parte: 'basico', numero_romano: '', nombre: '', orden: '' });
  const [editingRequisitoId, setEditingRequisitoId] = useState(null);
  const [requisitoDraft, setRequisitoDraft] = useState({ seccion_id: '', numero: '', descripcion: '', texto_opcional: '' });
  const [editingSeccionId, setEditingSeccionId] = useState(null);
  const [seccionDraft, setSeccionDraft] = useState({ parte: 'basico', numero_romano: '', nombre: '', orden: '' });
  const [searchQuery, setSearchQuery] = useState('');

  function resetRequisitoForms(secciones = []) {
    setNewRequisitoForm({ seccion_id: '', numero: '', descripcion: '', texto_opcional: '' });
    setNewSeccionForm({
      parte: 'basico',
      numero_romano: '',
      nombre: '',
      orden: String(ClasesModel.nextSeccionOrden(secciones)),
    });
    setEditingRequisitoId(null);
    setEditingSeccionId(null);
  }

  const effectiveTipoId = showAllTypes
    ? (tipoFilter || '')
    : (tipoFilter || activeClub?.tipoId || '');

  const filteredData = useMemo(
    () => filterBySearch(data, searchQuery, c => [c.nombre, c.club_tipo, c.tipos_club?.nombre]),
    [data, searchQuery]
  );

  const groupedData = useMemo(() => {
    if (effectiveTipoId) return null;
    return tipos
      .map(tipo => ({
        tipo,
        clases: filteredData.filter(c => c.tipo_id === tipo.id || c.club_tipo === tipo.nombre),
      }))
      .filter(group => group.clases.length > 0);
  }, [filteredData, tipos, effectiveTipoId]);

  async function loadClubs() {
    if (!activeIglesia) {
      setClubsData([]);
      return;
    }
    const { data: clubs } = await ClubesModel.fetchClubesByIglesia(activeIglesia);
    setClubsData(clubs || []);
  }

  async function loadIglesia() {
    if (!activeIglesia) {
      setActiveIglesiaData(null);
      return;
    }
    const { data: iglesia } = await IglesiasModel.fetchIglesiaById(activeIglesia);
    setActiveIglesiaData(iglesia || null);
  }

  async function load() {
    setError('');

    const { data: tiposData, error: tiposError } = await ClasesModel.fetchTiposClub();
    if (tiposError) {
      setError(`Error loading classes: ${tiposError.message}`);
      setTipos([]);
      setData([]);
      return;
    }

    const { data: clasesData, error: clasesError } = await ClasesModel.fetchClasesProgresivas({
      showInactive,
    });
    if (clasesError) {
      setError(`Error loading classes: ${clasesError.message}`);
      setData([]);
      setTipos(tiposData || []);
      return;
    }

    const filtered = ClasesModel.filterClasesByTipo(
      clasesData || [],
      effectiveTipoId || undefined,
      tiposData || []
    );

    const enriched = filtered.map(c => ({
      ...c,
      tipos_club: c.tipos_club || {
        nombre: tiposData.find(t => t.id === c.tipo_id)?.nombre || c.club_tipo || '',
      },
    }));

    setData(enriched);
    setTipos(tiposData || []);
  }

  async function save() {
    if (!canManage) {
      alert('Solo superadmin puede agregar clases');
      return;
    }

    setError('');
    if (!form.nombre || !form.tipo_id) {
      setError('Complete all required fields');
      return;
    }

    const payload = { nombre: form.nombre, tipo_id: form.tipo_id };
    const { error: saveError } = editingId
      ? await ClasesModel.updateClaseProgresiva(editingId, payload)
      : await ClasesModel.createClaseProgresiva(payload);

    if (saveError) {
      setError('Error saving class: ' + saveError.message);
      return;
    }

    setForm({ nombre: '', tipo_id: effectiveTipoId || '' });
    setEditingId(null);
    setShowForm(false);
    load();
  }

  function startEdit(clase) {
    if (!canManage) {
      alert('Solo superadmin puede editar clases');
      return;
    }

    setEditingId(clase.id);
    setForm({
      nombre: clase.nombre,
      tipo_id: clase.tipo_id || '',
    });
    setShowForm(true);
  }

  async function toggleEstado(clase) {
    if (!canManage) {
      alert('Solo superadmin puede cambiar estado');
      return;
    }

    setError('');
    const nuevo = clase.estado === 'activo' ? 'inactivo' : 'activo';
    const { error: updateError } = await ClasesModel.updateClaseEstado(clase.id, nuevo);

    if (updateError) {
      setError('Error updating class status');
      return;
    }

    load();
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ nombre: '', tipo_id: effectiveTipoId || '' });
  }

  function toggleForm() {
    setShowForm(prev => {
      const next = !prev;
      if (next && !editingId) {
        setForm({ nombre: '', tipo_id: effectiveTipoId || '' });
      }
      return next;
    });
    if (editingId) cancelForm();
  }

  function selectClubFilter(clubId) {
    if (!clubId) return;
    const club = clubsData.find(c => c.id === clubId);
    if (club) {
      updateActiveClub(club);
      setShowAllTypes(false);
      setTipoFilter(club.tipo_id || '');
    }
  }

  function clearTipoFilter() {
    setShowAllTypes(true);
    setTipoFilter('');
  }

  async function loadRequisitos(claseId) {
    const [{ data, error: reqError }, { data: secciones, error: secError }] = await Promise.all([
      ClasesModel.fetchRequisitosByClase(claseId),
      ClasesModel.fetchRequisitoSeccionesByClase(claseId),
    ]);
    if (reqError) {
      setError('Error loading requirements: ' + reqError.message);
      return;
    }
    if (secError) {
      setError('Error loading requirement sections: ' + secError.message);
      return;
    }
    setRequisitosByClase(prev => ({ ...prev, [claseId]: data || [] }));
    setSeccionesByClase(prev => ({ ...prev, [claseId]: secciones || [] }));
    if (expandedClassId === claseId) {
      setNewSeccionForm(f => ({
        ...f,
        orden: String(ClasesModel.nextSeccionOrden(secciones || [])),
      }));
    }
  }

  async function toggleExpandClass(claseId) {
    if (expandedClassId === claseId) {
      setExpandedClassId(null);
      resetRequisitoForms();
      return;
    }
    setExpandedClassId(claseId);
    resetRequisitoForms();
    await loadRequisitos(claseId);
  }

  async function addRequisito(claseId) {
    if (!canManage) return;
    const descripcion = newRequisitoForm.descripcion.trim();
    if (!descripcion) return;

    const secciones = seccionesByClase[claseId] || [];
    const requisitos = requisitosByClase[claseId] || [];
    const seccionId = newRequisitoForm.seccion_id || null;
    const seccion = secciones.find(s => s.id === seccionId);
    const numero = newRequisitoForm.numero
      ? Number(newRequisitoForm.numero)
      : (seccionId ? ClasesModel.nextRequisitoNumero(requisitos, seccionId) : null);
    const orden = seccion
      ? ClasesModel.computeRequisitoOrden(seccion.orden, numero)
      : (requisitos.length + 1);

    setError('');
    const { error: insertError } = await ClasesModel.createClaseRequisito(claseId, descripcion, {
      seccion_id: seccionId,
      numero,
      orden,
      texto_opcional: newRequisitoForm.texto_opcional,
    });
    if (insertError) {
      setError('Error adding requirement: ' + insertError.message);
      return;
    }
    setNewRequisitoForm({ seccion_id: seccionId || '', numero: '', descripcion: '', texto_opcional: '' });
    await loadRequisitos(claseId);
  }

  function startEditRequisito(req) {
    setEditingRequisitoId(req.id);
    setRequisitoDraft({
      seccion_id: req.seccion_id || req.clase_requisito_secciones?.id || '',
      numero: req.numero ?? '',
      descripcion: req.descripcion || '',
      texto_opcional: req.texto_opcional || '',
    });
  }

  function cancelEditRequisito() {
    setEditingRequisitoId(null);
  }

  async function saveRequisito(claseId) {
    if (!canManage || !editingRequisitoId) return;
    const descripcion = requisitoDraft.descripcion.trim();
    if (!descripcion) return;

    const secciones = seccionesByClase[claseId] || [];
    const seccionId = requisitoDraft.seccion_id || null;
    const seccion = secciones.find(s => s.id === seccionId);
    const numero = requisitoDraft.numero === '' ? null : Number(requisitoDraft.numero);
    const orden = seccion
      ? ClasesModel.computeRequisitoOrden(seccion.orden, numero)
      : undefined;

    setError('');
    const { error: updateError } = await ClasesModel.updateClaseRequisito(editingRequisitoId, {
      descripcion,
      texto_opcional: requisitoDraft.texto_opcional,
      seccion_id: seccionId,
      numero,
      ...(orden !== undefined ? { orden } : {}),
    });
    if (updateError) {
      setError('Error updating requirement: ' + updateError.message);
      return;
    }
    setEditingRequisitoId(null);
    await loadRequisitos(claseId);
  }

  async function removeRequisito(claseId, requisitoId) {
    if (!canManage) return;
    setError('');
    const { error: deleteError } = await ClasesModel.deleteClaseRequisito(requisitoId);
    if (deleteError) {
      setError('Error deleting requirement: ' + deleteError.message);
      return;
    }
    if (editingRequisitoId === requisitoId) setEditingRequisitoId(null);
    await loadRequisitos(claseId);
  }

  async function addSeccion(claseId) {
    if (!canManage) return;
    const nombre = newSeccionForm.nombre.trim();
    if (!nombre) return;

    const secciones = seccionesByClase[claseId] || [];
    setError('');
    const { error: insertError } = await ClasesModel.createClaseRequisitoSeccion(claseId, {
      parte: newSeccionForm.parte,
      numero_romano: newSeccionForm.numero_romano,
      nombre,
      orden: newSeccionForm.orden || ClasesModel.nextSeccionOrden(secciones),
    });
    if (insertError) {
      setError('Error adding section: ' + insertError.message);
      return;
    }
    await loadRequisitos(claseId);
    setNewSeccionForm({
      parte: 'basico',
      numero_romano: '',
      nombre: '',
      orden: String(ClasesModel.nextSeccionOrden(secciones) + 1),
    });
  }

  function startEditSeccion(seccion) {
    setEditingSeccionId(seccion.id);
    setSeccionDraft({
      parte: seccion.parte || 'basico',
      numero_romano: seccion.numero_romano || '',
      nombre: seccion.nombre || '',
      orden: seccion.orden ?? '',
    });
  }

  function cancelEditSeccion() {
    setEditingSeccionId(null);
  }

  async function saveSeccion(claseId) {
    if (!canManage || !editingSeccionId) return;
    const nombre = seccionDraft.nombre.trim();
    if (!nombre) return;

    setError('');
    const { error: updateError } = await ClasesModel.updateClaseRequisitoSeccion(editingSeccionId, {
      parte: seccionDraft.parte,
      numero_romano: seccionDraft.numero_romano,
      nombre,
      orden: seccionDraft.orden,
    });
    if (updateError) {
      setError('Error updating section: ' + updateError.message);
      return;
    }
    setEditingSeccionId(null);
    await loadRequisitos(claseId);
  }

  async function removeSeccion(claseId, seccionId) {
    if (!canManage) return;
    if (!window.confirm('Delete this section and all its requirements?')) return;
    setError('');
    const { error: deleteError } = await ClasesModel.deleteClaseRequisitoSeccion(seccionId);
    if (deleteError) {
      setError('Error deleting section: ' + deleteError.message);
      return;
    }
    if (editingSeccionId === seccionId) setEditingSeccionId(null);
    await loadRequisitos(claseId);
  }

  useEffect(() => { load(); }, [showInactive, effectiveTipoId]);
  useEffect(() => { loadClubs(); loadIglesia(); }, [activeIglesia]);
  useEffect(() => {
    if (activeClub?.id && !activeClub.tipoId) {
      ClubesModel.fetchClubById(activeClub.id).then(({ data }) => {
        if (data) updateActiveClub(data);
      });
    }
  }, [activeClub?.id]);
  useEffect(() => {
    if (activeClub?.tipoId && !tipoFilter) {
      setForm(prev => ({ ...prev, tipo_id: prev.tipo_id || activeClub.tipoId }));
    }
  }, [activeClub?.tipoId]);

  return {
    data: filteredData,
    groupedData,
    searchQuery,
    setSearchQuery,
    tipos,
    clubsData,
    activeIglesiaData,
    activeClub,
    tipoFilter,
    setTipoFilter,
    effectiveTipoId,
    form,
    setForm,
    showInactive,
    setShowInactive,
    error,
    showForm,
    editingId,
    canManage,
    save,
    startEdit,
    toggleEstado,
    cancelForm,
    toggleForm,
    selectClubFilter,
    clearTipoFilter,
    showAllTypes,
    expandedClassId,
    requisitosByClase,
    seccionesByClase,
    newRequisitoForm,
    setNewRequisitoForm,
    newSeccionForm,
    setNewSeccionForm,
    editingRequisitoId,
    requisitoDraft,
    setRequisitoDraft,
    editingSeccionId,
    seccionDraft,
    setSeccionDraft,
    toggleExpandClass,
    addRequisito,
    removeRequisito,
    startEditRequisito,
    cancelEditRequisito,
    saveRequisito,
    addSeccion,
    startEditSeccion,
    cancelEditSeccion,
    saveSeccion,
    removeSeccion,
  };
}
