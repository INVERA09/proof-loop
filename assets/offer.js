/* The offer, taken apart.
   One fixed 3D stage. Page scroll (in viewport-heights) is the build order: every object,
   word block, callout and parts-list tick is keyed to a position on that one track. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const mqFine = matchMedia("(hover: hover) and (pointer: fine)");
  const mqPhone = matchMedia("(max-width: 760px)");

  // ---------- The track ----------
  const WAYPOINTS = [
    ["hero", 0.6], ["tension", 1.0], ["turn", 0.9], ["asm1", 1.1], ["asm2", 1.0],
    ["asm3", 1.1], ["peak", 2.0], ["loop", 1.1], ["tiers", 1.3], ["close", 0.7],
  ];
  const WP = {};
  let T = 0;
  for (const [id, len] of WAYPOINTS) { WP[id] = { start: T, end: T + len }; T += len; }
  // Where each waypoint is fully settled: used by the parts list and by reduced motion.
  const REST = { hero: 0.3, tension: 1.38, turn: 2.32, asm1: 3.42, asm2: 4.42, asm3: 5.48,
                 peak: 7.48, loop: 8.66, tiers: 9.9, close: T };

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const mix = (a, b, t) => a + (b - a) * t;

  // ---------- Keyframe tracks ----------
  const BASE = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1 };
  function track(frames) {
    let prev = { ...BASE };
    return frames.map(([v, p]) => { prev = { ...prev, ...p }; return [v, prev]; });
  }
  function sample(tr, v) {
    if (v <= tr[0][0]) return tr[0][1];
    for (let i = 1; i < tr.length; i++) {
      const [v1, p1] = tr[i];
      if (v <= v1) {
        const [v0, p0] = tr[i - 1];
        const t = easeIO((v - v0) / (v1 - v0 || 1));
        const out = {};
        for (const k in p1) out[k] = mix(p0[k], p1[k], t);
        return out;
      }
    }
    return tr[tr.length - 1][1];
  }

  const ISO = { rx: 58, ry: 0, rz: -36 };

  const TRACKS = {
    proposal: track([
      [0,     { x: 0, y: 4, z: 0, rx: 7, ry: -17, rz: 1.5, s: 1, o: 1 }],
      [0.6,   { y: 0, rx: 6, ry: -13 }],
      [1.05,  { x: -40, y: -4, z: -170, rx: 9, ry: -20, rz: 2 }],
      [1.6,   { x: -44, y: -8, z: -200, ry: -23 }],
      [2.15,  { x: 80, y: -80, z: -900, rx: 14, ry: -30, o: 0 }],
      [5.95,  { x: 0, y: -30, z: -700, rx: 0, ry: 0, rz: 0, s: 1, o: 0 }],
      [6.4,   { x: 0, y: 0, z: 0, o: 1 }],
      [7.75,  {}],
      [8.15,  { x: -136, y: 10, z: -180, rx: 4, ry: 20, rz: -2, s: 0.84 }],
      [8.8,   { x: -142, y: 12, z: -200 }],
      [9.1,   { y: 90, z: -480, o: 0 }],
      [10.1,  { x: -10, y: 24, z: -300, rx: 6, ry: -11, rz: 1, s: 1, o: 0 }],
      [10.5,  { x: 0, y: 0, z: 0, o: 1 }],
    ]),
    cert: track([
      [0.55, { x: 232, y: -196, z: 60, rx: 10, ry: -24, rz: 6, s: 0.96, o: 0 }],
      [0.92, { x: 170, y: -160, z: 60, rx: 8, ry: -20, rz: 4, s: 1, o: 1 }],
      [1.55, { x: 174, y: -164 }],
      [1.92, { x: 260, y: 260, z: -60, rx: 40, rz: 20, o: 0 }],
    ]),
    reviews: track([
      [0.62, { x: 222, y: 204, z: 90, rx: 6, ry: -18, rz: -4, s: 0.96, o: 0 }],
      [1.0,  { x: 164, y: 168, z: 90, rx: 4, ry: -16, rz: -3, s: 1, o: 1 }],
      [1.55, { x: 168, y: 172 }],
      [1.92, { x: 250, y: 420, z: 0, rx: 40, rz: -14, o: 0 }],
    ]),
    kit: track([
      [1.8,  { x: 0, y: 150, z: 60, rx: 28, ry: -6, rz: 6, s: 0.92, o: 0 }],
      [2.2,  { x: 0, y: 0, z: 60, rx: 10, ry: -14, rz: 2, s: 1, o: 1 }],
      [2.5,  { x: -4, y: -4, ry: -16 }],
      [2.85, { x: 0, y: -40, z: -140, ...ISO, s: 0.85, o: 0 }],
    ]),
    stack: track([
      [2.45, { x: 0, y: 34, z: 0, ...ISO, s: 1, o: 1 }],
      [5.6,  { y: 22, rx: 55, rz: -31 }],
      [6.05, { x: 0, y: 0, z: 110, rx: 0, ry: 0, rz: 0, s: 0.92 }],
      [6.22, {}],
      [6.62, { x: -75, y: 75, z: 2, s: 0.35333 }],
    ]),
    pile1: track([
      [7.85, { x: 420, y: 40, z: -140, rx: 4, ry: -20, rz: 12, s: 0.8, o: 0 }],
      [8.2,  { x: 130, y: -10, z: -140, rx: 4, ry: -16, rz: 2, o: 1 }],
      [8.8,  {}],
      [9.1,  { y: 50, o: 0 }],
    ]),
    pile2: track([
      [7.98, { x: 440, y: 50, z: -70, rx: 4, ry: -20, rz: 12, s: 0.8, o: 0 }],
      [8.33, { x: 148, y: 4, z: -70, rx: 4, ry: -16, rz: 5, o: 1 }],
      [8.8,  {}],
      [9.1,  { y: 62, o: 0 }],
    ]),
    pile3: track([
      [8.1,  { x: 460, y: 60, z: 0, rx: 4, ry: -20, rz: 14, s: 0.8, o: 0 }],
      [8.45, { x: 166, y: 18, z: 0, rx: 4, ry: -16, rz: 8, o: 1 }],
      [8.8,  {}],
      [9.1,  { y: 74, o: 0 }],
    ]),
    referral: track([
      [8.3,  { x: 40, y: 330, z: 160, rx: 10, ry: -8, rz: -4, s: 0.96, o: 0 }],
      [8.62, { x: 22, y: 176, z: 160, rx: 8, ry: -6, rz: -3, s: 1, o: 1 }],
      [8.8,  {}],
      [9.05, { y: 226, z: 120, o: 0 }],
    ]),
    tiers: track([
      [8.85,  { x: 0, y: 70, z: 0, ...ISO, s: 1, o: 1 }],
      [9.3,   { y: 26 }],
      [9.75,  { y: 6, rz: -32 }],
      [10.3,  { y: -30, rz: -30 }],
    ]),
  };

  // Phone composition: the same story, pulled in so nothing leaves a 390px screen
  const PHONE = {
    cert: track([
      [0.55, { x: 120, y: -215, z: 60, rx: 10, ry: -24, rz: 6, s: 0.82, o: 0 }],
      [0.92, { x: 92, y: -178, z: 60, rx: 8, ry: -20, rz: 4, s: 0.86, o: 1 }],
      [1.55, { x: 94, y: -180 }],
      [1.92, { x: 140, y: 240, z: -60, rx: 40, rz: 20, o: 0 }],
    ]),
    reviews: track([
      [0.62, { x: 110, y: 205, z: 90, rx: 6, ry: -18, rz: -4, s: 0.86, o: 0 }],
      [1.0,  { x: 84, y: 172, z: 90, rx: 4, ry: -16, rz: -3, s: 0.9, o: 1 }],
      [1.55, { x: 86, y: 174 }],
      [1.92, { x: 120, y: 420, z: 0, rx: 40, rz: -14, o: 0 }],
    ]),
    proposal: track(TRACKS.proposal.map(([v, p]) => [v, v >= 8.15 && v <= 9.1 ? { ...p, x: v === 8.15 ? -74 : -78 } : p])),
    pile1: track([
      [7.85, { x: 260, y: 40, z: -140, rx: 4, ry: -20, rz: 12, s: 0.72, o: 0 }],
      [8.2,  { x: 58, y: -10, z: -140, rx: 4, ry: -16, rz: 2, o: 1 }],
      [8.8,  {}],
      [9.1,  { y: 50, o: 0 }],
    ]),
    pile2: track([
      [7.98, { x: 270, y: 50, z: -70, rx: 4, ry: -20, rz: 12, s: 0.72, o: 0 }],
      [8.33, { x: 76, y: 4, z: -70, rx: 4, ry: -16, rz: 5, o: 1 }],
      [8.8,  {}],
      [9.1,  { y: 62, o: 0 }],
    ]),
    pile3: track([
      [8.1,  { x: 280, y: 60, z: 0, rx: 4, ry: -20, rz: 14, s: 0.72, o: 0 }],
      [8.45, { x: 94, y: 18, z: 0, rx: 4, ry: -16, rz: 8, o: 1 }],
      [8.8,  {}],
      [9.1,  { y: 74, o: 0 }],
    ]),
    stack: track(TRACKS.stack.map(([v, p]) => [v, v < 5.7 ? { ...p, y: p.y - 26 } : p])),
    referral: track([
      [8.3,  { x: 20, y: 300, z: 160, rx: 10, ry: -8, rz: -4, s: 0.9, o: 0 }],
      [8.62, { x: 8, y: 150, z: 160, rx: 8, ry: -6, rz: -3, s: 0.92, o: 1 }],
      [8.8,  {}],
      [9.05, { y: 196, z: 120, o: 0 }],
    ]),
  };
  const trackFor = (key) => (phone && PHONE[key]) || TRACKS[key];

  // Layers of the exploded stack: local depth and arrival window
  const LAYERS = [
    ["l-scope", 2.55, 2.95], ["l-consent", 2.95, 3.35], ["l-before", 3.65, 4.0],
    ["l-after", 4.0, 4.35], ["l-quote", 4.7, 5.05], ["l-case", 5.05, 5.4],
  ].map(([id, a, b], i) => {
    const dz = (i - 2.5) * 46;
    const thin = (i - 2.5) * 1.0;
    return {
      el: document.getElementById(id),
      tr: track([
        [a,    { x: 0, y: 0, z: dz + 320, rz: 7, s: 1, o: 0 }],
        [b,    { z: dz, rz: 0, o: 1 }],
        [5.7,  {}],
        [6.05, { z: thin }],
      ]),
    };
  });

  const PLATES = [
    ["p-1", 8.85, 9.2, -140, -24],
    ["p-2", 8.92, 9.27, 0, 0],
    ["p-3", 9.0, 9.34, 140, 24],
  ].map(([id, a, b, zOpen, zShut]) => ({
    el: document.getElementById(id),
    tr: track([
      [a,     { z: zShut, o: 0 }],
      [b,     { o: 1 }],
      [9.75,  { z: zOpen }],
      [9.98,  {}],
      [10.14, { o: 0 }],
    ]),
  }));

  // Word blocks: [in, out]
  const COPY_WIN = {
    hero: [-1, 0.62], tension: [0.62, 1.62], turn: [1.62, 2.55], asm1: [2.55, 3.62],
    asm2: [3.62, 4.62], asm3: [4.62, 5.7], peakA: [5.7, 6.45], peakB: [6.45, 7.72],
    loop: [7.72, 8.82], tiers: [8.82, 10.08], close: [10.08, Infinity],
  };

  // When each part of the offer has arrived
  const PART_AT = { kit: 2.0, scope: 2.85, consent: 3.25, before: 3.95, after: 4.3,
                    quote: 5.0, case: 5.35, referral: 8.55, call: 9.5 };

  // ---------- Elements ----------
  const objs = {
    proposal: $("#o-proposal"), cert: $("#o-cert"), reviews: $("#o-reviews"), kit: $("#o-kit"),
    stack: $("#o-stack"), pile1: $("#o-pile1"), pile2: $("#o-pile2"), pile3: $("#o-pile3"),
    referral: $("#o-ref"), tiers: $("#o-tiers"),
  };
  const tilt = $(".world__tilt");
  const slotEmpty = $(".slot__empty");
  const slotDoc = $(".slot__doc");
  const clipEl = $("#o-proposal .clip");
  const stamp = $(".stamp");
  const sigPath = $(".signature path");
  const sigLen = sigPath.getTotalLength();
  sigPath.style.strokeDasharray = `${sigLen}`;

  const copyBlocks = $$(".copy__block").map((el) => ({ el, win: COPY_WIN[el.dataset.copy] }));
  const labels = $$(".label").map((el) => {
    const [a, b] = el.dataset.win.split(" ").map(Number);
    return { el, a, b, anchor: document.querySelector(`[data-anchor="${el.dataset.for}"]`), h: 0, o: 0 };
  });
  const leaders = $(".leaders");
  const partBtns = $$(".parts__list button");
  const doneCount = $("[data-parts-done]");
  const header = $(".site-header");
  const spacer = $(".spacer");
  const partsNav = $("#parts");
  const partsToggle = $(".parts-toggle");

  // ---------- Measurements ----------
  let u = 1, vh = innerHeight, vw = innerWidth, phone = mqPhone.matches;
  function measure() {
    vw = innerWidth;
    phone = mqPhone.matches;
    u = phone ? Math.min(vw / 450, innerHeight / 1050) : Math.min(vw / 1280, innerHeight / 700);
    for (const l of labels) l.h = l.el.offsetHeight;
  }
  function sizeSpacer(force) {
    // Ignore small height changes from a phone's collapsing toolbar
    if (!force && Math.abs(innerHeight - vh) < 120 && innerWidth === vw) return;
    vh = innerHeight;
    spacer.style.height = `${Math.round((T + 1) * vh)}px`;
  }

  const tf = (p) =>
    `translate3d(${(p.x * u).toFixed(2)}px, ${(p.y * u).toFixed(2)}px, ${(p.z * u).toFixed(2)}px) ` +
    `rotateX(${p.rx.toFixed(3)}deg) rotateY(${p.ry.toFixed(3)}deg) rotateZ(${p.rz.toFixed(3)}deg) scale(${p.s.toFixed(4)})`;

  function place(el, p, withOpacity = true) {
    el.style.transform = tf(p);
    if (withOpacity) {
      const o = p.o < 0.003 ? 0 : p.o > 0.997 ? 1 : p.o;
      el.style.opacity = String(o);
      el.style.visibility = o === 0 ? "hidden" : "visible";
    }
  }

  // ---------- Render one position on the track ----------
  function render(v) {
    // Objects
    for (const key of ["proposal", "cert", "reviews", "kit", "pile1", "pile2", "pile3", "referral"]) {
      place(objs[key], sample(trackFor(key), v));
    }

    // Stack group: never fade a preserve-3d group (it would flatten); show or hide only
    const sp = sample(trackFor("stack"), v);
    place(objs.stack, sp, false);
    const stackOn = v >= 2.45 && v < 6.62;
    objs.stack.style.opacity = stackOn ? "1" : "0";
    objs.stack.style.visibility = stackOn ? "visible" : "hidden";
    for (const L of LAYERS) place(L.el, sample(L.tr, v));

    // Tier plates: the group stays opaque; each plate fades its own faces through --po
    const tp = sample(TRACKS.tiers, v);
    place(objs.tiers, tp, false);
    const tiersOn = v > 8.8 && v < 10.16;
    objs.tiers.style.opacity = tiersOn ? "1" : "0";
    objs.tiers.style.visibility = tiersOn ? "visible" : "hidden";
    for (const P of PLATES) {
      const pp = sample(P.tr, v);
      P.el.style.transform = `translate3d(0, 0, ${(pp.z * u).toFixed(2)}px)`;
      P.el.style.setProperty("--po", pp.o.toFixed(3));
    }

    // The signing
    const attached = v >= 6.62;
    slotDoc.style.opacity = attached ? "1" : "0";
    slotEmpty.style.opacity = attached ? "0" : "1";
    const c = smooth((v - 6.58) / 0.14);
    clipEl.style.opacity = String(c);
    clipEl.style.transform = `translateY(${((1 - c) * -8 * u).toFixed(2)}px)`;
    const sg = clamp((v - 6.78) / 0.4);
    sigPath.style.strokeDashoffset = String(sigLen * (1 - sg));
    sigPath.style.opacity = sg > 0 ? "1" : "0";
    const st = smooth((v - 7.2) / 0.15);
    stamp.style.opacity = String(st);
    stamp.style.transform = `rotate(-11deg) scale(${(1.35 - 0.35 * st).toFixed(3)})`;

    // Words
    for (const b of copyBlocks) {
      const [a, z] = b.win;
      const inT = a < 0 ? 1 : smooth((v - (a - 0.02)) / 0.18);
      const outT = z === Infinity ? 1 : 1 - smooth((v - (z - 0.12)) / 0.1);
      const o = Math.min(inT, outT);
      const dy = (1 - inT) * 18 - (1 - outT) * 12;
      b.el.style.opacity = o < 0.003 ? "0" : String(o);
      b.el.classList.toggle("is-live", o > 0.02);
      b.el.style.transform = phone ? `translateY(${dy.toFixed(1)}px)` : `translateY(calc(-50% + ${dy.toFixed(1)}px))`;
    }

    // Callouts and leader lines
    renderLabels(v);

    // Parts list
    let done = 0;
    let now = null;
    for (const btn of partBtns) {
      const at = PART_AT[btn.dataset.part];
      const isDone = v >= at;
      if (isDone) { done++; if (v < at + 1.1) now = btn; }
      btn.classList.toggle("is-done", isDone);
    }
    for (const btn of partBtns) btn.classList.toggle("is-now", btn === now);
    doneCount.textContent = String(done);
  }

  function labelOpacity(l, v) {
    const inT = l.a < 0 ? 1 : smooth((v - l.a) / 0.16);
    const outT = 1 - smooth((v - (l.b - 0.16)) / 0.16);
    return Math.min(inT, outT);
  }

  function renderLabels(v) {
    let svg = "";
    const live = [];
    for (const l of labels) {
      l.o = labelOpacity(l, v);
      if (l.o > 0.01 && l.anchor) live.push(l);
    }

    if (phone) {
      // One callout at a time, under the words; the anchor gets a dot
      let pick = null;
      for (const l of live) if (!pick || l.a > pick.a) pick = l;
      let copyBottom = vh * 0.62;
      let best = 0;
      for (const b of copyBlocks) {
        const o = Number(b.el.style.opacity || 0);
        if (o > best) { best = o; copyBottom = b.el.getBoundingClientRect().bottom; }
      }
      for (const l of labels) {
        const on = l === pick;
        l.el.style.opacity = on ? String(l.o) : "0";
        l.el.style.visibility = on ? "visible" : "hidden";
        l.el.classList.toggle("is-live", on);
        l.el.style.transform = `translateY(${Math.round(copyBottom + 18)}px)`;
      }
      if (pick) {
        const r = pick.anchor.getBoundingClientRect();
        const ax = r.left + r.width / 2, ay = r.top + r.height / 2;
        svg += `<g opacity="${pick.o.toFixed(3)}"><circle class="dot" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="5"/><circle class="core" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2"/></g>`;
      }
      leaders.innerHTML = svg;
      return;
    }

    // Desktop: stack the live labels in the right column near their anchors
    const pts = live.map((l) => {
      const r = l.anchor.getBoundingClientRect();
      return { l, ax: r.left + r.width / 2, ay: r.top + r.height / 2 };
    }).sort((p, q) => p.ay - q.ay);

    const top = 76, bottom = vh - 70, gap = 18;
    let cursor = top;
    for (const p of pts) {
      p.y = Math.max(p.ay - 12, cursor);
      cursor = p.y + p.l.h + gap;
    }
    const overflow = cursor - gap - bottom;
    if (overflow > 0) {
      for (let i = pts.length - 1, limit = bottom; i >= 0; i--) {
        const p = pts[i];
        p.y = Math.min(p.y, limit - p.l.h);
        limit = p.y - gap;
      }
      for (const p of pts) p.y = Math.max(p.y, top);
    }

    const lx = labels[0] ? labels[0].el.getBoundingClientRect().left : vw * 0.785;
    for (const l of labels) {
      if (!live.includes(l)) {
        l.el.style.opacity = "0";
        l.el.style.visibility = "hidden";
        l.el.classList.remove("is-live");
      }
    }
    for (const p of pts) {
      const { l, ax, ay, y } = p;
      l.el.style.opacity = String(l.o);
      l.el.style.visibility = "visible";
      l.el.classList.add("is-live");
      l.el.style.transform = `translateY(${y.toFixed(1)}px)`;
      const kx = lx - 26;
      const d = `M${ax.toFixed(1)} ${ay.toFixed(1)} L${kx.toFixed(1)} ${y.toFixed(1)} L${lx.toFixed(1)} ${y.toFixed(1)}`;
      svg += `<g opacity="${l.o.toFixed(3)}"><path d="${d}"/><circle class="dot" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="4.5"/><circle class="core" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="1.8"/></g>`;
    }
    leaders.innerHTML = svg;
  }

  // ---------- Pointer: the world leans a little toward the visitor ----------
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener("pointermove", (e) => {
    if (!mqFine.matches || mqReduce.matches) return;
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  // ---------- Loop ----------
  let cur = scrollY / innerHeight;
  let last = NaN, lastTilt = "";
  function restFor(v) {
    for (const [id] of WAYPOINTS) if (v < WP[id].end) return REST[id];
    return REST.close;
  }
  let frozen = null;
  function frame() {
    const target = clamp(scrollY / vh, 0, T);
    if (frozen !== null) {
      cur = frozen;
    } else if (mqReduce.matches) {
      cur = restFor(target);
    } else {
      cur += (target - cur) * 0.14;
      if (Math.abs(target - cur) < 0.0004) cur = target;
    }
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    const tiltT = `rotateY(${(cx * 3.2).toFixed(3)}deg) rotateX(${(-cy * 2.2).toFixed(3)}deg)`;
    if (cur !== last || tiltT !== lastTilt) {
      tilt.style.transform = tiltT;
      render(cur);
      last = cur;
      lastTilt = tiltT;
    }
    header.classList.toggle("is-scrolled", scrollY > 8);
    requestAnimationFrame(frame);
  }

  // ---------- Parts list: jump to a part ----------
  function go(id) {
    const y = Math.round(REST[id] * vh);
    scrollTo({ top: y, behavior: mqReduce.matches ? "auto" : "smooth" });
  }
  for (const btn of partBtns) {
    btn.addEventListener("click", () => {
      go(btn.dataset.go);
      if (phone) closeParts();
    });
  }
  function openParts() { partsNav.classList.add("is-open"); partsToggle.setAttribute("aria-expanded", "true"); }
  function closeParts() { partsNav.classList.remove("is-open"); partsToggle.setAttribute("aria-expanded", "false"); }
  partsToggle.addEventListener("click", () => {
    partsNav.classList.contains("is-open") ? closeParts() : openParts();
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeParts(); });
  addEventListener("click", (e) => {
    if (!partsNav.classList.contains("is-open")) return;
    if (!partsNav.contains(e.target) && !partsToggle.contains(e.target)) closeParts();
  });

  // ---------- Start ----------
  function relayout() { measure(); sizeSpacer(false); last = NaN; }
  addEventListener("resize", relayout);
  mqPhone.addEventListener("change", () => { measure(); sizeSpacer(true); last = NaN; });
  mqReduce.addEventListener("change", () => { last = NaN; });

  measure();
  sizeSpacer(true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); last = NaN; });

  // Test hook: render an exact position without waiting for the lerp
  // Test hook: hold the stage at an exact track position (the page also scrolls there,
  // so the parts list and anything scroll-based agree), or release it.
  window.__offer = {
    T, WP, REST,
    hold(v) { frozen = v; scrollTo(0, Math.round(v * vh)); cur = v; last = NaN; render(v); last = v; },
    release() { frozen = null; last = NaN; },
  };

  requestAnimationFrame(frame);
})();
