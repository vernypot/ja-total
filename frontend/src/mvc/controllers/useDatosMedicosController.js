import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { useLanguage } from '../../hooks/useLanguage';
import * as DatosMedicosModel from '../models/datosMedicos.model';
import * as MiembrosModel from '../models/miembros.model';
import * as ContactosModel from '../models/contactos.model';

export const EMPTY_MEDICAL_FORM = {
  tipo_sangre: '',
  factor_rh: '',
  aseguradora: '',
  poliza: '',
  seguro_denominacional: false,
  seguro_denominacional_fecha: '',
  alergias: '',
  medicamentos: '',
  enfermedades: '',
  observaciones: '',
};

function recordToForm(data) {
  if (!data) return { ...EMPTY_MEDICAL_FORM };
  return {
    tipo_sangre: data.tipo_sangre ?? '',
    factor_rh: data.factor_rh ?? '',
    aseguradora: data.aseguradora ?? '',
    poliza: data.poliza ?? '',
    seguro_denominacional: Boolean(data.seguro_denominacional),
    seguro_denominacional_fecha: data.seguro_denominacional_fecha ?? '',
    alergias: data.alergias ?? '',
    medicamentos: data.medicamentos ?? '',
    enfermedades: data.enfermedades ?? '',
    observaciones: data.observaciones ?? '',
  };
}

export function useDatosMedicosController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const { language } = useLanguage();
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [data, setData] = useState(null);
  const [member, setMember] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [form, setForm] = useState(EMPTY_MEDICAL_FORM);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!miembroId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [
      { data: record, error: queryError },
      { data: memberData },
      { data: contactRows },
      { data: clubRows },
    ] = await Promise.all([
      DatosMedicosModel.fetchDatosMedicosByMiembro(miembroId),
      MiembrosModel.fetchMiembroById(miembroId),
      ContactosModel.fetchContactosByMiembro(miembroId),
      MiembrosModel.fetchMiembroClubsWithLogos(miembroId),
    ]);

    setMember(memberData || null);
    setContacts(contactRows || []);
    setClubs(clubRows || []);

    if (queryError) {
      const msg = queryError.message || '';
      setError(
        msg.includes('row-level security') || msg.includes('permission denied')
          ? 'Error loading medical data: permission denied (RLS). Run MIEMBRO_DATOS_MEDICOS_RLS_FIX.sql in Supabase.'
          : 'Error loading medical data: ' + msg
      );
      setData(null);
    } else {
      setData(record);
      if (!editing) setForm(recordToForm(record));
    }

    setLoading(false);
  }

  function startEdit() {
    setForm(recordToForm(data));
    setSaveError('');
    setEditing(true);
  }

  function startAdd() {
    setForm({ ...EMPTY_MEDICAL_FORM });
    setSaveError('');
    setEditing(true);
  }

  function cancelEdit() {
    setForm(recordToForm(data));
    setSaveError('');
    setEditing(false);
  }

  async function save() {
    if (!canManage) return;

    setSaving(true);
    setSaveError('');
    setError('');

    const { error: saveErr } = await DatosMedicosModel.upsertDatosMedicos(miembroId, form, data?.id);

    if (saveErr) {
      const msg = saveErr.message || '';
      setSaveError(
        msg.includes('row-level security') || msg.includes('permission denied')
          ? 'Error saving medical data: permission denied (RLS). Run MIEMBRO_DATOS_MEDICOS_RLS_FIX.sql in Supabase, then log out and back in.'
          : 'Error saving medical data: ' + msg
      );
      setSaving(false);
      return;
    }

    setEditing(false);
    setSaving(false);
    load();
  }

  function printFicha() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  }

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    data,
    member,
    contacts,
    clubs,
    language,
    form,
    setForm,
    editing,
    error,
    saveError,
    loading,
    saving,
    canManage,
    startEdit,
    startAdd,
    cancelEdit,
    save,
    printFicha,
    hasRecord: Boolean(data?.id),
  };
}
