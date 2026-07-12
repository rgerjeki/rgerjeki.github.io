+++
title = "indict"
date = 2026-07-10
description = "An OSINT indicator enrichment and triage CLI: give it an IP, domain, hash, or URL and it pulls from multiple sources, correlates related infrastructure, and returns a verdict plus a report."
tags = ["osint", "python", "security", "cli"]
authors = ["Reese Gerjekian"]
+++

A command-line OSINT tool that does an analyst's triage in one command: detect the
indicator type, enrich it from several sources, correlate related infrastructure,
and hand back an aggregated verdict with a JSON or Markdown report. Runs with zero
API keys and lights up more sources as you add them.

[Read the write-up](/blog/triaging-an-indicator-in-one-command/)

{{< githubcard repo="rgerjeki/indict" >}}
