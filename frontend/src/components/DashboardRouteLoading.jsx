import { useLanguage } from '../hooks/useLanguage';

export default function DashboardRouteLoading() {
  const { t } = useLanguage();

  return (
    <div className="container" style={{ padding: '40px', textAlign: 'center' }}>
      <div className="loading">{t('loading')}</div>
    </div>
  );
}
