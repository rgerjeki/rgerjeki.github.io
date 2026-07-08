# rgerjeki.github.io

Personal site and blog of Reese Gerjekian — cybersecurity & AWS cloud. Built with
[Hugo](https://gohugo.io/) (a customized, self-contained fork of the *Coder*
theme), deployed to GitHub Pages, with automatic cross-posting of blog posts to
[Dev.to](https://dev.to/).

---

## Table of contents

- [Local development](#local-development)
- [Project layout](#project-layout)
- [Design system](#design-system)
- [Writing a blog post](#writing-a-blog-post)
  - [Front matter reference](#front-matter-reference)
- [Publishing & deploy](#publishing--deploy)
- [Dev.to syndication](#devto-syndication)
  - [One-time setup: the DEV_TO_TOKEN secret](#one-time-setup-the-dev_to_token-secret)
  - [How the sync works](#how-the-sync-works)
  - [Front-matter → Dev.to field mapping](#front-matter--devto-field-mapping)
  - [Adding another platform later](#adding-another-platform-later)

---

## Local development

You need **Hugo Extended** (the theme compiles SCSS via the built-in libsass, so
the *extended* build is required). The GitHub Pages deploy pins `0.121.0`; any
recent extended release works locally.

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

> `public/` and `resources/` are build output and are **git-ignored** — never
> commit them. CI rebuilds from source on every deploy.

## Project layout

```
content/
  posts/            # ← blog posts live here (this is the /blog/ section)
    _index.md       #   blog index page metadata
  projects.md       # projects hub (unchanged)
  ...               # existing sections: cyber-operations, python-projects, etc.
archetypes/
  posts.md          # template used by `hugo new posts/<slug>.md`
layouts/
  posts/            # blog templates: list.html (index) + single.html (post)
  partials/
    home.html       # home hero + "latest writing"
    post-card.html  # reusable post card (home + blog index)
  index.syndication.json   # emits /syndication.json for the Dev.to workflow
assets/
  scss/             # design system (see below)
  js/copy-code.js   # copy buttons on code blocks
scripts/
  syndicate/        # Dev.to cross-posting (pluggable adapters)
.github/workflows/
  hugo.yaml         # builds + deploys to GitHub Pages (unchanged)
  syndicate.yml     # cross-posts blog posts to Dev.to
```

## Design system

The redesign ("Field Notes × Engineering Log") is an editorial, readability-first
look with monospace metadata/code chrome and a deep-teal accent.

- **Fonts** (self-hosted in `static/fonts/`, no external CDN): Source Serif 4
  (body), Inter (headings/UI), IBM Plex Mono (metadata + code).
- **Tokens**: colors/spacing/shape live as CSS custom properties in
  `assets/scss/_tokens.scss`. **Light + dark mode are a single variable swap** —
  edit the palette there, not scattered across files. SCSS palette values for the
  legacy theme components are in `assets/scss/_variables.scss`.
- **Code blocks**: GitHub light/dark syntax themes wired to the tokens
  (`_syntax.scss` / `_syntax_dark.scss`), with copy-to-clipboard buttons
  (`assets/js/copy-code.js`).
- Accessibility: semantic HTML, visible focus rings, AA contrast in both modes.

## Writing a blog post

1. Create a post (the slug becomes the URL and the Dev.to canonical URL, so pick
   it carefully):

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
date = 2026-07-08T09:00:00-07:00
draft = false                       # true = hidden from the built site

description = "One or two sentences. Used for SEO, blog cards, and Dev.to."
tags = ["aws", "security"]          # site tag pages + Dev.to tags (max 4)

# slug = "my-post-title"            # optional URL override; avoid changing once live
cover = "/images/posts/cover.png"   # optional; card + header image, and Dev.to cover

# --- Syndication ---
devto = false                       # true = cross-post + keep in sync with Dev.to
# series = "My Series"              # optional Dev.to series grouping
# devto_url = ""                    # optional: paste the Dev.to URL after publishing
# toc = true                        # set false to hide the table of contents
+++
```

Notes:

- **URL / permalink**: posts are served at `/blog/<slug>/`. This is stable and is
  the canonical URL used on Dev.to — don't rename slugs after publishing.
- **Scheduling**: a post dated in the future is not built until its date passes
  (the deploy does not use `--buildFuture`).
- **RSS**: posts are automatically included in both the site feed (`/index.xml`)
  and the blog feed (`/blog/index.xml`).

## Publishing & deploy

Deployment is unchanged and fully automatic:

- Push to `main` → **`.github/workflows/hugo.yaml`** builds with Hugo and deploys
  to GitHub Pages via the official Pages Actions. Live at
  https://rgerjeki.github.io/ .
- The Pages "source" is **GitHub Actions** (Settings → Pages).

## Dev.to syndication

When a post has `devto = true` and is pushed to `main`, it is published to (or
updated on) Dev.to automatically, with the canonical URL pointing back to this
site so **your site remains the canonical source** for SEO.

### One-time setup: the DEV_TO_TOKEN secret

1. On Dev.to: **Settings → Extensions → DEV Community API Keys** → generate a key.
2. On GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**.
   - Name: `DEV_TO_TOKEN`
   - Value: *(the API key)*

The key is read only inside the Actions runner via `${{ secrets.DEV_TO_TOKEN }}`
and is never written to the repo. If the secret is missing, the workflow logs a
warning and exits cleanly (it does not fail your build).

### How the sync works

- Workflow: **`.github/workflows/syndicate.yml`**, triggered on pushes to `main`
  that touch `content/posts/**` (or run manually via *workflow_dispatch*). It runs
  **independently of the Pages deploy** and never deploys the site.
- It runs `hugo` to emit `public/syndication.json` (only posts with `devto = true`
  are listed), then `node scripts/syndicate/sync.mjs`.
- **Idempotent — no duplicates.** The adapter lists every article your token owns
  and indexes them by `canonical_url`. A post whose canonical URL already exists is
  **updated** (`PUT /articles/{id}`); otherwise it is **created**
  (`POST /articles`). Re-running, or editing and re-pushing a post, updates the
  same Dev.to article rather than creating a new one.

Test the mapping locally without touching Dev.to:

```bash
hugo --gc                                   # writes public/syndication.json
DRY_RUN=1 node scripts/syndicate/sync.mjs   # prints intended create/update actions
```

### Front matter → Dev.to field mapping

| Hugo front matter        | Dev.to (Forem) `article` field | Notes                                              |
| ------------------------ | ------------------------------ | -------------------------------------------------- |
| `title`                  | `title`                        |                                                    |
| post body (Markdown)     | `body_markdown`                | `<!--more-->` stripped; site-relative links absolutized |
| permalink `/blog/<slug>/`| `canonical_url`                | absolute; makes this site canonical                |
| `description`            | `description`                  |                                                    |
| `tags`                   | `tags`                         | lowercased, alphanumerics only, **max 4**          |
| `cover`                  | `main_image`                   | absolutized to a full URL                          |
| `series`                 | `series`                       | optional                                           |
| (always)                 | `published: true`              | only non-draft posts are ever syndicated           |

> Dev.to renders `body_markdown` itself, so posts intended for syndication should
> use plain Markdown (Hugo shortcodes won't render on Dev.to). Inline images that
> use site-relative paths (`/images/...`) are rewritten to absolute URLs
> automatically.

### Adding another platform later

The sync is target-agnostic. To add e.g. Hashnode:

1. Create `scripts/syndicate/targets/hashnode.mjs` exporting the same interface as
   `devto.mjs`: `name`, `isConfigured()`, `init(ctx)`, `sync(post, ctx)`.
2. Register it in `scripts/syndicate/sync.mjs` (`const TARGETS = [devto, hashnode]`).
3. Opt a post in by adding the target's flag to `layouts/index.syndication.json`
   (e.g. `hashnode = true` → append `"hashnode"` to that post's `targets`).

No changes to the workflow or the orchestrator logic are needed.
