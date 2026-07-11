+++
title = "Zenith: the real sky above you, right now"
date = 2026-07-10T12:00:00-07:00
draft = false
slug = "zenith"
description = "A browser tab that lowers you from orbit onto your exact spot on Earth and shows your real sky for this exact minute: real stars, computed Sun, Moon, and planets, the live ISS overhead, and AI briefings read aloud. My submission for the Dev.to Weekend Challenge."
tags = ["devchallenge", "weekendchallenge", "googleai", "elevenlabs"]

cover = "images/zenith.png"

# Published to Dev.to manually (it is a challenge submission with Forem embeds and a
# cover set in the DEV editor), so the syndication pipeline is OFF for this one to
# avoid creating a duplicate.
devto = false
+++

*This was my submission for [Weekend Challenge: Passion Edition](https://dev.to/challenges/weekend-2026-07-09).*

## What I Built

The theme was passion, and mine has always been the sky and everything beyond it.
Day or night, there's a specific kind of awe in remembering that the sky isn't a
backdrop. It's real, it's happening right now, and every point of light is an actual
place. Night is simply when you can see the most of it. I wanted to put that feeling
into a browser tab.

<!--more-->

**Zenith** takes your location, cinematically lowers you from orbit down onto your
exact spot on Earth, and becomes a first-person view of *your* real sky, one you can
drag to look around.

Every star is where it actually is. The Sun, the Moon, and the visible planets are
computed for your latitude, longitude, and this exact minute, and placed where they
truly are. It isn't a fixed picture either: the whole sky rotates slowly in real
time, so stars rise and set while you watch.

Tap any object and you *travel* to it. The camera flies out through the real
starfield, the object grows from a point into a detailed close-up, and a short,
grounded briefing appears telling you what you're actually looking at, from where
you're standing, right now. A warm voice reads it to you.

Stay a while and Zenith reminds you that there are people over your head: it shows
how many humans are in space this moment, by name, and draws the real International
Space Station crossing your sky whenever it's above your horizon.

Not information about space. The quiet, enormous wonder of looking up and knowing,
for a moment, exactly what you're looking at.

## Demo

**Live:** https://zenith-rgerjeki.vercel.app

{{< youtube pRHVOVH9KD8 >}}

_A short walkthrough: the descent to your location, dragging the real sky, and flying
to a planet for an AI briefing read aloud in a warm voice._

## Code

[github.com/rgerjeki/Zenith](https://github.com/rgerjeki/Zenith)

## How I Built It

Deliberately lightweight: **Vite + vanilla JavaScript**, no framework, with
**Three.js** for the descent, the interactive sky, and the fly-to-an-object view. The
real astronomy is the heart of it:

- **The stars are real stars.** Around 8,900 naked-eye stars from the HYG database
  (which builds on the Yale Bright Star Catalog), each placed at its true altitude
  and azimuth for your location and moment, tinted by its real color temperature
  (Rigel really is blue; Betelgeuse really is red), drawn as a single GPU point cloud.
- **The sky actually tracks.** The whole celestial sphere rotates about the celestial
  pole at the sidereal rate, and a shader clips anything below the horizon, so stars
  and planets rise and set correctly over time.
- **The Sun, Moon, and planets are computed, not faked**, with
  [astronomy-engine](https://github.com/cosinekitty/astronomy): topocentric
  altitude/azimuth, distance, and the Moon's real phase, all client-side, no key.
- **The ISS is live** from wheretheiss.at (polled every few seconds and smoothly
  dead-reckoned in between); the "humans in space" list comes from Open Notify.

### Google AI (Gemini) writes the briefings

When you tap an object, a Vercel serverless function builds a prompt from that
object's *real, computed* data (its distance in light-years or light-minutes,
direction, brightness, phase) and asks **Google Gemini** for two to four vivid,
grounded sentences, with strict instructions never to invent a number. That's what
turns a dot on a screen into "that steady point, low in the east, is Jupiter, 720
million kilometers away, a silent reminder of the scale of the neighborhood we call
home." The API key stays server-side, and it degrades gracefully: if the model is
busy it falls back to a lighter Gemini model, then to a locally-written line.

### ElevenLabs gives it a voice

Reading is one thing; being *read to* is another. Each briefing is spoken aloud by a
warm voice through **ElevenLabs** (again via a serverless proxy, key server-side).
Because the free tier is small, I added a fallback I'm genuinely proud of: if
ElevenLabs is ever unavailable, narration switches to **Kokoro-82M**, an open-weight
text-to-speech model that runs *entirely in the browser* (WebGPU, with a WASM
fallback). No key, no quota, so the sky always has a voice while ElevenLabs stays the
premium default.

Everything else degrades gracefully too: geolocation falls back to typing a city, and
every external call has a plan B, so it holds together in the real world.

## Prize Categories

- **Best use of Google AI:** Gemini writes every celestial briefing, grounded in each
  object's real computed data (and never allowed to invent numbers).
- **Best use of ElevenLabs:** ElevenLabs narrates the briefings aloud, with an
  open-weight in-browser fallback (Kokoro-82M) so the narration never breaks.

---

Built this weekend, from an empty folder. Thanks for reading, and I hope it gives you
the same small jolt of wonder it gives me. Go outside after, too.
