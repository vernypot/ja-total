import { useMemberPortalProfileController } from '../../mvc/controllers/useMemberPortalProfileController';

export default function PortalProfileHeader() {
  const { fullName, displayPhotoUrl, loading, t } = useMemberPortalProfileController();

  const greetingName = fullName || t('portalGreetingMember');

  return (
    <div className="portal-profile-header">
      <div className="portal-profile-header__avatar" aria-hidden={loading ? 'true' : undefined}>
        {displayPhotoUrl ? (
          <img src={displayPhotoUrl} alt="" />
        ) : (
          <span className="portal-profile-header__avatar-fallback">👤</span>
        )}
      </div>
      <div className="portal-profile-header__text">
        <p className="portal-profile-header__greeting">
          {t('portalGreetingHi')}{loading ? '' : ` ${greetingName}`}
        </p>
      </div>
    </div>
  );
}
