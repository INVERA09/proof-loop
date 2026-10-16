/* The offer, taken apart (version 2): the scroll engine and everything that is not 3D.

   Smoothness, in order of what mattered (measured on version 1 with tools/jumps.mjs):
   1. One smoothed scroll position. A critically damped spring, integrated against the clock (not
      per frame), follows the real scroll: mouse-wheel steps become one continuous motion and the
      speed never jumps. Large jumps (a menu click) arrive instead of flying through every scene.
   2. Overlays fade over about a quarter of a screen of scroll, so no change happens inside one
      wheel click, and every overlay has a fixed place: nothing is pushed around by a neighbour.
   3. The 3D canvas lives inside the pinned part of whichever 3D chapter is on screen, so it
      enters, pins and leaves with the page natively (no script trying to keep up with scrolling).
   4. Only transform and opacity change per frame; the 3D view redraws only when something moved. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const mqFine = matchMedia("(hover: hover) and (pointer: fine)");
  const mqPhone = matchMedia("(max-width: 760px)");

  const bar = $("[data-bar]");
  const stageEl = $(".stage");
  const overlay = { leaders: $(".stage__leaders"), callouts: $(".stage__callouts") };

  // ---------- chapters ----------
  const acts = $$("[data-act]").map((el) => ({
    el, name: el.dataset.act, span: Number(el.dataset.span), pin: $(".act__pin", el),
    top: 0, height: 0, u: 0,
    wins: $$("[data-win]", el).map((w) => {
      const [a, b] = w.dataset.win.split(" ").map((s) => (s === "Infinity" ? Infinity : Number(s)));
      return { el: w, a, b, o: -1, dy: NaN };
    }),
  }));
  acts.forEach((a) => a.el.style.setProperty("--span", a.span));
  const ACT = Object.fromEntries(acts.map((a) => [a.name, a]));

  const swap = { el: $("[data-swap]"), top: 0, height: 0, idx: -1 };
  swap.steps = $$("[data-swap-step]", swap.el);
  swap.screens = $$("[data-screen]", swap.el);
  const loop = { el: $("[data-loop]"), top: 0, height: 0, p: -1 };
  loop.draw = $(".ring__draw", loop.el);
  loop.nodes = $$(".ring__nodes li", loop.el).map((el) => ({ el, at: Number(el.dataset.at), on: null }));
  loop.says = $$("[data-say]", loop.el).map((el) => ({ el, at: Number(el.dataset.say) }));
  const darks = $$(".sheet--dark").map((el) => ({ el, top: 0, bottom: 0 }));
  const nav = $$("[data-nav]").map((a) => ({ a, target: $(a.getAttribute("href")), top: 0 }));
  const railBtns = $$(".rail button");

  // In the pilot: when each of the six parts is done, and the windows the rail highlights
  const STEP_WIN = [0, 1, 2, 3, 4, 5].map((i) => [1.25 + i * 1.2, 2.45 + i * 1.2]);
  const STEP_DONE = [0, 1, 2, 3, 4, 5].map((i) => 1.25 + i * 1.2 + 0.6);

  // Reduced motion: every beat shows one settled frame, no travel in between
  const RESTS = {
    hero: [[-Infinity, 0]],
    pilot: [[-Infinity, 0.5], [1.25, 2.2], [2.45, 3.4], [3.65, 4.6], [4.85, 5.8], [6.05, 7.0], [7.25, 8.2], [8.45, 9.3], [9.5, 10.7], [11.05, 12.2]],
    close: [[-Infinity, 0.9]],
  };
  const rest = (name, u) => { let r = 0; for (const [a, v] of RESTS[name]) if (u >= a) r = v; return r; };

  // ---------- measuring ----------
  let vh = innerHeight, vw = innerWidth;
  const pageTop = (el) => el.getBoundingClientRect().top + scrollY;
  function measure() {
    vh = innerHeight; vw = innerWidth;
    for (const a of acts) { a.top = pageTop(a.el); a.height = a.el.offsetHeight; }
    swap.top = pageTop(swap.el); swap.height = swap.el.offsetHeight;
    loop.top = pageTop(loop.el); loop.height = loop.el.offsetHeight;
    for (const d of darks) { d.top = pageTop(d.el); d.bottom = d.top + d.el.offsetHeight; }
    for (const n of nav) n.top = n.target ? pageTop(n.target) : Infinity;
    if (gl) gl.resize(vw, vh, devicePixelRatio || 1);
    dirty = true;
  }

  // ---------- the smoothed scroll position ----------
  const OMEGA = 12.5;                   // spring stiffness: settles in about a third of a second
  let y = scrollY, vy = 0;
  function follow(dt) {
    const target = scrollY;
    if (mqReduce.matches || Math.abs(target - y) > vh * 2.5) { y = target; vy = 0; return; }
    const e = y - target, w = OMEGA, ex = Math.exp(-w * dt);
    const c = vy + w * e;
    y = target + (e + c * dt) * ex;
    vy = (vy - w * c * dt) * ex;
    if (Math.abs(y - target) < 0.04 && Math.abs(vy) < 0.4) { y = target; vy = 0; }
  }

  // ---------- the 3D stage ----------
  let gl = null, dirty = true, lastKey = "", current = null;
  function startStage() {
    if (!window.PLStage || !window.PLDocs) return fail();
    window.PLDocs.ready.then(() => {
      try { gl = window.PLStage.create($(".stage__canvas"), overlay); } catch (e) { gl = null; console.error(e); }
      if (!gl) return fail();
      gl.renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fail(); });
      measure();
    });
  }
  function fail() {
    document.body.classList.add("nogl-mode");
    $(".nogl").hidden = false;
    stageEl.classList.add("is-off");
  }

  // pointer lean: the scene turns very slightly toward the visitor
  let tx = 0, ty = 0, lx = 0, ly = 0;
  addEventListener("pointermove", (e) => {
    if (!mqFine.matches || mqReduce.matches) return;
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });

  // ---------- overlays ----------
  const F = 0.24;   // fade length, in screens of scroll
  function winOpacity(u, a, b) {
    const i = a === -1 ? 1 : smooth((u - a) / F);
    const o = b === Infinity ? 1 : 1 - smooth((u - (b - F)) / F);
    return [Math.min(i, o), i, o];
  }
  function paintWins(act) {
    const u = act.u;
    for (const w of act.wins) {
      const [o, i, out] = winOpacity(u, w.a, w.b);
      const dy = (1 - i) * 16 - (1 - out) * 12;
      const oq = o < 0.004 ? 0 : o > 0.996 ? 1 : Math.round(o * 1000) / 1000;
      if (oq !== w.o) {
        w.el.style.opacity = String(oq);
        if ((oq > 0) !== (w.o > 0)) w.el.classList.toggle("is-live", oq > 0);
        w.o = oq;
      }
      const dq = Math.round(dy * 10) / 10;
      if (dq !== w.dy) { w.el.style.translate = `0 ${dq}px`; w.dy = dq; }
    }
  }

  function paintRail(u) {
    railBtns.forEach((b, i) => {
      let done, now;
      if (i < 6) { done = u >= STEP_DONE[i]; now = u >= STEP_WIN[i][0] && u < STEP_WIN[i][1]; }
      else { done = u >= 11.6; now = u >= 8.45; }
      b.classList.toggle("is-done", done);
      b.classList.toggle("is-now", now);
      if (now) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
  }

  function paintSwap(ny) {
    const p = clamp((ny - swap.top + vh * 0.15) / Math.max(1, swap.height - vh));
    const idx = Math.min(swap.screens.length - 1, Math.floor(p * swap.screens.length));
    if (idx === swap.idx) return;
    swap.idx = idx;
    swap.steps.forEach((s, i) => s.classList.toggle("is-now", i === idx));
    swap.screens.forEach((s, i) => s.classList.toggle("is-on", i === idx));
  }

  function paintLoop(sy) {
    const p = clamp((sy - loop.top) / Math.max(1, loop.height - vh));
    const pq = Math.round(p * 1000) / 1000;
    if (pq === loop.p) return;
    loop.p = pq;
    loop.draw.style.strokeDashoffset = String(1 - clamp(p / 0.9));
    for (const n of loop.nodes) {
      const on = p >= n.at;
      if (on !== n.on) { n.el.classList.toggle("is-on", on); n.on = on; }
    }
    let pick = loop.says[0];
    for (const s of loop.says) if (p >= s.at) pick = s;
    for (const s of loop.says) s.el.classList.toggle("is-on", s === pick);
  }

  let navNow = null, barDark = null;
  function paintChrome(ny) {
    let pick = null;
    for (const n of nav) if (ny + vh * 0.35 >= n.top) pick = n;
    if (pick !== navNow) {
      nav.forEach((n) => (n === pick ? n.a.setAttribute("aria-current", "true") : n.a.removeAttribute("aria-current")));
      navNow = pick;
    }
    const mid = ny + 26;
    const dark = darks.some((d) => mid >= d.top && mid < d.bottom);
    if (dark !== barDark) { bar.classList.toggle("is-dark", dark); barDark = dark; }
  }

  // ---------- quality watch ----------
  // Counts drawn frames that took longer than about 1.5 frames at 60 fps. A run of them means the
  // graphics card is struggling, so the 3D view drops one resolution step (never below 1x).
  let slow = 0, qStep = 0, cooldown = 0;
  function watchFrame(dt) {
    if (cooldown > 0) { cooldown--; return; }
    if (dt > 0.026) slow += 2; else slow = Math.max(0, slow - 1);
    if (slow > 24 && qStep < 3) { qStep = gl.quality(qStep + 1); slow = 0; cooldown = 90; dirty = true; }
  }

  // ---------- the frame ----------
  let frozen = null, lastT = 0;
  function frame(t) {
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 1 / 60);
    lastT = t;
    follow(dt);

    const k = 1 - Math.exp(-dt * 5);
    lx += (tx - lx) * k; ly += (ty - ly) * k;

    const ny = scrollY;
    // which 3D chapter owns the canvas: the one covering most of the screen
    let active = null, best = 0;
    for (const a of acts) {
      const ov = Math.min(ny + vh, a.top + a.height) - Math.max(ny, a.top);
      if (ov > best) { best = ov; active = a; }
    }
    if (active !== current) {
      current = active;
      if (active) { active.pin.prepend(stageEl); stageEl.classList.remove("is-off"); }
      else stageEl.classList.add("is-off");
      dirty = true;
    }

    for (const a of acts) {
      let u = clamp((y - a.top) / vh, 0, a.span);
      if (frozen && frozen.name === a.name) u = frozen.u;
      else if (mqReduce.matches) u = rest(a.name, u);
      a.u = u;
      if (ny + vh > a.top - vh && ny < a.top + a.height + vh) paintWins(a);
    }
    if (ACT.pilot) paintRail(ACT.pilot.u);
    paintSwap(ny);
    paintLoop(frozen && frozen.loop != null ? loop.top + frozen.loop * (loop.height - vh) : y);
    paintChrome(ny);

    if (gl && current) {
      const lean = mqReduce.matches || mqPhone.matches ? { x: 0, y: 0 } : { x: lx, y: ly };
      const key = `${current.name}|${current.u.toFixed(4)}|${lean.x.toFixed(3)}|${lean.y.toFixed(3)}`;
      if (dirty || key !== lastKey) {
        gl.draw(current.name, current.u, lean);
        lastKey = key;
        dirty = false;
        watchFrame(dt);
      } else slow = Math.max(0, slow - 1);
    }
    requestAnimationFrame(frame);
  }

  // ---------- controls ----------
  railBtns.forEach((b) => b.addEventListener("click", () => {
    const a = ACT.pilot;
    scrollTo({ top: Math.round(a.top + Number(b.dataset.jump) * vh), behavior: mqReduce.matches ? "auto" : "smooth" });
  }));

  // Sheets rise once as they come into view
  const rise = $$("[data-rise]");
  if ("IntersectionObserver" in window && !mqReduce.matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });
    rise.forEach((el) => io.observe(el));
  } else rise.forEach((el) => el.classList.add("is-in"));

  // ---------- start ----------
  let resizeT = 0;
  addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(measure, 80); });
  addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ("ResizeObserver" in window) new ResizeObserver(() => measure()).observe(document.body);
  mqReduce.addEventListener("change", () => { dirty = true; });

  measure();
  startStage();
  requestAnimationFrame(frame);

  // Test hooks: hold a chapter at an exact position (the page scrolls there too), or release it
  window.__offer2 = {
    acts: () => acts.map((a) => ({ name: a.name, top: a.top, height: a.height, span: a.span })),
    hold(name, u) {
      const a = ACT[name];
      frozen = { name, u };
      scrollTo(0, Math.round(a.top + clamp(u, 0, a.span) * vh));
      y = scrollY; vy = 0; dirty = true;
    },
    holdLoop(p) { frozen = { name: null, loop: p }; scrollTo(0, Math.round(loop.top + p * (loop.height - vh))); y = scrollY; dirty = true; },
    release() { frozen = null; dirty = true; },
    ready: () => !!gl,
    probe(name, u) { const a = ACT[name]; return gl ? gl.probe(name, clamp(u, 0, a.span)) : []; },
    quality: () => qStep,
    u: (name) => ACT[name].u,
    glInfo: () => (gl ? gl.info().render : null),
  };
})();
