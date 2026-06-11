// Schema, constants and the status state-machine.
// The whole system is coordinated by a single `status` field per format record,
// exactly like the NR system where Airtable's Status field is the "protocol"
// that ties the independent agents together.

export const LANGS = ['he', 'en'];

// The five content formats derived from a single core post.
export const FORMATS = ['reel', 'carousel', 'story', 'image', 'txt_broll'];

export const FORMAT_LABELS = {
  reel:      { he: 'ריל (B-roll + הוק)', en: 'Reel (B-roll + hook)' },
  carousel:  { he: 'קרוסלה',            en: 'Carousel' },
  story:     { he: 'סטורי',             en: 'Story' },
  image:     { he: 'פוסט תמונה',        en: 'Static image' },
  txt_broll: { he: 'טקסט B-roll',       en: 'Txt B-roll' },
};

// The pipeline a format record moves through. Each stage is "owned" by a
// different actor (engine / human / scheduler), mirroring the NR flow:
//   To edit -> Editing -> To review (Nat) -> To schedule -> Scheduled -> Published
export const STATUSES = [
  'to_edit',   // created by the repurpose engine, waiting to be built/rendered
  'editing',   // being rendered
  'review',    // rendered, waiting for human approval (the "To review (Nat)" stage)
  'approved',  // human approved, ready to receive a calendar date
  'scheduled', // a date was assigned + (optionally) pushed to the publisher
  'published', // live
];

export const STATUS_LABELS = {
  to_edit:   { he: 'לעריכה',   en: 'To edit' },
  editing:   { he: 'בעריכה',   en: 'Editing' },
  review:    { he: 'לבדיקה',   en: 'To review' },
  approved:  { he: 'מאושר',    en: 'Approved' },
  scheduled: { he: 'מתוזמן',   en: 'Scheduled' },
  published: { he: 'פורסם',    en: 'Published' },
};

// Allowed forward transitions (a simple, explicit state machine).
export const TRANSITIONS = {
  to_edit:   ['editing'],
  editing:   ['review', 'to_edit'],
  review:    ['approved', 'editing'],
  approved:  ['scheduled', 'review'],
  scheduled: ['published', 'approved'],
  published: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

let _seq = 0;
export function nextId(prefix = 'CP') {
  _seq += 1;
  return `${prefix}${Date.now().toString(36)}${(_seq).toString(36)}`;
}

// A core post is the single source of truth. Formats are derived from it.
//
// `tags` and `metrics` are the structure for the data feedback loop (COPILOT.md
// engine 2). The taxonomy values (which pillars / hook types exist) come from
// the method knowledge base (method/), so we keep these as free-form strings
// here rather than hard-coding a taxonomy the method should own.
export function makeCorePost({
  id, lang = 'he', title = '', hook1 = '', hook2 = '', body = '', cta = '',
  pillar = '', hookType = '', angle = '', ctaType = '',
} = {}) {
  if (!LANGS.includes(lang)) throw new Error(`Unknown lang: ${lang}`);
  return {
    id: id || nextId('CP'),
    lang,
    title: title || hook1,
    hook1,
    hook2,
    body,
    cta,
    // --- tagging (drives advisor suggestions + data-loop grouping) ---
    tags: {
      pillar,    // which content pillar (method/05)
      hookType,  // which hook pattern (method/04)
      angle,     // the specific angle/POV
      ctaType,   // type of call to action
    },
    // --- performance metrics (filled once data exists; powers the loop) ---
    metrics: {
      reach: null, views: null, saves: null, shares: null,
      comments: null, profileVisits: null, leads: null, recordedAt: null,
    },
    createdAt: new Date().toISOString(),
    formats: [],
  };
}
