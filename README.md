# rgerjeki.github.io

Personal site and blog of Reese Gerjekian (cybersecurity and AWS cloud). It is a
self-contained [Hugo](https://gohugo.io/) site with a custom, dark-first "Operator"
terminal design, deployed to GitHub Pages, and it automatically cross-posts blog
posts to [Dev.to](https://dev.to/).

---

## Table of contents

- [Local development](#local-development)
- [Project layout](#project-layout)
- [Design system](#design-system)
- [The projects page](#the-projects-page)
- [Writing a blog post](#writing-a-blog-post)
  - [Front matter reference](#front-matter-reference)
- [Publishing and deploy](#publishing-and-deploy)
- [Dev.to syndication](#devto-syndication)
  - [One-time setup: the DEV_TO_TOKEN secret](#one-time-setup-the-dev_to_token-secret)
  - [How the sync works](#how-the-sync-works)
  - [Front matter to Dev.to field mapping](#front-matter-to-devto-field-mapping)
  - [Adding another platform later](#adding-another-platform-later)

---

## Local development

You need **Hugo Extended** (the styles compile SCSS, so the extended build is
required). Both CI workflows pin `0.164.0`, so use the same release locally to keep
the config keys resolving the way they do in CI.

```bash
# macOS
brew install hugo

# Ubuntu/Debian
sudo apt-get install -y hugo   # ensure it reports "+extended"

# Verify
hugo version                    # must contain "+extended"
```

Run the live-reload dev server and open http://localhost:1313 :

```bash
hugo server -D                  # -D also renders draft posts
```

Build the production site into `public/` (what CI does):

```bash
hugo --gc --minify
```

> `public/` and `resources/` are build output and are git-ignored, so never commit
> them. CI rebuilds from source on every deploy.

## Project layout

```
content/
  posts/            # blog posts live here (served at /blog/<slug>/)
    _index.md       #   blog index page metadata
  projects.md       # projects hub (uses layout = "projects")
  cyber-operations/ # project sections; every page becomes a project card
  web-developments/
  python-projects/
  classics/
  tools/
archetypes/
  posts.md          # template used by `hugo new posts/<slug>.md`
layouts/
  _default/
    projects.html   # the filterable projects grid (used by content/projects.md)
    list.html       # section and taxonomy pages (operator card grid)
    single.html     # generic single pages
  posts/
    list.html       # blog index
    single.html     # blog post
  partials/
    home.html       # operator terminal hero + recent projects + latest writing
    page.html       # operator chrome around a single page (breadcrumb, back link)
    list.html       # operator chrome + card grid for sections
    post-card.html  # reusable blog post card
  index.syndication.json   # emits /syndication.json for the Dev.to workflow
assets/
  scss/             # design system; entry point is main.scss (see below)
  js/
    operator.js     # homepage + page motion (terminal, canvas field, scroll, cursor)
    theme.js        # light/dark toggle
    copy-code.js    # copy buttons on code blocks
scripts/
  syndicate/        # Dev.to cross-posting (pluggable adapters)
.github/workflows/
  hugo.yaml         # builds + deploys to GitHub Pages
  syndicate.yml     # cross-posts blog posts to Dev.to
```

## Design system

The look is "Operator": a dark-first, terminal-flavored aesthetic with a deep-teal
accent and monospace chrome over a readable serif body.

- **Dark-first.** The default color scheme is dark (`colorScheme = "dark"` in
  `hugo.toml`). A toggle (in `assets/js/theme.js`) lets visitors switch to light and
  remembers the choice.
- **One token-driven stylesheet.** All colors, spacing, and shape live as CSS custom
  properties in `assets/scss/_tokens.scss`, so light and dark are a single variable
  swap rather than two stylesheets. The SCSS entry point is `assets/scss/main.scss`,
  and the SCSS-variable palette that feeds the tokens is in
  `assets/scss/_variables.scss`.
- **Fonts** (self-hosted in `static/fonts/`, no external CDN): Source Serif 4
  (body), Inter (headings and UI), IBM Plex Mono (metadata and code).
- **Motion** (`assets/js/operator.js`, vanilla JS, no dependencies): the terminal
  boot hero, the cursor-reactive canvas node-field, scroll parallax, a scroll
  progress bar, decrypting section headings, a custom cursor, and reveal-on-scroll.
  Everything degrades gracefully, honors `prefers-reduced-motion`, and never hides
  content when JavaScript is off.
- **Code blocks:** Chroma highlighting wired to the tokens, with light and dark
  folded into `assets/scss/_syntax.scss` (the dark theme is scoped there, since a
  syntax palette cannot be expressed as a single variable swap), plus
  copy-to-clipboard buttons (`assets/js/copy-code.js`).
- **Accessibility:** semantic HTML, visible focus rings, and AA contrast in both
  modes.

## The projects page

`/projects/` is generated from content, not hand-maintained. It collects every page
under the project sections (`cyber-operations`, `web-developments`,
`python-projects`, `classics`, `tools`), sorts them newest-first by year, and
renders a filterable card grid.

- **Categories** come from the top-level section a page lives in. The filter chips
  filter the grid in the browser, and the active filter is reflected in the URL
  (for example `/projects/?filter=web-developments`) so a filtered view is
  shareable. A project page's breadcrumb links back to the grid pre-filtered to its
  category.
- **Each project page** should set:
  - `date` (a year is enough, for example `date = 2024-01-01`): drives the
    newest-first sort and the year label on the card.
  - `tags = ["aws", "iam"]`: shown as chips on the card.
  - `description`: used as the card's subtitle when present.
- The homepage shows the six most recent projects using the same data.

## Writing a blog post

1. Create a post (the slug becomes the URL and the Dev.to canonical URL, so pick it
   carefully):

   ```bash
   hugo new posts/my-post-title.md
   ```

2. Fill in the front matter (see reference below) and write in Markdown.

3. Preview locally with `hugo server -D`. The post appears at
   `http://localhost:1313/blog/my-post-title/`.

4. When ready, set `draft = false`, commit, and push to `main`.

### Front matter reference

Posts use **TOML** front matter (between `+++` fences):

```toml
+++
title = "My Post Title"
date = 2026-07-08T00:00:00-07:00
draft = false                       # true = hidden from the built site

description = "One or two sentences. Used for SEO, blog cards, and Dev.to."
tags = ["aws", "security"]          # site tag pages plus Dev.to tags (max 4)

# slug = "my-post-title"            # optional URL override; avoid changing once live
cover = "/images/posts/cover.png"   # optional; card + header image, and Dev.to cover

# --- Syndication ---
devto = false                       # true = cross-post and keep in sync with Dev.to
# series = "My Series"              # optional Dev.to series grouping
+++
```

Notes:

- **URL and permalink:** posts are served at `/blog/<slug>/`. This is stable and is
  the canonical URL used on Dev.to, so do not rename slugs after publishing.
- **Future dates do not build.** A post dated later than the current time is skipped
  by the build (the deploy does not use `--buildFuture`). If a new post is not
  showing up, check that its `date` is in the past.
- **RSS:** posts are automatically included in both the site feed (`/index.xml`) and
  the blog feed (`/blog/index.xml`).

## Publishing and deploy

- Push to `main`, and **`.github/workflows/hugo.yaml`** builds with Hugo and deploys
  to GitHub Pages via the official Pages Actions. Live at https://rgerjeki.github.io/ .
- The Pages "source" is **GitHub Actions** (Settings, then Pages).

## Dev.to syndication

When a post has `devto = true` and is pushed to `main`, it is published to (or
updated on) Dev.to automatically, with the canonical URL pointing back to this site
so your site remains the canonical source for SEO. Note that it publishes the
article live and public on Dev.to (not as a Dev.to draft).

### One-time setup: the DEV_TO_TOKEN secret

1. On Dev.to: **Settings, then Extensions, then DEV Community API Keys**, and
   generate a key.
2. On GitHub: **Settings, then Secrets and variables, then Actions, then New
   repository secret**.
   - Name: `DEV_TO_TOKEN`
   - Value: the API key

The key is read only inside the Actions runner via `${{ secrets.DEV_TO_TOKEN }}` and
is never written to the repo. If the secret is missing, the workflow logs a warning
and exits cleanly (it does not fail your build).

### How the sync works

- Workflow: **`.github/workflows/syndicate.yml`**, triggered on pushes to `main`
  that touch `content/posts/**` (or run manually via *workflow_dispatch*). It runs
  independently of the Pages deploy and never deploys the site.
- It runs `hugo` to emit `public/syndication.json` (only posts with `devto = true`
  are listed), then `node scripts/syndicate/sync.mjs`.
- **Idempotent, no duplicates.** The adapter lists every article your token owns and
  indexes them by `canonical_url`. A post whose canonical URL already exists is
  updated (`PUT /articles/{id}`); otherwise it is created (`POST /articles`).
  Re-running, or editing and re-pushing a post, updates the same Dev.to article
  instead of creating a new one.

Preview the mapping locally without touching Dev.to. Set the production environment
first (and stop the dev server) so the canonical URL resolves to the real domain
instead of `localhost`:

```bash
HUGO_ENVIRONMENT=production hugo --gc         # writes public/syndication.json
DRY_RUN=1 node scripts/syndicate/sync.mjs     # prints intended create/update actions
```

### Front matter to Dev.to field mapping

| Hugo front matter         | Dev.to (Forem) `article` field | Notes |
| ------------------------- | ------------------------------ | ----- |
| `title`                   | `title`                        | |
| post body (Markdown)      | `body_markdown`                | `<!--more-->` stripped; site-relative links absolutized |
| permalink `/blog/<slug>/` | `canonical_url`                | absolute; makes this site canonical |
| `description`             | `description`                  | |
| `tags`                    | `tags`                         | lowercased, alphanumerics only, max 4 |
| `cover`                   | `main_image`                   | absolutized to a full URL |
| `series`                  | `series`                       | optional |
| (always)                  | `published: true`              | only non-draft posts are ever syndicated |

> Dev.to renders `body_markdown` itself, so posts intended for syndication should
> use plain Markdown (Hugo shortcodes will not render on Dev.to). Inline images that
> use site-relative paths (`/images/...`) are rewritten to absolute URLs
> automatically.

### Adding another platform later

The sync is target-agnostic. To add for example Hashnode:

1. Create `scripts/syndicate/targets/hashnode.mjs` exporting the same interface as
   `devto.mjs`: `name`, `isConfigured()`, `init(ctx)`, `sync(post, ctx)`.
2. Register it in `scripts/syndicate/sync.mjs` (`const TARGETS = [devto, hashnode]`).
3. Opt a post in by adding the target's flag to `layouts/index.syndication.json`
   (for example `hashnode = true` appends `"hashnode"` to that post's `targets`).

No changes to the workflow or the orchestrator logic are needed.
