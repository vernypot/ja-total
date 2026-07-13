import { useContext, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { AuthContext } from '../../context/AuthContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { stripHtmlTags } from '../../utils/sanitizeHtml';
import { validateForm } from '../../utils/validateForm';
import * as NoticiasModel from '../models/noticias.model';
import * as IglesiasModel from '../models/iglesias.model';

import { DEFAULT_NOTICIA_PLACEMENTS, normalizePlacements } from '../../constants/noticiaPlacements';
import { DEFAULT_NOTICIA_AUDIENCE, normalizeAudience } from '../../constants/noticiaAudience';
import * as ClubesModel from '../models/clubes.model';

const emptyForm = () => ({
  titulo: '',
  resumen: '',
  contenido: '',
  publicado_en: new Date().toISOString().slice(0, 10),
  expira_en: '',
  estado: 'activo',
  categoria: '',
  placements: [...DEFAULT_NOTICIA_PLACEMENTS],
  audience: DEFAULT_NOTICIA_AUDIENCE,
  club_id: '',
});

export function useNoticiasController() {
  const { user, userData } = useContext(AuthContext);
  const { language, t } = useLanguage();
  const { effectiveIglesiaId, assignedIglesiaNombre } = useScopedIglesia();
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [items, setItems] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [iglesiaNombre, setIglesiaNombre] = useState(assignedIglesiaNombre || '');
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const filteredItems = useMemo(
    () => filterBySearch(items, searchQuery, n => [
      stripHtmlTags(n.titulo),
      stripHtmlTags(n.resumen),
      stripHtmlTags(n.contenido),
    ]),
    [items, searchQuery]
  );

  async function load() {
    if (!effectiveIglesiaId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [{ data: iglesia }, { data: clubData }, { data, error: queryError }] = await Promise.all([
      IglesiasModel.fetchIglesiaById(effectiveIglesiaId),
      ClubesModel.fetchClubesByIglesia(effectiveIglesiaId),
      NoticiasModel.fetchNoticiasByIglesia(effectiveIglesiaId, { showInactive }),
    ]);

    setIglesiaNombre(iglesia?.nombre || assignedIglesiaNombre || '');
    setClubs(clubData || []);

    if (queryError) {
      setError(queryError.message);
      setItems([]);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  }

  function openCreateForm() {
    setEditingId('');
    setForm(emptyForm());
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId('');
    setForm(emptyForm());
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo || '',
      resumen: item.resumen || '',
      contenido: item.contenido || '',
      publicado_en: item.publicado_en || new Date().toISOString().slice(0, 10),
      expira_en: item.expira_en || '',
      estado: item.estado || 'activo',
      categoria: item.categoria || '',
      placements: normalizePlacements(item.placements),
      audience: normalizeAudience(item.audience),
      club_id: item.club_id || '',
    });
    setShowForm(true);
  }

  async function save() {
    if (!effectiveIglesiaId) return;

    const validation = validateForm('noticia', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    if (form.audience === 'club' && !form.club_id) {
      setError(t('noticiasClubRequired'));
      return;
    }

    setSaving(true);
    setError('');

    const { error: saveError } = await NoticiasModel.saveNoticia({
      id: editingId || null,
      iglesiaId: effectiveIglesiaId,
      titulo: form.titulo,
      resumen: form.resumen,
      contenido: form.contenido,
      publicadoEn: form.publicado_en,
      expiraEn: form.expira_en || null,
      estado: form.estado,
      categoria: form.categoria,
      placements: form.placements,
      audience: form.audience,
      clubId: form.club_id || null,
    });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    closeForm();
    await load();
    setSaving(false);
  }

  async function toggleEstado(item) {
    const next = item.estado === 'activo' ? 'inactivo' : 'activo';
    const { error: toggleError } = await NoticiasModel.setNoticiaEstado(item.id, next);
    if (toggleError) {
      setError(toggleError.message);
      return;
    }
    await load();
  }

  async function remove(item) {
    if (!window.confirm(t('noticiasDeleteConfirm'))) return;
    const { error: deleteError } = await NoticiasModel.deleteNoticia(item.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  function formatDate(dateStr) {
    return NoticiasModel.formatNoticiaDate(dateStr, language);
  }

  useEffect(() => {
    load();
  }, [effectiveIglesiaId, showInactive]);

  return {
    effectiveIglesiaId,
    iglesiaNombre,
    clubs,
    items: filteredItems,
    showForm,
    showInactive,
    setShowInactive,
    editingId,
    form,
    setForm,
    searchQuery,
    setSearchQuery,
    loading,
    saving,
    error,
    fieldErrors,
    canManage,
    openCreateForm,
    closeForm,
    startEdit,
    save,
    toggleEstado,
    remove,
    formatDate,
  };
}
