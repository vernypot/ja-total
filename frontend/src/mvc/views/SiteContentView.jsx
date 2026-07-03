import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/siteContent.css';

export default function SiteContentView({ pages, openPreview }) {
  const { t } = useLanguage();

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>📝 {t('siteContentTitle')} <PageHelpLink pageId="siteContent" /></h1>
          <p className="site-content-hint">{t('siteContentHint')}</p>
        </div>
      </div>

      <div className="site-content-grid">
        {pages.map(page => (
          <article key={page.id} className="site-content-card">
            <div className="site-content-card-head">
              <div>
                <h2>{t(page.titleKey)}</h2>
                <code className="site-content-path">{page.path}</code>
              </div>
              <button
                type="button"
                className="site-content-btn site-content-btn--ghost"
                onClick={() => openPreview(page.path)}
              >
                ↗ {t('siteContentPreview')}
              </button>
            </div>
            <p className="site-content-desc">{t(page.descKey)}</p>
            <div className="site-content-actions">
              {page.editors.map(editor => (
                <Link
                  key={editor.id}
                  to={editor.path}
                  className="site-content-btn site-content-btn--primary"
                >
                  ✏️ {t(editor.labelKey)}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="site-content-footnote card">
        <p>{t('siteContentFootnote')}</p>
        <div className="site-content-footnote-links">
          <Link to="/dashboard/advanced-settings" className="site-content-inline-link">
            {t('advancedSettings')}
          </Link>
          <Link to="/dashboard/page-help" className="site-content-inline-link">
            {t('pageHelpAdminTitle')}
          </Link>
        </div>
      </div>
    </div>
  );
}
