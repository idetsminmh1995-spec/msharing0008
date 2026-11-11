/**
 * rule03-04-timing-density.ts
 *
 * RULE 3 — MUSICAL TIME, BEAT & SUBDIVISION ANALYSIS
 *   "Musical time and physical time remain distinct but explicitly linked."
 * RULE 4 — DENSITY, SPACING & TEMPORAL PRESSURE
 *   "Density is contextual; note count alone never defines difficulty."
 *
 * Both are pure, stateless analytics over the same DrumEvent[] plus the
 * tempo/time-signature context, and both only ever READ Rule 1/2 output.
 */

import type {
  DensityContext,
  DrumEvent,
  TempoPoint,
  TimeSignaturePoint,
  TimingContext,
} from './datamodel.js';

/** 16th-note resolution; adjustable per song if needed. */
export const SUBDIVISION_GRID = 16;

/** Python's `bisect_right`: the index after the last element <= x. */
function bisectRight(values: readonly number[], x: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (x < (values[mid] as number)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function bpmAt(t: number, tempoMap: readonly TempoPoint[]): number {
  const idx = Math.max(
    0,
    bisectRight(
      tempoMap.map((tp) => tp.timeSeconds),
      t,
    ) - 1,
  );
  return (tempoMap[idx] as TempoPoint).bpm;
}

function timeSignatureAt(t: number, tsMap: readonly TimeSignaturePoint[]): TimeSignaturePoint {
  const idx = Math.max(
    0,
    bisectRight(
      tsMap.map((ts) => ts.timeSeconds),
      t,
    ) - 1,
  );
  return tsMap[idx] as TimeSignaturePoint;
}

export function analyzeTiming(
  events: readonly DrumEvent[],
  tempoMap: readonly TempoPoint[],
  tsMap: readonly TimeSignaturePoint[],
): TimingContext[] {
  const out: TimingContext[] = [];
  for (const ev of events) {
    const bpm = bpmAt(ev.timeSeconds, tempoMap);
    const ts = timeSignatureAt(ev.timeSeconds, tsMap);
    const secondsPerBeat = 60.0 / bpm;

    // Integrate beats from t=0 over the tempo map's piecewise-constant
    // segments, matching Rule 1's own conversion rather than assuming a
    // single tempo.
    let beatsElapsed = 0.0;
    let lastT = 0.0;
    let lastBpm = (tempoMap[0] as TempoPoint).bpm;
    for (const tp of tempoMap) {
      if (tp.timeSeconds >= ev.timeSeconds) break;
      beatsElapsed += (tp.timeSeconds - lastT) / (60.0 / lastBpm);
      lastT = tp.timeSeconds;
      lastBpm = tp.bpm;
    }
    beatsElapsed += (ev.timeSeconds - lastT) / (60.0 / lastBpm);

    const beatsPerMeasure = ts.numerator * (4.0 / ts.denominator);
    const measure = Math.floor(beatsElapsed / beatsPerMeasure);
    const beatInMeasure = pythonMod(beatsElapsed, beatsPerMeasure);
    const beat = Math.floor(beatInMeasure);
    const frac = beatInMeasure - beat;
    const subdivisionIndex = pythonRound(frac * SUBDIVISION_GRID);

    let strength: number;
    if (beat === 0 && subdivisionIndex === 0) strength = 1.0;
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
      secondsPerBeat,
    });
  }
  return out;
}

export function analyzeDensity(
  events: readonly DrumEvent[],
  windowS = 0.5,
  burstGapS = 0.09,
): DensityContext[] {
  const times = events.map((ev) => ev.timeSeconds);
  const out: DensityContext[] = [];
  const n = events.length;

  for (let i = 0; i < n; i++) {
    const ev = events[i] as DrumEvent;
    const t = ev.timeSeconds;
    const lo = bisectRight(times, t - windowS / 2);
    const hi = bisectRight(times, t + windowS / 2);
    const localCount = hi - lo;
    const localRate = windowS > 0 ? localCount / windowS : 0.0;

    const gapBefore = i > 0 ? t - (times[i - 1] as number) : Infinity;
    const gapAfter = i < n - 1 ? (times[i + 1] as number) - t : Infinity;

    let simultaneous = 0;
    for (const t2 of times) if (Math.abs(t2 - t) < 1e-4) simultaneous++;

    const inBurst = gapBefore < burstGapS || gapAfter < burstGapS;

    // Tempo-adjusted physical pressure: the demanded rate against a
    // nominal comfortable single-limb rate (~8 Hz), clipped for sanity.
    const comfortableHz = 8.0;
    const pressure = Math.min(4.0, localRate / comfortableHz);

    out.push({
      eventId: ev.eventId,
      localEventsPerSecond: localRate,
      gapBeforeSeconds: gapBefore === Infinity ? 0.0 : gapBefore,
      gapAfterSeconds: gapAfter === Infinity ? 0.0 : gapAfter,
      simultaneousCount: simultaneous,
      inBurst,
      tempoAdjustedPressure: pressure,
    });
  }
  return out;
}

/** Python's `%`, which follows the sign of the divisor. JS's does not. */
function pythonMod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

/**
 * Python's `round()`, which is banker's rounding (half to EVEN), not
 * JavaScript's `Math.round` (half UP).
 *
 * This is not a nicety: a note exactly on a 32nd-note boundary lands on
 * a `.5` subdivision, and the two rules disagree there -- one says
 * subdivision 2, the other 3, which changes `beat_strength` and with it
 * whether the note reads as syncopated.
 */
function pythonRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}
