+++
title = "Dossier: taking an OSINT investigation from collection to a cited report"
date = 2026-07-13T12:00:00-07:00
draft = false
slug = "dossier"
description = "Most OSINT tooling nails collection but leaves you to assemble a cited report by hand. Dossier is an offline desktop workbench that runs one investigation from collection through curation to a finished, cited PDF or Word document."
tags = ["osint", "python", "security", "forensics"]

cover = "images/dossier.png"

devto = true
+++

Most open-source intelligence tooling is very good at one thing: collection.
Maigret checks a username across hundreds of sites, holehe tells you where an
email is registered, SpiderFoot and Maltego map relationships at scale. What
almost none of them help with is the part that actually eats an investigator's
afternoon: turning a pile of findings into a formatted, cited report where every
fact traces back to where it came from.

That gap is why I built Dossier.

<!--more-->

## The idea: collect, curate, report

Dossier is an offline desktop workbench that runs a single investigation through
one loop:

1. **Collect.** Open a case on a subject (a username, email, name, or file) and
   run automated collectors.
2. **Curate.** The results land in the app and you decide which findings matter.
   This human-judgment step stays inside the tool, because deciding what is
   relevant is the actual work, not something to automate away.
3. **Report.** The findings you kept flow into a report template, you add your
   analysis, and it exports a finished PDF or Word document with the sources
   cited automatically.

The mental model I kept coming back to is "a Word template that also does data
collection." Collection feeds the workbench, the human curates, and the report
writes itself from what was kept.

I made a deliberate choice not to reinvent the collectors. Dossier reuses
best-in-class tools (Maigret, holehe, and others) and puts its own effort into
the part that is genuinely thin for the individual investigator: the cited report
and the provenance behind it.

## What it collects, and what it deliberately does not

The collectors run against public, no-login sources with no API keys: username
presence (Maigret), GitHub and Keybase profiles, email account-existence
(Gravatar, plus holehe when installed), SEC EDGAR filings, CourtListener court
records, and file and photo metadata via ExifTool.

The interesting design constraint is what it refuses to do. Anything behind a
login or an anti-bot wall (Instagram, LinkedIn, X, most people-search and
public-records sites) returns real data only to a real browser. Rather than ship
fragile scrapers that break constantly and violate terms of service, Dossier
generates precise, pre-filled pivot links you open and review by hand. That is
how professional OSINT actually works, and it keeps the tool stable and legal.

Two rules hold the whole thing together:

- **Nothing is faked.** A collector that is blocked, rate limited, or unreachable
  is reported as exactly that. It is never dropped silently or invented, and the
  report never states a conclusion the data does not support.
- **It is passive.** Nothing contacts or notifies a subject.

For a tool whose value is provenance, honest status is not a nice-to-have. It is
the point.

## Reports grounded in real standards

Dossier ships four report templates, and this is where I spent the most care:

- **Full Background Investigation**, modeled on the structure taught in a
  university OSINT course.
- **Missing Person (TraceLabs)**, whose sections mirror the actual TraceLabs
  Search Party CTF scoring categories (Basic and Advanced Subject Info, Day Last
  Seen, Advancing the Timeline, Location, and so on), with their passive-only,
  zero-contact conduct rules built into the template.
- **Company / Entity (KYB)** due diligence, structured around real
  anti-money-laundering practice: the 25% ultimate-beneficial-owner threshold
  from FATF Recommendations 24 and 25 and the US FinCEN rules, plus sanctions,
  PEP, and adverse-media screening.
- **One-page profile** for quick jobs.

I verified the TraceLabs and KYB structures against their real sources rather than
trusting my first draft, and each section records the standard it came from.
Collected findings auto-fill the relevant sections with a numbered,
de-duplicated citation list; sections that need paid or manual records are
scaffolded with an honest note to complete by hand.

## The editor

The report opens as a genuinely editable document. Under the hood it is a single
HTML document rendered in an embedded Chromium view (QtWebEngine), so what you see
is exactly what exports. You can type anywhere, format text, insert and
drag-resize images, and your edits drive both outputs: PDF through Chromium's
print engine (pixel-exact) and Word .docx. As you curate findings, the citations
and findings tables update in place without touching your writing.

Getting there meant throwing away an earlier version built on Qt's rich-text
widget, which quietly drifted the formatting every time you saved and reopened.
Rebuilding the editor on a real browser document fixed that, at the cost of
shipping a full Chromium inside the app.

## Getting it running

Dossier is packaged as a standalone macOS app for Apple Silicon, so you do not
need Python or any setup. Because it embeds Chromium, it is a large download (the
app is about 570MB, the zip around 209MB), which is normal for any
browser-embedding desktop app. It is not yet notarized by Apple, so the first
launch needs a right-click and Open.

I am being upfront about the current limits: it is Apple Silicon only for now (no
Intel, Windows, or Linux builds yet), and email discovery is limited. It enriches
an address you already have rather than finding an arbitrary person's email, which
is genuinely a paid-data problem in OSINT.

## Try it

{{< githubcard repo="rgerjeki/Dossier" >}}

Grab a build from the [releases page](https://github.com/rgerjeki/Dossier/releases).

The engine (the collectors, the finding data model, and the report renderer) is
built and tested with no UI imported, so if you want to read the internals or add
a collector, that is a good place to start.
