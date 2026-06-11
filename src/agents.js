// Agents layer — the local equivalent of the NR CEO Dashboard "Agents" page
// (every agent: what ran, what didn't, what wants your eyes).
//
// An "agent" here is a named, runnable job over the content store. Three are
// live (repurpose / render / schedule); three are registered as planned so the
// roadmap is visible on the dashboard, like NR's 8-agent board.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as store from './store.js';
import { FORMATS } from './schema.js';
import { repurpose, suggestSchedule } from './engine/repurpose.js';
import { renderFormatRecord } from './render/render.js';
import { critiquePost } from './engine/advisor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
export const LOG_PATH = resolve(ROOT, 'data', 'agent-log.json');

export const AGENTS = [
  {
    id: 'repurposer', code: 'A1', schedule: 'on-demand', live: true,
    name: { he: 'משכפל פורמטים', en: 'Repurposer' },
    desc: { he: 'פוסט ליבה ← 5 פורמטים', en: 'Core post → 5 formats' },
  },
  {
    id: 'renderer', code: 'A2', schedule: 'daily', live: true,
    name: { he: 'עורך יומי', en: 'Daily editor' },
    desc: { he: 'מרנדר את תור "לעריכה" ומעביר לבדיקה', en: 'Renders the to-edit queue → review' },
  },
  {
    id: 'scheduler', code: 'A3', schedule: 'daily', live: true,
    name: { he: 'מתזמן לוח', en: 'Schedule planner' },
    desc: { he: 'מפזר תאריכים לפורמטים מאושרים', en: 'Staggers dates for approved formats' },
  },
  {
    id: 'advisor', code: 'A4', schedule: 'on-demand', live: true,
    name: { he: 'יועץ פוסט ליבה', en: 'Core-post advisor' },
    desc: { he: 'הוקים, מבנה וביקורת לפי המתודה (method/)', en: 'Hooks, structure & critique per method/' },
  },
  {
    id: 'data-loop', code: 'A5', schedule: 'weekly', live: false,
    name: { he: 'לולאת דאטה', en: 'Data loop' },
    desc: { he: 'מנתח ביצועים לפי תיוג ומעדכן המלצות', en: 'Analyzes metrics by tags, updates advice' },
  },
  {
    id: 'publisher', code: 'A6', schedule: 'daily', live: false,
    name: { he: 'מפרסם (GHL)', en: 'Publisher (GHL)' },
    desc: { he: 'דוחף מתוזמנים לפלטפורמות', en: 'Pushes scheduled posts to platforms' },
  },
];

// --- run log -----------------------------------------------------------------

export function loadLog() {
  if (!existsSync(LOG_PATH)) return { runs: [] };
  try { return JSON.parse(readFileSync(LOG_PATH, 'utf8')); }
  catch { return { runs: [] }; }
}

export function appendRun(agentId, { ok, summary }) {
  const log = loadLog();
  log.runs.push({ agentId, ok, summary, at: new Date().toISOString() });
  // keep the log bounded
  if (log.runs.length > 500) log.runs = log.runs.slice(-500);
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + '\n', 'utf8');
  return log;
}

// --- status ------------------------------------------------------------------

const DAY = 86400000;

export function agentStatus(agent, log) {
  if (!agent.live) return 'planned';
  const runs = log.runs.filter((r) => r.agentId === agent.id);
  const last = runs[runs.length - 1];
  if (!last) return 'idle';
  if (!last.ok) return 'needs_attention';
  if (agent.schedule === 'daily' && Date.now() - Date.parse(last.at) > 2 * DAY) return 'overdue';
  if (agent.schedule === 'weekly' && Date.now() - Date.parse(last.at) > 9 * DAY) return 'overdue';
  return 'on_track';
}

export function agentsOverview() {
  const log = loadLog();
  return AGENTS.map((a) => {
    const runs = log.runs.filter((r) => r.agentId === a.id).slice(-5).reverse();
    return { ...a, status: agentStatus(a, log), lastRuns: runs };
  });
}

// --- execution ---------------------------------------------------------------

export async function runAgent(id) {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  if (!agent.live) throw new Error(`Agent ${id} is planned but not implemented yet`);

  try {
    const db = store.load();
    let summary = '';

    if (id === 'repurposer') {
      let n = 0;
      for (const post of db.posts) { await repurpose(post, { formats: FORMATS }); n += post.formats.length; }
      store.save(db);
      summary = `refreshed ${n} format(s) across ${db.posts.length} core post(s)`;
    }

    if (id === 'renderer') {
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
      summary = `rendered ${n} format(s) → review`;
    }

    if (id === 'advisor') {
      // Critique every core post against the golden test + red lines (method/).
      let flagged = 0;
      for (const post of db.posts) {
        post.advice = critiquePost(post);
        if (post.advice.verdict !== 'pass') flagged++;
      }
      store.save(db);
      summary = `critiqued ${db.posts.length} core post(s); ${flagged} need attention`;
    }

    if (id === 'scheduler') {
      let n = 0;
      for (const post of db.posts) {
        const plan = suggestSchedule(post);
        for (const [fid, date] of Object.entries(plan)) {
          const fmt = post.formats.find((x) => x.id === fid);
          if (fmt && fmt.status === 'approved') { store.schedule(db, fid, date); n++; }
        }
      }
      store.save(db);
      summary = `scheduled ${n} approved format(s)`;
    }

    appendRun(id, { ok: true, summary });
    return { ok: true, summary };
  } catch (err) {
    appendRun(id, { ok: false, summary: err.message });
    throw err;
  }
}
