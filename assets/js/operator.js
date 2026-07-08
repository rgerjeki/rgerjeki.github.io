// =============================================================================
// Operator homepage motion — dependency-free, progressive enhancement.
//   1. Terminal boot: types the intro commands + outputs.
//   2. Canvas node-field behind the hero, reacting to the cursor.
//   3. Reveal-on-scroll via IntersectionObserver.
//   4. Custom cursor + magnetic buttons (fine-pointer desktops only).
// Everything degrades gracefully and honours prefers-reduced-motion.
// =============================================================================
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  var sleep = function (ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  };

  // ---------------------------------------------------------------------------
  // 1. Terminal boot
  // ---------------------------------------------------------------------------
  function typeInto(el, text, speed) {
    return new Promise(function (res) {
      var i = 0;
      (function step() {
        el.textContent = text.slice(0, i);
        if (i++ < text.length) setTimeout(step, speed + Math.random() * 45);
        else res();
      })();
    });
  }

  async function bootTerminal(term) {
    var lines = Array.prototype.slice.call(term.querySelectorAll("[data-line]"));
    var outs = Array.prototype.slice.call(term.querySelectorAll("[data-out]"));
    if (!lines.length) return;

    term.classList.add("is-typing");
    lines.forEach(function (l) { l.setAttribute("data-typed", "false"); });
    outs.forEach(function (o) { o.setAttribute("data-typed", "false"); });

    var cmds = lines.map(function (l) {
      var span = l.querySelector("[data-cmd]");
      var full = span ? span.textContent : "";
      if (span) span.textContent = "";
      return { span: span, text: full };
    });

    await sleep(320);
    for (var i = 0; i < lines.length; i++) {
      lines[i].setAttribute("data-typed", "true");
      if (cmds[i].span) await typeInto(cmds[i].span, cmds[i].text, 34);
      await sleep(170);
      if (outs[i]) outs[i].setAttribute("data-typed", "true");
      await sleep(380);
    }
    term.classList.remove("is-typing");
  }

  // ---------------------------------------------------------------------------
  // 2. Canvas node-field
  // ---------------------------------------------------------------------------
  function hexToRgb(hex) {
    hex = (hex || "").trim().replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    if (isNaN(n) || hex.length !== 6) return { r: 45, g: 212, b: 191 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function accentRgb() {
    var v = getComputedStyle(document.documentElement).getPropertyValue("--accent");
    return hexToRgb(v);
  }

  function initNet(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, nodes = [], color = accentRgb();
    var mouse = { x: -9999, y: -9999 };
    var running = false, raf = null;
    var LINK = 132;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.max(24, Math.min(90, Math.floor((w * h) / 15000)));
      nodes = [];
      for (var i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      var c = color;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        var dxm = n.x - mouse.x, dym = n.y - mouse.y;
        var dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < 120 && dm > 0.01) {
          var push = (120 - dm) / 120 * 0.9;
          n.x += (dxm / dm) * push;
          n.y += (dym / dm) * push;
        }

        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var dx = n.x - m.x, dy = n.y - m.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + (1 - d / LINK) * 0.22 + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }

        if (dm < 170) {
          ctx.strokeStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + (1 - dm / 170) * 0.4 + ")";
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.7)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (running) raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
      resize();
      var c = color;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var dx = n.x - m.x, dy = n.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + (1 - d / LINK) * 0.18 + ")";
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.6)";
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    function start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

    window.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    window.addEventListener("mouseout", function () { mouse.x = -9999; mouse.y = -9999; });

    var ro = window.ResizeObserver ? new ResizeObserver(function () {
      resize(); if (reduce) drawStatic();
    }) : null;
    if (ro) ro.observe(canvas); else window.addEventListener("resize", resize);

    // Refresh accent when the theme is toggled.
    new MutationObserver(function () { color = accentRgb(); if (reduce) drawStatic(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Only animate while the hero is on screen.
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.isIntersecting ? start() : stop(); });
      }, { threshold: 0.01 }).observe(canvas);
    }

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });

    resize();
    if (reduce) drawStatic(); else start();
  }

  // ---------------------------------------------------------------------------
  // 3. Reveal on scroll
  // ---------------------------------------------------------------------------
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (reduce || !window.IntersectionObserver) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  // ---------------------------------------------------------------------------
  // 4. Custom cursor + magnetic buttons
  // ---------------------------------------------------------------------------
  function initCursor() {
    if (!finePointer || reduce) return;
    var dot = document.createElement("div");
    dot.className = "op-cursor";
    document.body.appendChild(dot);
    document.body.classList.add("op-has-cursor");

    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    var cx = x, cy = y;
    window.addEventListener("mousemove", function (e) { x = e.clientX; y = e.clientY; });
    (function loop() {
      cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
      dot.style.left = cx + "px";
      dot.style.top = cy + "px";
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll("a, button, .op-magnet, input, textarea").forEach(function (el) {
      el.addEventListener("mouseenter", function () { dot.classList.add("is-active"); });
      el.addEventListener("mouseleave", function () { dot.classList.remove("is-active"); });
    });
  }

  function initMagnets() {
    if (!finePointer || reduce) return;
    document.querySelectorAll(".op-magnet").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + dx * 0.28 + "px," + dy * 0.4 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Scroll — hero parallax + fade, driven by requestAnimationFrame.
  // ---------------------------------------------------------------------------
  function initParallax() {
    if (reduce) return;
    var hero = document.querySelector("[data-hero]");
    if (!hero) return;
    var inner = hero.querySelector(".op-hero-inner");
    var net = hero.querySelector(".op-net");
    var grid = hero.querySelector(".op-grid");
    var cue = hero.querySelector(".op-scrollcue");
    var ticking = false;

    function update() {
      var y = window.pageYOffset;
      var vh = window.innerHeight || 1;
      var p = Math.min(y / vh, 1);
      if (inner) {
        inner.style.transform = "translateY(" + y * 0.22 + "px)";
        inner.style.opacity = String(1 - p * 0.92);
      }
      if (net) net.style.transform = "translateY(" + y * 0.12 + "px)";
      if (grid) grid.style.transform = "translateY(" + y * 0.05 + "px)";
      if (cue) cue.style.opacity = String(Math.max(0, 1 - p * 2.4));
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // 6. Scroll-progress accent line at the top of the viewport.
  function initProgress() {
    var bar = document.createElement("div");
    bar.className = "op-progress";
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var st = window.pageYOffset;
      var sh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      bar.style.transform = "scaleX(" + (sh > 0 ? st / sh : 0) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  // 7. "Decrypt" scramble on headings as they enter the viewport.
  function initScramble() {
    var els = document.querySelectorAll("[data-scramble]");
    if (!els.length || reduce || !window.IntersectionObserver) return;
    var glyphs = "!<>-_\\/[]{}=+*^?#01x";

    function scramble(el) {
      var text = el.getAttribute("data-scramble-text");
      if (text === null) { text = el.textContent; el.setAttribute("data-scramble-text", text); }
      var len = text.length, frame = 0;
      (function run() {
        var out = "", done = 0;
        for (var i = 0; i < len; i++) {
          if (text[i] === " ") { out += " "; done++; continue; }
          if (frame > i * 1.7 + 6) { out += text[i]; done++; }
          else out += glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        el.textContent = out;
        frame++;
        if (done < len) requestAnimationFrame(run);
        else el.textContent = text;
      })();
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { scramble(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---------------------------------------------------------------------------
  ready(function () {
    var term = document.querySelector("[data-term]");
    if (term && !reduce) bootTerminal(term);

    var net = document.querySelector("[data-net]");
    if (net) initNet(net);

    initReveal();
    initCursor();
    initMagnets();
    initParallax();
    initProgress();
    initScramble();
  });
})();
