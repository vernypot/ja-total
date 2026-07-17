import { useEffect, useState, useContext, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { validateForm } from '../../utils/validateForm';
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
  nombre_opcional: '',
  apellido_opcional: '',
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
    nombre_opcional: data.nombre_opcional || '',
    apellido_opcional: data.apellido_opcional || '',
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
  const isNew = miembroId === 'new';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeClub } = useContext(ClubContext);
  const clubId = searchParams.get('club') || activeClub?.id || null;
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [data, setData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(isNew);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [photoError, setPhotoError] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoCrop, setPhotoCrop] = useState(null);

  const displayPhotoUrl = useMemo(() => {
    if (photoPreview) return photoPreview;
    return MiembrosModel.getMiembroPhotoDisplayUrl(data?.foto_url);
  }, [data?.foto_url, photoPreview]);

  async function load() {
    if (isNew || !miembroId) {
      setLoading(false);
      return;
    }

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
    setPhotoError('');
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
    clearPhotoCrop();
    setEditing(true);
  }

  function clearPhotoCrop() {
    if (photoCrop?.url) URL.revokeObjectURL(photoCrop.url);
    setPhotoCrop(null);
  }

  function cancelPhotoCrop() {
    clearPhotoCrop();
  }

  function cancelEdit() {
    if (isNew) {
      navigate('/dashboard/miembros');
      return;
    }

    setForm(memberToForm(data));
    setSaveError('');
    setPhotoError('');
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
    clearPhotoCrop();
    setEditing(false);
  }

  async function uploadPhotoFile(file) {
    setUploadingPhoto(true);

    const { data: uploadData, error: uploadError, errorStage } =
      await MiembrosModel.uploadMiembroPhoto(miembroId, file);
    setUploadingPhoto(false);

    if (uploadError) {
      const prefix = errorStage === 'database'
        ? 'Error saving photo URL: '
        : 'Error uploading photo: ';
      setPhotoError(prefix + uploadError.message);
      return;
    }

    setData(prev => ({ ...prev, foto_url: uploadData?.foto_url || prev?.foto_url }));
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
    await load();
  }

  function handlePhotoSelect(file) {
    if (!file || !canManage || isNew) return;

    setPhotoError('');
    const validationError = MiembrosModel.validateMiembroPhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      return;
    }

    clearPhotoCrop();
    setPhotoCrop({
      url: URL.createObjectURL(file),
      fileName: file.name,
      mimeType: file.type,
    });
  }

  async function handlePhotoCropConfirm(croppedFile) {
    if (!croppedFile || !canManage || isNew) return;
    clearPhotoCrop();
    await uploadPhotoFile(croppedFile);
  }

  async function handleRemovePhoto() {
    if (!canManage || !data?.foto_url) return;

    setPhotoError('');
    setUploadingPhoto(true);

    const { error: removeError } = await MiembrosModel.removeMiembroPhoto(miembroId, data.foto_url);
    setUploadingPhoto(false);

    if (removeError) {
      setPhotoError('Error removing photo: ' + removeError.message);
      return;
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
    await load();
  }

  async function save() {
    const validation = validateForm('memberPersonal', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setSaveError(validation.firstError || validation.formError);
      return;
    }

    setSaving(true);
    setSaveError('');

    const payload = {
      nombre: form.nombre.trim(),
      apellido1: form.apellido1.trim() || null,
      apellido2: form.apellido2.trim() || null,
      nombre_opcional: form.nombre_opcional.trim() || null,
      apellido_opcional: form.apellido_opcional.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      genero: form.genero.trim() || null,
      documento: form.documento.trim() || null,
      telefono: form.telefono.trim() || null,
      celular: form.celular.trim() || null,
      ciudad: form.ciudad.trim() || null,
      direccion: form.direccion.trim() || null,
    };

    if (isNew) {
      if (!clubId) {
        setSaveError(t('selectClubToCreateMember'));
        setSaving(false);
        return;
      }

      const { data: created, error: createError } = await MiembrosModel.createMiembroWithClub(payload, clubId);

      if (createError) {
        setSaveError(`${t('errorCreatingMember')}: ${createError.message}`);
        setSaving(false);
        return;
      }

      setSaving(false);
      navigate(`/dashboard/miembro/${created.id}/datos`, { replace: true });
      return;
    }

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
    if (isNew) {
      setData({});
      setForm({ ...EMPTY_FORM });
      setEditing(true);
      setError('');
      setLoading(false);
      return;
    }

    if (miembroId) load();
  }, [miembroId, isNew]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (photoCrop?.url) URL.revokeObjectURL(photoCrop.url);
  }, [photoPreview, photoCrop]);

  return {
    data,
    form,
    setForm,
    editing,
    error,
    saveError,
    fieldErrors,
    photoError,
    loading,
    saving,
    uploadingPhoto,
    displayPhotoUrl,
    canManage,
    isNew,
    clubId,
    startEdit,
    cancelEdit,
    save,
    handlePhotoSelect,
    handlePhotoCropConfirm,
    cancelPhotoCrop,
    photoCrop,
    handleRemovePhoto,
    calcularEdad,
    miembroId: isNew ? null : miembroId,
  };
}
