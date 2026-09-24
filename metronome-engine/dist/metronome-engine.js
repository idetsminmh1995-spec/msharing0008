"use strict";
var MetronomeDesigns = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    ASPECT_RATIOS: () => ASPECT_RATIOS,
    DEFAULT_DESIGN_ID: () => DEFAULT_DESIGN_ID,
    DESIGNS: () => DESIGNS,
    canvasFor: () => canvasFor,
    designById: () => designById,
    listDesigns: () => listDesigns,
    paletteFor: () => paletteFor,
    renderMetronomeFrame: () => renderMetronomeFrame
  });

  // src/svg.ts
  function escapeText(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function n(value) {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round(value * 1e3) / 1e3;
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }
  function attrs(values) {
    const parts = [];
    for (const [key, value] of Object.entries(values)) {
      if (value === void 0) continue;
      parts.push(`${key}="${typeof value === "number" ? n(value) : escapeText(value)}"`);
    }
    return parts.length > 0 ? " " + parts.join(" ") : "";
  }
  function tag(name, values = {}) {
    return `<${name}${attrs(values)}/>`;
  }
  function wrap(name, values, body) {
    return `<${name}${attrs(values)}>${body}</${name}>`;
  }
  function rect(x, y, w, h, values = {}) {
    return tag("rect", { x, y, width: w, height: h, ...values });
  }
  function circle(cx, cy, r, values = {}) {
    return tag("circle", { cx, cy, r, ...values });
  }
  function line(x1, y1, x2, y2, values = {}) {
    return tag("line", { x1, y1, x2, y2, ...values });
  }
  function path(d, values = {}) {
    return tag("path", { d, ...values });
  }
  function text(value, x, y, values = {}) {
    if (value === "") return "";
    return wrap("text", { x, y, ...values }, escapeText(value));
  }
  function group(values, body) {
    return wrap("g", values, body);
  }
  function polar(cx, cy, radius, turns) {
    const radians = (turns - 0.25) * Math.PI * 2;
    return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
  }
  function arcPath(cx, cy, radius, fromTurns, toTurns) {
    const sweep = toTurns - fromTurns;
    if (Math.abs(sweep) < 1e-6) return "";
    if (Math.abs(sweep) >= 1) {
      const [ax, ay] = polar(cx, cy, radius, 0);
      const [bx, by] = polar(cx, cy, radius, 0.5);
      return `M ${n(ax)} ${n(ay)} A ${n(radius)} ${n(radius)} 0 0 1 ${n(bx)} ${n(by)} A ${n(radius)} ${n(radius)} 0 0 1 ${n(ax)} ${n(ay)}`;
    }
    const [x1, y1] = polar(cx, cy, radius, fromTurns);
    const [x2, y2] = polar(cx, cy, radius, toTurns);
    const large = Math.abs(sweep) > 0.5 ? 1 : 0;
    const clockwise = sweep > 0 ? 1 : 0;
    return `M ${n(x1)} ${n(y1)} A ${n(radius)} ${n(radius)} 0 ${large} ${clockwise} ${n(x2)} ${n(y2)}`;
  }
  function lerp(from, to, t) {
    return from + (to - from) * t;
  }
  function easeOut(t) {
    const clamped = Math.min(1, Math.max(0, t));
    return 1 - (1 - clamped) * (1 - clamped);
  }
  function easeInOut(t) {
    const clamped = Math.min(1, Math.max(0, t));
    return clamped < 0.5 ? 2 * clamped * clamped : 1 - 2 * (1 - clamped) * (1 - clamped);
  }

  // src/layout.ts
  var CANVAS_SIZES = {
    "16x9": { width: 1920, height: 1080 },
    "9x16": { width: 1080, height: 1920 },
    "1x1": { width: 1080, height: 1080 }
  };
  function canvasFor(aspect) {
    const { width, height } = CANVAS_SIZES[aspect];
    return {
      width,
      height,
      aspect,
      short: Math.min(width, height),
      long: Math.max(width, height),
      isPortrait: height > width,
      isSquare: width === height
    };
  }
  function centreOf(box) {
    return [box.x + box.width / 2, box.y + box.height / 2];
  }
  function gutter(canvas) {
    return canvas.short * 0.075;
  }
  function bands(canvas) {
    const pad = gutter(canvas);
    const headerHeight = canvas.isPortrait ? canvas.height * 0.11 : canvas.isSquare ? canvas.height * 0.15 : canvas.height * 0.18;
    const header2 = {
      x: pad,
      y: pad,
      width: canvas.width - pad * 2,
      height: headerHeight
    };
    const stageTop = header2.y + header2.height;
    return {
      header: header2,
      stage: {
        x: pad,
        y: stageTop,
        width: canvas.width - pad * 2,
        height: canvas.height - stageTop - pad
      }
    };
  }
  function typeScale(canvas) {
    const unit = canvas.short / 1080;
    return {
      title: 62 * unit,
      subtitle: 34 * unit,
      label: 26 * unit,
      readout: 88 * unit,
      huge: 420 * unit
    };
  }
  var FONT_DISPLAY = "'Sora', 'Trebuchet MS', sans-serif";
  var FONT_TEXT = "'Manrope', 'Segoe UI', sans-serif";
  function header(context) {
    const { canvas, palette, frame, title, subtitle } = context;
    const { header: box } = bands(canvas);
    const size = typeScale(canvas);
    const readout = `${frame.bpm} BPM  \xB7  ${frame.timeSignature.numerator}/${frame.timeSignature.denominator}`;
    if (canvas.isPortrait || canvas.isSquare) {
      const [cx] = centreOf(box);
      let y = box.y + size.title;
      let body2 = text(title, cx, y, {
        fill: palette.ink,
        "font-family": FONT_DISPLAY,
        "font-size": size.title,
        "font-weight": 800,
        "text-anchor": "middle"
      });
      if (subtitle !== "") {
        y += size.subtitle * 1.45;
        body2 += text(subtitle, cx, y, {
          fill: palette.inkSoft,
          "font-family": FONT_TEXT,
          "font-size": size.subtitle,
          "font-weight": 600,
          "text-anchor": "middle"
        });
      }
      body2 += text(readout, cx, box.y + box.height, {
        fill: palette.accent,
        "font-family": FONT_TEXT,
        "font-size": size.label,
        "font-weight": 700,
        "letter-spacing": n(size.label * 0.08),
        "text-anchor": "middle"
      });
      return group({}, body2);
    }
    let body = text(title, box.x, box.y + size.title, {
      fill: palette.ink,
      "font-family": FONT_DISPLAY,
      "font-size": size.title,
      "font-weight": 800
    });
    if (subtitle !== "") {
      body += text(subtitle, box.x, box.y + size.title + size.subtitle * 1.4, {
        fill: palette.inkSoft,
        "font-family": FONT_TEXT,
        "font-size": size.subtitle,
        "font-weight": 600
      });
    }
    body += text(readout, box.x + box.width, box.y + size.title, {
      fill: palette.accent,
      "font-family": FONT_TEXT,
      "font-size": size.label * 1.15,
      "font-weight": 700,
      "letter-spacing": n(size.label * 0.08),
      "text-anchor": "end"
    });
    return group({}, body);
  }
  function logo(context, where = "bottom-right") {
    const { canvas, logoUrl } = context;
    if (logoUrl === void 0 || logoUrl === "") return "";
    const size = canvas.short * 0.11;
    const pad = gutter(canvas);
    const x = where === "top-left" ? pad : canvas.width - pad - size;
    const y = where === "top-left" ? pad : canvas.height - pad - size;
    return `<image href="${logoUrl.replace(/"/g, "&quot;")}" x="${n(x)}" y="${n(y)}" width="${n(size)}" height="${n(size)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  // src/designs/01-pendulum.ts
  var MAX_SWING = 0.072;
  var pendulum = {
    id: "pendulum",
    name: "Pendulum",
    description: "The instrument itself \u2014 a weighted arm swinging over a scale.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx] = centreOf(stage);
      const size = typeScale(canvas);
      const caseHeight = Math.min(stage.height * 0.88, stage.width * 1.35);
      const baseWidth = Math.min(stage.width * 0.62, caseHeight * 0.62);
      const topWidth = baseWidth * 0.3;
      const baseY = stage.y + (stage.height + caseHeight) / 2;
      const topY = baseY - caseHeight;
      const pivotY = baseY - caseHeight * 0.12;
      const armLength = caseHeight * 0.78;
      const goingRight = frame.beat % 2 === 1;
      const eased = easeInOut(frame.phase);
      const turns = lerp(
        goingRight ? -MAX_SWING : MAX_SWING,
        goingRight ? MAX_SWING : -MAX_SWING,
        eased
      );
      const [tipX, tipY] = polar(cx, pivotY, armLength, turns);
      const [weightX, weightY] = polar(cx, pivotY, armLength * 0.62, turns);
      const body = path(
        `M ${cx - baseWidth / 2} ${baseY} L ${cx - topWidth / 2} ${topY} L ${cx + topWidth / 2} ${topY} L ${cx + baseWidth / 2} ${baseY} Z`,
        {
          fill: palette.accentSoft,
          stroke: palette.accent,
          "stroke-width": canvas.short * 6e-3,
          "stroke-linejoin": "round"
        }
      ) + // The scale the arm swings over.
      group(
        { stroke: palette.inkSoft, "stroke-width": canvas.short * 25e-4, opacity: 0.55 },
        Array.from({ length: 9 }, (_, i) => {
          const t = i / 8 * 2 * MAX_SWING - MAX_SWING;
          const [x1, y1] = polar(cx, pivotY, armLength * 0.86, t);
          const [x2, y2] = polar(cx, pivotY, armLength * 0.94, t);
          return line(x1, y1, x2, y2);
        }).join("")
      ) + line(cx, pivotY, tipX, tipY, {
        stroke: palette.ink,
        "stroke-width": canvas.short * 9e-3,
        "stroke-linecap": "round"
      }) + circle(weightX, weightY, canvas.short * 0.035, { fill: palette.accent }) + circle(cx, pivotY, canvas.short * 0.018, { fill: palette.ink }) + rect(cx - baseWidth * 0.58, baseY, baseWidth * 1.16, canvas.short * 0.022, {
        fill: palette.accent,
        rx: canvas.short * 8e-3
      });
      const count = text(String(frame.beat), cx, topY - size.label * 0.9, {
        fill: palette.accent,
        "font-family": FONT_DISPLAY,
        "font-size": size.readout,
        "font-weight": 800,
        "text-anchor": "middle"
      });
      return body + count + logo(context);
    }
  };

  // src/designs/02-beat-dots.ts
  var beatDots = {
    id: "beat-dots",
    name: "Beat Dots",
    description: "One dot per beat, the current one lit \u2014 a row, a column or an arc.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx, cy] = centreOf(stage);
      const size = typeScale(canvas);
      const count = Math.max(1, frame.beatsPerBar);
      const settle = easeOut(Math.min(1, frame.phase * 3));
      const litScale = lerp(1.9, 1.45, settle);
      const dots = [];
      const radius = Math.min(
        canvas.short * 0.055,
        (canvas.isPortrait ? stage.height : stage.width) / (count * 3.4)
      );
      const gap = radius * 3.2;
      for (let i = 0; i < count; i++) {
        const isLit = i === frame.beat - 1;
        const offset = (i - (count - 1) / 2) * gap;
        let x = cx;
        let y = cy;
        if (canvas.isSquare) {
          const spread = Math.min(0.3, count * 0.07);
          const turns = 0.5 + (count === 1 ? 0 : (i / (count - 1) - 0.5) * -spread);
          [x, y] = polar(cx, cy - stage.height * 0.34, stage.height * 0.55, turns);
        } else if (canvas.isPortrait) {
          y = cy + offset;
        } else {
          x = cx + offset;
        }
        dots.push(
          circle(x, y, radius * (isLit ? litScale : 1), {
            fill: isLit ? palette.accent : "none",
            stroke: isLit ? "none" : palette.inkSoft,
            "stroke-width": radius * 0.22,
            opacity: isLit ? 1 : 0.5
          })
        );
      }
      const number = canvas.isSquare ? text(String(frame.beat), cx, cy - stage.height * 0.06, {
        fill: palette.ink,
        "font-family": FONT_DISPLAY,
        "font-size": size.readout * 1.3,
        "font-weight": 800,
        "text-anchor": "middle"
      }) : text(String(frame.beat), cx, cy + size.huge * 0.33, {
        fill: palette.ink,
        "font-family": FONT_DISPLAY,
        "font-size": size.huge * 0.42,
        "font-weight": 800,
        "text-anchor": "middle",
        opacity: 0.12
      });
      return number + group({}, dots.join("")) + logo(context);
    }
  };

  // src/designs/03-pulse-ring.ts
  var RINGS = 3;
  var pulseRing = {
    id: "pulse-ring",
    name: "Pulse Ring",
    description: "Rings thrown outward on each beat, fading as they grow.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx, cy] = centreOf(stage);
      const size = typeScale(canvas);
      const maxRadius = Math.min(stage.width, stage.height) * 0.46;
      const rings = [];
      for (let age = RINGS - 1; age >= 0; age--) {
        const travel = (frame.phase + age) / RINGS;
        if (travel > 1) continue;
        const eased = easeOut(travel);
        const wasDownbeat = ((frame.beat - 1 - age) % frame.beatsPerBar + frame.beatsPerBar) % frame.beatsPerBar === 0;
        rings.push(
          circle(cx, cy, lerp(maxRadius * 0.16, maxRadius, eased), {
            fill: "none",
            stroke: wasDownbeat ? palette.accent : palette.ink,
            "stroke-width": lerp(canvas.short * 0.018, canvas.short * 2e-3, eased),
            opacity: Math.max(0, 1 - travel) * (wasDownbeat ? 0.95 : 0.55)
          })
        );
      }
      const core = circle(cx, cy, maxRadius * lerp(0.2, 0.14, easeOut(frame.phase)), {
        fill: frame.beat === 1 ? palette.accent : palette.ink
      });
      const number = text(String(frame.beat), cx, cy + size.readout * 0.36, {
        fill: frame.beat === 1 ? palette.onAccent : palette.background,
        "font-family": FONT_DISPLAY,
        "font-size": size.readout,
        "font-weight": 800,
        "text-anchor": "middle"
      });
      return group({}, rings.join("")) + core + number + logo(context);
    }
  };

  // src/designs/04-bar-meter.ts
  var barMeter = {
    id: "bar-meter",
    name: "Bar Meter",
    description: "Columns that fill through the bar, so you see what is left of it.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const size = typeScale(canvas);
      const count = Math.max(1, frame.beatsPerBar);
      const grow = easeOut(Math.min(1, frame.phase * 2.5));
      const bars = [];
      const horizontal = canvas.isPortrait;
      const slot = (horizontal ? stage.height : stage.width) / count;
      const thickness = slot * 0.62;
      const runway = (horizontal ? stage.width : stage.height) * 0.78;
      for (let i = 0; i < count; i++) {
        const played = i < frame.beat - 1;
        const current = i === frame.beat - 1;
        const fill = played ? 1 : current ? lerp(0.55, 1, grow) : 0.16;
        const offset = (horizontal ? stage.y : stage.x) + slot * i + (slot - thickness) / 2;
        const length = runway * fill;
        const colour = current ? palette.accent : played ? palette.ink : palette.inkSoft;
        const opacity = current ? 1 : played ? 0.7 : 0.25;
        if (horizontal) {
          const x = stage.x + (stage.width - runway) / 2;
          bars.push(
            rect(x, offset, runway, thickness, {
              fill: palette.inkSoft,
              opacity: 0.12,
              rx: thickness * 0.3
            }) + rect(x, offset, length, thickness, { fill: colour, opacity, rx: thickness * 0.3 })
          );
        } else {
          const bottom = stage.y + stage.height * 0.9;
          bars.push(
            rect(offset, bottom - runway, thickness, runway, {
              fill: palette.inkSoft,
              opacity: 0.12,
              rx: thickness * 0.3
            }) + rect(offset, bottom - length, thickness, length, {
              fill: colour,
              opacity,
              rx: thickness * 0.3
            })
          );
        }
      }
      const labels = Array.from({ length: count }, (_, i) => {
        const offset = (horizontal ? stage.y : stage.x) + slot * (i + 0.5);
        return horizontal ? text(String(i + 1), stage.x + stage.width * 0.055, offset + size.label * 0.5, {
          fill: i === frame.beat - 1 ? palette.accent : palette.inkSoft,
          "font-family": FONT_DISPLAY,
          "font-size": size.label * 1.4,
          "font-weight": 800,
          "text-anchor": "middle"
        }) : text(String(i + 1), offset, stage.y + stage.height * 0.98, {
          fill: i === frame.beat - 1 ? palette.accent : palette.inkSoft,
          "font-family": FONT_DISPLAY,
          "font-size": size.label * 1.4,
          "font-weight": 800,
          "text-anchor": "middle"
        });
      }).join("");
      return group({}, bars.join("")) + labels + logo(context, "top-left");
    }
  };

  // src/designs/05-sweep-dial.ts
  var sweepDial = {
    id: "sweep-dial",
    name: "Sweep Dial",
    description: "A hand sweeping once round the bar, ticked at every beat.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx, cy] = centreOf(stage);
      const size = typeScale(canvas);
      const radius = Math.min(stage.width, stage.height) * 0.42;
      const count = Math.max(1, frame.beatsPerBar);
      const throughBar = (frame.beat - 1 + frame.phase) / count;
      const face = circle(cx, cy, radius, {
        fill: "none",
        stroke: palette.inkSoft,
        "stroke-width": canvas.short * 4e-3,
        opacity: 0.35
      }) + path(arcPath(cx, cy, radius, 0, throughBar), {
        fill: "none",
        stroke: palette.accent,
        "stroke-width": canvas.short * 0.012,
        "stroke-linecap": "round"
      });
      const ticks = Array.from({ length: count }, (_, i) => {
        const turns = i / count;
        const passed = i <= frame.beat - 1;
        const inner = radius * (i === 0 ? 0.82 : 0.88);
        const [x1, y1] = polar(cx, cy, inner, turns);
        const [x2, y2] = polar(cx, cy, radius * 1.06, turns);
        return line(x1, y1, x2, y2, {
          stroke: passed ? palette.accent : palette.inkSoft,
          "stroke-width": canvas.short * (i === 0 ? 8e-3 : 5e-3),
          "stroke-linecap": "round",
          opacity: passed ? 1 : 0.45
        });
      }).join("");
      const [handX, handY] = polar(cx, cy, radius * 0.9, throughBar);
      const hand = line(cx, cy, handX, handY, {
        stroke: palette.ink,
        "stroke-width": canvas.short * 7e-3,
        "stroke-linecap": "round"
      }) + circle(handX, handY, canvas.short * 0.022, { fill: palette.accent }) + circle(cx, cy, canvas.short * 0.014, { fill: palette.ink });
      const number = text(String(frame.beat), cx, cy + radius * 0.46, {
        fill: palette.ink,
        "font-family": FONT_DISPLAY,
        "font-size": size.readout * 0.95,
        "font-weight": 800,
        "text-anchor": "middle"
      });
      const barLabel = text(`BAR ${frame.bar}`, cx, cy - radius * 0.3, {
        fill: palette.inkSoft,
        "font-family": FONT_DISPLAY,
        "font-size": size.label,
        "font-weight": 700,
        "letter-spacing": size.label * 0.14,
        "text-anchor": "middle"
      });
      return group({}, face + ticks + hand) + barLabel + number + logo(context);
    }
  };

  // src/designs/06-big-number.ts
  var bigNumber = {
    id: "big-number",
    name: "Big Number",
    description: "The count filling the frame, with the rest of the bar as a thin rail.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx, cy] = centreOf(stage);
      const size = typeScale(canvas);
      const count = Math.max(1, frame.beatsPerBar);
      const settle = easeOut(Math.min(1, frame.phase * 2.2));
      const scale = lerp(1.12, 1, settle);
      const glyph = Math.min(size.huge, stage.height * 0.72) * scale;
      const isDownbeat = frame.beat === 1;
      const number = text(String(frame.beat), cx, cy + glyph * 0.35, {
        fill: isDownbeat ? palette.accent : palette.ink,
        "font-family": FONT_DISPLAY,
        "font-size": glyph,
        "font-weight": 800,
        "text-anchor": "middle"
      });
      const rail = [];
      const thickness = canvas.short * 0.014;
      for (let i = 0; i < count; i++) {
        const on = i <= frame.beat - 1;
        if (canvas.isPortrait) {
          const runway = stage.height * 0.7;
          const slot = runway / count;
          const x = stage.x + stage.width - thickness * 2;
          const y = cy - runway / 2 + slot * i;
          rail.push(
            rect(x, y + slot * 0.1, thickness, slot * 0.8, {
              fill: on ? palette.accent : palette.inkSoft,
              opacity: on ? 1 : 0.3,
              rx: thickness / 2
            })
          );
        } else {
          const runway = stage.width * 0.56;
          const slot = runway / count;
          const x = cx - runway / 2 + slot * i;
          const y = stage.y + stage.height * 0.9;
          rail.push(
            rect(x + slot * 0.1, y, slot * 0.8, thickness, {
              fill: on ? palette.accent : palette.inkSoft,
              opacity: on ? 1 : 0.3,
              rx: thickness / 2
            })
          );
        }
      }
      const barLabel = text(`BAR ${frame.bar}`, cx, stage.y + size.label * 1.6, {
        fill: palette.inkSoft,
        "font-family": FONT_TEXT,
        "font-size": size.label,
        "font-weight": 700,
        "letter-spacing": size.label * 0.16,
        "text-anchor": "middle"
      });
      return barLabel + number + group({}, rail.join("")) + logo(context);
    }
  };

  // src/designs/07-segment-ring.ts
  function wedge(cx, cy, inner, outer, fromTurns, toTurns) {
    const [ox1, oy1] = polar(cx, cy, outer, fromTurns);
    const [ox2, oy2] = polar(cx, cy, outer, toTurns);
    const [ix2, iy2] = polar(cx, cy, inner, toTurns);
    const [ix1, iy1] = polar(cx, cy, inner, fromTurns);
    const large = toTurns - fromTurns > 0.5 ? 1 : 0;
    return `M ${n(ox1)} ${n(oy1)} A ${n(outer)} ${n(outer)} 0 ${large} 1 ${n(ox2)} ${n(oy2)} L ${n(ix2)} ${n(iy2)} A ${n(inner)} ${n(inner)} 0 ${large} 0 ${n(ix1)} ${n(iy1)} Z`;
  }
  var segmentRing = {
    id: "segment-ring",
    name: "Segment Ring",
    description: "The bar cut into wedges, the current beat filled.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx, cy] = centreOf(stage);
      const size = typeScale(canvas);
      const count = Math.max(1, frame.beatsPerBar);
      const outer = Math.min(stage.width, stage.height) * 0.44;
      const inner = outer * 0.62;
      const gapTurns = Math.min(0.012, 0.35 / count);
      const settle = easeOut(Math.min(1, frame.phase * 2.5));
      const wedges = Array.from({ length: count }, (_, i) => {
        const current = i === frame.beat - 1;
        const played = i < frame.beat - 1;
        const from = i / count + gapTurns;
        const to = (i + 1) / count - gapTurns;
        const reach = current ? lerp(outer * 1.07, outer, settle) : outer;
        return path(wedge(cx, cy, inner, reach, from, to), {
          fill: current ? palette.accent : played ? palette.ink : palette.inkSoft,
          opacity: current ? 1 : played ? 0.55 : 0.2
        });
      }).join("");
      const number = text(String(frame.beat), cx, cy + size.readout * 0.36, {
        fill: palette.ink,
        "font-family": FONT_DISPLAY,
        "font-size": size.readout,
        "font-weight": 800,
        "text-anchor": "middle"
      });
      const of = text(`of ${count}`, cx, cy + size.readout * 0.36 + size.label * 1.5, {
        fill: palette.inkSoft,
        "font-family": FONT_DISPLAY,
        "font-size": size.label,
        "font-weight": 700,
        "text-anchor": "middle"
      });
      return group({}, wedges) + number + of + logo(context);
    }
  };

  // src/designs/08-travel-line.ts
  function aroundRect(box, t) {
    const left = box.x;
    const top = box.y;
    const right = box.x + box.width;
    const bottom = box.y + box.height;
    const w = right - left;
    const h = bottom - top;
    const perimeter = (w + h) * 2;
    const along = (t % 1 + 1) % 1 * perimeter;
    if (along < w) return [left + along, top];
    if (along < w + h) return [right, top + (along - w)];
    if (along < w * 2 + h) return [right - (along - w - h), bottom];
    return [left, bottom - (along - w * 2 - h)];
  }
  var travelLine = {
    id: "travel-line",
    name: "Travel Line",
    description: "A marker travelling a track \u2014 across, down, or right round the frame.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const size = typeScale(canvas);
      const count = Math.max(1, frame.beatsPerBar);
      const throughBar = (frame.beat - 1 + frame.phase) / count;
      const stroke = canvas.short * 6e-3;
      const marker = canvas.short * 0.028;
      if (canvas.isSquare) {
        const side = Math.min(stage.width, stage.height) * 0.94;
        const loop = {
          x: stage.x + (stage.width - side) / 2,
          y: stage.y + (stage.height - side) / 2,
          width: side,
          height: side
        };
        const track2 = rect(loop.x, loop.y, loop.width, loop.height, {
          fill: "none",
          stroke: palette.inkSoft,
          "stroke-width": stroke,
          opacity: 0.35,
          rx: canvas.short * 0.04
        });
        const ticks2 = Array.from({ length: count }, (_, i) => {
          const [x, y] = aroundRect(loop, i / count);
          return circle(x, y, marker * (i === 0 ? 0.55 : 0.4), {
            fill: i <= frame.beat - 1 ? palette.accent : palette.inkSoft,
            opacity: i <= frame.beat - 1 ? 1 : 0.4
          });
        }).join("");
        const [mx, my] = aroundRect(loop, throughBar);
        const head2 = circle(mx, my, marker, { fill: palette.accent });
        const number2 = text(
          String(frame.beat),
          canvas.width / 2,
          canvas.height / 2 + size.huge * 0.25,
          {
            fill: palette.ink,
            "font-family": FONT_DISPLAY,
            "font-size": size.huge * 0.72,
            "font-weight": 800,
            "text-anchor": "middle",
            opacity: 0.16
          }
        );
        return number2 + track2 + ticks2 + head2 + logo(context);
      }
      const vertical = canvas.isPortrait;
      const runway = (vertical ? stage.height : stage.width) * 0.8;
      const along = (vertical ? stage.y : stage.x) + ((vertical ? stage.height : stage.width) - runway) / 2;
      const across = vertical ? stage.x + stage.width / 2 : stage.y + stage.height / 2;
      const track = vertical ? line(across, along, across, along + runway, {
        stroke: palette.inkSoft,
        "stroke-width": stroke,
        opacity: 0.35
      }) : line(along, across, along + runway, across, {
        stroke: palette.inkSoft,
        "stroke-width": stroke,
        opacity: 0.35
      });
      const ticks = Array.from({ length: count + 1 }, (_, i) => {
        const at2 = along + runway * i / count;
        const passed = i <= frame.beat - 1;
        const size2 = marker * (i % count === 0 ? 0.6 : 0.42);
        return vertical ? circle(across, at2, size2, {
          fill: passed ? palette.accent : palette.inkSoft,
          opacity: passed ? 1 : 0.4
        }) : circle(at2, across, size2, {
          fill: passed ? palette.accent : palette.inkSoft,
          opacity: passed ? 1 : 0.4
        });
      }).join("");
      const at = along + runway * throughBar;
      const head = vertical ? circle(across, at, marker, { fill: palette.accent }) : circle(at, across, marker, { fill: palette.accent });
      const tailFrom = along + runway * Math.max(0, throughBar - 0.08);
      const trail = path(
        vertical ? `M ${n(across)} ${n(tailFrom)} L ${n(across)} ${n(at)}` : `M ${n(tailFrom)} ${n(across)} L ${n(at)} ${n(across)}`,
        {
          stroke: palette.accent,
          "stroke-width": marker * 0.7,
          "stroke-linecap": "round",
          opacity: 0.35
        }
      );
      const number = text(
        String(frame.beat),
        vertical ? stage.x + stage.width * 0.5 : stage.x + stage.width * 0.5,
        vertical ? stage.y + stage.height * 0.06 : across - marker * 3.2,
        {
          fill: palette.ink,
          "font-family": FONT_DISPLAY,
          "font-size": size.readout,
          "font-weight": 800,
          "text-anchor": "middle"
        }
      );
      return group({}, track + ticks + trail + head) + number + logo(context);
    }
  };

  // src/designs/09-flash-frame.ts
  var flashFrame = {
    id: "flash-frame",
    name: "Flash Frame",
    description: "A border that flares on every beat and hard on the downbeat.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx, cy] = centreOf(stage);
      const size = typeScale(canvas);
      const isDownbeat = frame.beat === 1;
      const decay = 1 - easeOut(Math.min(1, frame.phase * 1.6));
      const thickness = canvas.short * (isDownbeat ? 0.055 : 0.03) * lerp(0.35, 1, decay);
      const border = rect(
        thickness / 2,
        thickness / 2,
        canvas.width - thickness,
        canvas.height - thickness,
        {
          fill: "none",
          stroke: palette.accent,
          "stroke-width": thickness,
          opacity: lerp(0.15, 1, decay)
        }
      );
      const wash = isDownbeat ? rect(0, 0, canvas.width, canvas.height, { fill: palette.accent, opacity: 0.1 * decay }) : "";
      const number = text(String(frame.beat), cx, cy + size.huge * 0.32, {
        fill: isDownbeat ? palette.accent : palette.ink,
        "font-family": FONT_DISPLAY,
        "font-size": Math.min(size.huge * 0.9, stage.height * 0.66),
        "font-weight": 800,
        "text-anchor": "middle"
      });
      const of = text(`${frame.beat} / ${frame.beatsPerBar}`, cx, stage.y + stage.height * 0.96, {
        fill: palette.inkSoft,
        "font-family": FONT_TEXT,
        "font-size": size.label * 1.2,
        "font-weight": 700,
        "letter-spacing": size.label * 0.12,
        "text-anchor": "middle"
      });
      return group({}, wash + border) + number + of + logo(context);
    }
  };

  // src/designs/10-bounce-ball.ts
  var bounceBall = {
    id: "bounce-ball",
    name: "Bounce Ball",
    description: "A ball arcing from beat to beat and landing on each one.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const size = typeScale(canvas);
      const count = Math.max(1, frame.beatsPerBar);
      const vertical = canvas.isPortrait;
      const runway = (vertical ? stage.height : stage.width) * 0.76;
      const start = (vertical ? stage.y : stage.x) + ((vertical ? stage.height : stage.width) - runway) / 2;
      const baseline = vertical ? stage.x + stage.width * 0.72 : stage.y + stage.height * 0.72;
      const slot = runway / Math.max(1, count - 1 === 0 ? 1 : count - 1);
      const at = (i) => count === 1 ? start + runway / 2 : start + slot * i;
      const pads = Array.from({ length: count }, (_, i) => {
        const current = i === frame.beat - 1;
        const padLength = Math.min(slot * 0.55, canvas.short * 0.16);
        const padThickness = canvas.short * 0.016;
        const p = at(i);
        return vertical ? rect(baseline, p - padLength / 2, padThickness, padLength, {
          fill: current ? palette.accent : palette.inkSoft,
          opacity: current ? 1 : 0.35,
          rx: padThickness / 2
        }) : rect(p - padLength / 2, baseline, padLength, padThickness, {
          fill: current ? palette.accent : palette.inkSoft,
          opacity: current ? 1 : 0.35,
          rx: padThickness / 2
        });
      }).join("");
      const fromIndex = frame.beat - 1;
      const toIndex = frame.beat % count;
      const travel = count === 1 ? 0 : frame.phase;
      const along = lerp(at(fromIndex), at(toIndex), travel);
      const hop = Math.sin(Math.PI * frame.phase) * Math.min(runway * 0.24, canvas.short * 0.26);
      const radius = canvas.short * 0.032;
      const ballX = vertical ? baseline - hop - radius * 1.2 : along;
      const ballY = vertical ? along : baseline - hop - radius * 1.2;
      const squash = 1 - 0.22 * (1 - easeOut(Math.min(1, frame.phase * 5)));
      const ball = `<ellipse cx="${n(ballX)}" cy="${n(ballY)}" rx="${n(radius * (vertical ? squash : 2 - squash))}" ry="${n(radius * (vertical ? 2 - squash : squash))}" fill="${palette.accent}"/>`;
      const shadowWidth = radius * lerp(1.5, 0.7, Math.sin(Math.PI * frame.phase));
      const shadow = vertical ? `<ellipse cx="${n(baseline + canvas.short * 6e-3)}" cy="${n(along)}" rx="${n(radius * 0.35)}" ry="${n(shadowWidth)}" fill="${palette.ink}" opacity="0.18"/>` : `<ellipse cx="${n(along)}" cy="${n(baseline + canvas.short * 6e-3)}" rx="${n(shadowWidth)}" ry="${n(radius * 0.35)}" fill="${palette.ink}" opacity="0.18"/>`;
      const numbers = Array.from({ length: count }, (_, i) => {
        const p = at(i);
        const current = i === frame.beat - 1;
        return vertical ? text(String(i + 1), baseline + canvas.short * 0.06, p + size.label * 0.4, {
          fill: current ? palette.accent : palette.inkSoft,
          "font-family": FONT_DISPLAY,
          "font-size": size.label * 1.3,
          "font-weight": 800,
          "text-anchor": "middle"
        }) : text(String(i + 1), p, baseline + canvas.short * 0.075, {
          fill: current ? palette.accent : palette.inkSoft,
          "font-family": FONT_DISPLAY,
          "font-size": size.label * 1.3,
          "font-weight": 800,
          "text-anchor": "middle"
        });
      }).join("");
      return group({}, pads) + shadow + ball + numbers + logo(context, "top-left");
    }
  };

  // src/designs/11-stack-blocks.ts
  var stackBlocks = {
    id: "stack-blocks",
    name: "Stack Blocks",
    description: "A block laid on every beat, the stack cleared at the bar line.",
    draw(context) {
      const { canvas, palette, frame } = context;
      const { stage } = bands(canvas);
      const [cx, cy] = centreOf(stage);
      const size = typeScale(canvas);
      const count = Math.max(1, frame.beatsPerBar);
      const land = easeOut(Math.min(1, frame.phase * 3));
      const upward = !canvas.isPortrait ? canvas.isSquare : true;
      const span = upward ? Math.min(stage.height * 0.8, canvas.short * 0.9) : stage.width * 0.8;
      const slot = span / count;
      const blockLong = slot * 0.82;
      const blockShort = Math.min(canvas.short * 0.3, slot * 2.6);
      const blocks = [];
      for (let i = 0; i < count; i++) {
        const placed = i < frame.beat - 1;
        const current = i === frame.beat - 1;
        if (!placed && !current) continue;
        const drop = current ? lerp(slot * 0.9, 0, land) : 0;
        const fade = current ? lerp(0.4, 1, land) : 0.75;
        if (upward) {
          const bottom = cy + span / 2;
          const y = bottom - slot * (i + 1) - drop;
          blocks.push(
            rect(cx - blockShort / 2, y + (slot - blockLong) / 2, blockShort, blockLong, {
              fill: current ? palette.accent : palette.ink,
              opacity: fade,
              rx: canvas.short * 0.012
            })
          );
        } else {
          const left = cx - span / 2;
          const x = left + slot * i + drop;
          blocks.push(
            rect(x + (slot - blockLong) / 2, cy - blockShort / 2, blockLong, blockShort, {
              fill: current ? palette.accent : palette.ink,
              opacity: fade,
              rx: canvas.short * 0.012
            })
          );
        }
      }
      const ghosts = [];
      for (let i = 0; i < count; i++) {
        if (i <= frame.beat - 1) continue;
        if (upward) {
          const bottom = cy + span / 2;
          const y = bottom - slot * (i + 1);
          ghosts.push(
            rect(cx - blockShort / 2, y + (slot - blockLong) / 2, blockShort, blockLong, {
              fill: "none",
              stroke: palette.inkSoft,
              "stroke-width": canvas.short * 25e-4,
              opacity: 0.25,
              rx: canvas.short * 0.012
            })
          );
        } else {
          const left = cx - span / 2;
          const x = left + slot * i;
          ghosts.push(
            rect(x + (slot - blockLong) / 2, cy - blockShort / 2, blockLong, blockShort, {
              fill: "none",
              stroke: palette.inkSoft,
              "stroke-width": canvas.short * 25e-4,
              opacity: 0.25,
              rx: canvas.short * 0.012
            })
          );
        }
      }
      const label = text(`BAR ${frame.bar}`, cx, stage.y + size.label * 1.5, {
        fill: palette.inkSoft,
        "font-family": FONT_TEXT,
        "font-size": size.label,
        "font-weight": 700,
        "letter-spacing": size.label * 0.16,
        "text-anchor": "middle"
      });
      const number = text(
        String(frame.beat),
        upward ? cx + blockShort * 0.78 : cx,
        upward ? cy + size.readout * 0.35 : cy - blockShort * 0.72,
        {
          fill: palette.accent,
          "font-family": FONT_DISPLAY,
          "font-size": size.readout,
          "font-weight": 800,
          "text-anchor": "middle"
        }
      );
      return label + group({}, ghosts.join("")) + group({}, blocks.join("")) + number + logo(context);
    }
  };

  // src/designs/index.ts
  var DESIGNS = [
    pendulum,
    beatDots,
    pulseRing,
    barMeter,
    sweepDial,
    bigNumber,
    segmentRing,
    travelLine,
    flashFrame,
    bounceBall,
    stackBlocks
  ];
  var DEFAULT_DESIGN_ID = DESIGNS[0]?.id ?? "pendulum";
  function designById(id) {
    return DESIGNS.find((design) => design.id === id);
  }

  // src/theme.ts
  var BRAND_RED = "#C81E2C";
  var BLACK = {
    background: "#17110E",
    ink: "#FFFFFF",
    inkSoft: "#8A7C74",
    accent: BRAND_RED,
    accentSoft: "#5A1218",
    onAccent: "#FFFFFF"
  };
  var WHITE = {
    background: "#FFFFFF",
    ink: "#1E1512",
    inkSoft: "#8A7C74",
    accent: BRAND_RED,
    accentSoft: "#FCEDEC",
    onAccent: "#FFFFFF"
  };
  function paletteFor(style) {
    return style === "white" ? WHITE : BLACK;
  }

  // src/types.ts
  var ASPECT_RATIOS = ["16x9", "9x16", "1x1"];

  // src/index.ts
  function listDesigns() {
    return DESIGNS.map((design) => ({
      id: design.id,
      name: design.name,
      description: design.description
    }));
  }
  function normalizeFrame(frame) {
    const beatsPerBar = Math.max(1, Math.round(frame.beatsPerBar));
    const beat = Math.min(beatsPerBar, Math.max(1, Math.round(frame.beat)));
    return {
      beat,
      beatsPerBar,
      phase: Math.min(1, Math.max(0, Number.isFinite(frame.phase) ? frame.phase : 0)),
      bar: Math.max(1, Math.round(frame.bar)),
      bpm: Math.max(1, Math.round(frame.bpm)),
      timeSignature: {
        numerator: Math.max(1, Math.round(frame.timeSignature.numerator)),
        denominator: Math.max(1, Math.round(frame.timeSignature.denominator))
      }
    };
  }
  function renderMetronomeFrame(input) {
    const design = designById(input.design) ?? DESIGNS[0];
    const aspect = ASPECT_RATIOS.includes(input.aspect) ? input.aspect : "16x9";
    const canvas = canvasFor(aspect);
    const palette = paletteFor(input.style === "white" ? "white" : "black");
    const frame = normalizeFrame(input.frame);
    const context = {
      canvas,
      palette,
      frame,
      style: input.style === "white" ? "white" : "black",
      title: input.title ?? "",
      subtitle: input.subtitle ?? "",
      logoUrl: input.logoUrl === "" ? void 0 : input.logoUrl
    };
    const background = rect(0, 0, canvas.width, canvas.height, { fill: palette.background });
    const body = design.draw(context);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(canvas.width)} ${n(canvas.height)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeText(`${design.name} metronome, beat ${frame.beat} of ${frame.beatsPerBar}`)}">` + background + header(context) + body + "</svg>";
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=metronome-engine.js.map
