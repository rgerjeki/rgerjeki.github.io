// =============================================================================
// Dev.to (Forem) syndication adapter.
//
// Idempotent by design: on init it fetches every article the token owns and
// indexes them by canonical_url. A post whose canonical URL is already present
// is UPDATED (PUT); otherwise it is CREATED (POST). Re-running never produces
// duplicates, and the canonical_url always points back to the source site.
//
// API reference (Forem API v1):
//   POST   /api/articles                 create
//   PUT    /api/articles/{id}            update
//   GET    /api/articles/me/published    list own published   (page, per_page)
//   GET    /api/articles/me/unpublished  list own unpublished (page, per_page)
//   Headers: api-key: <token>, Accept: application/vnd.forem.api-v1+json
// =============================================================================

const API_BASE = "https://dev.to/api";
const ACCEPT = "application/vnd.forem.api-v1+json";
const PER_PAGE = 1000;

// Dev.to create endpoint is rate-limited; space out mutating calls a little.
const MUTATION_DELAY_MS = 1200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = {
  token: null,
  siteBase: "",
  byCanonical: new Map(), // canonical_url -> article id
  ready: false,
};

function headers(extra = {}) {
  return {
    "api-key": state.token,
    Accept: ACCEPT,
    ...extra,
  };
}

async function apiFetch(pathname, options = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, options);
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`${options.method || "GET"} ${pathname} -> ${res.status} ${res.statusText} ${detail}`);
  }
  return res.status === 204 ? null : res.json();
}

async function listAll(pathname) {
  const items = [];
  for (let page = 1; ; page++) {
    const batch = await apiFetch(`${pathname}?page=${page}&per_page=${PER_PAGE}`, {
      headers: headers(),
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return items;
}

// Rewrite site-relative markdown links/images to absolute URLs so they resolve
// on Dev.to, and strip Hugo's summary marker.
function normalizeBody(markdown, siteBase) {
  let body = (markdown || "").replace(/<!--\s*more\s*-->/g, "");

  // Translate the site's embed shortcodes into Dev.to (Forem) liquid tags, so a
  // single Markdown body renders on the site and embeds correctly on Dev.to.
  body = body
    .replace(/\{\{<\s*youtube\s+([\w-]+)\s*>\}\}/g, "{% embed https://youtu.be/$1 %}")
    .replace(/\{\{<\s*githubcard\s+repo="([^"]+)"\s*>\}\}/g, "{% embed https://github.com/$1 %}")
    .replace(/\{\{<\s*livesite\s+url="([^"]+)"\s*>\}\}/g, "{% embed $1 %}");

  if (siteBase) {
    // ](/path...  and  src="/path..." / href="/path..."  (skip protocol-relative //)
    body = body
      .replace(/\]\(\/(?!\/)/g, `](${siteBase}/`)
      .replace(/(src|href)="\/(?!\/)/g, `$1="${siteBase}/`);
  }
  return body.trim();
}

function buildArticle(post, siteBase) {
  const article = {
    title: post.title,
    body_markdown: normalizeBody(post.body_markdown, siteBase),
    published: post.published !== false,
    canonical_url: post.canonical_url,
    description: post.description || "",
    tags: Array.isArray(post.tags) ? post.tags.slice(0, 4) : [],
  };
  // Cover images are intentionally NOT synced: Dev.to owns its own cover
  // (uploaded/generated there), and omitting main_image on update leaves it
  // untouched. The `cover` front matter still drives the image on this site.
  if (post.series) article.series = post.series;
  return { article };
}

export default {
  name: "devto",

  isConfigured() {
    return Boolean(process.env.DEV_TO_TOKEN);
  },

  async init({ siteBase, dryRun, log }) {
    state.siteBase = siteBase;
    state.token = process.env.DEV_TO_TOKEN;

    if (dryRun) {
      log("[devto] dry-run: skipping remote article index fetch.");
      state.ready = true;
      return;
    }

    const [published, unpublished] = await Promise.all([
      listAll("/articles/me/published"),
      listAll("/articles/me/unpublished"),
    ]);
    for (const a of [...published, ...unpublished]) {
      if (a.canonical_url) state.byCanonical.set(a.canonical_url, a.id);
    }
    log(`[devto] indexed ${state.byCanonical.size} existing article(s).`);
    state.ready = true;
  },

  async sync(post, { siteBase, dryRun, log }) {
    const payload = buildArticle(post, siteBase);
    const existingId = state.byCanonical.get(post.canonical_url);

    if (dryRun) {
      log(
        `[devto] would ${existingId ? "UPDATE" : "CREATE"} "${post.title}"\n` +
          `        canonical_url: ${payload.article.canonical_url}\n` +
          `        tags: [${payload.article.tags.join(", ")}]  cover: not synced (managed on Dev.to)  series: ${payload.article.series || "(none)"}`
      );
      return { action: existingId ? "update (dry-run)" : "create (dry-run)", url: null };
    }

    await sleep(MUTATION_DELAY_MS);

    if (existingId) {
      const updated = await apiFetch(`/articles/${existingId}`, {
        method: "PUT",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      return { action: "updated", url: updated.url };
    }

    const created = await apiFetch("/articles", {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    state.byCanonical.set(post.canonical_url, created.id);
    return { action: "created", url: created.url };
  },
};
