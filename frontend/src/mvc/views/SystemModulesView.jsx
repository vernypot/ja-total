import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import LandingInfoRequestModal from '../../components/landing/LandingInfoRequestModal';
import SystemModuleScreenshot from '../../components/landing/SystemModuleScreenshot';
import { useLanguage } from '../../hooks/useLanguage';
import '../../styles/landing.css';
import '../../styles/landingHeroScreenshot.css';
import '../../styles/landingInfoRequest.css';
import '../../styles/systemModules.css';

import { BRAND_MARK } from '../../constants/brand';

export default function SystemModulesView({
  user,
  language,
  modules,
  infoModalOpen,
  goToLogin,
  goToDashboard,
  openInfoModal,
  closeInfoModal,
}) {
  const { t } = useLanguage();
  const infoCtaLabel = t('landingInfoRequestCta');

  return (
    <div className="landing-page system-modules-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand">
            <img src={BRAND_MARK} alt="" className="landing-brand-mark" />
            <div className="landing-brand-text">
              <strong>{t('appName')}</strong>
              <span>{t('landingBrandSubtitle')}</span>
            </div>
          </Link>

          <nav className="landing-nav">
            <div className="landing-nav-links">
              <Link to="/">{t('landingNavHome')}</Link>
              <span className="landing-nav-current">{t('systemModulesNav')}</span>
              <button type="button" className="landing-nav-info-link" onClick={openInfoModal}>
                {infoCtaLabel}
              </button>
            </div>
          </nav>

          <div className="landing-header-actions">
            <LanguageSwitcher />
            {user ? (
              <button type="button" className="landing-btn landing-btn-primary" onClick={goToDashboard}>
                {t('landingEnterDashboard')}
              </button>
            ) : (
              <button type="button" className="landing-btn landing-btn-primary" onClick={goToLogin}>
                {t('signIn')}
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="system-modules-hero">
        <div className="landing-section-inner">
          <span className="landing-section-eyebrow">{t('systemModulesEyebrow')}</span>
          <h1 className="system-modules-title">{t('systemModulesTitle')}</h1>
          <p className="system-modules-intro">{t('systemModulesIntro')}</p>
          <div className="system-modules-hero-actions">
            <button type="button" className="landing-btn landing-btn-gold" onClick={openInfoModal}>
              {infoCtaLabel}
            </button>
            <Link to="/" className="landing-btn landing-btn-outline-on-dark">
              {t('landingBackHome')}
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="system-modules-grid">
            {modules.map((module, index) => (
              <article key={module.id} id={module.id} className="system-module-card">
                <div className="system-module-card-copy">
                  <span className="system-module-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="system-module-icon" aria-hidden="true">{module.icon}</span>
                  <h2>{t(module.titleKey)}</h2>
                  <p>{t(module.textKey)}</p>
                  <button type="button" className="system-module-info-link" onClick={openInfoModal}>
                    {infoCtaLabel}
                  </button>
                </div>
                <div className="system-module-card-visual">
                  <SystemModuleScreenshot
                    variant={module.screenshot}
                    language={language}
                    label={t(module.titleKey)}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <div>
            <h2>{t('systemModulesCtaTitle')}</h2>
            <p>{t('systemModulesCtaText')}</p>
          </div>
          <button type="button" className="landing-btn landing-btn-gold" onClick={openInfoModal}>
            {infoCtaLabel}
          </button>
        </div>
      </section>

      <LandingInfoRequestModal open={infoModalOpen} onClose={closeInfoModal} />

      <footer className="landing-footer">
        <div className="landing-section-inner landing-footer-grid">
          <div>
            <h4>{t('appName')}</h4>
            <p>{t('landingFooterAbout')}</p>
            <p className="landing-footer-disclaimer">{t('landingFooterDisclaimer')}</p>
          </div>
          <div>
            <h4>{t('landingFooterLinks')}</h4>
            <p><Link to="/">{t('landingNavHome')}</Link></p>
            <p><Link to="/modulos">{t('systemModulesNav')}</Link></p>
            <p>
              <button type="button" className="landing-footer-link-btn" onClick={openInfoModal}>
                {infoCtaLabel}
              </button>
            </p>
            <p><Link to="/login">{t('signIn')}</Link></p>
          </div>
          <div>
            <h4>{t('landingFooterContact')}</h4>
            <p>{t('landingFooterEmail')}</p>
            <p>{t('landingFooterPhone')}</p>
          </div>
        </div>
        <div className="landing-section-inner landing-footer-bottom">
          © {new Date().getFullYear()} {t('appName')}. {t('landingFooterRights')}
        </div>
      </footer>
    </div>
  );
}
