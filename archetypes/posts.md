+++
title = "{{ replace .File.ContentBaseName "-" " " | title }}"
date = {{ .Date }}
draft = true

# --- Core metadata (drives the site + Dev.to) --------------------------------
# description: 1–2 sentence summary. Used for SEO, blog cards, and Dev.to's
#              article description.
description = ""

# tags: powers the site tag pages AND Dev.to tags. Dev.to allows a maximum of 4
#       tags and strips them to lowercase alphanumerics — keep them simple.
tags = []

# slug (optional): overrides the URL slug. The permalink is /blog/<slug>/ and is
# used as the Dev.to canonical_url, so avoid changing it once published.
# slug = ""

# cover (optional): path to a cover image under /static, e.g. "/images/posts/x.png".
# Shown on cards and post header, and sent to Dev.to as the cover (main_image).
cover = ""

# --- Syndication -------------------------------------------------------------
# Set devto = true to cross-post (and keep in sync) with Dev.to when this file
# is pushed to main. The canonical URL always points back to this site. The
# sync is idempotent — editing and re-pushing UPDATES the same Dev.to article.
devto = false

# series (optional): groups posts into a Dev.to series.
# series = ""

# toc (optional): set to false to hide the table of contents on this post.
# toc = true
+++

Write your post here in Markdown. The first paragraph makes a good summary.

<!--more-->

The content after the `<!--more-->` marker is the body of the post.
