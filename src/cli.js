#!/usr/bin/env node
// Command-line interface — the "agent" entry points, runnable from cron just
// like the NR daily-post skills (e.g. a nightly `csys render` + `csys schedule`).

import * as store from './store.js';
import { makeCorePost, FORMATS } from './schema.js';
import { repurpose, suggestSchedule } from './engine/repurpose.js';
import { renderFormatRecord } from './render/render.js';
import { startServer } from './server/server.js';
import { seed } from './seed.js';

const [cmd, ...args] = process.argv.slice(2);

function flags(arr) {
  const f = {};
  for (const a of arr) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) f[m[1]] = m[2];
    else if (a.startsWith('--')) f[a.slice(2)] = true;
  }
  return f;
}

async function main() {
  switch (cmd) {
    case 'serve': {
      startServer(flags(args).port);
      break;
    }

    case 'seed': {
      const db = seed();
      store.save(db);
      console.log(`Seeded ${db.posts.length} core posts -> ${store.DATA_PATH}`);
      break;
    }

    case 'create': {
      const f = flags(args);
      const db = store.load();
      const post = makeCorePost({ lang: f.lang || 'he', hook1: f.hook1 || '', hook2: f.hook2 || '', body: f.body || '', cta: f.cta || '' });
      store.upsertPost(db, post);
      store.save(db);
      console.log(`Created core post ${post.id}`);
      break;
    }

    case 'repurpose': {
      const f = flags(args);
      const db = store.load();
      const targets = f.id ? db.posts.filter((p) => p.id === f.id) : db.posts;
      for (const post of targets) {
        await repurpose(post, { formats: FORMATS });
        console.log(`Repurposed ${post.id} -> ${post.formats.length} formats`);
      }
      store.save(db);
      break;
    }

    case 'render': {
      // Renders every format currently in to_edit/editing (the "To edit" queue).
      const db = store.load();
      let n = 0;
      for (const post of db.posts) {
        for (const fmt of post.formats) {
          if (fmt.status === 'to_edit' || fmt.status === 'editing') {
            if (fmt.status === 'to_edit') store.setStatus(db, fmt.id, 'editing');
            renderFormatRecord(fmt);
            store.setStatus(db, fmt.id, 'review');
            n++;
          }
        }
      }
      store.save(db);
      console.log(`Rendered ${n} format(s) -> output/ (status: review)`);
      break;
    }

    case 'schedule': {
      // Stagger-schedule approved formats per core post.
      const db = store.load();
      let n = 0;
      for (const post of db.posts) {
        const plan = suggestSchedule(post);
        for (const [id, date] of Object.entries(plan)) {
          const fmt = post.formats.find((x) => x.id === id);
          if (fmt && fmt.status === 'approved') { store.schedule(db, id, date); n++; }
        }
      }
      store.save(db);
      console.log(`Scheduled ${n} approved format(s)`);
      break;
    }

    case 'list': {
      const db = store.load();
      for (const post of db.posts) {
        console.log(`\n${post.id} [${post.lang}] ${post.hook1}`);
        for (const f of post.formats) {
          console.log(`  - ${f.type.padEnd(10)} ${f.status.padEnd(10)} ${f.scheduleDate || ''} ${f.render || ''}`);
        }
      }
      break;
    }

    default:
      console.log(`Content System — CLI

Usage:
  node src/cli.js serve [--port=3000]         Start the dashboard
  node src/cli.js seed                        Load bilingual example data
  node src/cli.js create --hook1="..." [--lang=he|en] [--hook2] [--body] [--cta]
  node src/cli.js repurpose [--id=CP..]       Fan core post(s) into 5 formats
  node src/cli.js render                       Render the "to edit" queue -> output/
  node src/cli.js schedule                     Stagger-schedule approved formats
  node src/cli.js list                         Show all posts + format statuses
`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
