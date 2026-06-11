# RLS Recursion Fix for `usuarios` Table - SIMPLIFIED VERSION

## Problem
You're still getting:
```
Error saving profile: infinite recursion detected in policy for relation "usuarios"
```

Even after trying the previous fixes. The issue is the RLS policies themselves are too complex.

## Root Cause
The RLS policy USING clauses contain complex JSON operations and multiple conditions that trigger recursion. We need to use SECURITY DEFINER functions directly in the policies instead.

## SIMPLIFIED SQL Solution

Copy and paste this into Supabase SQL Editor, then click "Run":

```sql
-- Simplified RLS fix - use functions in policies to avoid recursion
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON usuarios;

-- Simple function to get user role (with SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'user');
EXCEPTION WHEN OTHERS THEN
  RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Simple function to get user ID
DROP FUNCTION IF EXISTS public.get_user_id() CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'sub')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own record OR are superadmin
CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT
  USING (
    get_user_id() = id 
    OR get_user_role() = 'superadmin'
  );

-- INSERT: Only superadmin can insert
CREATE POLICY "usuarios_insert" ON usuarios
  FOR INSERT
  WITH CHECK (get_user_role() = 'superadmin');

-- UPDATE: Users can update their own record OR are superadmin
CREATE POLICY "usuarios_update" ON usuarios
  FOR UPDATE
  USING (
    get_user_id() = id 
    OR get_user_role() = 'superadmin'
  );

-- DELETE: Only superadmin can delete
CREATE POLICY "usuarios_delete" ON usuarios
  FOR DELETE
  USING (get_user_role() = 'superadmin');
```

## Why This Works Better

1. **Functions with SECURITY DEFINER** - Executed with elevated privileges, avoiding recursion
2. **Simpler Policy Conditions** - Just call functions instead of complex JSON operations
3. **Centralized Logic** - All JWT extraction in functions, not duplicated in policies
4. **Error Handling** - Functions handle exceptions gracefully

## The Key Difference

**OLD (caused recursion):**
```sql
-- Complex JSON extraction in policy
USING ((auth.jwt() ->> 'sub')::uuid = id OR ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'superadmin')
```

**NEW (no recursion):**
```sql
-- Simple function calls in policy
USING (get_user_id() = id OR get_user_role() = 'superadmin')
```

## Steps to Apply

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click "SQL Editor"

2. **Create New Query**
   - Click "New Query"
   - Paste the simplified SQL above

3. **Run the Query**
   - Click "Run"
   - Should complete without errors

4. **Test in Your App**
   - Go to Profile page
   - Click "✏️ Editar"
   - Update name/phone
   - Click "✓ Guardar Cambios"
   - ✅ Should save successfully!

## If You Still Get Errors

**If still getting recursion:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Log out and log back in
3. Try updating profile again

**If getting "permission denied":**
- Make sure you're logged in as the correct user
- Verify `user_metadata.role` is set in Supabase Auth

**If getting other errors:**
- Check that `usuarios` table exists
- Verify columns: id, email, nombre, apellido1, apellido2, telefono, rol, estado
- Ensure RLS is enabled: `ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;`

## Verification

Test each operation:

**1. View Own Profile**
- Should work ✅ - User can view their own profile

**2. Update Own Profile**
- Click Edit → Change data → Save ✅

**3. Superadmin Access**
- Superadmin should be able to view/update any user ✅

**4. Regular User Access Control**
- Regular user cannot view other users ✅
- Regular user cannot update other users ✅

## What Each Policy Does

| Operation | SELECT | INSERT | UPDATE | DELETE |
|-----------|--------|--------|--------|--------|
| Own Record | ✅ User | ❌ | ✅ User | ❌ |
| Other Records | ❌ | ❌ | ❌ | ❌ |
| Superadmin | ✅ All | ✅ | ✅ All | ✅ |

## Related Files

- `PASSWORD_MANAGEMENT_GUIDE.md` - User profile features
- `UserProfile.jsx` - Frontend implementation
- `RLS_RECURSION_SOLUTION.md` - Technical explanation

## Support

If you need help:
1. Check the RLS policies in Supabase: Auth → Policies
2. Verify user_metadata.role is set correctly
3. Check application logs for detailed errors
4. Try clearing browser cache and logging in again
