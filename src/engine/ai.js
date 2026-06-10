// AI adapter — optional enhancement layer.
//
// In the NR system, Claude is the "editor" that turns raw thoughts into polished
// copy and adapts a core post per format. Here that role is pluggable:
//   - If ANTHROPIC_API_KEY is set, we call the Claude API to rewrite copy.
//   - Otherwise we fall back to deterministic, offline heuristics so the whole
//     system still runs end-to-end with zero configuration.
//
// This keeps the project "hybrid": works fully local, upgrades to real AI when
// you provide a key.

const MODEL = process.env.CSYS_MODEL || 'claude-sonnet-4-6';
const API_KEY = process.env.ANTHROPIC_API_KEY;

export function aiEnabled() {
  return Boolean(API_KEY);
}

// Ask Claude to adapt a core post into copy for a specific format.
// Returns a string (the model's text), or null if AI is not configured/fails.
export async function adaptCopy({ format, lang, corePost }) {
  if (!API_KEY) return null;
  const langName = lang === 'he' ? 'Hebrew' : 'English';
  const prompt =
`You are a social content editor. Adapt the following CORE POST into copy for a ${format} in ${langName}.
Keep the author's voice, keep it punchy, do not invent facts. Return only the adapted copy.

HOOK 1: ${corePost.hook1}
HOOK 2: ${corePost.hook2 || ''}
BODY:
${corePost.body}
CTA: ${corePost.cta || ''}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.warn(`[ai] API returned ${res.status}; falling back to heuristics`);
      return null;
    }
    const data = await res.json();
    return data?.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.warn(`[ai] request failed (${err.message}); falling back to heuristics`);
    return null;
  }
}
