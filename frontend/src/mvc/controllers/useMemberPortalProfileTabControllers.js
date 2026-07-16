import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemberPortal } from '../../context/MemberPortalContext';
import { filterBySearch } from '../../utils/listSearch';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as MiembrosModel from '../models/miembros.model';
import * as DatosMedicosModel from '../models/datosMedicos.model';
import * as CargosModel from '../models/cargos.model';
import * as ClasesModel from '../models/clases.model';
import * as CarnetModel from '../models/carnet.model';
import * as EventosModel from '../models/eventos.model';
import { compareEventsByLocalDateTime } from '../../utils/eventTimezone';
import { calcularEdad } from './useDatosPersonalesController';

const EMPTY_PERSONAL_FORM = {
  nombre: '',
  apellido1: '',
  apellido2: '',
  fecha_nacimiento: '',
  genero: '',
  documento: '',
  telefono: '',
  celular: '',
  ciudad: '',
  direccion: '',
};

function profileToForm(data) {
  if (!data) return { ...EMPTY_PERSONAL_FORM };
  return {
    nombre: data.nombre || '',
    apellido1: data.apellido1 || '',
    apellido2: data.apellido2 || '',
    fecha_nacimiento: data.fecha_nacimiento || '',
    genero: data.genero || '',
    documento: data.documento || '',
    telefono: data.telefono || '',
    celular: data.celular || '',
    ciudad: data.ciudad || '',
    direccion: data.direccion || '',
  };
}

function buildRequisitosMap(rows, idKey) {
  const map = {};
  for (const row of rows || []) {
    const groupId = row[idKey];
    if (!groupId) continue;
    if (!map[groupId]) map[groupId] = [];
    map[groupId].push(row);
  }
  return map;
}

function readOnlyPersonalControllerProps(data, { loading, error, t }) {
  const displayPhotoUrl = MiembrosModel.getMiembroPhotoDisplayUrl(data?.foto_url);
  return {
    data,
    form: profileToForm(data),
    setForm: () => {},
    editing: false,
    canManage: false,
    isNew: false,
    clubId: null,
    loading,
    error,
    saveError: '',
    fieldErrors: {},
    photoError: '',
    saving: false,
    uploadingPhoto: false,
    displayPhotoUrl,
    photoCrop: null,
    calcularEdad,
    save: () => {},
    startEdit: () => {},
    cancelEdit: () => {},
    handlePhotoSelect: () => {},
    handlePhotoCropConfirm: async () => {},
    cancelPhotoCrop: () => {},
    handleRemovePhoto: () => {},
  };
}

export function useMemberPortalDatosPersonalesController() {
  const { t } = useLanguage();
  const { session } = useMemberPortal();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: profile, error: profileError } = await MemberPortalModel.fetchPortalProfile(session.sessionToken);
    if (profileError) {
      setError(profileError.message);
      setData(null);
    } else {
      setData(profile);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return readOnlyPersonalControllerProps(data, { loading, error, t: null });
}

export function useMemberPortalDatosMedicosController() {
  const { language } = useLanguage();
  const { session } = useMemberPortal();
  const [data, setData] = useState(null);
  const [member, setMember] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: payload, error: tabError } = await MemberPortalModel.fetchPortalTab(session.sessionToken, 'medical');
    if (tabError) {
      setError(tabError.message);
      setData(null);
      setMember(null);
      setContacts([]);
      setClubs([]);
      setLoading(false);
      return;
    }

    setData(DatosMedicosModel.normalizeDatosMedicosRecord(payload?.data));
    setMember(payload?.member || null);
    setContacts(payload?.contacts || []);
    setClubs(payload?.clubs || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    data,
    member,
    contacts,
    clubs,
    language,
    form: data || {},
    editing: false,
    error,
    saveError: '',
    loading,
    saving: false,
    canManage: false,
    startEdit: () => {},
    startAdd: () => {},
    cancelEdit: () => {},
    save: () => {},
    printFicha: () => {},
    hasRecord: Boolean(data?.id),
    setForm: () => {},
  };
}

export function useMemberPortalContactosController() {
  const { t } = useLanguage();
  const { session } = useMemberPortal();
  const miembroId = session?.miembroId;
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  const filteredData = useMemo(
    () => filterBySearch(data, searchQuery, c => [c.nombre, c.telefono, c.relacion, c.estado]),
    [data, searchQuery]
  );

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: rows, error: tabError } = await MemberPortalModel.fetchPortalTab(session.sessionToken, 'contacts');
    if (tabError) {
      setError(tabError.message);
      setData([]);
    } else {
      setData(rows || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    data: filteredData,
    searchQuery,
    setSearchQuery,
    showInactive,
    setShowInactive,
    error,
    loading,
    showForm: false,
    editingId: null,
    form: { nombre: '', telefono: '', relacion: '' },
    setForm: () => {},
    canManage: false,
    save: () => {},
    startEdit: () => {},
    toggleEstado: () => {},
    cancelForm: () => {},
    toggleForm: () => {},
    miembroId,
    t,
  };
}

export function useMemberPortalEspecialidadesController() {
  const { session } = useMemberPortal();
  const [assigned, setAssigned] = useState([]);
  const [requisitosByEsp, setRequisitosByEsp] = useState({});
  const [memberTipos, setMemberTipos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: payload, error: tabError } = await MemberPortalModel.fetchPortalTab(session.sessionToken, 'specialties');
    if (tabError) {
      setError(tabError.message);
      setAssigned([]);
      setRequisitosByEsp({});
      setMemberTipos([]);
      setLoading(false);
      return;
    }

    setAssigned(payload?.assigned || []);
    setRequisitosByEsp(buildRequisitosMap(payload?.requisitos, 'especialidad_id'));
    setMemberTipos(payload?.memberTipos || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    assigned,
    unassigned: [],
    unassignedGrouped: null,
    requisitosByEsp,
    memberTipos,
    error,
    loading,
    selectedEspecialidadId: '',
    setSelectedEspecialidadId: () => {},
    assignEspecialidad: () => {},
    unassignEspecialidad: () => {},
    canManage: false,
    getEspecialidadFromLink: row => row.especialidades || null,
    getLinkEspecialidadId: row => row.especialidad_id || row.especialidades?.id,
  };
}

export function useMemberPortalCargosController() {
  const { t } = useLanguage();
  const { session } = useMemberPortal();
  const [assignments, setAssignments] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { active, history } = useMemo(
    () => CargosModel.splitMiembroCargos(assignments),
    [assignments]
  );

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: payload, error: tabError } = await MemberPortalModel.fetchPortalTab(session.sessionToken, 'cargos');
    if (tabError) {
      setError(tabError.message);
      setAssignments([]);
      setCatalog([]);
      setLoading(false);
      return;
    }

    setAssignments(payload?.assignments || []);
    setCatalog(payload?.catalog || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    active,
    history,
    assignableCargos: [],
    catalog,
    memberClubs: [],
    memberTipos: [],
    error,
    fieldErrors: {},
    loading,
    showForm: false,
    editingId: null,
    form: {},
    setForm: () => {},
    canManage: false,
    resetForm: () => {},
    startAssign: () => {},
    startEdit: () => {},
    saveAssignment: () => {},
    closeAssignment: () => {},
    getCargoFromLink: row => row.cargos || null,
    getCargoPath: cargoId => CargosModel.getCargoPath(cargoId, catalog),
    t,
  };
}

export function useMemberPortalClasesController() {
  const { session } = useMemberPortal();
  const [assigned, setAssigned] = useState([]);
  const [requisitosByClase, setRequisitosByClase] = useState({});
  const [completionsByAssignment, setCompletionsByAssignment] = useState({});
  const [memberTipos, setMemberTipos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: payload, error: tabError } = await MemberPortalModel.fetchPortalTab(session.sessionToken, 'classes');
    if (tabError) {
      setError(tabError.message);
      setAssigned([]);
      setRequisitosByClase({});
      setCompletionsByAssignment({});
      setMemberTipos([]);
      setHistorial([]);
      setLoading(false);
      return;
    }

    setAssigned(payload?.assigned || []);
    setRequisitosByClase(buildRequisitosMap(payload?.requisitos, 'clase_id'));
    setCompletionsByAssignment(ClasesModel.mapCompletionsByAssignment(payload?.completions || []));
    setMemberTipos(payload?.memberTipos || []);
    setHistorial(payload?.historial || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    assigned,
    unassigned: [],
    requisitosByClase,
    completionsByAssignment,
    memberTipos,
    error,
    loading,
    selectedClaseId: '',
    setSelectedClaseId: () => {},
    assignClase: () => {},
    unassignClase: () => {},
    saveRequisitoCompletion: async () => false,
    saveAssignmentProgress: async () => false,
    savingRequisitoKey: null,
    savingAssignmentId: null,
    canManage: false,
    defaultValidatorName: '',
    getClaseFromLink: row => row.clases_progresivas || null,
    getLinkClaseId: row => row.clase_progresiva_id || row.clase_id || row.clases_progresivas?.id,
    historial,
    catalogClases: [],
    memberClubs: [],
    saveHistorial: async () => false,
    deleteHistorial: async () => false,
    savingHistorialId: null,
  };
}

export function useMemberPortalAsistenciaController() {
  const { session } = useMemberPortal();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const attendanceHelpers = {
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
  };

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: loadError } = await MemberPortalModel.fetchPortalEvents(session.sessionToken);
    if (loadError) {
      setError(loadError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const sorted = [...(data || [])].sort((a, b) => {
      const eventA = EventosModel.getEventoFromRow(a);
      const eventB = EventosModel.getEventoFromRow(b);
      return compareEventsByLocalDateTime(eventB, eventA);
    });

    setRows(sorted);
    setLoading(false);
  }

  const stats = useMemo(
    () => EventosModel.computeMemberAttendanceStats(rows, attendanceHelpers),
    [rows]
  );

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    rows,
    stats,
    error,
    loading,
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    isEventInFuture: EventosModel.isEventInFuture,
    isEventInPast: EventosModel.isEventInPast,
    memberAttendedEvent: EventosModel.memberAttendedEvent,
  };
}

export function useMemberPortalCarnetController() {
  const { language } = useLanguage();
  const { session } = useMemberPortal();
  const [member, setMember] = useState(null);
  const [medical, setMedical] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cardExpiresAt] = useState(() => CarnetModel.addOneYear(new Date()));

  const selectedClub = useMemo(
    () => clubs.find(c => c.id === selectedClubId) || clubs[0] || null,
    [clubs, selectedClubId]
  );

  const fullName = useMemo(() => CarnetModel.memberFullName(member), [member]);
  const bloodType = useMemo(
    () => CarnetModel.formatBloodType(medical?.tipo_sangre, medical?.factor_rh),
    [medical]
  );
  const expirationLabel = useMemo(
    () => CarnetModel.formatCarnetExpirationDate(cardExpiresAt, language),
    [cardExpiresAt, language]
  );

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: payload, error: tabError } = await MemberPortalModel.fetchPortalTab(session.sessionToken, 'carnet');
    if (tabError) {
      setError(tabError.message);
      setMember(null);
      setMedical(null);
      setClubs([]);
      setToken('');
      setLoading(false);
      return;
    }

    setMember(payload?.member || null);
    setMedical(DatosMedicosModel.normalizeDatosMedicosRecord(payload?.medical));
    const clubRows = payload?.clubs || [];
    setClubs(clubRows);
    if (clubRows.length && !selectedClubId) {
      setSelectedClubId(clubRows[0].id);
    }
    setToken(payload?.token || '');
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  useEffect(() => {
    if (clubs.length && !clubs.some(c => c.id === selectedClubId)) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  return {
    member,
    medical,
    clubs,
    selectedClub,
    selectedClubId,
    setSelectedClubId,
    token,
    setToken,
    fullName,
    bloodType,
    expirationLabel,
    canManage: false,
    error,
    loading,
    printCard: () => CarnetModel.triggerCarnetPrint(),
  };
}
