// Hybrid integration layer.
//
// The local JSON store is the source of truth. These adapters let you MIRROR
// that truth into the same external tools the NR system uses. Each adapter is a
// thin, clearly-marked stub: it activates only when its env vars are present,
// and otherwise reports "not configured" instead of failing. This is where the
// "hybrid" approach lives — fully local today, plug in accounts later.

// --- Airtable: mirror content records into an Airtable base ------------------
export const airtable = {
  configured: () => Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID),
  async pushPost(post) {
    if (!this.configured()) {
      return { ok: false, reason: 'Airtable not configured (set AIRTABLE_API_KEY, AIRTABLE_BASE_ID)' };
    }
    // TODO: POST https://api.airtable.com/v0/{BASE}/{table} with Authorization: Bearer.
    // Map each format record to a row; use `status` as the Status field.
    throw new Error('Airtable.pushPost: implement HTTP mapping for your base schema');
  },
};

// --- Notion: pull core-post source drafts from a Notion database -------------
export const notion = {
  configured: () => Boolean(process.env.NOTION_API_KEY && process.env.NOTION_DB_ID),
  async pullSources() {
    if (!this.configured()) {
      return { ok: false, items: [], reason: 'Notion not configured (set NOTION_API_KEY, NOTION_DB_ID)' };
    }
    // TODO: query the Notion database, map pages -> core posts (title=hook1, body=...).
    throw new Error('Notion.pullSources: implement Notion query -> core post mapping');
  },
};

// --- GoHighLevel / Reign Era: push scheduled posts to the social planner ------
export const ghl = {
  configured: () => Boolean(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID),
  async schedulePost(fmt) {
    if (!this.configured()) {
      return { ok: false, reason: 'GHL not configured (set GHL_API_KEY, GHL_LOCATION_ID)' };
    }
    // TODO: POST to the GHL social-planner endpoint with the rendered asset +
    // fmt.scheduleDate. On success the caller advances status -> scheduled.
    throw new Error('GHL.schedulePost: implement social-planner API call');
  },
};

export function integrationStatus() {
  return {
    airtable: airtable.configured(),
    notion: notion.configured(),
    ghl: ghl.configured(),
  };
}
