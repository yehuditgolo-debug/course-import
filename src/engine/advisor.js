// Advisor (A4) — the core-post advisor, grounded in method/.
//
// Two jobs, per CLAUDE.md's advisory protocol:
//   1. suggestHooks  — offer 3-5 hooks of different types from the hook library
//      (method/04), strongest marked. AI-enhanced when ANTHROPIC_API_KEY is set,
//      with a deterministic local fallback so it always works.
//   2. critiquePost  — run a draft through the golden test (method/02) and the
//      red lines (CLAUDE.md / method/03). This gate is ALWAYS deterministic:
//      AI never gets to overrule a red line.
//
// The advisor edits and critiques — it does not write the post ("AI הוא עורך,
// לא כותב"). Hook options are the one place it drafts text, per the protocol.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const METHOD_DIR = resolve(__dirname, '..', '..', 'method');

const MODEL = process.env.CSYS_MODEL || 'claude-sonnet-4-6';
const API_KEY = process.env.ANTHROPIC_API_KEY;

// --- knowledge base ----------------------------------------------------------

export function loadMethod() {
  const files = {};
  if (existsSync(METHOD_DIR)) {
    for (const name of readdirSync(METHOD_DIR).filter((f) => f.endsWith('.md')).sort()) {
      files[name] = readFileSync(resolve(METHOD_DIR, name), 'utf8');
    }
  }
  return { files, text: Object.entries(files).map(([n, c]) => `\n===== ${n} =====\n${c}`).join('\n') };
}

// --- red lines (CLAUDE.md / method/03-voice-dna.md) ---------------------------
// Each rule: regex that flags, optional `unless` that clears the whole text
// (e.g. "למה לא תראה אצלי לפני/אחרי" is an approved hook ABOUT the red line).

export const RED_LINES = [
  {
    id: 'body_numbers',
    label: { he: 'מספרי גוף (קילו/קלוריות/מידות)', en: 'Body numbers' },
    re: /\d+(?:\.\d+)?\s*(?:קילו|ק["״]ג|קלוריות)|קלוריות|קלורי|אחוז(?:י)?\s?שומן|ירד(?:תי|ת)\s?\d+|\d+\s*ס["״]מ|סנטימטר/,
  },
  {
    id: 'jargon',
    label: { he: 'מושג מקצועי', en: 'Professional jargon' },
    re: /גירעון|גרעון|מאקרו|חילוף\s?חומרים|מטבוליזם|אנבולי|קטבולי/,
  },
  {
    id: 'magic',
    label: { he: 'הבטחת קסם / דדליין', en: 'Magic promise / deadline' },
    re: /תוך\s?(?:\d+\s?(?:ימים|שבועות|חודשים)|שבוע(?:יים)?|חודש(?:יים)?)|בלי\s?מאמץ|מהפכני|קסם|מובטח|תוצאות\s?מיידיות/,
    unless: /לא\s?מבטיח|מסרב\s?להבטיח|אין\s?קסם|בלי\s?קסמים?|הבטחות\s?קסם/,
  },
  {
    id: 'showcase',
    label: { he: 'שפת ראווה (קוביות/חיטוב/לפני-אחרי)', en: 'Showcase language' },
    re: /קוביות|חיטוב|מחוטב|גוף\s?חלומי|לפני\s?ואחרי|לפני\s?\/\s?אחרי/,
    unless: /למה\s?לא|לא\s?תראה|אין\s?אצלי/,
  },
  {
    id: 'diet_speak',
    label: { he: 'שפת דיאטה (חטא/פיצוי/יום חופשי)', en: 'Diet language' },
    re: /חטא|מפצה|לפצות|יום\s?חופשי|צ['׳]יט|אוכל\s?נקי|אסור\s?לאכול/,
  },
];

export function redLineCheck(text = '') {
  const hits = [];
  for (const rule of RED_LINES) {
    if (rule.unless && rule.unless.test(text)) continue;
    const m = text.match(rule.re);
    if (m) hits.push({ id: rule.id, label: rule.label, match: m[0] });
  }
  return hits;
}

// --- hook library (method/04-hook-library.md) ----------------------------------

export const HOOK_TYPES = [
  {
    id: 'permission', strongest: true,
    label: { he: 'הוק ההיתר (נוגד-קונבנציה)', en: 'Permission hook' },
    why: { he: 'החזק ביותר אצלנו — הזעזוע מההיתר: "רגע, מותר ככה?!"', en: 'Our strongest — the shock of permission' },
    examples: [
      'אני אוכל המבורגר, שווארמה, פיצה. וזה עובד.',
      'אין אצלי משקל. אפס.',
      'אל תוריד כלום מהצלחת. תוסיף.',
      'פעמיים בשבוע. זהו.',
    ],
  },
  {
    id: 'confession',
    label: { he: 'הוק הווידוי (אני חי את זה)', en: 'Confession hook' },
    why: { he: 'רגע אמיתי, אנושי, מצולם — מסר 3', en: 'A real, human, filmable moment — pillar 3' },
    examples: [
      'הקפה עם הרוגלה שלי, כל בוקר.',
      'גם אני נשברתי השבוע. הנה מה שעשיתי למחרת.',
    ],
  },
  {
    id: 'not-your-fault',
    label: { he: 'הוק "זה לא אשמתך"', en: '"Not your fault" hook' },
    why: { he: 'מסיר אשמה, מאשים את השיטה — מסר 2', en: 'Removes guilt, blames the method — pillar 2' },
    examples: [
      'ניסית 3 דיאטות והכל קרס? זה לא בגלל שאתה חלש.',
      'למה לא תראה אצלי תמונות לפני/אחרי',
    ],
  },
  {
    id: 'situation',
    label: { he: 'הוק הסיטואציה (מהחיים)', en: 'Situation hook' },
    why: { he: 'רגע מוכר מחיי האווטאר — מסר 1', en: 'A familiar moment from the avatar\'s life — pillar 1' },
    examples: [
      'איך אני ניגש לבופה בחתונה',
      '5 הדקות שלפני המקרר, בערב עמוס אחרי עבודה',
      'מה אני לוקח לטיסה / נסיעה ארוכה',
      'שבת. בלי חשבונות.',
    ],
  },
  {
    id: 'goal-question',
    label: { he: 'הוק השאלה-על-הרצון', en: 'Goal-question hook' },
    why: { he: 'פונה ישר לרצון התפקודי — עיקרון המטרה', en: 'Speaks straight to the functional desire' },
    examples: [
      'מתי בפעם האחרונה רדפת אחרי הילדים בלי להתנשף?',
      'מה המטרה שלך? (רמז: היא לא מספר)',
    ],
  },
];

// Disqualification rules for a single hook (method/04).
export function checkHook(hook = '') {
  const problems = redLineCheck(hook).map((h) => ({ id: h.id, label: h.label, match: h.match }));
  if (/^\d+\s?(?:טיפים|דרכים|צעדים|כללים)|טיפים\s?ל/.test(hook.trim())) {
    problems.push({ id: 'generic', label: { he: 'גנרי — יכול להופיע אצל כל תזונאי', en: 'Generic' }, match: hook.trim().slice(0, 30) });
  }
  return { ok: problems.length === 0, problems };
}

// --- the golden test (method/02-strategy.md, 6 questions) ----------------------

export const PILLARS = ['umbrella', 'no-revolution', 'diets-fail', 'i-live-it'];

const DESIRE_WORDS = ['אנרגיה', 'חליפה', 'גב ', 'הגב', 'ילדים', 'מתנשף', 'עייף', 'תפקוד', 'בדיקות דם', 'כוח', 'להרגיש', 'בית הכנסת'];
const ACTION_WORDS = ['המבורגר', 'שווארמה', 'פיצה', 'צלחת', 'בופה', 'חתונה', 'טיסה', 'קפה', 'רוגלה', 'שבת', 'סטודיו', 'אימון', 'מקרר', 'ארוחה', 'אוכל', 'משקל'];
const MINIMUM_WORDS = ['מינימום', 'פעמיים בשבוע', 'שעה', 'עיקרון אחד', 'קטן', 'פשוט', 'נשאר', 'מחזיק', 'אפס'];

export function goldenTest(post = {}) {
  const text = [post.hook1, post.hook2, post.body, post.cta].filter(Boolean).join('\n');
  const red = redLineCheck(text);
  const has = (words) => words.some((w) => text.includes(w));
  const grade = (ok, warnOnly = true) => (ok ? 'pass' : warnOnly ? 'warn' : 'fail');

  const jargon = red.filter((r) => r.id === 'jargon');
  const magicOrNumbers = red.filter((r) => r.id === 'magic' || r.id === 'body_numbers');
  const pillarOk = PILLARS.includes(post.tags?.pillar || post.pillar);

  return [
    { id: 'desire', q: { he: 'מדבר אל הרצון של האווטאר (תפקוד, לא מראה)?', en: 'Speaks to the avatar\'s desire?' },
      pass: grade(has(DESIRE_WORDS)), note: has(DESIRE_WORDS) ? '' : 'לא זוהתה שפת תפקוד (אנרגיה / חליפה / גב / ילדים...)' },
    { id: 'eye_level', q: { he: 'בגובה העיניים — בלי מושג מקצועי?', en: 'Eye level — no jargon?' },
      pass: grade(jargon.length === 0, false), note: jargon.map((j) => `«${j.match}»`).join(', ') },
    { id: 'pillar', q: { he: 'נתלה על אחד משלושת המסרים?', en: 'Hangs on one of the 3 pillars?' },
      pass: grade(pillarOk), note: pillarOk ? '' : 'לא תויג עמוד תוכן (pillar)' },
    { id: 'action', q: { he: 'מראה מעשה — לא רק אומר מילים?', en: 'Shows an action, not just words?' },
      pass: grade(has(ACTION_WORDS)), note: has(ACTION_WORDS) ? '' : 'לא זוהה מעשה קונקרטי שאפשר לצלם' },
    { id: 'minimum', q: { he: 'מחזק את "המינימום שמחזיק"?', en: 'Reinforces "the minimum that holds"?' },
      pass: grade(has(MINIMUM_WORDS)), note: has(MINIMUM_WORDS) ? '' : 'לא זוהתה שפת המטרייה' },
    { id: 'no_magic', q: { he: 'לא נשמע כהבטחת קסם או מספר?', en: 'No magic promise / number?' },
      pass: grade(magicOrNumbers.length === 0, false), note: magicOrNumbers.map((j) => `«${j.match}»`).join(', ') },
  ];
}

export function critiquePost(post = {}) {
  const text = [post.hook1, post.hook2, post.body, post.cta].filter(Boolean).join('\n');
  const redLines = redLineCheck(text);
  const hookCheck = checkHook(post.hook1 || '');
  const golden = goldenTest(post);
  const verdict = golden.some((c) => c.pass === 'fail') || redLines.length
    ? 'fail'
    : golden.some((c) => c.pass === 'warn') ? 'warn' : 'pass';
  return { verdict, redLines, hookCheck, goldenTest: golden, checkedAt: new Date().toISOString() };
}

// --- hook suggestions ----------------------------------------------------------

function localHooks({ idea = '', pillar = '' } = {}) {
  const wanted = {
    'no-revolution': ['permission', 'situation'],
    'diets-fail': ['permission', 'not-your-fault'],
    'i-live-it': ['confession', 'permission'],
    umbrella: ['permission', 'goal-question'],
  }[pillar] || [];

  return HOOK_TYPES.map((type) => {
    let text = type.examples[0];
    if (idea && type.id === 'situation') text = `${idea} — ככה זה נראה אצלי.`;
    if (idea && type.id === 'confession') text = `${idea}. כן, אני התזונאי.`;
    return {
      type: type.id,
      typeLabel: type.label,
      text,
      examples: type.examples,
      why: type.why,
      strongest: Boolean(type.strongest),
      fit: wanted.includes(type.id),
    };
  });
}

async function aiSuggestHooks({ idea, pillar, lang }) {
  if (!API_KEY) return null;
  const method = loadMethod();
  const context = [
    method.files['03-voice-dna.md'] || '',
    method.files['04-hook-library.md'] || '',
    method.files['05-content-pillars.md'] || '',
  ].join('\n\n');

  const prompt =
`אתה היועץ לפוסט ליבה של שי (תזונה+תנועה לגברים חרדים, "המינימום שמחזיק").
בסיס הידע שלך (חובה להתעגן בו, לא בידע כללי):

${context}

הרעיון/הסיטואציה של המשתמשת: "${idea || '(לא צוין — הצע מהספרייה)'}"
עמוד תוכן מבוקש: ${pillar || '(לא צוין)'}

הצע 5 הוקים, אחד מכל סוג בספרייה (permission / confession / not-your-fault / situation / goal-question).
שמור על הקול של שי: גובה העיניים, שפת תפקוד והיתר, בלי מספרי גוף, בלי מושגים מקצועיים,
בלי הבטחות קסם, בלי שפת ראווה. ההוק הכי חזק הוא בדרך-כלל הוק ההיתר.

החזר JSON בלבד, מערך של אובייקטים: [{"type":"permission","text":"...","why":"..."}]`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) { console.warn(`[advisor] API returned ${res.status}; falling back to library`); return null; }
    const data = await res.json();
    const raw = data?.content?.[0]?.text?.trim() || '';
    const json = raw.match(/\[[\s\S]*\]/);
    if (!json) return null;
    const hooks = JSON.parse(json[0]);
    return hooks
      .map((h) => {
        const type = HOOK_TYPES.find((t) => t.id === h.type) || {};
        const gate = checkHook(h.text || '');
        return {
          type: h.type, typeLabel: type.label || { he: h.type, en: h.type },
          text: h.text, why: { he: h.why || '', en: h.why || '' },
          strongest: Boolean(type.strongest), fit: true,
          disqualified: gate.ok ? null : gate.problems, // red-line gate beats the AI
        };
      })
      .filter((h) => h.text && !h.disqualified);
  } catch (err) {
    console.warn(`[advisor] request failed (${err.message}); falling back to library`);
    return null;
  }
}

export async function suggestHooks(opts = {}) {
  const ai = await aiSuggestHooks(opts);
  if (ai && ai.length) return { source: 'ai', hooks: ai };
  return { source: 'local', hooks: localHooks(opts) };
}
