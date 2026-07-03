import { Link } from 'react-router-dom';
import { ProgramLogo } from './YouthClubIcons';
import LandingHeroVisual from './LandingHeroVisual';

const HERO_MODULE_KEYS = [
  { icon: 'pathfinders', titleKey: 'landingHeroModulePathfinders', textKey: 'landingHeroModulePathfindersText' },
  { icon: 'adventurers', titleKey: 'landingHeroModuleAdventurers', textKey: 'landingHeroModuleAdventurersText' },
  { icon: 'masterguide', titleKey: 'landingHeroModuleMasterGuide', textKey: 'landingHeroModuleMasterGuideText' },
];

const HERO_BENEFIT_KEYS = [
  'landingHeroWhyBenefit1',
  'landingHeroWhyBenefit2',
  'landingHeroWhyBenefit3',
  'landingHeroWhyBenefit4',
];

export default function LandingHeroSlide({
  slide,
  t,
  language,
  user,
  goToLogin,
  goToDashboard,
  openInfoModal,
  infoCtaLabel,
  resolveSlideText,
}) {
  const layout = slide.layout || 'default';
  const title = resolveSlideText(slide, 'title', t);

  function startNow() {
    if (user) goToDashboard();
    else goToLogin();
  }

  let body = null;
  let actions = null;

  if (layout === 'intro') {
    body = (
      <>
        <h1 className="landing-hero-title">{title || t('landingHeroIntroTitle')}</h1>
        <p className="landing-hero-tagline">{resolveSlideText(slide, 'tagline', t) || t('landingHeroIntroTagline')}</p>
        <p className="landing-hero-text landing-hero-text--flush">{resolveSlideText(slide, 'text', t) || t('landingHeroIntroText')}</p>
      </>
    );
    actions = (
      <>
        <button type="button" className="landing-btn landing-btn-gold" onClick={startNow}>
          {t('landingHeroPrimaryCta')}
        </button>
        <Link to="/modulos" className="landing-btn landing-btn-outline-on-dark">
          {t('landingHeroSecondary')}
        </Link>
      </>
    );
  } else if (layout === 'about') {
    body = (
      <>
        <div className="landing-eyebrow">{resolveSlideText(slide, 'eyebrow', t)}</div>
        <h2 className="landing-hero-title landing-hero-title--slide">{title || t('landingHeroAboutTitle')}</h2>
        <p className="landing-hero-text">{resolveSlideText(slide, 'text', t) || t('landingHeroAboutText1')}</p>
        <p className="landing-hero-text landing-hero-text--flush">{resolveSlideText(slide, 'text2', t) || t('landingHeroAboutText2')}</p>
      </>
    );
  } else if (layout === 'modules') {
    body = (
      <>
        <div className="landing-eyebrow">{resolveSlideText(slide, 'eyebrow', t)}</div>
        <h2 className="landing-hero-title landing-hero-title--slide">{title || t('landingHeroModulesTitle')}</h2>
        <ul className="landing-hero-slide-list">
          {HERO_MODULE_KEYS.map(item => (
            <li key={item.icon}>
              <ProgramLogo type={item.icon} className="landing-hero-slide-list-logo" language={language} />
              <div>
                <strong>{t(item.titleKey)}</strong>
                <span>{t(item.textKey)}</span>
              </div>
            </li>
          ))}
          <li className="landing-hero-slide-list-more">{t('landingHeroModulesMore')}</li>
        </ul>
        <p className="landing-hero-text landing-hero-text--tight landing-hero-text--flush">{resolveSlideText(slide, 'text', t) || t('landingHeroModulesText')}</p>
      </>
    );
    actions = (
      <Link to="/modulos" className="landing-btn landing-btn-gold">{t('landingHeroSecondary')}</Link>
    );
  } else if (layout === 'why') {
    body = (
      <>
        <div className="landing-eyebrow">{resolveSlideText(slide, 'eyebrow', t)}</div>
        <h2 className="landing-hero-title landing-hero-title--slide">{title || t('landingHeroWhyTitle')}</h2>
        <ul className="landing-hero-slide-benefits landing-hero-slide-benefits--flush">
          {HERO_BENEFIT_KEYS.map(key => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </>
    );
    actions = (
      <button type="button" className="landing-btn landing-btn-gold" onClick={startNow}>
        {t('landingHeroPrimaryCta')}
      </button>
    );
  } else {
    body = (
      <>
        <div className="landing-eyebrow">{resolveSlideText(slide, 'eyebrow', t)}</div>
        <h2 className="landing-hero-title landing-hero-title--slide">{title}</h2>
        <p className="landing-hero-text landing-hero-text--flush">{resolveSlideText(slide, 'text', t)}</p>
      </>
    );
    actions = (
      <>
        <button type="button" className="landing-btn landing-btn-gold" onClick={openInfoModal}>
          {infoCtaLabel}
        </button>
        <Link to="/modulos" className="landing-btn landing-btn-outline-on-dark">
          {t('landingHeroSecondary')}
        </Link>
      </>
    );
  }

  return (
    <div className="landing-hero-inner">
      <div className="landing-hero-copy">
        <div className="landing-hero-copy-body">{body}</div>
        <div className="landing-hero-actions">{actions}</div>
      </div>
      <div className="landing-hero-visual">
        <LandingHeroVisual slide={slide} language={language} label={title || t('landingHeroIntroTitle')} />
      </div>
    </div>
  );
}
