#!/usr/bin/env node
// Optional PNG rendering via Playwright (Chromium). The core system only needs
// the self-contained HTML files; this script upgrades them to PNG/JPG assets
// ready for upload — the same "HTML/CSS -> PNG via Playwright" step the NR
// editing skills use.
//
// Requires:  npm i -D playwright  &&  npx playwright install chromium
// Usage:     node scripts/render-png.js            (renders all output/*.html)
//            node scripts/render-png.js CP1-story   (single format id)

import { readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'output');

let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.error('Playwright not installed. Run:\n  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const only = process.argv[2];
if (!existsSync(OUT)) { console.error('No output/ dir. Run `node src/cli.js render` first.'); process.exit(1); }
const files = readdirSync(OUT).filter((f) => f.endsWith('.html') && (!only || f === `${only}.html`));
if (!files.length) { console.error('Nothing to render.'); process.exit(1); }

const browser = await chromium.launch();
for (const file of files) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(OUT, file)).href, { waitUntil: 'networkidle' });
  const frame = await page.$('.frame');
  const png = resolve(OUT, file.replace(/\.html$/, '.png'));
  await (frame || page).screenshot({ path: png });
  console.log(`  ✓ ${file} -> ${png.replace(ROOT + '/', '')}`);
  await page.close();
}
await browser.close();
