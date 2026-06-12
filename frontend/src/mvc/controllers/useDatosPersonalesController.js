import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as MiembrosModel from '../models/miembros.model';

export function calcularEdad(fecha) {
  if (!fecha) return '';
  const hoy = new Date();
  const nacimiento = new Date(fecha);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad + ' años';
}

const EMPTY_FORM = {
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

function memberToForm(data) {
  if (!data) return { ...EMPTY_FORM };
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

export function useDatosPersonalesController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [data, setData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    const { data: memberData, error: queryError } = await MiembrosModel.fetchMiembroById(miembroId);

    if (queryError) {
      setError('Error loading member data');
      setData(null);
    } else {
      setData(memberData);
      if (!editing) setForm(memberToForm(memberData));
    }

    setLoading(false);
  }

  function startEdit() {
    setForm(memberToForm(data));
    setSaveError('');
    setEditing(true);
  }

  function cancelEdit() {
    setForm(memberToForm(data));
    setSaveError('');
    setEditing(false);
  }

  async function save() {
    if (!form.nombre.trim()) {
      setSaveError('First name is required');
      return;
    }

    setSaving(true);
    setSaveError('');

    const payload = {
      nombre: form.nombre.trim(),
      apellido1: form.apellido1.trim() || null,
      apellido2: form.apellido2.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      genero: form.genero.trim() || null,
      documento: form.documento.trim() || null,
      telefono: form.telefono.trim() || null,
      celular: form.celular.trim() || null,
      ciudad: form.ciudad.trim() || null,
      direccion: form.direccion.trim() || null,
    };

    const { error: updateError } = await MiembrosModel.updateMiembro(miembroId, payload);

    if (updateError) {
      setSaveError('Error saving member: ' + updateError.message);
      setSaving(false);
      return;
    }

    setEditing(false);
    setSaving(false);
    load();
  }

  useEffect(() => {
    if (miembroId) load();
  }, [miembroId]);

  return {
    data,
    form,
    setForm,
    editing,
    error,
    saveError,
    loading,
    saving,
    canManage,
    startEdit,
    cancelEdit,
    save,
    calcularEdad,
  };
}
