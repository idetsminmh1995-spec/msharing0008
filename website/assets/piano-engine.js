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
  function fingersForChord(hand, anchor, chord) {
    const order = [...chord].sort((a, b) => hand === "right" ? a.midi - b.midi : b.midi - a.midi);
    const out = [];
    let lowest = 0;
    for (const note of order) {
      const wanted = fingerAt(hand, anchor, whiteIndex(note.midi));
      const finger = Math.min(5, Math.max(lowest + 1, Math.max(1, Math.round(wanted))));
      out.push(finger);
      lowest = finger;
    }
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

  // src/hands.ts
  var PALM_WIDTH = 3.3;
  var PALM_LENGTH = 3;
  var FINGER_LENGTH = 2.35;
  var FINGER_THICK = 0.64;
  var KNUCKLE_FROM_FRONT = 1.75;
  var BLACK_TIP_DEPTH = 0.45;
  var MAX_STRETCH = 1.3;
  var FINGER_SHAPE = [
    { reach: 1, drop: 2.4, width: 1.3 },
    // thumb -- thick, low, off the side of the palm
    { reach: 0.93, drop: 0.1, width: 1 },
    // index
    { reach: 1, drop: 0, width: 1 },
    // middle -- the longest
    { reach: 0.94, drop: 0.08, width: 0.96 },
    // ring
    { reach: 0.72, drop: 0.4, width: 0.86 }
    // little -- short and set back
  ];
  var CURL = 0.07;
  var REACH = 0.03;
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
  function round(value) {
    return Math.round(value * 100) / 100;
  }
  function fingertips(hand, options, keys, whites, frame) {
    const path2 = options.anchors[hand];
    const anchorWhite = anchorAt(path2, options.seconds);
    if (anchorWhite === void 0) return [];
    const firstWhite = whites[0];
    if (firstWhite === void 0) return [];
    const offset = whiteIndexOfKey(firstWhite.midi);
    const down = fingersDownAt(options.notes, hand, options.seconds);
    const byMidi = new Map(keys.map((key) => [key.midi, key]));
    const board = options.board;
    const tips = [];
    for (const finger of FINGERS) {
      const held = down.get(finger);
      const shape = FINGER_SHAPE[finger - 1];
      if (shape === void 0) continue;
      let x;
      let onBlack = false;
      if (held !== void 0) {
        const key = byMidi.get(held);
        if (key !== void 0) {
          x = key.x + key.width / 2;
          onBlack = key.black;
        }
      }
      if (x === void 0) {
        const resting2 = hand === "right" ? anchorWhite + (finger - 1) : anchorWhite - (finger - 1);
        x = xAtWhite(whites, resting2 - offset);
      }
      if (x === void 0) continue;
      const length = frame.unit * FINGER_LENGTH * shape.reach;
      const from = frame.knuckleY + frame.unit * shape.drop * 0.5;
      const resting = from - length * (1 - CURL);
      const reaching = from - length * (1 + REACH);
      const y = held === void 0 ? resting : onBlack ? Math.min(reaching, board.y + board.height * BLACK_TIP_DEPTH) : reaching;
      tips.push({
        finger,
        x,
        y,
        pressed: held !== void 0,
        onBlack,
        ...held !== void 0 ? { midi: held } : {}
      });
    }
    return tips;
  }
  function blackKeyShift(hand, options, keys, whites, frame) {
    const board = options.board;
    const black = new Set(keys.filter((key) => key.black).map((key) => key.midi));
    const down = fingersDownAt(options.notes, hand, options.seconds);
    let shift = 0;
    for (const [finger, midi] of down) {
      if (!black.has(midi)) continue;
      const shape = FINGER_SHAPE[finger - 1];
      if (shape === void 0) continue;
      const length = frame.unit * FINGER_LENGTH * shape.reach;
      const from = frame.knuckleY + frame.unit * shape.drop * 0.5;
      const target = board.y + board.height * BLACK_TIP_DEPTH;
      shift = Math.max(shift, from - target - length * MAX_STRETCH);
    }
    void whites;
    return Math.max(0, Math.min(shift, board.height * 0.22));
  }
  function handFingertips(hand, options) {
    const keys = keyboardGeometry(options.size, options.board);
    const whites = whiteKeys(keys);
    if (whites.length === 0) return [];
    const unit = (whites[0]?.width ?? options.board.width / 52) * (options.scale ?? 1);
    const rough = {
      unit,
      knuckleY: options.board.y + options.board.height - unit * KNUCKLE_FROM_FRONT,
      centreX: options.board.x + options.board.width / 2,
      lean: 0,
      palmWidth: unit * PALM_WIDTH,
      thumbSide: hand === "right" ? -1 : 1
    };
    const knuckleY = rough.knuckleY - blackKeyShift(hand, options, keys, whites, rough);
    return fingertips(hand, options, keys, whites, { ...rough, knuckleY });
  }
  function at(x, y) {
    return `${round(x)} ${round(y)}`;
  }
  function across(digit) {
    const dx = digit.tip.x - digit.base.x;
    const dy = digit.tip.y - digit.base.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: -dy / length, y: dx / length };
  }
  function handOutline(digits, palm, web) {
    const first = digits[0];
    const last = digits[digits.length - 1];
    if (first === void 0 || last === void 0) return "";
    const side = digits.map(across);
    const left = (i, which) => {
      const d = digits[i];
      const n2 = side[i];
      const h = which === "base" ? d.halfBase : d.halfTip;
      const p = which === "base" ? d.base : d.tip;
      return { x: p.x - n2.x * h, y: p.y - n2.y * h };
    };
    const right = (i, which) => {
      const d = digits[i];
      const n2 = side[i];
      const h = which === "base" ? d.halfBase : d.halfTip;
      const p = which === "base" ? d.base : d.tip;
      return { x: p.x + n2.x * h, y: p.y + n2.y * h };
    };
    const bow = (from, to, n2, amount) => `Q ${at((from.x + to.x) / 2 + n2.x * amount, (from.y + to.y) / 2 + n2.y * amount)} ${at(to.x, to.y)}`;
    const parts = [];
    const start = left(0, "base");
    parts.push(`M ${at(start.x, start.y)}`);
    digits.forEach((digit, i) => {
      const n2 = side[i];
      const lb2 = left(i, "base");
      const lt = left(i, "tip");
      const rt = right(i, "tip");
      const rb2 = right(i, "base");
      if (i > 0) {
        const previous = right(i - 1, "base");
        parts.push(
          `Q ${at((previous.x + lb2.x) / 2, Math.max(previous.y, lb2.y) + web)} ${at(lb2.x, lb2.y)}`
        );
      }
      parts.push(bow(lb2, lt, n2, -digit.halfBase * 0.1));
      parts.push(`A ${round(digit.halfTip * 1.05)} ${round(digit.halfTip)} 0 0 1 ${at(rt.x, rt.y)}`);
      parts.push(bow(rt, rb2, n2, digit.halfBase * 0.1));
    });
    const rb = right(digits.length - 1, "base");
    const lb = left(0, "base");
    const rightX = Math.max(palm.right, rb.x);
    const leftX = Math.min(palm.left, lb.x);
    const arcY = palm.bottom - palm.heel;
    parts.push(
      `C ${at(rightX, rb.y + (arcY - rb.y) * 0.22)} ${at(rightX, arcY - (arcY - rb.y) * 0.3)} ${at(rightX, arcY)}`
    );
    parts.push(`A ${round((rightX - leftX) / 2)} ${round(palm.heel)} 0 0 1 ${at(leftX, arcY)}`);
    parts.push(
      `C ${at(leftX, arcY - (arcY - lb.y) * 0.3)} ${at(leftX, lb.y + (arcY - lb.y) * 0.22)} ${at(lb.x, lb.y)}`
    );
    parts.push("Z");
    return parts.join(" ");
  }
  function handShapes(hand, options) {
    const keys = keyboardGeometry(options.size, options.board);
    const whites = whiteKeys(keys);
    if (whites.length === 0) return [];
    const board = options.board;
    const scale = options.scale ?? 1;
    const colors = options.colors[hand];
    const unit = (whites[0]?.width ?? board.width / 52) * scale;
    const rough = {
      unit,
      knuckleY: board.y + board.height - unit * KNUCKLE_FROM_FRONT,
      centreX: board.x + board.width / 2,
      lean: 0,
      palmWidth: unit * PALM_WIDTH,
      thumbSide: hand === "right" ? -1 : 1
    };
    const knuckleY = rough.knuckleY - blackKeyShift(hand, options, keys, whites, rough);
    const tips = handFingertips(hand, options);
    if (tips.length === 0) return [];
    const fourX = tips.filter((t) => t.finger !== 1).map((t) => t.x);
    const xs = fourX.length > 0 ? fourX : tips.map((t) => t.x);
    const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const thumbAt = tips.find((t) => t.finger === 1);
    const littleAt = tips.find((t) => t.finger === 5);
    const lean = thumbAt !== void 0 && littleAt !== void 0 ? (thumbAt.x - littleAt.x) * 0.05 : 0;
    const spread = Math.abs(Math.max(...xs) - Math.min(...xs));
    const palmWidth = Math.min(unit * (PALM_WIDTH + 0.7), Math.max(unit * PALM_WIDTH, spread * 0.98));
    const digit = (tip) => {
      const shape = FINGER_SHAPE[tip.finger - 1];
      if (shape === void 0) return void 0;
      const isThumb = tip.finger === 1;
      const baseX = isThumb ? centreX + lean + rough.thumbSide * palmWidth * 0.48 : centreX + lean + clamp((tip.x - centreX) * 0.8, palmWidth * 0.4);
      const half = unit * FINGER_THICK * shape.width / 2;
      return {
        base: { x: baseX, y: knuckleY + unit * shape.drop * 0.5 },
        tip: { x: tip.x, y: tip.y },
        // A finger is a little thicker at the knuckle than at the tip.
        halfBase: half * 1.1,
        halfTip: half * 0.92
      };
    };
    const fingers = tips.filter((tip) => tip.finger !== 1).map(digit).filter((d) => d !== void 0).sort((a, b) => a.base.x - b.base.x);
    const thumb = thumbAt === void 0 ? void 0 : digit(thumbAt);
    const outline = handOutline(
      fingers,
      {
        left: centreX + lean - palmWidth / 2,
        right: centreX + lean + palmWidth / 2,
        bottom: knuckleY - unit * 0.3 + unit * PALM_LENGTH,
        heel: palmWidth * 0.46
      },
      unit * 0.22
    );
    if (outline === "") return [];
    const grow = unit * 0.075;
    const thumbWidth = thumb === void 0 ? 0 : thumb.halfBase * 2;
    const shapes = [];
    const pass = (fill, extra) => {
      shapes.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill,
        ...extra > 0 ? { stroke: fill, strokeWidth: round(extra * 2) } : {},
        path: outline
      });
      if (thumb !== void 0) {
        shapes.push({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          fill: "none",
          stroke: fill,
          strokeWidth: round(thumbWidth + extra * 2),
          path: `M ${at(thumb.base.x, thumb.base.y)} Q ${at(
            (thumb.base.x + thumb.tip.x) / 2 + (thumb.tip.x - thumb.base.x) * 0.1,
            (thumb.base.y + thumb.tip.y) / 2 + unit * 0.1
          )} ${at(thumb.tip.x, thumb.tip.y)}`
        });
      }
    };
    pass(colors.edge, grow);
    pass(colors.skin, 0);
    if (options.fingerNumbers !== false) {
      for (const tip of tips) {
        if (!tip.pressed) continue;
        const badge = unit * 0.34;
        shapes.push({
          x: round(tip.x - badge),
          y: round(tip.y + unit * 0.92 - badge),
          width: round(badge * 2),
          height: round(badge * 2),
          fill: colors.tip,
          stroke: colors.edge,
          strokeWidth: round(unit * 0.07),
          radius: round(badge),
          label: String(tip.finger),
          labelSize: round(badge * 1.35),
          labelColor: colors.edge
        });
      }
    }
    return shapes;
  }
  function clamp(value, limit) {
    return Math.max(-limit, Math.min(limit, value));
  }
  function handsShapes(options) {
    return [...handShapes("left", options), ...handShapes("right", options)];
  }

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
  var HAND_BAND = 1.3;
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
      const unit = board.width / Math.max(1, keys.filter((key) => !key.black).length);
      const size = Math.max(6, unit * 0.46);
      for (const key of keys) {
        if (key.black || key.midi % 12 !== 0) continue;
        shapes.push({
          x: key.x,
          y: key.y + key.height - size * 2.1,
          width: key.width,
          height: size * 1.4,
          fill: "none",
          label: `C${Math.floor(key.midi / 12) - 1}`,
          labelSize: round2(size),
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
  function round2(value) {
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
