// Deterministic, offline derivation of each format's copy from a core post.
// These heuristics are the "fallback editor": they always produce sensible
// structured copy even with no AI key. The AI adapter (ai.js) can override the
// free-text fields when configured.

// Split a body into sentence-ish chunks for slide/line generation.
export function splitSentences(text) {
  return String(text || '')
    .split(/\n+|(?<=[.!?。])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Each builder returns a `copy` object whose shape matches its render template.
export const builders = {
  reel(core) {
    return {
      hook: core.hook1,
      subhook: core.hook2 || '',
      caption: [core.body, core.cta].filter(Boolean).join('\n\n'),
      broll: null, // path/URL to a background clip — filled by media library / integration
    };
  },

  carousel(core) {
    const sentences = splitSentences(core.body);
    const slides = [{ heading: core.hook1, text: core.hook2 || '' }];
    // ~1 sentence per slide, capped to a reasonable carousel length.
    for (const s of sentences.slice(0, 7)) {
      slides.push({ heading: '', text: s });
    }
    if (core.cta) slides.push({ heading: '', text: core.cta, isCta: true });
    return { slides };
  },

  story(core) {
    const sentences = splitSentences(core.body);
    return {
      heading: core.hook1,
      body: sentences.slice(0, 3).join(' '),
      cta: core.cta || '',
    };
  },

  image(core) {
    return {
      hook: core.hook1,
      subhook: core.hook2 || '',
    };
  },

  txt_broll(core) {
    // Text-on-background "video" — we model it as ordered lines (one per beat).
    const lines = [core.hook1];
    if (core.hook2) lines.push(core.hook2);
    for (const s of splitSentences(core.body).slice(0, 4)) lines.push(s);
    return { lines, broll: null };
  },
};

export function buildCopy(format, core) {
  const fn = builders[format];
  if (!fn) throw new Error(`No builder for format: ${format}`);
  return fn(core);
}
