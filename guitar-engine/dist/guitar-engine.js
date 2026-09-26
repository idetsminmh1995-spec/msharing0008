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
    ACOUSTIC_BOARD: () => ACOUSTIC_BOARD,
    ACOUSTIC_COLORS: () => ACOUSTIC_COLORS,
    ACOUSTIC_CUTAWAY: () => ACOUSTIC_CUTAWAY,
    ACOUSTIC_NATURAL: () => ACOUSTIC_NATURAL,
    ACOUSTIC_SUNBURST: () => ACOUSTIC_SUNBURST,
    CLASSICAL_BOARD: () => CLASSICAL_BOARD,
    CLASSICAL_COLORS: () => CLASSICAL_COLORS,
    DEFAULT_COLORS: () => DEFAULT_COLORS,
    DEFAULT_FIRST_FRET: () => DEFAULT_FIRST_FRET,
    DEFAULT_LAST_FRET: () => DEFAULT_LAST_FRET,
    DEFAULT_STRINGS: () => DEFAULT_STRINGS,
    ELECTRIC_BOARD: () => ELECTRIC_BOARD,
    FINGER_COLORS: () => FINGER_COLORS,
    FINGER_NAMES: () => FINGER_NAMES,
    HAND_PICTURE: () => HAND_PICTURE,
    PHOTOS: () => PHOTOS,
    SINGLE_CUT_COLORS: () => SINGLE_CUT_COLORS,
    STANDARD_TUNING: () => STANDARD_TUNING,
    STRAT_BOARD: () => STRAT_BOARD,
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
    instrumentColors: () => instrumentColors,
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
  var ACOUSTIC_CUTAWAY = {
    width: 1920,
    height: 636,
    frets: [
      80,
      222,
      329,
      430,
      525,
      614,
      698,
      777,
      852,
      922,
      988,
      1050,
      1110,
      1165,
      1217,
      1268,
      1313,
      1359,
      1398,
      1437,
      1475
    ],
    boardEndX: 1521,
    stringsAtNut: [409, 517],
    stringsAtEnd: [392, 534],
    boardAtNut: [413, 527],
    boardAtEnd: [376, 548]
  };
  var ACOUSTIC_NATURAL = {
    width: 1920,
    height: 711,
    fit: "frame",
    frets: [
      -181.1,
      -72.9,
      34,
      132,
      220,
      304,
      383,
      458,
      529,
      596,
      660,
      721,
      779,
      834,
      885,
      934,
      980,
      1025,
      1066,
      1106,
      1143,
      1178,
      1212
    ],
    boardEndX: 1250,
    stringsAtNut: [492.6, 589.1],
    stringsAtEnd: [470.4, 609.9],
    boardAtNut: [489.5, 592.5],
    boardAtEnd: [463.8, 620.7]
  };
  var ACOUSTIC_SUNBURST = {
    width: 2e3,
    height: 714,
    fit: "frame",
    frets: [
      106.8,
      220,
      332,
      439,
      539,
      636,
      725,
      808,
      885,
      960,
      1028,
      1093,
      1157,
      1214,
      1270,
      1321,
      1368,
      1416,
      1458,
      1498,
      1538
    ],
    boardEndX: 1590,
    stringsAtNut: [434.8, 547.9],
    stringsAtEnd: [414.1, 565.1],
    boardAtNut: [428, 558.6],
    boardAtEnd: [398.3, 578.5]
  };
  var CLASSICAL_BOARD = {
    width: 2880,
    height: 824,
    fit: "frame",
    frets: [
      71.8,
      259.1,
      435.8,
      602.5,
      760,
      908.6,
      1048.8,
      1181.2,
      1306.1,
      1424.1,
      1535.4,
      1640.4,
      1739.6,
      1833.2,
      1921.6,
      2005,
      2083.7,
      2158,
      2228.1,
      2294.3
    ],
    boardEndX: 2880,
    stringsAtNut: [326.4, 547],
    stringsAtEnd: [270.2, 603.2],
    boardAtNut: [303.3, 570.1],
    boardAtEnd: [260.1, 613.3]
  };
  var ACOUSTIC_BOARD = {
    width: 2880,
    height: 824,
    fit: "frame",
    frets: [
      68.8,
      246.8,
      414.8,
      573.3,
      723,
      864.2,
      997.5,
      1123.4,
      1242.2,
      1354.3,
      1460.1,
      1560,
      1654.2,
      1743.2,
      1827.2,
      1906.5,
      1981.3,
      2051.9,
      2118.6,
      2181.5,
      2240.9
    ],
    boardEndX: 2880,
    stringsAtNut: [348.2, 525.2],
    stringsAtEnd: [309, 564.4],
    boardAtNut: [328.6, 544.9],
    boardAtEnd: [289.3, 584.1]
  };
  var ELECTRIC_BOARD = {
    width: 2880,
    height: 824,
    fit: "frame",
    frets: [
      68.1,
      239.7,
      401.6,
      554.4,
      698.6,
      834.8,
      963.3,
      1084.6,
      1199.1,
      1307.1,
      1409.1,
      1505.4,
      1596.3,
      1682.1,
      1763,
      1839.4,
      1911.5,
      1979.6,
      2043.9,
      2104.5,
      2161.8,
      2215.8,
      2266.8
    ],
    boardEndX: 2880,
    stringsAtNut: [351.6, 521.9],
    stringsAtEnd: [311.3, 562.2],
    boardAtNut: [334.5, 538.9],
    boardAtEnd: [294.2, 579.2]
  };
  var STRAT_BOARD = {
    width: 2880,
    height: 824,
    fit: "frame",
    frets: [
      67.7,
      243.7,
      409.7,
      566.5,
      714.4,
      854.1,
      985.9,
      1110.3,
      1227.7,
      1338.5,
      1443.1,
      1541.9,
      1635.1,
      1723,
      1806.1,
      1884.4,
      1958.4,
      2028.2,
      2094.1,
      2156.3,
      2215.1,
      2270.5
    ],
    boardEndX: 2880,
    stringsAtNut: [352.1, 521.4],
    stringsAtEnd: [313, 560.4],
    boardAtNut: [335.1, 538.3],
    boardAtEnd: [293.9, 579.5]
  };
  var PHOTOS = {
    "acoustic-cutaway": ACOUSTIC_CUTAWAY,
    "acoustic-sunburst": ACOUSTIC_SUNBURST,
    "acoustic-natural": ACOUSTIC_NATURAL,
    "fretboard-classical": CLASSICAL_BOARD,
    "fretboard-acoustic": ACOUSTIC_BOARD,
    "fretboard-electric": ELECTRIC_BOARD,
    "fretboard-strat": STRAT_BOARD
  };
  function photoNamed(name, href) {
    const measurements = PHOTOS[name];
    return measurements === void 0 ? void 0 : { ...measurements, href };
  }
  function guitarPhoto(href, measurements = ACOUSTIC_CUTAWAY) {
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
  var NECK_TAPER = 1.18;
  var BOARD_FILL = 0.88;
  var STRING_MARGIN = 0.18;
  var HEADSTOCK_SHARE = 0.1;
  var BLEED_BODY_VISIBLE = 0.26;
  var BLEED_BODY_SHARE = 0.3;
  var HAND_BAND_SHARE = 0.22;
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
    const bleed = options.bleed === true;
    const labelsWidth = bleed || options.stringLabels === false ? 0 : width * LABELS_SHARE;
    const headstockWidth = bleed ? 0 : width * HEADSTOCK_SHARE;
    const bodyWidth = width * (bleed ? BLEED_BODY_SHARE : BODY_SHARE);
    const bodyX = bleed ? width * (1 - BLEED_BODY_VISIBLE) : width - bodyWidth;
    return {
      board: { x: 0, y: handBand, width, height: boardHeight },
      labels: { x: 0, y: handBand, width: labelsWidth, height: boardHeight },
      headstock: { x: labelsWidth, y: handBand, width: headstockWidth, height: boardHeight },
      neck: {
        x: labelsWidth + headstockWidth,
        y: handBand,
        width: Math.max(1, bodyX - labelsWidth - headstockWidth),
        height: boardHeight
      },
      // The body is TALLER than the neck, as it is on the instrument:
      // without that there is no room above the neck for a cutaway horn
      // or below it for the bout, and the body can only ever be a box
      // the same height as the fretboard.
      body: {
        x: bodyX,
        y: handBand * 0.25,
        width: bodyWidth,
        height: height - handBand * 0.25 - numbers * 0.25
      },
      hand: { x: 0, y: 0, width, height: handBand },
      numbersY: handBand + boardHeight
    };
  }
  function stageHeightFor(width, photo, options) {
    if (!(width > 0) || !(photo.width > 0) || !(photo.height > 0)) return 0;
    const scaled = photo.height * (width / photo.width);
    const numbers = options?.fretNumbers === false ? 0 : NUMBERS_SHARE;
    const hand = options?.handLegend === true ? HAND_BAND_SHARE : 0;
    const share = Math.max(0.2, 1 - numbers - hand);
    if (photo.fit === "frame") {
      const at = photoStringMiddle(photo) / photo.height;
      const band = hand + share / 2;
      const cover = Math.min(at / band, (1 - at) / (1 - band));
      return Math.round(scaled * Math.max(0.05, cover));
    }
    return Math.round(scaled / share);
  }
  function photoPlacement(options) {
    const photo = options.photo;
    if (photo === void 0 || !(photo.width > 0) || !(options.width > 0)) return void 0;
    const scale = options.width / photo.width;
    const board = guitarLayout(options).board;
    return {
      photo,
      scale,
      x: 0,
      y: board.y + board.height / 2 - photoStringMiddle(photo) * scale
    };
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
    if (place === void 0) return guitarLayout(options).neck.x;
    return alongPhoto(place, place.photo.frets[0] ?? 0);
  }
  function middleOf(options) {
    const place = photoPlacement(options);
    if (place !== void 0) return acrossPhoto(place, photoStringMiddle(place.photo));
    const board = guitarLayout(options).board;
    return board.y + board.height / 2;
  }
  function taperAt(options, x) {
    const layout = guitarLayout(options);
    const nut = layout.neck.x;
    const end = Math.max(nut + 1, layout.body.x);
    return Math.min(1, Math.max(0, (x - nut) / (end - nut)));
  }
  function boardHalfAt(options, x) {
    const place = photoPlacement(options);
    if (place !== void 0) return photoHalfAt(place, "board", x);
    const board = guitarLayout(options).board;
    const widest = board.height * BOARD_FILL / 2;
    const narrow = widest / NECK_TAPER;
    return narrow + (widest - narrow) * taperAt(options, x);
  }
  function stringHalfAt(options, x) {
    const place = photoPlacement(options);
    if (place !== void 0) return photoHalfAt(place, "strings", x);
    return boardHalfAt(options, x) * (1 - STRING_MARGIN);
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
    const middle = middleOf(full);
    const half = stringHalfAt(full, nutXOf(full));
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
    const middle = middleOf(options);
    if (line === void 0) return middle;
    const atNut = stringHalfAt(options, nutXOf(options));
    if (!(atNut > 0)) return middle;
    return middle + (line.offset - middle) * (stringHalfAt(options, x) / atNut);
  }
  function fretWires(options) {
    const { first, last } = fretRange(options);
    if (!(options.width > 0)) return [];
    const place = photoPlacement(options);
    if (place !== void 0) {
      return place.photo.frets.map((offset, fret) => ({ fret, offset: alongPhoto(place, offset) }));
    }
    const neck = guitarLayout(options).neck;
    const perFret = neck.width / (last - first);
    const wires = [];
    for (let fret = first; fret <= last; fret++) {
      wires.push({ fret, offset: neck.x + (fret - first) * perFret });
    }
    return wires;
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
    const { first, last } = fretRange(options);
    return guitarLayout(options).neck.width / Math.max(1, last - first);
  }
  function fretCenter(fret, options) {
    const place = photoPlacement(options);
    if (place !== void 0) {
      const photo = place.photo;
      if (fret <= 0) return alongPhoto(place, photoWireX(photo, 0));
      return alongPhoto(place, (photoWireX(photo, fret - 1) + photoWireX(photo, fret)) / 2);
    }
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

  // src/instrument.ts
  function modelColors(instrument) {
    if (instrument === "classical") return CLASSICAL_COLORS;
    if (instrument === "acoustic") return ACOUSTIC_COLORS;
    if (instrument === "singleCut") return SINGLE_CUT_COLORS;
    return {};
  }
  function inlayStyle(instrument) {
    if (instrument === "classical") return "none";
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
  var CLASSICAL_COLORS = {
    board: "#3A2419",
    boardDark: "#241309",
    boardEdge: "#150B05",
    neckWood: "#B0824A",
    neckWoodDark: "#7A5528",
    binding: "#D8C9A6",
    inlay: "#F1EADD",
    inlayEdge: "rgba(0,0,0,0.3)",
    headstock: "#4A2E1C",
    headstockEdge: "#241309",
    peg: "#EFE9DC",
    pegPost: "#C9A227",
    string: "#F0E8D8",
    body: "#EBD3A3",
    bodyCentre: "#F8E9C8",
    bodyBurst: "#C9A468",
    bodyEdge: "#8A5A31",
    rosette: "#6B3F22",
    soundhole: "#120A05",
    hardware: "#3A2419",
    hardwareDark: "#150B05",
    knob: "#EFE9DC"
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
    const geom = bodyGeometry(options, body);
    const shapes = [];
    const top = model === "acoustic" || model === "classical" ? radial(geom.at(0.55), geom.middle, geom.visible * 1.1, [
      [0, colors.bodyCentre],
      [0.6, colors.body],
      [1, colors.bodyBurst]
    ]) : model === "singleCut" ? radial(geom.at(0.55), geom.middle - body.height * 0.05, geom.visible * 1.05, [
      [0, colors.bodyCentre],
      [0.42, colors.body],
      [0.85, colors.bodyBurst],
      [1, colors.bodyEdge]
    ]) : radial(geom.at(0.4), geom.middle, geom.visible * 1.15, [
      [0, colors.bodyCentre],
      [0.45, colors.body],
      [0.88, colors.bodyBurst],
      [1, colors.bodyEdge]
    ]);
    const outline = bodyOutline(model, geom);
    const bounds = { x: body.x, y: body.y, width: body.width, height: body.height };
    shapes.push(pathShape(outline, bounds, top, { role: "body" }));
    shapes.push(
      pathShape(outline, bounds, "none", {
        stroke: model === "electric" ? colors.bodyEdge : colors.binding,
        // Measured against the NECK: the body is much taller, and a
        // binding sized from it reads as a cream frame round a picture.
        strokeWidth: Math.max(1, geom.neckHalf * (model === "electric" ? 0.05 : 0.085)),
        role: "body"
      })
    );
    if (model === "acoustic" || model === "classical") {
      shapes.push(...acousticTop(geom, colors, options, model === "acoustic"));
    } else if (model === "singleCut") shapes.push(...singleCutTop(geom, colors, options));
    else shapes.push(...electricTop(geom, colors, options));
    return shapes;
  }
  function bodyGeometry(options, body) {
    const visible = Math.max(1, options.width - body.x);
    const board = guitarLayout(options).board;
    return {
      x: body.x,
      y: body.y,
      height: body.height,
      visible,
      right: body.x + Math.max(visible * 1.05, body.width),
      // The STRINGS' middle, not the body's: the pickups and the bridge
      // sit under the strings, and the body is taller than the neck.
      middle: board.y + board.height / 2,
      neckHalf: boardHalfAt(options, body.x),
      at: (fraction) => body.x + visible * fraction
    };
  }
  function bodyOutline(model, geom) {
    const { x, height, middle, neckHalf, right, at } = geom;
    const top = geom.y + height * 0.04;
    const bottom = geom.y + height * 0.96;
    const jointTop = middle - neckHalf * 1.1;
    const jointBottom = middle + neckHalf * 1.1;
    if (model === "acoustic" || model === "classical") {
      return [
        `M${x} ${jointTop}`,
        `C${at(0.1)} ${jointTop - height * 0.16} ${at(0.24)} ${top} ${at(0.55)} ${top}`,
        `L${right} ${top}`,
        `L${right} ${bottom}`,
        `C${at(0.5)} ${bottom} ${at(0.18)} ${bottom} ${at(0.07)} ${bottom - height * 0.06}`,
        `L${x} ${jointBottom}`,
        "Z"
      ].join(" ");
    }
    if (model === "singleCut") {
      return [
        `M${x} ${jointTop}`,
        `C${at(0.04)} ${jointTop - height * 0.2} ${at(0.14)} ${top + height * 0.06} ${at(0.3)} ${top + height * 0.05}`,
        `C${at(0.42)} ${top + height * 0.05} ${at(0.44)} ${top + height * 0.15} ${at(0.58)} ${top + height * 0.1}`,
        `C${at(0.76)} ${top + height * 0.04} ${at(0.88)} ${top} ${right} ${top}`,
        `L${right} ${bottom}`,
        `C${at(0.68)} ${bottom} ${at(0.28)} ${bottom} ${at(0.12)} ${bottom - height * 0.07}`,
        `L${x} ${jointBottom}`,
        "Z"
      ].join(" ");
    }
    return [
      `M${x} ${jointTop}`,
      `C${at(0.03)} ${jointTop - height * 0.2} ${at(0.1)} ${top + height * 0.06} ${at(0.24)} ${top + height * 0.05}`,
      `C${at(0.36)} ${top + height * 0.05} ${at(0.4)} ${top + height * 0.2} ${at(0.54)} ${top + height * 0.13}`,
      `C${at(0.72)} ${top + height * 0.05} ${at(0.84)} ${top} ${right} ${top}`,
      `L${right} ${bottom}`,
      `C${at(0.8)} ${bottom} ${at(0.56)} ${bottom} ${at(0.42)} ${bottom - height * 0.15}`,
      `C${at(0.3)} ${bottom - height * 0.25} ${at(0.24)} ${bottom - height * 0.03} ${at(0.12)} ${bottom - height * 0.06}`,
      `L${x} ${jointBottom}`,
      "Z"
    ].join(" ");
  }
  function acousticTop(geom, colors, options, plate) {
    const shapes = [];
    const { middle, height, at, visible } = geom;
    const r = Math.min(visible * 0.3, height * 0.32);
    const cx = at(0.52);
    if (plate)
      shapes.push(
        pathShape(
          `M${cx} ${middle - r * 0.2} L${cx + r * 2} ${middle + r * 0.55} L${cx + r * 1.6} ${middle + r * 1.7} L${cx - r * 0.2} ${middle + r * 1.2} Z`,
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
    const bridgeX = at(0.94);
    const bridgeW = visible * 0.12;
    const bridgeH = height * 0.46;
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
  function electricTop(geom, colors, options) {
    const shapes = [];
    const { middle, height, at, visible } = geom;
    const half = geom.neckHalf * 1.1;
    const plate = [
      `M${at(0.02)} ${middle - half * 0.8}`,
      `C${at(0.12)} ${middle - half * 1.12} ${at(0.4)} ${middle - half * 1.1} ${at(0.7)} ${middle - half * 0.94}`,
      `C${at(0.78)} ${middle - half * 0.88} ${at(0.78)} ${middle + half * 0.88} ${at(0.7)} ${middle + half * 0.94}`,
      `C${at(0.4)} ${middle + half * 1.1} ${at(0.12)} ${middle + half * 1.12} ${at(0.02)} ${middle + half * 0.8}`,
      "Z"
    ].join(" ");
    shapes.push(
      pathShape(
        plate,
        { x: at(0), y: middle - half * 1.2, width: visible, height: half * 2.4 },
        downward(middle - half * 1.2, half * 2.4, [
          [0, "#FFFFFF"],
          [0.5, colors.pickguard],
          [1, colors.pickguardEdge]
        ]),
        { role: "pickguard" }
      )
    );
    const pickupW = visible * 0.085;
    const pickupH = geom.neckHalf * 1.55;
    for (const [index, fraction] of [0.14, 0.36, 0.58].entries()) {
      const x = at(fraction);
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
    const bridgeX = at(0.94);
    const bridgeW = visible * 0.08;
    shapes.push(
      rectShape(
        bridgeX,
        middle - height * 0.3,
        bridgeW,
        height * 0.6,
        downward(middle - height * 0.3, height * 0.6, [
          [0, "#FFFFFF"],
          [0.4, colors.hardware],
          [1, colors.hardwareDark]
        ]),
        { radius: bridgeW * 0.2, role: "hardware" }
      )
    );
    for (const line of stringLines(options)) {
      const y = stringYAt(options, line.string, bridgeX);
      if (Math.abs(y - middle) > height * 0.3) continue;
      shapes.push(
        rectShape(bridgeX, y - height * 0.028, bridgeW, height * 0.056, colors.hardwareDark, {
          radius: height * 0.02,
          role: "hardware"
        })
      );
    }
    return shapes;
  }
  function singleCutTop(geom, colors, options) {
    const shapes = [];
    const { middle, height, at, visible } = geom;
    const knobR = Math.max(2, height * 0.062);
    const knobX = at(0.26);
    const knobY = geom.y + height * 0.14;
    shapes.push(
      circleShape(knobX, knobY, knobR * 1.15, "rgba(0,0,0,0.35)", { role: "hardware" }),
      circleShape(
        knobX,
        knobY,
        knobR,
        radial(knobX - knobR * 0.4, knobY - knobR * 0.4, knobR * 1.9, [
          [0, "#FFF6D8"],
          [0.45, colors.knob],
          [1, "#6E4E0E"]
        ]),
        { role: "hardware" }
      ),
      circleShape(knobX, knobY, knobR * 0.45, "rgba(0,0,0,0.18)", { role: "hardware" })
    );
    const pickupW = visible * 0.15;
    const pickupH = geom.neckHalf * 1.5;
    for (const fraction of [0.5, 0.84]) {
      const x = at(fraction);
      shapes.push(
        rectShape(
          x - pickupW * 0.12,
          middle - pickupH * 0.66,
          pickupW * 1.24,
          pickupH * 1.32,
          colors.hardwareDark,
          { radius: pickupW * 0.16, role: "pickup" }
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
          { radius: pickupW * 0.12, role: "pickup" }
        )
      );
      for (const line of stringLines(options)) {
        const y = stringYAt(options, line.string, x);
        if (Math.abs(y - middle) > pickupH * 0.44) continue;
        shapes.push(
          circleShape(x + pickupW * 0.34, y, Math.max(1, pickupW * 0.11), "#5E5852", {
            role: "pickup"
          })
        );
      }
    }
    return shapes;
  }

  // src/colors.ts
  var FINGER_COLORS = {
    index: "#FF725F",
    middle: "#6EB2FF",
    ring: "#3FE489",
    little: "#FF7DE4"
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
    body: "#C9762E",
    bodyEdge: "#2A1206",
    bodyBurst: "#5A2410",
    bodyCentre: "#E8B45C",
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

  // src/stage.ts
  var HAND_IMAGE_WIDEST = 0.18;
  var MARK_SIZE = 1.5;
  function stringGap(options) {
    const lines = stringLines(options);
    return lines.length > 1 ? lines[1].offset - lines[0].offset : guitarLayout(options).board.height / 6;
  }
  var boardEdges = boardEdgesAt;
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
    const picture = photoShapes(options);
    if (picture.length > 0) {
      return [
        ...shapes,
        ...picture,
        ...handLegendShapes(options),
        ...fretNumberShapes(options, colors)
      ];
    }
    const parts = { options, colors };
    shapes.push(...bodyShapes(parts));
    shapes.push(...headstockShapes(parts));
    const neck = layout.neck;
    const nutX = neck.x;
    const endX = Math.min(width, layout.body.x + (width - layout.body.x) * 0.06);
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
    shapes.push(...handLegendShapes(options));
    shapes.push(...inlayShapes(options, colors));
    shapes.push(...fretShapes(options, colors));
    shapes.push(...stringShapes(options, colors, endX));
    shapes.push(...stringLabelShapes(options, colors));
    shapes.push(...fretNumberShapes(options, colors));
    return shapes;
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
  function handLegendShapes(options) {
    if (options.handLegend !== true) return [];
    const band = guitarLayout(options).hand;
    if (!(band.height > 0)) return [];
    const floor = photoPlacement(options) !== void 0 ? boardEdges(options, fretCenter(1, options)).top : band.y + band.height;
    const height = Math.max(band.height, floor - band.y) * 0.94;
    const width = height * 0.78;
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
          x: band.x + band.width * 0.012,
          y: band.y + (Math.max(band.height, floor - band.y) - drawn.height) / 2,
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
      band.x + band.width * 0.012,
      band.y + (band.height - height) / 2
    );
  }
  function inlayShapes(options, colors) {
    const style = inlayStyle(options.instrument);
    if (style === "none") return [];
    const shapes = [];
    const gap = stringGap(options);
    const block = style === "block";
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
    const photographed = photoPlacement(options) !== void 0;
    const size = photographed ? Math.min(wanted, widestFret(options) * 0.42, boardDepth(options) * 0.3) : Math.min(wanted, per * (everyFret ? 0.5 : 1.4));
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
      if (!everyFret && !photographed && fret % 3 !== 0) continue;
      if (room(fret)) chosen.push(fret);
    }
    chosen.sort((a, b) => a - b);
    for (const fret of chosen) {
      const x = fretCenter(fret, options);
      shapes.push({
        kind: "text",
        x,
        y: photographed ? boardEdges(options, x).bottom + size * 0.9 : layout.numbersY + (height - layout.numbersY) / 2,
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
    const colors = resolveColors(options.colors, options.instrument);
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
    const colors = resolveColors(options.colors, options.instrument);
    const layout = guitarLayout(options);
    const struck = stringLines(options).filter((line) => mark.strings.includes(line.string));
    if (struck.length === 0) return [];
    const place = photoPlacement(options);
    const bodyX = place === void 0 ? layout.body.x : place.x + place.photo.boardEndX * place.scale;
    const edges = boardEdges(options, bodyX);
    const height0 = place === void 0 ? layout.board.height : edges.bottom - edges.top;
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
