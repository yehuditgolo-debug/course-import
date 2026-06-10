// HTML/CSS templates per format. The renderer produces a self-contained HTML
// file (no external assets except a web font) that you can open in any browser
// — exactly the "HTML/CSS rendered to PNG" approach the NR editing skills use.
// Hebrew renders correctly because we load the Heebo web font and set dir="rtl".

const PALETTE = {
  bg: '#0f3d3e',     // dark teal, like the NR "teal pill" brand
  bgAlt: '#114b4d',
  text: '#ffffff',
  pill: '#0f3d3e',
  accent: '#d4a017',
};

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function shell({ lang, w, h, body, css }) {
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Heebo', system-ui, 'DejaVu Sans', sans-serif; }
  .frame { width:${w}px; height:${h}px; overflow:hidden; position:relative;
           display:flex; flex-direction:column; }
  ${css}
</style>
</head>
<body><div class="frame">${body}</div></body>
</html>`;
}

// 1080x1350 static image: a single big hook over a teal card.
function imageTpl(copy, lang) {
  const css = `
    .frame { background:linear-gradient(160deg, ${PALETTE.bg}, ${PALETTE.bgAlt});
             color:${PALETTE.text}; justify-content:center; align-items:center;
             text-align:center; padding:90px; }
    .hook { font-size:84px; font-weight:900; line-height:1.12; }
    .sub  { margin-top:40px; font-size:46px; font-weight:700; color:${PALETTE.accent}; }`;
  const body = `
    <div class="hook">${esc(copy.hook)}</div>
    ${copy.subhook ? `<div class="sub">${esc(copy.subhook)}</div>` : ''}`;
  return shell({ lang, w: 1080, h: 1350, body, css });
}

// 1080x1350 carousel: render every slide stacked (one .slide per page).
function carouselTpl(copy, lang) {
  const css = `
    .frame { height:auto; }
    .slide { width:1080px; height:1350px; flex:none;
             background:linear-gradient(160deg, ${PALETTE.bg}, ${PALETTE.bgAlt});
             color:${PALETTE.text}; display:flex; flex-direction:column;
             justify-content:center; padding:96px; page-break-after:always; }
    .slide .heading { font-size:74px; font-weight:900; line-height:1.12; margin-bottom:28px; }
    .slide .text { font-size:50px; font-weight:400; line-height:1.4; }
    .slide.cta .text { color:${PALETTE.accent}; font-weight:700; }
    .num { position:absolute; bottom:40px; inset-inline-end:60px; font-size:34px; opacity:.6; }`;
  const slides = copy.slides.map((s, i) => `
    <div class="slide ${s.isCta ? 'cta' : ''}" style="position:relative">
      ${s.heading ? `<div class="heading">${esc(s.heading)}</div>` : ''}
      <div class="text">${esc(s.text)}</div>
      <div class="num">${i + 1}/${copy.slides.length}</div>
    </div>`).join('');
  return shell({ lang, w: 1080, h: 1350 * copy.slides.length, body: slides, css });
}

// 1080x1920 story: headline pill + body card + CTA.
function storyTpl(copy, lang) {
  const css = `
    .frame { background:linear-gradient(160deg, ${PALETTE.bg}, ${PALETTE.bgAlt});
             padding:120px 80px; justify-content:space-between; color:${PALETTE.text}; }
    .pill { align-self:flex-start; background:${PALETTE.accent}; color:${PALETTE.bg};
            font-weight:900; font-size:48px; padding:22px 40px; border-radius:999px; }
    .card { background:rgba(255,255,255,.08); border-radius:32px; padding:64px;
            font-size:54px; line-height:1.4; font-weight:700; }
    .cta { font-size:46px; font-weight:900; text-align:center; color:${PALETTE.accent}; }`;
  const body = `
    <div class="pill">${esc(copy.heading)}</div>
    <div class="card">${esc(copy.body)}</div>
    ${copy.cta ? `<div class="cta">${esc(copy.cta)}</div>` : '<div></div>'}`;
  return shell({ lang, w: 1080, h: 1920, body, css });
}

// Reel / txt_broll: we render a 1080x1920 "poster frame" (the hook overlay).
// Actual video assembly (overlay over a b-roll clip) is a documented integration
// point that needs ffmpeg — see src/integrations and README.
function posterTpl(copy, lang, kind) {
  const lines = kind === 'txt_broll'
    ? (copy.lines || [])
    : [copy.hook, copy.subhook].filter(Boolean);
  const css = `
    .frame { background:#000; color:#fff; justify-content:center; align-items:center;
             text-align:center; padding:80px; }
    .stack { display:flex; flex-direction:column; gap:28px; }
    .line { font-size:64px; font-weight:900; line-height:1.18;
            text-shadow:0 4px 24px rgba(0,0,0,.8); }
    .badge { position:absolute; top:50px; inset-inline-start:50px; font-size:30px;
             opacity:.6; letter-spacing:2px; }`;
  const body = `
    <div class="badge">${kind === 'txt_broll' ? 'TXT B-ROLL' : 'REEL'} · poster</div>
    <div class="stack">${lines.map((l) => `<div class="line">${esc(l)}</div>`).join('')}</div>`;
  return shell({ lang, w: 1080, h: 1920, body, css });
}

export function renderHTML(format, copy, lang) {
  switch (format) {
    case 'image':     return imageTpl(copy, lang);
    case 'carousel':  return carouselTpl(copy, lang);
    case 'story':     return storyTpl(copy, lang);
    case 'reel':      return posterTpl(copy, lang, 'reel');
    case 'txt_broll': return posterTpl(copy, lang, 'txt_broll');
    default: throw new Error(`No template for format: ${format}`);
  }
}
