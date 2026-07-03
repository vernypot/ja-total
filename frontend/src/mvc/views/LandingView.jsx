import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { ProgramLogo } from '../../components/landing/YouthClubIcons';
import LandingHeroScreenshot, { resolveHeroScreenshot } from '../../components/landing/LandingHeroScreenshot';
import NoticiaBanner from '../../components/NoticiaBanner';
import LandingInfoRequestModal from '../../components/landing/LandingInfoRequestModal';
import { useLanguage } from '../../hooks/useLanguage';
import { getSectionCopy, resolveSlideText, resolveProgramText, resolveStatText } from '../models/landingContent.model';
import '../../styles/landing.css';
import '../../styles/landingHeroScreenshot.css';
import '../../styles/landingInfoRequest.css';

const BRAND_MARK = '/teofila-mark.svg';

function sectionStyle(section) {
  if (!section?.style_json) return {};
  const style = typeof section.style_json === 'object' ? section.style_json : {};
  const css = {};
  if (style.background_color) css.background = style.background_color;
  if (style.text_color) css.color = style.text_color;
  return css;
}

export default function LandingView({
  user,
  loading,
  content,
  heroSlides,
  heroIndex,
  setHeroIndex,
  goToLogin,
  goToDashboard,
  formatDate,
  eventDayParts,
  language,
  infoModalOpen,
  openInfoModal,
  closeInfoModal,
}) {
  const { t } = useLanguage();
  const infoCtaLabel = t('landingInfoRequestCta');

  if (loading || !content) {
    return <div className="landing-page" style={{ padding: '3rem', textAlign: 'center' }}>{t('loadingLanding')}</div>;
  }

  const {
    themeStyle,
    sections,
    visibleSections,
    programs,
    stats,
    news,
    events,
    footerContact,
    bannerNoticias = [],
  } = content;

  const show = key => !content.fromCms || visibleSections.has(key);

  return (
    <div className="landing-page" style={themeStyle}>
      {show('topbar') && (
        <div className="landing-topbar" style={sectionStyle(sections.topbar)}>
          <div className="landing-topbar-inner">
            <div className="landing-topbar-tag">
              <span className="landing-topbar-dot" />
              {getSectionCopy(sections, 'topbar', 'eyebrow', language, t)}
            </div>
            <span>{getSectionCopy(sections, 'topbar', 'body', language, t)}</span>
          </div>
        </div>
      )}

      <header className="landing-header">
        <div className="landing-header-inner">
          <a href="#inicio" className="landing-brand">
            <img src={BRAND_MARK} alt="" className="landing-brand-mark" />
            <div className="landing-brand-text">
              <strong>{t('appName')}</strong>
              <span>{t('landingBrandSubtitle')}</span>
            </div>
          </a>

          <nav className="landing-nav">
            <div className="landing-nav-links">
              <a href="#inicio">{t('landingNavHome')}</a>
              {show('programs') && <a href="#clubes">{t('landingNavClubs')}</a>}
              {show('events') && <a href="#eventos">{t('landingNavEvents')}</a>}
              {show('news') && <a href="#noticias">{t('landingNavNews')}</a>}
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

      {bannerNoticias.length > 0 && (
        <NoticiaBanner
          items={bannerNoticias}
          formatDate={formatDate}
          onCtaClick={openInfoModal}
          ctaLabel={infoCtaLabel}
        />
      )}

      {show('hero') && heroSlides.length > 0 && (
        <section className="landing-hero" id="inicio" style={sectionStyle(sections.hero)}>
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`landing-hero-slide${index === heroIndex ? ' is-active' : ''}`}
              aria-hidden={index !== heroIndex}
            >
              <div className="landing-hero-bg">
                <div className="landing-hero-grid" />
                <div className="landing-hero-shape landing-hero-shape-1" />
                <div className="landing-hero-shape landing-hero-shape-2" />
                <div className="landing-hero-shape landing-hero-shape-3" />
              </div>
              <div className="landing-hero-inner">
                <div className="landing-hero-copy">
                  <div className="landing-eyebrow">{resolveSlideText(slide, 'eyebrow', t)}</div>
                  <h1 className="landing-hero-title">{resolveSlideText(slide, 'title', t)}</h1>
                  <p className="landing-hero-text">{resolveSlideText(slide, 'text', t)}</p>
                  <div className="landing-hero-actions">
                    <button type="button" className="landing-btn landing-btn-gold" onClick={openInfoModal}>
                      {infoCtaLabel}
                    </button>
                    <a href="#clubes" className="landing-btn landing-btn-outline-on-dark">
                      {t('landingHeroSecondary')}
                    </a>
                  </div>
                </div>
                <div className="landing-hero-visual">
                  <LandingHeroScreenshot
                    variant={resolveHeroScreenshot(slide)}
                    language={language}
                    label={resolveSlideText(slide, 'title', t)}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="landing-hero-dots">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={`landing-hero-dot${index === heroIndex ? ' is-active' : ''}`}
                aria-label={`${t('landingHeroSlide')} ${index + 1}`}
                onClick={() => setHeroIndex(index)}
              />
            ))}
          </div>
        </section>
      )}

      {show('programs') && (
        <section className="landing-section" id="clubes" style={sectionStyle(sections.programs)}>
          <div className="landing-section-inner">
            <div className="landing-section-head">
              <ProgramLogo type="ministerios" className="landing-programs-banner-logo" language={language} />
              <span className="landing-section-eyebrow">{getSectionCopy(sections, 'programs', 'eyebrow', language, t)}</span>
              <h2 className="landing-section-title">{getSectionCopy(sections, 'programs', 'title', language, t)}</h2>
              <p className="landing-section-text">{getSectionCopy(sections, 'programs', 'body', language, t)}</p>
            </div>
            <div className="landing-programs-grid">
              {programs.map(program => (
                <article key={program.id} className="landing-program-card">
                  <ProgramLogo type={program.icon} className="landing-program-icon" language={language} />
                  <h3>{resolveProgramText(program, 'title', t)}</h3>
                  <p>{resolveProgramText(program, 'text', t)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {show('about') && (
        <section className="landing-section landing-section-alt" style={sectionStyle(sections.about)}>
          <div className="landing-section-inner landing-about-grid">
            <div className="landing-about-copy">
              <div className="landing-section-head">
                <span className="landing-section-eyebrow">{getSectionCopy(sections, 'about', 'eyebrow', language, t)}</span>
                <h2 className="landing-section-title">{getSectionCopy(sections, 'about', 'title', language, t)}</h2>
                <p className="landing-section-text">{getSectionCopy(sections, 'about', 'body', language, t)}</p>
              </div>
              <button type="button" className="landing-btn landing-btn-primary" onClick={openInfoModal}>
                {infoCtaLabel}
              </button>
            </div>
            <div className="landing-stats-grid" aria-live="polite">
              {stats.map(stat => (
                <div key={stat.id} className="landing-stat-card">
                  <div className="landing-stat-value" aria-label={resolveStatText(stat, 'label', t)}>
                    {resolveStatText(stat, 'value', t)}
                  </div>
                  <div className="landing-stat-label">{resolveStatText(stat, 'label', t)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {show('events') && (
        <section className="landing-section" id="eventos" style={sectionStyle(sections.events)}>
          <div className="landing-section-inner">
            <div className="landing-section-head">
              <span className="landing-section-eyebrow">{getSectionCopy(sections, 'events', 'eyebrow', language, t)}</span>
              <h2 className="landing-section-title">{getSectionCopy(sections, 'events', 'title', language, t)}</h2>
              <p className="landing-section-text">{getSectionCopy(sections, 'events', 'body', language, t)}</p>
            </div>
            <div className="landing-events-list">
              {events.map(evento => {
                const parts = eventDayParts(evento.date);
                return (
                  <article key={evento.id} className="landing-event-row">
                    <div className="landing-event-date">
                      <strong>{parts.day}</strong>
                      <span>{parts.month}</span>
                    </div>
                    <div className="landing-event-info">
                      <h3>{evento.title}</h3>
                      <p>{evento.place}</p>
                    </div>
                    <div className="landing-event-time">{evento.time}</div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {show('news') && (
        <section className="landing-section landing-section-alt" id="noticias" style={sectionStyle(sections.news)}>
          <div className="landing-section-inner">
            <div className="landing-section-head">
              <span className="landing-section-eyebrow">{getSectionCopy(sections, 'news', 'eyebrow', language, t)}</span>
              <h2 className="landing-section-title">{getSectionCopy(sections, 'news', 'title', language, t)}</h2>
              <p className="landing-section-text">{getSectionCopy(sections, 'news', 'body', language, t)}</p>
            </div>
            <div className="landing-news-grid">
              {news.map(item => (
                <article key={item.id} className="landing-news-card">
                  <div className="landing-news-thumb">
                    <ProgramLogo type="ministerios" className="landing-news-thumb-logo" language={language} />
                  </div>
                  <div className="landing-news-body">
                    <div className="landing-news-meta">
                      <span className="landing-news-category">{item.category}</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {show('cta') && (
        <section className="landing-cta" style={sectionStyle(sections.cta)}>
          <div className="landing-cta-inner">
            <div>
              <h2>{getSectionCopy(sections, 'cta', 'title', language, t)}</h2>
              <p>{getSectionCopy(sections, 'cta', 'body', language, t)}</p>
            </div>
            <button type="button" className="landing-btn landing-btn-gold" onClick={openInfoModal}>
              {infoCtaLabel}
            </button>
          </div>
        </section>
      )}

      <LandingInfoRequestModal open={infoModalOpen} onClose={closeInfoModal} />

      {show('footer') && (
        <footer className="landing-footer" style={sectionStyle(sections.footer)}>
          <div className="landing-section-inner landing-footer-grid">
            <div>
              <h4>{t('appName')}</h4>
              <p>{getSectionCopy(sections, 'footer', 'body', language, t)}</p>
              <p className="landing-footer-disclaimer">{t('landingFooterDisclaimer')}</p>
            </div>
            <div>
              <h4>{t('landingFooterLinks')}</h4>
              <p><a href="#clubes">{t('landingNavClubs')}</a></p>
              <p><a href="#eventos">{t('landingNavEvents')}</a></p>
              <p>
                <button type="button" className="landing-footer-link-btn" onClick={openInfoModal}>
                  {infoCtaLabel}
                </button>
              </p>
              <p><Link to="/login">{t('signIn')}</Link></p>
            </div>
            <div>
              <h4>{t('landingFooterContact')}</h4>
              <p>{footerContact?.email || t('landingFooterEmail')}</p>
              <p>{footerContact?.phone || t('landingFooterPhone')}</p>
            </div>
          </div>
          <div className="landing-section-inner landing-footer-bottom">
            © {new Date().getFullYear()} {t('appName')}. {t('landingFooterRights')}
          </div>
        </footer>
      )}
    </div>
  );
}
