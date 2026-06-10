// File-backed data store. This is the "source of truth" layer — the local
// equivalent of the NR Airtable base. It is intentionally a plain JSON file so
// it is trivial to inspect, diff and back up. The integration adapters
// (src/integrations/*) can later mirror this into Airtable/Notion/GHL.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canTransition } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
export const DATA_PATH = resolve(ROOT, 'data', 'posts.json');

function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}

export function load(path = DATA_PATH) {
  if (!existsSync(path)) return { posts: [] };
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse data file ${path}: ${err.message}`);
  }
}

export function save(db, path = DATA_PATH) {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(db, null, 2) + '\n', 'utf8');
  return db;
}

export function getPost(db, id) {
  return db.posts.find((p) => p.id === id);
}

export function getFormat(db, formatId) {
  for (const post of db.posts) {
    const fmt = post.formats.find((f) => f.id === formatId);
    if (fmt) return { post, fmt };
  }
  return null;
}

export function upsertPost(db, post) {
  const idx = db.posts.findIndex((p) => p.id === post.id);
  if (idx === -1) db.posts.push(post);
  else db.posts[idx] = post;
  return post;
}

// Advance a format through the status state machine, rejecting illegal jumps.
export function setStatus(db, formatId, to) {
  const found = getFormat(db, formatId);
  if (!found) throw new Error(`Format not found: ${formatId}`);
  const { fmt } = found;
  if (fmt.status === to) return fmt;
  if (!canTransition(fmt.status, to)) {
    throw new Error(`Illegal transition ${fmt.status} -> ${to} for ${formatId}`);
  }
  fmt.status = to;
  fmt.updatedAt = new Date().toISOString();
  return fmt;
}

export function schedule(db, formatId, dateISO) {
  const found = getFormat(db, formatId);
  if (!found) throw new Error(`Format not found: ${formatId}`);
  const { fmt } = found;
  fmt.scheduleDate = dateISO;
  if (fmt.status === 'approved') fmt.status = 'scheduled';
  fmt.updatedAt = new Date().toISOString();
  return fmt;
}
