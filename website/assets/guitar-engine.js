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
    ACOUSTIC_DRAWN: () => ACOUSTIC_DRAWN,
    CLASSICAL_DRAWN: () => CLASSICAL_DRAWN,
    DEFAULT_COLORS: () => DEFAULT_COLORS,
    DEFAULT_FIRST_FRET: () => DEFAULT_FIRST_FRET,
    DEFAULT_LAST_FRET: () => DEFAULT_LAST_FRET,
    DEFAULT_STRINGS: () => DEFAULT_STRINGS,
    ELECTRIC_DRAWN: () => ELECTRIC_DRAWN,
    FINGER_COLORS: () => FINGER_COLORS,
    FINGER_NAMES: () => FINGER_NAMES,
    HAND_PICTURE: () => HAND_PICTURE,
    PHOTOS: () => PHOTOS,
    STANDARD_TUNING: () => STANDARD_TUNING,
    STRAT_DRAWN: () => STRAT_DRAWN,
    boardEdgesAt: () => boardEdgesAt,
    boardHalfAt: () => boardHalfAt,
    fingerColor: () => fingerColor,
    fretCenter: () => fretCenter,
    fretRange: () => fretRange,
    fretWidth: () => fretWidth,
    fretWires: () => fretWires,
    fretboardShapes: () => fretboardShapes,
    guitarLayout: () => guitarLayout,
    guitarPhoto: () => guitarPhoto,
    handPicture: () => handPicture,
    handShapes: () => handShapes,
    inlayFrets: () => inlayFrets,
    markShapes: () => markShapes,
    photoFretCount: () => photoFretCount,
    photoNamed: () => photoNamed,
    photoPlacement: () => photoPlacement,
    pickShapes: () => pickShapes,
    positionsAt: () => positionsAt,
    renderFretboard: () => renderFretboard,
    renderGuitarStage: () => renderGuitarStage,
    renderHand: () => renderHand,
    resolveColors: () => resolveColors,
    stageHeightFor: () => stageHeightFor,
    stageShapes: () => stageShapes,
    stringCount: () => stringCount,
    stringHalfAt: () => stringHalfAt,
    stringLines: () => stringLines,
    stringName: () => stringName,
    stringYAt: () => stringYAt,
    tuningFor: () => tuningFor
  });

  // src/photo.ts
  var ACOUSTIC_DRAWN = {
    width: 1743,
    height: 682,
    fit: "whole",
    frets: [
      254.7,
      316,
      374,
      428,
      479,
      529,
      574.5,
      617,
      657,
      698.5,
      732,
      767,
      801.5,
      830,
      859,
      886,
      912,
      936.5,
      959,
      982,
      1003
    ],
    boardEndX: 1035,
    stringsAtNut: [300.8, 361.7],
    stringsAtEnd: [294.7, 378.4],
    boardAtNut: [292, 369.4],
    boardAtEnd: [284.5, 389.1],
    // The frame shows the guitar from just before the NUT to just past
    // the BRIDGE, which is the framing the owner asked for by name: the
    // headstock runs off the left edge and the rest of the body off the
    // right, and the whole playing length gets the frame.
    span: [223, 1454]
  };
  var CLASSICAL_DRAWN = {
    width: 1513.5,
    height: 584.3,
    fit: "whole",
    frets: [
      277.85,
      331,
      378.7,
      423.5,
      466.7,
      508.5,
      545.9,
      581.3,
      616.7,
      649.6,
      680.7,
      711.1,
      738,
      764.1,
      788.3,
      812.7,
      835.3,
      855.7,
      874.9,
      893.4
    ],
    boardEndX: 937.5,
    stringsAtNut: [267.7, 325.9],
    stringsAtEnd: [256.7, 336.9],
    boardAtNut: [261.2, 332.3],
    boardAtEnd: [249, 344.5],
    // The frame shows the guitar from just before the NUT to just past
    // the BRIDGE, which is the framing the owner asked for by name: the
    // headstock runs off the left edge and the rest of the body off the
    // right, and the whole playing length gets the frame.
    span: [251, 1293]
  };
  var STRAT_DRAWN = {
    width: 3058,
    height: 1002,
    fit: "whole",
    frets: [
      570.5,
      683,
      790,
      889,
      983,
      1072,
      1156.5,
      1236.5,
      1311,
      1382,
      1449,
      1512,
      1571,
      1626.5,
      1680,
      1731,
      1778,
      1822,
      1865,
      1904,
      1942,
      1978,
      2010.5
    ],
    boardEndX: 2033,
    stringsAtNut: [450.5, 561.9],
    stringsAtEnd: [436.2, 583],
    boardAtNut: [446.1, 568.9],
    boardAtEnd: [422.5, 595.6],
    // The frame shows the guitar from just before the NUT to just past
    // the BRIDGE, which is the framing the owner asked for by name: the
    // headstock runs off the left edge and the rest of the body off the
    // right, and the whole playing length gets the frame.
    span: [512, 2761]
  };
  var ELECTRIC_DRAWN = {
    width: 1920,
    height: 638,
    fit: "whole",
    frets: [
      407.6,
      471,
      531,
      587.2,
      641,
      691.2,
      738.5,
      783.2,
      825.8,
      865.5,
      903.2,
      938.8,
      972.2,
      1004.2,
      1033.8,
      1062.8,
      1089.2,
      1114.5,
      1138.2,
      1161,
      1182.2,
      1203.2,
      1222
    ],
    boardEndX: 1242.5,
    stringsAtNut: [285.5, 345.4],
    stringsAtEnd: [277.7, 355.9],
    boardAtNut: [281.1, 351.5],
    boardAtEnd: [269.8, 360],
    // The frame shows the guitar from just before the NUT to just past
    // the BRIDGE, which is the framing the owner asked for by name: the
    // headstock runs off the left edge and the rest of the body off the
    // right, and the whole playing length gets the frame.
    span: [375, 1654]
  };
  var PHOTOS = {
    "acoustic-drawn": ACOUSTIC_DRAWN,
    "classical-drawn": CLASSICAL_DRAWN,
    "electric-drawn": ELECTRIC_DRAWN,
    "strat-drawn": STRAT_DRAWN
  };
  function photoNamed(name, href) {
    const measurements = PHOTOS[name];
    return measurements === void 0 ? void 0 : { ...measurements, href };
  }
  function guitarPhoto(href, measurements = ACOUSTIC_DRAWN) {
    return { ...measurements, href };
  }
  function photoFretCount(photo) {
    return Math.max(1, photo.frets.length - 1);
  }
  function photoWireX(photo, fret) {
    const wires = photo.frets;
    const last = wires.length - 1;
    const first = wires[0] ?? 0;
    if (last < 1) return first;
    if (fret <= 0) return first;
    if (fret >= last) {
      const end = wires[last];
      const before = wires[last - 1];
      return end + (fret - last) * (end - before);
    }
    const low = Math.floor(fret);
    const a = wires[low];
    const b = wires[low + 1];
    return a + (b - a) * (fret - low);
  }
  function photoEdgeY(photo, edge, side, x) {
    const nutX = photo.frets[0] ?? 0;
    const endX = photo.boardEndX;
    const from = (edge === "strings" ? photo.stringsAtNut : photo.boardAtNut)[side];
    const to = (edge === "strings" ? photo.stringsAtEnd : photo.boardAtEnd)[side];
    const span = endX - nutX;
    if (!(Math.abs(span) > 0)) return from;
    return from + (to - from) * ((x - nutX) / span);
  }
  function photoStringMiddle(photo) {
    const nut = (photo.stringsAtNut[0] + photo.stringsAtNut[1]) / 2;
    const end = (photo.stringsAtEnd[0] + photo.stringsAtEnd[1]) / 2;
    return (nut + end) / 2;
  }

  // src/fretboard.ts
  var DEFAULT_STRINGS = 6;
  var DEFAULT_FIRST_FRET = 0;
  var DEFAULT_LAST_FRET = 12;
  var HAND_BAND_SHARE = 0.22;
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
    const photo = options.photo;
    if (photo !== void 0) return { first: 0, last: photoFretCount(photo) };
    const first = Number.isFinite(options.firstFret) ? Math.max(0, Math.round(options.firstFret)) : DEFAULT_FIRST_FRET;
    const lastRaw = Number.isFinite(options.lastFret) ? Math.round(options.lastFret) : DEFAULT_LAST_FRET;
    return { first, last: Math.max(first + 1, lastRaw) };
  }
  function guitarLayout(options) {
    const width = Math.max(0, options.width);
    const height = Math.max(0, options.height);
    const numbers = options.fretNumbers === false ? 0 : height * NUMBERS_SHARE;
    const handBand = options.handLegend === true ? height * HAND_BAND_SHARE : 0;
    const boardHeight = Math.max(1, height - numbers - handBand);
    return {
      board: { x: 0, y: handBand, width, height: boardHeight },
      hand: { x: 0, y: 0, width, height: handBand },
      numbersY: handBand + boardHeight
    };
  }
  function stageHeightFor(width, photo, options) {
    if (!(width > 0) || !(photo.width > 0) || !(photo.height > 0)) return 0;
    const scaled = photo.height * photoScale(width, photo);
    if (photo.fit === "whole") return Math.round(scaled);
    const numbers = options?.fretNumbers === false ? 0 : NUMBERS_SHARE;
    const hand = options?.handLegend === true ? HAND_BAND_SHARE : 0;
    const share = Math.max(0.2, 1 - numbers - hand);
    if (photo.fit === "frame") {
      const at = photoStringMiddle(photo) / photo.height;
      const band = Math.min(0.95, Math.max(0.05, hand + share / 2 + photoDrop(photo)));
      const cover = Math.min(at / band, (1 - at) / (1 - band));
      return Math.round(scaled * Math.max(0.05, cover));
    }
    return Math.round(scaled / share);
  }
  function photoPlacement(options) {
    const photo = options.photo;
    if (photo === void 0 || !(photo.width > 0) || !(options.width > 0)) return void 0;
    if (photo.fit === "whole" && photo.height > 0 && options.height > 0) {
      const [from, to] = photoSpan(photo);
      const across = to - from;
      const scale2 = Math.min(options.width / across, options.height / photo.height);
      const drawn = photo.height * scale2;
      const board2 = guitarLayout(options).board;
      const hung = board2.y + board2.height / 2 - photoStringMiddle(photo) * scale2 + photoDrop(photo) * options.height;
      const room = options.height - drawn;
      return {
        photo,
        scale: scale2,
        // Centred across when the height ran out first and the span no
        // longer fills the width.
        x: -from * scale2 + (options.width - across * scale2) / 2,
        y: Math.min(Math.max(hung, Math.min(0, room)), Math.max(0, room))
      };
    }
    const scale = photoScale(options.width, photo);
    const board = guitarLayout(options).board;
    return {
      photo,
      scale,
      x: -photoSpan(photo)[0] * scale,
      y: board.y + board.height / 2 - photoStringMiddle(photo) * scale + photoDrop(photo) * options.height
    };
  }
  function photoSpan(photo) {
    const span = photo.span;
    const whole = [0, photo.width];
    if (span === void 0) return whole;
    const [from, to] = span;
    if (!Number.isFinite(from) || !Number.isFinite(to)) return whole;
    return to - from > photo.width * 0.05 ? [from, to] : whole;
  }
  function photoScale(width, photo) {
    const [from, to] = photoSpan(photo);
    return width / (to - from);
  }
  function photoDrop(photo) {
    const drop = photo.drop;
    return typeof drop === "number" && drop > -0.9 && drop < 0.9 ? drop : 0;
  }
  function alongPhoto(place, x) {
    return place.x + x * place.scale;
  }
  function acrossPhoto(place, y) {
    return place.y + y * place.scale;
  }
  function inPhoto(place, x) {
    return (x - place.x) / place.scale;
  }
  function nutXOf(options) {
    const place = photoPlacement(options);
    if (place === void 0) return 0;
    return alongPhoto(place, place.photo.frets[0] ?? 0);
  }
  function middleOf(options) {
    const place = photoPlacement(options);
    if (place !== void 0) return acrossPhoto(place, photoStringMiddle(place.photo));
    const board = guitarLayout(options).board;
    return board.y + board.height / 2;
  }
  function boardHalfAt(options, x) {
    const place = photoPlacement(options);
    return place === void 0 ? 0 : photoHalfAt(place, "board", x);
  }
  function stringHalfAt(options, x) {
    const place = photoPlacement(options);
    return place === void 0 ? 0 : photoHalfAt(place, "strings", x);
  }
  function boardEdgesAt(options, x) {
    const place = photoPlacement(options);
    if (place !== void 0) {
      const at = inPhoto(place, x);
      return {
        top: acrossPhoto(place, photoEdgeY(place.photo, "board", 0, at)),
        bottom: acrossPhoto(place, photoEdgeY(place.photo, "board", 1, at))
      };
    }
    const middle = middleOf(options);
    const half = boardHalfAt(options, x);
    return { top: middle - half, bottom: middle + half };
  }
  function photoHalfAt(place, edge, x) {
    const at = inPhoto(place, x);
    const top = photoEdgeY(place.photo, edge, 0, at);
    const bottom = photoEdgeY(place.photo, edge, 1, at);
    return (bottom - top) / 2 * place.scale;
  }
  function stringLines(options) {
    const count = stringCount(options);
    if (!(options.height > 0)) return [];
    const full = {
      width: options.width ?? 1,
      height: options.height,
      ...options.strings !== void 0 ? { strings: options.strings } : {},
      ...options.fretNumbers !== void 0 ? { fretNumbers: options.fretNumbers } : {},
      ...options.stringLabels !== void 0 ? { stringLabels: options.stringLabels } : {},
      // These two move the board -- a bled neck starts at the left edge,
      // and a hand legend pushes everything down under its band -- so a
      // string worked out without them lands somewhere there is no neck.
      ...options.bleed !== void 0 ? { bleed: options.bleed } : {},
      ...options.handLegend !== void 0 ? { handLegend: options.handLegend } : {},
      // And this one moves the strings themselves onto a photograph.
      ...options.photo !== void 0 ? { photo: options.photo } : {}
    };
    const board = guitarLayout(full).board;
    const ends = stringEdgesAt(full, nutXOf(full));
    const middle = (ends.top + ends.bottom) / 2;
    const half = (ends.bottom - ends.top) / 2;
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
    if (options.photo !== void 0) {
      const count = stringCount(options);
      const { top, bottom } = stringEdgesAt(options, x);
      const at = Math.min(Math.max(string, 1), count);
      return count > 1 ? top + (bottom - top) * (at - 1) / (count - 1) : (top + bottom) / 2;
    }
    const lines = stringLines(options);
    const line = lines.find((candidate) => candidate.string === string);
    const middle = middleOf(options);
    if (line === void 0) return middle;
    const atNut = stringHalfAt(options, nutXOf(options));
    if (!(atNut > 0)) return middle;
    return middle + (line.offset - middle) * (stringHalfAt(options, x) / atNut);
  }
  function stringEdgesAt(options, x) {
    const place = photoPlacement(options);
    if (place === void 0) {
      const middle = middleOf(options);
      return { top: middle, bottom: middle };
    }
    const at = inPhoto(place, x);
    return {
      top: acrossPhoto(place, photoEdgeY(place.photo, "strings", 0, at)),
      bottom: acrossPhoto(place, photoEdgeY(place.photo, "strings", 1, at))
    };
  }
  function fretWires(options) {
    if (!(options.width > 0)) return [];
    const place = photoPlacement(options);
    if (place === void 0) return [];
    return place.photo.frets.map((offset, fret) => ({ fret, offset: alongPhoto(place, offset) }));
  }
  function fretWidth(options) {
    const place = photoPlacement(options);
    if (place !== void 0) {
      const wires = place.photo.frets;
      let narrowest = Infinity;
      for (let index = 1; index < wires.length; index++) {
        narrowest = Math.min(narrowest, wires[index] - wires[index - 1]);
      }
      return Number.isFinite(narrowest) ? narrowest * place.scale : place.photo.width * place.scale;
    }
    return 0;
  }
  function fretCenter(fret, options) {
    const place = photoPlacement(options);
    if (place === void 0) return 0;
    const photo = place.photo;
    if (fret <= 0) return alongPhoto(place, photoWireX(photo, 0));
    return alongPhoto(place, (photoWireX(photo, fret - 1) + photoWireX(photo, fret)) / 2);
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

  // src/colors.ts
  var FINGER_COLORS = {
    index: "#FF725F",
    middle: "#6EB2FF",
    ring: "#3FE489",
    little: "#FF7DE4"
  };
  var DEFAULT_COLORS = {
    fretNumber: "rgba(255,255,255,0.34)",
    pick: "#F7F4F0",
    unassigned: "#F7F4F0",
    open: "#9AA6B2",
    ...FINGER_COLORS,
    background: "none"
  };
  function resolveColors(colors) {
    return { ...DEFAULT_COLORS, ...colors ?? {} };
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

  // src/hand.ts
  var HAND_PICTURE = { width: 839, height: 915 };
  function handPicture(href) {
    return { ...HAND_PICTURE, href };
  }
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
      const colour = key === 1 ? colors.index : key === 2 ? colors.middle : key === 3 ? colors.ring : colors.little;
      dots.push({
        kind: "rect",
        x,
        y,
        width: fingerWidth,
        height: length * 0.62,
        fill: colour,
        radius: fingerWidth / 2
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
  function translateShapes(shapes, dx, dy) {
    if (dx === 0 && dy === 0) return shapes;
    return shapes.map((shape) => ({
      ...shape,
      x: shape.x + dx,
      y: shape.y + dy,
      ...shape.d === void 0 ? {} : { d: shiftPath(shape.d, dx, dy) }
    }));
  }
  function shiftPath(d, dx, dy) {
    let index = 0;
    return d.replace(/-?\d+(?:\.\d+)?/g, (value) => {
      const moved = Number(value) + (index % 2 === 0 ? dx : dy);
      index += 1;
      return String(Math.round(moved * 1e3) / 1e3);
    });
  }

  // src/stage.ts
  var HAND_IMAGE_WIDEST = 0.18;
  var MARK_SIZE = 1.5;
  function stringGap(options) {
    const lines = stringLines(options);
    return lines.length > 1 ? lines[1].offset - lines[0].offset : guitarLayout(options).board.height / 6;
  }
  var boardEdges = boardEdgesAt;
  function fretboardShapes(options) {
    const colors = resolveColors(options.colors);
    const { width, height } = options;
    if (!(width > 0) || !(height > 0)) return [];
    const shapes = [];
    if (colors.background !== "none") {
      shapes.push(rectShape(0, 0, width, height, colors.background));
    }
    const picture = photoShapes(options);
    if (picture.length === 0) return shapes;
    return [
      ...shapes,
      ...picture,
      ...photoFadeShapes(options),
      ...handLegendShapes(options),
      ...fretNumberShapes(options, colors)
    ];
  }
  function photoShapes(options) {
    const place = photoPlacement(options);
    if (place === void 0) return [];
    return [
      {
        kind: "image",
        x: place.x,
        y: place.y,
        width: place.photo.width * place.scale,
        height: place.photo.height * place.scale,
        fill: "none",
        href: place.photo.href,
        role: "photo"
      }
    ];
  }
  function fadeRgb(color) {
    if (typeof color !== "string") return void 0;
    const text = color.trim().toLowerCase();
    if (text === "" || text === "none" || text === "transparent") return void 0;
    const hex = /^#([0-9a-f]{3,8})$/.exec(text);
    const digits = hex?.[1];
    if (digits !== void 0) {
      const short = digits.length === 3 || digits.length === 4;
      const wide = digits.length === 6 || digits.length === 8;
      if (!short && !wide) return void 0;
      const step = short ? 1 : 2;
      const at = (i) => {
        const part = digits.slice(i * step, i * step + step);
        const value = Number.parseInt(short ? part + part : part, 16);
        return Number.isFinite(value) ? value : 0;
      };
      if (digits.length === (short ? 4 : 8) && at(3) === 0) return void 0;
      return [at(0), at(1), at(2)];
    }
    const rgb = /^rgba?\(([^)]*)\)$/.exec(text);
    const inside = rgb?.[1];
    if (inside !== void 0) {
      const parts = inside.split(/[\s,/]+/).filter((part) => part !== "").map((part) => Number.parseFloat(part));
      const [red, green, blue, alpha] = parts;
      if (red === void 0 || green === void 0 || blue === void 0) return void 0;
      if (!Number.isFinite(red) || !Number.isFinite(green) || !Number.isFinite(blue)) {
        return void 0;
      }
      if (alpha === 0) return void 0;
      return [red, green, blue];
    }
    return void 0;
  }
  var FADE_SHARE = 0.2;
  var FADE_OVERSHOOT = 2;
  function photoFadeShapes(options) {
    const place = photoPlacement(options);
    if (place === void 0) return [];
    if (place.photo.fit === "whole") return [];
    const rgb = fadeRgb(options.fadeTo);
    if (rgb === void 0) return [];
    const { width, height } = options;
    const band = height * FADE_SHARE;
    if (!(band > 0.5)) return [];
    const top = place.y;
    const bottom = place.y + place.photo.height * place.scale;
    const paint = (alpha) => `rgba(${n(rgb[0])}, ${n(rgb[1])}, ${n(rgb[2])}, ${n(alpha)})`;
    const ramp = (steps) => Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return [t, 1 - t * t * (3 - 2 * t)];
    });
    const stops = ramp(6);
    const shapes = [];
    if (top <= 1) {
      shapes.push(
        rectShape(
          0,
          -FADE_OVERSHOOT,
          width,
          band + FADE_OVERSHOOT,
          downward(
            0,
            band,
            stops.map(([offset, alpha]) => [offset, paint(alpha)])
          ),
          { role: "photoFade" }
        )
      );
    }
    if (bottom >= height - 1) {
      shapes.push(
        rectShape(
          0,
          height - band,
          width,
          band + FADE_OVERSHOOT,
          downward(
            height - band,
            band,
            stops.map(([offset, alpha]) => [1 - offset, paint(alpha)]).reverse()
          ),
          { role: "photoFade" }
        )
      );
    }
    return shapes;
  }
  function handLegendShapes(options) {
    if (options.handLegend !== true) return [];
    const band = guitarLayout(options).hand;
    if (!(band.height > 0)) return [];
    const under = boardEdges(options, fretCenter(1, options)).bottom;
    const ceiling = under + boardDepth(options) * 0.75;
    const height = Math.max(band.height, options.height - ceiling) * 0.94;
    const width = height * 0.78;
    const left = band.x + band.width * 0.012;
    const floor = options.height - (options.height - ceiling) * 0.03;
    const picture = options.handImage;
    if (picture !== void 0 && picture.width > 0 && picture.height > 0) {
      const scale = Math.min(
        height / picture.height,
        options.width * HAND_IMAGE_WIDEST / picture.width
      );
      const drawn = { width: picture.width * scale, height: picture.height * scale };
      return [
        {
          kind: "image",
          x: left,
          y: Math.max(0, floor - drawn.height),
          width: drawn.width,
          height: drawn.height,
          fill: "none",
          href: picture.href,
          role: "handLegend"
        }
      ];
    }
    return translateShapes(
      handShapes({ width, height, handColor: "#F6EDE6", outline: "rgba(0,0,0,0.35)" }),
      left,
      Math.max(0, floor - height)
    );
  }
  function fretNumberShapes(options, colors) {
    const { height } = options;
    const layout = guitarLayout(options);
    if (options.fretNumbers === false || layout.numbersY >= height) return [];
    const per = fretWidth(options);
    const { first, last } = fretRange(options);
    const wanted = (height - layout.numbersY) * 0.62;
    const size = Math.min(wanted, widestFret(options) * 0.42, boardDepth(options) * 0.3);
    const shapes = [];
    const taken = [];
    const room = (fret) => {
      const x = fretCenter(fret, options);
      const ink = size * 0.62 * String(fret).length + size * 0.24;
      const from = x - ink / 2;
      const to = x + ink / 2;
      if (taken.some((span) => from < span.to && to > span.from)) return false;
      taken.push({ from, to });
      return true;
    };
    const landmark = new Set(inlayFrets(options).map((inlay) => inlay.fret));
    const chosen = [];
    for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
      if (landmark.has(fret) && room(fret)) chosen.push(fret);
    }
    for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
      if (landmark.has(fret)) continue;
      if (room(fret)) chosen.push(fret);
    }
    chosen.sort((a, b) => a - b);
    for (const fret of chosen) {
      const x = fretCenter(fret, options);
      shapes.push({
        kind: "text",
        x,
        // Under the board, and never off the bottom of the stage: a
        // picture hung low enough would otherwise carry its numbers out
        // of the frame, where nobody can read them.
        y: Math.min(boardEdges(options, x).bottom + size * 0.9, height - size * 0.55),
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
  function boardDepth(options) {
    const edges = boardEdges(options, fretCenter(1, options));
    return Math.max(1, edges.bottom - edges.top);
  }
  function widestFret(options) {
    const wires = fretWires(options);
    let widest = 0;
    for (let index = 1; index < wires.length; index++) {
      const a = wires[index - 1];
      const b = wires[index];
      widest = Math.max(widest, b.offset - a.offset);
    }
    return widest > 0 ? widest : fretWidth(options);
  }
  function markShapes(positions, options) {
    const colors = resolveColors(options.colors);
    const strings = new Set(stringLines(options).map((line) => line.string));
    const size = stringGap(options) * MARK_SIZE;
    const { first, last } = fretRange(options);
    const shapes = [];
    for (const position of positions) {
      if (!strings.has(position.string)) continue;
      if (position.fret < first || position.fret > last) continue;
      const color = fingerColor(position.finger, colors);
      const x = Math.max(size * 0.6, fretCenter(position.fret, options));
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
    const colors = resolveColors(options.colors);
    const struck = stringLines(options).filter((line) => mark.strings.includes(line.string));
    if (struck.length === 0) return [];
    const place = photoPlacement(options);
    if (place === void 0) return [];
    const bodyX = place.x + place.photo.boardEndX * place.scale;
    const edges = boardEdges(options, bodyX);
    const height0 = edges.bottom - edges.top;
    const width = height0 * 0.13;
    const centreX = bodyX + width * 0.9;
    const ys = struck.map((line) => stringYAt(options, line.string, centreX));
    const first = Math.min(...ys);
    const last = Math.max(...ys);
    const centreY = (first + last) / 2;
    const spread = last - first;
    const height = Math.max(height0 * 0.2, spread + height0 * 0.08);
    if (options.picking === "fingers") {
      return fingerstyleShapes(struck, options, colors, centreX, mark.age);
    }
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
  function fingerstyleShapes(struck, options, colors, centreX, age) {
    const gap = stringGap(options);
    const size = gap * 1.3;
    const shapes = [];
    const fade = 1 - age;
    const ys = struck.map((line) => stringYAt(options, line.string, centreX));
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    shapes.push(
      rectShape(
        centreX - size * 0.6,
        top - size * 0.62,
        size * 1.2,
        bottom - top + size * 1.24,
        "rgba(0,0,0,0.5)",
        { radius: size * 0.55, opacity: 0.92 * fade, role: "pickStroke" }
      )
    );
    for (const [index, line] of struck.entries()) {
      const y = ys[index];
      shapes.push({
        kind: "text",
        x: centreX,
        y,
        width: size,
        height: size,
        fill: colors.pick,
        opacity: 0.98 * fade,
        role: "pickStroke",
        text: pluckingFinger(line.string),
        fontSize: size,
        fontWeight: 800,
        align: "middle",
        baseline: "middle"
      });
    }
    return shapes;
  }
  function pluckingFinger(string) {
    if (string === 1) return "a";
    if (string === 2) return "m";
    if (string === 3) return "i";
    return "p";
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
      if (shape.kind === "image") {
        return tag("image", {
          href: shape.href ?? "",
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          preserveAspectRatio: "none",
          ...shape.opacity !== void 0 ? { opacity: shape.opacity } : {}
        });
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
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=guitar-engine.js.map
