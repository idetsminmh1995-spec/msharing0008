"use strict";
var PianoHandEngine = (() => {
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
    ALL_FINGERS: () => ALL_FINGERS,
    BLACK_KEY_DEPTH_MM: () => BLACK_KEY_DEPTH_MM,
    BLACK_KEY_OFFSETS: () => BLACK_KEY_OFFSETS,
    BLACK_KEY_RISE_MM: () => BLACK_KEY_RISE_MM,
    BLACK_KEY_WIDTH_MM: () => BLACK_KEY_WIDTH_MM,
    ENGINE_VERSION: () => ENGINE_VERSION,
    FINGERING_WEIGHTS: () => WEIGHT,
    FINGER_NAMES: () => FINGER_NAMES,
    HAND_PROFILES: () => HAND_PROFILES,
    IMPOSSIBLE: () => IMPOSSIBLE,
    JOINT_LIMITS: () => JOINT_LIMITS,
    KEYBOARD_RANGES: () => KEYBOARD_RANGES,
    KEY_DIP_MM: () => KEY_DIP_MM,
    MEDIUM_HAND_RIG: () => MEDIUM_HAND_RIG,
    MEDIUM_SPANS: () => MEDIUM_SPANS,
    OCTAVE_SPAN_MM: () => OCTAVE_SPAN_MM,
    ONSET_TOLERANCE_MS: () => ONSET_TOLERANCE_MS,
    POSES: () => POSES,
    TRAVEL_CLEARANCE_MM: () => TRAVEL_CLEARANCE_MM,
    TimelineCursor: () => TimelineCursor,
    WHITE_KEY_DEPTH_MM: () => WHITE_KEY_DEPTH_MM,
    WHITE_KEY_WIDTH_MM: () => WHITE_KEY_WIDTH_MM,
    buildKeyboard: () => buildKeyboard,
    clampFingerState: () => clampFingerState,
    endMs: () => endMs,
    fingerPair: () => fingerPair,
    frameCount: () => frameCount,
    frameTimeMs: () => frameTimeMs,
    frameTimes: () => frameTimes,
    groupByOnset: () => groupByOnset,
    handAnchorOf: () => anchorOf,
    handRigFor: () => handRigFor,
    isBlackKey: () => isBlackKey,
    isKeyContactActive: () => isKeyContactActive,
    isSoundingAt: () => isSoundingAt,
    keyApproachPoint: () => keyApproachPoint,
    keyDistanceMm: () => keyDistanceMm,
    keyDistanceWhites: () => keyDistanceWhites,
    keyOf: () => keyOf,
    keyPositionsFor: () => keyPositionsFor,
    keyPressDepthMm: () => keyPressDepthMm,
    keyStrikePoint: () => keyStrikePoint,
    keyboardGeometry3D: () => keyboardGeometry3D,
    keyboardRange: () => keyboardRange,
    keyboardWidthMm: () => keyboardWidthMm,
    maxReachMm: () => maxReachMm,
    nextAfter: () => nextAfter,
    pitchClass: () => pitchClass,
    pressedPose: () => pressedPose,
    sampleHandMotion: () => sampleHandMotion,
    solveFingerTarget: () => solveFingerTarget,
    solveFingerTargets: () => solveFingerTargets,
    solveFingering: () => solveFingering,
    solveHandSkeleton: () => solveHandSkeleton,
    solvePerformancePlan: () => solvePerformancePlan,
    solveStages: () => solveStages,
    spanStrain: () => spanStrain,
    spansFor: () => spansFor,
    splitHands: () => splitHands,
    stageCost: () => stageCost,
    transitionCost: () => transitionCost,
    whiteIndex: () => whiteIndex,
    whiteKeyCount: () => whiteKeyCount
  });

  // src/core/types.ts
  var ALL_FINGERS = [1, 2, 3, 4, 5];
  var FINGER_NAMES = {
    1: "thumb",
    2: "index",
    3: "middle",
    4: "ring",
    5: "pinky"
  };

  // src/core/timeline.ts
  function frameTimeMs(frame, fps) {
    return frame * 1e3 / fps;
  }
  function frameCount(durationMs, fps) {
    return Math.max(0, Math.ceil(durationMs / 1e3 * fps));
  }
  function frameTimes(options) {
    const count = frameCount(options.durationMs, options.fps);
    const times = [];
    for (let frame = 0; frame < count; frame++) times.push(frameTimeMs(frame, options.fps));
    return times;
  }
  function endMs(event) {
    return event.timeMs + event.durationMs;
  }
  function isSoundingAt(event, timeMs) {
    return timeMs >= event.timeMs && timeMs < endMs(event);
  }
  var TimelineCursor = class {
    constructor(events) {
      this.events = events;
      this.index = 0;
    }
    reset() {
      this.index = 0;
    }
    /** Everything sounding at `timeMs`. Call with non-decreasing times for the cheap path. */
    soundingAt(timeMs) {
      if (this.index > 0) {
        const current = this.events[this.index - 1];
        if (current !== void 0 && current.timeMs > timeMs) this.index = 0;
      }
      while (this.index < this.events.length) {
        const event = this.events[this.index];
        if (event === void 0 || event.timeMs > timeMs) break;
        this.index++;
      }
      const out = [];
      for (let i = this.index - 1; i >= 0; i--) {
        const event = this.events[i];
        if (event === void 0) continue;
        if (isSoundingAt(event, timeMs)) out.push(event);
        if (timeMs - event.timeMs > LOOKBACK_MS) break;
      }
      return out.reverse();
    }
  };
  var LOOKBACK_MS = 3e4;
  function nextAfter(events, timeMs, from = 0) {
    for (let i = from; i < events.length; i++) {
      const event = events[i];
      if (event !== void 0 && event.timeMs >= timeMs) return event;
    }
    return void 0;
  }
  var ONSET_TOLERANCE_MS = 12;
  function groupByOnset(events, toleranceMs = ONSET_TOLERANCE_MS) {
    const sorted = [...events].sort((a, b) => a.timeMs - b.timeMs);
    const groups = [];
    for (const event of sorted) {
      const current = groups[groups.length - 1];
      if (current !== void 0 && event.timeMs - current.timeMs <= toleranceMs) {
        current.notes.push(event);
      } else {
        groups.push({ timeMs: event.timeMs, notes: [event] });
      }
    }
    return groups;
  }

  // src/keyboard/pianoGeometry.ts
  var OCTAVE_SPAN_MM = 165;
  var WHITE_KEY_WIDTH_MM = OCTAVE_SPAN_MM / 7;
  var WHITE_KEY_DEPTH_MM = 150;
  var BLACK_KEY_WIDTH_MM = 11;
  var BLACK_KEY_DEPTH_MM = 95;
  var BLACK_KEY_RISE_MM = 11;
  var KEY_DIP_MM = 10;
  var BLACK_KEY_OFFSETS = {
    1: 0,
    // C#
    3: 0,
    // D#
    6: 0,
    // F#
    8: 0,
    // G#
    10: 0
    // A#
  };
  var BLACK_PITCH_CLASSES = /* @__PURE__ */ new Set([1, 3, 6, 8, 10]);
  function isBlackKey(midi) {
    return BLACK_PITCH_CLASSES.has(pitchClass(midi));
  }
  function pitchClass(midi) {
    return (midi % 12 + 12) % 12;
  }
  var KEYBOARD_RANGES = {
    61: { first: 36, last: 96 },
    73: { first: 28, last: 100 },
    76: { first: 28, last: 103 },
    88: { first: 21, last: 108 }
  };
  function keyboardRange(size) {
    if (typeof size === "number") return KEYBOARD_RANGES[size] ?? KEYBOARD_RANGES[88];
    return size;
  }
  function whiteIndex(midi) {
    const WHITES_BELOW = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
    const octave = Math.floor(midi / 12);
    return octave * 7 + (WHITES_BELOW[pitchClass(midi)] ?? 0);
  }
  function whiteAbove(midi) {
    return isBlackKey(midi) ? midi + 1 : midi;
  }
  function keyboardGeometry3D(options = {}) {
    const { first, last } = keyboardRange(options.size ?? 88);
    const originX = options.originX ?? 0;
    const firstWhiteIndex = whiteIndex(whiteAbove(first));
    const whites = [];
    const blacks = [];
    for (let midi = first; midi <= last; midi++) {
      if (isBlackKey(midi)) {
        const boundary = originX + (whiteIndex(midi + 1) - firstWhiteIndex) * WHITE_KEY_WIDTH_MM;
        const offset = BLACK_KEY_OFFSETS[pitchClass(midi)] ?? 0;
        blacks.push({
          midi,
          x: boundary - BLACK_KEY_WIDTH_MM / 2 + offset,
          y: BLACK_KEY_RISE_MM,
          // Flush with the white keys at the BACK, not the front: a black
          // key is short at the player's end, which is the whole reason a
          // thumb can sit in front of one.
          z: WHITE_KEY_DEPTH_MM - BLACK_KEY_DEPTH_MM,
          width: BLACK_KEY_WIDTH_MM,
          depth: BLACK_KEY_DEPTH_MM,
          isBlack: true
        });
      } else {
        whites.push({
          midi,
          x: originX + (whiteIndex(midi) - firstWhiteIndex) * WHITE_KEY_WIDTH_MM,
          y: 0,
          z: 0,
          width: WHITE_KEY_WIDTH_MM,
          depth: WHITE_KEY_DEPTH_MM,
          isBlack: false
        });
      }
    }
    return [...whites, ...blacks];
  }
  function keyboardWidthMm(size = 88) {
    const { first, last } = keyboardRange(size);
    return whiteKeyCount({ first, last }) * WHITE_KEY_WIDTH_MM;
  }
  function whiteKeyCount(size = 88) {
    const { first, last } = keyboardRange(size);
    let count = 0;
    for (let midi = first; midi <= last; midi++) {
      if (!isBlackKey(midi)) count++;
    }
    return count;
  }

  // src/keyboard/keyPosition.ts
  var WHITE_STRIKE_FRACTION = 0.3;
  var BLACK_STRIKE_FRACTION = 0.4;
  function buildKeyboard(size = 88, originX = 0) {
    const keys = keyboardGeometry3D({ size, originX });
    const byMidi = /* @__PURE__ */ new Map();
    for (const key of keys) byMidi.set(key.midi, key);
    const { first, last } = keyboardRange(size);
    return { size, keys, byMidi, first, last };
  }
  function keyOf(keyboard, midi) {
    return keyboard.byMidi.get(midi);
  }
  function keyStrikePoint(key, pressDepthMm = 0) {
    const fraction = key.isBlack ? BLACK_STRIKE_FRACTION : WHITE_STRIKE_FRACTION;
    return {
      x: key.x + key.width / 2,
      y: key.y - clamp(pressDepthMm, 0, KEY_DIP_MM),
      z: key.z + key.depth * fraction
    };
  }
  var TRAVEL_CLEARANCE_MM = BLACK_KEY_RISE_MM + 4;
  function keyApproachPoint(key) {
    const strike = keyStrikePoint(key);
    return { ...strike, y: TRAVEL_CLEARANCE_MM };
  }
  function keyDistanceMm(keyboard, fromMidi, toMidi) {
    const from = keyOf(keyboard, fromMidi);
    const to = keyOf(keyboard, toMidi);
    if (from === void 0 || to === void 0) {
      return (whiteIndex(toMidi) - whiteIndex(fromMidi)) * WHITE_KEY_WIDTH_MM;
    }
    return to.x + to.width / 2 - (from.x + from.width / 2);
  }
  function keyDistanceWhites(keyboard, fromMidi, toMidi) {
    return keyDistanceMm(keyboard, fromMidi, toMidi) / WHITE_KEY_WIDTH_MM;
  }
  function keyPositionsFor(notes, keyboard) {
    const positions = [];
    const outOfRange = [];
    for (const note of notes) {
      const key = keyOf(keyboard, note.midi);
      if (key === void 0) {
        outOfRange.push({
          id: note.id,
          midi: note.midi,
          nearest: clamp(note.midi, keyboard.first, keyboard.last)
        });
        continue;
      }
      positions.push({
        id: note.id,
        midi: note.midi,
        timeMs: note.timeMs,
        durationMs: note.durationMs,
        key,
        strike: keyStrikePoint(key),
        approach: keyApproachPoint(key)
      });
    }
    return { positions, outOfRange };
  }
  function isKeyContactActive(timeMs, note, options = {}) {
    const release = options.releaseMs ?? 70;
    return timeMs >= note.timeMs && timeMs < note.timeMs + note.durationMs + release;
  }
  function keyPressDepthMm(timeMs, note, options = {}) {
    const attack = options.attackMs ?? 28;
    const release = options.releaseMs ?? 70;
    const start = note.timeMs;
    const end = note.timeMs + note.durationMs;
    if (timeMs <= start) return 0;
    if (timeMs < start + attack) {
      return KEY_DIP_MM * easeOutQuad((timeMs - start) / attack);
    }
    if (timeMs <= end) return KEY_DIP_MM;
    if (timeMs < end + release) {
      return KEY_DIP_MM * (1 - easeOutQuad((timeMs - end) / release));
    }
    return 0;
  }
  function easeOutQuad(t) {
    const u = clamp(t, 0, 1);
    return 1 - (1 - u) * (1 - u);
  }
  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  // src/core/solver.ts
  var DEFAULT_BEAM_WIDTH = 64;
  var DEFAULT_MAX_RELAX = 3;
  function solveStages(input) {
    const beamWidth = input.beamWidth ?? DEFAULT_BEAM_WIDTH;
    const maxRelax = input.maxRelax ?? DEFAULT_MAX_RELAX;
    const relaxedStages = [];
    let beam = [];
    const skippedStages = [];
    for (let index = 0; index < input.stages.length; index++) {
      const stage = input.stages[index];
      if (stage === void 0) continue;
      const previousStage = index > 0 ? input.stages[index - 1] : void 0;
      const next = /* @__PURE__ */ new Map();
      let relax = 0;
      while (next.size === 0 && relax <= maxRelax) {
        if (beam.length === 0) {
          for (const state of input.expand(void 0, stage, index, relax)) {
            offer(
              next,
              {
                state,
                cost: input.stateCost(state, stage, index),
                stageIndex: index,
                previous: void 0
              },
              input.stateKey
            );
          }
        } else {
          for (const node of beam) {
            for (const state of input.expand(node.state, stage, index, relax)) {
              const cost = node.cost + input.stateCost(state, stage, index) + (previousStage === void 0 ? 0 : input.transitionCost(node.state, state, previousStage, stage));
              offer(next, { state, cost, stageIndex: index, previous: node }, input.stateKey);
            }
          }
        }
        if (next.size === 0) relax++;
      }
      if (next.size === 0) {
        skippedStages.push(index);
        continue;
      }
      if (relax > 0) relaxedStages.push(index);
      beam = prune([...next.values()], beamWidth);
    }
    const best = beam.reduce(
      (lowest, node) => lowest === void 0 || node.cost < lowest.cost ? node : lowest,
      void 0
    );
    const path = new Array(input.stages.length).fill(
      void 0
    );
    if (best === void 0) {
      return {
        path,
        totalCost: 0,
        relaxedStages,
        skippedStages: input.stages.map((_, index) => index),
        incomplete: input.stages.length > 0
      };
    }
    for (let node = best; node !== void 0; node = node.previous) {
      path[node.stageIndex] = node.state;
    }
    return {
      path,
      totalCost: best.cost,
      relaxedStages,
      skippedStages,
      incomplete: skippedStages.length > 0
    };
  }
  function offer(into, node, stateKey) {
    if (!Number.isFinite(node.cost)) return;
    const key = stateKey(node.state);
    const existing = into.get(key);
    if (existing === void 0 || node.cost < existing.cost) into.set(key, node);
  }
  function prune(nodes, width) {
    if (nodes.length <= width) return [...nodes];
    return [...nodes].sort((a, b) => a.cost - b.cost).slice(0, width);
  }

  // src/kinematics/handPose.ts
  var MEDIUM_HAND_RIG = {
    palmLength: 95,
    palmWidth: 84,
    fingers: {
      1: {
        knuckle: { x: -32, y: -4, z: 28 },
        bones: { proximal: 46, intermediate: 32, distal: 25 },
        restSplay: -0.8
      },
      2: {
        knuckle: { x: -27, y: 0, z: 95 },
        bones: { proximal: 45, intermediate: 25, distal: 19 },
        restSplay: -0.1
      },
      3: {
        knuckle: { x: -9, y: 0, z: 99 },
        bones: { proximal: 50, intermediate: 29, distal: 20 },
        restSplay: 0
      },
      4: {
        knuckle: { x: 9, y: 0, z: 95 },
        bones: { proximal: 46, intermediate: 27, distal: 19 },
        restSplay: 0.09
      },
      5: {
        knuckle: { x: 26, y: 0, z: 86 },
        bones: { proximal: 36, intermediate: 20, distal: 17 },
        restSplay: 0.22
      }
    }
  };
  var HAND_PROFILES = {
    small: 0.9,
    medium: 1,
    large: 1.1
  };
  function handRigFor(profile = "medium") {
    const scale2 = HAND_PROFILES[profile];
    if (scale2 === 1) return MEDIUM_HAND_RIG;
    const fingers = {};
    for (const finger of ALL_FINGERS) {
      const rig = MEDIUM_HAND_RIG.fingers[finger];
      fingers[finger] = {
        knuckle: scaleVec(rig.knuckle, scale2),
        bones: {
          proximal: rig.bones.proximal * scale2,
          intermediate: rig.bones.intermediate * scale2,
          distal: rig.bones.distal * scale2
        },
        // An angle is not a length: a bigger hand splays the same way.
        restSplay: rig.restSplay
      };
    }
    return {
      palmLength: MEDIUM_HAND_RIG.palmLength * scale2,
      palmWidth: MEDIUM_HAND_RIG.palmWidth * scale2,
      fingers
    };
  }
  var JOINT_LIMITS = {
    // The knuckle extends a little past straight -- a flat hand on a
    // table is already slightly past zero -- and curls to a right angle.
    mcp: { min: -0.35, max: 1.6 },
    // The middle joint does not extend past straight at all, and closes
    // further than any other.
    pip: { min: 0, max: 1.92 },
    dip: { min: -0.17, max: 1.4 },
    // Fanning out, either way from the finger's own rest splay.
    spread: { min: -0.35, max: 0.4 }
  };
  function clampFingerState(state) {
    return {
      mcp: clamp2(state.mcp, JOINT_LIMITS.mcp.min, JOINT_LIMITS.mcp.max),
      pip: clamp2(state.pip, JOINT_LIMITS.pip.min, JOINT_LIMITS.pip.max),
      dip: clamp2(state.dip, JOINT_LIMITS.dip.min, JOINT_LIMITS.dip.max),
      spread: clamp2(state.spread, JOINT_LIMITS.spread.min, JOINT_LIMITS.spread.max)
    };
  }
  function solveHandSkeleton(input) {
    const mirror = input.hand === "left" ? -1 : 1;
    const rotate = eulerRotator(input.wristRotation);
    const place = (local) => add(input.wrist, rotate({ ...local, x: local.x * mirror }));
    const fingers = {};
    for (const finger of ALL_FINGERS) {
      const rig = input.rig.fingers[finger];
      const state = clampFingerState(input.fingers[finger]);
      const mcpLocal = rig.knuckle;
      const splay = rig.restSplay + state.spread;
      let pitch = 0;
      let point = mcpLocal;
      const chain = [];
      const bones = [rig.bones.proximal, rig.bones.intermediate, rig.bones.distal];
      const joints = [state.mcp, state.pip, state.dip];
      for (let i = 0; i < bones.length; i++) {
        pitch += joints[i] ?? 0;
        const length = bones[i] ?? 0;
        point = {
          x: point.x + Math.sin(splay) * Math.cos(pitch) * length,
          y: point.y - Math.sin(pitch) * length,
          z: point.z + Math.cos(splay) * Math.cos(pitch) * length
        };
        chain.push(point);
      }
      fingers[finger] = {
        mcp: place(mcpLocal),
        pip: place(chain[0] ?? mcpLocal),
        dip: place(chain[1] ?? mcpLocal),
        tip: place(chain[2] ?? mcpLocal)
      };
    }
    return {
      wrist: input.wrist,
      palm: place({ x: 0, y: 0, z: input.rig.palmLength / 2 }),
      fingers
    };
  }
  var POSES = {
    rest: {
      1: { mcp: 0.18, pip: 0.2, dip: 0.12, spread: 0 },
      2: { mcp: 0.42, pip: 0.5, dip: 0.28, spread: 0 },
      3: { mcp: 0.44, pip: 0.54, dip: 0.3, spread: 0 },
      4: { mcp: 0.46, pip: 0.56, dip: 0.3, spread: 0 },
      5: { mcp: 0.44, pip: 0.5, dip: 0.28, spread: 0 }
    },
    // Curled enough that the fingertips, not the pads, are over the
    // keys -- which is the shape every method book's first page draws.
    fiveFinger: {
      1: { mcp: 0.1, pip: 0.12, dip: 0.08, spread: 0 },
      2: { mcp: 0.5, pip: 0.62, dip: 0.3, spread: 0 },
      3: { mcp: 0.52, pip: 0.66, dip: 0.32, spread: 0 },
      4: { mcp: 0.54, pip: 0.66, dip: 0.32, spread: 0 },
      5: { mcp: 0.5, pip: 0.6, dip: 0.3, spread: 0 }
    },
    // Thumb and little finger fanned to the ends, the middle three
    // straighter so they ride over the keys between rather than
    // catching them.
    octave: {
      1: { mcp: 0.06, pip: 0.08, dip: 0.05, spread: -0.3 },
      2: { mcp: 0.38, pip: 0.42, dip: 0.2, spread: -0.1 },
      3: { mcp: 0.36, pip: 0.4, dip: 0.2, spread: 0 },
      4: { mcp: 0.38, pip: 0.42, dip: 0.2, spread: 0.12 },
      5: { mcp: 0.34, pip: 0.36, dip: 0.18, spread: 0.34 }
    }
  };
  function pressedPose(base, finger, depth = 1) {
    const out = {};
    for (const f of ALL_FINGERS) {
      const state = base[f];
      out[f] = f === finger ? clampFingerState({
        // A finger presses by STRAIGHTENING slightly at the middle
        // joint and driving down from the knuckle, not by curling:
        // a curling finger pulls its tip back off the key.
        mcp: state.mcp + 0.2 * depth,
        pip: state.pip - 0.14 * depth,
        dip: state.dip - 0.06 * depth,
        spread: state.spread
      }) : state;
    }
    return out;
  }
  function clamp2(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }
  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }
  function scaleVec(v, k) {
    return { x: v.x * k, y: v.y * k, z: v.z * k };
  }
  function eulerRotator(e) {
    const cx = Math.cos(e.x);
    const sx = Math.sin(e.x);
    const cy = Math.cos(e.y);
    const sy = Math.sin(e.y);
    const cz = Math.cos(e.z);
    const sz = Math.sin(e.z);
    return (v) => {
      const y1 = v.y * cx - v.z * sx;
      const z1 = v.y * sx + v.z * cx;
      const x2 = v.x * cy + z1 * sy;
      const z2 = -v.x * sy + z1 * cy;
      const x3 = x2 * cz - y1 * sz;
      const y3 = x2 * sz + y1 * cz;
      return { x: x3, y: y3, z: z2 };
    };
  }

  // src/fingering/handSpan.ts
  function fingerPair(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }
  var MEDIUM_SPANS = {
    "1-2": { comfort: 2, max: 4 },
    "1-3": { comfort: 3.5, max: 5.5 },
    "1-4": { comfort: 5, max: 7 },
    "1-5": { comfort: 7, max: 8.5 },
    "2-3": { comfort: 1.5, max: 2.5 },
    "2-4": { comfort: 2.5, max: 4 },
    "2-5": { comfort: 4, max: 5.5 },
    "3-4": { comfort: 1, max: 2 },
    "3-5": { comfort: 2.5, max: 4 },
    "4-5": { comfort: 1, max: 2 },
    // A finger against itself: one key, and it cannot be two places.
    "1-1": { comfort: 0, max: 0 },
    "2-2": { comfort: 0, max: 0 },
    "3-3": { comfort: 0, max: 0 },
    "4-4": { comfort: 0, max: 0 },
    "5-5": { comfort: 0, max: 0 }
  };
  function spansFor(profile = "medium") {
    const scale2 = HAND_PROFILES[profile];
    const out = {};
    for (const key of Object.keys(MEDIUM_SPANS)) {
      const span = MEDIUM_SPANS[key];
      out[key] = {
        comfort: span.comfort * scale2 * WHITE_KEY_WIDTH_MM,
        max: span.max * scale2 * WHITE_KEY_WIDTH_MM
      };
    }
    return out;
  }
  function spanStrain(spans, a, b, distanceMm) {
    const span = spans[fingerPair(a, b)];
    const distance2 = Math.abs(distanceMm);
    if (span === void 0) return { strain: 0, impossible: false };
    if (distance2 <= span.comfort) return { strain: 0, impossible: false };
    if (distance2 > span.max) return { strain: 1, impossible: true };
    const range = span.max - span.comfort;
    return { strain: range <= 0 ? 1 : (distance2 - span.comfort) / range, impossible: false };
  }
  function maxReachMm(spans) {
    return spans["1-5"]?.max ?? 0;
  }

  // src/fingering/fingeringCost.ts
  var IMPOSSIBLE = Number.POSITIVE_INFINITY;
  var WEIGHT = {
    /** Past what the hand reaches. Not a preference. */
    beyondReach: IMPOSSIBLE,
    /** Between comfort and the maximum, rising. */
    stretch: 6,
    /** The thumb on a black key: short, and it has to reach past the whites either side. */
    thumbOnBlack: 2.2,
    /** The little finger on a black key: shorter than its neighbours, so it has to over-reach. */
    pinkyOnBlack: 0.9,
    /** A long finger (2, 3, 4) on a white key between two blacks it has to thread. */
    longFingerBetweenBlacks: 0.25,
    /** How far the hand moved, per white key. */
    travel: 0.35,
    /** Moving faster than a hand moves, per millimetre per millisecond past the limit. */
    rush: 5,
    /** Changing finger on a key that is simply repeated. */
    pointlessChange: 1.1,
    /** Keeping the same finger on a repeat too fast to re-strike with it. */
    rushedRepeat: 3,
    /** 3 over 4, 2 over 3 -- a crossing that is not a thumb-under. */
    awkwardCross: 4.5,
    /** The thumb passing under, which is the ordinary way to continue a scale. */
    thumbUnder: 0.4,
    /** A finger crossing OVER the thumb, the other half of the same move. */
    fingerOverThumb: 0.5,
    /** A thumb-under that is not going anywhere -- the hand did not actually need it. */
    idleThumbUnder: 2
  };
  var COMFORTABLE_SPEED_MM_PER_MS = 1;
  function stageCost(state, stage, context) {
    const { notes } = stage;
    if (state.fingers.length !== notes.length) return IMPOSSIBLE;
    let cost = 0;
    const seen = /* @__PURE__ */ new Set();
    for (const finger of state.fingers) {
      if (seen.has(finger)) return IMPOSSIBLE;
      seen.add(finger);
    }
    if (!runsInOrder(state.fingers, stage.hand)) return IMPOSSIBLE;
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i];
        const b = notes[j];
        const fa = state.fingers[i];
        const fb = state.fingers[j];
        if (a === void 0 || b === void 0 || fa === void 0 || fb === void 0) continue;
        const verdict = spanStrain(
          context.spans,
          fa,
          fb,
          keyDistanceMm(context.keyboard, a.midi, b.midi)
        );
        if (verdict.impossible) return IMPOSSIBLE;
        cost += verdict.strain * WEIGHT.stretch;
      }
    }
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const finger = state.fingers[i];
      if (note === void 0 || finger === void 0) continue;
      const black = isBlackKey(note.midi);
      if (black && finger === 1) cost += WEIGHT.thumbOnBlack;
      if (black && finger === 5) cost += WEIGHT.pinkyOnBlack;
      if (!black && (finger === 2 || finger === 3 || finger === 4) && betweenBlacks(note.midi)) {
        cost += WEIGHT.longFingerBetweenBlacks;
      }
    }
    return cost;
  }
  function transitionCost(from, to, fromStage, toStage, context) {
    const fromAnchor = anchorOf(from, fromStage);
    const toAnchor = anchorOf(to, toStage);
    if (fromAnchor === void 0 || toAnchor === void 0) return 0;
    let cost = 0;
    const shiftMm = Math.abs(
      keyDistanceMm(context.keyboard, fromAnchor.anchorMidi, toAnchor.anchorMidi)
    );
    cost += shiftMm / WHITE_KEY_WIDTH_MM * WEIGHT.travel;
    const gapMs = Math.max(1, toStage.timeMs - fromStage.timeMs);
    const speed = shiftMm / gapMs;
    if (speed > COMFORTABLE_SPEED_MM_PER_MS) {
      cost += (speed - COMFORTABLE_SPEED_MM_PER_MS) * WEIGHT.rush;
    }
    if (fromStage.notes.length === 1 && toStage.notes.length === 1) {
      const a = fromStage.notes[0];
      const b = toStage.notes[0];
      const fa = from.fingers[0];
      const fb = to.fingers[0];
      if (a !== void 0 && b !== void 0 && fa !== void 0 && fb !== void 0) {
        if (a.midi === b.midi) {
          const canRestrike = gapMs >= 140;
          if (canRestrike && fa !== fb) cost += WEIGHT.pointlessChange;
          if (!canRestrike && fa === fb) cost += WEIGHT.rushedRepeat;
        }
      }
    }
    cost += crossingCost(from, to, fromStage, toStage, context);
    return cost;
  }
  function crossingCost(from, to, fromStage, toStage, context) {
    if (fromStage.notes.length !== 1 || toStage.notes.length !== 1) return 0;
    const a = fromStage.notes[0];
    const b = toStage.notes[0];
    const fa = from.fingers[0];
    const fb = to.fingers[0];
    if (a === void 0 || b === void 0 || fa === void 0 || fb === void 0) return 0;
    const step = keyDistanceMm(context.keyboard, a.midi, b.midi);
    if (step === 0) return 0;
    const outward = toStage.hand === "right" ? step > 0 : step < 0;
    const fingersRose = fb > fa;
    if (outward === fingersRose) return 0;
    if (outward && fb === 1) {
      const stepWhites = Math.abs(step) / WHITE_KEY_WIDTH_MM;
      return stepWhites <= 2.5 ? WEIGHT.thumbUnder : WEIGHT.idleThumbUnder;
    }
    if (!outward && fa === 1) {
      return WEIGHT.fingerOverThumb;
    }
    return WEIGHT.awkwardCross;
  }
  function runsInOrder(fingers, hand) {
    for (let i = 1; i < fingers.length; i++) {
      const previous = fingers[i - 1];
      const current = fingers[i];
      if (previous === void 0 || current === void 0) continue;
      if (hand === "right" ? current <= previous : current >= previous) return false;
    }
    return true;
  }
  function anchorOf(state, stage) {
    const note = stage.notes[0];
    const finger = state.fingers[0];
    if (note === void 0 || finger === void 0) return void 0;
    const steps = (finger - 1) * (stage.hand === "right" ? -1 : 1);
    return { anchorMidi: shiftByWhites(note.midi, steps) };
  }
  function shiftByWhites(midi, whites) {
    if (whites === 0) return midi;
    const direction = whites > 0 ? 1 : -1;
    let remaining = Math.abs(whites);
    let current = midi;
    while (remaining > 0) {
      current += direction;
      if (!isBlackKey(current)) remaining--;
    }
    return current;
  }
  function betweenBlacks(midi) {
    return !isBlackKey(midi) && isBlackKey(midi - 1) && isBlackKey(midi + 1);
  }

  // src/fingering/fingeringSolver.ts
  function solveFingering(notes, hand, options) {
    const context = {
      keyboard: options.keyboard,
      spans: spansFor(options.profile)
    };
    const stages = groupByOnset(notes).map((group) => ({
      timeMs: group.timeMs,
      durationMs: Math.max(...group.notes.map((note) => note.durationMs)),
      hand,
      // Lowest pitch first. The cost model relies on it throughout: that
      // is what makes "the fingers run the same way as the notes" a
      // comparison rather than a sort.
      notes: [...group.notes].sort((a, b) => a.midi - b.midi).map((note) => ({ id: note.id, midi: note.midi }))
    }));
    const locked = lockedFingers(notes, options.overrides);
    const solved = solveStages({
      stages,
      beamWidth: options.beamWidth ?? 48,
      expand: (_previous, stage, _index, relax) => candidatesFor(stage, locked, relax),
      stateCost: (state, stage) => stageCost(state, stage, context),
      transitionCost: (from, to, fromStage, toStage) => transitionCost(from, to, fromStage, toStage, context),
      stateKey: (state) => state.fingers.join(",")
    });
    const assignments = [];
    const byNoteId = /* @__PURE__ */ new Map();
    const unfingered = [];
    stages.forEach((stage, index) => {
      const state = solved.path[index];
      if (state === void 0) {
        for (const note of stage.notes) unfingered.push(note.id);
        return;
      }
      stage.notes.forEach((note, i) => {
        const finger = state.fingers[i];
        if (finger === void 0) {
          unfingered.push(note.id);
          return;
        }
        const assignment = { noteId: note.id, hand, finger };
        assignments.push(assignment);
        byNoteId.set(note.id, assignment);
      });
    });
    return {
      assignments,
      byNoteId,
      cost: solved.totalCost,
      strainedOnsets: [...solved.relaxedStages, ...solved.skippedStages].sort((a, b) => a - b).map((index) => stages[index]?.timeMs).filter((time) => time !== void 0),
      unfingered,
      incomplete: solved.incomplete
    };
  }
  function lockedFingers(notes, overrides) {
    const locked = /* @__PURE__ */ new Map();
    for (const note of notes) {
      if (note.statedFinger !== void 0) locked.set(note.id, note.statedFinger);
    }
    if (overrides !== void 0) {
      for (const [id, finger] of overrides) locked.set(id, finger);
    }
    return locked;
  }
  function candidatesFor(stage, locked, relax) {
    const count = stage.notes.length;
    if (count === 0 || count > ALL_FINGERS.length) return [];
    const perNote = stage.notes.map((note) => {
      const lock = relax === 0 ? locked.get(note.id) : void 0;
      return lock !== void 0 ? [lock] : [...ALL_FINGERS];
    });
    const out = [];
    const build = (index, chosen) => {
      if (index === count) {
        out.push({ fingers: [...chosen] });
        return;
      }
      for (const finger of perNote[index] ?? []) {
        const previous = chosen[chosen.length - 1];
        if (previous !== void 0) {
          if (stage.hand === "right" ? finger <= previous : finger >= previous) continue;
        }
        chosen.push(finger);
        build(index + 1, chosen);
        chosen.pop();
      }
    };
    build(0, []);
    if (out.length === 0 && relax >= 2) {
      return [{ fingers: stage.notes.map((_, i) => ALL_FINGERS[i % 5] ?? 1) }];
    }
    return out;
  }

  // src/fingering/handSplit.ts
  var CONFIDENCE = {
    stated: 1,
    staff: 0.95,
    voice: 0.8,
    track: 0.7,
    inferred: 0.5
  };
  function splitHands(notes, options) {
    const spans = spansFor(options.profile);
    const fallback = options.fallback ?? "right";
    const decisions = /* @__PURE__ */ new Map();
    const undecided = [];
    const staffMap = staffToHand(notes);
    const trackMap = trackToHand(notes);
    for (const note of notes) {
      const direct = statedEvidence(note, staffMap, trackMap);
      if (direct !== void 0) decisions.set(note.id, { noteId: note.id, ...direct });
      else undecided.push(note);
    }
    if (undecided.length > 0) {
      for (const decision of inferFromPosition(
        undecided,
        decisions,
        options.keyboard,
        spans,
        fallback
      )) {
        decisions.set(decision.noteId, decision);
      }
    }
    const ordered = notes.map((note) => decisions.get(note.id)).filter((d) => d !== void 0);
    return {
      decisions: ordered,
      byNoteId: decisions,
      crossings: findCrossings(notes, decisions)
    };
  }
  function statedEvidence(note, staffMap, trackMap) {
    if (note.statedHand !== void 0) {
      return { hand: note.statedHand, reason: "stated", confidence: CONFIDENCE.stated };
    }
    if (note.staff !== void 0 && staffMap !== void 0) {
      const hand = staffMap.get(note.staff);
      if (hand !== void 0) return { hand, reason: "staff", confidence: CONFIDENCE.staff };
    }
    if (note.track !== void 0 && trackMap !== void 0) {
      const hand = trackMap.get(note.track);
      if (hand !== void 0) return { hand, reason: "track", confidence: CONFIDENCE.track };
    }
    return void 0;
  }
  function staffToHand(notes) {
    const staves = /* @__PURE__ */ new Set();
    for (const note of notes) if (note.staff !== void 0) staves.add(note.staff);
    if (staves.size !== 2) return void 0;
    const sorted = [...staves].sort((a, b) => a - b);
    const upper = sorted[0];
    const lower = sorted[1];
    if (upper === void 0 || lower === void 0) return void 0;
    return /* @__PURE__ */ new Map([
      [upper, "right"],
      [lower, "left"]
    ]);
  }
  function trackToHand(notes) {
    const byTrack = /* @__PURE__ */ new Map();
    for (const note of notes) {
      if (note.track === void 0) continue;
      const list = byTrack.get(note.track) ?? [];
      list.push(note.midi);
      byTrack.set(note.track, list);
    }
    if (byTrack.size !== 2) return void 0;
    const entries = [...byTrack.entries()].map(([track, pitches]) => ({
      track,
      mean: pitches.reduce((sum, p) => sum + p, 0) / pitches.length
    }));
    entries.sort((a, b) => a.mean - b.mean);
    const low = entries[0];
    const high = entries[1];
    if (low === void 0 || high === void 0) return void 0;
    if (high.mean - low.mean < 7) return void 0;
    return /* @__PURE__ */ new Map([
      [low.track, "left"],
      [high.track, "right"]
    ]);
  }
  function inferFromPosition(notes, already, keyboard, spans, fallback) {
    const out = [];
    const groups = groupByOnset(notes);
    const last = {
      left: void 0,
      right: void 0
    };
    for (const note of notes) {
      const decided = already.get(note.id);
      if (decided === void 0) continue;
      last[decided.hand] = { midi: note.midi, timeMs: note.timeMs };
    }
    for (const group of groups) {
      const sorted = [...group.notes].sort((a, b) => a.midi - b.midi);
      let best;
      for (let cut2 = 0; cut2 <= sorted.length; cut2++) {
        const lower2 = sorted.slice(0, cut2);
        const upper2 = sorted.slice(cut2);
        const cost = handCost("left", lower2, last.left, group, keyboard, spans, fallback) + handCost("right", upper2, last.right, group, keyboard, spans, fallback);
        if (best === void 0 || cost < best.cost) best = { cut: cut2, cost };
      }
      const cut = best?.cut ?? sorted.length;
      sorted.forEach((note, index) => {
        const hand = index < cut ? "left" : "right";
        out.push({ noteId: note.id, hand, reason: "inferred", confidence: CONFIDENCE.inferred });
      });
      const lower = sorted.slice(0, cut);
      const upper = sorted.slice(cut);
      if (lower.length > 0) last.left = centreOf(lower, group.timeMs);
      if (upper.length > 0) last.right = centreOf(upper, group.timeMs);
    }
    return out;
  }
  function centreOf(notes, timeMs) {
    const sum = notes.reduce((total, note) => total + note.midi, 0);
    return { midi: sum / notes.length, timeMs };
  }
  var ENGAGE_HAND = 0.6;
  var NOT_THE_FALLBACK_HAND = 0.05;
  function handCost(hand, notes, last, group, keyboard, spans, fallback) {
    if (notes.length === 0) return 0;
    const low = notes[0];
    const high = notes[notes.length - 1];
    if (low === void 0 || high === void 0) return 0;
    let cost = ENGAGE_HAND;
    if (hand !== fallback) cost += NOT_THE_FALLBACK_HAND;
    const spanMm = Math.abs(keyDistanceMm(keyboard, low.midi, high.midi));
    const reach = spans["1-5"];
    if (reach !== void 0) {
      if (spanMm > reach.max) return Number.POSITIVE_INFINITY;
      if (spanMm > reach.comfort) {
        const range = Math.max(1e-6, reach.max - reach.comfort);
        cost += (spanMm - reach.comfort) / range * 2;
      }
    }
    if (last !== void 0) {
      const travelMm = Math.abs(
        keyDistanceMm(keyboard, Math.round(last.midi), Math.round(centreOf(notes, 0).midi))
      );
      const gapMs = Math.max(1, group.timeMs - last.timeMs);
      cost += travelMm / (4 * WHITE_KEY_WIDTH_MM);
      const speedMmPerMs = travelMm / gapMs;
      if (speedMmPerMs > 1) cost += (speedMmPerMs - 1) * 6;
    }
    return cost;
  }
  function findCrossings(notes, decisions) {
    const crossings = [];
    for (const group of groupByOnset(notes)) {
      let lowestRight = Number.POSITIVE_INFINITY;
      let highestLeft = Number.NEGATIVE_INFINITY;
      for (const note of group.notes) {
        const hand = decisions.get(note.id)?.hand;
        if (hand === "right") lowestRight = Math.min(lowestRight, note.midi);
        if (hand === "left") highestLeft = Math.max(highestLeft, note.midi);
      }
      if (highestLeft > lowestRight) crossings.push(group.timeMs);
    }
    return crossings;
  }

  // src/core/performancePlan.ts
  function solvePerformancePlan(notes, options) {
    const handSplit = splitHands(notes, options);
    const positions = keyPositionsFor(notes, options.keyboard);
    const positionById = new Map(positions.positions.map((position) => [position.id, position]));
    const notesByHand = /* @__PURE__ */ new Map([
      ["left", []],
      ["right", []]
    ]);
    for (const note of notes) {
      const decision = handSplit.byNoteId.get(note.id);
      if (decision === void 0) continue;
      notesByHand.get(decision.hand)?.push(note);
    }
    const left = solveFingering(notesByHand.get("left") ?? [], "left", options);
    const right = solveFingering(notesByHand.get("right") ?? [], "right", options);
    const assignments = new Map([
      ...left.assignments.map((assignment) => [assignment.noteId, assignment]),
      ...right.assignments.map((assignment) => [assignment.noteId, assignment])
    ]);
    const strainedTimes = /* @__PURE__ */ new Set([...left.strainedOnsets, ...right.strainedOnsets]);
    const incomplete = left.incomplete || right.incomplete || positions.outOfRange.length > 0;
    const outOfRange = new Set(positions.outOfRange.map((note) => note.id));
    const solvedNotes = notes.map((note) => {
      const handDecision = handSplit.byNoteId.get(note.id);
      const assignment = assignments.get(note.id);
      const position = positionById.get(note.id);
      const fingerSource = sourceOf(note.id, note, options.overrides);
      const diagnostics = [
        ...outOfRange.has(note.id) ? ["out-of-range"] : [],
        ...assignment === void 0 ? ["unfingered"] : [],
        ...strainedTimes.has(note.timeMs) ? ["strained-fingering"] : []
      ];
      return {
        ...note,
        hand: handDecision?.hand ?? "right",
        handReason: handDecision?.reason ?? "inferred",
        handConfidence: handDecision?.confidence ?? 0,
        fingerConfidence: assignment === void 0 ? 0 : fingerSource === "automatic" ? 0.6 : 1,
        diagnostics,
        ...assignment === void 0 ? {} : { finger: assignment.finger, fingerSource },
        ...position === void 0 ? {} : { keyPosition: position.strike }
      };
    });
    return {
      version: 1,
      notes: solvedNotes,
      handCrossingsMs: handSplit.crossings,
      incomplete
    };
  }
  function sourceOf(noteId, note, overrides) {
    if (overrides?.has(noteId)) return "override";
    if (note.statedFinger !== void 0) return "stated";
    return "automatic";
  }

  // src/core/motionPlan.ts
  function sampleHandMotion(plan, timestampMs) {
    const timestamp = Number.isFinite(timestampMs) ? timestampMs : 0;
    return {
      timestampMs: timestamp,
      hands: {
        left: sampleHand("left", plan.trajectories, timestamp),
        right: sampleHand("right", plan.trajectories, timestamp)
      },
      contacts: plan.contacts.filter((contact) => timestamp >= contact.approachStartMs && timestamp < contact.releaseEndMs).map((contact) => ({ ...contact, state: contactState(contact, timestamp) }))
    };
  }
  function sampleHand(hand, trajectories, timestampMs) {
    const segments = trajectories.filter((segment2) => segment2.hand === hand);
    if (segments.length === 0) return restState();
    const first = segments[0];
    const last = segments[segments.length - 1];
    if (first === void 0 || last === void 0) return restState();
    const segment = segments.find(
      (candidate) => timestampMs >= candidate.startMs && timestampMs < candidate.endMs
    ) ?? (timestampMs < first.startMs ? first : last);
    const duration = Math.max(1, segment.endMs - segment.startMs);
    const progress = clamp01((timestampMs - segment.startMs) / duration);
    const eased = smoothstep(progress);
    return {
      phase: segment.phase,
      anchorKey: segment.anchorKey,
      technique: segment.technique,
      wristPosition: lerpVec3(segment.wristPosition, segment.targetWristPosition, eased),
      wristRotation: lerpEuler(segment.wristRotation, segment.targetWristRotation, eased),
      progress
    };
  }
  function contactState(contact, timestampMs) {
    if (timestampMs < contact.contactMs) return "APPROACH";
    if (timestampMs < contact.holdEndMs) return "CONTACT";
    return "RELEASE";
  }
  function restState() {
    return {
      phase: "REST",
      anchorKey: null,
      technique: "NORMAL",
      wristPosition: { x: 0, y: 0, z: 0 },
      wristRotation: { x: 0, y: 0, z: 0 },
      progress: 0
    };
  }
  function lerpVec3(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t
    };
  }
  function lerpEuler(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t
    };
  }
  function smoothstep(t) {
    const u = clamp01(t);
    return u * u * (3 - 2 * u);
  }
  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  // src/kinematics/inverseKinematics.ts
  var JOINTS = ["mcp", "pip", "dip", "spread"];
  function solveFingerTarget(input) {
    const toleranceMm = input.toleranceMm ?? 1;
    const maxIterations = input.maxIterations ?? 40;
    let state = clampFingerState(input.fingers[input.finger]);
    let damping = 0.25;
    let iterations = 0;
    let tip = tipFor(input, state);
    let error = distance(tip, input.target);
    const activeJoints = input.allowSpread === false ? JOINTS.slice(0, 3) : JOINTS;
    for (; iterations < maxIterations && error > toleranceMm; iterations += 1) {
      const residual = subtract(input.target, tip);
      const jacobian = jacobianFor(input, state, activeJoints);
      const normal = gramMatrix(jacobian, damping);
      const dual = solve3(normal, [residual.x, residual.y, residual.z]);
      if (!dual) break;
      const step = jacobian.map(
        (column) => column.x * (dual[0] ?? 0) + column.y * (dual[1] ?? 0) + column.z * (dual[2] ?? 0)
      );
      const largest = Math.max(...step.map(Math.abs));
      const scale2 = largest > 0.2 ? 0.2 / largest : 1;
      const candidate = clampFingerState({
        mcp: state.mcp + (step[0] ?? 0) * scale2,
        pip: state.pip + (step[1] ?? 0) * scale2,
        dip: state.dip + (step[2] ?? 0) * scale2,
        spread: state.spread + (activeJoints.includes("spread") ? (step[3] ?? 0) * scale2 : 0)
      });
      const candidateTip = tipFor(input, candidate);
      const candidateError = distance(candidateTip, input.target);
      if (candidateError + 1e-7 < error) {
        state = candidate;
        tip = candidateTip;
        error = candidateError;
        damping = Math.max(0.025, damping * 0.7);
      } else {
        damping = Math.min(8, damping * 2);
        if (damping === 8) break;
      }
    }
    return {
      finger: input.finger,
      state,
      tip,
      errorMm: error,
      converged: error <= toleranceMm,
      iterations
    };
  }
  function solveFingerTargets(input) {
    const targetsByFinger = /* @__PURE__ */ new Map();
    for (const target of input.targets) {
      const targets = targetsByFinger.get(target.finger) ?? [];
      targets.push(target.target);
      targetsByFinger.set(target.finger, targets);
    }
    const fingers = { ...input.fingers };
    const results = [];
    for (const finger of ALL_FINGERS) {
      const targets = targetsByFinger.get(finger);
      if (!targets?.length) continue;
      const centroid = mean(targets);
      const result = solveFingerTarget({
        hand: input.hand,
        rig: input.rig,
        wrist: input.wrist,
        wristRotation: input.wristRotation,
        fingers,
        finger,
        target: centroid,
        ...input.allowSpread === void 0 ? {} : { allowSpread: input.allowSpread },
        ...input.toleranceMm === void 0 ? {} : { toleranceMm: input.toleranceMm },
        ...input.maxIterations === void 0 ? {} : { maxIterations: input.maxIterations }
      });
      fingers[finger] = result.state;
      const worstTargetError = Math.max(...targets.map((target) => distance(result.tip, target)));
      results.push({
        ...result,
        errorMm: worstTargetError,
        converged: worstTargetError <= (input.toleranceMm ?? 1)
      });
    }
    return {
      fingers,
      results,
      maxErrorMm: results.reduce((max, result) => Math.max(max, result.errorMm), 0),
      converged: results.every((result) => result.converged)
    };
  }
  function tipFor(input, state) {
    const fingers = { ...input.fingers, [input.finger]: state };
    return solveHandSkeleton({
      hand: input.hand,
      rig: input.rig,
      wrist: input.wrist,
      wristRotation: input.wristRotation,
      fingers
    }).fingers[input.finger].tip;
  }
  function jacobianFor(input, state, joints) {
    const epsilon = 1e-3;
    return joints.map((joint) => {
      const value = state[joint];
      const plus = clampFingerState({ ...state, [joint]: value + epsilon });
      const plusDelta = plus[joint] - value;
      if (Math.abs(plusDelta) > 1e-9) {
        return scale(subtract(tipFor(input, plus), tipFor(input, state)), 1 / plusDelta);
      }
      const minus = clampFingerState({ ...state, [joint]: value - epsilon });
      const minusDelta = value - minus[joint];
      if (minusDelta > 1e-9) {
        return scale(subtract(tipFor(input, state), tipFor(input, minus)), 1 / minusDelta);
      }
      return { x: 0, y: 0, z: 0 };
    });
  }
  function gramMatrix(jacobian, damping) {
    const columns = [
      jacobian.map((column) => column.x),
      jacobian.map((column) => column.y),
      jacobian.map((column) => column.z)
    ];
    return columns.map(
      (row, i) => columns.map(
        (column, j) => row.reduce(
          (sum, value, k) => sum + value * (column[k] ?? 0),
          i === j ? damping * damping : 0
        )
      )
    );
  }
  function solve3(matrix, vector) {
    const rows = matrix.map((row, i) => [...row, vector[i] ?? 0]);
    for (let column = 0; column < 3; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < 3; row += 1) {
        if (Math.abs(rows[row]?.[column] ?? 0) > Math.abs(rows[pivot]?.[column] ?? 0)) pivot = row;
      }
      const pivotValue = rows[pivot]?.[column] ?? 0;
      if (Math.abs(pivotValue) < 1e-12) return null;
      [rows[column], rows[pivot]] = [rows[pivot] ?? [], rows[column] ?? []];
      const pivotRow = rows[column];
      if (!pivotRow) return null;
      for (let j = column; j < 4; j += 1) pivotRow[j] = (pivotRow[j] ?? 0) / pivotValue;
      for (let row = 0; row < 3; row += 1) {
        if (row === column) continue;
        const factor = rows[row]?.[column] ?? 0;
        for (let j = column; j < 4; j += 1) {
          const target = rows[row];
          if (target) target[j] = (target[j] ?? 0) - factor * (pivotRow[j] ?? 0);
        }
      }
    }
    return rows.map((row) => row[3] ?? 0);
  }
  function mean(points) {
    const sum = points.reduce((value, point) => add2(value, point), { x: 0, y: 0, z: 0 });
    return scale(sum, 1 / points.length);
  }
  function add2(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }
  function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }
  function scale(point, amount) {
    return { x: point.x * amount, y: point.y * amount, z: point.z * amount };
  }
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  // src/index.ts
  var ENGINE_VERSION = "0.1.0";
  return __toCommonJS(index_exports);
})();
