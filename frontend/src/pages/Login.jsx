import { useState, useContext } from "react";
import { sb } from "../services/supabase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setIsLoading(true);
    
    try {
      const { data, error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message || "Login failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }
      setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

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
