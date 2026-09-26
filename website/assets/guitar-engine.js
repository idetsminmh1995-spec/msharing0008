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
    span: [223, 1454],
    // How far down the frame the neck sits. The owner drew an arrow:
    // the fretboard belongs down at the bottom, with the body running
    // off the bottom edge and the notation over the space it leaves.
    drop: 0.31,
    // Just behind the soundhole, towards the bridge. Measured off a
    // render: the soundhole's dark disc ends at 1201 and its rosette
    // rings at 1228, the bridge starts at 1344, and this is the middle
    // of what is left -- plain spruce, which is where a hand actually
    // plucks. It was 1180 and that is INSIDE the hole.
    pickX: 1275
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
    span: [251, 1293],
    // How far down the frame the neck sits. The owner drew an arrow:
    // the fretboard belongs down at the bottom, with the body running
    // off the bottom edge and the notation over the space it leaves.
    drop: 0.31,
    // Just behind the soundhole, towards the bridge, like the
    // dreadnought. Measured off a render: the hole is 916 to 1043 and
    // the bridge 1212 to 1251, and this is the middle of the cedar
    // between them. It was 1010, which is INSIDE the hole.
    pickX: 1120
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
    span: [512, 2761],
    // How far down the frame the neck sits. The owner drew an arrow:
    // the fretboard belongs down at the bottom, with the body running
    // off the bottom edge and the notation over the space it leaves.
    drop: 0.31,
    // Between the neck pickup and the middle one.
    pickX: 2350
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
    span: [375, 1654],
    // How far down the frame the neck sits. The owner drew an arrow:
    // the fretboard belongs down at the bottom, with the body running
    // off the bottom edge and the notation over the space it leaves.
    drop: 0.31,
    // Between the neck pickup and the bridge one.
    pickX: 1370
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
      const board2 = guitarLayout(options).board;
      return {
        photo,
        scale: scale2,
        // Centred across when the height ran out first and the span no
        // longer fills the width.
        x: -from * scale2 + (options.width - across * scale2) / 2,
        y: board2.y + board2.height / 2 - photoStringMiddle(photo) * scale2 + photoDrop(photo) * options.height
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
  function pickingX(options) {
    const place = photoPlacement(options);
    if (place === void 0) return void 0;
    const measured = place.photo.pickX;
    const along = typeof measured === "number" && Number.isFinite(measured) ? measured : place.photo.boardEndX;
    return alongPhoto(place, along);
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
    thumb: "#FFC93C",
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
      case "T":
        return colors.thumb;
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
  var ART = { width: 165, height: 196 };
  var SILHOUETTE = [
    79,
    27,
    86,
    27,
    86,
    28,
    87,
    28,
    87,
    29,
    88,
    29,
    88,
    30,
    90,
    31,
    90,
    98,
    91,
    98,
    91,
    99,
    93,
    99,
    93,
    98,
    94,
    98,
    94,
    42,
    95,
    42,
    95,
    40,
    96,
    40,
    97,
    38,
    100,
    38,
    100,
    37,
    104,
    37,
    104,
    38,
    106,
    38,
    106,
    39,
    107,
    39,
    107,
    40,
    109,
    41,
    109,
    44,
    110,
    44,
    110,
    101,
    112,
    101,
    112,
    100,
    113,
    100,
    113,
    60,
    114,
    60,
    114,
    57,
    115,
    57,
    116,
    55,
    118,
    55,
    118,
    54,
    124,
    54,
    124,
    55,
    126,
    55,
    126,
    56,
    128,
    57,
    128,
    59,
    129,
    59,
    129,
    153,
    128,
    153,
    128,
    157,
    127,
    157,
    126,
    161,
    125,
    161,
    125,
    162,
    124,
    162,
    124,
    163,
    123,
    163,
    123,
    164,
    122,
    164,
    122,
    165,
    121,
    165,
    120,
    167,
    118,
    167,
    118,
    168,
    116,
    168,
    116,
    169,
    114,
    169,
    114,
    170,
    108,
    171,
    108,
    172,
    103,
    172,
    103,
    173,
    83,
    173,
    83,
    172,
    78,
    172,
    78,
    171,
    74,
    171,
    74,
    170,
    71,
    170,
    71,
    169,
    68,
    169,
    68,
    168,
    64,
    167,
    64,
    166,
    63,
    166,
    63,
    165,
    61,
    165,
    61,
    164,
    60,
    164,
    60,
    163,
    59,
    163,
    59,
    162,
    58,
    162,
    58,
    161,
    57,
    161,
    57,
    160,
    56,
    160,
    56,
    159,
    55,
    159,
    55,
    158,
    54,
    158,
    54,
    157,
    53,
    157,
    53,
    156,
    52,
    156,
    52,
    155,
    51,
    155,
    51,
    154,
    50,
    154,
    50,
    153,
    49,
    153,
    49,
    152,
    48,
    152,
    47,
    150,
    45,
    150,
    45,
    149,
    44,
    149,
    44,
    148,
    43,
    148,
    43,
    147,
    42,
    147,
    42,
    146,
    41,
    146,
    41,
    145,
    40,
    145,
    40,
    144,
    39,
    144,
    39,
    143,
    38,
    143,
    38,
    142,
    37,
    142,
    37,
    141,
    36,
    141,
    36,
    140,
    35,
    140,
    35,
    139,
    34,
    139,
    34,
    138,
    33,
    138,
    33,
    137,
    32,
    137,
    32,
    136,
    31,
    136,
    31,
    135,
    30,
    135,
    30,
    134,
    29,
    134,
    29,
    133,
    28,
    133,
    28,
    132,
    27,
    132,
    26,
    130,
    24,
    130,
    24,
    129,
    23,
    129,
    23,
    128,
    22,
    128,
    22,
    127,
    20,
    126,
    20,
    124,
    19,
    124,
    19,
    117,
    20,
    117,
    20,
    116,
    21,
    116,
    22,
    114,
    25,
    114,
    25,
    113,
    29,
    113,
    29,
    114,
    33,
    114,
    33,
    115,
    35,
    115,
    35,
    116,
    37,
    116,
    37,
    117,
    39,
    117,
    39,
    118,
    41,
    118,
    41,
    119,
    43,
    119,
    43,
    120,
    47,
    121,
    48,
    123,
    50,
    123,
    50,
    124,
    52,
    124,
    52,
    125,
    55,
    125,
    55,
    47,
    56,
    47,
    56,
    44,
    57,
    44,
    57,
    43,
    58,
    43,
    59,
    41,
    67,
    41,
    67,
    42,
    68,
    42,
    68,
    43,
    70,
    44,
    70,
    46,
    71,
    46,
    71,
    94,
    72,
    94,
    72,
    95,
    74,
    95,
    74,
    94,
    75,
    94,
    75,
    31,
    76,
    31,
    76,
    29,
    77,
    29,
    77,
    28,
    79,
    28
  ];
  var THUMB = [
    25,
    113,
    33,
    114,
    33,
    115,
    35,
    115,
    35,
    116,
    37,
    116,
    37,
    117,
    39,
    117,
    39,
    118,
    41,
    118,
    41,
    119,
    43,
    119,
    43,
    120,
    45,
    120,
    45,
    121,
    47,
    121,
    48,
    123,
    50,
    123,
    50,
    124,
    52,
    124,
    36,
    140,
    35,
    140,
    35,
    139,
    34,
    139,
    34,
    138,
    33,
    138,
    33,
    137,
    32,
    137,
    32,
    136,
    31,
    136,
    31,
    135,
    30,
    135,
    30,
    134,
    29,
    134,
    29,
    133,
    28,
    133,
    28,
    132,
    27,
    132,
    26,
    130,
    24,
    130,
    24,
    129,
    23,
    129,
    23,
    128,
    22,
    128,
    22,
    127,
    20,
    126,
    20,
    124,
    19,
    124,
    19,
    117,
    20,
    117,
    20,
    116,
    21,
    116,
    22,
    114,
    25,
    114
  ];
  var INDEX = [
    59,
    41,
    67,
    41,
    67,
    42,
    68,
    42,
    68,
    43,
    70,
    44,
    70,
    46,
    71,
    46,
    71,
    94,
    72,
    94,
    72,
    114,
    55,
    114,
    55,
    47,
    56,
    47,
    56,
    44,
    57,
    44,
    57,
    43,
    58,
    43
  ];
  var MIDDLE = [
    79,
    27,
    86,
    27,
    86,
    28,
    87,
    28,
    87,
    29,
    88,
    29,
    88,
    30,
    90,
    31,
    90,
    98,
    91,
    98,
    91,
    114,
    72,
    114,
    72,
    95,
    74,
    95,
    74,
    94,
    75,
    94,
    75,
    31,
    76,
    31,
    76,
    29,
    77,
    29,
    77,
    28,
    79,
    28
  ];
  var RING = [
    100,
    37,
    104,
    37,
    104,
    38,
    106,
    38,
    106,
    39,
    107,
    39,
    107,
    40,
    109,
    41,
    109,
    44,
    110,
    44,
    110,
    101,
    111,
    101,
    111,
    118,
    91,
    118,
    91,
    99,
    93,
    99,
    93,
    98,
    94,
    98,
    94,
    42,
    95,
    42,
    95,
    40,
    96,
    40,
    97,
    38,
    100,
    38
  ];
  var LITTLE = [
    118,
    54,
    124,
    54,
    124,
    55,
    126,
    55,
    126,
    56,
    128,
    57,
    128,
    59,
    129,
    59,
    129,
    120,
    111,
    120,
    111,
    101,
    113,
    100,
    113,
    60,
    114,
    60,
    114,
    57,
    115,
    57,
    116,
    55,
    118,
    55
  ];
  var DIGITS = [
    { of: "thumb", outline: THUMB },
    { of: "index", outline: INDEX },
    { of: "middle", outline: MIDDLE },
    { of: "ring", outline: RING },
    { of: "little", outline: LITTLE }
  ];
  var DIGIT_TINTS = {
    thumb: (colors) => colors.thumb,
    index: (colors) => colors.index,
    middle: (colors) => colors.middle,
    ring: (colors) => colors.ring,
    little: (colors) => colors.little
  };
  function handShapes(options) {
    const colors = resolveColors(options.colors);
    const { width, height } = options;
    if (!(width > 0) || !(height > 0)) return [];
    const scale = Math.min(width / ART.width, height / ART.height);
    const offsetX = (width - ART.width * scale) / 2;
    const offsetY = (height - ART.height * scale) / 2;
    const piece = (outline, fill, extra = {}) => {
      const at = (index) => index % 2 === 0 ? offsetX + outline[index] * scale : offsetY + outline[index] * scale;
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      let d = "";
      for (let index = 0; index < outline.length; index += 2) {
        const x = at(index);
        const y = at(index + 1);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        d += `${index === 0 ? "M" : "L"}${round(x)},${round(y)}`;
      }
      return {
        kind: "path",
        d: `${d}Z`,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        fill,
        ...extra
      };
    };
    return [
      piece(
        SILHOUETTE,
        options.handColor ?? "#F2E7DF",
        options.outline === void 0 ? {} : { stroke: options.outline, strokeWidth: Math.max(1, width * 0.01) }
      ),
      ...DIGITS.map((digit) => piece(digit.outline, DIGIT_TINTS[digit.of](colors)))
    ];
  }
  function round(value) {
    return Math.round(value * 1e3) / 1e3;
  }
  function renderHand(options) {
    const gradients = new GradientBank();
    const body = handShapes(options).map(
      (shape) => tag("path", {
        d: shape.d ?? "",
        fill: gradients.paint(shape.fill),
        ...shape.stroke === void 0 ? {} : { stroke: shape.stroke },
        ...shape.strokeWidth === void 0 ? {} : { "stroke-width": shape.strokeWidth }
      })
    ).join("");
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
  var HAND_SHAPE = 165 / 196;
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
    const floor = boardEdges(options, fretCenter(1, options)).top - boardDepth(options) * 0.25;
    const height = Math.min(band.height, Math.max(0, floor)) * 0.86;
    const width = height * HAND_SHAPE;
    const left = band.x + band.width * 0.012;
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
      if (position.fret <= 0 && !position.sliding) continue;
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
    const centreX = pickingX(options) ?? bodyX + height0 * 0.42;
    const ys = struck.map((line) => stringYAt(options, line.string, centreX));
    const first = Math.min(...ys);
    const last = Math.max(...ys);
    const centreY = (first + last) / 2;
    const spread = last - first;
    const height = Math.max(height0 * 0.2, spread + height0 * 0.08);
    if (options.picking === "fingers") {
      return fingerstyleShapes(struck, options, colors, centreX, mark.age, mark.direction);
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
  function fingerstyleShapes(struck, options, colors, centreX, age, direction) {
    const gap = stringGap(options);
    const size = gap * MARK_SIZE;
    const fade = 1 - age;
    const shapes = [];
    const ys = struck.map((line) => stringYAt(options, line.string, centreX));
    for (const [index, line] of struck.entries()) {
      const y = ys[index];
      const color = pluckColor(line.string, colors);
      shapes.push(
        circleShape(
          centreX,
          y,
          size / 2,
          radial(centreX - size * 0.18, y - size * 0.18, size * 0.9, [
            [0, "rgba(255,255,255,0.55)"],
            [0.45, color],
            [1, color]
          ]),
          { opacity: 0.98 * fade, role: "pickStroke" }
        )
      );
    }
    return [...shapes, ...strokeArrowShapes(ys, centreX + size * 1.15, size, direction, fade)];
  }
  function strokeArrowShapes(ys, x, size, direction, fade) {
    if (ys.length === 0) return [];
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const reach = Math.max(size * 1.6, bottom - top + size * 1.2);
    const middle = (top + bottom) / 2;
    const up = direction === "down";
    const tip = up ? middle - reach / 2 : middle + reach / 2;
    const tail = up ? middle + reach / 2 : middle - reach / 2;
    const pointing = up ? 1 : -1;
    const arrow = (head2, stem2) => [
      `M${n(x - stem2 / 2)},${n(tail)}`,
      `L${n(x + stem2 / 2)},${n(tail)}`,
      `L${n(x + stem2 / 2)},${n(tip + head2 * pointing)}`,
      `L${n(x + head2)},${n(tip + head2 * pointing)}`,
      `L${n(x)},${n(tip)}`,
      `L${n(x - head2)},${n(tip + head2 * pointing)}`,
      `L${n(x - stem2 / 2)},${n(tip + head2 * pointing)}`,
      "Z"
    ].join("");
    const head = size * 0.5;
    const stem = Math.max(1.5, size * 0.16);
    const bounds = { x: x - head * 1.5, y: Math.min(tip, tail), width: head * 3, height: reach };
    return [
      pathShape(arrow(head * 1.4, stem * 2.6), bounds, "rgba(0,0,0,0.55)", {
        opacity: 0.85 * fade,
        role: "pickStroke"
      }),
      pathShape(arrow(head, stem), bounds, "#F7F4F0", {
        opacity: 0.98 * fade,
        role: "pickStroke"
      })
    ];
  }
  function pluckColor(string, colors) {
    switch (pluckingFinger(string)) {
      case "a":
        return colors.ring;
      case "m":
        return colors.middle;
      case "i":
        return colors.index;
      default:
        return colors.thumb;
    }
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
