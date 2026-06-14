import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { PathfinderShield, ProgramIcon } from '../../components/landing/YouthClubIcons';
import { useLanguage } from '../../hooks/useLanguage';
import '../../styles/landing.css';

const HERO_ICONS = ['pathfinders', 'adventurers', 'masterguide'];

export default function LandingView({
  user,
  heroSlides,
  heroIndex,
  setHeroIndex,
  programs,
  stats,
  news,
  events,
  goToLogin,
  goToDashboard,
  formatDate,
  eventDayParts,
}) {
  const { t } = useLanguage();
  const heroIcon = HERO_ICONS[heroIndex] || 'pathfinders';

  return (
    <div className="landing-page">
      <div className="landing-topbar">
        <div className="landing-topbar-inner">
          <div className="landing-topbar-tag">
            <span className="landing-topbar-dot" />
            {t('landingTopbarTag')}
          </div>
          <span>{t('landingTopbarContact')}</span>
        </div>
      </div>

      <header className="landing-header">
        <div className="landing-header-inner">
          <a href="#inicio" className="landing-brand">
            <PathfinderShield className="landing-brand-mark" />
            <div className="landing-brand-text">
              <strong>{t('appName')}</strong>
              <span>{t('landingBrandSubtitle')}</span>
            </div>
          </a>

          <nav className="landing-nav">
            <div className="landing-nav-links">
              <a href="#inicio">{t('landingNavHome')}</a>
              <a href="#clubes">{t('landingNavClubs')}</a>
              <a href="#eventos">{t('landingNavEvents')}</a>
              <a href="#noticias">{t('landingNavNews')}</a>
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

      <section className="landing-hero" id="inicio">
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
                <div className="landing-eyebrow">{t(slide.eyebrowKey)}</div>
                <h1 className="landing-hero-title">{t(slide.titleKey)}</h1>
                <p className="landing-hero-text">{t(slide.textKey)}</p>
                <div className="landing-hero-actions">
                  <button type="button" className="landing-btn landing-btn-gold" onClick={user ? goToDashboard : goToLogin}>
                    {user ? t('landingEnterDashboard') : t('landingHeroCta')}
                  </button>
                  <a href="#noticias" className="landing-btn landing-btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>
                    {t('landingHeroSecondary')}
                  </a>
                </div>
              </div>
              <div className="landing-hero-visual">
                <div className="landing-hero-card">
                  <ProgramIcon type={heroIcon} className="landing-hero-card-icon" />
                  <h3>{t('landingHeroCardTitle')}</h3>
                  <p>{t('landingHeroCardText')}</p>
                </div>
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

      <section className="landing-section" id="clubes">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">{t('landingProgramsEyebrow')}</span>
            <h2 className="landing-section-title">{t('landingProgramsTitle')}</h2>
            <p className="landing-section-text">{t('landingProgramsText')}</p>
          </div>
          <div className="landing-programs-grid">
            {programs.map(program => (
              <article key={program.id} className="landing-program-card">
                <ProgramIcon type={program.icon} className="landing-program-icon" />
                <h3>{t(program.titleKey)}</h3>
                <p>{t(program.textKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner landing-about-grid">
          <div className="landing-about-copy">
            <div className="landing-section-head">
              <span className="landing-section-eyebrow">{t('landingAboutEyebrow')}</span>
              <h2 className="landing-section-title">{t('landingAboutTitle')}</h2>
              <p className="landing-section-text">{t('landingAboutText')}</p>
            </div>
            <button type="button" className="landing-btn landing-btn-primary" onClick={user ? goToDashboard : goToLogin}>
              {user ? t('landingEnterDashboard') : t('landingAboutCta')}
            </button>
          </div>
          <div className="landing-stats-grid">
            {stats.map(stat => (
              <div key={stat.id} className="landing-stat-card">
                <div className="landing-stat-value">{t(stat.valueKey)}</div>
                <div className="landing-stat-label">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="eventos">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">{t('landingEventsEyebrow')}</span>
            <h2 className="landing-section-title">{t('landingEventsTitle')}</h2>
            <p className="landing-section-text">{t('landingEventsText')}</p>
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

      <section className="landing-section landing-section-alt" id="noticias">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">{t('landingNewsEyebrow')}</span>
            <h2 className="landing-section-title">{t('landingNewsTitle')}</h2>
            <p className="landing-section-text">{t('landingNewsText')}</p>
          </div>
          <div className="landing-news-grid">
            {news.map(item => (
              <article key={item.id} className="landing-news-card">
                <div className="landing-news-thumb">
                  <PathfinderShield />
                </div>
                <div className="landing-news-body">
                  <div className="landing-news-meta">
                    <span className="landing-news-category">{t(item.categoryKey)}</span>
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

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <div>
            <h2>{t('landingCtaTitle')}</h2>
            <p>{t('landingCtaText')}</p>
          </div>
          <button type="button" className="landing-btn landing-btn-gold" onClick={user ? goToDashboard : goToLogin}>
            {user ? t('landingEnterDashboard') : t('landingCtaButton')}
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-section-inner landing-footer-grid">
          <div>
            <h4>{t('appName')}</h4>
            <p>{t('landingFooterAbout')}</p>
          </div>
          <div>
            <h4>{t('landingFooterLinks')}</h4>
            <p><a href="#clubes">{t('landingNavClubs')}</a></p>
            <p><a href="#eventos">{t('landingNavEvents')}</a></p>
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
