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

writeFileSync(BUNDLE, out.join(''), 'utf8');
console.log(`crm-bundle.css rebuilt — ${refreshed} files refreshed, ${missing.length} kept (missing source).`);
if (missing.length) missing.forEach((m) => console.log('  missing:', m));
