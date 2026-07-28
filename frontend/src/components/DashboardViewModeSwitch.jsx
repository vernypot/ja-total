import { useLanguage } from '../hooks/useLanguage';
import { useDashboardViewMode } from '../context/DashboardViewModeContext';

export default function DashboardViewModeSwitch({
  variant = 'dropdown',
  className = '',
  onAfterSwitch,
}) {
  const { t } = useLanguage();
  const {
    isMemberView,
    canSwitchViewMode,
    loadingLinkedAccess,
    switchingMode,
    switchError,
    switchToMemberView,
    switchToAdminView,
  } = useDashboardViewMode();

  if (!canSwitchViewMode) return null;

  async function handleSwitch() {
    const action = isMemberView ? switchToAdminView : switchToMemberView;
    await action();
    onAfterSwitch?.();
  }

  const label = isMemberView
    ? t('dashboardSwitchToAdminOptions')
    : t('dashboardSwitchToMemberOptions');

  if (variant === 'profile') {
    return (
      <div className={`dashboard-view-mode-switch dashboard-view-mode-switch--profile ${className}`.trim()}>
        <button
          type="button"
          className="dashboard-view-mode-switch__btn"
          onClick={handleSwitch}
          disabled={loadingLinkedAccess || switchingMode}
        >
          {switchingMode ? t('loading') : label}
        </button>
        {switchError && (
          <p className="dashboard-view-mode-switch__error">{switchError}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <hr />
      <button
        type="button"
        className={`dropdown-item dashboard-view-mode-switch__dropdown ${className}`.trim()}
        onClick={handleSwitch}
        disabled={loadingLinkedAccess || switchingMode}
      >
        {switchingMode ? t('loading') : label}
      </button>
      {switchError && (
        <div className="dropdown-item dashboard-view-mode-switch__error">{switchError}</div>
      )}
      <hr />
    </>
  );
}
