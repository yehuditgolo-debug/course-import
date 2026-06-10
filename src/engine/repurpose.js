// The repurpose engine: one core post in -> many format records out.
// This is the heart of the system, equivalent to NR's "שכפל!" (duplicate)
// action that fans a core post out into reel/carousel/story/image/txt_broll.

import { FORMATS } from '../schema.js';
import { buildCopy } from './formats.js';
import { adaptCopy, aiEnabled } from './ai.js';

function fmtId(coreId, format) {
  return `${coreId}-${format}`;
}

// Create (or refresh) format records on a core post.
// Each new record enters the pipeline at status `to_edit`.
export async function repurpose(corePost, { formats = FORMATS, useAI = true } = {}) {
  const results = [];
  for (const format of formats) {
    const copy = buildCopy(format, corePost);

    // Optional AI pass: adapt the free-text of the format in the post's language.
    if (useAI && aiEnabled()) {
      const adapted = await adaptCopy({ format, lang: corePost.lang, corePost });
      if (adapted) copy.aiCopy = adapted;
    }

    const id = fmtId(corePost.id, format);
    const existing = corePost.formats.find((f) => f.id === id);
    const record = {
      id,
      coreId: corePost.id,
      type: format,
      lang: corePost.lang,
      status: 'to_edit',
      scheduleDate: null,
      copy,
      render: null, // path to rendered HTML/PNG, set by the renderer
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) Object.assign(existing, record);
    else corePost.formats.push(record);
    results.push(record);
  }
  return results;
}

// Suggest staggered publish dates so the same core post's formats don't all go
// out at once (mirrors the NR scheduler's "keep variety" rule). Returns a map
// of formatId -> ISO date.
export function suggestSchedule(corePost, { start = new Date(), everyDays = 2 } = {}) {
  const plan = {};
  let day = new Date(start);
  for (const fmt of corePost.formats) {
    plan[fmt.id] = day.toISOString().slice(0, 10);
    day = new Date(day.getTime() + everyDays * 86400000);
  }
  return plan;
}
