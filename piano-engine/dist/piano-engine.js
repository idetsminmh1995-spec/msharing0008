"use strict";
var PianoEngine = (() => {
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
    DEFAULT_COLORS: () => DEFAULT_COLORS,
    DEFAULT_HAND_COLORS: () => DEFAULT_HAND_COLORS,
    DEFAULT_LEAD_SECONDS: () => DEFAULT_LEAD_SECONDS,
    FINGERS: () => FINGERS,
    KEYBOARD_RANGES: () => KEYBOARD_RANGES,
    KEYBOARD_SIZES: () => KEYBOARD_SIZES,
    anchorAt: () => anchorAt,
    darken: () => darken,
    fadeShapes: () => fadeShapes,
    fallingBars: () => fallingBars,
    fingersDownAt: () => fingersDownAt,
    gridShapes: () => gridShapes,
    handColor: () => handColor,
    handColorsFor: () => handColorsFor,
    handFingertips: () => handFingertips,
    handShapes: () => handShapes,
    handsShapes: () => handsShapes,
    isBlackKey: () => isBlackKey,
    keyboardBox: () => keyboardBox,
    keyboardGeometry: () => keyboardGeometry,
    keyboardRange: () => keyboardRange,
    parseColor: () => parseColor,
    planFingering: () => planFingering,
    pressedAt: () => pressedAt,
    renderKeyboardSvg: () => renderKeyboardSvg,
    renderPianoStage: () => renderPianoStage,
    resolveColors: () => resolveColors,
    stageShapes: () => stageShapes,
    whiteIndex: () => whiteIndex,
    whiteKeyCount: () => whiteKeyCount
  });

  // src/keyboard.ts
  var KEYBOARD_RANGES = {
    61: { first: 36, last: 96 },
    // C2 - C7
    73: { first: 28, last: 100 },
    // E1 - E7
    76: { first: 28, last: 103 },
    // E1 - G7
    88: { first: 21, last: 108 }
    // A0 - C8
  };
  var KEYBOARD_SIZES = [61, 73, 76, 88];
  var BLACK_PITCH_CLASSES = /* @__PURE__ */ new Set([1, 3, 6, 8, 10]);
  function isBlackKey(midi) {
    return BLACK_PITCH_CLASSES.has((midi % 12 + 12) % 12);
  }
  function keyboardRange(size) {
    return KEYBOARD_RANGES[size] ?? KEYBOARD_RANGES[88];
  }
  var BLACK_WIDTH = 0.62;
  var BLACK_HEIGHT = 0.62;
  function keyboardGeometry(size, box) {
    const { first, last } = typeof size === "number" ? keyboardRange(size) : size;
    const originX = box.x ?? 0;
    const originY = box.y ?? 0;
    const whites = [];
    for (let midi = first; midi <= last; midi++) {
      if (!isBlackKey(midi)) whites.push(midi);
    }
    if (whites.length === 0 || !(box.width > 0) || !(box.height > 0)) return [];
    const whiteWidth = box.width / whites.length;
    const whiteX = /* @__PURE__ */ new Map();
    whites.forEach((midi, index) => whiteX.set(midi, originX + index * whiteWidth));
    const keys = [];
    for (const midi of whites) {
      keys.push({
        midi,
        black: false,
        x: whiteX.get(midi) ?? originX,
        y: originY,
        width: whiteWidth,
        height: box.height
      });
    }
    const blackWidth = whiteWidth * BLACK_WIDTH;
    for (let midi = first; midi <= last; midi++) {
      if (!isBlackKey(midi)) continue;
      const rightWhite = whiteX.get(midi + 1);
      if (rightWhite === void 0) continue;
      keys.push({
        midi,
        black: true,
        x: rightWhite - blackWidth / 2,
        y: originY,
        width: blackWidth,
        height: box.height * BLACK_HEIGHT
      });
    }
    return keys;
  }
  function whiteKeyCount(size) {
    const { first, last } = keyboardRange(size);
    let count = 0;
    for (let midi = first; midi <= last; midi++) {
      if (!isBlackKey(midi)) count++;
    }
    return count;
  }
  function pressedAt(notes, seconds) {
    const down = /* @__PURE__ */ new Map();
    for (const note of notes) {
      if (note.startSeconds > seconds || note.endSeconds <= seconds) continue;
      if (note.hand === "right" || !down.has(note.midi)) down.set(note.midi, note.hand);
    }
    return down;
  }

  // src/color.ts
  function parseColor(value) {
    const text2 = value.trim();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text2);
    if (hex) {
      const digits = hex[1] ?? "";
      const full = digits.length === 3 ? digits.split("").map((d) => d + d).join("") : digits;
      return {
        r: Number.parseInt(full.slice(0, 2), 16),
        g: Number.parseInt(full.slice(2, 4), 16),
        b: Number.parseInt(full.slice(4, 6), 16)
      };
    }
    const rgb = /^rgba?\(([^)]+)\)$/i.exec(text2);
    if (rgb) {
      const parts = (rgb[1] ?? "").split(/[,/\s]+/).filter((p) => p.length > 0);
      const [r, g, b] = parts.map((p) => Number.parseFloat(p));
      if ([r, g, b].every((n2) => Number.isFinite(n2))) {
        return { r, g, b };
      }
    }
    return null;
  }
  function darken(value, amount) {
    const rgb = parseColor(value);
    if (rgb === null) return value;
    const keep = Math.max(0, Math.min(1, 1 - amount));
    const channel = (c) => Math.max(0, Math.min(255, Math.round(c * keep)));
    return `rgb(${channel(rgb.r)}, ${channel(rgb.g)}, ${channel(rgb.b)})`;
  }

  // src/fingering.ts
  var FINGERS = [1, 2, 3, 4, 5];
  function whiteIndex(midi) {
    const WHITES_BELOW_C = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
    const octave = Math.floor(midi / 12);
    const step = (midi % 12 + 12) % 12;
    return octave * 7 + (WHITES_BELOW_C[step] ?? 0);
  }
  var SPAN = 5;
  function fingerAt(hand, anchor, white) {
    return hand === "right" ? white - anchor + 1 : anchor - white + 1;
  }
  function anchorFor(hand, white, finger) {
    return hand === "right" ? white - finger + 1 : white + finger - 1;
  }
  function groupByStart(notes) {
    const byStart = /* @__PURE__ */ new Map();
    for (const note of notes) {
      const key = Math.round(note.startSeconds * 100);
      const group = byStart.get(key);
      if (group === void 0) byStart.set(key, [note]);
      else group.push(note);
    }
    return [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
  }
  function spreadFingers(count) {
    const sets = {
      1: [3],
      2: [1, 5],
      3: [1, 3, 5],
      4: [1, 2, 3, 5],
      5: [1, 2, 3, 4, 5]
    };
    const set = sets[count];
    if (set !== void 0) return set;
    const out = [];
    for (let i = 0; i < count; i += 1) out.push(Math.min(5, i + 1));
    return out;
  }
  function fingersForChord(hand, anchor, chord) {
    const order = [...chord].sort((a, b) => hand === "right" ? a.midi - b.midi : b.midi - a.midi);
    let out = [];
    let lowest = 0;
    let fits = true;
    for (const note of order) {
      const wanted = fingerAt(hand, anchor, whiteIndex(note.midi));
      const finger = Math.min(5, Math.max(lowest + 1, Math.max(1, Math.round(wanted))));
      if (finger <= lowest) {
        fits = false;
        break;
      }
      out.push(finger);
      lowest = finger;
    }
    if (!fits || out.length !== order.length) out = spreadFingers(order.length);
    const byNote = /* @__PURE__ */ new Map();
    order.forEach((note, i) => byNote.set(note, out[i] ?? 3));
    return chord.map((note) => byNote.get(note) ?? 3);
  }
  function handSpan(chords) {
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    for (const chord of chords) {
      for (const note of chord) {
        const white = whiteIndex(note.midi);
        if (white < low) low = white;
        if (white > high) high = white;
      }
    }
    return { low, high };
  }
  function anchorForSpan(hand, low, high) {
    if (high - low >= SPAN) return anchorFor(hand, hand === "right" ? low : high, 1);
    return anchorFor(hand, (low + high) / 2, 3);
  }
  function planFingering(notes) {
    const fingered = [];
    const anchors = { left: [], right: [] };
    for (const hand of ["left", "right"]) {
      const mine = notes.filter((note) => note.hand === hand);
      if (mine.length === 0) continue;
      const groups = groupByStart(mine);
      let from = 0;
      while (from < groups.length) {
        let to = from;
        let { low, high } = handSpan([groups[from] ?? []]);
        while (to + 1 < groups.length) {
          const next = handSpan([groups[to + 1] ?? []]);
          const wide = Math.max(high, next.high) - Math.min(low, next.low);
          if (wide >= SPAN) break;
          low = Math.min(low, next.low);
          high = Math.max(high, next.high);
          to += 1;
        }
        const anchor = anchorForSpan(hand, low, high);
        const first = groups[from]?.[0]?.startSeconds ?? 0;
        anchors[hand].push({ seconds: first, anchor });
        for (let i = from; i <= to; i += 1) {
          const chord = groups[i] ?? [];
          const fingers = fingersForChord(hand, anchor, chord);
          chord.forEach((note, n2) => fingered.push({ ...note, finger: fingers[n2] ?? 3 }));
        }
        from = to + 1;
      }
    }
    fingered.sort((a, b) => a.startSeconds - b.startSeconds || a.midi - b.midi);
    return { notes: fingered, anchors: { left: anchors.left, right: anchors.right } };
  }
  function anchorAt(path2, seconds, travelSeconds = 0.18) {
    if (path2.length === 0) return void 0;
    const first = path2[0];
    if (first === void 0) return void 0;
    if (seconds <= first.seconds) return first.anchor;
    let previous = first;
    for (const step of path2) {
      if (step.seconds > seconds) {
        if (step.anchor === previous.anchor) return previous.anchor;
        const start = step.seconds - travelSeconds;
        if (seconds <= start) return previous.anchor;
        const t = (seconds - start) / travelSeconds;
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        return previous.anchor + (step.anchor - previous.anchor) * eased;
      }
      previous = step;
    }
    return previous.anchor;
  }
  function fingersDownAt(notes, hand, seconds) {
    const down = /* @__PURE__ */ new Map();
    for (const note of notes) {
      if (note.hand !== hand) continue;
      if (note.startSeconds > seconds || note.endSeconds <= seconds) continue;
      const held = down.get(note.finger);
      if (held === void 0 || isBlackKey(note.midi) && !isBlackKey(held)) {
        down.set(note.finger, note.midi);
      }
    }
    return down;
  }

  // src/hand/anatomy.ts
  var PALM_WIDTH = 3.6;
  var PALM_LENGTH = 3.3;
  var KNUCKLE_FROM_FRONT = 1.95;
  var HEEL_BULGE = 0.75;
  var REACH_PAST_KEYS = PALM_LENGTH - KNUCKLE_FROM_FRONT + HEEL_BULGE;
  var FINGERS2 = {
    1: { length: 2.5, thick: 0.86, curl: 0.1, stretch: 1.3, splay: 0.8 },
    // thumb
    2: { length: 2.75, thick: 0.66, curl: 0.08, stretch: 1.18, splay: 0.4 },
    // index
    3: { length: 3, thick: 0.68, curl: 0.08, stretch: 1.18, splay: 0.34 },
    // middle
    4: { length: 2.85, thick: 0.64, curl: 0.09, stretch: 1.18, splay: 0.4 },
    // ring
    5: { length: 2.35, thick: 0.58, curl: 0.1, stretch: 1.2, splay: 0.52 }
    // little
  };
  var ALL_FINGERS = [1, 2, 3, 4, 5];
  var MAX_TURN = 0.32;
  function knuckle(finger, side2) {
    if (finger === 1) return { x: side2 * (PALM_WIDTH * 0.5 + 0.05), y: 1.35 };
    const spacing = PALM_WIDTH * 0.86 / 3;
    const across = -side2 * (finger - 3.5) * spacing;
    const arch = -0.16 * (1 - Math.abs(finger - 3.5) / 1.5);
    return { x: across, y: arch };
  }

  // src/hand/pose.ts
  var PLAYING_WEIGHT = 4;
  function rotate(point, turn) {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
  }
  function restingTip(finger, side2) {
    const base = knuckle(finger, side2);
    const shape = FINGERS2[finger];
    if (finger === 1) {
      return { x: base.x + side2 * shape.length * 0.28, y: base.y - shape.length * 0.9 };
    }
    return { x: base.x * 0.93, y: base.y - shape.length * (1 - shape.curl) };
  }
  function solvePose(targets, side2, unit2, centreY) {
    let sw = 0;
    let swPy = 0;
    let swPyPy = 0;
    let swA = 0;
    let swPyA = 0;
    for (const target of targets) {
      const tip = restingTip(target.finger, side2);
      const px = tip.x * unit2;
      const py = tip.y * unit2;
      const a = target.x - px;
      const w = target.playing ? PLAYING_WEIGHT : 1;
      sw += w;
      swPy += w * py;
      swPyPy += w * py * py;
      swA += w * a;
      swPyA += w * py * a;
    }
    if (sw === 0) return { x: 0, y: centreY, turn: 0, unit: unit2, side: side2 };
    const det = sw * swPyPy - swPy * swPy;
    let x = swA / sw;
    let turn = 0;
    if (Math.abs(det) > 1e-9) {
      x = (swA * swPyPy - swPy * swPyA) / det;
      turn = (sw * -swPyA + swPy * swA) / det;
    }
    return { x, y: centreY, turn: Math.max(-MAX_TURN, Math.min(MAX_TURN, turn)), unit: unit2, side: side2 };
  }
  function poseFingers(pose, targets) {
    const byFinger = new Map(targets.map((t) => [t.finger, t]));
    const out = [];
    for (const finger of ALL_FINGERS) {
      const target = byFinger.get(finger);
      if (target === void 0) continue;
      const shape = FINGERS2[finger];
      const base = rotate(knuckle(finger, pose.side), pose.turn);
      const origin = {
        x: pose.x + base.x * pose.unit,
        y: pose.y + base.y * pose.unit
      };
      const rest = rotate(restingTip(finger, pose.side), pose.turn);
      const restAt = { x: pose.x + rest.x * pose.unit, y: pose.y + rest.y * pose.unit };
      const own = Math.atan2(restAt.y - origin.y, restAt.x - origin.x);
      const ownLength = Math.hypot(restAt.x - origin.x, restAt.y - origin.y);
      const wantY = target.depth ?? restAt.y;
      let angle = Math.atan2(wantY - origin.y, target.x - origin.x);
      let length = Math.hypot(target.x - origin.x, wantY - origin.y);
      let swing = angle - own;
      while (swing > Math.PI) swing -= Math.PI * 2;
      while (swing < -Math.PI) swing += Math.PI * 2;
      angle = own + Math.max(-shape.splay, Math.min(shape.splay, swing));
      const full = shape.length * pose.unit;
      length = Math.max(
        full * (1 - shape.curl * 1.6),
        Math.min(length, Math.max(ownLength, full * shape.stretch))
      );
      out.push({
        finger,
        knuckle: origin,
        tip: { x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length },
        thick: shape.thick * pose.unit,
        playing: target.playing,
        ...target.midi !== void 0 ? { midi: target.midi } : {},
        ...target.onBlack !== void 0 ? { onBlack: target.onBlack } : {}
      });
    }
    return out;
  }
  function poseHeel(pose, length) {
    const point = rotate({ x: 0, y: length }, pose.turn);
    return { x: pose.x + point.x * pose.unit, y: pose.y + point.y * pose.unit };
  }
  function poseAxis(pose) {
    return { x: Math.sin(pose.turn), y: -Math.cos(pose.turn) };
  }

  // src/hand/draw.ts
  function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }
  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }
  function mul(a, k) {
    return { x: a.x * k, y: a.y * k };
  }
  function unit(a) {
    const n2 = Math.hypot(a.x, a.y) || 1;
    return { x: a.x / n2, y: a.y / n2 };
  }
  function perp(a) {
    return { x: -a.y, y: a.x };
  }
  function lerp(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  function at(p) {
    return `${round(p.x)} ${round(p.y)}`;
  }
  function round(v) {
    return Math.round(v * 100) / 100;
  }
  function shaft(finger) {
    const along = unit(sub(finger.tip, finger.knuckle));
    return {
      from: finger.knuckle,
      to: finger.tip,
      along,
      across: perp(along),
      // A finger is widest at the knuckle and narrowest at the nail.
      halfBase: finger.thick / 2 * 1.08,
      halfTip: finger.thick / 2 * 0.84
    };
  }
  var side = (s, which, end) => add(s[end], mul(s.across, which * (end === "from" ? s.halfBase : s.halfTip)));
  var WEB = 0.46;
  var NAIL_FROM_TIP = 0.3;
  var NAIL_WIDTH = 0.62;
  function drawHand(pose, fingers, options = {}) {
    const four = fingers.filter((f) => f.finger !== 1).map((f) => ({ finger: f, shaft: shaft(f) })).sort((a, b) => a.shaft.to.x - b.shaft.to.x);
    if (four.length === 0) return { outline: "", thumb: void 0, creases: [], nails: [] };
    const axis = poseAxis(pose);
    const heel = poseHeel(pose, PALM_LENGTH);
    const half = PALM_WIDTH / 2 * pose.unit;
    const sideways = perp(axis);
    const parts = [];
    const creases = [];
    const first = four[0];
    const last = four[four.length - 1];
    const startPoint = side(first.shaft, -1, "from");
    parts.push(`M ${at(startPoint)}`);
    four.forEach((entry, i) => {
      const s = entry.shaft;
      const leftBase = side(s, -1, "from");
      const leftTip = side(s, -1, "to");
      const rightTip = side(s, 1, "to");
      const rightBase = side(s, 1, "from");
      if (i > 0) {
        const previous = four[i - 1];
        const fromSide = side(previous.shaft, 1, "from");
        const toSide = leftBase;
        const depth = Math.min(
          Math.hypot(
            previous.shaft.to.x - previous.shaft.from.x,
            previous.shaft.to.y - previous.shaft.from.y
          ),
          Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y)
        );
        const webFrom = add(side(previous.shaft, 1, "from"), mul(previous.shaft.along, depth * WEB));
        const webTo = add(leftBase, mul(s.along, depth * WEB));
        const valley = lerp(webFrom, webTo, 0.5);
        parts.push(`L ${at(webFrom)}`);
        parts.push(`Q ${at(valley)} ${at(webTo)}`);
        if (options.creases !== false) {
          const end = add(lerp(fromSide, toSide, 0.5), mul(axis, -depth * 0.12));
          creases.push(`M ${at(valley)} Q ${at(lerp(valley, end, 0.55))} ${at(end)}`);
        }
      }
      parts.push(i === 0 ? `L ${at(leftTip)}` : `L ${at(leftTip)}`);
      parts.push(`A ${round(s.halfTip * 1.08)} ${round(s.halfTip)} 0 0 1 ${at(rightTip)}`);
      if (i === four.length - 1) parts.push(`L ${at(rightBase)}`);
    });
    const rightEdge = add(heel, mul(sideways, half * 0.82));
    const leftEdge = add(heel, mul(sideways, -half * 0.82));
    const rightShoulder = add(
      add(last.shaft.from, mul(sideways, half * 0.18)),
      mul(axis, -pose.unit * 0.1)
    );
    const leftShoulder = add(
      add(first.shaft.from, mul(sideways, -half * 0.18)),
      mul(axis, -pose.unit * 0.1)
    );
    parts.push(
      `C ${at(rightShoulder)} ${at(add(rightEdge, mul(axis, half * 0.5)))} ${at(rightEdge)}`
    );
    const bulge = mul(axis, -HEEL_BULGE * pose.unit * 1.34);
    parts.push(`C ${at(add(rightEdge, bulge))} ${at(add(leftEdge, bulge))} ${at(leftEdge)}`);
    parts.push(`C ${at(add(leftEdge, mul(axis, half * 0.5)))} ${at(leftShoulder)} ${at(startPoint)}`);
    parts.push("Z");
    const thumbFinger = fingers.find((f) => f.finger === 1);
    const thumb = thumbFinger === void 0 ? void 0 : (() => {
      const s = shaft(thumbFinger);
      const bend = add(lerp(s.from, s.to, 0.5), mul(s.across, s.halfBase * 0.5));
      return { path: `M ${at(s.from)} Q ${at(bend)} ${at(s.to)}`, width: thumbFinger.thick };
    })();
    const nails = options.nails === false ? [] : fingers.map((finger) => {
      const s = shaft(finger);
      const centre = add(s.to, mul(s.along, -s.halfTip * NAIL_FROM_TIP * 2));
      const w = s.halfTip * NAIL_WIDTH;
      const h = s.halfTip * 0.95;
      const a = add(centre, mul(s.across, -w));
      const b = add(centre, mul(s.across, w));
      return {
        path: `M ${at(a)} A ${round(w)} ${round(h)} 0 0 1 ${at(b)} A ${round(w)} ${round(h)} 0 0 1 ${at(a)} Z`
      };
    });
    return { outline: parts.join(" "), thumb, creases, nails };
  }

  // src/hands.ts
  var BLACK_TIP_DEPTH = 0.45;
  var DEFAULT_HAND_COLORS = {
    left: { skin: "#E8C6A0", edge: "#B3800E", tip: "#FFC400" },
    right: { skin: "#E8C6A0", edge: "#2E6DA8", tip: "#4FA3FF" }
  };
  function handColorsFor(colors) {
    const skin = colors.skin ?? DEFAULT_HAND_COLORS.left.skin;
    return {
      left: { skin, edge: darken(colors.leftHand, 0.42), tip: colors.leftHand },
      right: { skin, edge: darken(colors.rightHand, 0.42), tip: colors.rightHand }
    };
  }
  function whiteKeys(keys) {
    return keys.filter((key) => !key.black).sort((a, b) => a.x - b.x);
  }
  function xAtWhite(whites, index) {
    if (whites.length === 0) return void 0;
    const clamped = Math.max(0, Math.min(whites.length - 1, index));
    const low = whites[Math.floor(clamped)];
    const high = whites[Math.min(whites.length - 1, Math.ceil(clamped))];
    if (low === void 0 || high === void 0) return void 0;
    const t = clamped - Math.floor(clamped);
    return low.x + low.width / 2 + (high.x + high.width / 2 - (low.x + low.width / 2)) * t;
  }
  function whiteIndexOfKey(midi) {
    const WHITES_BELOW_C = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
    const octave = Math.floor(midi / 12);
    const step = (midi % 12 + 12) % 12;
    return octave * 7 + (WHITES_BELOW_C[step] ?? 0);
  }
  function round2(value) {
    return Math.round(value * 100) / 100;
  }
  function settingFor(hand, options) {
    const keys = keyboardGeometry(options.size, options.board);
    const whites = whiteKeys(keys);
    const firstWhite = whites[0];
    if (firstWhite === void 0) return void 0;
    const anchorWhite = anchorAt(options.anchors[hand], options.seconds);
    if (anchorWhite === void 0) return void 0;
    const offset = whiteIndexOfKey(firstWhite.midi);
    const board = options.board;
    const unit2 = firstWhite.width * (options.scale ?? 1);
    const down = fingersDownAt(options.notes, hand, options.seconds);
    const byMidi = new Map(keys.map((key) => [key.midi, key]));
    const targets = [];
    for (const finger of ALL_FINGERS) {
      const held = down.get(finger);
      const key = held === void 0 ? void 0 : byMidi.get(held);
      if (key !== void 0) {
        targets.push({
          finger,
          x: key.x + key.width / 2,
          playing: true,
          midi: held,
          onBlack: key.black,
          // A black key is shorter and set further back: a finger on one
          // has to be ON it, not out in front of where it ends.
          ...key.black ? { depth: board.y + board.height * BLACK_TIP_DEPTH } : {}
        });
        continue;
      }
      const resting = hand === "right" ? anchorWhite + (finger - 1) : anchorWhite - (finger - 1);
      const x = xAtWhite(whites, resting - offset);
      if (x === void 0) continue;
      targets.push({ finger, x, playing: false });
    }
    if (targets.length === 0) return void 0;
    return {
      targets,
      unit: unit2,
      // A player's hand rests a fixed distance in from the front edge of
      // the keys. The keys being long or short behind it changes nothing.
      centreY: board.y + board.height - unit2 * KNUCKLE_FROM_FRONT,
      side: hand === "right" ? -1 : 1
    };
  }
  function posedFor(hand, options) {
    const setting = settingFor(hand, options);
    if (setting === void 0) return [];
    const pose = solvePose(setting.targets, setting.side, setting.unit, setting.centreY);
    return poseFingers(pose, setting.targets);
  }
  function handFingertips(hand, options) {
    return posedFor(hand, options).map((finger) => ({
      finger: finger.finger,
      x: finger.tip.x,
      y: finger.tip.y,
      pressed: finger.playing,
      onBlack: finger.onBlack ?? false,
      ...finger.midi !== void 0 ? { midi: finger.midi } : {}
    }));
  }
  function handShapes(hand, options) {
    const setting = settingFor(hand, options);
    if (setting === void 0) return [];
    const pose = solvePose(setting.targets, setting.side, setting.unit, setting.centreY);
    const fingers = poseFingers(pose, setting.targets);
    if (fingers.length === 0) return [];
    const drawing = drawHand(pose, fingers);
    if (drawing.outline === "") return [];
    const colors = options.colors[hand];
    const unit2 = setting.unit;
    const grow = unit2 * 0.07;
    const shapes = [];
    const pass = (fill, extra) => {
      shapes.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill,
        ...extra > 0 ? { stroke: fill, strokeWidth: round2(extra * 2) } : {},
        path: drawing.outline
      });
      if (drawing.thumb !== void 0) {
        shapes.push({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          fill: "none",
          stroke: fill,
          strokeWidth: round2(drawing.thumb.width + extra * 2),
          path: drawing.thumb.path
        });
      }
    };
    pass(colors.edge, grow);
    pass(colors.skin, 0);
    for (const crease of drawing.creases) {
      shapes.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: "none",
        stroke: darken(colors.skin, 0.2),
        strokeWidth: round2(unit2 * 0.045),
        path: crease
      });
    }
    for (const nail of drawing.nails) {
      shapes.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: darken(colors.skin, 0.1),
        path: nail.path
      });
    }
    if (options.fingerNumbers !== false) {
      for (const finger of fingers) {
        if (!finger.playing) continue;
        const badge = unit2 * 0.34;
        shapes.push({
          x: round2(finger.tip.x - badge),
          y: round2(finger.tip.y + unit2 * 0.95 - badge),
          width: round2(badge * 2),
          height: round2(badge * 2),
          fill: colors.tip,
          stroke: colors.edge,
          strokeWidth: round2(unit2 * 0.07),
          radius: round2(badge),
          label: String(finger.finger),
          labelSize: round2(badge * 1.35),
          labelColor: colors.edge
        });
      }
    }
    return shapes;
  }
  function handsShapes(options) {
    return [...handShapes("left", options), ...handShapes("right", options)];
  }
  var HAND_REACH_PAST_KEYS = PALM_LENGTH - KNUCKLE_FROM_FRONT;

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
  function path(d, values = {}) {
    return tag("path", { d, ...values });
  }
  function text(value, x, y, values = {}) {
    if (value === "") return "";
    return wrap("text", { x, y, ...values }, escapeText(value));
  }

  // src/stage.ts
  var DEFAULT_COLORS = {
    whiteKey: "#F7F4F0",
    blackKey: "#141010",
    keyEdge: "#2A2320",
    strikeLine: "#C81E2C",
    // Faint: the grid is there to be read PAST. A line as strong as a
    // note would compete with the thing it is meant to place.
    barLine: "rgba(255,255,255,0.34)",
    beatLine: "rgba(255,255,255,0.16)",
    leftHand: "#FFC400",
    rightHand: "#4FA3FF",
    background: "none",
    // Dark on a white key, and faint: it is a ruler mark, not a label to
    // be read instead of the music.
    keyName: "rgba(30,21,18,0.38)"
  };
  var DEFAULT_LEAD_SECONDS = 2.5;
  var FADE_FRACTION = 0.38;
  var FADE_STRENGTH = 0.88;
  var FADE_BANDS = 18;
  var BAR_LINE_FRACTION = 7e-3;
  var BEAT_LINE_FRACTION = 35e-4;
  var LABEL_FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  var KEYBOARD_FRACTION = 1 / 3;
  var KEY_DEPTH = 7;
  var HAND_BAND = REACH_PAST_KEYS + 0.25;
  var LINE_FRACTION = 0.05;
  function resolveColors(colors) {
    return { ...DEFAULT_COLORS, ...colors ?? {} };
  }
  function keyboardBox(options) {
    if (options.design === "hands") return handsKeyboardBox(options);
    const height = options.keyboardHeight !== void 0 && options.keyboardHeight > 0 ? Math.min(options.keyboardHeight, options.height) : options.height * KEYBOARD_FRACTION;
    return { x: 0, y: options.height - height, width: options.width, height };
  }
  function handsKeyboardBox(options) {
    const unit2 = options.width / whiteKeyCount(options.size ?? 88);
    const band = unit2 * HAND_BAND;
    const asked = options.keyboardHeight !== void 0 && options.keyboardHeight > 0 ? Math.min(options.keyboardHeight, options.height) : Math.max(options.height * 0.55, options.height - band);
    const depth = Math.max(1, Math.min(unit2 * KEY_DEPTH, asked, options.height));
    const group = Math.min(options.height, depth + band);
    return {
      x: 0,
      y: Math.max(0, options.height - group),
      width: options.width,
      height: depth
    };
  }
  function fallingBars(notes, options) {
    const lead = options.leadSeconds !== void 0 && options.leadSeconds > 0 ? options.leadSeconds : DEFAULT_LEAD_SECONDS;
    const board = keyboardBox(options);
    const fallHeight = board.y;
    if (!(fallHeight > 0)) return [];
    const perSecond = fallHeight / lead;
    const keys = keyboardGeometry(options.size, {
      width: options.width,
      height: board.height
    });
    const keyByMidi = /* @__PURE__ */ new Map();
    for (const key of keys) keyByMidi.set(key.midi, key);
    const bars = [];
    for (const note of notes) {
      const untilStart = note.startSeconds - options.seconds;
      if (untilStart > lead) continue;
      if (note.endSeconds <= options.seconds) continue;
      const key = keyByMidi.get(note.midi);
      if (key === void 0) continue;
      const bottom = board.y - untilStart * perSecond;
      const top = board.y - (note.endSeconds - options.seconds) * perSecond;
      const clippedTop = Math.max(0, top);
      const clippedBottom = Math.min(board.y, bottom);
      const height = clippedBottom - clippedTop;
      if (!(height > 0)) continue;
      bars.push({
        midi: note.midi,
        hand: note.hand,
        x: key.x,
        y: clippedTop,
        width: key.width,
        height
      });
    }
    return bars;
  }
  function gridShapes(lines, options) {
    const colors = resolveColors(options.colors);
    const lead = options.leadSeconds !== void 0 && options.leadSeconds > 0 ? options.leadSeconds : DEFAULT_LEAD_SECONDS;
    const board = keyboardBox(options);
    const fallHeight = board.y;
    if (!(fallHeight > 0)) return [];
    const perSecond = fallHeight / lead;
    const barThickness = Math.max(1.5, options.height * BAR_LINE_FRACTION);
    const beatThickness = Math.max(1, options.height * BEAT_LINE_FRACTION);
    const shapes = [];
    for (const line of lines) {
      const until = line.seconds - options.seconds;
      if (until > lead || until < 0) continue;
      const thickness = line.kind === "bar" ? barThickness : beatThickness;
      const y = board.y - until * perSecond - thickness / 2;
      if (y + thickness < 0 || y > board.y) continue;
      shapes.push({
        x: 0,
        y,
        width: options.width,
        height: thickness,
        fill: line.kind === "bar" ? colors.barLine : colors.beatLine
      });
    }
    return shapes;
  }
  function fadeShapes(options) {
    const fade = options.fade;
    if (!fade) return [];
    const rgb = parseColor(fade.color);
    if (!rgb) return [];
    const board = keyboardBox(options);
    const fallHeight = board.y;
    if (!(fallHeight > 0)) return [];
    const fraction = fade.fraction !== void 0 && fade.fraction > 0 ? Math.min(1, fade.fraction) : FADE_FRACTION;
    const strength = fade.strength !== void 0 ? Math.max(0, Math.min(1, fade.strength)) : FADE_STRENGTH;
    const bandHeight = fallHeight * fraction / FADE_BANDS;
    if (!(bandHeight > 0)) return [];
    const shapes = [];
    for (let i = 0; i < FADE_BANDS; i++) {
      const alpha = strength * (1 - i / FADE_BANDS);
      if (alpha <= 2e-3) continue;
      shapes.push({
        x: 0,
        y: i * bandHeight,
        width: options.width,
        // A hair of overlap, so no seam shows between bands.
        height: bandHeight + 0.5,
        fill: `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${alpha.toFixed(3)})`
      });
    }
    return shapes;
  }
  function handColor(hand, colors) {
    return hand === "left" ? colors.leftHand : colors.rightHand;
  }
  function stageShapes(options) {
    const colors = resolveColors(options.colors);
    const notes = options.notes ?? [];
    const design = options.design ?? "falling-notes";
    const falling = design === "falling-notes";
    const board = keyboardBox(options);
    const keys = keyboardGeometry(options.size, board);
    const down = pressedAt(notes, options.seconds);
    const lineHeight = Math.max(1, board.height * LINE_FRACTION);
    const edge = Math.max(0.5, board.width / 900);
    const shapes = [];
    if (colors.background !== "none") {
      shapes.push({
        x: 0,
        y: 0,
        width: options.width,
        height: options.height,
        fill: colors.background
      });
    }
    if (falling) {
      for (const shape of gridShapes(options.gridLines ?? [], options)) shapes.push(shape);
      for (const bar of fallingBars(notes, options)) {
        shapes.push({
          x: bar.x,
          y: bar.y,
          width: bar.width,
          height: bar.height,
          fill: handColor(bar.hand, colors),
          radius: Math.min(bar.width, bar.height) / 4
        });
      }
      for (const shape of fadeShapes(options)) shapes.push(shape);
    }
    const fillFor = (key) => {
      const hand = down.get(key.midi);
      if (hand !== void 0) return handColor(hand, colors);
      return key.black ? colors.blackKey : colors.whiteKey;
    };
    for (const key of keys) {
      if (key.black) continue;
      shapes.push({
        x: key.x,
        y: key.y,
        width: key.width,
        height: key.height,
        fill: fillFor(key),
        stroke: colors.keyEdge,
        strokeWidth: edge
      });
    }
    for (const key of keys) {
      if (!key.black) continue;
      shapes.push({
        x: key.x,
        y: key.y,
        width: key.width,
        height: key.height,
        fill: fillFor(key)
      });
    }
    if (!falling && options.keyNames !== false) {
      const unit2 = board.width / Math.max(1, keys.filter((key) => !key.black).length);
      const size = Math.max(6, unit2 * 0.46);
      for (const key of keys) {
        if (key.black || key.midi % 12 !== 0) continue;
        shapes.push({
          x: key.x,
          y: key.y + key.height - size * 2.1,
          width: key.width,
          height: size * 1.4,
          fill: "none",
          label: `C${Math.floor(key.midi / 12) - 1}`,
          labelSize: round22(size),
          labelColor: colors.keyName
        });
      }
    }
    if (falling) {
      shapes.push({
        x: 0,
        y: board.y - lineHeight / 2,
        width: options.width,
        height: lineHeight,
        fill: colors.strikeLine
      });
    }
    if (!falling && options.hands !== void 0) {
      for (const shape of handsShapes({
        size: options.size,
        board,
        seconds: options.seconds,
        notes: options.hands.notes,
        anchors: options.hands.anchors,
        colors: options.hands.colors ?? DEFAULT_HAND_COLORS,
        ...options.hands.scale !== void 0 ? { scale: options.hands.scale } : {},
        ...options.hands.fingerNumbers !== void 0 ? { fingerNumbers: options.hands.fingerNumbers } : {}
      })) {
        shapes.push(shape);
      }
    }
    return shapes;
  }
  function round22(value) {
    return Math.round(value * 100) / 100;
  }
  function shapesToSvg(shapes, width, height) {
    const body = shapes.map(
      (shape) => shape.path !== void 0 ? path(shape.path, {
        fill: shape.fill,
        ...shape.stroke !== void 0 ? { stroke: shape.stroke } : {},
        ...shape.strokeWidth !== void 0 ? { "stroke-width": shape.strokeWidth } : {},
        // Round, because a finger ends in a fingertip. A butt cap
        // is what makes a stroked finger read as a stick.
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      }) : rect(shape.x, shape.y, shape.width, shape.height, {
        fill: shape.fill,
        ...shape.stroke !== void 0 ? { stroke: shape.stroke } : {},
        ...shape.strokeWidth !== void 0 ? { "stroke-width": shape.strokeWidth } : {},
        ...shape.radius !== void 0 && shape.radius > 0 ? { rx: shape.radius } : {}
      }) + // A label is drawn ON its own shape, centred in its box, so
      // one entry in the list is one thing on the screen rather
      // than a badge and a number that could come apart.
      (shape.label !== void 0 ? text(shape.label, shape.x + shape.width / 2, shape.y + shape.height / 2, {
        fill: shape.labelColor ?? shape.fill,
        "font-size": shape.labelSize ?? shape.height * 0.7,
        "font-family": LABEL_FONT,
        "font-weight": 700,
        "text-anchor": "middle",
        "dominant-baseline": "central"
      }) : "")
    ).join("");
    return wrap(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${n(width)} ${n(height)}`,
        width,
        height,
        preserveAspectRatio: "none"
      },
      body
    );
  }
  function renderPianoStage(options) {
    return shapesToSvg(stageShapes(options), options.width, options.height);
  }
  function renderKeyboardSvg(options) {
    return renderPianoStage({ ...options, seconds: 0, notes: [] });
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=piano-engine.js.map
