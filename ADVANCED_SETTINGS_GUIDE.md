# Advanced Settings - Label Management CRUD

## Overview

The Advanced Settings page provides superadmins with a complete CRUD (Create, Read, Update, Delete) interface for managing system-wide labels and translations. This allows you to customize the text/labels used throughout the application in both English and Spanish.

## Features

✅ **View all labels** - See all system labels organized by key
✅ **Search labels** - Quickly find labels by key, Spanish, or English text
✅ **Create new labels** - Add custom labels to the system
✅ **Edit labels** - Update Spanish and English translations inline
✅ **Delete labels** - Remove custom labels
✅ **Sync defaults** - Import all default application labels into the database
✅ **Database persistence** - All changes are saved to the Supabase database

## Setup Instructions

### 1. Apply Database Schema

First, apply the database migration to create the `system_labels` table:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `SYSTEM_LABELS_SCHEMA.sql`
4. Click **Run**

This creates:
- `system_labels` table with columns: `id`, `label_key`, `label_es`, `label_en`, `created_at`, `updated_at`
- RLS policies: Superadmins can read/write all labels, regular users can only read
- Indexes for performance

### 2. Access Advanced Settings

1. Log in as a **superadmin** user
2. In the Sidebar, navigate to **⚙️ Advanced Settings** (under Administration section)
3. You'll see the label management interface

## Usage

### View Labels

All labels in the database are displayed in a table with:
- **Key**: Unique identifier for the label (e.g., `members`, `churches`)
- **Spanish**: Label text in Spanish
- **English**: Label text in English
- **Actions**: Edit and Delete buttons

### Search Labels

Use the search box at the top to filter labels by:
- Label key (e.g., searching "member" finds all labels with "member")
- Spanish text (e.g., searching "miembro" finds Spanish translations)
- English text (e.g., searching "member" finds English translations)

### Add New Label

1. Click **➕ Add Label** button
2. Fill in the three fields:
   - **Key**: Unique identifier (e.g., `customField`)
   - **Español**: Spanish translation
   - **English**: English translation
3. Click **✓ Save** to create the label

### Edit Existing Label

1. Click the **✏️** (Edit) button next to a label
2. Modify the Spanish or English text inline
3. Click **✓** to save or **✕** to cancel

### Delete Label

1. Click the **🗑️** (Delete) button next to a label
2. Confirm the deletion
3. The label is removed from the database

### Sync Default Labels

1. Click **🔄 Sync Defaults** button
2. Confirm the action
3. All default application labels that don't already exist in the database will be added

This is useful for:
- Initial setup (populate database with all default labels)
- Adding labels from new features
- Ensuring database has all current application labels

## How It Works

### Label Resolution

The application resolves labels in this order:

1. **Custom labels in database** - If a label is in the database, use it
2. **Custom labels in localStorage** (legacy) - For backward compatibility
3. **Default language translations** - English or Spanish defaults from LanguageContext
4. **Fallback to key** - If nothing else matches, display the key itself

### Language Switching

Users can switch between English and Spanish:
- Click **ES** / **EN** in the top-right corner of the app
- Language preference is saved to localStorage
- All labels automatically update to the selected language

### Database Syncing

Changes made in Advanced Settings:
- ✓ Save immediately to the database
- ✓ Available to all users immediately (if using fresh page load)
- ✓ Don't require app restart

## Database Schema

```sql
CREATE TABLE public.system_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_key varchar UNIQUE NOT NULL,
  label_es varchar NOT NULL,
  label_en varchar NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### RLS Policies

- **Superadmins**: Can read and modify all labels (full CRUD)
- **Regular Users**: Can only read labels (SELECT)

## Best Practices

1. **Use descriptive keys** - Use camelCase for keys (e.g., `memberName`, `churchAddress`)
2. **Keep translations short** - Labels are usually displayed in UI elements
3. **Be consistent** - Use the same terminology across the app
4. **Back up regularly** - Export your labels periodically in case you need to restore them
5. **Review with team** - Translations should be reviewed by native speakers

## API Usage (for developers)

If you want to load labels programmatically:

```javascript
import { sb } from '../services/supabase';

// Load all labels
const { data: labels, error } = await sb
  .from('system_labels')
  .select('*');

// Find a specific label
const { data: label } = await sb
  .from('system_labels')
  .select('*')
  .eq('label_key', 'myLabel')
  .single();
```

## Troubleshooting

### I don't see the Advanced Settings option

- ✓ Make sure you're logged in as a **superadmin** user
- ✓ Check that the role is correctly set in the `usuario_roles` table or `auth.users` metadata
- ✓ Try refreshing the page

### Changes don't appear in the app

- ✓ The app may be caching old values in localStorage - try clearing localStorage:
  ```javascript
  // In browser console
  localStorage.clear();
  // Then refresh the page
  ```
- ✓ Make sure you saved the changes (click **✓** button)
- ✓ Refresh the page to see database changes

### I get a permission error

- ✓ Make sure the `system_labels` table exists in your database
- ✓ Run the `SYSTEM_LABELS_SCHEMA.sql` migration script
- ✓ Verify RLS policies are enabled correctly
- ✓ Check that your user has superadmin role

### Sync Defaults isn't working

- ✓ Make sure you have some labels already in the system (not starting from empty)
- ✓ Check the browser console for error messages
- ✓ Verify the database connection is working

## Advanced Topics

### Bulk Operations

To manage labels in bulk (add many at once):

```sql
-- Insert multiple labels at once
INSERT INTO public.system_labels (label_key, label_es, label_en)
VALUES
  ('key1', 'Etiqueta 1', 'Label 1'),
  ('key2', 'Etiqueta 2', 'Label 2'),
  ('key3', 'Etiqueta 3', 'Label 3')
ON CONFLICT (label_key) DO NOTHING;
```

### Export Labels

To export all labels as JSON:

```javascript
// In browser console
const response = await fetch('/api/labels'); // if you add an API endpoint
const labels = await response.json();
const json = JSON.stringify(labels, null, 2);
console.log(json);
```

### Import Labels

To import labels from a JSON file, you would need to:
1. Parse the JSON file
2. Iterate through each label
3. Call the Supabase insert/update API for each one

## Related Features

- **LanguageSwitcher** (src/components/LanguageSwitcher.jsx) - User-facing language toggle
- **LanguageContext** (src/context/LanguageContext.jsx) - Translation system core
- **LabelSettings** (src/pages/LabelSettings.jsx) - Legacy localStorage-based label editor (can be deprecated)

## Next Steps

1. ✅ Apply the `SYSTEM_LABELS_SCHEMA.sql` migration
2. ✅ Log in as superadmin and navigate to Advanced Settings
3. ✅ Click "🔄 Sync Defaults" to populate default labels
4. ✅ Test editing a label and verify it updates in the app
5. Optional: Remove or hide the old LabelSettings page

## Support

For issues or questions:
- Check the browser console for error messages (F12)
- Verify database connectivity in Supabase Dashboard
- Ensure RLS policies are configured correctly
- Contact the development team with error details
