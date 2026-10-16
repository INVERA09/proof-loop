/* The 3D stage for "The offer, taken apart" (Three.js r170, classic build).
   Three scenes share one set of objects: the hero (an unsigned proposal), the pilot (the kit, six
   sheets arriving into an exploded stack, the stack becoming one case study that is clipped to the
   proposal and signed), and the close (the signed proposal). Every position is a function of one
   number, u (screens of scroll into that chapter), so the page can smooth u and the stage just draws.

   Motion is built from keyframe tracks interpolated with monotone cubic curves: velocity stays
   continuous through every keyframe, so nothing stops dead mid-journey (the fault in version 1,
   where each segment eased in and out on its own). Objects only slow where they genuinely settle. */
(() => {
  "use strict";
  const THREE = window.THREE;
  const D = window.PLDocs;
  if (!THREE || !D || !window.THREE_ADDONS) return;

  const W = 2.1, H = 2.97, T = 0.012;
  const K = W / D.PW;                 // world units per page point
  const GROUND = -1.75;
  const FLAT = -Math.PI / 2;
  const L = D.LAYOUT;
  const deg = (d) => (d * Math.PI) / 180;

  // ---------- tracks ----------
  const OBJ = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
  const CAM = { x: 0, y: 0, z: 10, tx: 0, ty: 0, tz: 0, sx: 0, sy: 0 };

  function tangents(t, v) {
    const n = t.length, m = new Array(n).fill(0), d = [];
    for (let i = 0; i < n - 1; i++) d[i] = (v[i + 1] - v[i]) / Math.max(1e-6, t[i + 1] - t[i]);
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
      const h0 = t[i] - t[i - 1], h1 = t[i + 1] - t[i];
      const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);   // Fritsch-Butland: monotone, no overshoot
    }
    return m;
  }
  function track(keys, base = OBJ) {
    let prev = { ...base };
    const full = keys.map(([u, p]) => { prev = { ...prev, ...p }; return [u, prev]; });
    const t = full.map((k) => k[0]);
    const ch = {};
    for (const c of Object.keys(base)) {
      const v = full.map((k) => k[1][c]);
      ch[c] = { v, m: tangents(t, v) };
    }
    return { t, ch, keys: Object.keys(base) };
  }
  function sample(tr, u, out = {}) {
    const t = tr.t, n = t.length;
    let i = 0;
    if (u <= t[0]) { for (const c of tr.keys) out[c] = tr.ch[c].v[0]; return out; }
    if (u >= t[n - 1]) { for (const c of tr.keys) out[c] = tr.ch[c].v[n - 1]; return out; }
    while (i < n - 2 && u > t[i + 1]) i++;
    const h = t[i + 1] - t[i], s = (u - t[i]) / h;
    const s2 = s * s, s3 = s2 * s;
    const a = 2 * s3 - 3 * s2 + 1, b = s3 - 2 * s2 + s, c2 = -2 * s3 + 3 * s2, d = s3 - s2;
    for (const c of tr.keys) {
      const { v, m } = tr.ch[c];
      out[c] = a * v[i] + b * h * m[i] + c2 * v[i + 1] + d * h * m[i + 1];
    }
    return out;
  }
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const win = (u, a, b, f = 0.2) => Math.min(a < 0 ? 1 : smooth((u - a) / f), b === Infinity ? 1 : 1 - smooth((u - (b - f)) / f));

  // ---------- the timelines ----------
  // Hero: the unsigned proposal turns slowly toward you.
  const HERO = {
    prop: track([
      [0, { x: 0, y: 0.12, z: 0, rx: -0.05, ry: -0.4, rz: 0.025 }],
      [1.1, { y: 0.22, z: 0.25, rx: -0.1, ry: -0.13, rz: 0.01 }],
    ]),
    cam: track([
      [0, { x: 0.45, y: 0.5, z: 8.9, tx: 0, ty: 0.08, tz: 0, sx: 0.16, sy: 0 }],
      [1.1, { x: 1.1, y: 0.95, z: 7.9 }],
    ], CAM),
  };

  // Pilot: rest heights for the six sheets in the exploded stack, and when each arrives
  const G = 0.38;                                      // exploded gap
  const BASE_Y = GROUND + 0.03;                        // top of the kit, lying on the ground
  const SPIN = [0.07, 0.035, 0.09, 0.05, 0.085, 0.06]; // small hand-placed spins
  const ARRIVE = (i) => 1.25 + i * 1.2;                // u at which sheet i starts arriving
  const LAND = (i) => ARRIVE(i) + 0.82;

  const PILOT = {
    kit: track([
      [0, { x: 0, y: 0.1, z: 0, rx: -0.1, ry: -0.42, rz: 0.03 }],
      [0.55, { x: 0, y: -0.05, z: 0, rx: -0.42, ry: -0.3, rz: 0.03 }],
      [1.25, { x: 0, y: GROUND + 0.015, z: 0, rx: FLAT, ry: 0, rz: 0.06 }],
      [12.6, {}],
    ]),
    layers: [0, 1, 2, 3, 4, 5].map((i) => {
      const rest = BASE_Y + (i + 1) * G;
      const flatY = BASE_Y + (i + 1) * 0.016;
      const keys = [
        [ARRIVE(i), { x: 4.6, y: rest + 3.1, z: -2.6, rx: FLAT + 0.62, ry: 0.1, rz: SPIN[i] + 0.55 }],
        [ARRIVE(i) + 0.42, { x: 1.15, y: rest + 0.7, z: -0.45, rx: FLAT + 0.14, ry: 0.02, rz: SPIN[i] + 0.14 }],
        [LAND(i), { x: 0, y: rest, z: 0, rx: FLAT, ry: 0, rz: SPIN[i] }],
        [8.45, {}],
        [9.25, { y: flatY, rz: 0.06 }],
      ];
      return track(keys);
    }),
    prop: track([
      [8.9, { x: 3.45, y: -4.9, z: 0.5, rx: 0.4, ry: -0.55, rz: 0.08 }],
      [9.9, { x: 3.45, y: 0.22, z: 0.6, rx: -0.04, ry: -0.24, rz: 0.015 }],
      [12.6, { y: 0.3, ry: -0.13, rx: -0.07 }],
    ]),
    cam: track([
      [0, { x: 0.55, y: 0.45, z: 8.8, tx: 0, ty: 0.0, tz: 0, sx: 0.15, sy: 0 }],
      [1.25, { x: 2.8, y: 4.4, z: 5.55, tx: 0, ty: -1.42, tz: 0 }],
      [4.85, { x: 3.27, y: 4.85, z: 4.85, ty: -0.95 }],
      [8.45, { x: 2.72, y: 5.25, z: 5.36, ty: -0.55 }],
      [9.25, { x: 2.5, y: 4.4, z: 7.0, tx: 0.5, ty: -0.95, tz: 0.1 }],
      [10.05, { x: 4.05, y: 0.95, z: 8.9, tx: 3.45, ty: 0.25, tz: 0.6 }],
      [12.6, { x: 3.75, y: 0.75, z: 7.95, tx: 3.45, ty: 0.3 }],
    ], CAM),
    clip: track([
      [10.25, { y: 3.6, z: 0.05 }],
      [10.62, { y: 0, z: 0 }],
    ]),
    pen: { in: 10.5, write: 10.78, done: 11.42, out: 11.85 },
    // what is left of the stack slides away to the left as the camera turns to the proposal
    aside: track([
      [9.45, { x: 0, z: 0 }],
      [10.4, { x: -7.5, z: -2.2 }],
    ]),
    stamp: { a: 11.45, b: 11.68 },
  };

  const CLOSE = {
    prop: track([
      [0, { x: 0, y: 0.1, z: 0, rx: -0.06, ry: -0.44, rz: 0.03 }],
      [1.0, { y: 0.22, z: 0.2, rx: -0.1, ry: -0.16, rz: 0.012 }],
    ]),
    cam: track([
      [0, { x: 0.3, y: 0.42, z: 8.7, tx: 0, ty: 0.1, tz: 0, sx: 0.17, sy: 0 }],
      [1.0, { x: 1.0, y: 0.9, z: 7.8 }],
    ], CAM),
  };

  // ---------- the scene ----------
  function create(canvas, overlay) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) { return null; }
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new window.THREE_ADDONS.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe4dbcf, 0.7));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.55);
    key.position.set(2.5, 9, 6.5);
    key.target.position.set(1.6, -1.6, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
    key.shadow.radius = 5;
    key.shadow.blurSamples = 12;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    scene.add(key, key.target);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: 0x3d2a20, opacity: 0.2 }));
    ground.rotation.x = FLAT;
    ground.position.y = GROUND;
    ground.receiveShadow = true;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

    // textures and materials
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    function tex(c) {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      return t;
    }
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xE9E3DA, roughness: 0.92 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0xF2EEE8, roughness: 0.94 });
    const darkEdge = new THREE.MeshStandardMaterial({ color: 0x1E1816, roughness: 0.7 });
    const faces = {};
    function face(kind, width) {
      if (!faces[kind]) faces[kind] = new THREE.MeshStandardMaterial({ map: tex(D.make(kind, width)), roughness: kind === "kit" ? 0.62 : 0.86, metalness: 0 });
      return faces[kind];
    }
    function sheet(kind, { thick = T, width = 1024, dark = false } = {}) {
      const e = dark ? darkEdge : edgeMat;
      const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, thick), [e, e, e, e, face(kind, width), dark ? darkEdge : backMat]);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    const local = (x, y, z = T / 2) => new THREE.Vector3(x * K - W / 2, H / 2 - y * K, z);

    // proposal and everything attached to it
    const proposal = new THREE.Group();
    proposal.add(sheet("proposal", { width: 1536 }));
    scene.add(proposal);

    const sigCanvas = D.signatureCanvas(720);
    const sigTex = tex(sigCanvas);
    const sigMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(L.sig.w * K, L.sig.h * K),
      new THREE.MeshStandardMaterial({ map: sigTex, transparent: true, roughness: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    sigMesh.position.copy(local(L.sig.x + L.sig.w / 2, L.sig.y + L.sig.h / 2, T / 2 + 0.0012));
    proposal.add(sigMesh);

    const stampMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(L.stamp.w * K, L.stamp.h * K),
      new THREE.MeshStandardMaterial({ map: tex(D.stampCanvas(560)), transparent: true, roughness: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }),
    );
    stampMesh.position.copy(local(L.stamp.cx, L.stamp.cy, T / 2 + 0.0016));
    stampMesh.rotation.z = deg(-L.stamp.rot);
    proposal.add(stampMesh);

    const MINI = L.slot.w / D.PW;                       // the case study at slot size
    const slotLocal = local(L.slot.x + L.slot.w / 2, L.slot.y + L.slot.h / 2, T / 2 + (T * MINI) / 2 + 0.0008);
    const slotCase = sheet("case");
    slotCase.scale.setScalar(MINI);
    slotCase.position.copy(slotLocal);
    proposal.add(slotCase);

    // paperclip: the outline from version 1 (24 x 60 viewBox), as a polished wire
    const clip = (() => {
      const pts = [];
      const sc = (L.clip.h / 60) * K;
      const P = (x, y) => pts.push(new THREE.Vector3((x - 12) * sc, -(y - 30) * sc, 0));
      for (let y = 50; y >= 12; y -= 2) P(8, y);
      for (let a = 180; a >= 0; a -= 10) P(13 + 5 * Math.cos(deg(a)), 12 - 5 * Math.sin(deg(a)));
      for (let y = 12; y <= 50; y += 2) P(18, y);
      for (let a = 0; a <= 180; a += 10) P(10 + 8 * Math.cos(deg(a)), 50 + 8 * Math.sin(deg(a)));
      for (let y = 50; y >= 16; y -= 2) P(2, y);
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 420, 0.0065, 10, false),
        new THREE.MeshStandardMaterial({ color: 0xC8CCD1, metalness: 1, roughness: 0.26 }),
      );
      mesh.castShadow = true;
      g.add(mesh);
      return g;
    })();
    const clipRest = local(L.clip.x + L.clip.w / 2, L.clip.y + L.clip.h / 2, T / 2 + 0.009);
    clip.position.copy(clipRest);
    proposal.add(clip);

    // the kit and the six sheets
    const kit = sheet("kit", { thick: 0.03, dark: true });
    scene.add(kit);
    const KINDS = ["scope", "consent", "before", "after", "quote", "case"];
    const layers = KINDS.map((k) => { const m = sheet(k); scene.add(m); return m; });
    const flyCase = layers[5];

    // the pen: lacquered barrel, gold band, steel nib; tip at its origin, body along +y
    const pen = (() => {
      const g = new THREE.Group();
      const lathe = (pts, mat) => {
        const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48), mat);
        m.castShadow = true;
        g.add(m);
      };
      const steel = new THREE.MeshStandardMaterial({ color: 0xD9D4CC, metalness: 1, roughness: 0.22 });
      const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x2A201D, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xC9A46A, metalness: 1, roughness: 0.3 });
      lathe([[0, 0], [0.004, 0.006], [0.018, 0.06], [0.029, 0.12], [0.033, 0.15]], steel);
      lathe([[0.033, 0.15], [0.035, 0.31], [0.04, 0.335]], lacquer);
      lathe([[0.04, 0.335], [0.0435, 0.342], [0.0435, 0.388], [0.04, 0.395]], gold);
      lathe([[0.04, 0.395], [0.0445, 0.62], [0.0445, 1.17], [0.04, 1.23], [0.026, 1.275], [0, 1.29]], lacquer);
      scene.add(g);
      return g;
    })();
    const PEN_DIR = new THREE.Vector3(0.44, -0.4, 0.8).normalize();   // in proposal space
    const UP = new THREE.Vector3(0, 1, 0);

    // anchors for the callouts
    const anchor = (parent, x, y) => { const o = new THREE.Object3D(); o.position.copy(local(x, y)); parent.add(o); return o; };
    const slotAnchor = anchor(proposal, L.slot.x + L.slot.w, L.slot.y + L.slot.h * 0.32);
    const stampAnchor = anchor(proposal, L.stamp.cx + L.stamp.w / 2, L.stamp.cy);
    const kitAnchor = anchor(kit, 272, 40);
    const layerAnchors = layers.map((m) => anchor(m, 276, 44));

    // ---------- callouts (HTML labels pinned to points in 3D) ----------
    const CALLOUTS = [
      { act: "hero", at: () => slotAnchor, dx: 170, dy: -70, a: -1, b: 0.98, t: "The missing page", s: "No case study, no reviews, nobody to vouch. This is where deals stall." },
      { act: "pilot", at: () => kitAnchor, a: 0.35, b: 1.3, t: "Free pilot kit", s: "Free. The first pilot costs nothing." },
      ...KINDS.map((k, i) => ({
        act: "pilot", at: () => layerAnchors[i], a: LAND(i) - 0.32, b: ARRIVE(i) + 1.2 + (i === 5 ? 0.05 : 0.02),
        t: ["Pilot scope sheet", "Consent form", "Starting point", "Results capture", "Client quote", "Case study"][i],
        s: ["Free kit and all plans", "Free kit and all plans", "All plans", "All plans", "Sent for you in Automate", "Drafted for you in Automate"][i],
      })),
      { act: "pilot", at: () => slotAnchor, dx: 190, dy: -80, a: 10.35, b: 11.15, t: "Proof attached", s: "The case study, clipped to the proposal." },
      { act: "pilot", at: () => stampAnchor, a: 11.62, b: Infinity, t: "Accepted", s: "Same proposal, same price. Signed." },
      { act: "close", at: () => stampAnchor, a: 0.1, b: Infinity, t: "Signed", s: "With the proof attached." },
    ];
    const coEls = CALLOUTS.map((c) => {
      const el = document.createElement("div");
      el.className = "callout";
      el.innerHTML = `<b></b><span></span>`;
      el.firstChild.textContent = c.t;
      el.lastChild.textContent = c.s;
      overlay.callouts.appendChild(el);
      return { el, o: -1, x: NaN, y: NaN };
    });
    const v3 = new THREE.Vector3();

    // ---------- state ----------
    let w = 1, h = 1, phone = false, dist = 1;
    let sigShown = -1;
    const tmp = {}, camS = {};

    function pose(obj, p) {
      obj.position.set(p.x, p.y, p.z);
      obj.rotation.set(p.rx, p.ry, p.rz);
      obj.scale.setScalar(p.s);
    }
    // Redraws the signature texture only when its visible length changes
    function setSig(t) {
      const q = Math.round(t * 420);
      if (q === sigShown) return;
      sigShown = q;
      D.drawSignature(sigCanvas, q / 420);
      sigTex.needsUpdate = true;
      sigMesh.visible = q > 0;
    }

    // Case study target: where it sits in the slot when the proposal is at its landing pose
    const caseTarget = (() => {
      const g = new THREE.Object3D();
      const p = sample(PILOT.prop, 10.45);
      pose(g, p);
      g.updateMatrixWorld(true);
      const pos = slotLocal.clone().applyMatrix4(g.matrixWorld);
      return { x: pos.x, y: pos.y, z: pos.z, rx: p.rx, ry: p.ry, rz: p.rz, s: MINI };
    })();
    // The flying case study's own track, from the top of the collapsed stack to the slot
    const CASE_FLY = track([
      [9.25, { x: 0, y: BASE_Y + 6 * 0.016, z: 0, rx: FLAT, ry: 0, rz: 0.06, s: 1 }],
      [9.75, { x: 0.9, y: 0.45, z: 0.9, rx: -0.7, ry: -0.15, rz: 0.04, s: 0.78 }],
      [10.45, caseTarget],
    ]);

    function camera3(c, lean) {
      const tx = c.tx, ty = c.ty, tz = c.tz;
      let px = tx + (c.x - tx) * dist, py = ty + (c.y - ty) * dist, pz = tz + (c.z - tz) * dist;
      px += lean.x * 0.32; py += lean.y * 0.2;
      camera.position.set(px, py, pz);
      camera.lookAt(tx, ty, tz);
      camera.updateMatrixWorld();   // so labels and probes use this frame's camera, not the last one
      const sx = phone ? 0 : c.sx, sy = phone ? 0.19 : c.sy;
      camera.setViewOffset(w, h, -sx * w, sy * h, w, h);
    }

    function hideAll() {
      kit.visible = false;
      layers.forEach((m) => { m.visible = false; });
      pen.visible = false;
      proposal.visible = false;
    }

    function apply(act, u, lean) {
      hideAll();
      if (act === "hero") {
        proposal.visible = true;
        pose(proposal, sample(HERO.prop, u, tmp));
        slotCase.visible = false; clip.visible = false; stampMesh.visible = false;
        setSig(0);
        camera3(sample(HERO.cam, u, camS), lean);
      } else if (act === "close") {
        proposal.visible = true;
        pose(proposal, sample(CLOSE.prop, u, tmp));
        slotCase.visible = true; clip.visible = true; clip.position.copy(clipRest);
        stampMesh.visible = true; stampMesh.material.opacity = 1; stampMesh.scale.setScalar(1);
        setSig(1);
        camera3(sample(CLOSE.cam, u, camS), lean);
      } else {
        // kit and the stack
        const aside = sample(PILOT.aside, u, {});
        kit.visible = u < 10.4;
        pose(kit, sample(PILOT.kit, u, tmp));
        kit.position.x += aside.x; kit.position.z += aside.z;
        layers.forEach((m, i) => {
          if (u < ARRIVE(i)) return;
          if (i === 5 && u >= 9.25) return;          // the case study is flying (below)
          m.visible = true;
          pose(m, sample(PILOT.layers[i], u, tmp));
          if (i < 5) { m.position.x += aside.x; m.position.z += aside.z; }
        });
        // the remaining stack is left behind once the camera turns to the proposal
        if (u > 10.4) layers.forEach((m, i) => { if (i < 5) m.visible = false; });

        // the case study flies to the slot, then hands over to the copy inside the proposal
        if (u >= 9.25 && u < 10.45) {
          flyCase.visible = true;
          pose(flyCase, sample(CASE_FLY, u, tmp));
        }
        // the proposal
        const pv = u >= 8.9;
        proposal.visible = pv;
        if (pv) pose(proposal, sample(PILOT.prop, u, tmp));
        slotCase.visible = u >= 10.45;
        // the clip drops on
        clip.visible = u >= 10.25;
        if (clip.visible) {
          const c = sample(PILOT.clip, u, tmp);
          clip.position.set(clipRest.x, clipRest.y + c.y, clipRest.z + c.z);
        }
        // signature and pen
        const P = PILOT.pen;
        const sg = clamp((u - P.write) / (P.done - P.write));
        setSig(sg);
        if (u >= P.in && u < P.out) {
          pen.visible = true;
          proposal.updateMatrixWorld(true);
          const tip = D.signatureTip(sg);
          const tipLocal = local(tip.x, tip.y, T / 2 + 0.002);
          const tipWorld = tipLocal.clone().applyMatrix4(proposal.matrixWorld);
          const dir = PEN_DIR.clone().applyQuaternion(proposal.quaternion);
          // away from the paper before and after writing
          let lift = 0;
          if (u < P.write) lift = 1 - smooth((u - P.in) / (P.write - P.in));
          else if (u > P.done) lift = smooth((u - P.done) / (P.out - P.done));
          const off = dir.clone().multiplyScalar(lift * 2.6).add(new THREE.Vector3(lift * 1.1, -lift * 0.2, 0));
          pen.position.copy(tipWorld).add(off);
          pen.quaternion.setFromUnitVectors(UP, dir);
        }
        // the stamp
        const st = smooth((u - PILOT.stamp.a) / (PILOT.stamp.b - PILOT.stamp.a));
        stampMesh.visible = st > 0;
        stampMesh.material.opacity = st;
        stampMesh.scale.setScalar(1.3 - 0.3 * st);
        camera3(sample(PILOT.cam, u, camS), lean);
      }
      scene.updateMatrixWorld(true);
    }

    function callouts(act, u) {
      let svg = "";
      CALLOUTS.forEach((c, i) => {
        const s = coEls[i];
        const o = c.act === act && !phone ? win(u, c.a, c.b, 0.2) : 0;
        if (o <= 0.004) {
          if (s.o !== 0) { s.el.style.opacity = "0"; s.el.style.visibility = "hidden"; s.o = 0; }
          return;
        }
        v3.setFromMatrixPosition(c.at().matrixWorld).project(camera);
        const ax = (v3.x + 1) / 2 * w, ay = (1 - v3.y) / 2 * h;
        let lx = ax + (c.dx || 54), ly = ay + (c.dy || -58);
        if (lx + 230 > w - 12) lx = w - 242;
        ly = clamp(ly, 70, h - 140);
        s.el.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
        s.el.style.opacity = o.toFixed(3);
        if (s.o === 0 || s.o === -1) s.el.style.visibility = "visible";
        s.o = o;
        svg += `<g opacity="${o.toFixed(3)}"><path d="M${ax.toFixed(1)} ${ay.toFixed(1)} L${(lx - 10).toFixed(1)} ${ly.toFixed(1)} L${lx.toFixed(1)} ${ly.toFixed(1)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="4.5"/><circle class="core" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="1.8"/></g>`;
      });
      overlay.leaders.innerHTML = svg;
    }

    // Quality steps, from sharpest to lightest; the page steps down if frames start to drop
    const QUALITY = [1.75, 1.5, 1.25, 1];
    let qStep = 0, dprIn = 1;
    function quality(step) {
      qStep = Math.max(0, Math.min(QUALITY.length - 1, step));
      renderer.setPixelRatio(Math.min(dprIn, phone ? 2 : QUALITY[qStep]));
      renderer.setSize(w, h, false);
      return qStep;
    }
    function probe(act, u) {
      apply(act, u, { x: 0, y: 0 });
      const ids = { proposal, kit, pen, ...Object.fromEntries(layers.map((m, i) => [KINDS[i], m])) };
      const out = [];
      for (const [id, o] of Object.entries(ids)) {
        if (!o.visible) continue;
        v3.setFromMatrixPosition(o.matrixWorld).project(camera);
        out.push({ id: id === "case" && u >= 10.45 ? "case" : id, x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h });
      }
      if (act === "pilot" && u >= 10.45) { v3.setFromMatrixPosition(slotCase.matrixWorld).project(camera); out.push({ id: "case", x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h }); }
      if (clip.visible && proposal.visible) { v3.setFromMatrixPosition(clip.matrixWorld).project(camera); out.push({ id: "clip", x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h }); }
      return out;
    }

    function resize(width, height, dpr) {
      w = width; h = height;
      phone = w < 760;
      dprIn = dpr;
      const aspect = w / h;
      // wide screens (about 2:1) are the reference; narrower ones pull the camera back so nothing is cut off
      dist = aspect >= 2 ? 1 : aspect >= 1.25 ? Math.pow(2 / aspect, 0.55) : 1.295 * Math.pow(1.25 / aspect, 0.82);
      renderer.setPixelRatio(Math.min(dpr, phone ? 2 : QUALITY[qStep]));
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    function draw(act, u, lean) {
      apply(act, u, lean);
      callouts(act, u);
      renderer.render(scene, camera);
    }

    return { draw, resize, quality, probe, renderer, scene, camera, info: () => renderer.info };
  }

  window.PLStage = { create, HERO_SPAN: 1.1, PILOT_SPAN: 12.6, CLOSE_SPAN: 1.0 };
})();
