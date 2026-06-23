# Acutus

Sistema de gestión para clubes de conquistadores.

## Stack
- React + Vite
- Supabase

## Instalación

```bash
npm install --prefix frontend
cp frontend/.env.example frontend/.env   # then edit with your Supabase credentials
npm run dev
```

The dev server runs from the `frontend/` folder. You can also start it directly:

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173/ in your browser.

## Deploy to Netlify

See **[NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md)** for:

- Netlify build settings (`netlify.toml` included)
- Required environment variables
- Supabase Auth URL configuration
- Security checklist (RLS, keys, headers)

Quick summary: connect the repo to Netlify, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (anon/publishable key only), and deploy.
