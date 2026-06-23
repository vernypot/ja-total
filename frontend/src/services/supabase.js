import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  console.error(
    'Missing Supabase env vars. Copy frontend/.env.example to frontend/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_KEY.'
  );
}

export const sb = createClient(url || '', key || '');
