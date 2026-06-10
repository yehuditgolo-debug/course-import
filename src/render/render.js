// Renderer: turns a format record's copy into a self-contained HTML file under
// output/. When a format is rendered we advance it editing -> review, matching
// the NR flow where the editing skill renders the asset then sets
// status = "To review (Nat)".

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHTML } from './templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
export const OUTPUT_DIR = resolve(ROOT, 'output');

export function renderFormatRecord(fmt) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const html = renderHTML(fmt.type, fmt.copy, fmt.lang);
  const file = resolve(OUTPUT_DIR, `${fmt.id}.html`);
  writeFileSync(file, html, 'utf8');
  fmt.render = relative(ROOT, file);
  fmt.updatedAt = new Date().toISOString();
  return fmt.render;
}
