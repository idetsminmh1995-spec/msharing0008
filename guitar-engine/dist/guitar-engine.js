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
    positionsAt: () => positionsAt,
    renderFretboard: () => renderFretboard,
    renderGuitarStage: () => renderGuitarStage,
    renderHand: () => renderHand,
    resolveColors: () => resolveColors,
    stageShapes: () => stageShapes,
    stringCount: () => stringCount,
    stringLines: () => stringLines
  });

  // src/fretboard.ts
  var DEFAULT_STRINGS = 6;
  var DEFAULT_FIRST_FRET = 0;
  var DEFAULT_LAST_FRET = 12;
  var STRING_SPAN = 0.82;
  var HEADSTOCK_SHARE = 0.085;
  var BODY_SHARE = 0.16;
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
    const headstockWidth = width * HEADSTOCK_SHARE;
    const bodyWidth = width * BODY_SHARE;
    return {
      board: { x: 0, y: 0, width, height: boardHeight },
      headstock: { x: 0, y: 0, width: headstockWidth, height: boardHeight },
      neck: {
        x: headstockWidth,
        y: 0,
        width: Math.max(1, width - headstockWidth - bodyWidth),
        height: boardHeight
      },
      body: { x: width - bodyWidth, y: 0, width: bodyWidth, height: boardHeight },
      numbersY: boardHeight
    };
  }
  function stringLines(options) {
    const count = stringCount(options);
    if (!(options.height > 0)) return [];
    const board = guitarLayout({
      width: options.width ?? 1,
      height: options.height,
      ...options.fretNumbers !== void 0 ? { fretNumbers: options.fretNumbers } : {}
    }).board;
    const span = board.height * STRING_SPAN;
    const top = board.y + (board.height - span) / 2;
    const gap = count > 1 ? span / (count - 1) : 0;
    const lines = [];
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      lines.push({
        string: i + 1,
        offset: top + i * gap,
        thickness: Math.max(1, (THINNEST + (THICKEST - THINNEST) * t) * (gap || board.height / 6))
      });
    }
    return lines;
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

  // src/stage.ts
  var FINGER_COLORS = {
    index: "#E8352B",
    middle: "#2B5BE8",
    ring: "#1FA04A",
    little: "#F2C200"
  };
  var DEFAULT_COLORS = {
    board: "#2A1A12",
    boardEdge: "#120A06",
    fretWire: "#9A8F86",
    nut: "#E8DCCB",
    inlay: "#6E6158",
    string: "#D9CDBE",
    fretNumber: "rgba(255,255,255,0.34)",
    headstock: "#20130D",
    peg: "#BDB2A6",
    body: "#7A2418",
    bodyEdge: "#2A0F0A",
    soundhole: "#140B07",
    rosette: "#C9A227",
    pickup: "#1B1512",
    hardware: "#C6BCB1",
    unassigned: "#F7F4F0",
    open: "#9AA6B2",
    ...FINGER_COLORS,
    background: "none"
  };
  var ACOUSTIC_COLORS = {
    board: "#4A2C1A",
    headstock: "#3A2213",
    body: "#D9B478",
    bodyEdge: "#5A3A20"
  };
  function instrumentColors(instrument) {
    return instrument === "acoustic" ? ACOUSTIC_COLORS : {};
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
  function rectShape(x, y, width, height, fill, extra = {}) {
    return { kind: "rect", x, y, width, height, fill, ...extra };
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
    const strings = stringLines(options);
    const middleY = layout.board.y + layout.board.height / 2;
    const gap = strings.length > 1 ? strings[1].offset - strings[0].offset : layout.board.height / 6;
    const body = layout.body;
    shapes.push(
      rectShape(body.x, body.y, body.width, body.height, colors.body, {
        radius: Math.min(body.width, body.height) * 0.22
      })
    );
    if (options.instrument === "acoustic") {
      const r = Math.min(body.width, body.height) * 0.3;
      const cx = body.x + body.width * 0.52;
      shapes.push({
        kind: "circle",
        x: cx,
        y: middleY,
        width: r * 2.3,
        height: r * 2.3,
        fill: colors.rosette
      });
      shapes.push({
        kind: "circle",
        x: cx,
        y: middleY,
        width: r * 2,
        height: r * 2,
        fill: colors.soundhole
      });
    } else {
      const pickupWidth = body.width * 0.16;
      const pickupHeight = layout.board.height * 0.52;
      for (const at of [0.3, 0.58]) {
        shapes.push(
          rectShape(
            body.x + body.width * at,
            middleY - pickupHeight / 2,
            pickupWidth,
            pickupHeight,
            colors.pickup,
            {
              radius: pickupWidth * 0.25
            }
          )
        );
      }
      shapes.push(
        rectShape(
          body.x + body.width * 0.82,
          middleY - pickupHeight * 0.55,
          body.width * 0.07,
          pickupHeight * 1.1,
          colors.hardware,
          { radius: body.width * 0.02 }
        )
      );
    }
    const head = layout.headstock;
    shapes.push(
      rectShape(
        head.x,
        head.y + head.height * 0.12,
        head.width,
        head.height * 0.76,
        colors.headstock,
        {
          radius: head.width * 0.28
        }
      )
    );
    const pegR = Math.max(1.5, gap * 0.22);
    for (const line of strings) {
      shapes.push({
        kind: "circle",
        x: head.x + head.width * 0.42,
        y: line.offset,
        width: pegR * 2,
        height: pegR * 2,
        fill: colors.peg
      });
    }
    const neck = layout.neck;
    shapes.push(rectShape(neck.x, neck.y, neck.width, neck.height, colors.board));
    const inlayR = Math.max(2, gap * 0.34);
    for (const inlay of inlayFrets(options)) {
      const cx = fretCenter(inlay.fret, options);
      if (inlay.double) {
        for (const dy of [-gap, gap]) {
          shapes.push({
            kind: "circle",
            x: cx,
            y: middleY + dy,
            width: inlayR * 2,
            height: inlayR * 2,
            fill: colors.inlay
          });
        }
      } else {
        shapes.push({
          kind: "circle",
          x: cx,
          y: middleY,
          width: inlayR * 2,
          height: inlayR * 2,
          fill: colors.inlay
        });
      }
    }
    const per = fretWidth(options);
    const { first } = fretRange(options);
    const wireWidth = Math.max(1, per * 0.045);
    const nutWidth = Math.max(2, per * 0.12);
    for (const wire of fretWires(options)) {
      const isNut = wire.fret === 0 && first === 0;
      const w = isNut ? nutWidth : wireWidth;
      shapes.push(
        rectShape(wire.offset - w / 2, neck.y, w, neck.height, isNut ? colors.nut : colors.fretWire)
      );
    }
    for (const line of strings) {
      shapes.push(
        rectShape(0, line.offset - line.thickness / 2, width, line.thickness, colors.string)
      );
    }
    if (options.fretNumbers !== false && layout.numbersY < height) {
      const size = Math.min((height - layout.numbersY) * 0.62, per * 0.5);
      const { last } = fretRange(options);
      const everyFret = per > size * 1.6;
      for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
        if (!everyFret && fret % 3 !== 0 && !inlayFrets(options).some((i) => i.fret === fret))
          continue;
        shapes.push({
          kind: "text",
          x: fretCenter(fret, options),
          y: layout.numbersY + (height - layout.numbersY) / 2,
          width: per,
          height: height - layout.numbersY,
          fill: colors.fretNumber,
          text: String(fret),
          fontSize: size,
          fontWeight: 700,
          align: "middle",
          baseline: "middle"
        });
      }
    }
    return shapes;
  }
  function markShapes(positions, options) {
    const colors = resolveColors(options.colors, options.instrument);
    const strings = stringLines(options);
    const byString = new Map(strings.map((line) => [line.string, line]));
    const gap = strings.length > 1 ? strings[1].offset - strings[0].offset : options.height / 6;
    const size = gap * MARK_SIZE;
    const { first, last } = fretRange(options);
    const shapes = [];
    for (const position of positions) {
      const line = byString.get(position.string);
      if (line === void 0) continue;
      if (position.fret < first || position.fret > last) continue;
      const color = fingerColor(position.finger, colors);
      const x = fretCenter(position.fret, options);
      if (position.sliding) {
        const fromX = fretCenter(position.fromFret, options);
        const left = Math.min(fromX, x);
        const right = Math.max(fromX, x);
        shapes.push(
          rectShape(
            left,
            line.offset - size * 0.22,
            Math.max(size * 0.2, right - left),
            size * 0.44,
            color,
            {
              radius: size * 0.22,
              opacity: 0.55
            }
          )
        );
      }
      shapes.push({ kind: "circle", x, y: line.offset, width: size, height: size, fill: color });
    }
    return shapes;
  }
  function stageShapes(options) {
    const positions = positionsAt(options.notes ?? [], options.seconds);
    return [...fretboardShapes(options), ...markShapes(positions, options)];
  }
  function shapesToSvg(shapes, width, height) {
    const body = shapes.map((shape) => {
      const common = {
        fill: shape.fill,
        ...shape.stroke !== void 0 ? { stroke: shape.stroke } : {},
        ...shape.strokeWidth !== void 0 ? { "stroke-width": shape.strokeWidth } : {},
        ...shape.opacity !== void 0 ? { opacity: shape.opacity } : {}
      };
      if (shape.kind === "circle") {
        return tag("circle", { cx: shape.x, cy: shape.y, r: shape.width / 2, ...common });
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
      body
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
    const body = handShapes(options).map((shape) => {
      const common = {
        fill: shape.fill,
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
      body
    );
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=guitar-engine.js.map
