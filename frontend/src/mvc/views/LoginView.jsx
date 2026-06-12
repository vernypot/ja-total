export default function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  error,
  isLoading,
  handleLogin,
}) {
  return (
    <div>
      <h2>Login</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
      <button onClick={handleLogin} disabled={isLoading}>{isLoading ? 'Ingresando...' : 'Ingresar'}</button>
    </div>
  );
}
