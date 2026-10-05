/**
 * Rebuild app/crm/crm-bundle.css from its source CSS files.
 *
 * The embedded CRM loads a single static concatenation (crm-bundle.css) rather
 * than each component's CSS, so editing a source .css does NOT reflect until the
 * bundle is regenerated. This reads the ordered `/* ===== path ===== *\/` markers
 * already in the bundle and re-concatenates the CURRENT content of each source
 * file (preserving order; keeping the old segment if a source file is missing).
 *
 * Run after any change to a bundled .css:  node scripts/rebuild-crm-bundle.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BUNDLE = 'app/crm/crm-bundle.css';
const src = readFileSync(BUNDLE, 'utf8');
const marker = /\/\* ===== (.+?) ===== \*\//g;

// Split into [preamble, path, content, path, content, ...]
const parts = src.split(marker);
const pre = parts[0];
const out = [];
if (pre.trim()) out.push(pre);

let refreshed = 0;
const missing = [];
for (let i = 1; i < parts.length; i += 2) {
  const path = parts[i].trim();
  const original = parts[i + 1] ?? '';
  if (existsSync(path)) {
    out.push(`/* ===== ${path} ===== */\n${readFileSync(path, 'utf8')}\n`);
    refreshed++;
  } else {
    out.push(`/* ===== ${path} ===== */${original}`);
    missing.push(path);
  }
}

// Any .css under crm/ that is not yet in the bundle is appended. Without this
// a newly added component's stylesheet never reaches the app and the component
// renders unstyled — silently, because nothing imports these files directly.
const listed = new Set();
for (let i = 1; i < parts.length; i += 2) listed.add(parts[i].trim().replace(/\\/g, '/'));

const allCss = execSync('git ls-files "crm/**/*.css"', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).map((p) => p.replace(/\\/g, '/'));
const added = allCss.filter((p) => !listed.has(p) && existsSync(p));
for (const path of added) out.push(`/* ===== ${path} ===== */\n${readFileSync(path, 'utf8')}\n`);

writeFileSync(BUNDLE, out.join(''), 'utf8');
console.log(`crm-bundle.css rebuilt — ${refreshed} refreshed, ${added.length} newly added, ${missing.length} kept (missing source).`);
if (added.length) added.forEach((a) => console.log('  added:', a));
if (missing.length) missing.forEach((m) => console.log('  missing:', m));
