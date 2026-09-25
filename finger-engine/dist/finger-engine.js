"use strict";
var FingerEngine = (() => {
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
    DEFAULTS: () => DEFAULTS,
    FINGER_KEYS: () => FINGER_KEYS,
    STANDARD_TUNING: () => STANDARD_TUNING,
    TIMELINE_SCHEMA: () => TIMELINE_SCHEMA,
    TIMELINE_SCHEMA_VERSION: () => TIMELINE_SCHEMA_VERSION,
    TUNING_PRESETS: () => TUNING_PRESETS,
    bpmAt: () => bpmAt,
    checkKeyframes: () => checkKeyframes,
    checkPitches: () => checkPitches,
    checkSchema: () => checkSchema,
    configHash: () => configHash,
    defaultInstrument: () => defaultInstrument,
    emptyFingerTracks: () => emptyFingerTracks,
    fingerKey: () => fingerKey,
    fingertipDistanceMm: () => fingertipDistanceMm,
    fingertipPoint: () => fingertipPoint,
    fingertipXMm: () => fingertipXMm,
    fretDistanceMm: () => fretDistanceMm,
    fretWidthMm: () => fretWidthMm,
    internalStringToMusicXml: () => internalStringToMusicXml,
    internalStringToRenderer: () => internalStringToRenderer,
    jitter: () => jitter,
    makeRng: () => makeRng,
    mergeConfig: () => mergeConfig,
    musicXmlStringToInternal: () => musicXmlStringToInternal,
    notationEngineStringToInternal: () => notationEngineStringToInternal,
    openPitch: () => openPitch,
    pitchAt: () => pitchAt,
    pitchRange: () => pitchRange,
    placementsForPitch: () => placementsForPitch,
    spanMm: () => spanMm,
    staffTuningLineToInternal: () => staffTuningLineToInternal,
    stringSpacingMm: () => stringSpacingMm,
    stringYMm: () => stringYMm,
    techniqueNames: () => techniqueNames,
    tempoMap: () => tempoMap,
    tickToSeconds: () => tickToSeconds,
    validateCore: () => validateCore
  });

  // src/defaults.ts
  var DEFAULTS = {
    input: {
      /** [P-001] Tab in the file is obeyed, even when it is awkward; a warning says so. */
      tabPolicy: "respect",
      /** [P-002] A written fingering wins over anything the solver would pick. */
      respectFingering: true,
      /** [P-013] A note the instrument cannot play is skipped, not transposed. */
      outOfRange: "skip",
      graceDurationSec: 0.06,
      pitchBendRangeSemitones: 2
    },
    instrument: {
      /** [P-004] Standard tuning, string 1 = low E2 [DM-01]. */
      numStrings: 6,
      tuning: [40, 45, 50, 55, 59, 64],
      capo: 0,
      numFrets: 22,
      /** Part 04 §2: Fender-style scale. Gibson ~628, classical ~650. */
      scaleLengthMm: 648,
      nutSpacingMm: 35,
      bridgeSpacingMm: 52.5
    },
    geometry: {
      /** [GEO-03] */
      fingertipBehindFret: 0.3
    },
    leftHand: {
      /** [P-012] The thumb over the top is a style, not a default. */
      allowThumb: false,
      /** [LH-04] millimetres between two fingertips: comfortable, and the hard limit. */
      spanMm: {
        "1-2": { comfort: 40, max: 65 },
        "2-3": { comfort: 30, max: 45 },
        "3-4": { comfort: 30, max: 45 },
        "1-3": { comfort: 65, max: 95 },
        "2-4": { comfort: 60, max: 85 },
        "1-4": { comfort: 90, max: 120 }
      },
      /** [LH-08] how often each finger is used, from Hori & Sagayama. */
      fingerProb: { 1: 0.35, 2: 0.3, 3: 0.25, 4: 0.1 },
      preferredMaxFret: 12,
      persistWindowSec: 1
    },
    solver: {
      /** [SV-02] notes this close together are one chord, not two stages. */
      onsetToleranceSec: 0.015,
      segmentGapSec: 2,
      beamWidth: 256,
      maxStaticCost: 50,
      hardMoveExponent: 1.3,
      shiftRefMm: 25,
      minFreeTimeSec: 0.05,
      confidenceScale: 2,
      /** [SV-14] how far a span limit may bend when the file leaves no choice. */
      relaxSpanFactor: 1.15
    },
    weights: {
      span: 1,
      fingerDifficulty: 1,
      crossing: 2,
      barreBase: 1.5,
      barrePerString: 0.2,
      barreLowFretExtra: 1,
      /** Negative: an open string is easier, so it pulls the cost down. */
      openStrings: -0.3,
      highFret: 0.1,
      bendFinger: 2,
      techniqueFinger: 1.5,
      shift: 1,
      shiftCount: 1,
      guideFinger: -0.5,
      stringChange: 0.5,
      sameFingerJump: 0.5,
      roll: 0.2,
      relift: 0.8,
      sustainCut: 2
    },
    rightHand: {
      /** [P-009] pick or fingers, worked out from the music unless told. */
      mode: "auto",
      pickStyle: "alternate",
      strum: { spreadSec: 0.02, upStrumMaxStrings: 4 }
    },
    motion: {
      /** [P-008] fingers stay down after a note like a real player's do. */
      holdPolicy: "realistic",
      idleLiftSec: 0.6,
      /** [MP-01] how early a finger starts moving towards its note. */
      leadFraction: 0.4,
      minLeadSec: 0.02,
      maxLeadSec: 0.12,
      /** [MP-02] Fitts's law: time = a + b · log2(distance / width + 1). */
      fitts: { aSec: 0.04, bSecPerBit: 0.03, targetWidthMm: 10 },
      slideMaxSec: 0.15,
      bendRiseSec: 0.15,
      harmonicReleaseSec: 0.05
    },
    humanize: {
      enabled: true,
      timeJitterSec: 8e-3,
      posJitterFret: 0.05
    },
    debug: false
  };
  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function mergeConfig(base, over) {
    if (over === void 0) return base;
    if (!isPlainObject(base) || !isPlainObject(over)) return over ?? base;
    const out = { ...base };
    for (const [key, value] of Object.entries(over)) {
      if (value === void 0) continue;
      const current = out[key];
      out[key] = isPlainObject(current) && isPlainObject(value) ? mergeConfig(current, value) : value;
    }
    return out;
  }
  function configHash(config) {
    const canonical = JSON.stringify(config, (_key, value) => {
      if (isPlainObject(value)) {
        return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
      }
      return value;
    });
    let hash = 2166136261;
    for (let i = 0; i < canonical.length; i++) {
      hash ^= canonical.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  // src/core/geometry.ts
  function fretDistanceMm(scaleLengthMm, fret) {
    if (fret <= 0) return 0;
    return scaleLengthMm * (1 - Math.pow(2, -fret / 12));
  }
  function fretWidthMm(scaleLengthMm, fret) {
    if (fret <= 0) return 0;
    return fretDistanceMm(scaleLengthMm, fret) - fretDistanceMm(scaleLengthMm, fret - 1);
  }
  function fingertipXMm(instrument, geometry, fret) {
    if (fret <= 0) return 0;
    if (instrument.capo > 0 && fret <= instrument.capo) {
      return fretDistanceMm(instrument.scaleLengthMm, instrument.capo);
    }
    return fretDistanceMm(instrument.scaleLengthMm, fret) - geometry.fingertipBehindFret * fretWidthMm(instrument.scaleLengthMm, fret);
  }
  function stringSpacingMm(instrument, xMm) {
    const span = instrument.nutSpacingMm + (instrument.bridgeSpacingMm - instrument.nutSpacingMm) * xMm / instrument.scaleLengthMm;
    return span / Math.max(1, instrument.numStrings - 1);
  }
  function stringYMm(instrument, string, xMm) {
    return (string - 1) * stringSpacingMm(instrument, xMm);
  }
  function fingertipPoint(instrument, geometry, string, fret) {
    const xMm = fingertipXMm(instrument, geometry, fret);
    return { xMm, yMm: stringYMm(instrument, string, xMm) };
  }
  function fingertipDistanceMm(a, b) {
    const alongMm = Math.abs(b.xMm - a.xMm);
    const acrossMm = Math.abs(b.yMm - a.yMm);
    return { distanceMm: Math.hypot(alongMm, acrossMm), alongMm, acrossMm };
  }
  function spanMm(instrument, geometry, fromFret, toFret) {
    return Math.abs(
      fingertipXMm(instrument, geometry, toFret) - fingertipXMm(instrument, geometry, fromFret)
    );
  }

  // src/core/rng.ts
  function makeRng(seed) {
    let state = (Math.trunc(seed) || 1) >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function jitter(rng, amount) {
    return (rng() * 2 - 1) * amount;
  }

  // src/core/tempo.ts
  var DEFAULT_US_PER_QUARTER = 5e5;
  function tempoMap(ticksPerQuarter, segments = []) {
    return {
      ticksPerQuarter: ticksPerQuarter > 0 ? ticksPerQuarter : 480,
      segments: [...segments].sort((a, b) => a.startTick - b.startTick)
    };
  }
  function tickToSeconds(map, tick) {
    if (!Number.isFinite(tick)) return 0;
    const target = Math.max(0, tick);
    let seconds = 0;
    let cursor = 0;
    let usPerQuarter = DEFAULT_US_PER_QUARTER;
    for (const segment of map.segments) {
      const start = Math.max(0, segment.startTick);
      if (start >= target) break;
      if (start > cursor) {
        seconds += (start - cursor) / map.ticksPerQuarter * (usPerQuarter / 1e6);
        cursor = start;
      }
      usPerQuarter = segment.microsecondsPerQuarter > 0 ? segment.microsecondsPerQuarter : usPerQuarter;
    }
    seconds += (target - cursor) / map.ticksPerQuarter * (usPerQuarter / 1e6);
    return seconds;
  }
  function bpmAt(map, tick) {
    let usPerQuarter = DEFAULT_US_PER_QUARTER;
    for (const segment of map.segments) {
      if (segment.startTick <= tick && segment.microsecondsPerQuarter > 0) {
        usPerQuarter = segment.microsecondsPerQuarter;
      } else if (segment.startTick > tick) break;
    }
    return 6e7 / usPerQuarter;
  }

  // src/core/tuning.ts
  var STANDARD_TUNING = [40, 45, 50, 55, 59, 64];
  var TUNING_PRESETS = {
    standard: STANDARD_TUNING,
    dropD: [38, 45, 50, 55, 59, 64],
    openG: [38, 43, 50, 55, 59, 62],
    dadgad: [38, 45, 50, 55, 57, 62],
    halfStepDown: [39, 44, 49, 54, 58, 63],
    sevenString: [35, 40, 45, 50, 55, 59, 64]
  };
  function musicXmlStringToInternal(xmlString, numStrings) {
    return numStrings + 1 - xmlString;
  }
  function internalStringToMusicXml(internal, numStrings) {
    return numStrings + 1 - internal;
  }
  function staffTuningLineToInternal(line) {
    return line;
  }
  function notationEngineStringToInternal(notationString, numStrings) {
    return musicXmlStringToInternal(notationString, numStrings);
  }
  function internalStringToRenderer(internal, numStrings) {
    return numStrings + 1 - internal;
  }
  function openPitch(instrument, string) {
    return instrument.tuning[string - 1];
  }
  function pitchAt(instrument, string, fret) {
    const open = openPitch(instrument, string);
    return open === void 0 ? void 0 : open + fret;
  }
  function placementsForPitch(instrument, pitch) {
    const out = [];
    const lowestFret = Math.max(0, instrument.capo);
    for (let string = 1; string <= instrument.numStrings; string++) {
      const open = openPitch(instrument, string);
      if (open === void 0) continue;
      const fret = pitch - open;
      if (fret < lowestFret || fret > instrument.numFrets) continue;
      if (!Number.isInteger(fret)) continue;
      out.push({ string, fret });
    }
    return out;
  }
  function pitchRange(instrument) {
    const open = instrument.tuning;
    const lowest = Math.min(...open) + Math.max(0, instrument.capo);
    const highest = Math.max(...open) + instrument.numFrets;
    return { lowest, highest };
  }

  // src/core/timeline-schema.ts
  var TIMELINE_SCHEMA = "finger-timeline";
  var TIMELINE_SCHEMA_VERSION = "1.0.0";
  var FINGER_KEYS = ["1", "2", "3", "4", "T"];
  function emptyFingerTracks() {
    return { "1": [], "2": [], "3": [], "4": [], T: [] };
  }
  function fingerKey(finger) {
    return finger === null ? null : String(finger);
  }
  function techniqueNames(techniques) {
    return techniques.length > 0 ? techniques.map(String) : ["normal"];
  }

  // src/core/validate-core.ts
  function finite(...values) {
    return values.every((value) => Number.isFinite(value));
  }
  function checkPitches(timeline) {
    const issues = [];
    const { tuning, numStrings } = timeline.instrument;
    for (const note of timeline.notes) {
      if (note.string < 1 || note.string > numStrings) {
        issues.push({
          rule: "V-01",
          severity: "error",
          message: `note ${note.noteId} is on string ${note.string}, which this instrument does not have`,
          noteId: note.noteId,
          time: note.time
        });
        continue;
      }
      const open = tuning[note.string - 1];
      if (open === void 0) continue;
      if (open + note.fret !== note.pitch) {
        issues.push({
          rule: "V-01",
          severity: "error",
          message: `note ${note.noteId} says pitch ${note.pitch}, but string ${note.string} fret ${note.fret} sounds ${open + note.fret}`,
          noteId: note.noteId,
          time: note.time
        });
      }
    }
    return issues;
  }
  function checkKeyframes(timeline) {
    const issues = [];
    for (const key of FINGER_KEYS) {
      const frames = timeline.leftHand.fingers[key] ?? [];
      let previous = -Infinity;
      for (const frame of frames) {
        if (!finite(frame.t, frame.string, frame.fret) || frame.bend !== void 0 && !finite(frame.bend)) {
          issues.push({
            rule: "V-08",
            severity: "error",
            message: `finger ${key} has a keyframe with a value that is not a number`,
            ...Number.isFinite(frame.t) ? { time: frame.t } : {}
          });
          continue;
        }
        if (frame.t <= previous) {
          issues.push({
            rule: "V-08",
            severity: "error",
            message: `finger ${key} has keyframes out of order at t=${frame.t}`,
            time: frame.t
          });
        }
        previous = frame.t;
      }
    }
    let previousHand = -Infinity;
    for (const frame of timeline.leftHand.hand) {
      if (!finite(frame.t, frame.fret)) {
        issues.push({ rule: "V-08", severity: "error", message: "a hand keyframe is not a number" });
        continue;
      }
      if (frame.t <= previousHand) {
        issues.push({
          rule: "V-08",
          severity: "error",
          message: `hand keyframes out of order at t=${frame.t}`,
          time: frame.t
        });
      }
      previousHand = frame.t;
    }
    for (const note of timeline.notes) {
      if (!finite(note.time, note.duration, note.pitch, note.string, note.fret, note.confidence)) {
        issues.push({
          rule: "V-08",
          severity: "error",
          message: `note ${note.noteId} carries a value that is not a number`,
          noteId: note.noteId
        });
      }
    }
    return issues;
  }
  function checkSchema(timeline) {
    if (timeline.schema !== TIMELINE_SCHEMA || timeline.schemaVersion !== TIMELINE_SCHEMA_VERSION) {
      return [
        {
          rule: "OUT-00",
          severity: "error",
          message: `timeline is ${String(timeline.schema)}@${String(timeline.schemaVersion)}, expected ${TIMELINE_SCHEMA}@${TIMELINE_SCHEMA_VERSION}`
        }
      ];
    }
    return [];
  }
  function validateCore(timeline) {
    const issues = [...checkSchema(timeline), ...checkPitches(timeline), ...checkKeyframes(timeline)];
    return { ok: issues.every((issue) => issue.severity !== "error"), issues };
  }

  // src/index.ts
  function defaultInstrument() {
    const { instrument } = DEFAULTS;
    return {
      kind: "guitar",
      numStrings: instrument.numStrings,
      tuning: [...instrument.tuning],
      capo: instrument.capo,
      numFrets: instrument.numFrets,
      scaleLengthMm: instrument.scaleLengthMm,
      nutSpacingMm: instrument.nutSpacingMm,
      bridgeSpacingMm: instrument.bridgeSpacingMm
    };
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=finger-engine.js.map
