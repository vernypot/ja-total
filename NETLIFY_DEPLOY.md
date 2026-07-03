# Deploy Teofila to Netlify

This guide covers publishing the Vite + React frontend and the security checklist for production.

## Prerequisites

1. **Supabase project** with schemas applied (SQL files in repo root).
2. **Git repository** connected to Netlify (GitHub/GitLab/Bitbucket).
3. **Anon / publishable API key only** — never deploy `service_role` in the frontend.

## Quick deploy (Netlify UI)

1. [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
2. Connect the repo. Netlify reads `netlify.toml` at the repository root:
   - **Base directory:** `frontend` (set automatically)
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `dist`
3. **Site configuration → Environment variables** (required for build):

   | Variable | Value |
   |----------|--------|
   | `VITE_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
   | `VITE_SUPABASE_KEY` | Anon or publishable key from Supabase → Settings → API |

4. Deploy. The build script `scripts/verify-env.mjs` fails fast if variables are missing or if a service-role key is detected.

5. After first deploy, note your site URL (e.g. `https://teofila.netlify.app` or custom domain).

## Supabase Auth (required)

In **Supabase Dashboard → Authentication → URL configuration**:

| Setting | Value |
|---------|--------|
| **Site URL** | Your Netlify URL (or custom domain) |
| **Redirect URLs** | Same URL, plus `https://your-domain.com/**` |

Without this, login and password reset redirects may fail in production.

## Supabase Storage CORS (club logos / member photos)

If uploads fail from the deployed site, add your Netlify domain under **Storage → Policies / CORS** (or bucket settings) so browser uploads from your origin are allowed.

## Security checklist

### Frontend (this repo)

- [x] `.gitignore` excludes `.env`, `node_modules`, and `dist`
- [x] Build verifies env vars and rejects `service_role` keys
- [x] Production source maps disabled (`vite.config.js`)
- [x] Security headers via `frontend/public/_headers` (CSP, HSTS, frame denial)
- [x] SPA routing via `public/_redirects` and `netlify.toml`
- [x] HTML sanitization for news content (`dompurify`)
- [ ] **Remove `frontend/.env` from git history** if it was ever committed (see below)
- [ ] Rotate Supabase keys if `.env` was pushed to a remote

### Supabase (backend)

- [ ] Row Level Security enabled on all public tables (use provided `*_RLS*.sql` scripts)
- [ ] Only **anon/publishable** key in Netlify env vars
- [ ] **service_role** key stored only in Supabase dashboard / server-side tools — never in Vite
- [ ] Auth email templates and redirect URLs updated for production domain
- [ ] Review Storage bucket policies (public read only where intended)

### Netlify

- [ ] Environment variables set for **Production** (and Deploy Previews if used)
- [ ] Optional: restrict **Deploy Previews** env to a staging Supabase project
- [ ] Enable **HTTPS** (default; HSTS header included)
- [ ] Optional: **Password protection** or Netlify Identity for staging sites

## Local production build test

```bash
cd frontend
cp .env.example .env   # edit with real values
npm ci
npm run build
npm run preview        # http://localhost:4173
```

## CLI deploy (optional)

```bash
npm install -g netlify-cli
netlify login
netlify init           # link site, uses netlify.toml
netlify env:set VITE_SUPABASE_URL "https://....supabase.co"
netlify env:set VITE_SUPABASE_KEY "your-anon-key"
netlify deploy --prod
```

## Remove committed secrets

If `frontend/.env` was tracked in git:

```bash
git rm --cached frontend/.env
git rm -r --cached frontend/dist
# commit .gitignore + removal, then rotate keys in Supabase if repo is public
```

## Custom domain

Netlify → **Domain management** → add domain → update Supabase **Site URL** and **Redirect URLs** to match.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails: missing env | Set `VITE_*` vars in Netlify before build |
| Blank app / config screen | Env not available at build time; redeploy after setting vars |
| Login redirect loop | Fix Supabase Auth URL configuration |
| 404 on refresh | Ensure `_redirects` / `netlify.toml` SPA rule is deployed |
| QR check-in camera blocked | Do not add `camera=()` to Permissions-Policy (already omitted) |
| CSP errors in console | Extend `connect-src` / `img-src` in `public/_headers` for your Supabase project URL |

## Files added for Netlify

| File | Purpose |
|------|---------|
| `netlify.toml` | Build settings, Node 20, SPA redirect |
| `frontend/public/_redirects` | SPA fallback |
| `frontend/public/_headers` | Security headers |
| `frontend/scripts/verify-env.mjs` | Pre-build env validation |
| `.gitignore` | Ignore secrets and build artifacts |
