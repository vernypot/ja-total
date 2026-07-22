import { useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useListPagination } from '../../hooks/useListPagination';

export function useLabelSettingsController() {
  const { t, customLabels, updateLabel, resetLabels, allKeys, translations } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const filteredKeys = useMemo(
    () => allKeys.filter(key =>
      key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customLabels[key]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      translations.es[key]?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [allKeys, customLabels, translations.es, searchTerm]
  );

  const {
    pageItems: paginatedKeys,
    ...listPagination
  } = useListPagination(filteredKeys, [searchTerm]);

  function startEdit(key) {
    setEditingKey(key);
    setEditingValue(customLabels[key] || translations.es[key] || key);
  }

  function saveEdit() {
    if (editingValue.trim()) {
      updateLabel(editingKey, editingValue);
      setEditingKey(null);
      setEditingValue('');
    }
  }

  function resetLabel(key) {
    updateLabel(key, undefined);
  }

  function handleResetAll() {
    if (confirm('¿Seguro que deseas resetear todas las etiquetas? / Are you sure you want to reset all labels?')) {
      resetLabels();
    }
  }

  return {
    t,
    customLabels,
    translations,
    searchTerm,
    setSearchTerm,
    editingKey,
    setEditingKey,
    editingValue,
    setEditingValue,
    filteredKeys: paginatedKeys,
    listPagination,
    startEdit,
    saveEdit,
    resetLabel,
    handleResetAll,
  };
}
