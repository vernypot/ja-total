# Deploy Teofila to Netlify

Production target: **https://teofila.netlify.app**

> Netlify assigns `*.netlify.app` subdomains (not `.netlify.com`). When creating the site, set the site name to **`teofila`** so the default URL is `https://teofila.netlify.app`. Add a custom domain under **Domain management** if you use another hostname.

## Prerequisites

1. **Supabase project** with schemas applied (SQL files in repo root).
2. **Git repository** connected to Netlify (GitHub/GitLab/Bitbucket).
3. **Anon / publishable API key only** — never deploy `service_role` in the frontend.

## Quick deploy (Netlify UI)

1. [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
2. Connect the repo. Netlify reads `netlify.toml` at the repository root:
   - **Base directory:** `frontend`
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `dist`
3. **Site configuration → General → Site details** → set **Site name** to `teofila` (URL becomes `https://teofila.netlify.app`).
4. **Site configuration → Environment variables** — required for **every** build context (Production **and** Deploy previews):

   | Variable | Value | Scopes |
   |----------|--------|--------|
   | `VITE_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` | **All scopes** |
   | `VITE_SUPABASE_KEY` | Anon or publishable key from Supabase → Settings → API | **All scopes** |
   | `VITE_SITE_URL` | `https://teofila.netlify.app` | **All scopes** (required for auth email redirects) |

   If you only set variables for **Production**, PR / deploy-preview builds will fail with missing `VITE_SUPABASE_*`.

5. **Deploy**. The build script `scripts/verify-env.mjs` fails fast if variables are missing or if a service-role key is detected.

6. Open **https://teofila.netlify.app** and test login + navigation.

## Supabase Auth (required)

In **Supabase Dashboard → Authentication → URL configuration**:

| Setting | Value |
|---------|--------|
| **Site URL** | `https://teofila.netlify.app` |
| **Redirect URLs** | `https://teofila.netlify.app/**` |
| | `https://teofila.netlify.app/reset-password` |

Password reset emails always use the live site URL (`VITE_SITE_URL` or `https://teofila.netlify.app`), not localhost. Keep Supabase **Site URL** on production as well — do not point it at localhost.

Without this, login and password reset redirects fail in production.

## Supabase Storage CORS (club logos / member photos)

If uploads fail from the deployed site, allow your production origin in Supabase Storage settings:

- `https://teofila.netlify.app`

## Security checklist

### Frontend (this repo)

- [x] `.gitignore` excludes `.env`, `node_modules`, and `dist`
- [x] Build verifies env vars and rejects `service_role` keys
- [x] Production source maps disabled (`vite.config.js`)
- [x] Security headers via `frontend/public/_headers` (CSP, HSTS, frame denial)
- [x] CSP allows Supabase + Google Fonts (landing/login/carnet styles)
- [x] SPA routing via `public/_redirects` and `netlify.toml`
- [x] HTML sanitization for news content (`dompurify`)
- [ ] **Remove `frontend/.env` from git history** if it was ever committed
- [ ] Rotate Supabase keys if `.env` was pushed to a remote

### Supabase (backend)

- [ ] Row Level Security enabled on all public tables (use provided `*_RLS*.sql` scripts)
- [ ] Only **anon/publishable** key in Netlify env vars
- [ ] **service_role** key stored only in Supabase dashboard / server-side tools
- [ ] Auth email templates and redirect URLs updated for `https://teofila.netlify.app`
- [ ] Review Storage bucket policies (public read only where intended)

### Netlify

- [ ] Environment variables set for **Production**
- [ ] Site name `teofila` → URL `https://teofila.netlify.app`
- [ ] Optional: separate Supabase project for **Deploy Previews**
- [ ] HTTPS enabled (default; HSTS header included)

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
netlify init           # link site; name it teofila
netlify env:set VITE_SUPABASE_URL "https://....supabase.co"
netlify env:set VITE_SUPABASE_KEY "your-anon-key"
netlify env:set VITE_SITE_URL "https://teofila.netlify.app"
netlify deploy --prod
```

## Custom domain

Netlify → **Domain management** → add domain → update Supabase **Site URL** and **Redirect URLs** to match the new hostname → set `VITE_SITE_URL` to the same URL and redeploy.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails: `Missing VITE_SUPABASE_URL / VITE_SUPABASE_KEY` on **deploy-preview** | Add both vars in Netlify with scope **All scopes** (not Production only), then **Retry deploy** |
| Build fails: missing env | Set `VITE_*` vars in Netlify before build |
| Blank app / config screen | Env not available at build time; redeploy after setting vars |
| Login redirect loop | Fix Supabase Auth URLs for `https://teofila.netlify.app` |
| 404 on refresh | Ensure `_redirects` / `netlify.toml` SPA rule is deployed |
| Fonts blocked | CSP updated in `_headers` for `fonts.googleapis.com` / `fonts.gstatic.com` |
| QR check-in camera blocked | Do not add `camera=()` to Permissions-Policy (already omitted) |
| CSP errors in console | Extend `connect-src` / `img-src` in `public/_headers` for your Supabase project URL |

## Files for Netlify

| File | Purpose |
|------|---------|
| `netlify.toml` | Build settings, Node 20, SPA redirect |
| `frontend/public/_redirects` | SPA fallback |
| `frontend/public/_headers` | Security headers + CSP |
| `frontend/public/robots.txt` | Crawler hints |
| `frontend/scripts/verify-env.mjs` | Pre-build env validation |
| `frontend/src/config/site.js` | Production site URL constant |
| `.gitignore` | Ignore secrets and build artifacts |
