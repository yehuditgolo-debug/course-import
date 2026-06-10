// Bilingual example data so the dashboard isn't empty on first run.
import { makeCorePost } from './schema.js';
import { builders } from './engine/formats.js';
import { FORMATS } from './schema.js';

function withFormats(core) {
  for (const type of FORMATS) {
    core.formats.push({
      id: `${core.id}-${type}`, coreId: core.id, type, lang: core.lang,
      status: 'to_edit', scheduleDate: null, copy: builders[type](core),
      render: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }
  return core;
}

export function seed() {
  const he = makeCorePost({
    id: 'CP1', lang: 'he',
    hook1: 'הפסיקי לתת ל-AI לכתוב בשבילך',
    hook2: 'ה-AI הוא עורך, לא כותב',
    body: 'אם תתני ל-AI לכתוב את כל הפוסט מאפס, תקבלי תוכן רובוטי ופלסטי שנשמע כמו כולם. הטריק הוא להקליט את המחשבות הגולמיות שלך על הרעיון. ה-AI לוקח את הבלאגן ועורך אותו לפוסט מושלם שנשמע כמוך. ככה את בולטת כמומחית במקום להישמע גנרית.',
    cta: 'הגיבי "מערכת" ואשלח לך את התהליך המלא',
  });

  const en = makeCorePost({
    id: 'CP2', lang: 'en',
    hook1: 'Stop letting AI write for you',
    hook2: 'AI is an editor, not a writer',
    body: 'If you let AI write the whole post from scratch you get robotic, plastic content that sounds like everyone else. The trick is to record your raw thoughts about the idea. AI takes the mess and edits it into a perfect post that sounds like you. That is how you stand out as an expert instead of sounding generic.',
    cta: 'Comment "SYSTEM" and I will send you the full process',
  });

  return { posts: [withFormats(he), withFormats(en)] };
}
