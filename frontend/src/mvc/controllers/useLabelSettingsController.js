import { useContext, useState } from 'react';
import { LanguageContext } from '../../context/LanguageContext';

export function useLabelSettingsController() {
  const { t, customLabels, updateLabel, resetLabels, allKeys, translations } = useContext(LanguageContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const filteredKeys = allKeys.filter(key =>
    key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customLabels[key]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    translations.es[key]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    filteredKeys,
    startEdit,
    saveEdit,
    resetLabel,
    handleResetAll,
  };
}
