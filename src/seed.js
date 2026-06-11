// Example data drawn from the actual brand method (method/02-strategy.md) so
// the dashboard demonstrates real, on-voice content from first run.
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
  // Pillar 2 ("diets fail from suffering") with the signature permission hook.
  const cp1 = makeCorePost({
    id: 'CP1', lang: 'he',
    hook1: 'אין אצלי משקל. אפס.',
    hook2: 'לא שוקלים אצלי בכלל',
    body: 'ניסית כמה דיאטות והכל קרס? זה לא בגלל שאתה חלש. זה בגלל שנמכרה לך שיטה שבנויה על סבל. כשכל בוקר מתחיל בעלייה על משקל, בנית לעצמך בית משפט במטבח. אצלי מודדים דברים אחרים לגמרי: שיש לך כוח לרדוף אחרי הילדים, שהגב לא כואב, שהחליפה נסגרת בקלות. זה מה שחוגגים.',
    cta: 'תגיב "מותר" ואשלח לך את המדריך לרגעים הקשים',
    pillar: 'diets-fail', hookType: 'permission', angle: 'אין משקל בקליניקה', ctaType: 'comment-word',
  });

  // Pillar 3 ("I live it myself") — the morning coffee confession.
  const cp2 = makeCorePost({
    id: 'CP2', lang: 'he',
    hook1: 'הקפה עם הרוגלה שלי. כל בוקר.',
    hook2: 'כן, אני התזונאי',
    body: 'אני אבא, עובד, עם שולחן שבת מלא. כל בוקר יש קפה ורוגלה, וזה מתוכנן — לא נפילה. ביום-יום הצלחת שלי מאוזנת ומשביעה, ובכל יום יש מתנה אחת טובה. לא הורדתי כלום מהחיים — הוספתי להם סדר שמחזיק. אם זה עובד אצלי, באותה סירה שלך, זה יעבוד גם אצלך.',
    cta: 'עקוב — כל שבוע מעשה אחד קטן שמחזיק',
    pillar: 'i-live-it', hookType: 'confession', angle: 'הקפה והרוגלה של הבוקר', ctaType: 'follow',
  });

  return { posts: [withFormats(cp1), withFormats(cp2)] };
}
