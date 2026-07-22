import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { useListPagination } from '../../hooks/useListPagination';
import * as LandingCmsModel from '../models/landingCms.model';

const THEME_FIELDS = [
  { key: 'navy_color', labelKey: 'landingThemeNavy' },
  { key: 'navy_dark_color', labelKey: 'landingThemeNavyDark' },
  { key: 'gold_color', labelKey: 'landingThemeGold' },
  { key: 'teal_color', labelKey: 'landingThemeTeal' },
  { key: 'cream_color', labelKey: 'landingThemeCream' },
  { key: 'text_color', labelKey: 'landingThemeText' },
  { key: 'font_family', labelKey: 'landingThemeFont' },
  { key: 'display_font', labelKey: 'landingThemeDisplayFont' },
];

function sortByOrden(rows) {
  return [...rows].sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

export function useLandingCmsController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const canManage = isSuperAdmin(getUserRole(user, userData));

  const [activeTab, setActiveTab] = useState('sections');
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState('hero');
  const [sectionForm, setSectionForm] = useState(LandingCmsModel.emptySectionForm('hero'));
  const [itemForm, setItemForm] = useState(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [hasTable, setHasTable] = useState(true);

  const sortedSections = useMemo(() => sortByOrden(sections), [sections]);

  const sectionItems = useMemo(
    () => sortByOrden(items.filter(item => item.section_key === selectedSectionKey)),
    [items, selectedSectionKey],
  );

  const {
    pageItems: paginatedSectionItems,
    ...listPagination
  } = useListPagination(sectionItems, [selectedSectionKey]);

  async function loadAll(preserveSectionKey = selectedSectionKey) {
    setLoading(true);
    setError('');

    const [settingsRes, sectionsRes, itemsRes] = await Promise.all([
      LandingCmsModel.fetchLandingSettings(),
      LandingCmsModel.fetchLandingSections(),
      LandingCmsModel.fetchLandingItems(),
    ]);

    const tableMissing = !settingsRes.hasTable && !sectionsRes.hasTable && !itemsRes.hasTable;
    setHasTable(!tableMissing);

    const loadError = settingsRes.error || sectionsRes.error || itemsRes.error;
    if (loadError) {
      setError('Error loading landing CMS: ' + loadError.message);
      setLoading(false);
      return;
    }

    const nextSections = sectionsRes.data || [];
    setSettings(settingsRes.data);
    setSections(nextSections);
    setItems(itemsRes.data || []);

    const activeKey = nextSections.some(s => s.section_key === preserveSectionKey)
      ? preserveSectionKey
      : (nextSections.find(s => s.section_key === 'hero') || nextSections[0])?.section_key;

    if (activeKey) {
      const section = nextSections.find(s => s.section_key === activeKey);
      setSelectedSectionKey(activeKey);
      if (section) {
        setSectionForm({
          ...section,
          style_json: LandingCmsModel.parseJsonField(section.style_json, {}),
        });
      }
    }

    setLoading(false);
  }

  function selectSection(sectionKey) {
    setSelectedSectionKey(sectionKey);
    const section = sections.find(s => s.section_key === sectionKey);
    if (section) {
      setSectionForm({
        ...section,
        style_json: LandingCmsModel.parseJsonField(section.style_json, {}),
      });
    } else {
      setSectionForm(LandingCmsModel.emptySectionForm(sectionKey));
    }
    setShowSectionForm(false);
    setShowItemForm(false);
    setItemForm(null);
  }

  function openNewSectionForm() {
    setSectionForm({
      ...LandingCmsModel.emptySectionForm(`custom_${Date.now()}`),
      orden: (sortedSections.length + 1) * 10,
    });
    setShowSectionForm(true);
  }

  function openEditSection(section) {
    setSelectedSectionKey(section.section_key);
    setSectionForm({
      ...section,
      style_json: LandingCmsModel.parseJsonField(section.style_json, {}),
    });
    setShowSectionForm(true);
  }

  async function saveSection() {
    if (!canManage) return;
    setSaving(true);
    setError('');
    setNotice('');

    const { data, error: saveError } = await LandingCmsModel.saveLandingSection(sectionForm);
    setSaving(false);

    if (saveError) {
      setError('Error saving section: ' + saveError.message);
      return;
    }

    setNotice('landingSectionSaved');
    setShowSectionForm(false);
    await loadAll(data?.section_key || selectedSectionKey);
  }

  async function removeSection(id) {
    if (!canManage || !window.confirm(t('landingDeleteSectionConfirm'))) return;
    setError('');
    const { error: deleteError } = await LandingCmsModel.deleteLandingSection(id);
    if (deleteError) {
      setError('Error deleting section: ' + deleteError.message);
      return;
    }
    setNotice('landingSectionDeleted');
    await loadAll('hero');
  }

  async function toggleSectionVisibility(section) {
    if (!canManage) return;
    setError('');
    const { error: saveError } = await LandingCmsModel.patchLandingSection(section.id, {
      visible: !section.visible,
    });
    if (saveError) {
      setError('Error updating section: ' + saveError.message);
      return;
    }
    setNotice(section.visible ? 'landingSectionHidden' : 'landingSectionShown');
    await loadAll(section.section_key);
  }

  async function moveSection(sectionId, direction) {
    if (!canManage) return;
    const ordered = sortByOrden(sections);
    const index = ordered.findIndex(s => s.id === sectionId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    setSaving(true);
    const { error: saveError } = await LandingCmsModel.reindexLandingSections(next);
    setSaving(false);

    if (saveError) {
      setError('Error reordering sections: ' + saveError.message);
      return;
    }

    setNotice('landingReindexed');
    await loadAll(next[targetIndex].section_key);
  }

  async function reindexSections() {
    if (!canManage) return;
    setSaving(true);
    const { error: saveError } = await LandingCmsModel.reindexLandingSections(sortedSections);
    setSaving(false);
    if (saveError) {
      setError('Error reindexing sections: ' + saveError.message);
      return;
    }
    setNotice('landingReindexed');
    await loadAll(selectedSectionKey);
  }

  function openNewItemForm(itemType) {
    setItemForm({
      ...LandingCmsModel.emptyItemForm(selectedSectionKey, itemType),
      orden: (sectionItems.length + 1) * 10,
    });
    setShowItemForm(true);
  }

  function openEditItem(item) {
    setItemForm({
      ...item,
      content_es: LandingCmsModel.parseJsonField(item.content_es, {}),
      content_en: LandingCmsModel.parseJsonField(item.content_en, {}),
      style_json: LandingCmsModel.parseJsonField(item.style_json, {}),
    });
    setShowItemForm(true);
  }

  function updateItemContent(lang, field, value) {
    setItemForm(prev => ({
      ...prev,
      [`content_${lang}`]: {
        ...prev[`content_${lang}`],
        [field]: value,
      },
    }));
  }

  function updateItemStyle(field, value) {
    setItemForm(prev => ({
      ...prev,
      style_json: {
        ...prev.style_json,
        [field]: value,
      },
    }));
  }

  function updateItemField(field, value) {
    setItemForm(prev => ({ ...prev, [field]: value }));
  }

  async function saveItem() {
    if (!canManage || !itemForm) return;
    setSaving(true);
    setError('');

    const { error: saveError } = await LandingCmsModel.saveLandingItem(itemForm);
    setSaving(false);

    if (saveError) {
      setError('Error saving item: ' + saveError.message);
      return;
    }

    setNotice('landingItemSaved');
    setShowItemForm(false);
    setItemForm(null);
    await loadAll(selectedSectionKey);
  }

  async function removeItem(id) {
    if (!canManage || !window.confirm(t('landingDeleteItemConfirm'))) return;
    const { error: deleteError } = await LandingCmsModel.deleteLandingItem(id);
    if (deleteError) {
      setError('Error deleting item: ' + deleteError.message);
      return;
    }
    setNotice('landingItemDeleted');
    await loadAll(selectedSectionKey);
  }

  async function toggleItemVisibility(item) {
    if (!canManage) return;
    const nextEstado = item.estado === 'activo' ? 'inactivo' : 'activo';
    const { error: saveError } = await LandingCmsModel.patchLandingItem(item.id, { estado: nextEstado });
    if (saveError) {
      setError('Error updating item: ' + saveError.message);
      return;
    }
    setNotice(nextEstado === 'activo' ? 'landingItemShown' : 'landingItemHidden');
    await loadAll(selectedSectionKey);
  }

  async function moveItem(itemId, direction) {
    if (!canManage) return;
    const ordered = sortByOrden(sectionItems);
    const index = ordered.findIndex(item => item.id === itemId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    setSaving(true);
    const { error: saveError } = await LandingCmsModel.reindexLandingItems(next);
    setSaving(false);

    if (saveError) {
      setError('Error reordering items: ' + saveError.message);
      return;
    }

    setNotice('landingReindexed');
    await loadAll(selectedSectionKey);
  }

  async function reindexItems() {
    if (!canManage || !sectionItems.length) return;
    setSaving(true);
    const { error: saveError } = await LandingCmsModel.reindexLandingItems(sectionItems);
    setSaving(false);
    if (saveError) {
      setError('Error reindexing items: ' + saveError.message);
      return;
    }
    setNotice('landingReindexed');
    await loadAll(selectedSectionKey);
  }

  async function saveTheme() {
    if (!canManage || !settings) return;
    setSaving(true);
    setError('');

    const { error: saveError } = await LandingCmsModel.saveLandingSettings(settings);
    setSaving(false);

    if (saveError) {
      setError('Error saving theme: ' + saveError.message);
      return;
    }

    setNotice('landingThemeSaved');
    await loadAll(selectedSectionKey);
  }

  function updateThemeField(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function updateSectionStyle(field, value) {
    setSectionForm(prev => ({
      ...prev,
      style_json: {
        ...prev.style_json,
        [field]: value,
      },
    }));
  }

  useEffect(() => {
    if (canManage) loadAll('hero');
    else setLoading(false);
  }, [canManage]);

  return {
    canManage,
    activeTab,
    setActiveTab,
    sections: sortedSections,
    items: paginatedSectionItems,
    listPagination,
    settings,
    selectedSectionKey,
    sectionForm,
    setSectionForm,
    itemForm,
    setItemForm,
    showSectionForm,
    showItemForm,
    loading,
    saving,
    error,
    notice,
    hasTable,
    themeFields: THEME_FIELDS,
    sectionLabels: LandingCmsModel.SECTION_LABELS,
    itemTypes: LandingCmsModel.ITEM_TYPES_BY_SECTION[selectedSectionKey] || [],
    selectSection,
    openNewSectionForm,
    openEditSection,
    saveSection,
    removeSection,
    toggleSectionVisibility,
    moveSection,
    reindexSections,
    openNewItemForm,
    openEditItem,
    updateItemContent,
    updateItemStyle,
    updateItemField,
    saveItem,
    removeItem,
    toggleItemVisibility,
    moveItem,
    reindexItems,
    saveTheme,
    updateThemeField,
    updateSectionStyle,
    setShowSectionForm,
    setShowItemForm,
    loadAll,
  };
}
