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
    ENGINE_NAME: () => ENGINE_NAME,
    ENGINE_VERSION: () => ENGINE_VERSION,
    FINGER_KEYS: () => FINGER_KEYS,
    STANDARD_TUNING: () => STANDARD_TUNING,
    TICKS_PER_QUARTER: () => TICKS_PER_QUARTER,
    TIMELINE_SCHEMA: () => TIMELINE_SCHEMA,
    TIMELINE_SCHEMA_VERSION: () => TIMELINE_SCHEMA_VERSION,
    TUNING_PRESETS: () => TUNING_PRESETS,
    allowedFingers: () => allowedFingers,
    analyzeGuitar: () => analyzeGuitar,
    beatTicksAt: () => beatTicksAt,
    bpmAt: () => bpmAt,
    buildDebugReport: () => buildDebugReport,
    buildStages: () => buildStages,
    checkKeyframes: () => checkKeyframes,
    checkPitches: () => checkPitches,
    checkSchema: () => checkSchema,
    childNamed: () => childNamed,
    childNumber: () => childNumber,
    childText: () => childText,
    childrenNamed: () => childrenNamed,
    confidenceFrom: () => confidenceFrom,
    configHash: () => configHash,
    defaultInstrument: () => defaultInstrument,
    descendants: () => descendants,
    emptyFingerTracks: () => emptyFingerTracks,
    expandStage: () => expandStage,
    fingerKey: () => fingerKey,
    fingertipDistanceMm: () => fingertipDistanceMm,
    fingertipPoint: () => fingertipPoint,
    fingertipXMm: () => fingertipXMm,
    fretDistanceMm: () => fretDistanceMm,
    fretWidthMm: () => fretWidthMm,
    fromNotationEngine: () => fromNotationEngine,
    guitarParts: () => guitarParts,
    guitarTracks: () => guitarTracks,
    handConfigKey: () => handConfigKey,
    handPosition: () => handPosition,
    infeasibleReason: () => infeasibleReason,
    internalStringToMusicXml: () => internalStringToMusicXml,
    internalStringToRenderer: () => internalStringToRenderer,
    isLegatoTarget: () => isLegatoTarget,
    jitter: () => jitter,
    leadSeconds: () => leadSeconds,
    makeRng: () => makeRng,
    mergeByKey: () => mergeByKey,
    mergeConfig: () => mergeConfig,
    musicXmlStringToInternal: () => musicXmlStringToInternal,
    normalizePart: () => normalizePart,
    notationEngineStringToInternal: () => notationEngineStringToInternal,
    notationNoteId: () => notationNoteId,
    openPitch: () => openPitch,
    parseMidi: () => parseMidi,
    parseMusicXml: () => parseMusicXml,
    parseXml: () => parseXml,
    pickEvents: () => pickEvents,
    pitchAt: () => pitchAt,
    pitchRange: () => pitchRange,
    pitchesReturningSoon: () => pitchesReturningSoon,
    placementDistanceMm: () => placementDistanceMm,
    placementsFor: () => placementsFor,
    placementsForPitch: () => placementsForPitch,
    planMotion: () => planMotion,
    pruneBeam: () => pruneBeam,
    reasonsFor: () => reasonsFor,
    relaxationFor: () => relaxationFor,
    report: () => report,
    resolveInstrument: () => resolveInstrument,
    resolveMode: () => resolveMode,
    solveStages: () => solveStages,
    spanKey: () => spanKey,
    spanLimit: () => spanLimit,
    spanMm: () => spanMm,
    staffTuningLineToInternal: () => staffTuningLineToInternal,
    stateKey: () => stateKey,
    staticFeatures: () => staticFeatures,
    stringSpacingMm: () => stringSpacingMm,
    stringYMm: () => stringYMm,
    subdivisionOfBeat: () => subdivisionOfBeat,
    techniqueNames: () => techniqueNames,
    tempoMap: () => tempoMap,
    tickToSeconds: () => tickToSeconds,
    transitionCost: () => transitionCost,
    transitionFeatures: () => transitionFeatures,
    travelSeconds: () => travelSeconds,
    validateCore: () => validateCore,
    validateGuitar: () => validateGuitar
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

  // src/core/timeline-schema.ts
  var TIMELINE_SCHEMA = "finger-timeline";
  var TIMELINE_SCHEMA_VERSION = "1.0.0";
  var ENGINE_NAME = "guitar-finger-engine";
  var ENGINE_VERSION = "1.0.0";
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

  // src/core/solver/beam.ts
  function mergeByKey(nodes) {
    const best = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      const seen = best.get(node.key);
      if (seen === void 0 || node.cost < seen.cost) best.set(node.key, node);
    }
    return [...best.values()];
  }
  function pruneBeam(nodes, width) {
    const sorted = [...nodes].sort((a, b) => a.cost - b.cost || (a.key < b.key ? -1 : 1));
    return sorted.slice(0, Math.max(1, width));
  }

  // src/core/solver/viterbi.ts
  function solveStages(input) {
    const { stages, beamWidth, maxRelax } = input;
    const levels = [];
    const relaxedStages = /* @__PURE__ */ new Map();
    for (let index = 0; index < stages.length; index++) {
      const stage = stages[index];
      const previousLevel = levels[index - 1];
      const isSegmentStart = index === 0 || previousLevel === void 0 || (input.segmentStart?.(index) ?? false);
      let produced = [];
      for (let relax = 0; relax <= maxRelax && produced.length === 0; relax++) {
        produced = expandLevel(
          input,
          stage,
          index,
          isSegmentStart ? void 0 : previousLevel,
          relax
        );
        if (produced.length > 0 && relax > 0) relaxedStages.set(index, relax);
      }
      if (produced.length === 0) {
        levels.push([]);
        continue;
      }
      levels.push(pruneBeam(mergeByKey(produced), beamWidth));
    }
    return traceBack(levels, relaxedStages);
  }
  function expandLevel(input, stage, index, previousLevel, relax) {
    const produced = [];
    if (previousLevel === void 0 || previousLevel.length === 0) {
      for (const state of input.expand(void 0, stage, index, relax)) {
        const cost = input.staticCost(state, stage, index);
        if (!Number.isFinite(cost)) continue;
        produced.push({ state, key: input.key(state), cost, parent: -1, edgeCost: 0, backward: 0 });
      }
      return produced;
    }
    for (let p = 0; p < previousLevel.length; p++) {
      const previous = previousLevel[p];
      for (const state of input.expand(previous.state, stage, index, relax)) {
        const move = input.transitionCost(previous.state, state, stage, index);
        if (!Number.isFinite(move)) continue;
        const hold = input.staticCost(state, stage, index);
        if (!Number.isFinite(hold)) continue;
        produced.push({
          state,
          key: input.key(state),
          cost: previous.cost + move + hold,
          parent: p,
          edgeCost: move + hold,
          backward: 0
        });
      }
    }
    return produced;
  }
  function traceBack(levels, relaxedStages) {
    const last = levels.length - 1;
    const stageNodeCounts = levels.map((level) => level.length);
    for (let index = last; index >= 0; index--) {
      const level = levels[index];
      for (const node of level) node.backward = index === last ? 0 : Infinity;
      const next = levels[index + 1];
      if (next === void 0) continue;
      for (const child of next) {
        if (child.parent < 0) continue;
        const parent = level[child.parent];
        if (parent === void 0 || !Number.isFinite(child.backward)) continue;
        const through = child.edgeCost + child.backward;
        if (through < parent.backward) parent.backward = through;
      }
    }
    const chosen = new Array(
      levels.length
    ).fill(void 0);
    let cursor = cheapest(levels[last] ?? []);
    const totalCost = cursor?.cost ?? 0;
    for (let index = last; index >= 0 && cursor !== void 0; index--) {
      chosen[index] = cursor;
      const parentLevel = levels[index - 1];
      cursor = cursor.parent >= 0 && parentLevel !== void 0 ? parentLevel[cursor.parent] : void 0;
    }
    const path = [];
    const margins = [];
    const runnersUp = [];
    for (let index = 0; index < levels.length; index++) {
      const level = levels[index];
      const best = chosen[index] ?? cheapest(level);
      if (best === void 0) {
        margins.push(Infinity);
        runnersUp.push(void 0);
        continue;
      }
      path.push(best.state);
      let runnerUp;
      for (const node of level) {
        if (node === best || !Number.isFinite(node.backward)) continue;
        const through = node.cost + node.backward;
        if (runnerUp === void 0 || through < runnerUp.cost + runnerUp.backward) runnerUp = node;
      }
      runnersUp.push(runnerUp?.state);
      margins.push(
        runnerUp === void 0 ? Infinity : runnerUp.cost + runnerUp.backward - (best.cost + best.backward)
      );
    }
    return { path, totalCost, margins, runnersUp, relaxedStages, stageNodeCounts };
  }
  function cheapest(level) {
    let best;
    for (const node of level) {
      if (best === void 0 || node.cost < best.cost || node.cost === best.cost && node.key < best.key) {
        best = node;
      }
    }
    return best;
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

  // src/input/normalize.ts
  var DUPLICATE_TOLERANCE_SEC = 5e-3;
  function normalizePart(part, instrument, config) {
    const warnings = [];
    const pitchTabMismatch = /* @__PURE__ */ new Set();
    const timed = part.notes.map((note) => {
      if (note.time > 0 || note.duration > 0) return note;
      const time = tickToSeconds(part.tempoMap, note.tick);
      const end = tickToSeconds(part.tempoMap, note.tick + Math.max(1, note.durationTicks));
      return { ...note, time, duration: Math.max(0, end - time) };
    });
    const sorted = [...timed].sort((a, b) => a.time - b.time || a.pitch - b.pitch);
    const graced = placeGraceNotes(sorted, config.graceDurationSec);
    const { lowest, highest } = pitchRange(instrument);
    const kept = [];
    let skipped = 0;
    for (const note of graced) {
      let duplicate = false;
      for (let i = kept.length - 1; i >= 0; i--) {
        const other = kept[i];
        if (note.time - other.time > DUPLICATE_TOLERANCE_SEC) break;
        if (other.pitch === note.pitch) {
          duplicate = true;
          break;
        }
      }
      if (duplicate) continue;
      if (note.pitch < lowest || note.pitch > highest) {
        skipped++;
        if (config.outOfRange === "skip") continue;
      }
      if (note.lockedString !== void 0 && note.lockedFret !== void 0) {
        const sounds = pitchAt(instrument, note.lockedString, note.lockedFret);
        if (sounds !== void 0 && sounds !== note.pitch) pitchTabMismatch.add(note.noteId);
      }
      kept.push(note);
    }
    if (skipped > 0) {
      warnings.push({
        code: "OUT_OF_RANGE",
        message: `${skipped} note(s) are outside this instrument's range and were skipped`
      });
    }
    if (pitchTabMismatch.size > 0) {
      warnings.push({
        code: "PITCH_TAB_MISMATCH",
        message: `${pitchTabMismatch.size} note(s) sound a different pitch than their written string and fret; the tab was kept`
      });
    }
    return {
      notes: kept,
      // [IN-N05] one fully-written note is enough to make this a tab part.
      hasTab: kept.some((note) => note.lockedString !== void 0 && note.lockedFret !== void 0),
      pitchTabMismatch,
      warnings
    };
  }
  function placeGraceNotes(notes, graceDurationSec) {
    if (!notes.some((note) => note.techniques.includes("grace"))) return notes;
    const out = [...notes];
    for (let i = out.length - 1; i >= 0; i--) {
      const note = out[i];
      if (note === void 0 || !note.techniques.includes("grace")) continue;
      const main = out[i + 1];
      const start = (main?.time ?? note.time) - graceDurationSec;
      out[i] = { ...note, time: start, duration: graceDurationSec };
    }
    return out.sort((a, b) => a.time - b.time || a.pitch - b.pitch);
  }

  // src/core/geometry.ts
  var MEMO_FRETS = 64;
  var memoScaleLength = -1;
  var memoDistances = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);
  function fretDistanceMm(scaleLengthMm, fret) {
    if (fret <= 0) return 0;
    if (fret > MEMO_FRETS || !Number.isInteger(fret)) {
      return scaleLengthMm * (1 - Math.pow(2, -fret / 12));
    }
    if (scaleLengthMm !== memoScaleLength) {
      memoScaleLength = scaleLengthMm;
      memoDistances = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);
    }
    const remembered = memoDistances[fret];
    if (!Number.isNaN(remembered)) return remembered;
    const distance = scaleLengthMm * (1 - Math.pow(2, -fret / 12));
    memoDistances[fret] = distance;
    return distance;
  }
  function fretWidthMm(scaleLengthMm, fret) {
    if (fret <= 0) return 0;
    return fretDistanceMm(scaleLengthMm, fret) - fretDistanceMm(scaleLengthMm, fret - 1);
  }
  function fingertipXMm(instrument, geometry, fret) {
    if (fret <= 0) return 0;
    const whole = fret <= MEMO_FRETS && Number.isInteger(fret);
    if (whole) {
      const signature = instrument.scaleLengthMm * 1e6 + instrument.capo * 1e3 + geometry.fingertipBehindFret;
      if (signature !== memoTipSignature) {
        memoTipSignature = signature;
        memoTips = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);
      }
      const remembered = memoTips[fret];
      if (!Number.isNaN(remembered)) return remembered;
    }
    const x = instrument.capo > 0 && fret <= instrument.capo ? fretDistanceMm(instrument.scaleLengthMm, instrument.capo) : fretDistanceMm(instrument.scaleLengthMm, fret) - geometry.fingertipBehindFret * fretWidthMm(instrument.scaleLengthMm, fret);
    if (whole) memoTips[fret] = x;
    return x;
  }
  var memoTipSignature = Number.NaN;
  var memoTips = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);
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

  // src/guitar/left-hand-rules.ts
  function allowedFingers(config) {
    return config.allowThumb ? [1, 2, 3, 4, "T"] : [1, 2, 3, 4];
  }
  function spanKey(a, b) {
    const order = [String(a), String(b)].sort();
    return `${order[0]}-${order[1]}`;
  }
  function spanLimit(config, a, b) {
    return config.spanMm[spanKey(a, b)];
  }
  function placementDistanceMm(instrument, geometry, a, b) {
    return fingertipDistanceMm(
      fingertipPoint(instrument, geometry, a.string, a.fret),
      fingertipPoint(instrument, geometry, b.string, b.fret)
    ).distanceMm;
  }
  function frettedOf(placements) {
    return placements.filter((placement) => placement.finger !== null && placement.fret > 0);
  }
  function infeasibleReason(placements, context) {
    const strings = /* @__PURE__ */ new Set();
    for (const placement of placements) {
      if (strings.has(placement.string)) {
        return { rule: "LH-15", message: `two notes at once on string ${placement.string}` };
      }
      strings.add(placement.string);
    }
    const fretted = frettedOf(placements);
    const byFinger = /* @__PURE__ */ new Map();
    for (const placement of fretted) {
      const key = String(placement.finger);
      const list = byFinger.get(key);
      if (list === void 0) byFinger.set(key, [placement]);
      else list.push(placement);
    }
    for (const [finger, held] of byFinger) {
      if (held.length > 1) {
        const frets = new Set(held.map((placement) => placement.fret));
        return frets.size > 1 ? { rule: "LH-03", message: `finger ${finger} cannot be at two frets at once` } : { rule: "LH-10", message: `finger ${finger} would have to barre, which Phase 2 adds` };
      }
    }
    for (const a of fretted) {
      for (const b of fretted) {
        if (a === b || a.finger === "T" || b.finger === "T") continue;
        const fa = a.finger;
        const fb = b.finger;
        if (a.fret < b.fret && fa > fb) {
          return {
            rule: "LH-05",
            message: `finger ${fa} at fret ${a.fret} is behind finger ${fb} at fret ${b.fret}`
          };
        }
      }
    }
    for (let i = 0; i < fretted.length; i++) {
      for (let j = i + 1; j < fretted.length; j++) {
        const a = fretted[i];
        const b = fretted[j];
        const limit = spanLimit(context.leftHand, a.finger, b.finger);
        if (limit === void 0) continue;
        const distance = placementDistanceMm(context.instrument, context.geometry, a, b);
        if (distance > limit.max * context.spanFactor) {
          return {
            rule: "LH-04",
            message: `fingers ${String(a.finger)} and ${String(b.finger)} would be ${distance.toFixed(0)} mm apart, past ${limit.max} mm`
          };
        }
      }
    }
    return void 0;
  }
  function handPosition(placements, previous) {
    const fretted = frettedOf(placements).filter((placement) => placement.finger !== "T");
    if (fretted.length === 0) return previous;
    const index = fretted.find((placement) => placement.finger === 1);
    if (index !== void 0) return index.fret;
    const lowest = fretted.reduce(
      (best, placement) => placement.finger < best.finger ? placement : best
    );
    return lowest.fret - (lowest.finger - 1);
  }

  // src/guitar/left-hand-cost.ts
  function fingerDifficulty(config, finger) {
    const probability = config.fingerProb[String(finger)] ?? 0.1;
    return -Math.log(Math.max(1e-6, probability));
  }
  function staticFeatures(placements, context) {
    const fretted = frettedOf(placements);
    const features = {
      span: 0,
      fingerDifficulty: 0,
      crossing: 0,
      openStrings: 0,
      highFret: 0
    };
    for (let i = 0; i < fretted.length; i++) {
      for (let j = i + 1; j < fretted.length; j++) {
        const a = fretted[i];
        const b = fretted[j];
        const limit = spanLimit(context.leftHand, a.finger, b.finger);
        if (limit === void 0) continue;
        const distance = placementDistanceMm(context.instrument, context.geometry, a, b);
        const over = Math.max(0, distance - limit.comfort);
        features.span += over * over / 100;
      }
    }
    for (const placement of fretted) {
      features.fingerDifficulty += fingerDifficulty(context.leftHand, placement.finger);
      features.highFret += Math.max(0, placement.fret - context.leftHand.preferredMaxFret);
    }
    for (const a of fretted) {
      for (const b of fretted) {
        if (a === b || a.finger === "T" || b.finger === "T") continue;
        const fa = a.finger;
        const fb = b.finger;
        if (fb > fa && b.string < a.string && Math.abs(a.fret - b.fret) <= 1) features.crossing += 1;
      }
    }
    features.openStrings = placements.filter((placement) => placement.finger === null).length;
    const weights = context.weights;
    const cost = weights.span * features.span + weights.fingerDifficulty * features.fingerDifficulty + weights.crossing * features.crossing + weights.openStrings * features.openStrings + weights.highFret * features.highFret;
    return { cost, features };
  }
  function transitionFeatures(input, context) {
    const features = {
      shift: 0,
      shiftCount: 0,
      guideFinger: 0,
      stringChange: 0,
      sameFingerJump: 0,
      roll: 0,
      relift: 0,
      sustainCut: 0
    };
    const cost = accumulate(input, context, features);
    return { cost, features };
  }
  function transitionCost(input, context) {
    return accumulate(input, context, void 0);
  }
  function accumulate(input, context, out) {
    const { previous, next, stage } = input;
    const weights = context.weights;
    let frettedBefore = 0;
    for (const placement of previous) {
      if (placement.finger !== null && placement.fret > 0) frettedBefore++;
    }
    const freeTime = frettedBefore === 0 && Number.isFinite(stage.openWindow) ? Math.max(stage.freeTime, stage.openWindow) : stage.freeTime;
    const time = Math.max(freeTime, context.solver.minFreeTimeSec);
    const fromX = fingertipXMm(context.instrument, context.geometry, input.previousHandPos);
    const toX = fingertipXMm(context.instrument, context.geometry, input.nextHandPos);
    const shift = Math.abs(toX - fromX) / context.solver.shiftRefMm / time;
    const shiftCount = Math.abs(input.nextHandPos - input.previousHandPos) > 0.5 ? 1 : 0;
    let guideFinger = 0;
    if (shiftCount === 1) {
      for (const placement of next) {
        if (placement.finger === null) continue;
        for (const before of previous) {
          if (before.finger === placement.finger && before.string === placement.string) {
            guideFinger = 1;
            break;
          }
        }
        if (guideFinger === 1) break;
      }
    }
    const fromString = previous[previous.length - 1]?.string;
    const toString = next[next.length - 1]?.string;
    const stringChange = fromString === void 0 || toString === void 0 ? 0 : Math.log(1 + Math.abs(toString - fromString));
    let sameFingerJump = 0;
    let roll = 0;
    for (const placement of next) {
      if (placement.finger === null) continue;
      const before = previous.find((other) => other.finger === placement.finger);
      if (before === void 0) continue;
      if (before.string === placement.string && before.fret === placement.fret) continue;
      if (before.fret === placement.fret && Math.abs(before.string - placement.string) === 1) {
        roll += 1;
      } else {
        sameFingerJump += 1 / Math.max(stage.dt, context.solver.minFreeTimeSec);
      }
    }
    let sustainCut = 0;
    let relift = 0;
    for (const placement of previous) {
      const note = context.noteById.get(placement.noteId);
      if (note === void 0) continue;
      const end = note.time + note.duration;
      if (end > stage.time + 1e-6) {
        let kept = false;
        for (const other of next) {
          if (other.noteId === placement.noteId) {
            kept = true;
            break;
          }
        }
        if (!kept) sustainCut += note.duration > 0 ? (end - stage.time) / note.duration : 1;
      }
      if (placement.finger !== null && context.pitchReturnsSoon.has(note.pitch)) {
        let stays = false;
        for (const other of next) {
          if (other.string === placement.string && other.fret === placement.fret) {
            stays = true;
            break;
          }
        }
        if (!stays) relift += 1;
      }
    }
    for (const placement of next) {
      const note = context.noteById.get(placement.noteId);
      const links = note?.techniqueLinks;
      if (links === void 0) continue;
      for (const link of links) {
        if (link.fromNoteId === void 0) continue;
        const source = previous.find((other) => other.noteId === link.fromNoteId);
        if (source === void 0) continue;
        if (source.string !== placement.string) return Infinity;
        if (link.type === "slide" && source.finger !== placement.finger) return Infinity;
      }
    }
    if (out !== void 0) {
      out.shift = shift;
      out.shiftCount = shiftCount;
      out.guideFinger = guideFinger;
      out.stringChange = stringChange;
      out.sameFingerJump = sameFingerJump;
      out.roll = roll;
      out.relift = relift;
      out.sustainCut = sustainCut;
    }
    const raw = weights.shift * shift + weights.shiftCount * shiftCount + weights.guideFinger * guideFinger + weights.stringChange * stringChange + weights.sameFingerJump * sameFingerJump + weights.roll * roll + weights.relift * relift + weights.sustainCut * sustainCut;
    return raw <= 0 ? raw : Math.pow(raw, context.solver.hardMoveExponent);
  }
  function pitchesReturningSoon(notes, windowSec) {
    const returns = /* @__PURE__ */ new Set();
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      for (let j = i + 1; j < notes.length; j++) {
        const later = notes[j];
        if (later.time - note.time > windowSec) break;
        if (later.pitch === note.pitch) {
          returns.add(note.pitch);
          break;
        }
      }
    }
    return returns;
  }

  // src/guitar/candidates.ts
  function relaxationFor(level, relaxSpanFactor) {
    return {
      spanFactor: level >= 1 ? relaxSpanFactor : 1,
      cutAllSustained: level >= 2,
      ignoreSpan: level >= 3,
      dropNotes: level >= 4 ? level - 3 : 0
    };
  }
  function placementsFor(note, instrument, leftHand) {
    const capo = Math.max(0, instrument.capo);
    const positions = note.lockedString !== void 0 && note.lockedFret !== void 0 ? (
      // [P-001] the file wrote the position; it is not the engine's to change.
      [{ string: note.lockedString, fret: note.lockedFret }]
    ) : placementsForPitch(instrument, note.pitch).filter(
      (position) => (note.lockedString === void 0 || position.string === note.lockedString) && (note.lockedFret === void 0 || position.fret === note.lockedFret)
    );
    const out = [];
    for (const position of positions) {
      if (position.fret === 0 || capo > 0 && position.fret <= capo) {
        out.push({ noteId: note.noteId, string: position.string, fret: position.fret, finger: null });
        continue;
      }
      for (const finger of allowedFingers(leftHand)) {
        if (note.lockedFinger !== void 0 && note.lockedFinger !== finger) continue;
        out.push({ noteId: note.noteId, string: position.string, fret: position.fret, finger });
      }
    }
    return out;
  }
  var MAX_STAGE_CANDIDATES = 4096;
  function expandStage(previous, stage, context, level) {
    const relaxation = relaxationFor(level, context.solver.relaxSpanFactor);
    const feasibility = {
      instrument: context.instrument,
      geometry: context.geometry,
      leftHand: context.leftHand,
      spanFactor: relaxation.ignoreSpan ? Infinity : relaxation.spanFactor
    };
    const onsets = relaxation.dropNotes > 0 ? dropHardest(stage.onsets, relaxation.dropNotes) : stage.onsets;
    if (onsets.length === 0) return [];
    const cacheKey = `${stage.index}:${level}`;
    const cached = context.variantCache?.get(cacheKey);
    const base = cached ?? buildVariants(onsets, context, feasibility, level);
    if (cached === void 0) context.variantCache?.set(cacheKey, base);
    const carried = relaxation.cutAllSustained ? [] : sustainedPlacements(previous, stage);
    const states = [];
    for (const variant of base) {
      const options = [variant];
      if (carried.length > 0) {
        const kept = keepCompatible(carried, variant.placements, feasibility);
        if (kept.length > 0) {
          const placements = [...variant.placements, ...kept];
          const { cost, features } = staticFeatures(placements, context);
          if (level > 0 || cost <= context.solver.maxStaticCost) {
            options.unshift({
              placements,
              staticCost: cost,
              features: { ...features },
              key: stateKey(placements),
              inheritsHandPos: frettedOf(placements).length === 0
            });
          }
        }
      }
      for (const option of options) {
        if (!option.inheritsHandPos && option.state !== void 0) {
          states.push(option.state);
          continue;
        }
        const handPos = handPosition(option.placements, previous?.handPos ?? 1);
        const state = {
          placements: option.placements,
          handPos,
          staticCost: option.staticCost,
          features: option.features,
          key: `${option.key}@${Math.round(handPos * 100)}`
        };
        if (!option.inheritsHandPos) option.state = state;
        states.push(state);
      }
    }
    return states;
  }
  function buildVariants(onsets, context, feasibility, level) {
    let partial = [[]];
    for (const note of onsets) {
      const options = placementsFor(note, context.instrument, context.leftHand);
      const grown = [];
      for (const base of partial) {
        for (const option of options) {
          const combined = [...base, option];
          if (infeasibleReason(combined, feasibility) !== void 0) continue;
          grown.push(combined);
          if (grown.length >= MAX_STAGE_CANDIDATES) break;
        }
        if (grown.length >= MAX_STAGE_CANDIDATES) break;
      }
      partial = grown;
      if (partial.length === 0) return [];
    }
    const variants = [];
    for (const placements of partial) {
      const { cost, features } = staticFeatures(placements, context);
      if (level === 0 && cost > context.solver.maxStaticCost) continue;
      variants.push({
        placements,
        staticCost: cost,
        features: { ...features },
        key: stateKey(placements),
        inheritsHandPos: frettedOf(placements).length === 0
      });
    }
    return variants;
  }
  function sustainedPlacements(previous, stage) {
    if (previous === void 0) return [];
    const stillSounding = new Set(stage.sustained.map((note) => note.noteId));
    return previous.placements.filter(
      (placement) => stillSounding.has(placement.noteId) && placement.finger !== null
    );
  }
  function keepCompatible(carried, placements, feasibility) {
    const kept = [];
    for (const placement of carried) {
      const candidate = [...placements, ...kept, placement];
      if (infeasibleReason(candidate, feasibility) === void 0) kept.push(placement);
    }
    return kept;
  }
  function handConfigKey(state) {
    const built = state.key;
    return built ?? `${stateKey(state.placements)}@${Math.round(state.handPos * 100)}`;
  }
  function stateKey(placements) {
    return [...placements].map(
      (placement) => `f${pad(placement.fret)}s${pad(placement.string)}:${String(placement.finger)}:${placement.noteId}`
    ).sort().join("|");
  }
  function pad(value) {
    return String(Math.round(value)).padStart(3, "0");
  }
  function dropHardest(onsets, count) {
    if (onsets.length <= count) return [];
    return [...onsets].sort((a, b) => a.pitch - b.pitch).slice(0, onsets.length - count);
  }

  // src/guitar/motion/planner.ts
  function travelSeconds(distanceMm, motion) {
    const width = Math.max(1e-6, motion.fitts.targetWidthMm);
    return motion.fitts.aSec + motion.fitts.bSecPerBit * Math.log2(1 + Math.abs(distanceMm) / width);
  }
  function leadSeconds(freeTime, motion) {
    const wanted = Number.isFinite(freeTime) ? freeTime * motion.leadFraction : motion.maxLeadSec;
    return Math.min(motion.maxLeadSec, Math.max(motion.minLeadSec, wanted));
  }
  function planMotion(input) {
    const { stages, path, motion, humanize } = input;
    const k = input.geometry.fingertipBehindFret;
    const jobs = buildJobs(stages, path, input.noteById);
    const fingers = emptyFingerTracks();
    const rushed = [];
    const handMoves = handKeyframes(stages, path, motion);
    for (const [finger, list] of jobs) {
      const track = [];
      let previous;
      for (const [index, job] of list.entries()) {
        const stage = stages[job.stageIndex];
        const lead = leadSeconds(stage?.freeTime ?? Infinity, motion);
        const wobble = humanize.enabled ? jitter(input.rng, humanize.timeJitterSec) : 0;
        const arrive = Math.min(job.onset - 5e-3, job.onset - lead + wobble);
        const from = previous === void 0 ? hoverPoint(job, path[job.stageIndex], input) : { string: previous.string, fret: previous.fret };
        const distance = fingertipDistanceMm(
          fingertipPoint(input.instrument, input.geometry, from.string, from.fret),
          fingertipPoint(input.instrument, input.geometry, job.string, job.fret)
        ).distanceMm;
        const travel = travelSeconds(distance, motion);
        const earliest = previous === void 0 ? arrive - travel : Math.min(previous.end, job.onset);
        let depart = Math.max(arrive - travel, earliest);
        if (depart > arrive) depart = arrive;
        if (arrive - depart + 1e-9 < travel && distance > 1) {
          rushed.push({ noteId: job.noteId, time: job.onset });
        }
        const posWobble = humanize.enabled ? jitter(input.rng, humanize.posJitterFret) : 0;
        const fretValue = job.fret <= 0 ? 0 : job.fret - k + posWobble;
        const fromFret = from.fret <= 0 ? 0 : from.fret - k;
        pushFrame(track, {
          t: depart,
          string: from.string,
          fret: fromFret,
          pressed: false,
          visible: true,
          ease: "easeInOut"
        });
        pushFrame(track, {
          t: arrive,
          string: job.string,
          fret: fretValue,
          pressed: true,
          visible: true,
          ease: "step",
          noteId: job.noteId
        });
        const next = list[index + 1];
        const lift = liftTime(job, next, handMoves, motion);
        if (job.end > arrive) {
          pushFrame(track, {
            t: job.end,
            string: job.string,
            fret: fretValue,
            pressed: true,
            visible: true,
            ease: "step"
          });
        }
        if (lift !== void 0) {
          pushFrame(track, {
            t: lift,
            string: job.string,
            fret: fretValue,
            pressed: false,
            visible: false
          });
        }
        previous = job;
      }
      fingers[finger] = track;
    }
    return { hand: handMoves, fingers, rushed };
  }
  function liftTime(job, next, handMoves, motion) {
    if (motion.holdPolicy === "noteDuration") {
      return next !== void 0 && next.onset <= job.end ? void 0 : job.end;
    }
    const idle = job.end + motion.idleLiftSec;
    const shift = handMoves.find(
      (move) => move.t > job.end + 1e-6 && Math.abs(move.fret - (job.fret - (job.finger === "T" ? 0 : Number(job.finger) - 1))) > 0.5
    )?.t;
    const limit = Math.min(idle, shift ?? Infinity);
    if (next !== void 0 && next.onset <= limit) return void 0;
    return limit;
  }
  function hoverPoint(job, hand, input) {
    const handPos = hand?.handPos ?? job.fret;
    const offset = job.finger === "T" ? 0 : Number(job.finger) - 1;
    const fret = Math.max(0, Math.min(input.instrument.numFrets, handPos + offset));
    return { string: job.string, fret };
  }
  function pushFrame(track, frame) {
    const last = track[track.length - 1];
    if (last !== void 0 && frame.t <= last.t) {
      track[track.length - 1] = { ...frame, t: last.t };
      return;
    }
    track.push(frame);
  }
  function buildJobs(stages, path, noteById) {
    const jobs = /* @__PURE__ */ new Map();
    const openJob = /* @__PURE__ */ new Map();
    for (const [index, state] of path.entries()) {
      const stage = stages[index];
      if (state === void 0 || stage === void 0) continue;
      for (const placement of state.placements) {
        if (placement.finger === null || placement.fret <= 0) continue;
        const finger = String(placement.finger);
        const note = noteById.get(placement.noteId);
        const end = note === void 0 ? stage.time : note.time + note.duration;
        const held = openJob.get(placement.noteId);
        if (held !== void 0 && held.finger === placement.finger && held.string === placement.string && held.fret === placement.fret) {
          held.end = Math.max(held.end, end);
          continue;
        }
        const job = {
          finger: placement.finger,
          noteId: placement.noteId,
          string: placement.string,
          fret: placement.fret,
          onset: note?.time ?? stage.time,
          end,
          stageIndex: index
        };
        openJob.set(placement.noteId, job);
        const list = jobs.get(finger);
        if (list === void 0) jobs.set(finger, [job]);
        else list.push(job);
      }
    }
    for (const list of jobs.values()) list.sort((a, b) => a.onset - b.onset);
    return jobs;
  }
  function handKeyframes(stages, path, motion) {
    const out = [];
    for (const [index, state] of path.entries()) {
      const stage = stages[index];
      if (state === void 0 || stage === void 0) continue;
      const previous = out[out.length - 1];
      if (previous !== void 0 && Math.abs(previous.fret - state.handPos) < 0.01) continue;
      const t = stage.time - leadSeconds(stage.freeTime, motion);
      if (previous !== void 0 && t <= previous.t) {
        out[out.length - 1] = { t: previous.t, fret: state.handPos, ease: "easeInOut" };
        continue;
      }
      out.push({ t, fret: state.handPos, ease: "easeInOut" });
    }
    return out;
  }

  // src/guitar/reasons.ts
  function confidenceFrom(margin, scale) {
    if (!Number.isFinite(margin)) return 1;
    if (margin <= 0) return 0;
    return 1 - Math.exp(-margin / Math.max(1e-6, scale));
  }
  function reasonsFor(input) {
    const { placement, note, state, previous, stage } = input;
    const reasons = [];
    if (note.lockedString !== void 0 && note.lockedFret !== void 0) reasons.push("TAB_LOCKED");
    if (note.lockedFinger !== void 0) reasons.push("FINGER_LOCKED");
    if (placement.finger === null) reasons.push("OPEN_STRING");
    for (const link of note.techniqueLinks ?? []) {
      if (link.fromNoteId === void 0) continue;
      reasons.push(link.type === "slide" ? "SLIDE_SAME_FINGER" : "LEGATO_SAME_STRING");
    }
    if (previous !== void 0) {
      const moved = Math.abs(state.handPos - previous.handPos) > 0.5;
      if (!moved) reasons.push("STAY_IN_POSITION");
      else if (input.rushed) reasons.push("SHIFT_RUSHED");
      else reasons.push(stage.freeTime >= 0.2 ? "SHIFT_WITH_TIME" : "SHIFT_RUSHED");
      if (moved && previous.placements.some(
        (before) => before.finger !== null && state.placements.some(
          (after) => after.finger === before.finger && after.string === before.string
        )
      )) {
        reasons.push("GUIDE_FINGER");
      }
    }
    const advantage = biggestAdvantage(state, input.runnerUp);
    if (advantage !== void 0) reasons.push(advantage);
    if (input.relaxed) reasons.push("FALLBACK_RELAXED");
    return [...new Set(reasons)].slice(0, 3);
  }
  function biggestAdvantage(state, runnerUp) {
    if (runnerUp === void 0) return void 0;
    const codes = {
      span: "AVOID_STRETCH",
      fingerDifficulty: "AVOID_PINKY",
      crossing: "AVOID_STRETCH",
      highFret: "STAY_IN_POSITION"
    };
    let best;
    for (const [feature, code] of Object.entries(codes)) {
      const mine = state.features[feature] ?? 0;
      const theirs = runnerUp.features[feature] ?? 0;
      const gain = theirs - mine;
      if (gain > 1e-6 && (best === void 0 || gain > best.gain)) best = { code, gain };
    }
    const openGain = (state.features["openStrings"] ?? 0) - (runnerUp.features["openStrings"] ?? 0);
    if (openGain > 0 && (best === void 0 || openGain > best.gain)) return "OPEN_STRING";
    return best?.code;
  }

  // src/input/musicxml/xml.ts
  var ENTITIES = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'"
  };
  function decodeEntities(raw) {
    return raw.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
      if (body.startsWith("#x") || body.startsWith("#X")) {
        const code = Number.parseInt(body.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      if (body.startsWith("#")) {
        const code = Number.parseInt(body.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return ENTITIES[body] ?? whole;
    });
  }
  function readAttributes(raw) {
    const attributes = {};
    const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let match = pattern.exec(raw);
    while (match !== null) {
      attributes[match[1]] = decodeEntities(match[3] ?? match[4] ?? "");
      match = pattern.exec(raw);
    }
    return attributes;
  }
  function parseXml(source) {
    const stack = [];
    let root;
    let cursor = 0;
    while (cursor < source.length) {
      const open = source.indexOf("<", cursor);
      if (open < 0) break;
      if (open > cursor) {
        const chunk = source.slice(cursor, open);
        const parent2 = stack[stack.length - 1];
        if (parent2 !== void 0 && chunk.trim() !== "") parent2.text += decodeEntities(chunk);
      }
      if (source.startsWith("<!--", open)) {
        const end = source.indexOf("-->", open);
        cursor = end < 0 ? source.length : end + 3;
        continue;
      }
      if (source.startsWith("<![CDATA[", open)) {
        const end = source.indexOf("]]>", open);
        const body2 = source.slice(open + 9, end < 0 ? source.length : end);
        const parent2 = stack[stack.length - 1];
        if (parent2 !== void 0) parent2.text += body2;
        cursor = end < 0 ? source.length : end + 3;
        continue;
      }
      if (source.startsWith("<?", open)) {
        const end = source.indexOf("?>", open);
        cursor = end < 0 ? source.length : end + 2;
        continue;
      }
      if (source.startsWith("<!", open)) {
        let end = source.indexOf(">", open);
        const bracket = source.indexOf("[", open);
        if (bracket >= 0 && (end < 0 || bracket < end)) {
          const close2 = source.indexOf("]>", bracket);
          end = close2 < 0 ? -1 : close2 + 1;
        }
        cursor = end < 0 ? source.length : end + 1;
        continue;
      }
      const close = source.indexOf(">", open);
      if (close < 0) break;
      const inner = source.slice(open + 1, close);
      if (inner.startsWith("/")) {
        const name2 = inner.slice(1).trim();
        for (let depth = stack.length - 1; depth >= 0; depth--) {
          if (stack[depth].name === name2) {
            stack.length = depth;
            break;
          }
        }
        cursor = close + 1;
        continue;
      }
      const selfClosing = inner.endsWith("/");
      const body = selfClosing ? inner.slice(0, -1) : inner;
      const space = body.search(/\s/);
      const name = (space < 0 ? body : body.slice(0, space)).trim();
      const node = {
        name,
        attributes: space < 0 ? {} : readAttributes(body.slice(space)),
        children: [],
        text: ""
      };
      const parent = stack[stack.length - 1];
      if (parent === void 0) {
        if (root === void 0) root = node;
      } else {
        parent.children.push(node);
      }
      if (!selfClosing) stack.push(node);
      cursor = close + 1;
    }
    return root;
  }
  function childrenNamed(node, name) {
    return node === void 0 ? [] : node.children.filter((child) => child.name === name);
  }
  function childNamed(node, name) {
    return node === void 0 ? void 0 : node.children.find((child) => child.name === name);
  }
  function childText(node, name) {
    const child = childNamed(node, name);
    return child === void 0 ? void 0 : child.text.trim();
  }
  function childNumber(node, name) {
    const text = childText(node, name);
    if (text === void 0 || text === "") return void 0;
    const value = Number(text);
    return Number.isFinite(value) ? value : void 0;
  }
  function descendants(node, name) {
    if (node === void 0) return [];
    const out = [];
    const walk = (current) => {
      for (const child of current.children) {
        if (child.name === name) out.push(child);
        walk(child);
      }
    };
    walk(node);
    return out;
  }

  // src/input/musicxml/technical.ts
  function readFingering(nodes) {
    const warnings = [];
    const chosen = nodes.find((node) => node.attributes["alternate"] !== "yes") ?? nodes[0];
    if (chosen === void 0) return { warnings };
    const token = chosen.text.trim();
    if (token === "0") return { warnings };
    if (token === "1" || token === "2" || token === "3" || token === "4") {
      return { finger: Number(token), warnings };
    }
    if (token === "T" || token === "t") return { finger: "T", warnings };
    warnings.push({
      code: "UNKNOWN_FINGERING_TOKEN",
      message: `<fingering> says "${token}", which is not a finger this engine knows`
    });
    return { warnings };
  }
  function readTechnical(note, numStrings) {
    const notations = childrenNamed(note, "notations");
    const warnings = [];
    const links = [];
    let lockedString;
    let lockedFret;
    let lockedFinger;
    let lockedPickDir;
    for (const notation of notations) {
      const technical = childNamed(notation, "technical");
      if (technical !== void 0) {
        const xmlString = childNumber(technical, "string");
        if (xmlString !== void 0) lockedString = musicXmlStringToInternal(xmlString, numStrings);
        const fret = childNumber(technical, "fret");
        if (fret !== void 0) lockedFret = fret;
        const fingering = readFingering(childrenNamed(technical, "fingering"));
        if (fingering.finger !== void 0) lockedFinger = fingering.finger;
        warnings.push(...fingering.warnings);
        if (childNamed(technical, "down-bow") !== void 0) lockedPickDir = "down";
        if (childNamed(technical, "up-bow") !== void 0) lockedPickDir = "up";
        for (const [element, type] of [
          ["hammer-on", "hammerOn"],
          ["pull-off", "pullOff"]
        ]) {
          for (const link of childrenNamed(technical, element)) {
            links.push({ type, role: link.attributes["type"] === "stop" ? "stop" : "start" });
          }
        }
      }
      for (const element of ["slide", "glissando"]) {
        for (const link of childrenNamed(notation, element)) {
          links.push({ type: "slide", role: link.attributes["type"] === "stop" ? "stop" : "start" });
        }
      }
    }
    return {
      ...lockedString !== void 0 ? { lockedString } : {},
      ...lockedFret !== void 0 ? { lockedFret } : {},
      ...lockedFinger !== void 0 ? { lockedFinger } : {},
      ...lockedPickDir !== void 0 ? { lockedPickDir } : {},
      links,
      warnings
    };
  }
  function hasTie(note, type) {
    if (childrenNamed(note, "tie").some((tie) => tie.attributes["type"] === type)) return true;
    return descendants(note, "tied").some((tied) => tied.attributes["type"] === type);
  }
  function isChordMember(note) {
    return childNamed(note, "chord") !== void 0;
  }
  function isGrace(note) {
    return childNamed(note, "grace") !== void 0;
  }
  function isRest(note) {
    return childNamed(note, "rest") !== void 0;
  }
  function writtenPitch(note) {
    const pitch = childNamed(note, "pitch");
    if (pitch === void 0) return void 0;
    const step = childText(pitch, "step");
    const octave = childNumber(pitch, "octave");
    if (step === void 0 || octave === void 0) return void 0;
    const semitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step];
    if (semitone === void 0) return void 0;
    return (octave + 1) * 12 + semitone + (childNumber(pitch, "alter") ?? 0);
  }

  // src/input/musicxml/parse.ts
  var TICKS_PER_QUARTER = 480;
  function toText(source) {
    if (typeof source === "string") return source;
    const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
    let out = "";
    for (let i = 0; i < bytes.length; i += 32768) {
      out += String.fromCharCode(...bytes.subarray(i, i + 32768));
    }
    return typeof TextDecoder === "undefined" ? out : new TextDecoder("utf-8").decode(bytes);
  }
  function readStaffTuning(details) {
    const lines = childrenNamed(details, "staff-tuning");
    if (lines.length === 0) return {};
    const tuning = [];
    for (const line of lines) {
      const index = Number(line.attributes["line"] ?? "0");
      const step = childText(line, "tuning-step");
      const octave = childNumber(line, "tuning-octave");
      if (!Number.isInteger(index) || index < 1 || step === void 0 || octave === void 0) {
        continue;
      }
      const semitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step];
      if (semitone === void 0) continue;
      tuning[index - 1] = (octave + 1) * 12 + semitone + (childNumber(line, "tuning-alter") ?? 0);
    }
    const filled = tuning.filter((pitch) => typeof pitch === "number");
    if (filled.length === 0) return {};
    return { tuning: filled, numStrings: filled.length };
  }
  function metronomeBpm(direction) {
    for (const type of childrenNamed(direction, "direction-type")) {
      const metronome = childNamed(type, "metronome");
      if (metronome === void 0) continue;
      const perMinute = childNumber(metronome, "per-minute");
      if (perMinute === void 0) continue;
      const unit = childText(metronome, "beat-unit") ?? "quarter";
      const quarters = { whole: 4, half: 2, quarter: 1, eighth: 0.5, "16th": 0.25, "32nd": 0.125 }[unit] ?? 1;
      const dots = childrenNamed(metronome, "beat-unit-dot").length;
      const dotted = quarters * (2 - Math.pow(0.5, dots));
      return perMinute * dotted;
    }
    return void 0;
  }
  function bpmOf(node) {
    const sound = childNamed(node, "sound") ?? node;
    const tempo = sound.attributes["tempo"];
    if (tempo !== void 0) {
      const value = Number(tempo);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return void 0;
  }
  function parseMusicXml(source) {
    const warnings = [];
    const text = toText(source);
    if (text.startsWith("PK")) {
      return {
        parts: [],
        warnings: [
          {
            code: "MXL_NOT_UNZIPPED",
            message: "[IN-X01] this is a .mxl archive; unzip it with the app\u2019s own reader and pass the score XML"
          }
        ]
      };
    }
    const root = parseXml(text);
    if (root === void 0 || root.name !== "score-partwise") {
      return {
        parts: [],
        warnings: [
          {
            code: "NOT_MUSICXML",
            message: "no <score-partwise> element: this is not a MusicXML score this engine reads"
          }
        ]
      };
    }
    const names = /* @__PURE__ */ new Map();
    const programs = /* @__PURE__ */ new Map();
    for (const scorePart of childrenNamed(childNamed(root, "part-list"), "score-part")) {
      const id = scorePart.attributes["id"];
      if (id === void 0) continue;
      names.set(id, childText(scorePart, "part-name") ?? id);
      const program = childNumber(childNamed(scorePart, "midi-instrument"), "midi-program");
      if (program !== void 0) programs.set(id, program - 1);
    }
    const tempoEvents = /* @__PURE__ */ new Map();
    const timeSignatures = /* @__PURE__ */ new Map();
    const parts = [];
    for (const partNode of childrenNamed(root, "part")) {
      const partId = partNode.attributes["id"] ?? `P${parts.length + 1}`;
      const parsed = parsePart(partNode, partId, tempoEvents, timeSignatures, warnings);
      const name = names.get(partId) ?? partId;
      const program = programs.get(partId);
      parts.push({
        ...parsed,
        name,
        ...program !== void 0 ? { gmProgram: program } : {}
      });
    }
    const segments = [...tempoEvents.entries()].sort((a, b) => a[0] - b[0]).map(([startTick, bpm]) => ({ startTick, microsecondsPerQuarter: 6e7 / bpm }));
    const map = tempoMap(TICKS_PER_QUARTER, segments);
    const meters = [...timeSignatures.values()].sort((a, b) => a.tick - b.tick);
    return {
      parts: parts.map((part) => ({ ...part, tempoMap: map, timeSignatures: meters })),
      warnings
    };
  }
  function parsePart(partNode, partId, tempoEvents, timeSignatures, warnings) {
    const state = {
      divisions: 1,
      transposeSemitones: 0,
      tuning: void 0,
      capo: void 0,
      numStrings: 6
    };
    const notes = [];
    const linkEnds = /* @__PURE__ */ new Map();
    let globalTick = 0;
    let hasTab = false;
    let index = 0;
    for (const measureNode of childrenNamed(partNode, "measure")) {
      const measureNumber = Number(measureNode.attributes["number"] ?? "0");
      const measureStart = globalTick;
      let cursor = measureStart;
      let lastStart = measureStart;
      let measureEnd = measureStart;
      for (const event of measureNode.children) {
        if (event.name === "attributes") {
          readAttributes2(event, state, measureStart, timeSignatures);
          continue;
        }
        if (event.name === "direction" || event.name === "sound") {
          const bpm = bpmOf(event) ?? metronomeBpm(event);
          if (bpm !== void 0 && !tempoEvents.has(cursor)) tempoEvents.set(cursor, bpm);
          continue;
        }
        if (event.name === "backup") {
          cursor -= ticksOf(childNumber(event, "duration") ?? 0, state.divisions);
          continue;
        }
        if (event.name === "forward") {
          cursor += ticksOf(childNumber(event, "duration") ?? 0, state.divisions);
          measureEnd = Math.max(measureEnd, cursor);
          continue;
        }
        if (event.name !== "note") continue;
        const durationTicks = ticksOf(childNumber(event, "duration") ?? 0, state.divisions);
        const grace = isGrace(event);
        const chord = isChordMember(event);
        const start = chord ? lastStart : cursor;
        if (isRest(event)) {
          cursor += durationTicks;
          measureEnd = Math.max(measureEnd, cursor);
          continue;
        }
        const written = writtenPitch(event);
        if (written === void 0) {
          cursor += grace ? 0 : durationTicks;
          continue;
        }
        const pitch = written + state.transposeSemitones;
        const technical = readTechnical(event, state.numStrings);
        const voice = childNumber(event, "voice");
        for (const warning of technical.warnings) {
          warnings.push({
            code: warning.code,
            message: `${partId} m${measureNumber}: ${warning.message}`
          });
        }
        if (hasTie(event, "stop")) {
          const held = lastSounding(notes, pitch);
          if (held !== void 0) {
            notes[notes.indexOf(held)] = {
              ...held,
              durationTicks: held.durationTicks + durationTicks,
              techniques: withTechnique(held.techniques, "tieContinuation")
            };
            if (!chord && !grace) {
              cursor += durationTicks;
              measureEnd = Math.max(measureEnd, cursor);
            }
            continue;
          }
        }
        const techniques = grace ? ["grace"] : [];
        if (technical.lockedString !== void 0 && technical.lockedFret !== void 0) hasTab = true;
        notes.push({
          noteId: `${partId}-m${measureNumber}-v${childText(event, "voice") ?? "1"}-n${index++}`,
          pitch,
          tick: start,
          durationTicks: grace ? 0 : durationTicks,
          time: 0,
          duration: 0,
          ...voice !== void 0 ? { voice } : {},
          ...technical.lockedString !== void 0 ? { lockedString: technical.lockedString } : {},
          ...technical.lockedFret !== void 0 ? { lockedFret: technical.lockedFret } : {},
          ...technical.lockedFinger !== void 0 ? { lockedFinger: technical.lockedFinger } : {},
          ...technical.lockedPickDir !== void 0 ? { lockedPickDir: technical.lockedPickDir } : {},
          techniques,
          sourceRef: { format: "musicxml", part: partId, measure: measureNumber, index: index - 1 }
        });
        linkEnds.set(notes[notes.length - 1]?.noteId ?? "", technical.links);
        if (!chord && !grace) {
          lastStart = start;
          cursor += durationTicks;
          measureEnd = Math.max(measureEnd, cursor);
        }
      }
      globalTick = Math.max(measureEnd, cursor, measureStart);
    }
    const instrumentHint = {
      ...state.tuning !== void 0 ? { tuning: state.tuning, numStrings: state.tuning.length } : {},
      ...state.capo !== void 0 ? { capo: state.capo } : {}
    };
    return {
      partId,
      instrumentHint,
      notes: checkTabAgainstPitch(pairLinks(notes, linkEnds), state, warnings, partId),
      tempoMap: tempoMap(TICKS_PER_QUARTER),
      timeSignatures: [],
      hasTab
    };
  }
  function ticksOf(duration, divisions) {
    if (!(divisions > 0)) return 0;
    return Math.round(duration / divisions * TICKS_PER_QUARTER);
  }
  function withTechnique(techniques, technique) {
    return techniques.includes(technique) ? techniques : [...techniques, technique];
  }
  function lastSounding(notes, pitch) {
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      if (note !== void 0 && note.pitch === pitch) return note;
    }
    return void 0;
  }
  function readAttributes2(node, state, tick, timeSignatures) {
    const divisions = childNumber(node, "divisions");
    if (divisions !== void 0 && divisions > 0) state.divisions = divisions;
    const time = childNamed(node, "time");
    const beats = childNumber(time, "beats");
    const beatType = childNumber(time, "beat-type");
    if (beats !== void 0 && beatType !== void 0 && !timeSignatures.has(tick)) {
      timeSignatures.set(tick, { tick, numerator: beats, denominator: beatType });
    }
    const transpose = childNamed(node, "transpose");
    if (transpose !== void 0) {
      const chromatic = childNumber(transpose, "chromatic") ?? 0;
      const octaveChange = childNumber(transpose, "octave-change") ?? 0;
      state.transposeSemitones = chromatic + octaveChange * 12;
    }
    for (const details of childrenNamed(node, "staff-details")) {
      const lines = childNumber(details, "staff-lines");
      if (lines !== void 0 && lines >= 4) state.numStrings = lines;
      const tuning = readStaffTuning(details);
      if (tuning.tuning !== void 0) {
        state.tuning = tuning.tuning;
        state.numStrings = tuning.numStrings ?? state.numStrings;
      }
      const capo = childNumber(details, "capo");
      if (capo !== void 0) state.capo = capo;
    }
  }
  function pairLinks(notes, linkEnds) {
    const links = /* @__PURE__ */ new Map();
    const ordered = [...notes].sort((a, b) => a.tick - b.tick);
    for (let i = 0; i < ordered.length; i++) {
      const from = ordered[i];
      if (from === void 0) continue;
      for (const end of linkEnds.get(from.noteId) ?? []) {
        if (end.role !== "start") continue;
        const to = ordered.slice(i + 1).find(
          (other) => other.tick > from.tick && (from.lockedString === void 0 || other.lockedString === void 0 || other.lockedString === from.lockedString)
        );
        if (to === void 0) continue;
        push(links, from.noteId, { type: end.type, toNoteId: to.noteId });
        push(links, to.noteId, { type: end.type, fromNoteId: from.noteId });
      }
    }
    return notes.map((note) => {
      const own = links.get(note.noteId);
      return own === void 0 ? note : { ...note, techniqueLinks: own };
    });
  }
  function push(map, key, link) {
    const list = map.get(key);
    if (list === void 0) map.set(key, [link]);
    else if (!list.some(
      (existing) => existing.type === link.type && existing.fromNoteId === link.fromNoteId && existing.toNoteId === link.toNoteId
    )) {
      list.push(link);
    }
  }
  function checkTabAgainstPitch(notes, state, warnings, partId) {
    const tuning = state.tuning ?? STANDARD_TUNING;
    const tabbed = notes.filter(
      (note) => note.lockedString !== void 0 && note.lockedFret !== void 0
    );
    if (tabbed.length === 0) return notes;
    let octaveOff = 0;
    let mismatched = 0;
    for (const note of tabbed) {
      const open = tuning[note.lockedString - 1];
      if (open === void 0) continue;
      const expected = open + note.lockedFret;
      const difference = expected - note.pitch;
      if (difference === 0) continue;
      if (Math.abs(difference) === 12) octaveOff++;
      else mismatched++;
    }
    if (octaveOff > 0 && octaveOff >= tabbed.length - mismatched && mismatched === 0) {
      warnings.push({
        code: "OCTAVE_CORRECTED",
        message: `${partId}: every tabbed note was an octave from its string and fret; the pitch was corrected`
      });
      return notes.map((note) => {
        if (note.lockedString === void 0 || note.lockedFret === void 0) return note;
        const open = tuning[note.lockedString - 1];
        if (open === void 0) return note;
        return { ...note, pitch: open + note.lockedFret };
      });
    }
    if (mismatched > 0) {
      warnings.push({
        code: "PITCH_TAB_MISMATCH",
        message: `${partId}: ${mismatched} note(s) sound a different pitch than their string and fret; the tab was kept`
      });
    }
    return notes;
  }
  function guitarParts(parts) {
    const looksLikeGuitar = (part) => {
      if (part.hasTab) return true;
      if (part.gmProgram !== void 0 && part.gmProgram >= 24 && part.gmProgram <= 31) return true;
      return /guitar|gtr|guit/i.test(part.name);
    };
    const found = parts.filter(looksLikeGuitar);
    return found.length > 0 ? found : parts;
  }

  // src/guitar/right-hand/pick.ts
  var SUBDIVISIONS = [1, 2, 3, 4, 6, 8, 12, 16];
  var SLOT_TOLERANCE_TICKS = 4;
  function beatTicksAt(meters, tick) {
    let denominator = 4;
    for (const meter of meters) {
      if (meter.tick <= tick) denominator = meter.denominator;
      else break;
    }
    return TICKS_PER_QUARTER * 4 / Math.max(1, denominator);
  }
  function beatStartTick(meters, tick) {
    let origin = 0;
    for (const meter of meters) {
      if (meter.tick <= tick) origin = meter.tick;
      else break;
    }
    const beat = beatTicksAt(meters, tick);
    return origin + Math.floor((tick - origin) / beat) * beat;
  }
  function subdivisionOfBeat(onsetTicks, beatStart, beatTicks) {
    for (const division of SUBDIVISIONS) {
      const slot = beatTicks / division;
      const fits = onsetTicks.every((tick) => {
        const offset = tick - beatStart;
        return Math.abs(offset - Math.round(offset / slot) * slot) <= SLOT_TOLERANCE_TICKS;
      });
      if (fits) return division;
    }
    return SUBDIVISIONS[SUBDIVISIONS.length - 1];
  }
  function isLegatoTarget(note) {
    if (note.techniques.includes("tieContinuation")) return true;
    return (note.techniqueLinks ?? []).some(
      (link) => link.fromNoteId !== void 0 && (link.type === "hammerOn" || link.type === "pullOff" || link.type === "slide")
    );
  }
  function pickEvents(stages, meters) {
    const byBeat = /* @__PURE__ */ new Map();
    for (const stage of stages) {
      const start = beatStartTick(meters, stage.tick);
      const list = byBeat.get(start);
      if (list === void 0) byBeat.set(start, [stage.tick]);
      else list.push(stage.tick);
    }
    const events = [];
    for (const stage of stages) {
      const played = stage.notes.filter((note) => !isLegatoTarget(note));
      if (played.length === 0) continue;
      const beatTicks = beatTicksAt(meters, stage.tick);
      const start = beatStartTick(meters, stage.tick);
      const division = subdivisionOfBeat(byBeat.get(start) ?? [stage.tick], start, beatTicks);
      const slotTicks = beatTicks / division;
      const slot = Math.round((stage.tick - start) / slotTicks);
      const locked = played.find((note) => note.lockedPickDir !== void 0)?.lockedPickDir;
      const direction = locked ?? (slot % 2 === 0 ? "down" : "up");
      const strings = played.map((note) => stage.placements.find((placement) => placement.noteId === note.noteId)?.string).filter((string) => string !== void 0).sort((a, b) => a - b);
      events.push({
        time: stage.time,
        noteIds: played.map((note) => note.noteId),
        strings,
        kind: "pick",
        direction,
        reason: locked !== void 0 ? "LOCKED" : direction === "down" ? "GRID_DOWN" : "GRID_UP"
      });
    }
    return events;
  }
  function resolveMode(configured) {
    if (configured === "fingerstyle") {
      return {
        mode: "pick",
        warning: "fingerstyle (p-i-m-a) arrives in Phase 3; this part was picked"
      };
    }
    return { mode: "pick" };
  }

  // src/guitar/stages.ts
  function buildStages(notes, config, canPlayOpen) {
    const ordered = [...notes].sort((a, b) => a.time - b.time || a.pitch - b.pitch);
    const groups = [];
    for (const note of ordered) {
      const current = groups[groups.length - 1];
      const first = current?.[0];
      if (current !== void 0 && first !== void 0 && note.time - first.time <= config.onsetToleranceSec) {
        current.push(note);
      } else {
        groups.push([note]);
      }
    }
    const stages = [];
    let lastFrettedTime = Number.NEGATIVE_INFINITY;
    let sounding = [];
    let lastEnd = Number.NEGATIVE_INFINITY;
    for (const [index, onsets] of groups.entries()) {
      const time = onsets[0]?.time ?? 0;
      const previousGroup = groups[index - 1];
      const previous = stages[index - 1];
      sounding = sounding.filter((note) => note.time + note.duration > time + 1e-6);
      const sustained = sounding.filter((note) => note.time < time - config.onsetToleranceSec);
      const release = previousGroup === void 0 ? time : Math.max(...previousGroup.map((note) => Math.min(note.time + note.duration, time)));
      const dt = previous === void 0 ? 0 : time - previous.time;
      const freeTime = previousGroup === void 0 ? Infinity : Math.max(0, time - release);
      const segmentStart = index === 0 || time - lastEnd >= config.segmentGapSec;
      const openWindow = lastFrettedTime === Number.NEGATIVE_INFINITY ? Infinity : time - lastFrettedTime;
      if (onsets.some((note) => !canPlayOpen(note.pitch))) lastFrettedTime = time;
      stages.push({ index, time, onsets, sustained, dt, freeTime, openWindow, segmentStart });
      for (const note of onsets) {
        sounding.push(note);
        lastEnd = Math.max(lastEnd, note.time + note.duration);
      }
    }
    return stages;
  }

  // src/guitar/validate-guitar.ts
  function overlaps(a, b) {
    const start = Math.max(a.time, b.time);
    const end = Math.min(a.time + a.duration, b.time + b.duration);
    return end - start > 1e-6;
  }
  function validateGuitar(timeline, context) {
    const issues = [];
    const notes = timeline.notes;
    for (let i = 0; i < notes.length; i++) {
      const a = notes[i];
      const source = context.sourceNotes.get(a.noteId);
      if (source !== void 0) {
        if (source.lockedString !== void 0 && source.lockedString !== a.string) {
          issues.push(
            problem(
              "V-06",
              `note ${a.noteId} was written on string ${source.lockedString} and came out on ${a.string}`,
              a
            )
          );
        }
        if (source.lockedFret !== void 0 && source.lockedFret !== a.fret) {
          issues.push(
            problem(
              "V-06",
              `note ${a.noteId} was written at fret ${source.lockedFret} and came out at ${a.fret}`,
              a
            )
          );
        }
        if (source.lockedFinger !== void 0 && String(source.lockedFinger) !== String(a.finger)) {
          issues.push(
            problem(
              "V-06",
              `note ${a.noteId} was written for finger ${String(source.lockedFinger)} and came out on ${String(a.finger)}`,
              a
            )
          );
        }
        for (const link of source.techniqueLinks ?? []) {
          if (link.fromNoteId === void 0) continue;
          const from = notes.find((note) => note.noteId === link.fromNoteId);
          if (from === void 0) continue;
          if (from.string !== a.string) {
            issues.push(
              problem(
                "V-09",
                `${link.type} into ${a.noteId} crosses from string ${from.string} to ${a.string}`,
                a
              )
            );
          } else if (link.type === "slide" && from.finger !== a.finger) {
            issues.push(
              problem(
                "V-09",
                `a slide into ${a.noteId} changes finger ${String(from.finger)} to ${String(a.finger)}`,
                a
              )
            );
          }
        }
      }
      for (let j = i + 1; j < notes.length; j++) {
        const b = notes[j];
        if (b.time >= a.time + a.duration) break;
        if (!overlaps(a, b)) continue;
        if (a.string === b.string) {
          issues.push(
            problem(
              "V-02",
              `notes ${a.noteId} and ${b.noteId} sound at once on string ${a.string}`,
              b
            )
          );
        }
        if (a.finger === null || b.finger === null) continue;
        if (a.finger === b.finger && (a.fret !== b.fret || a.string !== b.string)) {
          issues.push(
            problem(
              "V-03",
              `finger ${a.finger} is at fret ${a.fret} and fret ${b.fret} at the same time`,
              b
            )
          );
          continue;
        }
        if (a.finger === b.finger) continue;
        const fa = Number(a.finger);
        const fb = Number(b.finger);
        if (Number.isFinite(fa) && Number.isFinite(fb)) {
          if (a.fret < b.fret && fa > fb || b.fret < a.fret && fb > fa) {
            issues.push(
              problem(
                "V-04",
                `finger ${a.finger} at fret ${a.fret} is behind finger ${b.finger} at fret ${b.fret}`,
                b
              )
            );
          }
        }
        const limit = spanLimit(context.leftHand, a.finger, b.finger);
        const writtenStretch = context.tabInfeasibleNoteIds.has(a.noteId) || context.tabInfeasibleNoteIds.has(b.noteId);
        if (limit !== void 0 && a.fret > 0 && b.fret > 0 && !writtenStretch) {
          const distance = fingertipDistanceMm(
            fingertipPoint(context.instrument, context.geometry, a.string, a.fret),
            fingertipPoint(context.instrument, context.geometry, b.string, b.fret)
          ).distanceMm;
          const allowed = context.relaxedNoteIds.has(a.noteId) || context.relaxedNoteIds.has(b.noteId) ? limit.max * context.relaxSpanFactor : limit.max;
          if (distance > allowed + 1e-6) {
            issues.push(
              problem(
                "V-05",
                `fingers ${a.finger} and ${b.finger} are ${distance.toFixed(0)} mm apart, past ${allowed.toFixed(0)} mm`,
                b
              )
            );
          }
        }
      }
      if (a.finger !== null && a.fret > 0) {
        const track = timeline.leftHand.fingers[a.finger] ?? [];
        const press = track.find((frame) => frame.noteId === a.noteId);
        if (press === void 0) {
          issues.push(
            problem(
              "V-07",
              `note ${a.noteId} has no keyframe where finger ${a.finger} presses it`,
              a
            )
          );
        } else {
          if (press.t > a.time + 1e-6) {
            issues.push(
              problem("V-07", `finger ${a.finger} arrives after note ${a.noteId} has sounded`, a)
            );
          }
          const holdUntil = a.time + Math.min(a.duration, 0.05);
          const release = track.find((frame) => frame.t > press.t && !frame.pressed);
          if (release !== void 0 && release.t < holdUntil - 1e-6) {
            issues.push(
              problem("V-07", `finger ${a.finger} leaves note ${a.noteId} before it has sounded`, a)
            );
          }
        }
      }
    }
    const picked = /* @__PURE__ */ new Map();
    for (const event of timeline.rightHand.events) {
      for (const noteId of event.noteIds) picked.set(noteId, (picked.get(noteId) ?? 0) + 1);
    }
    for (const note of notes) {
      const source = context.sourceNotes.get(note.noteId);
      const legato = source !== void 0 && isLegatoTarget(source);
      const count = picked.get(note.noteId) ?? 0;
      if (legato && count > 0) {
        issues.push(
          problem("V-10", `note ${note.noteId} is sounded by the left hand but also picked`, note)
        );
      } else if (!legato && count !== 1) {
        issues.push(
          problem("V-10", `note ${note.noteId} has ${count} right-hand events, expected one`, note)
        );
      }
    }
    return issues;
  }
  function problem(rule, message, note) {
    return { rule, severity: "error", message, noteId: note.noteId, time: note.time };
  }

  // src/debug/report.ts
  function buildDebugReport(input) {
    const stageOf = /* @__PURE__ */ new Map();
    for (const [index, stage] of input.stages.entries()) {
      for (const note of stage.onsets) stageOf.set(note.noteId, index);
    }
    const notes = input.notes.map((note) => {
      const index = stageOf.get(note.noteId) ?? 0;
      const state = input.path[index];
      const runnerUp = input.runnersUp[index];
      const source = input.noteById.get(note.noteId);
      return {
        noteId: note.noteId,
        measure: source?.sourceRef.measure,
        time: note.time,
        pitch: note.pitch,
        string: note.string,
        fret: note.fret,
        finger: note.finger ?? "open",
        reasons: note.reasons,
        confidence: note.confidence,
        features: { ...state?.features ?? {} },
        runnerUpFeatures: runnerUp === void 0 ? void 0 : { ...runnerUp.features },
        runnerUp: runnerUp === void 0 ? void 0 : runnerUp.placements.map(
          (placement) => `s${placement.string}f${placement.fret}:${String(placement.finger ?? "open")}`
        ).join(" ")
      };
    });
    return {
      totalCost: input.totalCost,
      stages: input.stages.length,
      widestStage: input.stageNodeCounts.reduce((widest, count) => Math.max(widest, count), 0),
      notes,
      issues: input.issues
    };
  }
  function report(debug) {
    const lines = [];
    lines.push(
      `${debug.notes.length} notes over ${debug.stages} stages, total cost ${debug.totalCost.toFixed(2)}, widest search ${debug.widestStage}`
    );
    let measure;
    for (const note of debug.notes) {
      if (note.measure !== measure) {
        measure = note.measure;
        lines.push(`
measure ${measure ?? "?"}`);
      }
      const runnerUp = note.runnerUp === void 0 ? "" : `  (instead of ${note.runnerUp})`;
      lines.push(
        `  ${note.time.toFixed(3)}s  pitch ${note.pitch}  string ${note.string} fret ${note.fret} finger ${note.finger}  ${note.reasons.join(",")}  confidence ${note.confidence.toFixed(2)}${runnerUp}`
      );
    }
    if (debug.issues.length > 0) {
      lines.push("\nvalidator:");
      for (const issue of debug.issues) lines.push(`  ${issue.rule} ${issue.message}`);
    }
    return lines.join("\n");
  }

  // src/guitar/index.ts
  function resolveInstrument(part, config, override) {
    const base = config.instrument;
    const tuning = [...override?.tuning ?? part.instrumentHint.tuning ?? base.tuning];
    return {
      kind: "guitar",
      numStrings: override?.numStrings ?? part.instrumentHint.numStrings ?? tuning.length,
      tuning,
      capo: override?.capo ?? part.instrumentHint.capo ?? base.capo,
      numFrets: override?.numFrets ?? part.instrumentHint.numFrets ?? base.numFrets,
      scaleLengthMm: override?.scaleLengthMm ?? base.scaleLengthMm,
      nutSpacingMm: override?.nutSpacingMm ?? base.nutSpacingMm,
      bridgeSpacingMm: override?.bridgeSpacingMm ?? base.bridgeSpacingMm
    };
  }
  function analyzeGuitar(part, options = {}) {
    const config = mergeConfig(DEFAULTS, options.config);
    const instrument = resolveInstrument(part, config, options.instrument);
    const geometry = { fingertipBehindFret: config.geometry.fingertipBehindFret };
    const seed = options.seed ?? 1;
    const rng = makeRng(seed);
    const warnings = [];
    const normalized = normalizePart(part, instrument, {
      graceDurationSec: config.input.graceDurationSec,
      outOfRange: config.input.outOfRange
    });
    warnings.push(...normalized.warnings);
    const noteById = new Map(normalized.notes.map((note) => [note.noteId, note]));
    const openPitches = new Set(instrument.tuning);
    const stages = buildStages(
      normalized.notes,
      {
        onsetToleranceSec: config.solver.onsetToleranceSec,
        segmentGapSec: config.solver.segmentGapSec
      },
      (pitch) => openPitches.has(pitch)
    );
    const variantCache = /* @__PURE__ */ new Map();
    const costContext = {
      instrument,
      geometry,
      leftHand: config.leftHand,
      solver: config.solver,
      weights: config.weights,
      pitchReturnsSoon: pitchesReturningSoon(normalized.notes, config.leftHand.persistWindowSec),
      noteById
    };
    const solution = solveStages({
      stages,
      expand: (previous, stage, _index, relax) => expandStage(previous, stage, { ...costContext, variantCache }, relax),
      staticCost: (state) => state.staticCost,
      transitionCost: (previous, next, stage) => transitionCost(
        {
          previous: previous.placements,
          previousHandPos: previous.handPos,
          next: next.placements,
          nextHandPos: next.handPos,
          stage
        },
        costContext
      ),
      key: (state) => state.key,
      beamWidth: config.solver.beamWidth,
      segmentStart: (index) => stages[index]?.segmentStart ?? false,
      maxRelax: 5
    });
    for (const [index, level] of solution.relaxedStages) {
      const stage = stages[index];
      const locked = stage?.onsets.some((note) => note.lockedFret !== void 0) ?? false;
      warnings.push({
        code: level >= 4 ? "UNPLAYABLE_CHORD" : locked ? "TAB_INFEASIBLE" : "STRETCH_RELAXED",
        ...stage === void 0 ? {} : { time: stage.time },
        noteIds: stage?.onsets.map((note) => note.noteId) ?? [],
        message: level >= 4 ? "a note had to be dropped: the rest of the chord could not be held with it" : locked ? "the written tab needs a stretch past this hand\u2019s limits; it was kept as written" : "the span limits were loosened to find a way to play this"
      });
    }
    const relaxedNoteIds = /* @__PURE__ */ new Set();
    const tabInfeasibleNoteIds = /* @__PURE__ */ new Set();
    for (const [index, level] of solution.relaxedStages) {
      const stage = stages[index];
      const locked = stage?.onsets.some((note) => note.lockedFret !== void 0) ?? false;
      for (const note of stage?.onsets ?? []) {
        relaxedNoteIds.add(note.noteId);
        if (locked && level >= 3) tabInfeasibleNoteIds.add(note.noteId);
      }
    }
    const motion = planMotion({
      stages,
      path: solution.path,
      instrument,
      geometry,
      motion: config.motion,
      humanize: config.humanize,
      noteById,
      rng
    });
    const rushedNotes = new Set(motion.rushed.map((entry) => entry.noteId));
    if (motion.rushed.length > 0) {
      warnings.push({
        code: "SHIFT_RUSHED",
        noteIds: [...rushedNotes],
        message: `${motion.rushed.length} shift(s) had less time than the move needs`
      });
    }
    const mode = resolveMode(config.rightHand.mode);
    if (mode.warning !== void 0) {
      warnings.push({ code: "RIGHT_HAND_FALLBACK", message: mode.warning });
    }
    const events = pickEvents(
      stages.map((stage, index) => ({
        time: stage.time,
        tick: stage.onsets[0]?.tick ?? 0,
        notes: stage.onsets,
        placements: solution.path[index]?.placements ?? []
      })),
      part.timeSignatures
    );
    const notes = buildTimelineNotes(
      stages,
      solution,
      relaxedNoteIds,
      rushedNotes,
      config.solver.confidenceScale
    );
    const duration = notes.reduce((end, note) => Math.max(end, note.time + note.duration), 0);
    const timeline = {
      schema: TIMELINE_SCHEMA,
      schemaVersion: TIMELINE_SCHEMA_VERSION,
      engine: {
        name: ENGINE_NAME,
        version: ENGINE_VERSION,
        presetId: options.presetId ?? "default",
        seed,
        configHash: configHash(config)
      },
      instrument: {
        kind: "guitar",
        numStrings: instrument.numStrings,
        stringOrder: "lowToHigh",
        tuning: [...instrument.tuning],
        capo: instrument.capo,
        numFrets: instrument.numFrets
      },
      duration,
      notes,
      leftHand: { hand: motion.hand, fingers: motion.fingers, barres: [] },
      rightHand: { mode: mode.mode, events },
      warnings
    };
    const issues = [
      ...validateCore(timeline).issues,
      ...validateGuitar(timeline, {
        instrument,
        geometry,
        leftHand: config.leftHand,
        relaxSpanFactor: config.solver.relaxSpanFactor,
        sourceNotes: noteById,
        relaxedNoteIds,
        tabInfeasibleNoteIds
      })
    ].filter(
      (issue) => !(issue.rule === "V-01" && normalized.pitchTabMismatch.has(issue.noteId ?? ""))
    );
    const errors = issues.filter((issue) => issue.severity === "error");
    const finalWarnings = errors.length === 0 ? warnings : [
      ...warnings,
      {
        code: "VALIDATION_FAILED",
        noteIds: errors.map((issue) => issue.noteId ?? "").filter((id) => id !== ""),
        message: `${errors.length} check(s) failed: ${errors.slice(0, 3).map((issue) => `${issue.rule} ${issue.message}`).join("; ")}`
      }
    ];
    const withWarnings = { ...timeline, warnings: finalWarnings };
    if (!config.debug) return withWarnings;
    return {
      ...withWarnings,
      debug: buildDebugReport({
        stages,
        path: solution.path,
        runnersUp: solution.runnersUp,
        margins: solution.margins,
        stageNodeCounts: solution.stageNodeCounts,
        notes: withWarnings.notes,
        noteById,
        issues,
        totalCost: solution.totalCost
      })
    };
  }
  function buildTimelineNotes(stages, solution, relaxedNoteIds, rushedNotes, confidenceScale) {
    const out = [];
    for (const [index, stage] of stages.entries()) {
      const state = solution.path[index];
      if (state === void 0) continue;
      const confidence = confidenceFrom(solution.margins[index] ?? Infinity, confidenceScale);
      for (const note of stage.onsets) {
        const placement = state.placements.find((candidate) => candidate.noteId === note.noteId);
        if (placement === void 0) continue;
        out.push({
          noteId: note.noteId,
          time: note.time,
          duration: note.duration,
          pitch: note.pitch,
          string: placement.string,
          fret: placement.fret,
          finger: fingerKey(placement.finger),
          techniques: techniqueNames(note.techniques),
          locked: {
            string: note.lockedString !== void 0,
            fret: note.lockedFret !== void 0,
            finger: note.lockedFinger !== void 0
          },
          reasons: reasonsFor({
            placement,
            note,
            state,
            previous: solution.path[index - 1],
            runnerUp: solution.runnersUp[index],
            stage,
            relaxed: relaxedNoteIds.has(note.noteId),
            rushed: rushedNotes.has(note.noteId)
          }),
          confidence
        });
      }
    }
    return out.sort((a, b) => a.time - b.time || a.string - b.string);
  }

  // src/input/notation-engine/adapter.ts
  var STEP_SEMITONES = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  };
  function midiOf(pitch) {
    if (pitch === void 0 || pitch.kind !== void 0 && pitch.kind !== "pitched")
      return void 0;
    const step = pitch.step === void 0 ? void 0 : STEP_SEMITONES[pitch.step];
    if (step === void 0 || pitch.octave === void 0) return void 0;
    return (pitch.octave + 1) * 12 + step + (pitch.alter ?? 0);
  }
  function toTempoMap(playback) {
    const segments = (playback.tempoMap?.segments ?? []).filter((segment) => segment.microsecondsPerQuarter !== void 0).map((segment) => ({
      startTick: segment.startTick ?? 0,
      microsecondsPerQuarter: segment.microsecondsPerQuarter
    }));
    return tempoMap(480, segments);
  }
  function fromNotationEngine(score, playback, options = {}) {
    const warnings = [];
    const map = toTempoMap(playback);
    const numStrings = options.numStrings ?? 6;
    const fromFile = readFileOnlyFields(options.musicXml);
    const offsets = playback.globalTickOffsetByMeasure;
    const entries = (playback.performance?.entries ?? []).filter(
      (entry) => entry.measureNumber !== void 0
    );
    const parts = [];
    for (const [partIndex, part] of (score.parts ?? []).entries()) {
      const partId = part.id ?? `P${partIndex + 1}`;
      const written = readWrittenNotes(part, partId);
      const byMeasure = /* @__PURE__ */ new Map();
      for (const note of written) {
        const list = byMeasure.get(note.measure);
        if (list === void 0) byMeasure.set(note.measure, [note]);
        else list.push(note);
      }
      const extra = fromFile.get(partId) ?? fromFile.get(`P${partIndex + 1}`);
      const transpose = extra?.transposeSemitones ?? 0;
      const notes = [];
      const plan = entries.length > 0 ? entries : [...byMeasure.keys()].sort((a, b) => a - b).map((measureNumber) => ({
        measureNumber,
        writtenTick: offsets?.get(measureNumber) ?? 0,
        startSeconds: void 0,
        writtenStartSeconds: void 0,
        pass: 1
      }));
      for (const entry of plan) {
        const measureNumber = entry.measureNumber;
        const measureWrittenTick = entry.writtenTick ?? offsets?.get(measureNumber) ?? 0;
        const measureWrittenSeconds = entry.writtenStartSeconds ?? tickToSeconds(map, measureWrittenTick);
        const measureSeconds = entry.startSeconds ?? measureWrittenSeconds;
        const pass = entry.pass ?? 1;
        for (const note of byMeasure.get(measureNumber) ?? []) {
          const writtenTick = measureWrittenTick + note.startTick;
          const startSeconds = measureSeconds + (tickToSeconds(map, writtenTick) - measureWrittenSeconds);
          const endSeconds = measureSeconds + (tickToSeconds(map, writtenTick + note.durationTicks) - measureWrittenSeconds);
          const finger = fingerOf(note.note.fingering);
          const string = note.note.stringNumber === void 0 ? void 0 : notationEngineStringToInternal(note.note.stringNumber, numStrings);
          notes.push({
            noteId: pass > 1 ? `${note.notationNoteId}#r${pass}` : note.notationNoteId,
            notationNoteId: note.notationNoteId,
            pitch: note.pitch + transpose,
            tick: writtenTick,
            durationTicks: note.durationTicks,
            time: startSeconds,
            duration: Math.max(0, endSeconds - startSeconds),
            voice: Number(note.voice) || 1,
            ...string !== void 0 ? { lockedString: string } : {},
            ...note.note.fret !== void 0 ? { lockedFret: note.note.fret } : {},
            ...finger !== void 0 ? { lockedFinger: finger } : {},
            techniques: [],
            sourceRef: {
              format: "musicxml",
              part: partId,
              measure: measureNumber,
              index: notes.length
            }
          });
        }
      }
      notes.sort((a, b) => a.time - b.time || a.pitch - b.pitch);
      const linked = pairSlides(notes, written);
      const hasTab = linked.some(
        (note) => note.lockedString !== void 0 && note.lockedFret !== void 0
      );
      parts.push({
        partId,
        name: part.name ?? partId,
        instrumentHint: {
          ...extra?.tuning !== void 0 ? { tuning: extra.tuning, numStrings: extra.tuning.length } : {},
          ...extra?.capo !== void 0 ? { capo: extra.capo } : {}
        },
        notes: linked,
        tempoMap: map,
        timeSignatures: readTimeSignatures(playback),
        hasTab
      });
    }
    if (parts.length === 0) {
      warnings.push({ code: "NO_PARTS", message: "the notation score has no parts to read" });
    }
    return { parts, warnings };
  }
  function notationNoteId(partId, measureNumber, voiceId, indexInVoice) {
    return `${partId}-m${measureNumber}-v${String(voiceId)}-n${indexInVoice}`;
  }
  function readWrittenNotes(part, partId) {
    const out = [];
    for (const measure of part.measures ?? []) {
      const measureNumber = measure.number ?? 0;
      for (const voice of measure.voices ?? []) {
        const voiceId = String(voice.id ?? 1);
        let running = 0;
        let index = 0;
        for (const event of voice.events ?? []) {
          const startTick = event.startTick ?? running;
          const eventTicks = event.duration?.ticks ?? 0;
          running = startTick + eventTicks;
          if (event.kind !== "note" && event.kind !== "chord") continue;
          const members = event.kind === "chord" ? event.notes ?? [] : [event];
          for (const member of members) {
            const pitch = midiOf(member.pitch);
            if (pitch === void 0) continue;
            out.push({
              measure: measureNumber,
              voice: voiceId,
              startTick,
              durationTicks: Math.max(1, member.duration?.ticks ?? eventTicks),
              pitch,
              note: member,
              notationNoteId: notationNoteId(partId, measureNumber, voiceId, index++)
            });
          }
        }
      }
    }
    return out;
  }
  function fingerOf(fingering) {
    if (fingering === void 0 || !Number.isFinite(fingering)) return void 0;
    if (fingering >= 1 && fingering <= 4) return fingering;
    return void 0;
  }
  function pairSlides(notes, written) {
    const flags = /* @__PURE__ */ new Map();
    for (const note of written) flags.set(note.notationNoteId, note.note);
    const links = /* @__PURE__ */ new Map();
    for (let i = 0; i < notes.length; i++) {
      const from = notes[i];
      if (from === void 0) continue;
      const source = flags.get(from.notationNoteId ?? from.noteId);
      if (source?.slideStart !== true) continue;
      const to = notes.slice(i + 1).find(
        (other) => other.time > from.time && (from.lockedString === void 0 || other.lockedString === void 0 || other.lockedString === from.lockedString)
      );
      if (to === void 0) continue;
      append(links, from.noteId, { type: "slide", toNoteId: to.noteId });
      append(links, to.noteId, { type: "slide", fromNoteId: from.noteId });
    }
    return notes.map((note) => {
      const own = links.get(note.noteId);
      return own === void 0 ? note : { ...note, techniqueLinks: own };
    });
  }
  function append(map, key, link) {
    const list = map.get(key);
    if (list === void 0) map.set(key, [link]);
    else list.push(link);
  }
  function readTimeSignatures(playback) {
    const offsets = playback.globalTickOffsetByMeasure;
    const meters = playback.timeSignatureByMeasure;
    if (meters === void 0) return [];
    const out = [];
    for (const [measureNumber, meter] of meters) {
      out.push({
        tick: offsets?.get(measureNumber) ?? 0,
        numerator: meter.numerator,
        denominator: meter.denominator
      });
    }
    return out.sort((a, b) => a.tick - b.tick);
  }
  function readFileOnlyFields(musicXml) {
    const out = /* @__PURE__ */ new Map();
    if (musicXml === void 0 || musicXml === "") return out;
    const root = parseXml(musicXml);
    if (root === void 0) return out;
    for (const [index, part] of childrenNamed(root, "part").entries()) {
      const partId = part.attributes["id"] ?? `P${index + 1}`;
      let transposeSemitones;
      let tuning;
      let capo;
      for (const measure of childrenNamed(part, "measure")) {
        for (const attributes of childrenNamed(measure, "attributes")) {
          const transpose = childNamed(attributes, "transpose");
          if (transpose !== void 0) {
            transposeSemitones = (childNumber(transpose, "chromatic") ?? 0) + (childNumber(transpose, "octave-change") ?? 0) * 12;
          }
          for (const details of childrenNamed(attributes, "staff-details")) {
            const lines = childrenNamed(details, "staff-tuning");
            if (lines.length > 0) {
              const read = [];
              for (const line of lines) {
                const lineNumber = Number(line.attributes["line"] ?? "0");
                const step = childNamed(line, "tuning-step")?.text.trim();
                const octave = childNumber(line, "tuning-octave");
                const semitone = step === void 0 ? void 0 : STEP_SEMITONES[step];
                if (semitone === void 0 || octave === void 0 || lineNumber < 1) continue;
                read[lineNumber - 1] = (octave + 1) * 12 + semitone + (childNumber(line, "tuning-alter") ?? 0);
              }
              if (read.length > 0) tuning = read;
            }
            const capoFret = childNumber(details, "capo");
            if (capoFret !== void 0) capo = capoFret;
          }
        }
      }
      out.set(partId, {
        ...transposeSemitones !== void 0 ? { transposeSemitones } : {},
        ...tuning !== void 0 ? { tuning } : {},
        ...capo !== void 0 ? { capo } : {}
      });
    }
    return out;
  }

  // src/input/midi/parse.ts
  function u8(reader) {
    const value = reader.bytes[reader.offset] ?? 0;
    reader.offset += 1;
    return value;
  }
  function u16(reader) {
    return u8(reader) << 8 | u8(reader);
  }
  function u32(reader) {
    return (u8(reader) << 24 | u8(reader) << 16 | u8(reader) << 8 | u8(reader)) >>> 0;
  }
  function varInt(reader) {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const byte = u8(reader);
      value = value << 7 | byte & 127;
      if ((byte & 128) === 0) break;
    }
    return value;
  }
  function parseMidi(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const warnings = [];
    const reader = { bytes, offset: 0 };
    if (readChunkName(reader) !== "MThd") {
      return {
        parts: [],
        warnings: [{ code: "NOT_MIDI", message: "no MThd header: this is not a MIDI file" }]
      };
    }
    const headerLength = u32(reader);
    const headerEnd = reader.offset + headerLength;
    u16(reader);
    const trackCount = u16(reader);
    const division = u16(reader);
    reader.offset = headerEnd;
    if ((division & 32768) !== 0) {
      return {
        parts: [],
        warnings: [
          {
            code: "MIDI_SMPTE_UNSUPPORTED",
            message: "this file counts time in SMPTE frames, which this engine does not read"
          }
        ]
      };
    }
    const fileTicksPerQuarter = division === 0 ? 480 : division;
    const scale = TICKS_PER_QUARTER / fileTicksPerQuarter;
    const tempoEvents = /* @__PURE__ */ new Map();
    const timeSignatures = /* @__PURE__ */ new Map();
    const tracks = [];
    for (let index = 0; index < trackCount && reader.offset < bytes.length; index++) {
      if (readChunkName(reader) !== "MTrk") break;
      const length = u32(reader);
      const end = Math.min(bytes.length, reader.offset + length);
      tracks.push(readTrack(reader, end, scale, tempoEvents, timeSignatures));
      reader.offset = end;
    }
    const segments = [...tempoEvents.entries()].sort((a, b) => a[0] - b[0]).map(([startTick, microsecondsPerQuarter]) => ({ startTick, microsecondsPerQuarter }));
    const map = tempoMap(TICKS_PER_QUARTER, segments);
    const meters = [...timeSignatures.values()].sort((a, b) => a.tick - b.tick);
    const parts = [];
    for (let index = 0; index < tracks.length; index++) {
      const track = tracks[index];
      if (track.notes.length === 0) continue;
      parts.push({
        partId: `t${index + 1}`,
        name: track.name === "" ? `Track ${index + 1}` : track.name,
        ...track.program !== void 0 ? { gmProgram: track.program } : {},
        instrumentHint: {},
        notes: toNoteEvents(track, index + 1),
        tempoMap: map,
        timeSignatures: meters,
        hasTab: false
      });
    }
    if (parts.length === 0) {
      warnings.push({ code: "NO_NOTES", message: "the file has no sounding notes in any track" });
    }
    return { parts, warnings };
  }
  function readChunkName(reader) {
    return String.fromCharCode(u8(reader), u8(reader), u8(reader), u8(reader));
  }
  function readTrack(reader, end, scale, tempoEvents, timeSignatures) {
    const track = {
      name: "",
      program: void 0,
      channels: /* @__PURE__ */ new Set(),
      notes: [],
      bends: []
    };
    const sounding = /* @__PURE__ */ new Map();
    let tick = 0;
    let status = 0;
    while (reader.offset < end) {
      tick += varInt(reader);
      const at = Math.round(tick * scale);
      let byte = u8(reader);
      if (byte < 128) {
        reader.offset -= 1;
        byte = status;
      } else if (byte < 240) {
        status = byte;
      }
      if (byte === 255) {
        const type = u8(reader);
        const length = varInt(reader);
        const start = reader.offset;
        if (type === 81 && length === 3) {
          const value = u8(reader) << 16 | u8(reader) << 8 | u8(reader);
          if (!tempoEvents.has(at) && value > 0) tempoEvents.set(at, value);
        } else if (type === 88 && length >= 2) {
          const numerator = u8(reader);
          const denominator = Math.pow(2, u8(reader));
          if (!timeSignatures.has(at)) timeSignatures.set(at, { tick: at, numerator, denominator });
        } else if (type === 3 && track.name === "") {
          let name = "";
          for (let i = 0; i < length; i++) name += String.fromCharCode(u8(reader));
          track.name = name.trim();
        }
        reader.offset = start + length;
        continue;
      }
      if (byte === 240 || byte === 247) {
        reader.offset += varInt(reader);
        continue;
      }
      const command = byte & 240;
      const channel = byte & 15;
      if (command === 144 || command === 128) {
        const pitch = u8(reader);
        const velocity = u8(reader);
        track.channels.add(channel);
        const key = channel * 128 + pitch;
        if (command === 144 && velocity > 0) {
          const open = sounding.get(key);
          if (open !== void 0) open.endTick = at;
          const note = { channel, pitch, velocity, startTick: at, endTick: at };
          sounding.set(key, note);
          track.notes.push(note);
        } else {
          const open = sounding.get(key);
          if (open !== void 0 && at > open.startTick) open.endTick = at;
          sounding.delete(key);
        }
        continue;
      }
      if (command === 192) {
        track.program = u8(reader);
        track.channels.add(channel);
        continue;
      }
      if (command === 224) {
        const low = u8(reader);
        const high = u8(reader);
        const value = (high << 7 | low) - 8192;
        track.bends.push({ tick: at, channel, semitones: value / 8192 * 2 });
        continue;
      }
      if (command === 208) {
        u8(reader);
        continue;
      }
      u8(reader);
      u8(reader);
    }
    for (const note of track.notes) {
      if (note.endTick <= note.startTick) note.endTick = note.startTick + TICKS_PER_QUARTER;
    }
    return track;
  }
  function toNoteEvents(track, trackNumber) {
    const ordered = [...track.notes].sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
    return ordered.map((note, index) => ({
      noteId: `t${trackNumber}-n${index}`,
      pitch: note.pitch,
      tick: note.startTick,
      durationTicks: Math.max(1, note.endTick - note.startTick),
      time: 0,
      duration: 0,
      velocity: note.velocity,
      voice: note.channel + 1,
      techniques: [],
      sourceRef: { format: "midi", part: `t${trackNumber}`, index }
    }));
  }
  function guitarTracks(parts) {
    const notDrums = parts.filter((part) => !part.notes.every((note) => note.voice === 10));
    const byProgram = notDrums.filter(
      (part) => part.gmProgram !== void 0 && part.gmProgram >= 24 && part.gmProgram <= 31
    );
    if (byProgram.length > 0) return byProgram;
    const named = notDrums.filter((part) => /guitar|gtr|guit/i.test(part.name));
    if (named.length > 0) return named;
    return notDrums.filter(
      (part) => part.gmProgram === void 0 || part.gmProgram < 32 || part.gmProgram > 39
    );
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
