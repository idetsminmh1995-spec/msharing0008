/**
 * defaults.ts — every number the engine uses (Plan Part 10).
 *
 * [README rule 3] No magic numbers anywhere else. A preset is a
 * partial config merged over these; the user's settings are merged
 * last. The hash of the merged result goes into the timeline, so a
 * video can be traced back to the exact numbers that made it.
 *
 * Every value here is CALIBRATE unless its comment says otherwise:
 * they are engineering estimates to be tuned against real videos, not
 * facts.
 */

export const DEFAULTS = {
  input: {
    /** [P-001] Tab in the file is obeyed, even when it is awkward; a warning says so. */
    tabPolicy: 'respect' as 'respect' | 'suggest',
    /** [P-002] A written fingering wins over anything the solver would pick. */
    respectFingering: true,
    /** [P-013] A note the instrument cannot play is skipped, not transposed. */
    outOfRange: 'skip' as 'skip' | 'clamp',
    graceDurationSec: 0.06,
    pitchBendRangeSemitones: 2,
  },
  instrument: {
    /** [P-004] Standard tuning, string 1 = low E2 [DM-01]. */
    numStrings: 6,
    tuning: [40, 45, 50, 55, 59, 64] as readonly number[],
    capo: 0,
    numFrets: 22,
    /** Part 04 §2: Fender-style scale. Gibson ~628, classical ~650. */
    scaleLengthMm: 648,
    nutSpacingMm: 35,
    bridgeSpacingMm: 52.5,
  },
  geometry: {
    /** [GEO-03] */
    fingertipBehindFret: 0.3,
  },
  leftHand: {
    /** [P-012] The thumb over the top is a style, not a default. */
    allowThumb: false,
    /** [LH-04] millimetres between two fingertips: comfortable, and the hard limit. */
    spanMm: {
      '1-2': { comfort: 40, max: 65 },
      '2-3': { comfort: 30, max: 45 },
      '3-4': { comfort: 30, max: 45 },
      '1-3': { comfort: 65, max: 95 },
      '2-4': { comfort: 60, max: 85 },
      '1-4': { comfort: 90, max: 120 },
    },
    /** [LH-08] how often each finger is used, from Hori & Sagayama. */
    fingerProb: { 1: 0.35, 2: 0.3, 3: 0.25, 4: 0.1 },
    preferredMaxFret: 12,
    persistWindowSec: 1.0,
  },
  solver: {
    /** [SV-02] notes this close together are one chord, not two stages. */
    onsetToleranceSec: 0.015,
    segmentGapSec: 2.0,
    beamWidth: 256,
    maxStaticCost: 50,
    hardMoveExponent: 1.3,
    shiftRefMm: 25,
    minFreeTimeSec: 0.05,
    confidenceScale: 2.0,
    /** [SV-14] how far a span limit may bend when the file leaves no choice. */
    relaxSpanFactor: 1.15,
  },
  weights: {
    span: 1.0,
    fingerDifficulty: 1.0,
    crossing: 2.0,
    barreBase: 1.5,
    barrePerString: 0.2,
    barreLowFretExtra: 1.0,
    /** Negative: an open string is easier, so it pulls the cost down. */
    openStrings: -0.3,
    highFret: 0.1,
    bendFinger: 2.0,
    techniqueFinger: 1.5,
    shift: 1.0,
    shiftCount: 1.0,
    guideFinger: -0.5,
    stringChange: 0.5,
    sameFingerJump: 0.5,
    roll: 0.2,
    relift: 0.8,
    sustainCut: 2.0,
  },
  rightHand: {
    /** [P-009] pick or fingers, worked out from the music unless told. */
    mode: 'auto' as 'auto' | 'pick' | 'fingerstyle',
    pickStyle: 'alternate' as 'alternate' | 'economy',
    strum: { spreadSec: 0.02, upStrumMaxStrings: 4 },
  },
  motion: {
    /** [P-008] fingers stay down after a note like a real player's do. */
    holdPolicy: 'realistic' as 'realistic' | 'noteDuration',
    idleLiftSec: 0.6,
    /** [MP-01] how early a finger starts moving towards its note. */
    leadFraction: 0.4,
    minLeadSec: 0.02,
    maxLeadSec: 0.12,
    /** [MP-02] Fitts's law: time = a + b · log2(distance / width + 1). */
    fitts: { aSec: 0.04, bSecPerBit: 0.03, targetWidthMm: 10 },
    slideMaxSec: 0.15,
    bendRiseSec: 0.15,
    harmonicReleaseSec: 0.05,
  },
  humanize: {
    enabled: true,
    timeJitterSec: 0.008,
    posJitterFret: 0.05,
  },
  debug: false,
} as const;

export type EngineConfig = typeof DEFAULTS;

/** A partial config, nested as deep as the caller likes. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge a partial config over another, deeply.
 *
 * Arrays are REPLACED rather than merged: a tuning of six numbers
 * merged element-wise with a seven-string tuning would produce an
 * instrument nobody owns.
 */
export function mergeConfig<T>(base: T, over?: DeepPartial<T>): T {
  if (over === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(over)) return (over as unknown as T) ?? base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? mergeConfig(current, value) : value;
  }
  return out as T;
}

/**
 * A short, stable hash of the merged config, for the timeline's
 * `configHash`. FNV-1a over the canonical JSON: same config, same
 * hash, in any order of keys.
 */
export function configHash(config: unknown): string {
  const canonical = JSON.stringify(config, (_key, value: unknown) => {
    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    }
    return value;
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
