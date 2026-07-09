+++
title = "A Cursor-Reactive Constellation Background in Plain Canvas"
date = 2026-07-07T00:00:00-07:00
draft = false
slug = "canvas-node-field"
description = "Those animated node fields (drifting points, thin lines between neighbors, the whole web nudged by your cursor) don't need a library. A small HTML and CSS shell, then a walk through the JavaScript that does the work."
tags = ["javascript", "canvas", "webdev"]

cover = "images/Constellation.webp"

devto = true
+++

You've probably seen the effect before: a field of points drifting slowly behind a
hero section, thin lines connecting the ones that happen to be close together, and
the whole web of them leaning gently away from your cursor as you move it. It is
running on [my homepage](https://rgerjeki.github.io/) right now, tucked behind the
terminal, so move your mouse across it and watch the nodes react before you read
on.

Most of the time this effect shows up as part of a heavy animation library. As it
turns out, you do not need one. The browser's canvas API can draw all of it, and
the whole thing fits in a single small JavaScript file. The HTML and CSS are tiny,
so we will get those out of the way first, and then spend the rest of the post
walking through the JavaScript one piece at a time.

<!--more-->

## The HTML and CSS

The markup is a container with two children: a `canvas` for the animation, and a
box for whatever content sits on top of it (your headline, buttons, and so on). The
`<script>` tag goes at the end of the page, with `defer`, so the canvas already
exists in the document by the time the code runs. This is the HTML:

```html
<section class="hero">
  <canvas id="net"></canvas>
  <div class="hero-content">
    <!-- your headline, buttons, whatever goes on top -->
  </div>
</section>

<script src="/js/node-field.js" defer></script>
```

The CSS has one job: put the canvas behind the content and stop it from catching
clicks. We make the section a positioning context, stretch the canvas to fill it
and send it to the back, set `pointer-events` to `none` so clicks pass straight
through to the content, and lift the content one layer up. This is the CSS:

```css
.hero { position: relative; overflow: hidden; }

#net {
  position: absolute;
  inset: 0;               /* fill the hero */
  z-index: 0;             /* sit behind the content */
  pointer-events: none;   /* clicks pass through to the content */
}

.hero-content { position: relative; z-index: 1; }
```

That is the entire layout. Nothing about it changes for the rest of the post, so
from here on everything lives in one file, `node-field.js`, and we will build it up
in order.

## Grabbing the canvas and setting up state

The file opens by getting a reference to the canvas and its 2D drawing context (the
context is the object you issue drawing commands to). It also declares the handful
of values the rest of the file shares.

```js
const canvas = document.querySelector("#net");
const ctx = canvas.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const LINK = 130;

let w, h, nodes = [], running = false, raf;
const mouse = { x: -9999, y: -9999 };
```

A few of these are worth pausing on. `dpr` is the device pixel ratio, which is how
many physical pixels the screen packs into one CSS pixel (2 or 3 on modern
displays); we cap it at 2 because going higher costs performance for very little
visible gain. `LINK` is the single most important number in the file: it is the
distance, in pixels, under which two nodes get a line drawn between them. Then `w`
and `h` will hold the current canvas size, `nodes` holds the points, `running`
tracks whether the loop is active, and `raf` stores the handle from
`requestAnimationFrame` so we can cancel it later. Finally, `mouse` starts far off
in negative space, which keeps the cursor interaction dormant until the pointer
actually moves onto the page.

## Creating the nodes

Each node is nothing more than a position and a small velocity. This function fills
the `nodes` array with them. The count scales with the area of the canvas (so a
phone does not run the same load as a widescreen monitor) and is capped at 90 for a
reason that becomes clear once we reach the loop.

```js
function seed() {
  const count = Math.min(90, Math.round((w * h) / 15000));
  nodes = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
  }));
}
```

Each point gets a random starting position inside the canvas and a random `vx` and
`vy` between roughly -0.15 and 0.15. Those velocities are deliberately tiny, because
the goal is a slow, ambient drift, not motion that pulls the eye off your content.

## Sizing the canvas for sharp lines

A canvas is a bitmap, so if you let CSS stretch it, the browser scales up whatever
you drew and the lines go soft. To keep them crisp, you set the canvas's internal
size to its on-screen size multiplied by `dpr`, then scale the drawing context by
the same amount. After that you can write the rest of the code in ordinary CSS
pixels and forget the ratio exists.

```js
function resize() {
  const rect = canvas.getBoundingClientRect();
  w = rect.width;
  h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seed();
}
```

Notice that `resize` calls `seed` at the end. The dimensions just changed, so we
re-scatter the nodes to fit the new size. That also means this one function doubles
as our startup: call it once and the canvas is both sized and populated.

## The animation loop

This is the heart of the file, and it runs once per animation frame. In order: we
clear the previous frame, then for every node we move it, bounce it off the walls,
push it away from the cursor, connect it to its close neighbors, and draw it.

```js
function frame() {
  ctx.clearRect(0, 0, w, h);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];

    n.x += n.vx;
    n.y += n.vy;
    if (n.x < 0 || n.x > w) n.vx *= -1;
    if (n.y < 0 || n.y > h) n.vy *= -1;

    const dx = n.x - mouse.x, dy = n.y - mouse.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 120 && dist > 0.01) {
      const push = (120 - dist) / 120;
      n.x += (dx / dist) * push;
      n.y += (dy / dist) * push;
    }

    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j];
      const d = Math.hypot(n.x - m.x, n.y - m.y);
      if (d < LINK) {
        ctx.strokeStyle = `rgba(45, 212, 191, ${(1 - d / LINK) * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "rgba(45, 212, 191, 0.8)";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (running) raf = requestAnimationFrame(frame);
}
```

Four things happen inside that loop, so let's take them one at a time.

The movement is the first lines: add each node's velocity to its position, and if
it has drifted past an edge, flip the sign of that velocity so it bounces back
inward. That alone is enough to keep the field alive.

The cursor push comes next. We measure the distance from the node to the mouse
(`Math.hypot` is just the pythagorean distance) and, if the node is within 120
pixels, shove it directly away. The `push` value is 1 right at the cursor and fades
to 0 at the edge of that radius, so nearby nodes move a lot and distant ones barely
stir. The `dist > 0.01` guard avoids dividing by zero on the rare frame where a
node lands exactly under the pointer.

The neighbor links are where the constellation look comes from, and it is one rule:
for every other node closer than `LINK` pixels, draw a line to it. The inner loop
starts at `i + 1` so each pair is visited once. The line's opacity is tied to the
gap between the two nodes (`1 - d / LINK`), so connections fade in as points
approach and fade out as they separate, which gives the web its soft, breathing
quality. This inner loop is also why the node count is capped: comparing every node
against every other is an O(n squared) operation, so at 90 nodes that is about 4,000
cheap distance checks per frame (fine), while a few hundred nodes would start to
spin a fan.

Finally we draw the node itself as a small filled circle, and at the very bottom we
ask the browser to call `frame` again on the next repaint, but only while `running`
is true. That flag is the off switch, which brings us to the last section.

## Starting, stopping, and staying efficient

The wiring at the bottom of the file is the part most tutorials leave out, and it
is the difference between a background that is polite and one that quietly drains a
battery. Left alone, an animation loop runs forever, even while your hero is
scrolled far off the top of the screen or the browser tab sits in the background.

```js
function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
function stop()  { running = false; cancelAnimationFrame(raf); }

window.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
window.addEventListener("resize", resize);

new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()))
  .observe(canvas);
document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

resize();
start();
```

`start` and `stop` are a small latch around the loop. The `mousemove` listener
keeps the shared `mouse` object current, translating the pointer's page coordinates
into coordinates relative to the canvas (that is what subtracting the bounding
rectangle does). The `resize` listener re-runs our sizing function whenever the
window changes.

The two lines that really earn their keep are the `IntersectionObserver` and the
`visibilitychange` handler. The observer watches the canvas and starts the loop when
it scrolls into view, then stops it when it scrolls out, so the animation only runs
while someone can see it. The visibility handler does the same for tab switches.
The final two calls, `resize` then `start`, size the canvas, seed the nodes, and set
everything in motion.

## Two optional refinements

First, respect the `prefers-reduced-motion` setting, since animation behind text is
exactly what it exists to quiet. You only need to change the last line of the file:
check the setting, and if it is on, draw a single static frame instead of looping,
so the reader still gets the constellation, just held still.

```js
resize();
window.matchMedia("(prefers-reduced-motion: reduce)").matches ? frame() : start();
```

Second, if your site has a dark mode, pull the color from a CSS variable instead of
hard-coding the teal, so the field re-tints with the rest of the page. Read it once
near the top of the file:

```js
const accent = getComputedStyle(document.documentElement)
  .getPropertyValue("--accent").trim() || "#2dd4bf";
```

Then parse that value into red, green, and blue components and use them in the two
`rgba()` calls inside `frame`. With a live light/dark toggle, a `MutationObserver`
watching the root element's class can re-read the variable the moment the theme
flips.

## The full node-field.js

Here is the whole file in one piece, ready to save at `/js/node-field.js`:

```js
const canvas = document.querySelector("#net");
const ctx = canvas.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const LINK = 130;

let w, h, nodes = [], running = false, raf;
const mouse = { x: -9999, y: -9999 };

function seed() {
  const count = Math.min(90, Math.round((w * h) / 15000));
  nodes = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
  }));
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  w = rect.width;
  h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seed();
}

function frame() {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    n.x += n.vx; n.y += n.vy;
    if (n.x < 0 || n.x > w) n.vx *= -1;
    if (n.y < 0 || n.y > h) n.vy *= -1;

    const dx = n.x - mouse.x, dy = n.y - mouse.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 120 && dist > 0.01) {
      const push = (120 - dist) / 120;
      n.x += (dx / dist) * push;
      n.y += (dy / dist) * push;
    }

    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j];
      const d = Math.hypot(n.x - m.x, n.y - m.y);
      if (d < LINK) {
        ctx.strokeStyle = `rgba(45, 212, 191, ${(1 - d / LINK) * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "rgba(45, 212, 191, 0.8)";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (running) raf = requestAnimationFrame(frame);
}

function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
function stop()  { running = false; cancelAnimationFrame(raf); }

window.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
window.addEventListener("resize", resize);

new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()))
  .observe(canvas);
document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

resize();
start();
```

Under a hundred lines, no dependencies, and it falls back to a static field (or to
nothing at all if JavaScript is off). If you want to see it in motion, it is on
[my homepage](https://rgerjeki.github.io/), running this exact file behind the
terminal.
