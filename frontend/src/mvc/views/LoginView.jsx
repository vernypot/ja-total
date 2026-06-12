import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../hooks/useLanguage';

export default function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  error,
  isLoading,
  handleLogin,
}) {
  const { t } = useLanguage();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
        <LanguageSwitcher />
      </div>
      <h2>{t('loginTitle')}</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      <input placeholder={t('loginEmail')} value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
      <input type="password" placeholder={t('loginPassword')} value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
      <button onClick={handleLogin} disabled={isLoading}>{isLoading ? t('signingIn') : t('signIn')}</button>
    </div>
  );
}
