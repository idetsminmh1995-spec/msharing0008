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
    noteName: () => noteName,
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
  var NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
  ];
  function noteName(midi, options) {
    const name = NOTE_NAMES[(midi % 12 + 12) % 12] ?? "";
    if (options?.octave !== true) return name;
    return `${name}${Math.floor(midi / 12) - 1}`;
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
  var ALL_FINGERS = [1, 2, 3, 4, 5];
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

  // src/hand/artwork.ts
  var HAND_OUTLINE = [
    ["M", -0.2133, -4.3908],
    ["C", -0.2133, -4.3908, -0.0117, -4.4083, -0.0117, -4.4083],
    ["C", -92e-4, -4.5483, 0.1292, -5.0967, 0.1567, -5.4525],
    ["C", 0.1825, -5.7908, 0.3158, -6.1208, 0.3558, -6.465],
    ["C", 0.3967, -6.815, 0.4, -7.2592, 0.5875, -7.4675],
    ["C", 0.7017, -7.595, 0.8983, -7.6433, 1.0575, -7.5317],
    ["C", 1.2083, -7.4258, 1.2033, -7.2475, 1.1992, -6.9925],
    ["C", 1.1858, -6.2392, 1.0142, -5.2992, 0.9192, -4.5433],
    ["C", 0.9108, -4.4733, 0.8908, -4.3875, 0.8925, -4.2767],
    ["C", 0.895, -4.0525, 1.0108, -3.4733, 1.0858, -3.2733],
    ["C", 1.2908, -2.7258, 1.59, -3.2642, 1.6967, -3.5258],
    ["C", 1.9333, -4.1083, 2.3783, -4.7092, 3.0825, -4.645],
    ["C", 3.1817, -4.6358, 3.2825, -4.6117, 3.3225, -4.5042],
    ["C", 3.4158, -4.2517, 3.2783, -4.0508, 3.12, -3.865],
    ["C", 2.4475, -3.0742, 2.455, -3.1258, 2.2467, -2.1375],
    ["C", 2.1142, -1.6367, 1.6967, -1.2492, 1.355, -0.8292],
    ["C", 1.15, -0.5767, 1.0858, -0.6058, 1.1583, -0.1825],
    ["C", 1.1892, -33e-4, 1.45, 1.4067, 1.6667, 2.5967],
    ["C", 1.6667, 2.5967, -0.9975, 2.5967, -0.9975, 2.5967],
    ["C", -1.0808, 1.395, -1.1817, -0.0425, -1.265, -0.2133],
    ["C", -1.265, -0.2133, -2.0725, -1.69, -2.0725, -1.69],
    ["C", -2.1883, -1.9458, -2.2908, -2.2792, -2.3542, -2.5592],
    ["C", -2.3542, -2.5592, -2.8558, -3.7583, -2.8558, -3.7583],
    ["C", -3.0583, -4.1125, -3.5733, -5.035, -3.5758, -5.35],
    ["C", -3.5783, -5.7033, -3.255, -5.7767, -3.0783, -5.5183],
    ["C", -2.7375, -5.02, -2.1317, -4.1683, -1.9592, -3.7708],
    ["C", -1.8183, -3.7858, -1.9592, -3.7667, -1.825, -3.8383],
    ["C", -1.825, -3.8383, -2.0142, -4.405, -2.0142, -4.405],
    ["C", -2.205, -4.9667, -2.3175, -5.6408, -2.49, -6.2817],
    ["C", -2.5525, -6.5142, -2.6683, -7.0533, -2.4217, -7.1667],
    ["C", -2.2742, -7.235, -2.0817, -7.1858, -1.9933, -7.095],
    ["C", -1.9042, -7.0033, -1.8642, -6.8375, -1.8317, -6.7],
    ["C", -1.6308, -5.8617, -1.3308, -5.1683, -1.1208, -4.3417],
    ["C", -1.1017, -4.3758, -1.1883, -6.9042, -1.2075, -7.0325],
    ["C", -1.37, -8.12, -0.5967, -8.1317, -0.485, -7.3108],
    ["C", -0.4308, -6.9142, -0.2792, -5.73, -0.2817, -5.3833],
    ["C", -0.2825, -5.0217, -0.2767, -4.685, -0.2133, -4.3908]
  ];
  var ARTWORK_TIPS = {
    1: { x: 3.35, y: -4.4167 },
    2: { x: 0.8667, y: -7.5917 },
    3: { x: -0.9, y: -7.8917 },
    4: { x: -2.2667, y: -7.2 },
    5: { x: -3.3333, y: -5.675 }
  };
  var ARTWORK_BOX = { minX: -3.58, maxX: 3.42, minY: -8.13, maxY: 2.6 };
  var PLAY_SCALE_X = 0.72;
  var PLAY_SCALE_Y = 0.5;
  var REACH_PAST_KEYS = ARTWORK_BOX.maxY * PLAY_SCALE_Y;
  var HAND_LENGTH = -ARTWORK_BOX.minY * PLAY_SCALE_Y;

  // src/hand/place.ts
  var PLAYING_WEIGHT = 10;
  var MAX_TURN = 0.32;
  var MIN_SPREAD = 0.8;
  var MAX_SPREAD = 1.45;
  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }
  function placeHand(targets, side, unit, centreY) {
    const rows = [];
    for (const target of targets) {
      const tip = ARTWORK_TIPS[target.finger];
      rows.push({
        b: [1, side * tip.x * PLAY_SCALE_X * unit, -tip.y * PLAY_SCALE_Y * unit],
        v: target.x,
        w: target.playing ? PLAYING_WEIGHT : 1
      });
    }
    if (rows.length === 0) {
      return { x: 0, y: centreY, turn: 0, spread: 1, unit, side };
    }
    const a = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    const rhs = [0, 0, 0];
    for (const row of rows) {
      for (let i = 0; i < 3; i++) {
        const bi = row.b[i] ?? 0;
        for (let j = 0; j < 3; j++) {
          const bj = row.b[j] ?? 0;
          a[i][j] = (a[i]?.[j] ?? 0) + row.w * bi * bj;
        }
        rhs[i] = (rhs[i] ?? 0) + row.w * bi * row.v;
      }
    }
    const solved = solve3(a, rhs);
    const spread = clamp(solved?.[1] ?? 1, MIN_SPREAD, MAX_SPREAD);
    const turn = clamp(solved?.[2] ?? 0, -MAX_TURN, MAX_TURN);
    let sw = 0;
    let sr = 0;
    for (const row of rows) {
      sw += row.w;
      sr += row.w * (row.v - spread * (row.b[1] ?? 0) - turn * (row.b[2] ?? 0));
    }
    const x = sw === 0 ? 0 : sr / sw;
    let y = centreY;
    for (const target of targets) {
      if (target.depth === void 0) continue;
      const tip = ARTWORK_TIPS[target.finger];
      y = Math.min(y, target.depth - tipOffsetY(tip, spread, turn, side, unit));
    }
    return { x, y, turn, spread, unit, side };
  }
  function tipOffsetY(tip, spread, turn, side, unit) {
    const px = side * spread * tip.x * PLAY_SCALE_X * unit;
    const py = tip.y * PLAY_SCALE_Y * unit;
    return px * Math.sin(turn) + py * Math.cos(turn);
  }
  function solve3(a, b) {
    const m = [
      [a[0]?.[0] ?? 0, a[0]?.[1] ?? 0, a[0]?.[2] ?? 0, b[0] ?? 0],
      [a[1]?.[0] ?? 0, a[1]?.[1] ?? 0, a[1]?.[2] ?? 0, b[1] ?? 0],
      [a[2]?.[0] ?? 0, a[2]?.[1] ?? 0, a[2]?.[2] ?? 0, b[2] ?? 0]
    ];
    for (let col = 0; col < 3; col++) {
      let pivot = col;
      for (let row = col + 1; row < 3; row++) {
        if (Math.abs(m[row]?.[col] ?? 0) > Math.abs(m[pivot]?.[col] ?? 0)) pivot = row;
      }
      if (Math.abs(m[pivot]?.[col] ?? 0) < 1e-9) return void 0;
      const tmp = m[col];
      m[col] = m[pivot];
      m[pivot] = tmp;
      const pivotRow = m[col];
      const pivotValue = pivotRow[col];
      for (let row = 0; row < 3; row++) {
        if (row === col) continue;
        const target = m[row];
        const factor = target[col] / pivotValue;
        for (let k = col; k < 4; k++) {
          target[k] = target[k] - factor * pivotRow[k];
        }
      }
    }
    return [
      (m[0]?.[3] ?? 0) / (m[0]?.[0] ?? 1),
      (m[1]?.[3] ?? 0) / (m[1]?.[1] ?? 1),
      (m[2]?.[3] ?? 0) / (m[2]?.[2] ?? 1)
    ];
  }
  function placedTip(placement, finger) {
    const tip = ARTWORK_TIPS[finger];
    return transformPoint(placement, tip.x, tip.y);
  }
  function transformPoint(placement, x, y) {
    const { unit, side, spread, turn } = placement;
    const px = side * spread * x * PLAY_SCALE_X * unit;
    const py = y * PLAY_SCALE_Y * unit;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    return {
      x: placement.x + px * cos - py * sin,
      y: placement.y + px * sin + py * cos
    };
  }

  // src/hand/draw.ts
  function round(value) {
    return Math.round(value * 100) / 100;
  }
  function handPath(placement) {
    const parts = [];
    for (const command of HAND_OUTLINE) {
      if (command[0] === "M") {
        const p = transformPoint(placement, command[1], command[2]);
        parts.push(`M ${round(p.x)} ${round(p.y)}`);
      } else if (command[0] === "C") {
        const c1 = transformPoint(placement, command[1], command[2]);
        const c2 = transformPoint(placement, command[3], command[4]);
        const to = transformPoint(placement, command[5], command[6]);
        parts.push(
          `C ${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(to.x)} ${round(to.y)}`
        );
      } else {
        parts.push("Z");
      }
    }
    parts.push("Z");
    return parts.join(" ");
  }

  // src/hands.ts
  var BLACK_TIP_DEPTH = 0.45;
  var TIP_INSIDE_FRONT = 0.3;
  var WRIST_IN_FRONT = 1.5;
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
    const unit = firstWhite.width * (options.scale ?? 1);
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
          // has to be ON it, not out in front of where it ends. A white
          // key only has to keep its finger on the keyboard at all.
          depth: key.black ? board.y + board.height * BLACK_TIP_DEPTH : board.y + board.height - unit * TIP_INSIDE_FRONT
        });
        continue;
      }
      const resting = hand === "right" ? anchorWhite + (finger - 1) : anchorWhite - (finger - 1);
      const x = xAtWhite(whites, resting - offset);
      if (x === void 0) continue;
      targets.push({
        finger,
        x,
        playing: false,
        depth: board.y + board.height - unit * TIP_INSIDE_FRONT
      });
    }
    if (targets.length === 0) return void 0;
    return {
      targets,
      unit,
      // Where the WRIST sits.
      //
      // NOT at the front edge of the keys, which is where this first put
      // it and which is wrong by about 65mm: a player's fingertips rest
      // roughly 40mm up a white key and their wrist is about 105mm
      // forward of those fingertips, so the wrist is out IN FRONT of the
      // keyboard, over the key slip. `WRIST_IN_FRONT` is that gap, and
      // it is what puts the fingertips on the front third of the keys
      // instead of up among the black ones.
      centreY: board.y + board.height + unit * WRIST_IN_FRONT,
      side: hand === "right" ? -1 : 1,
      boardTop: board.y
    };
  }
  function placementFor(hand, options) {
    const setting = settingFor(hand, options);
    if (setting === void 0) return void 0;
    return {
      placement: placeHand(setting.targets, setting.side, setting.unit, setting.centreY),
      setting
    };
  }
  function handFingertips(hand, options) {
    const placed = placementFor(hand, options);
    if (placed === void 0) return [];
    return placed.setting.targets.map((target) => {
      const tip = placedTip(placed.placement, target.finger);
      return {
        finger: target.finger,
        x: tip.x,
        y: tip.y,
        pressed: target.playing,
        onBlack: target.onBlack ?? false,
        ...target.midi !== void 0 ? { midi: target.midi } : {}
      };
    });
  }
  function handShapes(hand, options) {
    const placed = placementFor(hand, options);
    if (placed === void 0) return [];
    const { placement, setting } = placed;
    const colors = options.colors[hand];
    const unit = setting.unit;
    const shapes = [];
    shapes.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: colors.skin,
      stroke: colors.edge,
      strokeWidth: round2(unit * 0.09),
      path: handPath(placement)
    });
    for (const finger of [2, 3, 4]) {
      const tip = ARTWORK_TIPS[finger];
      const from = transformPoint(placement, tip.x * 0.74, tip.y * 0.52);
      const to = transformPoint(placement, tip.x * 0.74, tip.y * 0.42);
      shapes.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: "none",
        stroke: darken(colors.skin, 0.13),
        strokeWidth: round2(unit * 0.045),
        path: `M ${round2(from.x)} ${round2(from.y)} L ${round2(to.x)} ${round2(to.y)}`
      });
    }
    for (const target of setting.targets) {
      if (!target.playing) continue;
      const tip = placedTip(placement, target.finger);
      const r = unit * 0.3;
      shapes.push({
        x: round2(tip.x - r),
        y: round2(tip.y - r),
        width: round2(r * 2),
        height: round2(r * 2),
        fill: colors.tip,
        radius: round2(r)
      });
    }
    if (options.fingerNumbers !== false) {
      for (const target of setting.targets) {
        if (!target.playing) continue;
        const tip = placedTip(placement, target.finger);
        const badge = unit * 0.34;
        shapes.push({
          x: round2(tip.x - badge),
          // Above the fingertip, where the hand is not -- but never off
          // the back of the keyboard, which is where a finger playing a
          // key near the top would otherwise push it.
          y: round2(Math.max(setting.boardTop + badge * 0.2, tip.y - unit * 1.05 - badge)),
          width: round2(badge * 2),
          height: round2(badge * 2),
          fill: colors.tip,
          stroke: colors.edge,
          strokeWidth: round2(unit * 0.07),
          radius: round2(badge),
          label: String(target.finger),
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
  var HAND_REACH_PAST_KEYS = WRIST_IN_FRONT + 0.6;

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
    keyName: "rgba(30,21,18,0.38)",
    // On the bar itself, which is always a bright hand colour, so the
    // name is dark and nearly solid -- it has to be read in the half
    // second the bar is on its way down.
    noteName: "rgba(22,16,13,0.82)"
  };
  var DEFAULT_LEAD_SECONDS = 2.5;
  var FADE_FRACTION = 0.38;
  var FADE_STRENGTH = 0.88;
  var FADE_BANDS = 18;
  var BAR_LINE_FRACTION = 7e-3;
  var BEAT_LINE_FRACTION = 35e-4;
  var LABEL_FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  var KEYBOARD_FRACTION = 0.42;
  var KEY_DEPTH = 7;
  var HAND_BAND = HAND_REACH_PAST_KEYS;
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
    const unit = options.width / whiteKeyCount(options.size ?? 88);
    const band = unit * HAND_BAND;
    const asked = options.keyboardHeight !== void 0 && options.keyboardHeight > 0 ? Math.min(options.keyboardHeight, options.height) : Math.max(options.height * 0.55, options.height - band);
    const depth = Math.max(1, Math.min(unit * KEY_DEPTH, asked, options.height));
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
  var NAME_MIN_SIZE = 7;
  function barNameShape(bar, unit, colors) {
    const size = Math.min(unit * 0.5, bar.height * 0.6);
    if (size < NAME_MIN_SIZE) return [];
    const label = noteName(bar.midi);
    const box = size * 1.5;
    const width = Math.max(bar.width, size * label.length * 0.78);
    return [
      {
        x: round22(bar.x + bar.width / 2 - width / 2),
        y: round22(bar.y + bar.height - box),
        width: round22(width),
        height: round22(box),
        fill: "none",
        label,
        labelSize: round22(size),
        labelColor: colors.noteName
      }
    ];
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
    const whiteUnit = board.width / Math.max(1, keys.filter((key) => !key.black).length);
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
        for (const shape of barNameShape(bar, whiteUnit, colors)) shapes.push(shape);
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
    if (options.keyNames !== false) {
      const size = Math.max(6, whiteUnit * 0.46);
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
