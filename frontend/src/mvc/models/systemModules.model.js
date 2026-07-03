export const SYSTEM_MODULES = [
  { id: 'home', icon: '🏠', titleKey: 'systemModuleHomeTitle', textKey: 'systemModuleHomeText', screenshot: 'home' },
  { id: 'members', icon: '👥', titleKey: 'systemModuleMembersTitle', textKey: 'systemModuleMembersText', screenshot: 'members' },
  { id: 'clubs', icon: '🎯', titleKey: 'systemModuleClubsTitle', textKey: 'systemModuleClubsText', screenshot: 'clubs' },
  { id: 'calendar', icon: '🗓️', titleKey: 'systemModuleCalendarTitle', textKey: 'systemModuleCalendarText', screenshot: 'calendar' },
  { id: 'events', icon: '📅', titleKey: 'systemModuleEventsTitle', textKey: 'systemModuleEventsText', screenshot: 'events' },
  { id: 'planning', icon: '📋', titleKey: 'systemModulePlanningTitle', textKey: 'systemModulePlanningText', screenshot: 'planning' },
  { id: 'progress', icon: '📚', titleKey: 'systemModuleProgressTitle', textKey: 'systemModuleProgressText', screenshot: 'progress' },
  { id: 'specialties', icon: '⭐', titleKey: 'systemModuleSpecialtiesTitle', textKey: 'systemModuleSpecialtiesText', screenshot: 'specialties' },
  { id: 'cargos', icon: '🎖️', titleKey: 'systemModuleCargosTitle', textKey: 'systemModuleCargosText', screenshot: 'cargos' },
  { id: 'carnets', icon: '🪪', titleKey: 'systemModuleCarnetsTitle', textKey: 'systemModuleCarnetsText', screenshot: 'carnets' },
  { id: 'news', icon: '📰', titleKey: 'systemModuleNewsTitle', textKey: 'systemModuleNewsText', screenshot: 'news' },
  { id: 'churches', icon: '⛪', titleKey: 'systemModuleChurchesTitle', textKey: 'systemModuleChurchesText', screenshot: 'churches' },
];

export function getSystemModules() {
  return SYSTEM_MODULES;
}
