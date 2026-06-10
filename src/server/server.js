// Zero-dependency dashboard server (Node built-in http).
// Serves the static UI and a small JSON API over the local store — the local
// equivalent of the NR "CEO Dashboard" (calendar + pipeline by status).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as store from '../store.js';
import { makeCorePost, FORMAT_LABELS, STATUS_LABELS, STATUSES, FORMATS } from '../schema.js';
import { repurpose, suggestSchedule } from '../engine/repurpose.js';
import { renderFormatRecord } from '../render/render.js';
import { integrationStatus } from '../integrations/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, 'public');
const ROOT = resolve(__dirname, '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'content-type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return {}; }
}

// Flatten all format records (for the calendar + pipeline views).
function allFormats(db) {
  const out = [];
  for (const post of db.posts) {
    for (const fmt of post.formats) {
      out.push({ ...fmt, coreHook: post.hook1, coreTitle: post.title });
    }
  }
  return out;
}

async function api(req, res, url) {
  const { pathname } = url;
  const db = store.load();

  if (req.method === 'GET' && pathname === '/api/state') {
    return send(res, 200, {
      posts: db.posts,
      formats: allFormats(db),
      meta: { FORMAT_LABELS, STATUS_LABELS, STATUSES, FORMATS, integrations: integrationStatus() },
    });
  }

  if (req.method === 'POST' && pathname === '/api/posts') {
    const b = await readBody(req);
    const post = makeCorePost(b);
    store.upsertPost(db, post);
    store.save(db);
    return send(res, 201, post);
  }

  if (req.method === 'POST' && pathname.match(/^\/api\/posts\/[^/]+\/repurpose$/)) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    const post = store.getPost(db, id);
    if (!post) return send(res, 404, { error: 'post not found' });
    const b = await readBody(req);
    await repurpose(post, { formats: b.formats || FORMATS });
    store.save(db);
    return send(res, 200, post);
  }

  if (req.method === 'POST' && pathname.match(/^\/api\/posts\/[^/]+\/autoschedule$/)) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    const post = store.getPost(db, id);
    if (!post) return send(res, 404, { error: 'post not found' });
    const plan = suggestSchedule(post);
    for (const [fmtId, date] of Object.entries(plan)) {
      const f = post.formats.find((x) => x.id === fmtId);
      if (f && (f.status === 'approved' || f.status === 'scheduled')) store.schedule(db, fmtId, date);
      else if (f) f.scheduleDate = date; // suggest a date even before approval
    }
    store.save(db);
    return send(res, 200, post);
  }

  if (req.method === 'POST' && pathname.match(/^\/api\/formats\/[^/]+\/render$/)) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    const found = store.getFormat(db, id);
    if (!found) return send(res, 404, { error: 'format not found' });
    if (found.fmt.status === 'to_edit') store.setStatus(db, id, 'editing');
    renderFormatRecord(found.fmt);
    if (found.fmt.status === 'editing') store.setStatus(db, id, 'review');
    store.save(db);
    return send(res, 200, found.fmt);
  }

  if (req.method === 'POST' && pathname.match(/^\/api\/formats\/[^/]+\/status$/)) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    const b = await readBody(req);
    try {
      const fmt = store.setStatus(db, id, b.status);
      store.save(db);
      return send(res, 200, fmt);
    } catch (err) { return send(res, 400, { error: err.message }); }
  }

  if (req.method === 'POST' && pathname.match(/^\/api\/formats\/[^/]+\/schedule$/)) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    const b = await readBody(req);
    try {
      const fmt = store.schedule(db, id, b.date);
      store.save(db);
      return send(res, 200, fmt);
    } catch (err) { return send(res, 400, { error: err.message }); }
  }

  return send(res, 404, { error: 'unknown endpoint' });
}

async function serveStatic(req, res, url) {
  let rel = url.pathname === '/' ? '/index.html' : url.pathname;
  // Allow viewing rendered assets under /output/*
  if (rel.startsWith('/output/')) {
    const f = resolve(ROOT, '.' + rel);
    if (existsSync(f)) return send(res, 200, await readFile(f), MIME['.html']);
    return send(res, 404, 'not found', 'text/plain');
  }
  const file = resolve(PUBLIC_DIR, '.' + rel);
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file)) {
    return send(res, 404, 'not found', 'text/plain');
  }
  return send(res, 200, await readFile(file), MIME[extname(file)] || 'application/octet-stream');
}

export function startServer(port = process.env.PORT || 3000) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return await serveStatic(req, res, url);
    } catch (err) {
      send(res, 500, { error: err.message });
    }
  });
  server.listen(port, () => {
    console.log(`\n  Content System dashboard  →  http://localhost:${port}\n`);
  });
  return server;
}
