/**
 * left-hand-rules.ts — what a hand can and cannot do (Plan Part 05).
 *
 * These are the HARD rules: a candidate that breaks one of them is
 * not expensive, it is impossible, and it is discarded before any
 * cost is worked out. Keeping them here, apart from the cost model,
 * is what lets the weights be tuned without ever producing a
 * fingering a hand could not make.
 *
 * Phase 1 is single-note lines, so the rules that only bite on chords
 * -- barre and mini-barre (LH-10..12) -- are not here yet. A state
 * that would need one is simply rejected, and the solver's
 * relaxation (SV-14) reports it, rather than a barre being silently
 * half-implemented.
 */
import type { GeometryConfig } from '../core/geometry.js';
import { fingertipDistanceMm, fingertipPoint } from '../core/geometry.js';
import type { InstrumentSpec, LHFinger, Placement } from '../core/types.js';

export interface SpanLimit {
  readonly comfort: number;
  readonly max: number;
}

export interface LeftHandConfig {
  readonly allowThumb: boolean;
  readonly spanMm: Readonly<Record<string, SpanLimit>>;
  readonly fingerProb: Readonly<Record<string, number>>;
  readonly preferredMaxFret: number;
  readonly persistWindowSec: number;
}

/** [LH-01] The fingers that may fret a note. The thumb is a style, not a default (P-012). */
export function allowedFingers(config: LeftHandConfig): readonly LHFinger[] {
  return config.allowThumb ? [1, 2, 3, 4, 'T'] : [1, 2, 3, 4];
}

/** The span table is written for finger pairs, lowest first. */
export function spanKey(a: LHFinger, b: LHFinger): string {
  const order = [String(a), String(b)].sort();
  return `${order[0] as string}-${order[1] as string}`;
}

export function spanLimit(config: LeftHandConfig, a: LHFinger, b: LHFinger): SpanLimit | undefined {
  return config.spanMm[spanKey(a, b)];
}

/** How far apart two placed fingers actually are, in millimetres (GEO-05). */
export function placementDistanceMm(
  instrument: InstrumentSpec,
  geometry: GeometryConfig,
  a: Placement,
  b: Placement,
): number {
  return fingertipDistanceMm(
    fingertipPoint(instrument, geometry, a.string, a.fret),
    fingertipPoint(instrument, geometry, b.string, b.fret),
  ).distanceMm;
}

export interface FeasibilityContext {
  readonly instrument: InstrumentSpec;
  readonly geometry: GeometryConfig;
  readonly leftHand: LeftHandConfig;
  /** [SV-14] how far the span limits have been loosened for this stage. */
  readonly spanFactor: number;
}

export interface Infeasible {
  readonly rule: string;
  readonly message: string;
}

/** The fretted placements, in fret order: the ones a finger has to hold. */
export function frettedOf(placements: readonly Placement[]): readonly Placement[] {
  return placements.filter((placement) => placement.finger !== null && placement.fret > 0);
}

/**
 * Can one hand hold all of these at once?
 *
 * Returns the rule that says no, or undefined when the hand is fine.
 * Naming the rule rather than returning a bare boolean is what makes
 * a rejected fingering explainable in the debug report.
 */
export function infeasibleReason(
  placements: readonly Placement[],
  context: FeasibilityContext,
): Infeasible | undefined {
  // [LH-15] two notes sounding at once cannot share a string.
  const strings = new Set<number>();
  for (const placement of placements) {
    if (strings.has(placement.string)) {
      return { rule: 'LH-15', message: `two notes at once on string ${placement.string}` };
    }
    strings.add(placement.string);
  }

  const fretted = frettedOf(placements);

  // [LH-03] one finger, one fret. A finger across several strings at
  // the same fret is a barre, which Phase 2 builds.
  const byFinger = new Map<string, Placement[]>();
  for (const placement of fretted) {
    const key = String(placement.finger);
    const list = byFinger.get(key);
    if (list === undefined) byFinger.set(key, [placement]);
    else list.push(placement);
  }
  for (const [finger, held] of byFinger) {
    if (held.length > 1) {
      const frets = new Set(held.map((placement) => placement.fret));
      return frets.size > 1
        ? { rule: 'LH-03', message: `finger ${finger} cannot be at two frets at once` }
        : { rule: 'LH-10', message: `finger ${finger} would have to barre, which Phase 2 adds` };
    }
  }

  // [LH-05] the fingers lie along the neck in order: the index is
  // always nearest the nut. Two fingers at the same fret may be in
  // any order (that is an ordinary chord shape).
  for (const a of fretted) {
    for (const b of fretted) {
      if (a === b || a.finger === 'T' || b.finger === 'T') continue;
      const fa = a.finger as number;
      const fb = b.finger as number;
      if (a.fret < b.fret && fa > fb) {
        return {
          rule: 'LH-05',
          message: `finger ${fa} at fret ${a.fret} is behind finger ${fb} at fret ${b.fret}`,
        };
      }
    }
  }

  // [LH-04] and the hand only stretches so far.
  for (let i = 0; i < fretted.length; i++) {
    for (let j = i + 1; j < fretted.length; j++) {
      const a = fretted[i] as Placement;
      const b = fretted[j] as Placement;
      const limit = spanLimit(context.leftHand, a.finger as LHFinger, b.finger as LHFinger);
      if (limit === undefined) continue;
      const distance = placementDistanceMm(context.instrument, context.geometry, a, b);
      if (distance > limit.max * context.spanFactor) {
        return {
          rule: 'LH-04',
          message: `fingers ${String(a.finger)} and ${String(b.finger)} would be ${distance.toFixed(0)} mm apart, past ${limit.max} mm`,
        };
      }
    }
  }

  return undefined;
}

/**
 * [LH-07] Where the hand is: the fret under the index finger.
 *
 * Read from the index when the index is down, and otherwise inferred
 * from the lowest-numbered finger in use, on the one-finger-per-fret
 * assumption. When nothing is fretted at all the hand simply stays
 * where it was -- an open string tells you nothing about where the
 * hand is, and pretending otherwise would invent a shift.
 */
export function handPosition(placements: readonly Placement[], previous: number): number {
  const fretted = frettedOf(placements).filter((placement) => placement.finger !== 'T');
  if (fretted.length === 0) return previous;
  const index = fretted.find((placement) => placement.finger === 1);
  if (index !== undefined) return index.fret;
  const lowest = fretted.reduce((best, placement) =>
    (placement.finger as number) < (best.finger as number) ? placement : best,
  );
  return lowest.fret - ((lowest.finger as number) - 1);
}
