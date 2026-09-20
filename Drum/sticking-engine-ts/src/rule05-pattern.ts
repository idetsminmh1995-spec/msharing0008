/**
 * rule05-pattern.ts — RULE 5: PATTERN, GROOVE, FILL & PHRASE
 * CLASSIFICATION
 *
 * "Classification is probabilistic and contextual; labels guide later
 * decisions but do not force them." Nothing downstream may treat a
 * PatternContext as a hard constraint -- only as a bias.
 */

import type {
  DensityContext,
  DrumEvent,
  EventRoleContext,
  Instrument,
  PatternContext,
  PatternRole,
  TimingContext,
} from './datamodel.js';
import { newId } from './core/ids.js';

const MELODIC_TOMS: ReadonlySet<Instrument> = new Set<Instrument>([
  'tom_high',
  'tom_mid',
  'tom_low',
  'floor_tom',
]);
const GROOVE_KEEPERS: ReadonlySet<Instrument> = new Set<Instrument>([
  'hihat_closed',
  'hihat_open',
  'ride',
  'ride_bell',
]);

// Which instruments are the SAME physical surface under one hand. A
// groove that opens the hi-hat on the "and" has not changed instrument
// as far as the drummer's right arm is concerned, and neither has a ride
// pattern that hits the bell -- so both belong to one ostinato stream.
const OSTINATO_SURFACES: Readonly<Partial<Record<Instrument, string>>> = {
  hihat_closed: 'hihat',
  hihat_open: 'hihat',
  ride: 'ride',
  ride_bell: 'ride',
};

// A stream has to actually be a stream. Three hi-hat notes is a figure;
// four evenly-spaced ones is a drummer keeping time.
const MIN_OSTINATO_EVENTS = 4;
// How far a gap may drift from the stream's base gap and still be the
// same stream, as a fraction of that gap.
const OSTINATO_GAP_TOLERANCE = 0.15;
// A stream may skip notes -- a hi-hat that rests for one eighth is still
// the same hi-hat pattern -- but a gap of more than this many base gaps
// is a new stream, not a hole in the old one.
const OSTINATO_MAX_GAP_MULTIPLE = 4;

/**
 * RULE 5: find the time-keeping streams.
 *
 * An ostinato run is a maximal sequence of events on ONE surface whose
 * spacing stays on one grid. The base gap is the run's smallest gap;
 * every later gap has to be a near-integer multiple of it, which lets a
 * pattern skip a note without ending the run but stops two unrelated
 * crash hits from being called a stream.
 */
export function findOstinatoRuns(events: readonly DrumEvent[]): DrumEvent[][] {
  const bySurface = new Map<string, DrumEvent[]>();
  for (const ev of events) {
    const surface = OSTINATO_SURFACES[ev.instrument];
    if (surface === undefined) continue;
    const bucket = bySurface.get(surface);
    if (bucket === undefined) bySurface.set(surface, [ev]);
    else bucket.push(ev);
  }

  const runs: DrumEvent[][] = [];
  for (const surface of [...bySurface.keys()].sort()) {
    const stream = [...(bySurface.get(surface) as DrumEvent[])].sort((a, b) =>
      a.timeSeconds !== b.timeSeconds
        ? a.timeSeconds - b.timeSeconds
        : a.eventId < b.eventId
          ? -1
          : a.eventId > b.eventId
            ? 1
            : 0,
    );
    let current: DrumEvent[] = [];
    let baseGap = 0.0;
    for (const ev of stream) {
      if (current.length === 0) {
        current = [ev];
        baseGap = 0.0;
        continue;
      }
      const gap = ev.timeSeconds - (current[current.length - 1] as DrumEvent).timeSeconds;
      if (gap <= 0.0) {
        // A flam or double-stop on the same surface: not a new grid
        // position, so it cannot define or break the run.
        current.push(ev);
        continue;
      }
      if (baseGap <= 0.0) {
        current.push(ev);
        baseGap = gap;
        continue;
      }
      const multiple = gap / baseGap;
      const nearest = pyRound(multiple);
      const fits =
        nearest >= 1 &&
        nearest <= OSTINATO_MAX_GAP_MULTIPLE &&
        Math.abs(multiple - nearest) <= OSTINATO_GAP_TOLERANCE * nearest;
      if (fits) {
        current.push(ev);
        // A gap shorter than the base means the real grid is finer than
        // the run's first two notes suggested.
        if (gap < baseGap) baseGap = gap;
      } else {
        if (current.length >= MIN_OSTINATO_EVENTS) runs.push(current);
        current = [ev];
        baseGap = 0.0;
      }
    }
    if (current.length >= MIN_OSTINATO_EVENTS) runs.push(current);
  }

  runs.sort((a, b) => {
    const ea = a[0] as DrumEvent;
    const eb = b[0] as DrumEvent;
    if (ea.timeSeconds !== eb.timeSeconds) return ea.timeSeconds - eb.timeSeconds;
    return ea.eventId < eb.eventId ? -1 : ea.eventId > eb.eventId ? 1 : 0;
  });
  return runs;
}

/**
 * Python's round(): banker's rounding, ties to even. Used on the gap
 * multiple, where a tie is reachable (a gap of exactly 1.5 base gaps),
 * and where JavaScript's round-half-up would then disagree with the
 * reference engine about whether the run continues.
 */
function pyRound(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

function baseGapOf(run: readonly DrumEvent[]): number {
  let smallest = 0.0;
  for (let i = 1; i < run.length; i++) {
    const gap = (run[i] as DrumEvent).timeSeconds - (run[i - 1] as DrumEvent).timeSeconds;
    if (gap > 0.0 && (smallest === 0.0 || gap < smallest)) smallest = gap;
  }
  return smallest;
}

export function classifyPatterns(
  events: readonly DrumEvent[],
  timing: readonly TimingContext[],
  _density: readonly DensityContext[],
  measureGroupSize = 1,
): PatternContext[] {
  const timByeId = new Map(timing.map((t) => [t.eventId, t]));

  // Group by measure. A Map preserves insertion order, which is what
  // Python's dict does -- and the phrase IDs below are handed out in
  // that order, so it has to be the same order in both.
  const measures = new Map<number, DrumEvent[]>();
  for (const ev of events) {
    const t = timByeId.get(ev.eventId);
    if (t === undefined) continue;
    const m = Math.floor(t.measure / measureGroupSize);
    const bucket = measures.get(m);
    if (bucket === undefined) measures.set(m, [ev]);
    else bucket.push(ev);
  }

  let total = 0;
  for (const evs of measures.values()) total += evs.length;
  const avgCount = measures.size > 0 ? total / measures.size : 0;

  // Ostinato identity, computed across the whole piece rather than per
  // measure: a hi-hat pattern does not restart because a bar line went
  // past, and a hand holding it does not let go either.
  const ostinatoOf = new Map<string, { id: string; index: number; rate: number }>();
  const ostinatoSpans: { start: number; end: number; gap: number }[] = [];
  for (const run of findOstinatoRuns(events)) {
    const runId = newId('ost');
    const gap = baseGapOf(run);
    const rate = gap > 0 ? 1.0 / gap : 0.0;
    run.forEach((ev, index) => ostinatoOf.set(ev.eventId, { id: runId, index, rate }));
    ostinatoSpans.push({
      start: (run[0] as DrumEvent).timeSeconds,
      end: (run[run.length - 1] as DrumEvent).timeSeconds,
      gap,
    });
  }

  // Is a stream in progress at this instant? Its own start and end
  // count, plus one base gap of grace at each end so the note that
  // begins a bar under a hi-hat still sees the hi-hat.
  const ostinatoRunningAt = (t: number): boolean =>
    ostinatoSpans.some(
      (span) => span.start - span.gap - 1e-9 <= t && t <= span.end + span.gap + 1e-9,
    );

  const out: PatternContext[] = [];
  // A single section for simple inputs; a full song-structure detector
  // could split this further without changing the contract.
  const sectionId = newId('section');

  for (const evs of measures.values()) {
    const phraseId = newId('phrase');
    const tomHits = evs.filter((e) => MELODIC_TOMS.has(e.instrument)).length;
    const grooveHits = evs.filter((e) => GROOVE_KEEPERS.has(e.instrument)).length;
    const count = evs.length;

    let role: PatternRole;
    let conf: number;
    if (count === 0) {
      role = 'break';
      conf = 0.9;
    } else if (avgCount > 0 && count < 0.35 * avgCount) {
      role = 'break';
      conf = 0.6;
    } else if (tomHits >= Math.max(2, Math.trunc(0.4 * count)) && grooveHits < 0.2 * count) {
      role = 'fill';
      conf = 0.65;
    } else if (grooveHits >= 0.4 * count) {
      role = 'groove';
      conf = 0.7;
    } else {
      role = 'unknown';
      conf = 0.4;
    }

    for (const ev of evs) {
      const found = ostinatoOf.get(ev.eventId);
      if (found !== undefined) {
        // The measure is still a groove; THIS note's own role in it is
        // to keep time. Confidence is the measure's, because the
        // classification is no more certain than its context.
        out.push({
          eventId: ev.eventId,
          phraseId,
          sectionId,
          role: 'ostinato',
          roleConfidence: conf,
          ostinatoId: found.id,
          ostinatoIndex: found.index,
          ostinatoRateHz: found.rate,
          ostinatoActive: true,
        });
      } else {
        out.push({
          eventId: ev.eventId,
          phraseId,
          sectionId,
          role,
          roleConfidence: conf,
          ostinatoId: '',
          ostinatoIndex: -1,
          ostinatoRateHz: 0.0,
          ostinatoActive: ostinatoRunningAt(ev.timeSeconds),
        });
      }
    }
  }
  return out;
}

/**
 * RULE 5 -> RULE 7/8 hand-off, keyed by event id.
 *
 * An explicit context object rather than a shared mutable structure,
 * per every rule file's Implementation Contract ("no hidden global
 * state").
 */
export function roleContexts(patterns: readonly PatternContext[]): Map<string, EventRoleContext> {
  const out = new Map<string, EventRoleContext>();
  for (const p of patterns) {
    out.set(p.eventId, {
      eventId: p.eventId,
      role: p.role,
      roleConfidence: p.roleConfidence,
      ostinatoId: p.ostinatoId,
      ostinatoIndex: p.ostinatoIndex,
      ostinatoRateHz: p.ostinatoRateHz,
      ostinatoActive: p.ostinatoActive,
    });
  }
  return out;
}
