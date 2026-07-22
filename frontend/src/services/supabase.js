import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const key = (import.meta.env.VITE_SUPABASE_KEY || "").trim();

export const isSupabaseConfigured = Boolean(url && key);

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

if (import.meta.env.DEV && key && decodeJwtPayload(key)?.role === "service_role") {
  console.error(
    "VITE_SUPABASE_KEY looks like a service_role key. Use the anon/publishable key only."
  );
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.error(
    "Missing Supabase env vars. Copy frontend/.env.example to frontend/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_KEY."
  );
}

export const sb = createClient(url, key, {
  auth: {
    detectSessionInUrl: true,
    // Implicit flow so password-reset links work when opened from email in any browser.
    // PKCE stores the verifier in the browser that sends the email, which breaks admin/user mail links.
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
  },
});
