#!/usr/bin/env node
// =============================================================================
// Syndication orchestrator.
//
// Reads the Hugo-generated manifest (public/syndication.json) and pushes each
// opted-in post to every target it names. Targets are pluggable adapters —
// adding a second platform (e.g. Hashnode) means dropping a new file in
// ./targets and registering it in TARGETS below; nothing else changes.
//
// Env:
//   SYNDICATION_FILE  path to the manifest (default: ./public/syndication.json)
//   DRY_RUN=1         print intended actions without calling any API
//   DEV_TO_TOKEN      Dev.to (Forem) API key — required for the devto target
//
// Exit code is non-zero if any post fails, so CI surfaces problems.
// =============================================================================

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import devto from "./targets/devto.mjs";

const TARGETS = [devto]; // register additional adapters here

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

function log(...args) {
  console.log(...args);
}

async function main() {
  const manifestPath =
    process.env.SYNDICATION_FILE ||
    path.resolve(process.cwd(), "public/syndication.json");

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (err) {
    console.error(`Could not read manifest at ${manifestPath}: ${err.message}`);
    console.error("Did you run `hugo` first to generate public/syndication.json?");
    process.exit(1);
  }

  const posts = manifest.posts || [];
  const siteBase = (manifest.site || "").replace(/\/+$/, "");

  if (posts.length === 0) {
    log("No posts opted in to syndication — nothing to do.");
    return;
  }

  log(
    `${DRY_RUN ? "[dry-run] " : ""}Found ${posts.length} post(s) to syndicate.\n`
  );

  // Prepare each enabled adapter once (auth check, prefetch remote index, ...).
  const active = [];
  for (const target of TARGETS) {
    const wanted = posts.some((p) => (p.targets || []).includes(target.name));
    if (!wanted) continue;

    if (!target.isConfigured() && !DRY_RUN) {
      console.error(
        `Target "${target.name}" is requested by a post but is not configured ` +
          `(missing credentials). Skipping it.`
      );
      continue;
    }
    try {
      await target.init({ siteBase, dryRun: DRY_RUN, log });
      active.push(target);
    } catch (err) {
      console.error(`Failed to initialize target "${target.name}": ${err.message}`);
    }
  }

  let failures = 0;

  for (const post of posts) {
    for (const target of active) {
      if (!(post.targets || []).includes(target.name)) continue;
      try {
        const result = await target.sync(post, { siteBase, dryRun: DRY_RUN, log });
        log(`  [${target.name}] ${result.action}: ${post.title} -> ${result.url || "(dry-run)"}`);
      } catch (err) {
        failures += 1;
        console.error(`  [${target.name}] FAILED: ${post.title}\n    ${err.message}`);
      }
    }
  }

  log(`\nDone. ${failures === 0 ? "All posts synced." : `${failures} failure(s).`}`);
  if (failures > 0) process.exit(1);
}

// Only run when executed directly (not when imported for tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
