export function getPasswordValidationError(pwd) {
  if (!pwd || pwd.length < 8) return 'passwordMinLength';
  if (!/[A-Z]/.test(pwd)) return 'passwordUppercase';
  if (!/[0-9]/.test(pwd)) return 'passwordNumber';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'passwordSpecial';
  return null;
}

export function validatePassword(pwd, t) {
  const key = getPasswordValidationError(pwd);
  return key ? t(key) : null;
}

export function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let result = 'Aa1!';
  for (let i = 0; i < 12; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
