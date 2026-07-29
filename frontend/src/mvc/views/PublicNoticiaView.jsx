import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import NoticiaFeaturedImage from '../../components/NoticiaFeaturedImage';
import NoticiaHtml from '../../components/NoticiaHtml';
import { BRAND_MARK } from '../../constants/brand';
import '../../styles/landing.css';
import '../../styles/noticia-html.css';
import '../../styles/noticias.css';
import '../../styles/publicNoticia.css';

export default function PublicNoticiaView({
  noticia,
  loading,
  notFound,
  formatDate,
  t,
}) {
  if (loading) {
    return (
      <div className="public-noticia-page">
        <p className="public-noticia-status">{t('loading')}</p>
      </div>
    );
  }

  if (notFound || !noticia) {
    return (
      <div className="public-noticia-page">
        <header className="public-noticia-header">
          <div className="public-noticia-header-inner">
            <Link to="/" className="public-noticia-brand">
              <img src={BRAND_MARK} alt="" className="public-noticia-brand-mark" />
              <strong>{t('appName')}</strong>
            </Link>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="public-noticia-main">
          <div className="public-noticia-card">
            <h1>{t('publicNoticiaNotFound')}</h1>
            <p className="public-noticia-lead">{t('publicNoticiaNotFoundHint')}</p>
            <Link to="/#noticias" className="landing-btn landing-btn-primary public-noticia-back-btn">
              {t('publicNoticiaBackToNews')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="public-noticia-page">
      <header className="public-noticia-header">
        <div className="public-noticia-header-inner">
          <Link to="/" className="public-noticia-brand">
            <img src={BRAND_MARK} alt="" className="public-noticia-brand-mark" />
            <strong>{t('appName')}</strong>
          </Link>
          <div className="public-noticia-header-actions">
            <LanguageSwitcher />
            <Link to="/login" className="landing-btn landing-btn-primary landing-btn-sm">
              {t('signIn')}
            </Link>
          </div>
        </div>
      </header>

      <main className="public-noticia-main">
        <article className="public-noticia-card">
          <Link to="/#noticias" className="public-noticia-back-link">
            ← {t('publicNoticiaBackToNews')}
          </Link>

          <div className="public-noticia-meta">
            {noticia.categoria && (
              <span className="public-noticia-category">{noticia.categoria}</span>
            )}
            {noticia.publicado_en && (
              <time dateTime={noticia.publicado_en}>{formatDate(noticia.publicado_en)}</time>
            )}
          </div>

          <NoticiaHtml
            html={noticia.titulo}
            variant="title"
            as="h1"
            className="public-noticia-title noticia-html--title"
          />

          {(noticia.imagen_destacada_url || noticia.imagen_destacada_mobile_url) && (
            <NoticiaFeaturedImage
              desktopUrl={noticia.imagen_destacada_url}
              mobileUrl={noticia.imagen_destacada_mobile_url}
              className="public-noticia-featured-image"
            />
          )}

          {noticia.resumen && (
            <NoticiaHtml
              html={noticia.resumen}
              variant="summary"
              className="public-noticia-summary noticia-html--summary"
            />
          )}

          <NoticiaHtml
            html={noticia.contenido}
            variant="content"
            className="public-noticia-content noticia-html--content"
          />
        </article>
      </main>
    </div>
  );
}
