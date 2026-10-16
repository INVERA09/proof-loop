/* Proof Loop documents, drawn onto canvases that become the faces of the 3D sheets.
   Every sheet is laid out in "points" on a 300 x 424 page (A4 proportions); a canvas of any
   width draws the same page sharper. Content matches version 1 of the page, with one fix: the
   proposal is now for a different buyer (Northgate Physiotherapy), because the case study that
   gets clipped to it comes from the pilot with Harbour Street Physio. */
(() => {
  "use strict";

  const PW = 300, PH = 424;
  const C = {
    sheetTop: "#FFFFFF", sheetBottom: "#F7F5F1",
    ink: "#221C19", soft: "#62574F", faint: "#8C8078",
    line: "#D8D0C5", lineSoft: "#E7E1D8",
    paper2: "#EEEAE3", paper3: "#E4DED5",
    accent: "#9B2C2C", accentDeep: "#7C2020", wash: "#F4E6E3",
    espresso: "#2A221F", espresso2: "#352B27", onDark: "#F3EDE6", onDarkSoft: "#BCAFA5",
  };
  const DISPLAY = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
  const TEXT = '"Geist", "Segoe UI", system-ui, sans-serif';

  const LOGO = new Path2D("M12 21.5V11a4 4 0 0 1 8 0v11a6 6 0 0 1-12 0V12.5");
  const SIG_PATH = "M3 30c6-1 9-12 13-20 3-6 7-6 6 1-1 8-6 17-3 18 4 1 7-13 11-13 3 0 1 9 4 9 4 0 6-11 10-11 3 0 2 7 5 7 5 0 8-15 13-15 4 0 0 13 4 13 6 0 9-6 14-6 4 0 3 4 7 3 6-1 12-7 21-7";
  const CONSENT_SIG = "M4 28c8-2 10-16 16-16 5 0-3 18 2 18 6 0 8-14 14-14 4 0 1 10 6 10s9-9 14-9c4 0 2 6 7 6 7 0 13-6 22-6";

  // Where things sit on the proposal page, in points. The 3D stage reads these.
  const LAYOUT = {
    page: { w: PW, h: PH },
    slot: { x: 22, y: 212, w: 106, h: 150 },
    sig: { x: 142, y: 302, w: 120, h: 40 },     // signature box (viewBox 120 x 40)
    stamp: { cx: 228, cy: 280, w: 70, h: 30, rot: -9 },
    clip: { x: 32, y: 197, w: 12, h: 30 },
  };

  // ---------- fonts ----------
  const FONT_SPECS = [
    `400 20px ${TEXT}`, `500 20px ${TEXT}`, `600 20px ${TEXT}`, `700 20px ${TEXT}`,
    `600 20px ${DISPLAY}`, `700 20px ${DISPLAY}`, `800 20px ${DISPLAY}`,
  ];
  const ready = (document.fonts && document.fonts.load)
    ? Promise.all(FONT_SPECS.map((f) => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready)
    : Promise.resolve();

  // ---------- a tiny page painter in points ----------
  function painter(canvas) {
    const ctx = canvas.getContext("2d");
    const S = canvas.width / PW;
    const P = {
      ctx, S,
      font(size, weight = 400, family = TEXT, track = 0) {
        ctx.font = `${weight} ${size * S}px ${family}`;
        ctx.letterSpacing = `${(track * size * S).toFixed(2)}px`;
      },
      text(str, x, y, o = {}) {
        P.font(o.size || 9, o.weight || 400, o.family || TEXT, o.track || 0);
        ctx.fillStyle = o.color || C.ink;
        ctx.textAlign = o.align || "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(o.upper ? str.toUpperCase() : str, x * S, y * S);
        return ctx.measureText(o.upper ? str.toUpperCase() : str).width / S;
      },
      width(str, o = {}) {
        P.font(o.size || 9, o.weight || 400, o.family || TEXT, o.track || 0);
        return ctx.measureText(o.upper ? str.toUpperCase() : str).width / S;
      },
      // Wrapped text; returns the baseline of the last line
      para(str, x, y, maxW, o = {}) {
        const words = str.split(" ");
        const lh = (o.lh || 1.3) * (o.size || 9);
        let line = "", by = y;
        const lines = [];
        for (const w of words) {
          const t = line ? `${line} ${w}` : w;
          if (P.width(t, o) > maxW && line) { lines.push(line); line = w; } else line = t;
        }
        if (line) lines.push(line);
        lines.forEach((l, i) => { by = y + i * lh; P.text(l, x, by, o); });
        return by;
      },
      rect(x, y, w, h, fill, r = 0) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(x * S, y * S, w * S, h * S, r * S);
        ctx.fill();
      },
      hline(x, y, w, color = C.lineSoft, t = 0.7) {
        ctx.fillStyle = color;
        ctx.fillRect(x * S, (y - t / 2) * S, w * S, Math.max(1, t * S));
      },
      logo(x, y, size, color = C.accent, width = 3) {
        ctx.save();
        ctx.translate(x * S, y * S);
        ctx.scale((size / 32) * S, (size / 32) * S);
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
        ctx.stroke(LOGO);
        ctx.restore();
      },
      svgStroke(d, x, y, sx, sy, color, width) {
        ctx.save();
        ctx.translate(x * S, y * S);
        ctx.scale(sx * S, sy * S);
        ctx.strokeStyle = color; ctx.lineWidth = width / sx; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.stroke(new Path2D(d));
        ctx.restore();
      },
    };
    return P;
  }

  // Paper with a faint grain so large flat areas do not look like plastic
  function paper(P, dark = false) {
    const { ctx, S } = P;
    const g = ctx.createLinearGradient(0, 0, 0, PH * S);
    if (dark) { g.addColorStop(0, "#332925"); g.addColorStop(1, "#241D1A"); }
    else { g.addColorStop(0, C.sheetTop); g.addColorStop(0.7, "#FCFBF8"); g.addColorStop(1, C.sheetBottom); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW * S, PH * S);
    let seed = dark ? 7 : 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = Math.round(PW * PH * 0.18);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = dark ? `rgba(255,255,255,${0.012 + rnd() * 0.02})` : `rgba(90,70,55,${0.01 + rnd() * 0.018})`;
      ctx.fillRect(rnd() * PW * S, rnd() * PH * S, S * 0.6, S * 0.6);
    }
  }

  function head(P, label, tag, mono) {
    const y = 31;
    if (mono) {
      P.rect(22, 22.5, 13, 13, C.espresso, 6.5);
      P.text(mono, 28.5, 31.2, { size: 5.5, weight: 700, color: "#fff", align: "center", track: 0.02 });
      P.text(label, 40, y, { size: 7.5, weight: 600, color: C.soft, upper: true, track: 0.06 });
    } else {
      P.logo(21.5, 23, 11, C.accent, 3);
      P.text(label, 36, y, { size: 7.5, weight: 600, color: C.soft, upper: true, track: 0.06 });
    }
    const tw = P.width(tag, { size: 6.5, weight: 600, upper: true, track: 0.08 });
    P.rect(PW - 22 - tw - 10, 23.5, tw + 10, 11, C.paper2, 2);
    P.text(tag, PW - 22 - 5, 31.4, { size: 6.5, weight: 600, color: C.soft, upper: true, track: 0.08, align: "right" });
    P.hline(22, 41, PW - 44);
  }
  function foot(P, left, right) {
    P.text(left, 22, PH - 16, { size: 7, color: C.faint, track: 0.04 });
    P.text(right, PW - 22, PH - 16, { size: 7, color: C.faint, track: 0.04, align: "right" });
  }
  function kicker(P, str, y, color = C.accent) { P.text(str, 22, y, { size: 7.5, weight: 700, color, upper: true, track: 0.1 }); }
  function title(P, str, y, size = 19, color = C.ink) {
    return P.para(str, 22, y, PW - 44, { size, weight: 800, family: DISPLAY, color, track: -0.025, lh: 1.08 });
  }
  function rows(P, list, y) {
    for (const [a, b] of list) {
      y += 17;
      P.text(a, 22, y, { size: 8.5, color: C.soft });
      P.text(b, PW - 22, y, { size: 8.5, weight: 600, color: C.ink, align: "right" });
      y += 7;
      P.hline(22, y, PW - 44, C.lineSoft, 0.6);
    }
    return y;
  }
  function lines(P, n, y, x = 22, w = PW - 44) {
    for (let i = 1; i <= n; i++) {
      const lw = i % 4 === 0 ? 0.64 : i % 3 === 0 ? 0.82 : 1;
      P.rect(x, y, w * lw, 3.2, C.paper3, 1.6);
      y += 8.7;
    }
    return y;
  }
  function big(P, value, unit, y, color = C.ink, size = 40) {
    const w = P.text(value, 22, y, { size, weight: 800, family: DISPLAY, color, track: -0.04 });
    P.text(unit, 22 + w + 3, y, { size: size * 0.35, weight: 700, family: DISPLAY, color: C.soft, track: -0.01 });
  }
  function label(P, str, y, x = 22, color = C.soft) { P.text(str, x, y, { size: 7.5, weight: 600, color, upper: true, track: 0.08 }); }
  function check(P, str, y) {
    const { ctx, S } = P;
    P.rect(22, y - 9, 11, 11, C.accent, 2);
    ctx.save();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4 * S; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(25 * S, (y - 3.6) * S); ctx.lineTo(27 * S, (y - 1.6) * S); ctx.lineTo(30.4 * S, (y - 5.6) * S); ctx.stroke();
    ctx.restore();
    P.text(str, 40, y, { size: 9, color: C.ink });
  }
  function quote(P, str, y, size = 17, maxW = PW - 44) {
    const q = `“${str}”`;
    return P.para(q, 22, y, maxW, { size, weight: 600, family: DISPLAY, color: C.ink, track: -0.02, lh: 1.22 });
  }

  // ---------- the documents ----------
  const DOCS = {
    proposal(P) {
      paper(P);
      head(P, "Sam Rivera · Operations", "Sample", "SR");
      kicker(P, "Proposal", 60);
      let y = title(P, "Customer follow-up system", 82);
      P.text("Prepared for Northgate Physiotherapy", 22, y + 15, { size: 8.5, color: C.soft });
      rows(P, [["Timeline", "Six weeks"], ["Fee", "$4,800 + GST"]], y + 22);

      // the empty slot where proof should go
      const s = LAYOUT.slot;
      const { ctx, S } = P;
      ctx.save();
      ctx.beginPath(); ctx.roundRect(s.x * S, s.y * S, s.w * S, s.h * S, 3 * S); ctx.clip();
      ctx.fillStyle = "rgba(155,44,44,0.03)"; ctx.fillRect(s.x * S, s.y * S, s.w * S, s.h * S);
      ctx.strokeStyle = "rgba(155,44,44,0.07)"; ctx.lineWidth = 5 * S;
      for (let k = -s.h; k < s.w + s.h; k += 10) { ctx.beginPath(); ctx.moveTo((s.x + k) * S, s.y * S); ctx.lineTo((s.x + k - s.h) * S, (s.y + s.h) * S); ctx.stroke(); }
      ctx.restore();
      ctx.save();
      ctx.setLineDash([3 * S, 2.4 * S]); ctx.strokeStyle = "rgba(155,44,44,0.6)"; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.roundRect((s.x + 0.5) * S, (s.y + 0.5) * S, (s.w - 1) * S, (s.h - 1) * S, 3 * S); ctx.stroke();
      ctx.restore();
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2 - 8;
      ctx.save(); ctx.strokeStyle = "rgba(155,44,44,0.65)"; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.arc(cx * S, cy * S, 8 * S, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      P.rect(cx - 3.5, cy - 0.5, 7, 1, C.accent); P.rect(cx - 0.5, cy - 3.5, 1, 7, C.accent);
      P.text("No proof attached", cx, cy + 22, { size: 7.5, weight: 600, color: C.accent, upper: true, track: 0.04, align: "center" });

      // the side column
      label(P, "Attached proof", 222, 142);
      lines(P, 5, 230, 142, 136);
      P.hline(142, 349, 136, C.faint, 0.75);
      P.text("Client signature", 142, 358, { size: 7, color: C.soft, upper: true, track: 0.06 });
      foot(P, "Page 1 of 1", "SR-0142");
    },

    kit(P) {
      paper(P, true);
      P.logo(21.5, 24, 13, "#D06A5E", 3);
      P.text("Proof Loop", 40, 34, { size: 8, weight: 600, color: C.onDarkSoft, upper: true, track: 0.16 });
      P.rect(PW - 22 - 34, 24, 34, 13, "rgba(255,255,255,0.08)", 3);
      P.text("Free", PW - 22 - 17, 33, { size: 7, weight: 700, color: C.onDark, upper: true, track: 0.1, align: "center" });
      const y = P.para("Free pilot kit", 22, 150, 220, { size: 44, weight: 800, family: DISPLAY, color: C.onDark, track: -0.035, lh: 0.98 });
      P.para("Everything for one small pilot, run properly and written down properly.", 22, y + 26, 220, { size: 10, color: C.onDarkSoft, lh: 1.45 });
      const items = ["Pilot plan", "Consent form", "Case study template", "Two-week pilot guide"];
      let ly = 286;
      for (const it of items) {
        P.rect(22, ly - 5.5, 5, 5, "#D06A5E", 2.5);
        P.text(it, 34, ly, { size: 10.5, weight: 500, color: C.onDark });
        P.hline(22, ly + 9, PW - 44, "rgba(255,255,255,0.08)", 0.7);
        ly += 22;
      }
      P.text("A student concept · Sample", 22, PH - 18, { size: 7, color: "#8E8178", track: 0.04 });
    },

    scope(P) {
      paper(P);
      head(P, "Pilot scope", "Step 1");
      kicker(P, "One job. Fixed end date.", 60);
      const y = title(P, "Two-week enquiry pilot", 82);
      const e = rows(P, [["Client", "Harbour Street Physio"], ["Length", "14 days"], ["Goal", "Reply to every enquiry within 2 hours"], ["Measured by", "Average reply time"], ["Ends", "28 October"]], y + 6);
      lines(P, 4, e + 16);
      foot(P, "Fixed scope", "Proof Loop");
    },

    consent(P) {
      paper(P);
      head(P, "Consent to share", "Step 2");
      kicker(P, "Signed before work starts", 60);
      const y = title(P, "Permission to publish results", 82);
      let cy = y + 24;
      for (const t of ["Business name and logo", "Before and after figures", "A short quote", "Client reviews it before it goes out"]) { check(P, t, cy); cy += 18; }
      P.svgStroke(CONSENT_SIG, 22, cy + 12, 0.95, 0.95, "#2A221F", 1.6);
      P.hline(22, cy + 54, 140, C.faint, 0.75);
      P.text("M. Chen, Practice manager", 22, cy + 63, { size: 7, color: C.soft, upper: true, track: 0.06 });
      foot(P, "Built into every pilot", "Proof Loop");
    },

    before(P) {
      paper(P);
      head(P, "Starting point", "Day 1");
      label(P, "Average reply to a new enquiry", 62);
      big(P, "26", "hrs", 104);
      const e = rows(P, [["Enquiries never answered", "31%"], ["Enquiries that became bookings", "4 in 10"]], 116);
      lines(P, 6, e + 18);
      foot(P, "Recorded 14 October", "Proof Loop");
    },

    after(P) {
      paper(P);
      head(P, "Results", "Day 14");
      label(P, "Average reply to a new enquiry", 62);
      big(P, "1.5", "hrs", 104, C.accent);
      // bars: day 1 against day 14
      const bar = (y, lab, w, val, color) => {
        P.text(lab, 22, y + 5.6, { size: 7.5, color: C.soft });
        P.rect(60, y, 180, 7, C.paper2, 2);
        P.rect(60, y, Math.max(3, 180 * w), 7, color, 2);
        P.text(val, PW - 22, y + 5.6, { size: 7.5, weight: 600, color: C.ink, align: "right" });
      };
      bar(122, "Day 1", 1, "26 hrs", C.faint);
      bar(138, "Day 14", 0.058, "1.5 hrs", C.accent);
      rows(P, [["Enquiries never answered", "4%"], ["Enquiries that became bookings", "7 in 10"]], 152);
      foot(P, "Recorded 28 October", "Proof Loop");
    },

    quote(P) {
      paper(P);
      head(P, "Client quote", "Day 14");
      const qs = ["What was the problem before?", "What changed in two weeks?", "Would you recommend Sam?"];
      let y = 64;
      qs.forEach((q, i) => {
        P.text(`${i + 1}.`, 26, y, { size: 8.5, weight: 700, color: C.accent });
        P.text(q, 38, y, { size: 8.5, color: C.soft });
        y += 14;
      });
      P.hline(22, y + 2, PW - 44);
      const qy = quote(P, "We stopped losing people between the first call and the first booking.", y + 34);
      P.text("M. Chen, Practice manager, Harbour Street Physio", 22, qy + 22, { size: 8.5, color: C.soft });
      foot(P, "Asked the day the pilot ended", "Proof Loop");
    },

    case(P) {
      paper(P);
      head(P, "Case study", "Sample");
      kicker(P, "Two-week pilot", 60);
      const y = title(P, "Enquiry replies from 26 hours to 1.5 hours", 82, 22);
      P.text("Harbour Street Physio · Sam Rivera", 22, y + 16, { size: 9, color: C.soft });
      const fy = y + 32;
      P.rect(22, fy, PW - 44, 96, C.wash, 4);
      label(P, "Average reply, day 14", fy + 20, 34);
      const w = P.text("1.5", 34, fy + 62, { size: 44, weight: 800, family: DISPLAY, color: C.accent, track: -0.04 });
      P.text("hrs", 34 + w + 3, fy + 62, { size: 15, weight: 700, family: DISPLAY, color: C.soft });
      P.text("from 26 hrs on day 1", 34, fy + 80, { size: 9, color: C.soft });
      quote(P, "We stopped losing people between the first call and the first booking.", fy + 126, 14);
      foot(P, "Client approved for publication", "Proof Loop");
    },
  };

  function make(kind, width = 1024) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = Math.round(width * PH / PW);
    DOCS[kind](painter(c));
    return c;
  }

  // ---------- the signature, drawn a bit at a time ----------
  const sigSamples = (() => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.position = "absolute"; svg.style.visibility = "hidden";
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", SIG_PATH);
    svg.appendChild(p);
    (document.body || document.documentElement).appendChild(svg);
    const len = p.getTotalLength();
    const N = 420;
    const pts = [];
    for (let i = 0; i <= N; i++) { const q = p.getPointAtLength((len * i) / N); pts.push([q.x, q.y]); }
    svg.remove();
    return pts;
  })();

  function signatureCanvas(width = 600) {
    const c = document.createElement("canvas");
    c.width = width; c.height = Math.round(width * LAYOUT.sig.h / LAYOUT.sig.w);
    return c;
  }
  // The pen tip after the first t (0..1) of the signature, in proposal points
  function signatureTip(t) {
    const n = Math.max(0, Math.min(sigSamples.length - 1, Math.round(t * (sigSamples.length - 1))));
    const [px, py] = sigSamples[n];
    return { x: LAYOUT.sig.x + px * (LAYOUT.sig.w / 120), y: LAYOUT.sig.y + py * (LAYOUT.sig.h / 40) };
  }
  // Draws the first t (0..1) of the signature; returns the pen tip in proposal points
  function drawSignature(canvas, t) {
    const ctx = canvas.getContext("2d");
    const s = canvas.width / 120;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const n = Math.max(0, Math.min(sigSamples.length - 1, Math.round(t * (sigSamples.length - 1))));
    if (n > 0) {
      ctx.strokeStyle = "#1F2A44";
      ctx.lineWidth = 1.7 * s;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(sigSamples[0][0] * s, sigSamples[0][1] * s);
      for (let i = 1; i <= n; i++) ctx.lineTo(sigSamples[i][0] * s, sigSamples[i][1] * s);
      ctx.stroke();
    }
    const [px, py] = sigSamples[n];
    return { x: LAYOUT.sig.x + px * (LAYOUT.sig.w / 120), y: LAYOUT.sig.y + py * (LAYOUT.sig.h / 40) };
  }

  // ---------- the stamp ----------
  function stampCanvas(width = 420) {
    const c = document.createElement("canvas");
    c.width = width; c.height = Math.round(width * LAYOUT.stamp.h / LAYOUT.stamp.w);
    const ctx = c.getContext("2d");
    const s = width / LAYOUT.stamp.w;
    ctx.strokeStyle = "rgba(155,44,44,0.92)";
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.roundRect(1.2 * s, 1.2 * s, (LAYOUT.stamp.w - 2.4) * s, (LAYOUT.stamp.h - 2.4) * s, 3 * s); ctx.stroke();
    ctx.fillStyle = "rgba(155,44,44,0.94)";
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = `800 ${11 * s}px ${DISPLAY}`; ctx.letterSpacing = `${0.14 * 11 * s}px`;
    ctx.fillText("ACCEPTED", (LAYOUT.stamp.w / 2 + 0.8) * s, 15.5 * s);
    ctx.font = `700 ${6 * s}px ${TEXT}`; ctx.letterSpacing = `${0.12 * 6 * s}px`;
    ctx.fillText("6 NOV 2026", (LAYOUT.stamp.w / 2 + 0.4) * s, 24.5 * s);
    // worn ink: knock small specks out of the print
    ctx.globalCompositeOperation = "destination-out";
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.6; ctx.beginPath(); ctx.arc(rnd() * c.width, rnd() * c.height, (0.25 + rnd() * 0.7) * s, 0, Math.PI * 2); ctx.fill(); }
    return c;
  }

  window.PLDocs = { ready, make, LAYOUT, PW, PH, signatureCanvas, drawSignature, signatureTip, stampCanvas, kinds: Object.keys(DOCS) };
})();
