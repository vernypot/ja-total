import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { useListPagination } from '../../hooks/useListPagination';
import * as LabelsModel from '../models/labels.model';
import { useThemeColorOverridesController } from './useThemeColorOverridesController';

export function useAdvancedSettingsController() {
  const { translations } = useLanguage();
  const [searchParams] = useSearchParams();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [formMode, setFormMode] = useState('view');
  const [newLabel, setNewLabel] = useState({ label_key: '', label_es: '', label_en: '' });
  const themeColors = useThemeColorOverridesController();

  async function loadLabels() {
    setLoading(true);
    setError('');

    try {
      const { data, error: queryError } = await LabelsModel.fetchSystemLabels();
      if (queryError) {
        setError('Error loading labels: ' + queryError.message);
        setLabels([]);
      } else {
        setLabels(data || []);
      }
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLabels(); }, []);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const filteredLabels = useMemo(
    () => labels.filter(label =>
      label.label_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      label.label_es.toLowerCase().includes(searchTerm.toLowerCase()) ||
      label.label_en.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [labels, searchTerm]
  );

  const {
    pageItems: paginatedLabels,
    ...listPagination
  } = useListPagination(filteredLabels, [searchTerm]);

  function startEdit(label) {
    setEditingId(label.id);
    setEditingData({ ...label });
  }

  async function saveEdit() {
    if (!editingData.label_key || !editingData.label_es || !editingData.label_en) {
      setError('All fields are required');
      return;
    }

    const { error: updateError } = await LabelsModel.updateSystemLabel(editingId, {
      label_es: editingData.label_es,
      label_en: editingData.label_en,
    });

    if (updateError) {
      setError('Error saving label: ' + updateError.message);
      return;
    }

    setEditingId(null);
    setError('');
    loadLabels();
  }

  async function deleteLabel(id) {
    if (!confirm('¿Está seguro? / Are you sure?')) return;

    const { error: deleteError } = await LabelsModel.deleteSystemLabel(id);
    if (deleteError) {
      setError('Error deleting label: ' + deleteError.message);
      return;
    }

    loadLabels();
  }

  async function addLabel() {
    if (!newLabel.label_key || !newLabel.label_es || !newLabel.label_en) {
      setError('All fields are required');
      return;
    }

    const { error: insertError } = await LabelsModel.createSystemLabel(newLabel);
    if (insertError) {
      setError('Error adding label: ' + insertError.message);
      return;
    }

    setNewLabel({ label_key: '', label_es: '', label_en: '' });
    setFormMode('view');
    setError('');
    loadLabels();
  }

  async function syncWithDefaults() {
    if (!confirm('This will add all default labels to the database. Continue? / ¿Esto agregará todas las etiquetas predeterminadas a la base de datos. ¿Continuar?')) return;

    const defaultKeys = Object.keys(translations.es);
    const existingKeys = labels.map(l => l.label_key);
    const toAdd = defaultKeys
      .filter(key => !existingKeys.includes(key))
      .map(key => ({
        label_key: key,
        label_es: translations.es[key],
        label_en: translations.en[key] || key,
      }));

    if (toAdd.length === 0) {
      setError('All default labels already exist in database');
      return;
    }

    const { error: insertError } = await LabelsModel.bulkCreateSystemLabels(toAdd);
    if (insertError) {
      setError('Error syncing labels: ' + insertError.message);
      return;
    }

    setError('');
    loadLabels();
  }

  return {
    labels,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    editingId,
    setEditingId,
    editingData,
    setEditingData,
    formMode,
    setFormMode,
    newLabel,
    setNewLabel,
    filteredLabels: paginatedLabels,
    listPagination,
    startEdit,
    saveEdit,
    deleteLabel,
    addLabel,
    syncWithDefaults,
    themeColors,
  };
}
