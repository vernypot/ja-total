import { useState, useContext } from 'react';
import { sb } from '../services/supabase';
import { AuthContext } from '../context/AuthContext';

export default function PasswordReset({ onClose, userEmail, isOwnPassword = true }) {
  const { user, userData } = useContext(AuthContext);
  const userRole = userData?.rol || 'user';
  const canResetOthers = userRole === 'superadmin';

  const [step, setStep] = useState(isOwnPassword ? 'current-password' : 'new-password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Password must contain a special character';
    return null;
  };

  const handleChangeOwnPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Verify current password by attempting sign in
      const { error: signInError } = await sb.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Validate new password
      const pwdError = validatePassword(newPassword);
      if (pwdError) {
        setError(pwdError);
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await sb.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError('Error updating password: ' + updateError.message);
        setLoading(false);
        return;
      }

      setSuccess('✓ Password updated successfully! Please log in again.');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetOtherPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!canResetOthers) {
      setError('Only superadmin can reset other user passwords');
      setLoading(false);
      return;
    }

    try {
      // Validate new password
      const pwdError = validatePassword(newPassword);
      if (pwdError) {
        setError(pwdError);
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Get the user from Supabase auth by email
      const { data: users, error: getUserError } = await sb.auth.admin.listUsers();

      if (getUserError) {
        setError('Error fetching users: ' + getUserError.message);
        setLoading(false);
        return;
      }

      const targetUser = users.find(u => u.email === userEmail);

      if (!targetUser) {
        setError('User not found');
        setLoading(false);
        return;
      }

      // Update password using admin API
      const { error: updateError } = await sb.auth.admin.updateUserById(
        targetUser.id,
        { password: newPassword }
      );

      if (updateError) {
        setError('Error updating password: ' + updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(`✓ Password reset for ${userEmail} successfully!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '500px',
          padding: '30px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🔑 {isOwnPassword ? 'Cambiar Contraseña' : `Restablecer Contraseña - ${userEmail}`}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '15px' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '15px' }}>
            {success}
          </div>
        )}

        <form onSubmit={isOwnPassword ? handleChangeOwnPassword : handleResetOtherPassword}>
          {/* Current Password (only for own password change) */}
          {isOwnPassword && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Contraseña Actual *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="form-input"
                required
                disabled={loading}
              />
            </div>
          )}

          {/* New Password */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nueva Contraseña *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="form-input"
              required
              disabled={loading}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 carácter especial
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Confirmar Contraseña *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Requisitos de Contraseña:</div>
              <div style={{ fontSize: '12px' }}>
                <div style={{ color: newPassword.length >= 8 ? '#16a34a' : '#dc2626' }}>
                  {newPassword.length >= 8 ? '✓' : '✕'} Mínimo 8 caracteres
                </div>
                <div style={{ color: /[A-Z]/.test(newPassword) ? '#16a34a' : '#dc2626' }}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '✕'} Contiene mayúscula
                </div>
                <div style={{ color: /[0-9]/.test(newPassword) ? '#16a34a' : '#dc2626' }}>
                  {/[0-9]/.test(newPassword) ? '✓' : '✕'} Contiene número
                </div>
                <div style={{ color: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#16a34a' : '#dc2626' }}>
                  {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '✕'} Contiene carácter especial
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Procesando...' : '✓ Guardar Nueva Contraseña'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loading ? 0.6 : 1
              }}
            >
              ✕ Cancelar
            </button>
          </div>
        </form>

        <div style={{ marginTop: '15px', fontSize: '12px', color: '#666', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
          <strong>🔒 Consejos de Seguridad:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Usa una contraseña única y fuerte</li>
            <li>No compartas tu contraseña con nadie</li>
            <li>Cambia tu contraseña regularmente</li>
            <li>Si sospechas una violación, cambia tu contraseña inmediatamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
