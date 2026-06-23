#!/usr/bin/env node
/**
 * Regenerate ESPECIALIDADES_IMPORT_GUIASMAYORES.sql from guiasmayores.com section pages.
 * Usage: node scripts/generate-especialidades-import.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SECTIONS = [
  { slug: 'actividades-agropecuarias', url: 'https://www.guiasmayores.com/especialidades-ja---actividades-agropecuarias.html', nombre: 'Actividades agropecuarias', orden: 1 },
  { slug: 'artes-y-actividades-manuales', url: 'https://www.guiasmayores.com/especialidades-ja---artes-y-actividades-manuales.html', nombre: 'Artes y actividades manuales', orden: 2 },
  { slug: 'actividades-recreacionales', url: 'https://www.guiasmayores.com/especialidades-ja---actividades-recreacionales.html', nombre: 'Actividades recreacionales', orden: 3 },
  { slug: 'actividades-vocacionales', url: 'https://www.guiasmayores.com/especialidades-ja---actividades-vocacionales.html', nombre: 'Artes vocacionales', orden: 4 },
  { slug: 'artes-domesticas', url: 'https://www.guiasmayores.com/especialidades-ja---artes-domeacutesticas.html', nombre: 'Artes domésticas', orden: 5 },
  { slug: 'crecimiento-espiritual', url: 'https://www.guiasmayores.com/especialidades-ja---crecimiento-espiritual-actividades-misioneras-y-herencia.html', nombre: 'Crecimiento espiritual, actividades misioneras y herencia', orden: 6 },
  { slug: 'estudio-de-la-naturaleza', url: 'https://www.guiasmayores.com/especialidades-ja---estudio-de-la-naturaleza.html', nombre: 'Estudio de la naturaleza', orden: 7 },
  { slug: 'salud-y-ciencia', url: 'https://www.guiasmayores.com/especialidades-ja---salud-y-ciencia.html', nombre: 'Salud y ciencia', orden: 8 },
];

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

const skip = /picture|logo|weebly|banner|afiche|poster|imagen/i;
const rows = [];

for (const section of SECTIONS) {
  const res = await fetch(section.url);
  if (!res.ok) throw new Error(`Failed ${section.url}: ${res.status}`);
  const html = await res.text();
  const re = /alt="([^"]+)"/g;
  let m;
  const names = new Set();
  while ((m = re.exec(html)) !== null) {
    const alt = m[1];
    if (skip.test(alt)) continue;
    const name = cleanName(alt);
    if (!name || name.length < 2) continue;
    const key = name.toLowerCase();
    if (names.has(key)) continue;
    names.add(key);
    rows.push({ slug: section.slug, nombre: name });
  }
  console.error(`${section.nombre}: ${names.size}`);
}

const out = [];
out.push('-- =============================================================================');
out.push('-- Especialidades JA import from guiasmayores.com (scraped section index pages)');
out.push(`-- Generated: ${new Date().toISOString()}`);
out.push(`-- Total sections: ${SECTIONS.length}, total honors: ${rows.length}`);
out.push('-- Run ESPECIALIDADES_SECCIONES_SCHEMA.sql first');
out.push('-- =============================================================================');
out.push('');
out.push('BEGIN;');
out.push('');

for (const s of SECTIONS) {
  out.push(`INSERT INTO public.especialidad_secciones (slug, nombre, orden, estado, fuente_url)`);
  out.push(`VALUES (${sqlStr(s.slug)}, ${sqlStr(s.nombre)}, ${s.orden}, 'activo', ${sqlStr(s.url)})`);
  out.push('ON CONFLICT (slug) DO UPDATE SET');
  out.push('  nombre = EXCLUDED.nombre,');
  out.push('  orden = EXCLUDED.orden,');
  out.push('  fuente_url = EXCLUDED.fuente_url,');
  out.push('  updated_at = now();');
  out.push('');
}

out.push('WITH src(nombre, seccion_slug) AS (');
out.push('  VALUES');
out.push(rows.map(r => `    (${sqlStr(r.nombre)}, ${sqlStr(r.slug)})`).join(',\n'));
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
out.push('  JOIN public.especialidad_secciones s ON s.slug = src.seccion_slug');
out.push('  CROSS JOIN club_tipos ct');
out.push(')');
out.push('INSERT INTO public.especialidades (nombre, club_tipo, seccion_id)');
out.push('SELECT r.nombre, r.club_tipo, r.seccion_id');
out.push('FROM resolved r');
out.push('WHERE NOT EXISTS (');
out.push('  SELECT 1 FROM public.especialidades e');
out.push('  WHERE lower(trim(e.nombre)) = lower(trim(r.nombre))');
out.push('    AND e.club_tipo = r.club_tipo');
out.push('    AND e.seccion_id IS NOT DISTINCT FROM r.seccion_id');
out.push(');');
out.push('');
out.push('COMMIT;');

const target = path.join(root, 'ESPECIALIDADES_IMPORT_GUIASMAYORES.sql');
fs.writeFileSync(target, out.join('\n') + '\n');
console.error('Wrote', target);
