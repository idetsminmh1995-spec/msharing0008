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
    DEFAULT_LEAD_SECONDS: () => DEFAULT_LEAD_SECONDS,
    KEYBOARD_RANGES: () => KEYBOARD_RANGES,
    KEYBOARD_SIZES: () => KEYBOARD_SIZES,
    fallingBars: () => fallingBars,
    handColor: () => handColor,
    isBlackKey: () => isBlackKey,
    keyboardBox: () => keyboardBox,
    keyboardGeometry: () => keyboardGeometry,
    keyboardRange: () => keyboardRange,
    pressedAt: () => pressedAt,
    renderKeyboardSvg: () => renderKeyboardSvg,
    renderPianoStage: () => renderPianoStage,
    resolveColors: () => resolveColors,
    stageShapes: () => stageShapes,
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
    const { first, last } = keyboardRange(size);
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

  // src/stage.ts
  var DEFAULT_COLORS = {
    whiteKey: "#F7F4F0",
    blackKey: "#141010",
    keyEdge: "#2A2320",
    strikeLine: "#C81E2C",
    leftHand: "#FFC400",
    rightHand: "#4FA3FF",
    background: "none"
  };
  var DEFAULT_LEAD_SECONDS = 2.5;
  var KEYBOARD_FRACTION = 1 / 3;
  var LINE_FRACTION = 0.05;
  function resolveColors(colors) {
    return { ...DEFAULT_COLORS, ...colors ?? {} };
  }
  function keyboardBox(options) {
    const height = options.keyboardHeight !== void 0 && options.keyboardHeight > 0 ? Math.min(options.keyboardHeight, options.height) : options.height * KEYBOARD_FRACTION;
    return { x: 0, y: options.height - height, width: options.width, height };
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
  function handColor(hand, colors) {
    return hand === "left" ? colors.leftHand : colors.rightHand;
  }
  function stageShapes(options) {
    const colors = resolveColors(options.colors);
    const notes = options.notes ?? [];
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
    shapes.push({
      x: 0,
      y: board.y - lineHeight / 2,
      width: options.width,
      height: lineHeight,
      fill: colors.strikeLine
    });
    return shapes;
  }
  function shapesToSvg(shapes, width, height) {
    const body = shapes.map(
      (shape) => rect(shape.x, shape.y, shape.width, shape.height, {
        fill: shape.fill,
        ...shape.stroke !== void 0 ? { stroke: shape.stroke } : {},
        ...shape.strokeWidth !== void 0 ? { "stroke-width": shape.strokeWidth } : {},
        ...shape.radius !== void 0 && shape.radius > 0 ? { rx: shape.radius } : {}
      })
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
