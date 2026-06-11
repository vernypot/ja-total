# Password Management System - User Guide

## Overview
A comprehensive password management system has been implemented for the JA Total application, allowing users to change their own passwords and superadmins to reset passwords for other users.

## Features

### 1. User Profile Page (`/dashboard/profile`)
Every authenticated user can access their personal profile with the following information:
- **Personal Information:**
  - Email (read-only)
  - Nombre (Name)
  - Apellidos (Last Names)
  - Teléfono (Phone)
  - Rol (Role) - displayed with color-coded badges
  - Estado (Status) - Active/Inactive/Suspended

- **Security Section:**
  - Change Password button (for own password)
  - Logout button

### 2. User Profile Access
Users can access their profile in two ways:

#### Method 1: Via Topbar Menu
1. Click on the user avatar/icon in the top-right corner of the dashboard
2. Click "👤 Mi Perfil" (My Profile)
3. You'll be redirected to `/dashboard/profile`

#### Method 2: Direct URL
Navigate directly to: `{your-app}/dashboard/profile`

### 3. Change Your Own Password
**Requirements:**
- Must be logged in
- Must know current password

**Steps:**
1. Go to User Profile (`/dashboard/profile`)
2. In the Security section, click "🔑 Cambiar Contraseña" (Change Password)
3. A modal dialog will appear with:
   - Current Password field (required for security verification)
   - New Password field (required)
   - Confirm Password field (required)
4. The password must meet these requirements:
   - Minimum 8 characters
   - At least 1 uppercase letter (A-Z)
   - At least 1 number (0-9)
   - At least 1 special character (!@#$%^&*(),.?":{}|<>)
5. Password strength indicators will show real-time feedback
6. Click "✓ Guardar Nueva Contraseña" (Save New Password) to confirm
7. After successful change, you'll be logged out and redirected to login page

### 4. Reset Other Users' Passwords (Superadmin Only)
**Requirements:**
- Must be logged in as superadmin
- Permission to access User Management

**Steps:**
1. Navigate to "🔑 User Management" (Administration > User Management)
2. Find the user in the list
3. Click the "🔑" (Key) button in the Actions column
4. A password reset modal will appear with:
   - User email displayed (read-only)
   - New Password field (required)
   - Confirm Password field (required)
5. Enter the new password meeting the security requirements
6. Click "✓ Guardar Nueva Contraseña" to confirm
7. The user will receive the new password through your notification system (implementation dependent)

### 5. Password Reset via User Management CRUD

The User Management page includes a new password reset button:

| Button | Icon | Action |
|--------|------|--------|
| ✏️ | Edit button | Edit user details (name, email, role, status) |
| 🔑 | Password reset | Reset user's password |
| 🗑️ | Delete button | Delete the user account |

## Security Best Practices

### For Users:
1. ✅ Use strong, unique passwords
2. ✅ Never share your password with anyone
3. ✅ Change your password regularly (recommended: every 3 months)
4. ✅ If you suspect a password breach, change it immediately
5. ✅ Use different passwords for different accounts

### For Superadmins:
1. ✅ Only reset passwords when necessary
2. ✅ Use strong temporary passwords when resetting
3. ✅ Inform users securely about temporary passwords
4. ✅ Encourage users to change temporary passwords on first login
5. ✅ Log password resets for audit purposes (future enhancement)

## Password Requirements

All passwords must meet these criteria:

```
✓ Minimum 8 characters
✓ At least 1 uppercase letter (A-Z)
✓ At least 1 number (0-9)
✓ At least 1 special character (!@#$%^&*(),.?":{}|<>)
```

**Examples of valid passwords:**
- `MyPass123!`
- `SecureP@ss2024`
- `Pwd#!2024`

**Examples of invalid passwords:**
- `password123` (no uppercase, no special character)
- `Pass!2024` (less than 8 characters from requirement perspective)
- `PASSWORD123!` (no lowercase - if lowercase is also required)

## File Structure

### New Files Created:

1. **frontend/src/pages/UserProfile.jsx**
   - Main user profile page
   - Displays user information
   - Integrates password change modal
   - Shows personal and security information

2. **frontend/src/components/PasswordReset.jsx**
   - Reusable password reset modal component
   - Supports both own password change and admin reset
   - Password validation with real-time strength feedback
   - Defensive checks at both UI and function level

### Modified Files:

1. **frontend/src/pages/Usuarios.jsx**
   - Added password reset button (🔑) to actions column
   - Integrated PasswordReset component
   - Shows password reset modal for selected user

2. **frontend/src/components/Topbar.jsx**
   - Added "👤 Mi Perfil" link in user dropdown menu
   - Routes to `/dashboard/profile`

3. **frontend/src/routes/AppRouter.jsx**
   - Added UserProfile import
   - Added `/dashboard/profile` route

4. **frontend/src/context/LanguageContext.jsx**
   - Added 'profile' translation key (EN/ES)
   - Updated language support for profile features

## Backend Integration (Supabase)

### Authentication Flow:

**For Own Password Change:**
1. Verify current password via sign-in attempt
2. If verified, update password using Supabase Auth API
3. User is logged out after password change (security measure)
4. User must log in again with new password

**For Admin Password Reset:**
1. Superadmin initiates reset via UI
2. Calls Supabase Auth Admin API to update password
3. No verification needed (superadmin authority)
4. Affected user can log in with new password immediately

### SQL/Database:
- No additional database tables needed
- Password storage handled by Supabase Auth service
- User information in `usuarios` table remains unchanged

## Error Handling

The password management system handles these scenarios gracefully:

| Scenario | Behavior |
|----------|----------|
| Incorrect current password | Shows error: "Current password is incorrect" |
| Weak password | Shows specific requirement not met |
| Passwords don't match | Shows error: "Passwords do not match" |
| User not found | Shows error: "User not found" (admin reset only) |
| Connection error | Shows error with attempt to reconnect |
| Session expired | User redirected to login page |

## Testing Checklist

- [ ] User can access profile page from Topbar menu
- [ ] User can change own password with correct current password
- [ ] Password change validates all requirements
- [ ] Password change shows real-time strength indicators
- [ ] After password change, user is logged out and redirected
- [ ] User can log in with new password
- [ ] Superadmin can access User Management page
- [ ] Superadmin can click password reset button
- [ ] Password reset modal appears with correct user email
- [ ] Superadmin can reset user password without current password
- [ ] User can log in with new password set by superadmin
- [ ] Invalid passwords are rejected with clear error messages
- [ ] UI is responsive on mobile/tablet devices
- [ ] Language switching (EN/ES) works for all text

## Troubleshooting

### Problem: "Current password is incorrect"
**Solution:** Ensure you've entered your current password exactly as it is. Passwords are case-sensitive.

### Problem: "Password must contain..."
**Solution:** Check the password requirements listed above. All criteria must be met.

### Problem: Cannot click password reset button in User Management
**Solution:** Only superadmins can reset passwords. Verify your role is set to 'superadmin' in the database.

### Problem: Password reset modal won't close
**Solution:** Try clicking the ✕ button or clicking outside the modal dialog.

### Problem: After password change, still logged in
**Solution:** This shouldn't happen. If it does, try refreshing the page (`Ctrl+R` or `Cmd+R`). You should be redirected to login.

## Future Enhancements

Potential improvements for future versions:

1. **Email Notifications**
   - Send password reset confirmation to user's email
   - Include temporary password in secure email
   - Confirmation links for password reset requests

2. **Audit Logging**
   - Log all password change/reset events
   - Track who reset whose password and when
   - Generate security audit reports

3. **Two-Factor Authentication (2FA)**
   - SMS verification for password resets
   - Email confirmation codes
   - TOTP/Authenticator app support

4. **Password History**
   - Prevent reuse of recent passwords
   - Force periodic password changes
   - Expiration warnings

5. **Recovery Options**
   - Backup codes for account recovery
   - Recovery email addresses
   - Security questions

6. **Advanced Security**
   - Password strength meter
   - Breach notification (if password appears in leaked databases)
   - Login activity tracking
   - Suspicious login alerts

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Contact your superadmin or system administrator
3. Check application logs for error details
4. Verify Supabase connection and auth status
