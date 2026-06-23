#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SECTION = {
  slug: 'estudio-de-la-naturaleza',
  url: 'https://www.guiasmayores.com/especialidades-ja---estudio-de-la-naturaleza.html',
  nombre: 'Estudio de la naturaleza',
  orden: 7,
};

const skip = /picture|logo|weebly|banner|afiche|poster|imagen/i;

function cleanName(raw) {
  let n = raw.trim();
  n = n.replace(/^Especialidad JA de\s+/i, '');
  n = n.replace(/^Especialidad de\s+/i, '');
  n = n.replace(/\s*-\s*Especialidad JA\s*$/i, '');
  n = n.replace(/\s*,\s*avanzado\s*$/i, ' - Avanzado');
  return n.trim();
}

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const res = await fetch(SECTION.url);
if (!res.ok) throw new Error(`Failed ${SECTION.url}: ${res.status}`);
const html = await res.text();
const re = /alt="([^"]+)"/g;
let m;
const names = new Set();
while ((m = re.exec(html)) !== null) {
  const alt = m[1];
  if (skip.test(alt)) continue;
  const name = cleanName(alt);
  if (!name || name.length < 2) continue;
  names.add(name);
}
// Page text lists Reciclaje but HTML alt tag only has advanced variant.
names.add('Reciclaje');

const sorted = [...names].sort((a, b) => a.localeCompare(b, 'es'));
const out = [];
out.push('BEGIN;');
out.push('');
out.push('-- Especialidades JA: Estudio de la naturaleza (' + sorted.length + ' honors)');
out.push('-- Prerequisite: ESPECIALIDADES_SECCIONES_SCHEMA.sql');
out.push('-- Idempotent: upserts section, inserts missing honors, updates seccion_id on matches');
out.push('');
out.push('INSERT INTO public.especialidad_secciones (slug, nombre, orden, estado, fuente_url)');
out.push(`VALUES (${sqlStr(SECTION.slug)}, ${sqlStr(SECTION.nombre)}, ${SECTION.orden}, 'activo', ${sqlStr(SECTION.url)})`);
out.push('ON CONFLICT (slug) DO UPDATE SET');
out.push('  nombre = EXCLUDED.nombre,');
out.push('  orden = EXCLUDED.orden,');
out.push('  fuente_url = EXCLUDED.fuente_url,');
out.push('  updated_at = now();');
out.push('');
out.push('WITH src(nombre) AS (');
out.push('  VALUES');
out.push(sorted.map(n => `    (${sqlStr(n)})`).join(',\n'));
out.push('),');
out.push('club_tipos AS (');
out.push('  SELECT nombre FROM public.tipos_club');
out.push("  WHERE nombre ILIKE 'Conquistador%'");
out.push("     OR nombre ILIKE 'Gu%Mayor%'");
out.push("     OR nombre ILIKE 'Master Guide%'");
out.push('),');
out.push('resolved AS (');
out.push('  SELECT src.nombre, s.id AS seccion_id, ct.nombre AS club_tipo');
out.push('  FROM src');
out.push(`  JOIN public.especialidad_secciones s ON s.slug = ${sqlStr(SECTION.slug)}`);
out.push('  CROSS JOIN club_tipos ct');
out.push(')');
out.push('INSERT INTO public.especialidades (nombre, club_tipo, seccion_id)');
out.push('SELECT r.nombre, r.club_tipo, r.seccion_id');
out.push('FROM resolved r');
out.push('WHERE NOT EXISTS (');
out.push('  SELECT 1 FROM public.especialidades e');
out.push('  WHERE lower(trim(e.nombre)) = lower(trim(r.nombre))');
out.push('    AND e.club_tipo = r.club_tipo');
out.push(');');
out.push('');
out.push('-- Link existing honors (same name) to this section if seccion_id is missing or wrong');
out.push('UPDATE public.especialidades e');
out.push('SET seccion_id = s.id');
out.push('FROM public.especialidad_secciones s,');
out.push('     (VALUES');
out.push(sorted.map(n => `       (${sqlStr(n)})`).join(',\n'));
out.push('     ) AS src(nombre)');
out.push(`WHERE s.slug = ${sqlStr(SECTION.slug)}`);
out.push('  AND lower(trim(e.nombre)) = lower(trim(src.nombre))');
out.push('  AND e.seccion_id IS DISTINCT FROM s.id;');
out.push('');
out.push('COMMIT;');

const target = path.join(root, 'ESPECIALIDADES_IMPORT_ESTUDIO_NATURALEZA.sql');
fs.writeFileSync(target, out.join('\n') + '\n');
console.error(`Wrote ${target} (${sorted.length} honors)`);
