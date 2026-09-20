"use strict";
var StickingEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target2, all) => {
    for (var name in all)
      __defProp(target2, name, { get: all[name], enumerable: true });
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
    COMFORTABLE_TRAVEL_FRACTION: () => COMFORTABLE_TRAVEL_FRACTION,
    DEFAULT_BEAM_WIDTH: () => DEFAULT_BEAM_WIDTH,
    DEFAULT_WINDOW: () => DEFAULT_WINDOW,
    DrummerStateMachine: () => DrummerStateMachine,
    Engine: () => Engine,
    FOOT_MAX_SPEED_MPS: () => FOOT_MAX_SPEED_MPS,
    FOOT_MAX_STROKE_RATE_HZ: () => FOOT_MAX_STROKE_RATE_HZ,
    GM_DRUM_MAP: () => GM_DRUM_MAP,
    GRAMMAR_PRIOR_PER_NOTE: () => GRAMMAR_PRIOR_PER_NOTE,
    HANDS: () => HANDS,
    HAND_COMFORT_REACH_M: () => HAND_COMFORT_REACH_M,
    HAND_MAX_SPEED_MPS: () => HAND_MAX_SPEED_MPS,
    HAND_MAX_STROKE_RATE_HZ: () => HAND_MAX_STROKE_RATE_HZ,
    IDIOM_PRESETS: () => IDIOM_PRESETS,
    LIMBS: () => LIMBS,
    MANUAL_LIMBS: () => MANUAL_LIMBS,
    MAX_MICROTIMING_MS: () => MAX_MICROTIMING_MS,
    MAX_VELOCITY_JITTER: () => MAX_VELOCITY_JITTER,
    MIN_GRAMMAR_RUN: () => MIN_GRAMMAR_RUN,
    MIN_SAME_LIMB_INTERVAL_S: () => MIN_SAME_LIMB_INTERVAL_S,
    MOTIF_REUSE_BONUS: () => MOTIF_REUSE_BONUS,
    OSTINATO_LEAD_BONUS: () => OSTINATO_LEAD_BONUS,
    OSTINATO_OFF_HAND_BONUS: () => OSTINATO_OFF_HAND_BONUS,
    PREPARATION_PENALTY: () => PREPARATION_PENALTY,
    PerformanceMemory: () => PerformanceMemory,
    PerformanceRuntime: () => PerformanceRuntime,
    ProfileCalibrator: () => ProfileCalibrator,
    PythonRandom: () => PythonRandom,
    RUDIMENT_LIBRARY: () => RUDIMENT_LIBRARY,
    SAFETY_MARGIN_S: () => SAFETY_MARGIN_S,
    SEARCH_PRESETS: () => SEARCH_PRESETS,
    SIMULTANEITY_EPSILON_S: () => SIMULTANEITY_EPSILON_S,
    STREAM_SWITCH_PENALTY: () => STREAM_SWITCH_PENALTY,
    SUBDIVISION_GRID: () => SUBDIVISION_GRID,
    VOICE_INCONSISTENCY_PENALTY: () => VOICE_INCONSISTENCY_PENALTY,
    analyzeDensity: () => analyzeDensity,
    analyzeTiming: () => analyzeTiming,
    appendRecoveryKeyframe: () => appendRecoveryKeyframe,
    applyRigEnvelope: () => applyRigEnvelope,
    assembleTimeline: () => assembleTimeline,
    assignFeet: () => assignFeet,
    buildEffectiveStyle: () => buildEffectiveStyle,
    buildMotionPlan: () => buildMotionPlan,
    checkAudioAnimationSync: () => checkAudioAnimationSync,
    checkReachability: () => checkReachability,
    classifyPatterns: () => classifyPatterns,
    computeBodyState: () => computeBodyState,
    computeImpact: () => computeImpact,
    distance2d: () => distance2d,
    drumMappingProfile: () => drumMappingProfile,
    drummerState: () => drummerState,
    drummerStyle: () => drummerStyle,
    engineConfig: () => engineConfig,
    fatigueAdjustedStyle: () => fatigueAdjustedStyle,
    fatigueState: () => fatigueState,
    findOstinatoRuns: () => findOstinatoRuns,
    fingerprint: () => fingerprint,
    fromNoteList: () => fromNoteList,
    generateHandCandidates: () => generateHandCandidates,
    generatePatternCandidates: () => generatePatternCandidates,
    humanizeTiming: () => humanizeTiming,
    humanizeVelocity: () => humanizeVelocity,
    inOstinato: () => inOstinato,
    isFootLimb: () => isFootLimb,
    isTwoHandedStream: () => isTwoHandedStream,
    learnedProfile: () => learnedProfile,
    loadFor: () => loadFor,
    makeIdiomContext: () => makeIdiomContext,
    mapEvents: () => mapEvents,
    neutralPosition: () => neutralPosition,
    neutralRole: () => neutralRole,
    newId: () => newId,
    otherHand: () => otherHand,
    performanceIntent: () => performanceIntent,
    performanceTable: () => performanceTable,
    pickAmongNearTies: () => pickAmongNearTies,
    planRecovery: () => planRecovery,
    priorWeight: () => priorWeight,
    repairSuperhumanRate: () => repairSuperhumanRate,
    resetIdCounter: () => resetIdCounter,
    resolveInstrument: () => resolveInstrument,
    roleContexts: () => roleContexts,
    selectTechnique: () => selectTechnique,
    sequenceScore: () => sequenceScore,
    sha256Hex: () => sha256Hex,
    snapshotState: () => snapshotState,
    solveSticking: () => solveSticking,
    solveWindow: () => solveWindow,
    target: () => target,
    targetFor: () => targetFor,
    tilePattern: () => tilePattern,
    toPlainObject: () => toPlainObject,
    updateFatigue: () => updateFatigue,
    validateAndRepair: () => validateAndRepair,
    validatePerformance: () => validatePerformance,
    validationErrors: () => validationErrors
  });

  // src/core/mt19937.ts
  var N = 624;
  var M = 397;
  var MATRIX_A = 2567483615;
  var UPPER_MASK = 2147483648;
  var LOWER_MASK = 2147483647;
  var PythonRandom = class {
    /**
     * `random.Random(seed)` for a non-negative integer seed.
     *
     * Takes a bigint because the engine's own seeds are the top 64 bits of
     * a SHA-256 digest, which is far past `Number.MAX_SAFE_INTEGER` -- a
     * number would silently lose the low bits and every draw would differ.
     */
    constructor(seed) {
      this.mt = new Uint32Array(N);
      this.index = N + 1;
      let n = seed < 0n ? -seed : seed;
      const bits = bitLength(n);
      const keyUsed = bits === 0 ? 1 : Math.floor((bits - 1) / 32) + 1;
      const key = new Uint32Array(keyUsed);
      for (let i = 0; i < keyUsed; i++) {
        key[i] = Number(n & 0xffffffffn) >>> 0;
        n >>= 32n;
      }
      this.initByArray(key);
    }
    initGenrand(s) {
      this.mt[0] = s >>> 0;
      for (let i = 1; i < N; i++) {
        const prev = this.mt[i - 1];
        this.mt[i] = Math.imul(1812433253, prev ^ prev >>> 30) + i >>> 0;
      }
      this.index = N;
    }
    initByArray(key) {
      this.initGenrand(19650218);
      let i = 1;
      let j = 0;
      let k = Math.max(N, key.length);
      for (; k > 0; k--) {
        const prev = this.mt[i - 1];
        this.mt[i] = ((this.mt[i] ^ Math.imul(prev ^ prev >>> 30, 1664525)) >>> 0) + key[j] + j >>> 0;
        i++;
        j++;
        if (i >= N) {
          this.mt[0] = this.mt[N - 1];
          i = 1;
        }
        if (j >= key.length) j = 0;
      }
      for (k = N - 1; k > 0; k--) {
        const prev = this.mt[i - 1];
        this.mt[i] = ((this.mt[i] ^ Math.imul(prev ^ prev >>> 30, 1566083941)) >>> 0) - i >>> 0;
        i++;
        if (i >= N) {
          this.mt[0] = this.mt[N - 1];
          i = 1;
        }
      }
      this.mt[0] = UPPER_MASK;
    }
    /** `genrand_uint32` — the twist, then the tempering. */
    genrandUint32() {
      if (this.index >= N) {
        for (let kk = 0; kk < N - M; kk++) {
          const y3 = (this.mt[kk] & UPPER_MASK | this.mt[kk + 1] & LOWER_MASK) >>> 0;
          this.mt[kk] = (this.mt[kk + M] ^ y3 >>> 1 ^ (y3 & 1 ? MATRIX_A : 0)) >>> 0;
        }
        for (let kk = N - M; kk < N - 1; kk++) {
          const y3 = (this.mt[kk] & UPPER_MASK | this.mt[kk + 1] & LOWER_MASK) >>> 0;
          this.mt[kk] = (this.mt[kk + (M - N)] ^ y3 >>> 1 ^ (y3 & 1 ? MATRIX_A : 0)) >>> 0;
        }
        const y2 = (this.mt[N - 1] & UPPER_MASK | this.mt[0] & LOWER_MASK) >>> 0;
        this.mt[N - 1] = (this.mt[M - 1] ^ y2 >>> 1 ^ (y2 & 1 ? MATRIX_A : 0)) >>> 0;
        this.index = 0;
      }
      let y = this.mt[this.index++];
      y ^= y >>> 11;
      y = (y ^ y << 7 & 2636928640) >>> 0;
      y = (y ^ y << 15 & 4022730752) >>> 0;
      y ^= y >>> 18;
      return y >>> 0;
    }
    /**
     * `random.random()`: 53 bits of randomness assembled from two 32-bit
     * draws, exactly as CPython does it -- `(a * 67108864.0 + b) / 2**53`
     * where a is 27 bits and b is 26.
     */
    random() {
      const a = this.genrandUint32() >>> 5;
      const b = this.genrandUint32() >>> 6;
      return (a * 67108864 + b) * (1 / 9007199254740992);
    }
    /** `random.uniform(a, b)` — CPython's literal `a + (b - a) * random()`. */
    uniform(a, b) {
      return a + (b - a) * this.random();
    }
    /** `random.getrandbits(k)` for k <= 32, which is all this engine asks for. */
    getRandBits(k) {
      if (k <= 0) return 0;
      if (k > 32) throw new Error("getRandBits is implemented for k <= 32 only");
      return this.genrandUint32() >>> 32 - k;
    }
    /** `random._randbelow`: rejection sampling on `getrandbits(bit_length(n))`. */
    randBelow(n) {
      if (n <= 0) return 0;
      const k = 32 - Math.clz32(n);
      let r = this.getRandBits(k);
      while (r >= n) r = this.getRandBits(k);
      return r;
    }
    /** `random.choice(seq)`. */
    choice(seq) {
      return seq[this.randBelow(seq.length)];
    }
  };
  function bitLength(n) {
    if (n === 0n) return 0;
    return n.toString(2).length;
  }

  // src/core/sha256.ts
  function utf8Bytes(text) {
    const out = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      if (code >= 55296 && code <= 56319 && i + 1 < text.length) {
        const low = text.charCodeAt(i + 1);
        if (low >= 56320 && low <= 57343) {
          code = 65536 + (code - 55296 << 10) + (low - 56320);
          i++;
        }
      }
      if (code < 128) {
        out.push(code);
      } else if (code < 2048) {
        out.push(192 | code >> 6, 128 | code & 63);
      } else if (code < 65536) {
        out.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
      } else {
        out.push(
          240 | code >> 18,
          128 | code >> 12 & 63,
          128 | code >> 6 & 63,
          128 | code & 63
        );
      }
    }
    return new Uint8Array(out);
  }
  var K = new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function rotr(x, n) {
    return (x >>> n | x << 32 - n) >>> 0;
  }
  function sha256Hex(message) {
    const bytes = utf8Bytes(message);
    const bitLength2 = bytes.length * 8;
    const paddedLength = (bytes.length + 8 >> 6) + 1 << 6;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 128;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength2 / 4294967296), false);
    view.setUint32(paddedLength - 4, bitLength2 >>> 0, false);
    const h = new Uint32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    const w = new Uint32Array(64);
    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const s0 = (rotr(w15, 7) ^ rotr(w15, 18) ^ w15 >>> 3) >>> 0;
        const s1 = (rotr(w2, 17) ^ rotr(w2, 19) ^ w2 >>> 10) >>> 0;
        w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = [
        h[0],
        h[1],
        h[2],
        h[3],
        h[4],
        h[5],
        h[6],
        h[7]
      ];
      for (let i = 0; i < 64; i++) {
        const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        const ch = (e & f ^ ~e & g) >>> 0;
        const temp1 = hh + S1 + ch + K[i] + w[i] >>> 0;
        const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        const maj = (a & b ^ a & c ^ b & c) >>> 0;
        const temp2 = S0 + maj >>> 0;
        hh = g;
        g = f;
        f = e;
        e = d + temp1 >>> 0;
        d = c;
        c = b;
        b = a;
        a = temp1 + temp2 >>> 0;
      }
      h[0] = h[0] + a >>> 0;
      h[1] = h[1] + b >>> 0;
      h[2] = h[2] + c >>> 0;
      h[3] = h[3] + d >>> 0;
      h[4] = h[4] + e >>> 0;
      h[5] = h[5] + f >>> 0;
      h[6] = h[6] + g >>> 0;
      h[7] = h[7] + hh >>> 0;
    }
    let out = "";
    for (const value of h) out += value.toString(16).padStart(8, "0");
    return out;
  }

  // src/core/ids.ts
  var counter = 1;
  function newId(prefix) {
    return `${prefix}_${String(counter++).padStart(8, "0")}`;
  }
  function resetIdCounter() {
    counter = 1;
  }

  // src/core/geometry.ts
  var SPLIT = 134217729;
  function twoProduct(a, b) {
    const p = a * b;
    const ca = SPLIT * a;
    const ah = ca - (ca - a);
    const al = a - ah;
    const cb = SPLIT * b;
    const bh = cb - (cb - b);
    const bl = b - bh;
    const err = ah * bh - p + ah * bl + al * bh + al * bl;
    return [p, err];
  }
  function fastTwoSum(a, b) {
    const x = a + b;
    return [x, b - (x - a)];
  }
  var frexpBuffer = new DataView(new ArrayBuffer(8));
  function frexpExponent(value) {
    frexpBuffer.setFloat64(0, value, false);
    const bits = frexpBuffer.getUint32(0, false);
    const rawExponent = bits >>> 20 & 2047;
    if (rawExponent !== 0) return rawExponent - 1022;
    frexpBuffer.setFloat64(0, value * 4503599627370496, false);
    const hi = frexpBuffer.getUint32(0, false);
    return (hi >>> 20 & 2047) - 1022 - 52;
  }
  function ldexp1(exponent) {
    return Math.pow(2, exponent);
  }
  var DBL_MIN = 22250738585072014e-324;
  function vectorNorm(a, b) {
    const max = a > b ? a : b;
    if (max === 0) return max;
    if (!Number.isFinite(max)) return max;
    const maxExponent = frexpExponent(max);
    if (maxExponent < -1023) {
      return DBL_MIN * vectorNorm(a / DBL_MIN, b / DBL_MIN);
    }
    const scale = ldexp1(-maxExponent);
    let csum = 1;
    let frac1 = 0;
    let frac2 = 0;
    for (const component of [a, b]) {
      const x2 = component * scale;
      const [prHi2, prLo2] = twoProduct(x2, x2);
      const [smHi2, smLo2] = fastTwoSum(csum, prHi2);
      csum = smHi2;
      frac1 += prLo2;
      frac2 += smLo2;
    }
    let h = Math.sqrt(csum - 1 + (frac1 + frac2));
    const [prHi, prLo] = twoProduct(-h, h);
    const [smHi, smLo] = fastTwoSum(csum, prHi);
    csum = smHi;
    frac1 += prLo;
    frac2 += smLo;
    const x = csum - 1 + (frac1 + frac2);
    h += x / (2 * h);
    return h / scale;
  }
  function distance2d(x1, y1, x2, y2) {
    return vectorNorm(Math.abs(x1 - x2), Math.abs(y1 - y2));
  }

  // src/datamodel.ts
  var HANDS = ["R", "L"];
  function otherHand(hand) {
    return hand === "R" ? "L" : "R";
  }
  var LIMBS = ["RH", "LH", "RF", "LF"];
  function target(instrument, x, y, options = {}) {
    return {
      instrument,
      x,
      y,
      height: options.height ?? 0,
      radius: options.radius ?? 0.12,
      ...options.preferredLimb !== void 0 ? { preferredLimb: options.preferredLimb } : {},
      isFootTarget: options.isFootTarget ?? false
    };
  }
  function neutralRole(eventId) {
    return {
      eventId,
      role: "unknown",
      roleConfidence: 0,
      ostinatoId: "",
      ostinatoIndex: -1,
      ostinatoRateHz: 0,
      ostinatoActive: false
    };
  }
  function inOstinato(role) {
    return role.ostinatoId !== "";
  }
  function performanceIntent(overrides = {}) {
    return {
      energy: 0.5,
      intensity: 0.5,
      grooveCommitment: 0.7,
      fillFreedom: 0.5,
      ...overrides
    };
  }
  function drummerStyle(overrides = {}) {
    return {
      name: "default",
      dominantHand: "R",
      dominanceBias: 0.15,
      crossingAversion: 0.6,
      alternationPreference: 0.5,
      maxSingleHandRateHz: 14,
      ghostNoteVelocityThreshold: 50,
      accentVelocityThreshold: 100,
      variationAmount: 0.15,
      ...overrides
    };
  }
  function fatigueState() {
    const limbLoad = {};
    for (const limb of LIMBS) limbLoad[limb] = 0;
    return { limbLoad, timeSeconds: 0 };
  }
  function loadFor(fatigue, limb) {
    return fatigue.limbLoad[limb] ?? 0;
  }
  function learnedProfile() {
    return {
      observedDominanceBias: 0.15,
      observedCrossingAversion: 0.6,
      sampleCount: 0,
      confidence: 0
    };
  }
  function validationErrors(result) {
    return result.issues.filter((i) => i.severity === "error");
  }
  function drummerState(overrides = {}) {
    const limbs = {};
    for (const limb of LIMBS) {
      limbs[limb] = { limb, position: [0, 0, 0], lastActionTimeS: -999, readyTimeS: 0 };
    }
    return {
      timeSeconds: 0,
      limbs,
      fatigue: fatigueState(),
      memory: { recentLimbSequence: [], recentStrokeTypes: [], recentEventIds: [] },
      style: overrides.style ?? drummerStyle(),
      intent: overrides.intent ?? performanceIntent(),
      ostinatoLeadHand: /* @__PURE__ */ new Map(),
      motifStickings: /* @__PURE__ */ new Map()
    };
  }
  function snapshotState(state) {
    const limbs = {};
    for (const limb of LIMBS) {
      const ls = state.limbs[limb];
      limbs[limb] = {
        limb: ls.limb,
        position: ls.position,
        ...ls.lastEventId !== void 0 ? { lastEventId: ls.lastEventId } : {},
        lastActionTimeS: ls.lastActionTimeS,
        readyTimeS: ls.readyTimeS
      };
    }
    const limbLoad = {};
    for (const limb of LIMBS) limbLoad[limb] = state.fatigue.limbLoad[limb];
    return {
      timeSeconds: state.timeSeconds,
      limbs,
      fatigue: { limbLoad, timeSeconds: state.fatigue.timeSeconds },
      memory: {
        recentLimbSequence: [...state.memory.recentLimbSequence],
        recentStrokeTypes: [...state.memory.recentStrokeTypes],
        recentEventIds: [...state.memory.recentEventIds]
      },
      style: state.style,
      intent: state.intent,
      ostinatoLeadHand: new Map(state.ostinatoLeadHand),
      motifStickings: new Map(state.motifStickings)
    };
  }

  // src/rule01-input.ts
  function fromNoteList(notes) {
    const events = notes.map((n) => ({
      sourceId: newId("src"),
      timeSeconds: Number(n.time),
      // Nominal, and not used downstream -- the Python says the same.
      timeTicks: Math.trunc(n.time * 480 * 2),
      channel: Math.trunc(n.channel ?? 9),
      note: Math.trunc(n.note),
      velocity: Math.trunc(n.velocity ?? 100),
      trackName: n.trackName ?? ""
    }));
    for (const event of events) {
      if (!(event.velocity >= 0 && event.velocity <= 127)) {
        throw new Error(`velocity out of MIDI range: ${event.velocity}`);
      }
    }
    events.sort((a, b) => a.timeSeconds - b.timeSeconds);
    return {
      events,
      tempoMap: [{ timeSeconds: 0, timeTicks: 0, bpm: 120 }],
      timeSignatureMap: [{ timeSeconds: 0, timeTicks: 0, numerator: 4, denominator: 4 }],
      ticksPerBeat: 960,
      malformedEventCount: 0
    };
  }

  // src/rule02-mapping.ts
  var GM_DRUM_MAP = {
    35: "kick",
    36: "kick",
    37: "snare_cross_stick",
    38: "snare",
    39: "snare_cross_stick",
    // hand clap approximated as a cross-stick surface
    40: "snare_rim",
    41: "floor_tom",
    42: "hihat_closed",
    43: "floor_tom",
    44: "hihat_pedal",
    45: "tom_low",
    46: "hihat_open",
    47: "tom_low",
    48: "tom_mid",
    49: "crash_1",
    50: "tom_high",
    51: "ride",
    52: "crash_2",
    53: "ride_bell",
    55: "crash_1",
    57: "crash_2",
    59: "ride"
  };
  function drumMappingProfile(overrides = {}) {
    return {
      noteMap: overrides.noteMap ?? { ...GM_DRUM_MAP },
      targets: overrides.targets ?? {
        kick: target("kick", 0, 0.35, { isFootTarget: true, preferredLimb: "RF", radius: 0.2 }),
        hihat_pedal: target("hihat_pedal", -0.55, 0.3, {
          isFootTarget: true,
          preferredLimb: "LF",
          radius: 0.15
        }),
        snare: target("snare", -0.05, 0.3, { radius: 0.17 }),
        snare_rim: target("snare_rim", -0.05, 0.3, { radius: 0.17 }),
        snare_cross_stick: target("snare_cross_stick", -0.05, 0.3, { radius: 0.17 }),
        hihat_closed: target("hihat_closed", -0.45, 0.32, { radius: 0.18 }),
        hihat_open: target("hihat_open", -0.45, 0.32, { radius: 0.18 }),
        hihat_bell: target("hihat_bell", -0.45, 0.28, { radius: 0.1 }),
        tom_high: target("tom_high", 0.1, 0.45, { height: 0.05, radius: 0.16 }),
        tom_mid: target("tom_mid", 0.35, 0.48, { height: 0.05, radius: 0.16 }),
        tom_low: target("tom_low", 0.55, 0.45, { height: 0, radius: 0.17 }),
        floor_tom: target("floor_tom", 0.62, 0.2, { height: -0.1, radius: 0.19 }),
        ride: target("ride", 0.7, 0.4, { height: 0.15, radius: 0.2 }),
        ride_bell: target("ride_bell", 0.7, 0.4, { height: 0.15, radius: 0.08 }),
        crash_1: target("crash_1", -0.35, 0.55, { height: 0.2, radius: 0.2 }),
        crash_2: target("crash_2", 0.45, 0.6, { height: 0.2, radius: 0.2 })
      }
    };
  }
  function resolveInstrument(profile, note) {
    return profile.noteMap[note] ?? "unknown";
  }
  function targetFor(profile, instrument) {
    const found = profile.targets[instrument];
    if (found !== void 0) return found;
    return target("unknown", -0.05, 0.3, { radius: 0.17 });
  }
  function mapEvents(sourceEvents, profile) {
    return sourceEvents.map((se) => {
      const instrument = resolveInstrument(profile, se.note);
      const playable = instrument !== "unknown";
      return {
        eventId: newId("evt"),
        sourceId: se.sourceId,
        timeSeconds: se.timeSeconds,
        instrument,
        target: targetFor(profile, instrument),
        velocity: se.velocity,
        isPlayable: playable,
        mappingNotes: playable ? "" : `unmapped note ${se.note}`
      };
    });
  }

  // src/rule03-04-timing-density.ts
  var SUBDIVISION_GRID = 16;
  function bisectRight(values, x) {
    let lo = 0;
    let hi = values.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (x < values[mid]) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
  function bpmAt(t, tempoMap) {
    const idx = Math.max(
      0,
      bisectRight(
        tempoMap.map((tp) => tp.timeSeconds),
        t
      ) - 1
    );
    return tempoMap[idx].bpm;
  }
  function timeSignatureAt(t, tsMap) {
    const idx = Math.max(
      0,
      bisectRight(
        tsMap.map((ts) => ts.timeSeconds),
        t
      ) - 1
    );
    return tsMap[idx];
  }
  function analyzeTiming(events, tempoMap, tsMap) {
    const out = [];
    for (const ev of events) {
      const bpm = bpmAt(ev.timeSeconds, tempoMap);
      const ts = timeSignatureAt(ev.timeSeconds, tsMap);
      const secondsPerBeat = 60 / bpm;
      let beatsElapsed = 0;
      let lastT = 0;
      let lastBpm = tempoMap[0].bpm;
      for (const tp of tempoMap) {
        if (tp.timeSeconds >= ev.timeSeconds) break;
        beatsElapsed += (tp.timeSeconds - lastT) / (60 / lastBpm);
        lastT = tp.timeSeconds;
        lastBpm = tp.bpm;
      }
      beatsElapsed += (ev.timeSeconds - lastT) / (60 / lastBpm);
      const beatsPerMeasure = ts.numerator * (4 / ts.denominator);
      const measure = Math.floor(beatsElapsed / beatsPerMeasure);
      const beatInMeasure = pythonMod(beatsElapsed, beatsPerMeasure);
      const beat = Math.floor(beatInMeasure);
      const frac = beatInMeasure - beat;
      const subdivisionIndex = pythonRound(frac * SUBDIVISION_GRID);
      let strength;
      if (beat === 0 && subdivisionIndex === 0) strength = 1;
      else if (subdivisionIndex === 0) strength = 0.7;
      else if (subdivisionIndex % (SUBDIVISION_GRID / 4) === 0) strength = 0.4;
      else strength = 0.15;
      out.push({
        eventId: ev.eventId,
        measure,
        beat,
        subdivisionIndex,
        subdivisionGrid: SUBDIVISION_GRID,
        beatStrength: strength,
        isSyncopated: strength <= 0.4 && subdivisionIndex !== 0,
        secondsPerBeat
      });
    }
    return out;
  }
  function analyzeDensity(events, windowS = 0.5, burstGapS = 0.09) {
    const times = events.map((ev) => ev.timeSeconds);
    const out = [];
    const n = events.length;
    for (let i = 0; i < n; i++) {
      const ev = events[i];
      const t = ev.timeSeconds;
      const lo = bisectRight(times, t - windowS / 2);
      const hi = bisectRight(times, t + windowS / 2);
      const localCount = hi - lo;
      const localRate = windowS > 0 ? localCount / windowS : 0;
      const gapBefore = i > 0 ? t - times[i - 1] : Infinity;
      const gapAfter = i < n - 1 ? times[i + 1] - t : Infinity;
      let simultaneous = 0;
      for (const t2 of times) if (Math.abs(t2 - t) < 1e-4) simultaneous++;
      const inBurst = gapBefore < burstGapS || gapAfter < burstGapS;
      const comfortableHz = 8;
      const pressure = Math.min(4, localRate / comfortableHz);
      out.push({
        eventId: ev.eventId,
        localEventsPerSecond: localRate,
        gapBeforeSeconds: gapBefore === Infinity ? 0 : gapBefore,
        gapAfterSeconds: gapAfter === Infinity ? 0 : gapAfter,
        simultaneousCount: simultaneous,
        inBurst,
        tempoAdjustedPressure: pressure
      });
    }
    return out;
  }
  function pythonMod(a, b) {
    return a - Math.floor(a / b) * b;
  }
  function pythonRound(x) {
    const floor = Math.floor(x);
    const diff = x - floor;
    if (diff > 0.5) return floor + 1;
    if (diff < 0.5) return floor;
    return floor % 2 === 0 ? floor : floor + 1;
  }

  // src/rule05-pattern.ts
  var MELODIC_TOMS = /* @__PURE__ */ new Set([
    "tom_high",
    "tom_mid",
    "tom_low",
    "floor_tom"
  ]);
  var GROOVE_KEEPERS = /* @__PURE__ */ new Set([
    "hihat_closed",
    "hihat_open",
    "ride",
    "ride_bell"
  ]);
  var OSTINATO_SURFACES = {
    hihat_closed: "hihat",
    hihat_open: "hihat",
    ride: "ride",
    ride_bell: "ride"
  };
  var MIN_OSTINATO_EVENTS = 4;
  var OSTINATO_GAP_TOLERANCE = 0.15;
  var OSTINATO_MAX_GAP_MULTIPLE = 4;
  function findOstinatoRuns(events) {
    const bySurface = /* @__PURE__ */ new Map();
    for (const ev of events) {
      const surface = OSTINATO_SURFACES[ev.instrument];
      if (surface === void 0) continue;
      const bucket = bySurface.get(surface);
      if (bucket === void 0) bySurface.set(surface, [ev]);
      else bucket.push(ev);
    }
    const runs = [];
    for (const surface of [...bySurface.keys()].sort()) {
      const stream = [...bySurface.get(surface)].sort(
        (a, b) => a.timeSeconds !== b.timeSeconds ? a.timeSeconds - b.timeSeconds : a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0
      );
      let current = [];
      let baseGap = 0;
      for (const ev of stream) {
        if (current.length === 0) {
          current = [ev];
          baseGap = 0;
          continue;
        }
        const gap = ev.timeSeconds - current[current.length - 1].timeSeconds;
        if (gap <= 0) {
          current.push(ev);
          continue;
        }
        if (baseGap <= 0) {
          current.push(ev);
          baseGap = gap;
          continue;
        }
        const multiple = gap / baseGap;
        const nearest = pyRound(multiple);
        const fits = nearest >= 1 && nearest <= OSTINATO_MAX_GAP_MULTIPLE && Math.abs(multiple - nearest) <= OSTINATO_GAP_TOLERANCE * nearest;
        if (fits) {
          current.push(ev);
          if (gap < baseGap) baseGap = gap;
        } else {
          if (current.length >= MIN_OSTINATO_EVENTS) runs.push(current);
          current = [ev];
          baseGap = 0;
        }
      }
      if (current.length >= MIN_OSTINATO_EVENTS) runs.push(current);
    }
    runs.sort((a, b) => {
      const ea = a[0];
      const eb = b[0];
      if (ea.timeSeconds !== eb.timeSeconds) return ea.timeSeconds - eb.timeSeconds;
      return ea.eventId < eb.eventId ? -1 : ea.eventId > eb.eventId ? 1 : 0;
    });
    return runs;
  }
  function pyRound(value) {
    const floor = Math.floor(value);
    const diff = value - floor;
    if (diff > 0.5) return floor + 1;
    if (diff < 0.5) return floor;
    return floor % 2 === 0 ? floor : floor + 1;
  }
  function baseGapOf(run) {
    let smallest = 0;
    for (let i = 1; i < run.length; i++) {
      const gap = run[i].timeSeconds - run[i - 1].timeSeconds;
      if (gap > 0 && (smallest === 0 || gap < smallest)) smallest = gap;
    }
    return smallest;
  }
  function classifyPatterns(events, timing, _density, measureGroupSize = 1) {
    const timByeId = new Map(timing.map((t) => [t.eventId, t]));
    const measures = /* @__PURE__ */ new Map();
    for (const ev of events) {
      const t = timByeId.get(ev.eventId);
      if (t === void 0) continue;
      const m = Math.floor(t.measure / measureGroupSize);
      const bucket = measures.get(m);
      if (bucket === void 0) measures.set(m, [ev]);
      else bucket.push(ev);
    }
    let total = 0;
    for (const evs of measures.values()) total += evs.length;
    const avgCount = measures.size > 0 ? total / measures.size : 0;
    const ostinatoOf = /* @__PURE__ */ new Map();
    const ostinatoSpans = [];
    for (const run of findOstinatoRuns(events)) {
      const runId = newId("ost");
      const gap = baseGapOf(run);
      const rate = gap > 0 ? 1 / gap : 0;
      run.forEach((ev, index) => ostinatoOf.set(ev.eventId, { id: runId, index, rate }));
      ostinatoSpans.push({
        start: run[0].timeSeconds,
        end: run[run.length - 1].timeSeconds,
        gap
      });
    }
    const ostinatoRunningAt = (t) => ostinatoSpans.some(
      (span) => span.start - span.gap - 1e-9 <= t && t <= span.end + span.gap + 1e-9
    );
    const out = [];
    const sectionId = newId("section");
    for (const evs of measures.values()) {
      const phraseId = newId("phrase");
      const tomHits = evs.filter((e) => MELODIC_TOMS.has(e.instrument)).length;
      const grooveHits = evs.filter((e) => GROOVE_KEEPERS.has(e.instrument)).length;
      const count = evs.length;
      let role;
      let conf;
      if (count === 0) {
        role = "break";
        conf = 0.9;
      } else if (avgCount > 0 && count < 0.35 * avgCount) {
        role = "break";
        conf = 0.6;
      } else if (tomHits >= Math.max(2, Math.trunc(0.4 * count)) && grooveHits < 0.2 * count) {
        role = "fill";
        conf = 0.65;
      } else if (grooveHits >= 0.4 * count) {
        role = "groove";
        conf = 0.7;
      } else {
        role = "unknown";
        conf = 0.4;
      }
      for (const ev of evs) {
        const found = ostinatoOf.get(ev.eventId);
        if (found !== void 0) {
          out.push({
            eventId: ev.eventId,
            phraseId,
            sectionId,
            role: "ostinato",
            roleConfidence: conf,
            ostinatoId: found.id,
            ostinatoIndex: found.index,
            ostinatoRateHz: found.rate,
            ostinatoActive: true
          });
        } else {
          out.push({
            eventId: ev.eventId,
            phraseId,
            sectionId,
            role,
            roleConfidence: conf,
            ostinatoId: "",
            ostinatoIndex: -1,
            ostinatoRateHz: 0,
            ostinatoActive: ostinatoRunningAt(ev.timeSeconds)
          });
        }
      }
    }
    return out;
  }
  function roleContexts(patterns) {
    const out = /* @__PURE__ */ new Map();
    for (const p of patterns) {
      out.set(p.eventId, {
        eventId: p.eventId,
        role: p.role,
        roleConfidence: p.roleConfidence,
        ostinatoId: p.ostinatoId,
        ostinatoIndex: p.ostinatoIndex,
        ostinatoRateHz: p.ostinatoRateHz,
        ostinatoActive: p.ostinatoActive
      });
    }
    return out;
  }

  // src/rule06-reachability.ts
  var HAND_MAX_SPEED_MPS = 4.2;
  var FOOT_MAX_SPEED_MPS = 2;
  var SAFETY_MARGIN_S = 0.012;
  var HAND_MAX_STROKE_RATE_HZ = 14;
  var FOOT_MAX_STROKE_RATE_HZ = 10;
  var HAND_COMFORT_REACH_M = 0.4;
  var HAND_NEUTRAL_X = { RH: 0.3, LH: -0.3 };
  var HAND_NEUTRAL_Y = 0.3;
  var FOOT_NEUTRAL_X = { RF: 0, LF: -0.55 };
  function isFootLimb(limb) {
    return limb === "RF" || limb === "LF";
  }
  function distance(p1, x, y) {
    return distance2d(p1[0], p1[1], x, y);
  }
  function crossesBody(limb, toX) {
    if (limb === "RH") return toX < -HAND_COMFORT_REACH_M;
    if (limb === "LH") return toX > HAND_COMFORT_REACH_M;
    return false;
  }
  function checkReachability(limb, limbState, targetPoint, availableTimeS, eventId, maxStrokeRateHz = 0) {
    const isFoot = isFootLimb(limb);
    if (isFoot && !targetPoint.isFootTarget) {
      return {
        limb,
        eventId,
        reachable: false,
        distanceM: 0,
        requiredTravelTimeS: 0,
        availableTimeS,
        safetyMarginS: 0,
        crossesBody: false,
        reason: "foot cannot play a hand-only surface"
      };
    }
    if (!isFoot && targetPoint.isFootTarget) {
      return {
        limb,
        eventId,
        reachable: false,
        distanceM: 0,
        requiredTravelTimeS: 0,
        availableTimeS,
        safetyMarginS: 0,
        crossesBody: false,
        reason: "hand cannot play a foot-only surface"
      };
    }
    const fromPos = limbState.position;
    const distanceM = distance(fromPos, targetPoint.x, targetPoint.y);
    const maxSpeed = isFoot ? FOOT_MAX_SPEED_MPS : HAND_MAX_SPEED_MPS;
    const travelTime = maxSpeed > 0 ? distanceM / maxSpeed : Infinity;
    const crosses = !isFoot && crossesBody(limb, targetPoint.x);
    let reachable = availableTimeS - travelTime >= SAFETY_MARGIN_S || availableTimeS <= 0;
    const margin = availableTimeS - travelTime;
    let reason = reachable ? "" : `insufficient time: needs ${(travelTime * 1e3).toFixed(1)}ms, has ${(availableTimeS * 1e3).toFixed(1)}ms`;
    const defaultRate = isFoot ? FOOT_MAX_STROKE_RATE_HZ : HAND_MAX_STROKE_RATE_HZ;
    const rateCeiling = maxStrokeRateHz > 0 ? maxStrokeRateHz : defaultRate;
    if (reachable && rateCeiling > 0 && availableTimeS > 0) {
      const minInterval = 1 / rateCeiling;
      if (availableTimeS < minInterval) {
        reachable = false;
        reason = `stroke rate: ${(1 / availableTimeS).toFixed(1)}Hz exceeds this limb's ${rateCeiling.toFixed(1)}Hz ceiling`;
      }
    }
    return {
      limb,
      eventId,
      reachable,
      distanceM,
      requiredTravelTimeS: travelTime,
      availableTimeS,
      safetyMarginS: margin,
      crossesBody: crosses,
      reason
    };
  }
  function neutralPosition(limb) {
    if (limb === "RH" || limb === "LH") {
      return [HAND_NEUTRAL_X[limb], HAND_NEUTRAL_Y, 0.15];
    }
    return [FOOT_NEUTRAL_X[limb], 0, 0];
  }

  // src/rule07-hand-candidates.ts
  var MANUAL_LIMBS = ["RH", "LH"];
  var OSTINATO_LEAD_BONUS = 1.2;
  var OSTINATO_OFF_HAND_BONUS = 0.6;
  function isTwoHandedStream(role, style) {
    return inOstinato(role) && style.maxSingleHandRateHz > 0 && role.ostinatoRateHz > style.maxSingleHandRateHz;
  }
  function leadHandFor(role, state, dominantLimb) {
    return state.ostinatoLeadHand.get(role.ostinatoId) ?? dominantLimb;
  }
  function generateHandCandidates(event, state, availableTimeByLimb, roleContext) {
    const style = state.style;
    const candidates = [];
    const role = roleContext ?? neutralRole(event.eventId);
    const dominantLimb = style.dominantHand === "R" ? "RH" : "LH";
    const twoHandedOstinato = isTwoHandedStream(role, style);
    const holdsStream = inOstinato(role) && !twoHandedOstinato;
    const underStream = role.ostinatoActive && !inOstinato(role);
    const leadLimb = role.ostinatoActive ? leadHandFor(role, state, dominantLimb) : void 0;
    const alternationApplies = !holdsStream && !underStream;
    for (const limb of MANUAL_LIMBS) {
      const limbState = state.limbs[limb];
      const avail = availableTimeByLimb[limb] ?? 999;
      const reach = checkReachability(
        limb,
        limbState,
        event.target,
        avail,
        event.eventId,
        style.maxSingleHandRateHz
      );
      if (!reach.reachable) {
        candidates.push({
          eventId: event.eventId,
          limb,
          score: -Infinity,
          reachable: false,
          crossesBody: reach.crossesBody,
          sourceRule: "rule07",
          tags: ["unreachable"]
        });
        continue;
      }
      let score = 0;
      const tags = [];
      if (limb === dominantLimb) {
        score += style.dominanceBias;
        tags.push("dominant");
      }
      if (holdsStream) {
        if (limb === leadLimb) {
          score += OSTINATO_LEAD_BONUS;
          tags.push("ostinato_lead");
        } else {
          tags.push("ostinato_off_lead");
        }
      } else if (underStream) {
        if (limb !== leadLimb) {
          score += OSTINATO_OFF_HAND_BONUS;
          tags.push("under_ostinato");
        }
      } else if (twoHandedOstinato) {
        tags.push("ostinato_two_handed");
      }
      const recent = state.memory.recentLimbSequence;
      const lastLimb = recent.length > 0 ? recent[recent.length - 1] : void 0;
      if (lastLimb !== void 0 && alternationApplies) {
        if (limb !== lastLimb) {
          score += 0.25 * style.alternationPreference;
        } else {
          score -= 0.25 * style.alternationPreference;
          tags.push("repeat_hand");
        }
      }
      if (reach.crossesBody) {
        score -= style.crossingAversion * 0.4;
        tags.push("crossing");
      }
      score -= 0.05 * reach.distanceM;
      score += Math.min(0.15, reach.safetyMarginS * 0.5);
      candidates.push({
        eventId: event.eventId,
        limb,
        score,
        reachable: true,
        crossesBody: reach.crossesBody,
        sourceRule: "rule07",
        tags
      });
    }
    return candidates;
  }

  // src/rule34-grammar.ts
  var R = "RH";
  var L = "LH";
  var RUDIMENT_LIBRARY = {
    singles_RL: [R, L],
    singles_LR: [L, R],
    doubles_RRLL: [R, R, L, L],
    paradiddle_RLRR_LRLL: [R, L, R, R, L, R, L, L],
    double_paradiddle: [R, L, R, L, R, R, L, R, L, R, L, L],
    triple_paradiddle: [R, L, R, L, R, L, R, R, L, R, L, R, L, R, L, L],
    paradiddlediddle: [R, L, R, R, L, L],
    inverted_paradiddle: [R, R, L, R, L, L, R, L],
    triplets_RLL_LRR: [R, L, L, L, R, R]
  };
  function priorWeight(template) {
    return template.length > 0 ? 2 / template.length : 0;
  }
  function tilePattern(template, length) {
    if (length <= 0) return [];
    const out = [];
    for (let i = 0; i < length; i++) out.push(template[i % template.length]);
    return out;
  }
  function generatePatternCandidates(eventIds, styleHint = "generic", startingLimb) {
    const n = eventIds.length;
    if (n === 0) return [];
    const candidates = [];
    for (const [name, template] of Object.entries(RUDIMENT_LIBRARY)) {
      let seq = tilePattern(template, n);
      if (startingLimb !== void 0 && seq[0] !== startingLimb) {
        const rotated = tilePattern([...template.slice(1), template[0]], n);
        if (rotated[0] === startingLimb) seq = rotated;
      }
      candidates.push({
        patternName: name,
        limbSequence: seq,
        eventIds: [...eventIds],
        grammarTags: [styleHint],
        priorWeight: priorWeight(template)
      });
    }
    return candidates;
  }

  // src/rule08-11-29-39-solver.ts
  var SIMULTANEITY_EPSILON_S = 4e-3;
  var DEFAULT_WINDOW = 12;
  var DEFAULT_BEAM_WIDTH = 6;
  var STREAM_SWITCH_PENALTY = 0.9;
  var VOICE_INCONSISTENCY_PENALTY = 0.45;
  var MOTIF_REUSE_BONUS = 0.35;
  var PREPARATION_PENALTY = 2;
  var COMFORTABLE_TRAVEL_FRACTION = 0.33;
  var MIN_GRAMMAR_RUN = 4;
  var GRAMMAR_PRIOR_PER_NOTE = 0.08;
  function groupSimultaneous(events) {
    const groups = [];
    for (const ev of events) {
      const last = groups[groups.length - 1];
      if (last !== void 0 && Math.abs(ev.timeSeconds - last[0].timeSeconds) < SIMULTANEITY_EPSILON_S) {
        last.push(ev);
      } else {
        groups.push([ev]);
      }
    }
    return groups;
  }
  function roleFor(roles, event) {
    return roles?.get(event.eventId) ?? neutralRole(event.eventId);
  }
  function motifKey(group, roles) {
    return [...group].sort((a, b) => a.instrument < b.instrument ? -1 : a.instrument > b.instrument ? 1 : 0).map((ev) => `${ev.instrument}${inOstinato(roleFor(roles, ev)) ? "*" : ""}`).join("+");
  }
  function motifValue(group, assignment) {
    const limbOf = /* @__PURE__ */ new Map();
    for (const [ev, limb] of assignment) limbOf.set(ev.eventId, limb);
    return [...group].sort((a, b) => a.instrument < b.instrument ? -1 : a.instrument > b.instrument ? 1 : 0).filter((ev) => limbOf.has(ev.eventId)).map((ev) => limbOf.get(ev.eventId)).join(" ");
  }
  function applyDecision(state, event, limb, role) {
    const ls = state.limbs[limb];
    ls.position = [event.target.x, event.target.y, event.target.height];
    ls.lastEventId = event.eventId;
    ls.lastActionTimeS = event.timeSeconds;
    ls.readyTimeS = event.timeSeconds;
    state.memory.recentLimbSequence.push(limb);
    state.memory.recentEventIds.push(event.eventId);
    if (state.memory.recentLimbSequence.length > 64) {
      state.memory.recentLimbSequence.shift();
      state.memory.recentEventIds.shift();
    }
    if (role !== void 0 && inOstinato(role) && (limb === "RH" || limb === "LH") && !state.ostinatoLeadHand.has(role.ostinatoId)) {
      state.ostinatoLeadHand.set(role.ostinatoId, limb);
    }
  }
  function availableTime(state, limb, eventTime) {
    const lastT = state.limbs[limb].lastActionTimeS;
    if (lastT < -900) return 999;
    return Math.max(0, eventTime - lastT);
  }
  function assignFeetIn(group, state) {
    const out = [];
    for (const ev of group) {
      if (!ev.target.isFootTarget) continue;
      const limb = ev.target.preferredLimb;
      const avail = availableTime(state, limb, ev.timeSeconds);
      const reach = checkReachability(limb, state.limbs[limb], ev.target, avail, ev.eventId);
      out.push([ev, limb, reach.reachable ? 0 : -5]);
    }
    return out;
  }
  function solveGroupCandidates(wholeGroup, state, roles) {
    const footPart = assignFeetIn(wholeGroup, state);
    let footScore = 0;
    for (const [, , sc] of footPart) footScore += sc;
    const group = wholeGroup.filter((ev) => !ev.target.isFootTarget);
    const finish = (options) => {
      if (footPart.length === 0) return options;
      return options.map(
        ([assignment2, score]) => [[...assignment2, ...footPart], score + footScore]
      );
    };
    if (group.length === 0) return finish([[[], 0]]);
    if (group.length === 1) {
      const ev = group[0];
      const avail = {};
      for (const l of MANUAL_LIMBS) avail[l] = availableTime(state, l, ev.timeSeconds);
      const cands = generateHandCandidates(ev, state, avail, roleFor(roles, ev));
      const options = [];
      for (const c of cands) {
        if (c.reachable) options.push([[[ev, c.limb, c.score]], c.score]);
      }
      if (options.length === 0) {
        let best = cands[0];
        for (const c of cands) if (c.score > best.score) best = c;
        return finish([[[[ev, best.limb, best.score]], best.score]]);
      }
      return finish(options);
    }
    if (group.length === 2) {
      const options = [];
      for (const perm of [
        ["RH", "LH"],
        ["LH", "RH"]
      ]) {
        const assignment2 = [];
        let total2 = 0;
        let ok = true;
        for (let i = 0; i < group.length; i++) {
          const ev = group[i];
          const limb = perm[i];
          const avail = availableTime(state, limb, ev.timeSeconds);
          const cands = generateHandCandidates(ev, state, { [limb]: avail }, roleFor(roles, ev));
          const cand = cands.find((c) => c.limb === limb);
          if (cand === void 0 || !cand.reachable) {
            ok = false;
            break;
          }
          assignment2.push([ev, limb, cand.score]);
          total2 += cand.score;
        }
        if (ok) options.push([assignment2, total2]);
      }
      if (options.length === 0) {
        return finish([
          [
            [
              [group[0], "RH", -5],
              [group[1], "LH", -5]
            ],
            -10
          ]
        ]);
      }
      return finish(options);
    }
    const assignment = [];
    let total = 0;
    group.forEach((ev, i) => {
      assignment.push([ev, MANUAL_LIMBS[i % 2], -2]);
      total -= 2;
    });
    return finish([[assignment, total]]);
  }
  function isFreeSingle(group, roles) {
    const manual = group.filter((ev) => !ev.target.isFootTarget);
    if (manual.length !== 1) return false;
    return !roleFor(roles, manual[0]).ostinatoActive;
  }
  function fillRunLength(groups, start, roles) {
    let n = 0;
    while (start + n < groups.length && isFreeSingle(groups[start + n], roles)) {
      n++;
    }
    return n;
  }
  function scoreLimbFor(event, limb, state, roles) {
    const avail = availableTime(state, limb, event.timeSeconds);
    const cands = generateHandCandidates(event, state, { [limb]: avail }, roleFor(roles, event));
    const cand = cands.find((c) => c.limb === limb);
    if (cand === void 0 || !cand.reachable) return void 0;
    return cand.score;
  }
  function grammarOptions(run, state, roles) {
    const manual = [];
    for (const group of run) {
      for (const ev of group) if (!ev.target.isFootTarget) manual.push(ev);
    }
    const eventIds = manual.map((ev) => ev.eventId);
    const options = [];
    const walk = (limbFor) => {
      const st = snapshotState(state);
      const assignment = [];
      let total = 0;
      let index = 0;
      for (const group of run) {
        for (const [ev, limb, sc] of assignFeetIn(group, st)) {
          assignment.push([ev, limb, sc]);
          total += sc;
          applyDecision(st, ev, limb, roleFor(roles, ev));
        }
        for (const ev of group) {
          if (ev.target.isFootTarget) continue;
          const limb = limbFor(index, ev, st);
          if (limb === void 0) return void 0;
          const score = scoreLimbFor(ev, limb, st, roles);
          if (score === void 0) return void 0;
          assignment.push([ev, limb, score]);
          total += score;
          applyDecision(st, ev, limb, roleFor(roles, ev));
          index++;
        }
      }
      return [assignment, total];
    };
    for (const pattern of generatePatternCandidates(eventIds)) {
      const walked = walk((i) => pattern.limbSequence[i]);
      if (walked === void 0) continue;
      const [assignment, total] = walked;
      options.push([
        assignment,
        total + GRAMMAR_PRIOR_PER_NOTE * eventIds.length * pattern.priorWeight
      ]);
    }
    const bestFree = (_i, ev, st) => {
      const avail = {};
      for (const l of MANUAL_LIMBS) avail[l] = availableTime(st, l, ev.timeSeconds);
      const cands = generateHandCandidates(ev, st, avail, roleFor(roles, ev)).filter(
        (c) => c.reachable
      );
      if (cands.length === 0) return void 0;
      let best = cands[0];
      for (const c of cands) {
        if (c.score > best.score || c.score === best.score && c.limb < best.limb) best = c;
      }
      return best.limb;
    };
    const free = walk(bestFree);
    if (free !== void 0) options.push(free);
    return options;
  }
  function sequenceScore(decisions, eventsById, roles, baseState) {
    if (decisions.length === 0) return 0;
    const ordered = [...decisions].sort((a, b) => {
      const ea = eventsById.get(a.eventId);
      const eb = eventsById.get(b.eventId);
      if (ea.timeSeconds !== eb.timeSeconds) return ea.timeSeconds - eb.timeSeconds;
      return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
    });
    let score = 0;
    const lastLimbOnStream = new Map(baseState.ostinatoLeadHand);
    for (const d of ordered) {
      const role = roleFor(roles, eventsById.get(d.eventId));
      if (!inOstinato(role) || d.limb !== "RH" && d.limb !== "LH") continue;
      if (isTwoHandedStream(role, baseState.style)) {
        continue;
      }
      const previous = lastLimbOnStream.get(role.ostinatoId);
      if (previous !== void 0 && previous !== d.limb) score -= STREAM_SWITCH_PENALTY;
      lastLimbOnStream.set(role.ostinatoId, d.limb);
    }
    const lastOnLimb = /* @__PURE__ */ new Map();
    for (const limb of LIMBS) {
      const ls = baseState.limbs[limb];
      if (ls.lastActionTimeS > -900) {
        lastOnLimb.set(limb, { t: ls.lastActionTimeS, x: ls.position[0], y: ls.position[1] });
      }
    }
    for (const d of ordered) {
      const ev = eventsById.get(d.eventId);
      const previous = lastOnLimb.get(d.limb);
      if (previous !== void 0) {
        const gap = ev.timeSeconds - previous.t;
        if (gap > 0) {
          const dx = ev.target.x - previous.x;
          const dy = ev.target.y - previous.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = ev.target.isFootTarget ? FOOT_MAX_SPEED_MPS : HAND_MAX_SPEED_MPS;
          const strain = speed > 0 ? dist / speed / gap : 0;
          if (strain > COMFORTABLE_TRAVEL_FRACTION) {
            score -= PREPARATION_PENALTY * (strain - COMFORTABLE_TRAVEL_FRACTION);
          }
        }
      }
      lastOnLimb.set(d.limb, { t: ev.timeSeconds, x: ev.target.x, y: ev.target.y });
    }
    const handByVoice = /* @__PURE__ */ new Map();
    for (const d of ordered) {
      const ev = eventsById.get(d.eventId);
      const role = roleFor(roles, ev);
      if (inOstinato(role) || !role.ostinatoActive) continue;
      if (d.limb !== "RH" && d.limb !== "LH") continue;
      const previous = handByVoice.get(ev.instrument);
      if (previous !== void 0 && previous !== d.limb) score -= VOICE_INCONSISTENCY_PENALTY;
      handByVoice.set(ev.instrument, d.limb);
    }
    return score;
  }
  function solveWindow(groups, baseState, beamWidth = DEFAULT_BEAM_WIDTH, roles) {
    const eventsById = /* @__PURE__ */ new Map();
    for (const group of groups) for (const ev of group) eventsById.set(ev.eventId, ev);
    let beam = [
      { state: snapshotState(baseState), decisions: [], score: 0 }
    ];
    let index = 0;
    while (index < groups.length) {
      const runLength = fillRunLength(groups, index, roles);
      const useGrammar = runLength >= MIN_GRAMMAR_RUN;
      let segment;
      let key;
      if (useGrammar) {
        segment = groups.slice(index, index + runLength);
        key = "run:" + segment.map((g) => motifKey(g, roles)).join("|");
        index += runLength;
      } else {
        segment = [groups[index]];
        key = motifKey(groups[index], roles);
        index += 1;
      }
      const segmentEvents = [];
      for (const g of segment) segmentEvents.push(...g);
      const newBeam = [];
      for (const branch of beam) {
        let options = useGrammar ? grammarOptions(segment, branch.state, roles) : solveGroupCandidates(segment[0], branch.state, roles);
        if (options.length === 0) {
          options = solveGroupCandidates(segment[0], branch.state, roles);
        }
        for (const [assignment, groupScore] of options) {
          const st2 = snapshotState(branch.state);
          const newDecisions = [...branch.decisions];
          for (const [ev, limb, noteScore] of assignment) {
            applyDecision(st2, ev, limb, roleFor(roles, ev));
            newDecisions.push({
              eventId: ev.eventId,
              limb,
              sequenceCost: -noteScore,
              alternativesConsidered: options.length,
              lookaheadWindow: groups.length
            });
          }
          let motifBonus = 0;
          const remembered = st2.motifStickings.get(key);
          const value = motifValue(segmentEvents, assignment);
          if (remembered !== void 0 && remembered.join(" ") === value) {
            motifBonus = MOTIF_REUSE_BONUS;
          }
          if (!st2.motifStickings.has(key)) {
            st2.motifStickings.set(
              key,
              assignment.map(([, limb]) => limb)
            );
          }
          newBeam.push({
            state: st2,
            decisions: newDecisions,
            score: branch.score + groupScore + motifBonus
          });
        }
      }
      const ranked = newBeam.map((b) => ({
        branch: b,
        total: b.score + sequenceScore(b.decisions, eventsById, roles, baseState)
      }));
      ranked.sort((a, b) => -a.total - -b.total);
      beam = ranked.slice(0, beamWidth).map((r) => r.branch);
    }
    const best = beam[0];
    return { decisions: best.decisions, state: best.state };
  }
  function solveSticking(events, state, windowSize = DEFAULT_WINDOW, beamWidth = DEFAULT_BEAM_WIDTH, roles) {
    if (events.length === 0) return [];
    const ordered = [...events].sort((a, b) => {
      if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
      return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
    });
    const groups = groupSimultaneous(ordered);
    const allDecisions = [];
    for (let i = 0; i < groups.length; i += windowSize) {
      const window = groups.slice(i, i + windowSize);
      const { decisions, state: resolved } = solveWindow(window, state, beamWidth, roles);
      for (const limb of LIMBS) state.limbs[limb] = resolved.limbs[limb];
      state.memory = resolved.memory;
      state.ostinatoLeadHand = resolved.ostinatoLeadHand;
      state.motifStickings = resolved.motifStickings;
      allDecisions.push(...decisions);
    }
    return allDecisions;
  }
  function assignFeet(footEvents, state) {
    const decisions = [];
    for (const ev of footEvents) {
      const limb = ev.target.preferredLimb;
      const avail = availableTime(state, limb, ev.timeSeconds);
      const reach = checkReachability(limb, state.limbs[limb], ev.target, avail, ev.eventId);
      applyDecision(state, ev, limb);
      decisions.push({
        eventId: ev.eventId,
        limb,
        sequenceCost: reach.reachable ? 0 : 5,
        alternativesConsidered: 1,
        lookaheadWindow: 1
      });
    }
    return decisions;
  }

  // src/rule09-technique.ts
  var RIM_CAPABLE = /* @__PURE__ */ new Set(["snare"]);
  var CHOKE_CAPABLE = /* @__PURE__ */ new Set([
    "crash_1",
    "crash_2",
    "hihat_open"
  ]);
  function selectTechnique(event, limb, style, sameLimbPrevTime) {
    const velocity = event.velocity;
    const dynamicLevel = velocity / 127;
    let stroke;
    if (event.instrument === "snare_cross_stick") {
      stroke = "cross_stick";
    } else if (CHOKE_CAPABLE.has(event.instrument) && velocity >= style.accentVelocityThreshold) {
      stroke = "choke";
    } else if (RIM_CAPABLE.has(event.instrument) && velocity >= style.accentVelocityThreshold) {
      stroke = "rim_shot";
    } else if (event.instrument === "hihat_bell" || event.instrument === "ride_bell") {
      stroke = "bell";
    } else if (event.instrument === "hihat_open") {
      stroke = "open";
    } else if (velocity <= style.ghostNoteVelocityThreshold) {
      stroke = "ghost";
    } else if (velocity >= style.accentVelocityThreshold) {
      stroke = "accent";
    } else {
      stroke = "single";
    }
    if (sameLimbPrevTime !== void 0) {
      const dt = event.timeSeconds - sameLimbPrevTime;
      if (dt < 1 / style.maxSingleHandRateHz && stroke === "single") {
        stroke = "double";
      }
    }
    return { eventId: event.eventId, limb, strokeType: stroke, dynamicLevel };
  }

  // src/rule10-recovery.ts
  var RECOVERY_TIME_BY_STROKE = {
    ghost: 0.02,
    single: 0.035,
    double: 0.018,
    // already mid-bounce
    accent: 0.055,
    rim_shot: 0.06,
    cross_stick: 0.045,
    flam: 0.045,
    drag: 0.04,
    choke: 0.07,
    bell: 0.045,
    open: 0.05,
    closed: 0.035
  };
  function planRecovery(eventTime, limb, technique, nextEventId) {
    const base = RECOVERY_TIME_BY_STROKE[technique.strokeType] ?? 0.035;
    const recoveryTime = base * (0.8 + 0.4 * technique.dynamicLevel);
    const reboundHeight = 0.02 + 0.1 * technique.dynamicLevel;
    return {
      eventId: technique.eventId,
      limb,
      reboundHeightM: reboundHeight,
      readyTimeS: eventTime + recoveryTime,
      ...nextEventId !== void 0 ? { preparedForEventId: nextEventId } : {}
    };
  }

  // src/rule12-humanization.ts
  function deterministicRng(seed, eventId) {
    const digest = sha256Hex(`${seed}:${eventId}`);
    return new PythonRandom(BigInt("0x" + digest.slice(0, 16)));
  }
  var MAX_MICROTIMING_MS = 8;
  var MAX_VELOCITY_JITTER = 6;
  function humanizeTiming(eventId, scheduledTimeS, style, seed, instrumentBiasMs = 0) {
    const rng = deterministicRng(seed, eventId + ":time");
    const boundMs = MAX_MICROTIMING_MS * style.variationAmount;
    const offsetMs = rng.uniform(-boundMs, boundMs) + instrumentBiasMs;
    return {
      eventId,
      scheduledTimeS,
      performedTimeS: scheduledTimeS + offsetMs / 1e3,
      microtimingOffsetMs: offsetMs,
      instrumentBiasMs
    };
  }
  function humanizeVelocity(eventId, baseVelocity, style, seed) {
    const rng = deterministicRng(seed, eventId + ":vel");
    const bound = MAX_VELOCITY_JITTER * style.variationAmount;
    const jitter = rng.uniform(-bound, bound);
    return Math.max(1, Math.min(127, pythonRound2(baseVelocity + jitter)));
  }
  function pickAmongNearTies(candidates, seed, keyEventId, epsilon = 0.02) {
    if (candidates.length === 0) return void 0;
    const bestScore = candidates[0][1];
    const tied = candidates.filter((c) => bestScore - c[1] <= epsilon);
    if (tied.length === 1) return tied[0][0];
    const rng = deterministicRng(seed, keyEventId + ":tie");
    return rng.choice(tied)[0];
  }
  function pythonRound2(x) {
    const floor = Math.floor(x);
    const diff = x - floor;
    if (diff > 0.5) return floor + 1;
    if (diff < 0.5) return floor;
    return floor % 2 === 0 ? floor : floor + 1;
  }

  // src/rule13-19-24-motion.ts
  var PREP_LIFT_M = 0.08;
  function buildMotionPlan(eventId, limb, technique, prevPosition, targetPosition, humanTiming, limbReadyTimeS) {
    const isFoot = isFootLimb(limb);
    const maxSpeed = isFoot ? FOOT_MAX_SPEED_MPS : HAND_MAX_SPEED_MPS;
    const distance2 = distance2d(
      prevPosition[0],
      prevPosition[1],
      targetPosition[0],
      targetPosition[1]
    );
    const travelTime = maxSpeed > 0 ? distance2 / maxSpeed : 0;
    const impactTime = humanTiming.performedTimeS;
    let motionStart = impactTime - travelTime;
    let feasible = true;
    let rejection = "";
    if (motionStart < limbReadyTimeS - 1e-6) {
      motionStart = limbReadyTimeS;
      feasible = false;
      rejection = "motion_start clamped to limb_ready_time_s after humanization";
    }
    const lift = PREP_LIFT_M * (0.5 + technique.dynamicLevel);
    const prepZ = isFoot ? prevPosition[2] : prevPosition[2] + lift;
    const keyframes = [
      { timeSeconds: motionStart, limb, position: prevPosition, phase: "prep" },
      {
        timeSeconds: motionStart + travelTime * 0.35,
        limb,
        position: [prevPosition[0], prevPosition[1], prepZ],
        phase: "travel"
      },
      { timeSeconds: impactTime, limb, position: targetPosition, phase: "impact" }
    ];
    return {
      eventId,
      limb,
      keyframes,
      peakVelocityMps: maxSpeed,
      feasible,
      rejectionReason: rejection
    };
  }
  function applyRigEnvelope(plan) {
    return plan;
  }
  function computeImpact(plan, instrument, technique) {
    const impactKf = plan.keyframes.find((k) => k.phase === "impact");
    return {
      eventId: plan.eventId,
      limb: plan.limb,
      timeSeconds: impactKf.timeSeconds,
      instrument,
      impactVelocityMps: plan.peakVelocityMps,
      reboundHeightM: 0.02 + 0.1 * technique.dynamicLevel
    };
  }
  function appendRecoveryKeyframe(plan, recovery) {
    const impactKf = plan.keyframes.find((k) => k.phase === "impact");
    plan.keyframes.push({
      timeSeconds: recovery.readyTimeS,
      limb: plan.limb,
      position: [
        impactKf.position[0],
        impactKf.position[1],
        impactKf.position[2] + recovery.reboundHeightM
      ],
      phase: "rebound"
    });
    return plan;
  }
  function computeBodyState(timeS, activeLimbPositions) {
    const positions = Object.values(activeLimbPositions).filter((p) => p !== void 0);
    if (positions.length === 0) {
      return { timeSeconds: timeS, torsoRotationDeg: 0, comOffsetM: [0, 0] };
    }
    const meanX = positions.reduce((s, p) => s + p[0], 0) / positions.length;
    const meanY = positions.reduce((s, p) => s + p[1], 0) / positions.length;
    return {
      timeSeconds: timeS,
      torsoRotationDeg: Math.max(-18, Math.min(18, meanX * 22)),
      comOffsetM: [meanX * 0.05, (meanY - 0.3) * 0.03]
    };
  }
  function assembleTimeline(motionPlans, techniqueByEvent) {
    const events = motionPlans.map((plan) => {
      const tech = techniqueByEvent.get(plan.eventId);
      return {
        eventId: plan.eventId,
        limb: plan.limb,
        startTimeS: plan.keyframes[0].timeSeconds,
        endTimeS: plan.keyframes[plan.keyframes.length - 1].timeSeconds,
        keyframes: plan.keyframes,
        strokeType: tech ? tech.strokeType : "single"
      };
    });
    const durationS = events.length > 0 ? Math.max(...events.map((e) => e.endTimeS)) : 0;
    return { events, durationS };
  }
  function checkAudioAnimationSync(timeline) {
    return { maxDriftMs: 0, resynced: true, lastCheckTimeS: timeline.durationS };
  }

  // src/rule20-31-33-memory.ts
  function fingerprint(sequence) {
    return sequence.join(" ");
  }
  var PerformanceMemory = class {
    constructor(ngramSizes = [2, 3, 4, 6, 8]) {
      this.fullHistory = [];
      this.eventIdHistory = [];
      this.fingerprints = /* @__PURE__ */ new Map();
      this.ngramSizes = [...ngramSizes];
    }
    /**
     * Only committed decisions may be recorded -- Rule 39 guarantees the
     * caller has nothing else to give, because speculative beam branches
     * are discarded before this is ever called.
     */
    recordCommitted(decisions) {
      for (const d of decisions) {
        this.fullHistory.push(d.limb);
        this.eventIdHistory.push(d.eventId);
      }
      this.updateFingerprints();
    }
    /**
     * RULE 31/33: count repeated n-grams across the committed history --
     * the raw evidence Rule 32 later turns into calibrated profile
     * parameters.
     */
    updateFingerprints() {
      for (const n of this.ngramSizes) {
        if (this.fullHistory.length < n) continue;
        const key = fingerprint(this.fullHistory.slice(-n));
        const existing = this.fingerprints.get(key);
        if (existing === void 0) {
          this.fingerprints.set(key, { fingerprint: key, length: n, occurrences: 1 });
        } else {
          existing.occurrences += 1;
        }
      }
    }
    /**
     * RULE 33: the reusable vocabulary discovered so far, ranked by
     * evidence. Confidence is bounded and is never a hard rule elsewhere.
     */
    topMotifs(minOccurrences = 2, limit = 10) {
      const candidates = [...this.fingerprints.values()].filter(
        (fp) => fp.occurrences >= minOccurrences
      );
      candidates.sort((a, b) => b.occurrences - a.occurrences || b.length - a.length);
      return candidates.slice(0, limit).map((fp) => ({
        fingerprint: fp.fingerprint,
        limbSequence: fp.fingerprint.split(" "),
        confidence: Math.min(0.95, fp.occurrences / (fp.occurrences + 3))
      }));
    }
    recent(n) {
      return this.fullHistory.slice(-n);
    }
  };

  // src/rule21-23-32-35-profile.ts
  var STROKE_LOAD = {
    ghost: 0.3,
    single: 1,
    double: 0.8,
    accent: 1.6,
    rim_shot: 1.7,
    cross_stick: 1.1,
    flam: 1.4,
    drag: 1.2,
    choke: 1.8,
    bell: 1.2,
    open: 1.3,
    closed: 1
  };
  var FATIGUE_DECAY_PER_SECOND = 0.15;
  var FATIGUE_CAP = 10;
  function updateFatigue(fatigue, limb, technique, eventTime) {
    const idle = Math.max(0, eventTime - fatigue.timeSeconds);
    const decay = idle * FATIGUE_DECAY_PER_SECOND;
    for (const l of Object.keys(fatigue.limbLoad)) {
      fatigue.limbLoad[l] = Math.max(0, fatigue.limbLoad[l] - decay);
    }
    const load = (STROKE_LOAD[technique.strokeType] ?? 1) * (0.6 + 0.8 * technique.dynamicLevel);
    fatigue.limbLoad[limb] = Math.min(FATIGUE_CAP, fatigue.limbLoad[limb] + load);
    fatigue.timeSeconds = eventTime;
    return fatigue;
  }
  function fatigueAdjustedStyle(style, fatigue) {
    const handLoad = (loadFor(fatigue, "RH") + loadFor(fatigue, "LH")) / 2;
    const fatigueFrac = Math.min(1, handLoad / FATIGUE_CAP);
    return {
      ...style,
      dominanceBias: style.dominanceBias + 0.1 * fatigueFrac,
      maxSingleHandRateHz: style.maxSingleHandRateHz * (1 - 0.15 * fatigueFrac)
    };
  }
  var ProfileCalibrator = class {
    constructor(emaAlpha = 0.05) {
      this.emaAlpha = emaAlpha;
      this.learned = {
        observedDominanceBias: 0.15,
        observedCrossingAversion: 0.6,
        sampleCount: 0,
        confidence: 0
      };
    }
    observe(chosenDominant, crossed) {
      const a = this.emaAlpha;
      const targetDom = chosenDominant ? 1 : 0;
      const targetCross = crossed ? 1 : 0;
      this.learned.observedDominanceBias = (1 - a) * this.learned.observedDominanceBias + a * (0.3 * targetDom);
      this.learned.observedCrossingAversion = (1 - a) * this.learned.observedCrossingAversion + a * (1 - targetCross);
      this.learned.sampleCount += 1;
      this.learned.confidence = Math.min(
        0.95,
        this.learned.sampleCount / (this.learned.sampleCount + 50)
      );
    }
  };
  var WEIGHTABLE = /* @__PURE__ */ new Set([
    "dominanceBias",
    "crossingAversion",
    "alternationPreference",
    "maxSingleHandRateHz",
    "ghostNoteVelocityThreshold",
    "accentVelocityThreshold",
    "variationAmount"
  ]);
  function buildEffectiveStyle(base, learned, intent, fatigue, idiom) {
    const eff = { ...base };
    const c = learned.confidence;
    eff.dominanceBias = (1 - c) * eff.dominanceBias + c * learned.observedDominanceBias;
    eff.crossingAversion = (1 - c) * eff.crossingAversion + c * learned.observedCrossingAversion;
    for (const [fieldName, multiplier] of Object.entries(idiom.weighting)) {
      if (!WEIGHTABLE.has(fieldName)) continue;
      const key = fieldName;
      const current = eff[key];
      if (typeof current !== "number") continue;
      const boundedMult = Math.max(0.5, Math.min(1.5, multiplier));
      eff[key] = current * boundedMult;
    }
    eff.crossingAversion *= 1 - 0.2 * intent.intensity;
    eff.variationAmount = Math.min(1, eff.variationAmount + 0.3 * intent.fillFreedom);
    eff.alternationPreference = Math.min(
      1,
      eff.alternationPreference + 0.15 * intent.grooveCommitment
    );
    return fatigueAdjustedStyle(eff, fatigue);
  }
  var IDIOM_PRESETS = {
    rock: { alternationPreference: 1.1, crossingAversion: 1 },
    metal: { alternationPreference: 1.3, crossingAversion: 0.9, dominanceBias: 0.9 },
    jazz: { alternationPreference: 0.85, crossingAversion: 0.8, variationAmount: 1.3 },
    funk: { alternationPreference: 1, crossingAversion: 0.85, variationAmount: 1.2 },
    latin: { alternationPreference: 0.9, crossingAversion: 0.75 },
    generic: {}
  };
  function makeIdiomContext(genre) {
    return { genre, weighting: { ...IDIOM_PRESETS[genre.toLowerCase()] ?? {} } };
  }

  // src/rule25-validation.ts
  var MIN_SAME_LIMB_INTERVAL_S = 1 / 22;
  function validatePerformance(events) {
    const issues = [];
    const byLimb = /* @__PURE__ */ new Map();
    for (const ev of [...events].sort((a, b) => a.timeSeconds - b.timeSeconds)) {
      const bucket = byLimb.get(ev.limb);
      if (bucket === void 0) byLimb.set(ev.limb, [ev]);
      else bucket.push(ev);
    }
    for (const [limb, evs] of byLimb) {
      for (let i = 1; i < evs.length; i++) {
        const a = evs[i - 1];
        const b = evs[i];
        const dt = b.timeSeconds - a.timeSeconds;
        if (dt >= 0 && dt < MIN_SAME_LIMB_INTERVAL_S) {
          issues.push({
            severity: "error",
            code: "SUPERHUMAN_RATE",
            message: `${limb} plays two notes ${(dt * 1e3).toFixed(1)}ms apart (min ${(MIN_SAME_LIMB_INTERVAL_S * 1e3).toFixed(1)}ms)`,
            eventId: b.eventId,
            ruleId: "rule25"
          });
        }
      }
    }
    const seen = /* @__PURE__ */ new Set();
    for (const ev of events) {
      const key = `${ev.limb}@${ev.timeSeconds.toFixed(4)}`;
      if (seen.has(key)) {
        issues.push({
          severity: "error",
          code: "LIMB_COLLISION",
          message: `${ev.limb} assigned two simultaneous events`,
          eventId: ev.eventId,
          ruleId: "rule25"
        });
      }
      seen.add(key);
    }
    for (const ev of events) {
      if (ev.velocity <= 0 || ev.velocity > 127) {
        issues.push({
          severity: "warning",
          code: "VELOCITY_RANGE",
          message: `velocity ${ev.velocity} out of expected range`,
          eventId: ev.eventId,
          ruleId: "rule25"
        });
      }
    }
    return { issues, approved: !issues.some((i) => i.severity === "error") };
  }
  function repairSuperhumanRate(events) {
    const byLimb = /* @__PURE__ */ new Map();
    for (const ev of events) {
      const bucket = byLimb.get(ev.limb);
      if (bucket === void 0) byLimb.set(ev.limb, [ev]);
      else bucket.push(ev);
    }
    const repaired = /* @__PURE__ */ new Map();
    for (const evs of byLimb.values()) {
      evs.sort((a, b) => a.timeSeconds - b.timeSeconds);
      for (let i = 1; i < evs.length; i++) {
        const prev = evs[i - 1];
        const cur = evs[i];
        const dt = cur.timeSeconds - prev.timeSeconds;
        if (dt >= 0 && dt < MIN_SAME_LIMB_INTERVAL_S) {
          repaired.set(cur.eventId, cur.timeSeconds + (MIN_SAME_LIMB_INTERVAL_S - dt));
        }
      }
    }
    if (repaired.size === 0) return events;
    return events.map((ev) => {
      const at = repaired.get(ev.eventId);
      if (at === void 0) return ev;
      return {
        ...ev,
        timeSeconds: at,
        ruleTrace: [...ev.ruleTrace, "rule25:repair_superhuman_rate"]
      };
    });
  }
  function validateAndRepair(events, maxPasses = 3) {
    let current = events;
    for (let pass = 0; pass < maxPasses; pass++) {
      const result = validatePerformance(current);
      if (result.approved) return result;
      if (result.issues.some((i) => i.code === "SUPERHUMAN_RATE")) {
        current = repairSuperhumanRate(current);
        continue;
      }
      return result;
    }
    return validatePerformance(current);
  }

  // src/rule26-runtime.ts
  var PerformanceRuntime = class {
    constructor(performance) {
      this.playheadS = 0;
      this.playing = false;
      if (!performance.validation.approved) {
        throw new Error("cannot construct a runtime from an unapproved performance (Rule 25 gate)");
      }
      this.performance = performance;
      this.sorted = [...performance.events].sort((a, b) => a.timeSeconds - b.timeSeconds);
    }
    play() {
      this.playing = true;
    }
    pause() {
      this.playing = false;
    }
    seek(timeS) {
      this.playheadS = Math.max(0, Math.min(this.performance.durationS, timeS));
    }
    /** Exactly the events due in a frame window. Same seed and version, same slice. */
    eventsBetween(t0, t1) {
      return this.sorted.filter((e) => t0 <= e.timeSeconds && e.timeSeconds < t1);
    }
    advance(dtS) {
      if (!this.playing) return [];
      const t0 = this.playheadS;
      const t1 = Math.min(this.performance.durationS, this.playheadS + dtS);
      const due = this.eventsBetween(t0, t1);
      this.playheadS = t1;
      return due;
    }
    exportSummary() {
      return {
        engineVersion: this.performance.engineVersion,
        seed: this.performance.seed,
        durationS: this.performance.durationS,
        eventCount: this.performance.events.length,
        validationIssues: this.performance.validation.issues.length
      };
    }
  };

  // src/rule30-state-machine.ts
  var DrummerStateMachine = class {
    constructor(initialState) {
      this.history = [];
      this.state = initialState;
    }
    checkpoint() {
      this.history.push(snapshotState(this.state));
    }
    rollback() {
      const previous = this.history.pop();
      if (previous === void 0) throw new Error("no checkpoint to roll back to");
      this.state = previous;
    }
    /**
     * The ONLY sanctioned way authoritative state changes outside
     * checkpoint/rollback. `newState` must already be a fully-resolved,
     * validated speculative state.
     */
    commit(newState, eventIds, ruleId = "rule30") {
      const transition = {
        fromTimeS: this.state.timeSeconds,
        toTimeS: newState.timeSeconds,
        eventIds: [...eventIds],
        ruleId
      };
      this.state = newState;
      return transition;
    }
  };

  // src/engine.ts
  var SEARCH_PRESETS = {
    FAST: { windowSize: 6, beamWidth: 3 },
    HIGH: { windowSize: 14, beamWidth: 8 }
  };
  function engineConfig(overrides = {}) {
    return {
      style: overrides.style ?? drummerStyle(),
      intent: overrides.intent ?? performanceIntent(),
      genre: overrides.genre ?? "generic",
      seed: overrides.seed ?? 42,
      mode: overrides.mode ?? "HIGH",
      ...overrides.mappingProfile !== void 0 ? { mappingProfile: overrides.mappingProfile } : {}
    };
  }
  var Engine = class {
    constructor(config) {
      this.memory = new PerformanceMemory();
      this.calibrator = new ProfileCalibrator();
      this.config = engineConfig(config ?? {});
    }
    /** RULE 36's end-to-end loop. */
    run(input) {
      const cfg = this.config;
      const preset = SEARCH_PRESETS[cfg.mode] ?? SEARCH_PRESETS["HIGH"];
      if (preset === void 0) throw new Error("SEARCH_PRESETS has lost its HIGH preset");
      const normalized = fromNoteList(input.noteList);
      const mappingProfile = cfg.mappingProfile ?? drumMappingProfile();
      let drumEvents = mapEvents(normalized.events, mappingProfile);
      drumEvents = drumEvents.filter((e) => e.isPlayable);
      drumEvents.sort((a, b) => a.timeSeconds - b.timeSeconds);
      const timing = analyzeTiming(drumEvents, normalized.tempoMap, normalized.timeSignatureMap);
      const density = analyzeDensity(drumEvents);
      const roles = roleContexts(classifyPatterns(drumEvents, timing, density));
      const idiom = makeIdiomContext(cfg.genre);
      const effectiveStyle = buildEffectiveStyle(
        cfg.style,
        this.calibrator.learned,
        cfg.intent,
        fatigueState(),
        idiom
      );
      const state = drummerState({ style: effectiveStyle, intent: cfg.intent });
      for (const limb of LIMBS) {
        const ls = state.limbs[limb];
        ls.position = neutralPosition(limb);
        ls.lastActionTimeS = -999;
        ls.readyTimeS = -999;
      }
      const sm = new DrummerStateMachine(state);
      const allDecisions = solveSticking(
        drumEvents,
        sm.state,
        preset.windowSize,
        preset.beamWidth,
        roles
      );
      this.memory.recordCommitted(allDecisions);
      const eventById = new Map(drumEvents.map((e) => [e.eventId, e]));
      const replayPosition = {};
      const replayReadyTime = {};
      const replayLastTime = {};
      for (const limb of LIMBS) {
        replayPosition[limb] = neutralPosition(limb);
        replayReadyTime[limb] = -999;
        replayLastTime[limb] = void 0;
      }
      let fatigue = fatigueState();
      const ordered = [...allDecisions].sort(
        (a, b) => eventById.get(a.eventId).timeSeconds - eventById.get(b.eventId).timeSeconds
      );
      const performanceEvents = [];
      const motionPlans = [];
      const techniqueByEvent = /* @__PURE__ */ new Map();
      for (const decision of ordered) {
        const ev = eventById.get(decision.eventId);
        const limb = decision.limb;
        const technique = selectTechnique(ev, limb, effectiveStyle, replayLastTime[limb]);
        techniqueByEvent.set(ev.eventId, technique);
        const recovery = planRecovery(ev.timeSeconds, limb, technique);
        const humanTiming = humanizeTiming(ev.eventId, ev.timeSeconds, effectiveStyle, cfg.seed);
        const humanizedVelocity = humanizeVelocity(ev.eventId, ev.velocity, effectiveStyle, cfg.seed);
        const targetPos = [ev.target.x, ev.target.y, ev.target.height];
        let plan = buildMotionPlan(
          ev.eventId,
          limb,
          technique,
          replayPosition[limb],
          targetPos,
          humanTiming,
          replayReadyTime[limb]
        );
        plan = applyRigEnvelope(plan);
        plan = appendRecoveryKeyframe(plan, recovery);
        motionPlans.push(plan);
        computeImpact(plan, ev.instrument, technique);
        fatigue = updateFatigue(fatigue, limb, technique, ev.timeSeconds);
        replayPosition[limb] = [ev.target.x, ev.target.y, ev.target.height + recovery.reboundHeightM];
        replayReadyTime[limb] = recovery.readyTimeS;
        replayLastTime[limb] = ev.timeSeconds;
        computeBodyState(ev.timeSeconds, replayPosition);
        const isDominantHand = (limb === "RH" || limb === "LH") && limb === `${effectiveStyle.dominantHand}H`;
        this.calibrator.observe(isDominantHand, false);
        performanceEvents.push({
          eventId: ev.eventId,
          sourceId: ev.sourceId,
          timeSeconds: humanTiming.performedTimeS,
          limb,
          instrument: ev.instrument,
          strokeType: technique.strokeType,
          velocity: humanizedVelocity,
          microtimingOffsetMs: humanTiming.microtimingOffsetMs,
          dynamicLevel: technique.dynamicLevel,
          ruleTrace: ["rule08/29", "rule09", "rule10", "rule12", "rule13-19"]
        });
      }
      const timeline = assembleTimeline(motionPlans, techniqueByEvent);
      checkAudioAnimationSync(timeline);
      const validation = validateAndRepair(performanceEvents);
      return {
        events: performanceEvents,
        animation: timeline,
        validation,
        durationS: timeline.durationS,
        seed: cfg.seed,
        engineVersion: "1.0.0"
      };
    }
  };

  // src/notation.ts
  function performanceTable(performance) {
    const lines = ["    time limb instrument       stroke      vel", "  " + "-".repeat(45)];
    for (const ev of performance.events) {
      lines.push(
        `${ev.timeSeconds.toFixed(3).padStart(8)} ${ev.limb.padStart(4)} ${ev.instrument.padEnd(16)}${ev.strokeType.padEnd(12)}${String(ev.velocity).padStart(3)}`
      );
    }
    lines.push("");
    lines.push(
      `Approved: ${performance.validation.approved}  Issues: ${performance.validation.issues.length}  Duration: ${performance.durationS.toFixed(2)}s`
    );
    return lines;
  }
  function toPlainObject(performance) {
    return {
      seed: performance.seed,
      engine_version: performance.engineVersion,
      duration_s: performance.durationS,
      approved: performance.validation.approved,
      issues: performance.validation.issues.map((i) => ({
        severity: i.severity,
        code: i.code,
        event_id: i.eventId ?? null
      })),
      events: performance.events.map((e) => ({
        event_id: e.eventId,
        source_id: e.sourceId,
        time_seconds: e.timeSeconds,
        limb: e.limb,
        instrument: e.instrument,
        stroke_type: e.strokeType,
        velocity: e.velocity,
        microtiming_offset_ms: e.microtimingOffsetMs,
        dynamic_level: e.dynamicLevel
      }))
    };
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=sticking-engine.js.map
