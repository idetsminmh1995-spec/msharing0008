"use strict";
var GuitarEngine = (() => {
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
    ACOUSTIC_COLORS: () => ACOUSTIC_COLORS,
    DEFAULT_COLORS: () => DEFAULT_COLORS,
    DEFAULT_FIRST_FRET: () => DEFAULT_FIRST_FRET,
    DEFAULT_LAST_FRET: () => DEFAULT_LAST_FRET,
    DEFAULT_STRINGS: () => DEFAULT_STRINGS,
    FINGER_COLORS: () => FINGER_COLORS,
    FINGER_NAMES: () => FINGER_NAMES,
    SINGLE_CUT_COLORS: () => SINGLE_CUT_COLORS,
    STANDARD_TUNING: () => STANDARD_TUNING,
    boardHalfAt: () => boardHalfAt,
    fingerColor: () => fingerColor,
    fretCenter: () => fretCenter,
    fretRange: () => fretRange,
    fretWidth: () => fretWidth,
    fretWires: () => fretWires,
    fretboardShapes: () => fretboardShapes,
    guitarLayout: () => guitarLayout,
    handShapes: () => handShapes,
    inlayFrets: () => inlayFrets,
    instrumentColors: () => instrumentColors,
    markShapes: () => markShapes,
    pickShapes: () => pickShapes,
    positionsAt: () => positionsAt,
    renderFretboard: () => renderFretboard,
    renderGuitarStage: () => renderGuitarStage,
    renderHand: () => renderHand,
    resolveColors: () => resolveColors,
    stageShapes: () => stageShapes,
    stringCount: () => stringCount,
    stringHalfAt: () => stringHalfAt,
    stringLines: () => stringLines,
    stringName: () => stringName,
    stringYAt: () => stringYAt,
    tuningFor: () => tuningFor
  });

  // src/fretboard.ts
  var DEFAULT_STRINGS = 6;
  var DEFAULT_FIRST_FRET = 0;
  var DEFAULT_LAST_FRET = 12;
  var NECK_TAPER = 1.18;
  var BOARD_FILL = 0.88;
  var STRING_MARGIN = 0.18;
  var HEADSTOCK_SHARE = 0.1;
  var LABELS_SHARE = 0.055;
  var BODY_SHARE = 0.2;
  var NUMBERS_SHARE = 0.16;
  var THINNEST = 0.07;
  var THICKEST = 0.2;
  var INLAY_FRETS = /* @__PURE__ */ new Set([3, 5, 7, 9, 15, 17, 19, 21]);
  var DOUBLE_INLAY_FRETS = /* @__PURE__ */ new Set([12, 24]);
  function stringCount(options) {
    const value = options.strings;
    return Number.isFinite(value) && value >= 2 ? Math.round(value) : DEFAULT_STRINGS;
  }
  function fretRange(options) {
    const first = Number.isFinite(options.firstFret) ? Math.max(0, Math.round(options.firstFret)) : DEFAULT_FIRST_FRET;
    const lastRaw = Number.isFinite(options.lastFret) ? Math.round(options.lastFret) : DEFAULT_LAST_FRET;
    return { first, last: Math.max(first + 1, lastRaw) };
  }
  function guitarLayout(options) {
    const width = Math.max(0, options.width);
    const height = Math.max(0, options.height);
    const numbers = options.fretNumbers === false ? 0 : height * NUMBERS_SHARE;
    const boardHeight = height - numbers;
    const labelsWidth = options.stringLabels === false ? 0 : width * LABELS_SHARE;
    const headstockWidth = width * HEADSTOCK_SHARE;
    const bodyWidth = width * BODY_SHARE;
    return {
      board: { x: 0, y: 0, width, height: boardHeight },
      labels: { x: 0, y: 0, width: labelsWidth, height: boardHeight },
      headstock: { x: labelsWidth, y: 0, width: headstockWidth, height: boardHeight },
      neck: {
        x: labelsWidth + headstockWidth,
        y: 0,
        width: Math.max(1, width - labelsWidth - headstockWidth - bodyWidth),
        height: boardHeight
      },
      body: { x: width - bodyWidth, y: 0, width: bodyWidth, height: boardHeight },
      numbersY: boardHeight
    };
  }
  function taperAt(options, x) {
    const layout = guitarLayout(options);
    const nut = layout.neck.x;
    const end = Math.max(nut + 1, layout.body.x);
    return Math.min(1, Math.max(0, (x - nut) / (end - nut)));
  }
  function boardHalfAt(options, x) {
    const board = guitarLayout(options).board;
    const widest = board.height * BOARD_FILL / 2;
    const narrow = widest / NECK_TAPER;
    return narrow + (widest - narrow) * taperAt(options, x);
  }
  function stringHalfAt(options, x) {
    return boardHalfAt(options, x) * (1 - STRING_MARGIN);
  }
  function stringLines(options) {
    const count = stringCount(options);
    if (!(options.height > 0)) return [];
    const full = {
      width: options.width ?? 1,
      height: options.height,
      ...options.strings !== void 0 ? { strings: options.strings } : {},
      ...options.fretNumbers !== void 0 ? { fretNumbers: options.fretNumbers } : {},
      ...options.stringLabels !== void 0 ? { stringLabels: options.stringLabels } : {}
    };
    const board = guitarLayout(full).board;
    const middle = board.y + board.height / 2;
    const half = stringHalfAt(full, guitarLayout(full).neck.x);
    const gap = count > 1 ? half * 2 / (count - 1) : 0;
    const lines = [];
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      lines.push({
        string: i + 1,
        offset: middle - half + i * gap,
        thickness: Math.max(1, (THINNEST + (THICKEST - THINNEST) * t) * (gap || board.height / 6))
      });
    }
    return lines;
  }
  function stringYAt(options, string, x) {
    const lines = stringLines(options);
    const line = lines.find((candidate) => candidate.string === string);
    const board = guitarLayout(options).board;
    const middle = board.y + board.height / 2;
    if (line === void 0) return middle;
    const atNut = stringHalfAt(options, guitarLayout(options).neck.x);
    if (!(atNut > 0)) return middle;
    return middle + (line.offset - middle) * (stringHalfAt(options, x) / atNut);
  }
  function fretWires(options) {
    const { first, last } = fretRange(options);
    if (!(options.width > 0)) return [];
    const neck = guitarLayout(options).neck;
    const perFret = neck.width / (last - first);
    const wires = [];
    for (let fret = first; fret <= last; fret++) {
      wires.push({ fret, offset: neck.x + (fret - first) * perFret });
    }
    return wires;
  }
  function fretWidth(options) {
    const { first, last } = fretRange(options);
    return guitarLayout(options).neck.width / Math.max(1, last - first);
  }
  function fretCenter(fret, options) {
    const { first } = fretRange(options);
    const neck = guitarLayout(options).neck;
    const per = fretWidth(options);
    if (fret <= 0) return neck.x;
    return neck.x + (fret - first - 0.5) * per;
  }
  function inlayFrets(options) {
    const { first, last } = fretRange(options);
    const out = [];
    for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
      if (INLAY_FRETS.has(fret)) out.push({ fret, double: false });
      else if (DOUBLE_INLAY_FRETS.has(fret)) out.push({ fret, double: true });
    }
    return out;
  }
  function positionsAt(notes, seconds) {
    const live = [];
    for (const note of notes) {
      if (note.startSeconds > seconds || note.endSeconds <= seconds) continue;
      const to = note.slideToFret;
      const sliding = to !== void 0 && Number.isFinite(to) && to !== note.fret;
      let fret = note.fret;
      if (sliding) {
        const span = Math.max(1e-6, note.endSeconds - note.startSeconds);
        const through = Math.min(1, Math.max(0, (seconds - note.startSeconds) / span));
        fret = note.fret + (to - note.fret) * through;
      }
      live.push({
        string: note.string,
        fret,
        ...note.finger !== void 0 ? { finger: note.finger } : {},
        sliding,
        fromFret: note.fret,
        toFret: sliding ? to : note.fret
      });
    }
    return live;
  }
  var STANDARD_TUNING = [64, 59, 55, 50, 45, 40];
  var NOTE_LETTERS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function stringName(midi, isHighest) {
    if (!Number.isFinite(midi)) return "";
    const letter = NOTE_LETTERS[(Math.round(midi) % 12 + 12) % 12] ?? "";
    return isHighest ? letter.toLowerCase() : letter;
  }
  function tuningFor(options) {
    const count = stringCount(options);
    const given = options.tuning ?? STANDARD_TUNING;
    const out = [];
    for (let i = 0; i < count; i++) {
      const value = given[i];
      out.push(
        Number.isFinite(value) ? value : (out[i - 1] ?? STANDARD_TUNING[0] ?? 64) - 5
      );
    }
    return out;
  }

  // src/paint.ts
  function linear(x1, y1, x2, y2, stops) {
    return {
      kind: "linear",
      x1,
      y1,
      x2,
      y2,
      stops: stops.map(([offset, color]) => ({ offset, color }))
    };
  }
  function radial(cx, cy, r, stops) {
    return { kind: "radial", cx, cy, r, stops: stops.map(([offset, color]) => ({ offset, color })) };
  }
  function downward(y, height, stops) {
    return linear(0, y, 0, y + height, stops);
  }
  function rectShape(x, y, width, height, fill, extra = {}) {
    return { kind: "rect", x, y, width, height, fill, ...extra };
  }
  function circleShape(cx, cy, radius, fill, extra = {}) {
    return {
      kind: "circle",
      x: cx,
      y: cy,
      width: radius * 2,
      height: radius * 2,
      fill,
      ...extra
    };
  }
  function pathShape(d, bounds, fill, extra = {}) {
    return { kind: "path", d, ...bounds, fill, ...extra };
  }

  // src/instrument.ts
  function modelColors(instrument) {
    if (instrument === "acoustic") return ACOUSTIC_COLORS;
    if (instrument === "singleCut") return SINGLE_CUT_COLORS;
    return {};
  }
  function inlayStyle(instrument) {
    return instrument === "singleCut" ? "block" : "dot";
  }
  function tunerLayout(instrument) {
    return instrument === "electric" || instrument === void 0 ? "inline" : "threeAside";
  }
  var ACOUSTIC_COLORS = {
    board: "#43291B",
    boardDark: "#2C1910",
    boardEdge: "#1A0E07",
    neckWood: "#8A5A31",
    neckWoodDark: "#5E3A1E",
    binding: "#EADBB8",
    inlay: "#F1EADD",
    inlayEdge: "rgba(0,0,0,0.35)",
    headstock: "#3A2418",
    headstockEdge: "#1A0E07",
    peg: "#C9A227",
    pegPost: "#8A6F1C",
    body: "#E0BE85",
    bodyCentre: "#F0D6A5",
    bodyBurst: "#B98C4A",
    bodyEdge: "#5E3A1E",
    pickguard: "#4A2B18",
    pickguardEdge: "#24120A",
    hardware: "#3A2418",
    hardwareDark: "#1A0E07",
    knob: "#F1EADD"
  };
  var SINGLE_CUT_COLORS = {
    board: "#2A1C14",
    boardDark: "#170E09",
    boardEdge: "#0D0705",
    neckWood: "#6B3F22",
    neckWoodDark: "#452716",
    binding: "#F0E3C3",
    inlay: "#F3EFE4",
    inlayEdge: "rgba(0,0,0,0.38)",
    headstock: "#241812",
    headstockEdge: "#0D0705",
    peg: "#E3D9C4",
    pegPost: "#A69C88",
    body: "#8A4E18",
    bodyCentre: "#E3A93C",
    bodyBurst: "#311707",
    bodyEdge: "#150A03",
    pickup: "#C9C4BC",
    pickupPole: "#8C877F",
    hardware: "#CFC6B8",
    hardwareDark: "#1A1512",
    knob: "#D9A441"
  };
  function headstockShapes({ options, colors }) {
    const layout = guitarLayout(options);
    const head = layout.headstock;
    if (!(head.width > 0)) return [];
    const shapes = [];
    const top = head.y + head.height * 0.1;
    const tall = head.height * 0.8;
    const radius = Math.min(head.width, tall) * 0.3;
    shapes.push(
      rectShape(
        head.x,
        top,
        head.width,
        tall,
        downward(top, tall, [
          [0, colors.headstock],
          [0.55, colors.headstock],
          [1, colors.headstockEdge]
        ]),
        { radius, role: "headstock" }
      )
    );
    shapes.push(
      rectShape(
        head.x + head.width * 0.06,
        top + tall * 0.12,
        head.width * 0.88,
        tall * 0.1,
        "rgba(255,255,255,0.1)",
        { radius: tall * 0.05 }
      )
    );
    const labelled = options.stringLabels !== false;
    const buttonR = Math.max(1.5, Math.min(head.height * 0.09, head.width * 0.09));
    const postR = buttonR * 0.5;
    const inline = tunerLayout(options.instrument) === "inline";
    const lines = stringLines(options);
    const from = labelled ? 0.56 : 0.2;
    const to = 0.92;
    for (const [index, line] of lines.entries()) {
      const upper = index < lines.length / 2;
      const along = inline ? from + index / Math.max(1, lines.length - 1) * (to - from) : from + index % 3 / 2 * (to - from);
      const x = head.x + head.width * along;
      const postY = line.offset;
      const side = inline ? 1 : upper ? 0 : 1;
      const buttonY = side === 0 ? top + buttonR * 1.2 : top + tall - buttonR * 1.2;
      shapes.push(
        rectShape(
          x - postR,
          Math.min(postY, buttonY),
          postR * 2,
          Math.abs(buttonY - postY),
          colors.pegPost,
          { radius: postR, role: "tuner" }
        )
      );
      shapes.push(
        circleShape(
          x,
          buttonY,
          buttonR,
          radial(x - buttonR * 0.3, buttonY - buttonR * 0.3, buttonR * 1.6, [
            [0, "#FFFFFF"],
            [0.35, colors.peg],
            [1, colors.pegPost]
          ]),
          { role: "tuner" }
        )
      );
      shapes.push(circleShape(x, postY, postR, colors.peg, { role: "tuner" }));
    }
    return shapes;
  }
  function bodyShapes({ options, colors }) {
    const layout = guitarLayout(options);
    const body = layout.body;
    if (!(body.width > 0)) return [];
    const model = options.instrument ?? "electric";
    const middle = body.y + body.height / 2;
    const shapes = [];
    const top = model === "acoustic" ? radial(body.x + body.width * 0.55, middle, body.width * 0.9, [
      [0, colors.bodyCentre],
      [0.6, colors.body],
      [1, colors.bodyBurst]
    ]) : model === "singleCut" ? radial(body.x + body.width * 0.5, middle, body.width * 0.85, [
      [0, colors.bodyCentre],
      [0.45, colors.body],
      [1, colors.bodyBurst]
    ]) : downward(body.y, body.height, [
      [0, "#2E2E2E"],
      [0.5, colors.body],
      [1, "#050505"]
    ]);
    const corner = Math.min(body.width, body.height) * 0.3;
    shapes.push(
      rectShape(body.x, body.y, body.width, body.height, top, { radius: corner, role: "body" })
    );
    shapes.push(
      rectShape(body.x, body.y, body.width, body.height, "none", {
        radius: corner,
        stroke: model === "electric" ? colors.bodyEdge : colors.binding,
        strokeWidth: Math.max(1, body.height * (model === "electric" ? 0.02 : 0.035)),
        role: "body"
      })
    );
    if (model === "acoustic") shapes.push(...acousticTop(body, middle, colors, options));
    else if (model === "singleCut") shapes.push(...singleCutTop(body, middle, colors, options));
    else shapes.push(...electricTop(body, middle, colors, options));
    return shapes;
  }
  function acousticTop(body, middle, colors, options) {
    const shapes = [];
    const r = Math.min(body.width * 0.26, body.height * 0.3);
    const cx = body.x + body.width * 0.56;
    shapes.push(
      pathShape(
        `M${cx} ${middle - r * 0.2} L${cx + r * 2.1} ${middle + r * 0.5} L${cx + r * 1.7} ${middle + r * 1.7} L${cx - r * 0.2} ${middle + r * 1.2} Z`,
        { x: cx - r, y: middle, width: r * 3, height: r * 2 },
        colors.pickguard,
        { opacity: 0.9, role: "pickguard" }
      )
    );
    shapes.push(circleShape(cx, middle, r * 1.22, colors.rosette, { role: "soundhole" }));
    shapes.push(circleShape(cx, middle, r * 1.1, colors.body, { role: "soundhole" }));
    shapes.push(
      circleShape(
        cx,
        middle,
        r,
        radial(cx, middle - r * 0.3, r * 1.6, [
          [0, "#241309"],
          [0.7, colors.soundhole],
          [1, "#000000"]
        ]),
        { role: "soundhole" }
      )
    );
    const bridgeX = body.x + body.width * 0.84;
    const bridgeW = body.width * 0.12;
    const bridgeH = body.height * 0.46;
    shapes.push(
      rectShape(
        bridgeX,
        middle - bridgeH / 2,
        bridgeW,
        bridgeH,
        downward(middle - bridgeH / 2, bridgeH, [
          [0, colors.hardware],
          [1, colors.hardwareDark]
        ]),
        { radius: bridgeW * 0.3, role: "hardware" }
      )
    );
    const pinR = Math.max(1, bridgeH * 0.08);
    for (const line of stringLines(options)) {
      shapes.push(
        circleShape(
          bridgeX + bridgeW * 0.62,
          stringYAt(options, line.string, bridgeX),
          pinR,
          colors.knob,
          {
            role: "hardware"
          }
        )
      );
    }
    return shapes;
  }
  function electricTop(body, middle, colors, options) {
    const shapes = [];
    const plateX = body.x + body.width * 0.04;
    const plateW = body.width * 0.78;
    const plateH = body.height * 0.82;
    shapes.push(
      rectShape(
        plateX,
        middle - plateH / 2,
        plateW,
        plateH,
        downward(middle - plateH / 2, plateH, [
          [0, "#FFFFFF"],
          [0.5, colors.pickguard],
          [1, colors.pickguardEdge]
        ]),
        { radius: plateH * 0.28, role: "pickguard" }
      )
    );
    const pickupW = plateW * 0.12;
    const pickupH = plateH * 0.6;
    for (const [index, at] of [0.3, 0.52, 0.74].entries()) {
      const x = plateX + plateW * at;
      const lean = (index - 1) * pickupH * 0.06;
      shapes.push(
        rectShape(
          x,
          middle - pickupH / 2 + lean,
          pickupW,
          pickupH,
          downward(middle - pickupH / 2, pickupH, [
            [0, colors.pickup],
            [0.5, colors.pickup],
            [1, "#A89F8C"]
          ]),
          {
            radius: pickupW * 0.3,
            stroke: "#6E6963",
            strokeWidth: Math.max(0.5, pickupW * 0.08),
            role: "pickup"
          }
        )
      );
      for (const line of stringLines(options)) {
        const poleY = stringYAt(options, line.string, x) + lean;
        if (Math.abs(poleY - middle) > pickupH * 0.44) continue;
        shapes.push(
          circleShape(x + pickupW / 2, poleY, Math.max(0.6, pickupW * 0.13), colors.pickupPole, {
            role: "pickup"
          })
        );
      }
    }
    const bridgeX = body.x + body.width * 0.87;
    shapes.push(
      rectShape(
        bridgeX,
        middle - body.height * 0.3,
        body.width * 0.09,
        body.height * 0.6,
        downward(middle - body.height * 0.3, body.height * 0.6, [
          [0, "#FFFFFF"],
          [0.4, colors.hardware],
          [1, colors.hardwareDark]
        ]),
        { radius: body.width * 0.02, role: "hardware" }
      )
    );
    for (const line of stringLines(options)) {
      const y = stringYAt(options, line.string, bridgeX);
      if (Math.abs(y - middle) > body.height * 0.3) continue;
      shapes.push(
        rectShape(
          bridgeX,
          y - body.height * 0.028,
          body.width * 0.09,
          body.height * 0.056,
          colors.hardwareDark,
          { radius: body.height * 0.02, role: "hardware" }
        )
      );
    }
    return shapes;
  }
  function singleCutTop(body, middle, colors, options) {
    const shapes = [];
    const pickupW = body.width * 0.15;
    const pickupH = body.height * 0.54;
    for (const at of [0.3, 0.55]) {
      const x = body.x + body.width * at;
      shapes.push(
        rectShape(
          x - pickupW * 0.08,
          middle - pickupH * 0.62,
          pickupW * 1.16,
          pickupH * 1.24,
          colors.hardwareDark,
          { radius: pickupW * 0.14, role: "pickup" }
        )
      );
      shapes.push(
        rectShape(
          x,
          middle - pickupH / 2,
          pickupW,
          pickupH,
          downward(middle - pickupH / 2, pickupH, [
            [0, "#FFFFFF"],
            [0.35, colors.pickup],
            [1, colors.pickupPole]
          ]),
          { radius: pickupW * 0.1, role: "pickup" }
        )
      );
      for (const line of stringLines(options)) {
        const y = stringYAt(options, line.string, x);
        if (Math.abs(y - middle) > pickupH * 0.42) continue;
        shapes.push(
          circleShape(x + pickupW * 0.3, y, Math.max(0.6, pickupW * 0.08), colors.pickupPole, {
            role: "pickup"
          })
        );
      }
    }
    for (const [at, w] of [
      [0.76, 0.045],
      [0.88, 0.04]
    ]) {
      const x = body.x + body.width * at;
      shapes.push(
        rectShape(
          x,
          middle - body.height * 0.28,
          body.width * w,
          body.height * 0.56,
          downward(middle - body.height * 0.28, body.height * 0.56, [
            [0, "#FFFFFF"],
            [0.4, colors.hardware],
            [1, colors.hardwareDark]
          ]),
          { radius: body.width * 0.015, role: "hardware" }
        )
      );
    }
    const knobR = Math.max(1.5, body.height * 0.075);
    for (const at of [0.64, 0.78]) {
      const x = body.x + body.width * at;
      const y = body.y + body.height * 0.9;
      shapes.push(
        circleShape(
          x,
          y,
          knobR,
          radial(x - knobR * 0.4, y - knobR * 0.4, knobR * 1.8, [
            [0, "#FFF3D0"],
            [0.5, colors.knob],
            [1, "#7A5A12"]
          ]),
          { role: "hardware" }
        )
      );
    }
    return shapes;
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
  var GradientBank = class {
    constructor() {
      this.defs = [];
    }
    paint(value) {
      if (typeof value === "string") return value;
      const id = `@@${this.defs.length}@@`;
      const stops = value.stops.map((stop) => tag("stop", { offset: stop.offset, "stop-color": stop.color })).join("");
      this.defs.push(
        value.kind === "linear" ? wrap(
          "linearGradient",
          {
            id,
            gradientUnits: "userSpaceOnUse",
            x1: value.x1,
            y1: value.y1,
            x2: value.x2,
            y2: value.y2
          },
          stops
        ) : wrap(
          "radialGradient",
          { id, gradientUnits: "userSpaceOnUse", cx: value.cx, cy: value.cy, r: value.r },
          stops
        )
      );
      return `url(#@@${this.defs.length - 1}@@)`;
    }
    /**
     * The defs and the body, with every id made unique to this drawing.
     *
     * The placeholders are replaced once, at the end, when the hash of
     * what was collected is known.
     */
    finish(body) {
      if (this.defs.length === 0) return body;
      const defs = wrap("defs", {}, this.defs.join(""));
      const stamp = hash(defs);
      const fill = (text) => text.replace(/@@(\d+)@@/g, (_all, index) => `${stamp}-${index}`);
      return fill(defs) + fill(body);
    }
  };
  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619) >>> 0;
    }
    return `g${value.toString(36)}`;
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

  // src/stage.ts
  var FINGER_COLORS = {
    index: "#E8352B",
    middle: "#2B5BE8",
    ring: "#1FA04A",
    little: "#F2C200"
  };
  var DEFAULT_COLORS = {
    board: "#D9AE6B",
    boardDark: "#B0813F",
    boardEdge: "#6B4A22",
    neckWood: "#E3BE80",
    neckWoodDark: "#B98C4A",
    binding: "#F2E6CE",
    fretWire: "#F0ECE6",
    fretShadow: "rgba(0,0,0,0.42)",
    nut: "#F5EEDF",
    inlay: "#2E2018",
    inlayEdge: "rgba(0,0,0,0.4)",
    string: "#E4DACA",
    stringShine: "rgba(255,255,255,0.75)",
    fretNumber: "rgba(255,255,255,0.34)",
    headstock: "#D9AE6B",
    headstockEdge: "#8A6430",
    peg: "#E0DCD5",
    pegPost: "#A8A29A",
    stringLabel: "#F1E7DC",
    stringLabelInk: "#20130D",
    body: "#171717",
    bodyEdge: "#000000",
    bodyBurst: "#2A0F0A",
    bodyCentre: "#3A3A3A",
    pickguard: "#F3F0E6",
    pickguardEdge: "#BEB8A8",
    soundhole: "#140B07",
    rosette: "#C9A227",
    pickup: "#EFE8D6",
    pickupPole: "#9A958C",
    hardware: "#D6D1CA",
    hardwareDark: "#6E6963",
    knob: "#F0EBE1",
    pick: "#F7F4F0",
    unassigned: "#F7F4F0",
    open: "#9AA6B2",
    ...FINGER_COLORS,
    background: "none"
  };
  function instrumentColors(instrument) {
    return modelColors(instrument);
  }
  var MARK_SIZE = 1.5;
  function resolveColors(colors, instrument) {
    return { ...DEFAULT_COLORS, ...instrumentColors(instrument), ...colors ?? {} };
  }
  function fingerColor(finger, colors) {
    switch (finger) {
      case 0:
        return colors.open;
      case 1:
        return colors.index;
      case 2:
        return colors.middle;
      case 3:
        return colors.ring;
      case 4:
        return colors.little;
      default:
        return colors.unassigned;
    }
  }
  var FINGER_NAMES = {
    1: "Index",
    2: "Middle",
    3: "Ring",
    4: "Little"
  };
  function stringGap(options) {
    const lines = stringLines(options);
    return lines.length > 1 ? lines[1].offset - lines[0].offset : guitarLayout(options).board.height / 6;
  }
  function boardEdges(options, x) {
    const board = guitarLayout(options).board;
    const middle = board.y + board.height / 2;
    const half = boardHalfAt(options, x);
    return { top: middle - half, bottom: middle + half };
  }
  function taperedPath(fromX, toX, topAt, bottomAt) {
    return [
      `M${fromX} ${topAt(fromX)}`,
      `L${toX} ${topAt(toX)}`,
      `L${toX} ${bottomAt(toX)}`,
      `L${fromX} ${bottomAt(fromX)}`,
      "Z"
    ].join(" ");
  }
  function fretboardShapes(options) {
    const colors = resolveColors(options.colors, options.instrument);
    const { width, height } = options;
    if (!(width > 0) || !(height > 0)) return [];
    const layout = guitarLayout(options);
    const shapes = [];
    if (colors.background !== "none") {
      shapes.push(rectShape(0, 0, width, height, colors.background));
    }
    const parts = { options, colors };
    shapes.push(...bodyShapes(parts));
    shapes.push(...headstockShapes(parts));
    const neck = layout.neck;
    const nutX = neck.x;
    const endX = Math.min(width, layout.body.x + layout.body.width * 0.3);
    const gap = stringGap(options);
    const bound = options.instrument === "acoustic" || options.instrument === "singleCut";
    const wood = (x) => boardEdges(options, x);
    const woodTop = (x) => wood(x).top - gap * 0.22;
    const woodBottom = (x) => wood(x).bottom + gap * 0.22;
    shapes.push(
      pathShape(
        taperedPath(nutX, endX, woodTop, woodBottom),
        { x: nutX, y: 0, width: endX - nutX, height },
        downward(0, height, [
          [0, colors.neckWood],
          [0.55, colors.neckWood],
          [1, colors.neckWoodDark]
        ]),
        { role: "neck" }
      )
    );
    shapes.push(
      pathShape(
        taperedPath(
          nutX,
          endX,
          (x) => wood(x).top,
          (x) => wood(x).bottom
        ),
        { x: nutX, y: 0, width: endX - nutX, height },
        downward(0, height, [
          [0, colors.boardDark],
          [0.18, colors.board],
          [0.75, colors.board],
          [1, colors.boardEdge]
        ]),
        { role: "board" }
      )
    );
    if (bound) {
      const thickness = Math.max(1, gap * 0.16);
      for (const edge of ["top", "bottom"]) {
        const at = (x) => edge === "top" ? wood(x).top : wood(x).bottom;
        shapes.push(
          pathShape(
            taperedPath(
              nutX,
              endX,
              (x) => edge === "top" ? at(x) : at(x) - thickness,
              (x) => edge === "top" ? at(x) + thickness : at(x)
            ),
            { x: nutX, y: 0, width: endX - nutX, height },
            colors.binding,
            { role: "binding" }
          )
        );
      }
    }
    shapes.push(...inlayShapes(options, colors));
    shapes.push(...fretShapes(options, colors));
    shapes.push(...stringShapes(options, colors, endX));
    shapes.push(...stringLabelShapes(options, colors));
    shapes.push(...fretNumberShapes(options, colors));
    return shapes;
  }
  function inlayShapes(options, colors) {
    const shapes = [];
    const gap = stringGap(options);
    const block = inlayStyle(options.instrument) === "block";
    const per = fretWidth(options);
    for (const inlay of inlayFrets(options)) {
      const cx = fretCenter(inlay.fret, options);
      const edges = boardEdges(options, cx);
      const middle = (edges.top + edges.bottom) / 2;
      const half = (edges.bottom - edges.top) / 2;
      if (block) {
        const w = Math.min(per * 0.62, half * 1.5);
        const h = half * 0.72;
        const lean = w * 0.12;
        shapes.push(
          pathShape(
            `M${cx - w / 2 + lean} ${middle - h} L${cx + w / 2 - lean} ${middle - h} L${cx + w / 2} ${middle + h} L${cx - w / 2} ${middle + h} Z`,
            { x: cx - w / 2, y: middle - h, width: w, height: h * 2 },
            radial(cx - w * 0.2, middle - h * 0.4, w, [
              [0, "#FFFFFF"],
              [0.55, colors.inlay],
              [1, "#CFC7B6"]
            ]),
            { role: "inlay" }
          )
        );
        continue;
      }
      const r = Math.max(2, gap * 0.36);
      const at = inlay.double ? [-gap * 1.1, gap * 1.1] : [0];
      for (const dy of at) {
        shapes.push(
          circleShape(cx, middle + dy, r, colors.inlay, { role: "inlay" }),
          circleShape(cx, middle + dy, r * 0.62, "rgba(255,255,255,0.12)", { role: "inlay" })
        );
      }
    }
    return shapes;
  }
  function fretShapes(options, colors) {
    const shapes = [];
    const per = fretWidth(options);
    const { first } = fretRange(options);
    const wireWidth = Math.max(1.2, per * 0.055);
    const nutWidth = Math.max(2.5, per * 0.14);
    for (const wire of fretWires(options)) {
      const isNut = wire.fret === 0 && first === 0;
      const w = isNut ? nutWidth : wireWidth;
      const edges = boardEdges(options, wire.offset);
      const top = edges.top - (isNut ? 0 : 0);
      const bottom = edges.bottom;
      if (isNut) {
        shapes.push(
          rectShape(
            wire.offset - w / 2,
            top,
            w,
            bottom - top,
            downward(top, bottom - top, [
              [0, "#FFFFFF"],
              [0.5, colors.nut],
              [1, "#C6B79A"]
            ]),
            { radius: w * 0.3, role: "nut" }
          )
        );
        continue;
      }
      shapes.push(
        rectShape(
          wire.offset - w / 2,
          top,
          w,
          bottom - top,
          downward(top, bottom - top, [
            [0, colors.fretWire],
            [0.45, "#FFFFFF"],
            [1, "#8E877E"]
          ]),
          { role: "fret" }
        )
      );
      shapes.push(
        rectShape(
          wire.offset + w / 2,
          top,
          Math.max(0.6, w * 0.45),
          bottom - top,
          colors.fretShadow,
          {
            role: "fret"
          }
        )
      );
    }
    return shapes;
  }
  function stringShapes(options, colors, endX) {
    const shapes = [];
    const head = guitarLayout(options).headstock;
    const startX = head.x + head.width * 0.62;
    const toX = Math.max(endX, options.width);
    for (const line of stringLines(options)) {
      const y0 = stringYAt(options, line.string, startX);
      const y1 = stringYAt(options, line.string, toX);
      const t = line.thickness;
      shapes.push(
        pathShape(
          `M${startX} ${y0 - t / 2} L${toX} ${y1 - t / 2} L${toX} ${y1 + t / 2} L${startX} ${y0 + t / 2} Z`,
          {
            x: startX,
            y: Math.min(y0, y1) - t,
            width: toX - startX,
            height: Math.abs(y1 - y0) + t * 2
          },
          colors.string,
          { role: "string" }
        )
      );
      shapes.push(
        pathShape(
          `M${startX} ${y0 - t / 2} L${toX} ${y1 - t / 2} L${toX} ${y1 - t * 0.2} L${startX} ${y0 - t * 0.2} Z`,
          { x: startX, y: Math.min(y0, y1) - t, width: toX - startX, height: Math.abs(y1 - y0) + t },
          colors.stringShine,
          { role: "string" }
        )
      );
    }
    return shapes;
  }
  function stringLabelShapes(options, colors) {
    if (options.stringLabels === false) return [];
    const gutter = guitarLayout(options).labels;
    if (!(gutter.width > 0)) return [];
    const gap = stringGap(options);
    const tuning = tuningFor(options);
    const badgeR = Math.min(gap * 0.46, gutter.width * 0.38);
    const labelSize = badgeR * 1.5;
    const shapes = [];
    for (const line of stringLines(options)) {
      const midi = tuning[line.string - 1];
      const x = gutter.x + gutter.width * 0.32;
      shapes.push(circleShape(x, line.offset, badgeR, colors.stringLabel, { role: "stringLabel" }));
      shapes.push({
        kind: "text",
        x,
        y: line.offset,
        width: badgeR * 2,
        height: badgeR * 2,
        fill: colors.stringLabelInk,
        role: "stringLabel",
        text: String(line.string),
        fontSize: labelSize,
        fontWeight: 800,
        align: "middle",
        baseline: "middle"
      });
      if (midi !== void 0) {
        shapes.push({
          kind: "text",
          x: gutter.x + gutter.width * 0.72,
          y: line.offset,
          width: gutter.width * 0.6,
          height: badgeR * 2,
          fill: colors.stringLabel,
          role: "stringName",
          text: stringName(midi, line.string === 1),
          fontSize: labelSize,
          fontWeight: 700,
          align: "start",
          baseline: "middle"
        });
      }
    }
    return shapes;
  }
  function fretNumberShapes(options, colors) {
    const { height } = options;
    const layout = guitarLayout(options);
    if (options.fretNumbers === false || layout.numbersY >= height) return [];
    const per = fretWidth(options);
    const { first, last } = fretRange(options);
    const wanted = (height - layout.numbersY) * 0.62;
    const everyFret = per * 0.5 >= height * 0.035;
    const size = Math.min(wanted, per * (everyFret ? 0.5 : 1.4));
    const shapes = [];
    for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
      if (!everyFret && fret % 3 !== 0 && !inlayFrets(options).some((i) => i.fret === fret)) continue;
      shapes.push({
        kind: "text",
        x: fretCenter(fret, options),
        y: layout.numbersY + (height - layout.numbersY) / 2,
        width: per,
        height: height - layout.numbersY,
        fill: colors.fretNumber,
        role: "fretNumber",
        text: String(fret),
        fontSize: size,
        fontWeight: 700,
        align: "middle",
        baseline: "middle"
      });
    }
    return shapes;
  }
  function markShapes(positions, options) {
    const colors = resolveColors(options.colors, options.instrument);
    const strings = new Set(stringLines(options).map((line) => line.string));
    const size = stringGap(options) * MARK_SIZE;
    const { first, last } = fretRange(options);
    const shapes = [];
    for (const position of positions) {
      if (!strings.has(position.string)) continue;
      if (position.fret < first || position.fret > last) continue;
      const color = fingerColor(position.finger, colors);
      const x = fretCenter(position.fret, options);
      const y = stringYAt(options, position.string, x);
      if (position.sliding) {
        const fromX = fretCenter(position.fromFret, options);
        const left = Math.min(fromX, x);
        const right = Math.max(fromX, x);
        shapes.push(
          rectShape(left, y - size * 0.22, Math.max(size * 0.2, right - left), size * 0.44, color, {
            radius: size * 0.22,
            opacity: 0.55,
            role: "mark"
          })
        );
      }
      shapes.push(
        circleShape(
          x,
          y,
          size / 2,
          radial(x - size * 0.18, y - size * 0.18, size * 0.9, [
            [0, "rgba(255,255,255,0.55)"],
            [0.45, color],
            [1, color]
          ]),
          { role: "mark" }
        )
      );
    }
    return shapes;
  }
  function stageShapes(options) {
    const positions = positionsAt(options.notes ?? [], options.seconds);
    return [
      ...fretboardShapes(options),
      ...markShapes(positions, options),
      ...pickShapes(options.pick, options)
    ];
  }
  function pickShapes(mark, options) {
    if (mark === void 0 || mark.age >= 1) return [];
    const colors = resolveColors(options.colors, options.instrument);
    const layout = guitarLayout(options);
    const struck = stringLines(options).filter((line) => mark.strings.includes(line.string));
    if (struck.length === 0) return [];
    const height0 = layout.board.height;
    const width = height0 * 0.13;
    const centreX = layout.body.x + width * 0.9;
    const ys = struck.map((line) => stringYAt(options, line.string, centreX));
    const first = Math.min(...ys);
    const last = Math.max(...ys);
    const centreY = (first + last) / 2;
    const spread = last - first;
    const height = Math.max(height0 * 0.2, spread + height0 * 0.08);
    const thickness = Math.max(1.5, width * 0.24);
    const d = mark.direction === "down" ? downStrokePath(centreX, centreY, width, height, thickness) : upStrokePath(centreX, centreY, width, height, thickness);
    const halo = mark.direction === "down" ? downStrokePath(centreX, centreY, width * 1.28, height * 1.18, thickness * 1.5) : upStrokePath(centreX, centreY, width * 1.28, height * 1.18, thickness * 1.5);
    const bounds = { x: centreX - width, y: centreY - height, width: width * 2, height: height * 2 };
    return [
      pathShape(halo, bounds, "rgba(0,0,0,0.55)", {
        opacity: 0.92 * (1 - mark.age),
        role: "pickStroke"
      }),
      pathShape(d, bounds, colors.pick, { opacity: 0.95 * (1 - mark.age), role: "pickStroke" })
    ];
  }
  function downStrokePath(cx, cy, w, h, t) {
    const left = cx - w / 2;
    const right = cx + w / 2;
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    return [
      `M${left} ${bottom}`,
      `L${left} ${top}`,
      `L${right} ${top}`,
      `L${right} ${bottom}`,
      `L${right - t} ${bottom}`,
      `L${right - t} ${top + t}`,
      `L${left + t} ${top + t}`,
      `L${left + t} ${bottom}`,
      "Z"
    ].join(" ");
  }
  function upStrokePath(cx, cy, w, h, t) {
    const left = cx - w / 2;
    const right = cx + w / 2;
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    return [
      `M${left} ${top}`,
      `L${left + t} ${top}`,
      `L${cx} ${bottom - t * 0.8}`,
      `L${right - t} ${top}`,
      `L${right} ${top}`,
      `L${cx} ${bottom}`,
      "Z"
    ].join(" ");
  }
  function shapesToSvg(shapes, width, height) {
    const gradients = new GradientBank();
    const body = shapes.map((shape) => {
      const common = {
        fill: gradients.paint(shape.fill),
        ...shape.stroke !== void 0 ? { stroke: shape.stroke } : {},
        ...shape.strokeWidth !== void 0 ? { "stroke-width": shape.strokeWidth } : {},
        ...shape.opacity !== void 0 ? { opacity: shape.opacity } : {}
      };
      if (shape.kind === "circle") {
        return tag("circle", { cx: shape.x, cy: shape.y, r: shape.width / 2, ...common });
      }
      if (shape.kind === "path") {
        return tag("path", { d: shape.d ?? "", ...common });
      }
      if (shape.kind === "text") {
        return wrap(
          "text",
          {
            x: shape.x,
            y: shape.y,
            "font-size": shape.fontSize,
            "font-weight": shape.fontWeight,
            "font-family": "'Sora', 'Manrope', sans-serif",
            "text-anchor": shape.align ?? "middle",
            "dominant-baseline": shape.baseline === "middle" ? "central" : shape.baseline ?? "alphabetic",
            ...common
          },
          escapeText(shape.text ?? "")
        );
      }
      return tag("rect", {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        ...shape.radius !== void 0 && shape.radius > 0 ? { rx: shape.radius } : {},
        ...common
      });
    }).join("");
    return wrap(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${n(width)} ${n(height)}`,
        width,
        height,
        preserveAspectRatio: "none"
      },
      gradients.finish(body)
    );
  }
  function renderGuitarStage(options) {
    return shapesToSvg(stageShapes(options), options.width, options.height);
  }
  function renderFretboard(options) {
    return renderGuitarStage({ ...options, seconds: 0, notes: [] });
  }

  // src/hand.ts
  var FINGER_LENGTH = {
    1: 0.88,
    2: 1,
    3: 0.94,
    4: 0.74
  };
  function handShapes(options) {
    const colors = resolveColors(options.colors);
    const { width, height } = options;
    if (!(width > 0) || !(height > 0)) return [];
    const skin = options.handColor ?? "#F2E7DF";
    const outline = options.outline ?? "#8A7C74";
    const line = Math.max(1, width * 0.012);
    const shapes = [];
    const palmLeft = width * 0.22;
    const palmRight = width * 0.94;
    const palmTop = height * 0.5;
    const palmWidth = palmRight - palmLeft;
    const palmHeight = height - palmTop - height * 0.03;
    const thumbWidth = palmWidth * 0.26;
    shapes.push({
      kind: "rect",
      x: palmLeft - thumbWidth * 0.8,
      y: palmTop + palmHeight * 0.16,
      width: thumbWidth,
      height: palmHeight * 0.66,
      fill: skin,
      stroke: outline,
      strokeWidth: line,
      radius: thumbWidth / 2
    });
    shapes.push({
      kind: "rect",
      x: palmLeft,
      y: palmTop,
      width: palmWidth,
      height: palmHeight,
      fill: skin,
      stroke: outline,
      strokeWidth: line,
      radius: Math.min(palmWidth, palmHeight) * 0.3
    });
    const gap = palmWidth * 0.06;
    const fingerWidth = (palmWidth - gap * 3) / 4;
    const longest = palmTop - height * 0.06;
    const dots = [];
    for (const key of [1, 2, 3, 4]) {
      const index = key - 1;
      const length = longest * FINGER_LENGTH[key];
      const x = palmLeft + index * (fingerWidth + gap);
      const y = palmTop - length;
      shapes.push({
        kind: "rect",
        x,
        y,
        width: fingerWidth,
        // Reaching into the palm, so no seam shows where they meet.
        height: length + palmHeight * 0.32,
        fill: skin,
        stroke: outline,
        strokeWidth: line,
        radius: fingerWidth / 2
      });
      const dotR = fingerWidth * 0.42;
      dots.push({
        kind: "circle",
        x: x + fingerWidth / 2,
        y: y + dotR * 1.5,
        width: dotR * 2,
        height: dotR * 2,
        fill: key === 1 ? colors.index : key === 2 ? colors.middle : key === 3 ? colors.ring : colors.little
      });
    }
    return [...shapes, ...dots];
  }
  function renderHand(options) {
    const gradients = new GradientBank();
    const body = handShapes(options).map((shape) => {
      const common = {
        fill: gradients.paint(shape.fill),
        ...shape.stroke !== void 0 ? { stroke: shape.stroke } : {},
        ...shape.strokeWidth !== void 0 ? { "stroke-width": shape.strokeWidth } : {}
      };
      if (shape.kind === "circle") {
        return tag("circle", { cx: shape.x, cy: shape.y, r: shape.width / 2, ...common });
      }
      return tag("rect", {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        ...shape.radius !== void 0 ? { rx: shape.radius } : {},
        ...common
      });
    }).join("");
    return wrap(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${n(options.width)} ${n(options.height)}`,
        width: options.width,
        height: options.height
      },
      gradients.finish(body)
    );
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=guitar-engine.js.map
