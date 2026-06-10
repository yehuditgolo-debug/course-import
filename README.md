# Content System

A **core-post content engine + visual dashboard**, inspired by the "content system"
(סיסטמת תוכן) reverse-engineered from the Nataliya Rey / "The Next Level" workshop.

**The idea in one line:** you write **one core post** → the system fans it out into
**5 formats** (reel, carousel, story, static image, txt-broll), renders them, and
moves each one through a status pipeline onto a publishing calendar — so marketing
runs on a system instead of on your mood.

Bilingual (Hebrew RTL + English LTR). Runs fully local with **zero runtime
dependencies**. Hybrid: clear connection points to mirror into Airtable / Notion /
GoHighLevel later.

---

## Quick start

```bash
node src/cli.js seed      # load bilingual example data
node src/cli.js serve     # open http://localhost:3000
```

That's it — no `npm install` needed for the core system (Node 20+).

---

## How it maps to the original NR system

| NR system | Here |
|---|---|
| Core post in Airtable (CP codes) | `data/posts.json` — the source of truth |
| "שכפל!" → 5 formats | `src/engine/repurpose.js` |
| Claude as **editor** (raw thoughts → polished copy) | `src/engine/ai.js` (optional, falls back to offline heuristics) |
| Editing skills render HTML/CSS → PNG | `src/render/` (HTML always; PNG via Playwright) |
| Status field as the coordinating "protocol" | `src/schema.js` state machine + `src/store.js` |
| CEO Dashboard (calendar + pipeline) | `src/server/` (`http://localhost:3000`) |
| Cron agents (CA3 planner, CA6 GHL) | `node src/cli.js render` / `schedule` (run from cron) |
| Airtable / Notion / GoHighLevel | `src/integrations/` (activate with env vars) |

---

## The pipeline (status state machine)

```
to_edit → editing → review → approved → scheduled → published
```

Each stage is "owned" by a different actor — the engine creates `to_edit`, the
renderer moves `editing → review`, **you** approve, the scheduler assigns a date.
Illegal jumps are rejected. This is what lets independent steps (and a future cron
agent) coordinate through a single field, exactly like the original.

---

## CLI

```bash
node src/cli.js create --hook1="..." --lang=he --body="..." --cta="..."
node src/cli.js repurpose [--id=CP1]   # fan core post(s) into 5 formats
node src/cli.js render                  # render the "to edit" queue → output/
node src/cli.js schedule                # stagger-schedule approved formats
node src/cli.js list                    # show posts + statuses
node src/cli.js serve [--port=3000]
```

## Optional: real AI editing

```bash
export ANTHROPIC_API_KEY=sk-...
export CSYS_MODEL=claude-sonnet-4-6   # optional, this is the default
```
When set, the engine asks Claude to adapt copy per format in the post's language.
Without it, deterministic heuristics produce sensible copy so everything still runs.

## Optional: PNG export

```bash
npm i -D playwright && npx playwright install chromium
node src/cli.js render
node scripts/render-png.js             # output/*.html → output/*.png
```

## Optional: external integrations (hybrid)

Set the relevant env vars to activate the adapters in `src/integrations/`:

- **Airtable** — `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID` (mirror content rows)
- **Notion** — `NOTION_API_KEY`, `NOTION_DB_ID` (pull core-post drafts)
- **GoHighLevel** — `GHL_API_KEY`, `GHL_LOCATION_ID` (push scheduled posts)

Each adapter is a marked stub with the HTTP mapping left as a clear TODO.

---

## Project layout

```
data/posts.json          source of truth (core posts + derived formats)
src/schema.js            schema, formats, status state machine
src/store.js             JSON store + status transitions
src/engine/
  repurpose.js           one core post → many format records
  formats.js             per-format copy derivation (offline editor)
  ai.js                  optional Claude editor (with offline fallback)
src/render/
  templates.js           HTML/CSS per format (RTL/LTR, Heebo font)
  render.js              write self-contained HTML → output/
src/integrations/        Airtable / Notion / GoHighLevel adapters (stubs)
src/server/              zero-dep dashboard (API + static UI)
scripts/render-png.js    optional Playwright PNG export
```

## What's intentionally out of scope (v1)

- **Video assembly** for reels / txt-broll (hook overlaid on a b-roll clip) — needs
  `ffmpeg`. The renderer produces a poster frame; wiring ffmpeg is a documented
  integration point.
- A real publish to social platforms — stubbed in `src/integrations/ghl.js`.
