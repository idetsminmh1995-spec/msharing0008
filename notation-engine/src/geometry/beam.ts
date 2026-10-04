import type { DurationType } from '../core/duration.js';
import type { BeamHint } from '../core/note.js';
import { TICKS_PER_QUARTER } from '../core/duration-math.js';

/** True for the durations §9.9 already gives an individual flag when unbeamed -- eighth and shorter. */
function isBeamable(durationType: DurationType): boolean {
  switch (durationType) {
    case 'eighth':
    case '16th':
    case '32nd':
    case '64th':
    case '128th':
    case '256th':
    case '512th':
    case '1024th':
      return true;
    default:
      return false;
  }
}

/**
 * The tick length of one "beat" for a time signature, per §9.12's
 * verified rule: compound meters (denominator 8, numerator divisible by 3
 * and greater than 3 -- 6/8, 9/8, 12/8) use a dotted-quarter beat (3
 * eighth-notes' worth); every other meter uses one note of the
 * denominator's own value (a quarter in 4/4, a half in 2/2, an eighth in
 * a simple x/8 meter, etc.).
 */
export function beamBeatTicks(numerator: number, denominator: number): number {
  const isCompound = denominator === 8 && numerator % 3 === 0 && numerator > 3;
  if (isCompound) {
    return 3 * (TICKS_PER_QUARTER / 2); // 3 eighth notes
  }
  return TICKS_PER_QUARTER * (4 / denominator);
}

export interface BeamableEvent {
  readonly durationType: DurationType;
  /** Whether this event is a rest -- a rest is never itself beamed, and breaks a run of beamable notes (§9.12). */
  readonly isRest: boolean;
}

/** One group of 2+ consecutive event indices sharing a beam. A solitary beamable note (nothing grouped with it) never appears in the output -- it keeps its individual flag instead. */
export interface BeamGroup {
  readonly eventIndices: readonly number[];
}

/**
 * Whether this meter beams its eighth notes TWO BEATS at a time.
 *
 * This is the rule that separates a page of real music from a page of
 * correct-but-wrong music, and it is the one difference you see first:
 * eight eighth notes in 4/4 are engraved as two beams of four, not four
 * beams of two. Every published edition does it, and so does MuseScore.
 *
 * It only applies where the beat is a QUARTER and the bar divides into
 * whole pairs of beats:
 *
 *  - 4/4 -> two groups of four eighths. 2/4 -> one group of four.
 *  - 3/4 has an odd number of beats, so its eighths stay in threes of
 *    twos: 2+2+2, never 4+2.
 *  - 2/2's beat is already a half note, so a beat is four eighths and
 *    pairing them would give eight to a beam.
 *  - 6/8 and the other compound meters beat in dotted quarters, which
 *    is three eighths, and pairing those is not a thing anyone does.
 */
function pairsBeats(numerator: number, denominator: number): boolean {
  return beamBeatTicks(numerator, denominator) === TICKS_PER_QUARTER && numerator % 2 === 0;
}

/**
 * How many beats one beam group spans, for a run of notes this short.
 *
 * Only EIGHTH notes pair up. The moment anything shorter is in the
 * group, the group goes back to one beat -- which is the other half of
 * the same convention: a beat carrying sixteenths is beamed on its own
 * so that the beat stays visible, because that is what the reader is
 * counting.
 */
function beatsPerGroup(
  numerator: number,
  denominator: number,
  shortest: DurationType | undefined,
): number {
  if (shortest !== 'eighth') return 1;
  return pairsBeats(numerator, denominator) ? 2 : 1;
}

/** Of two durations, the shorter -- by beam count, which is what decides grouping. */
function shorterOf(a: DurationType | undefined, b: DurationType): DurationType {
  if (a === undefined) return b;
  return beamLevels(b) > beamLevels(a) ? b : a;
}

/** How many beams a duration needs; 0 for anything never beamed. */
function beamLevels(type: DurationType): number {
  switch (type) {
    case 'eighth':
      return 1;
    case '16th':
      return 2;
    case '32nd':
      return 3;
    case '64th':
      return 4;
    case '128th':
      return 5;
    case '256th':
      return 6;
    case '512th':
      return 7;
    case '1024th':
      return 8;
    default:
      return 0;
  }
}

/**
 * §9.12's full grouping algorithm: walks a voice's events (with their
 * already-known start ticks -- the same reconstruction Phase 21's
 * `eventStartTicks` already does) and returns which ones share a beam.
 *
 * The run of beamable notes is split at BEATS, and then adjacent beats
 * are joined back together where the meter and the note values allow it
 * (see `pairsBeats`): in 4/4 that turns four beams of two eighths into
 * two beams of four, which is what the music is actually engraved as.
 * The decision is taken per pair of beats rather than per run, so a bar
 * of four eighths followed by eight sixteenths beams the eighths in one
 * group of four and the sixteenths a beat at a time -- which is again
 * what an edition does.
 *
 * `groupTicks` overrides the whole calculation with a fixed group
 * length, for a caller that knows better (a drum chart with its own
 * house grouping, or a test pinning one number).
 */
export function groupBeams(
  events: readonly BeamableEvent[],
  startTicks: readonly number[],
  numerator: number,
  denominator: number,
  groupTicks?: number,
): readonly BeamGroup[] {
  const beat = groupTicks ?? beamBeatTicks(numerator, denominator);
  // An override is the last word: a caller who names a group length has
  // already decided, and pairing its beats back up would be the engine
  // overruling them with the very convention they overrode.
  const pairing = groupTicks === undefined;
  const groups: BeamGroup[] = [];

  // One run of consecutive beamable notes. A rest, or anything longer
  // than an eighth, ends the run -- neither is ever beamed.
  let run: number[] = [];

  const flushRun = (): void => {
    if (run.length === 0) return;

    // Split the run at beats first.
    const beats: { index: number; events: number[] }[] = [];
    for (const i of run) {
      const tick = startTicks[i] ?? 0;
      const beatIndex = beat > 0 ? Math.floor(tick / beat) : 0;
      const last = beats[beats.length - 1];
      if (last !== undefined && last.index === beatIndex) last.events.push(i);
      else beats.push({ index: beatIndex, events: [i] });
    }

    // Then join adjacent beats back up where the meter pairs them and
    // every note in both is an eighth. Pairs are counted from the bar's
    // own start, so a group never straddles the middle of the bar.
    const shortestIn = (one: { events: number[] }): DurationType | undefined => {
      let shortest: DurationType | undefined;
      for (const i of one.events) {
        const event = events[i];
        if (event !== undefined) shortest = shorterOf(shortest, event.durationType);
      }
      return shortest;
    };

    let at = 0;
    while (at < beats.length) {
      const first = beats[at] as (typeof beats)[number];
      const next = beats[at + 1];
      const span = pairing ? beatsPerGroup(numerator, denominator, shortestIn(first)) : 1;
      const joins =
        span === 2 &&
        next !== undefined &&
        next.index === first.index + 1 &&
        first.index % 2 === 0 &&
        beatsPerGroup(numerator, denominator, shortestIn(next)) === 2;
      const merged = joins && next !== undefined ? [...first.events, ...next.events] : first.events;
      if (merged.length >= 2) groups.push({ eventIndices: merged });
      at += joins ? 2 : 1;
    }
    run = [];
  };

  events.forEach((event, i) => {
    if (event.isRest || !isBeamable(event.durationType)) {
      flushRun();
      return;
    }
    run.push(i);
  });
  flushRun();

  return groups;
}

/** Every event index that ended up in some beam group -- convenient for a caller deciding whether to draw an individual flag (needsFlag from §9.9 should be called with `isBeamed: true` for these). */
export function beamedEventIndices(groups: readonly BeamGroup[]): ReadonlySet<number> {
  const set = new Set<number>();
  for (const group of groups) {
    for (const index of group.eventIndices) {
      set.add(index);
    }
  }
  return set;
}

/**
 * An event plus the file's OWN level-1 `<beam>` value for it, if it gave
 * one (§10.4/§10.8). Level 1 is the primary (eighth-note) beam -- the one
 * that decides GROUPING; levels 2+ only add secondary beams within a
 * group already established at level 1, and §9.13's own rendering takes
 * its line count from the group's durations rather than from those
 * hints.
 */
export interface BeamHintedEvent {
  readonly durationType: DurationType;
  readonly isRest: boolean;
  readonly beamValue?: BeamHint['value'];
}

/** True when at least one event carries a level-1 `<beam>` hint -- i.e. the file states its own beaming and should be believed rather than second-guessed. */
export function hasExplicitBeams(events: readonly BeamHintedEvent[]): boolean {
  return events.some((e) => !e.isRest && e.beamValue !== undefined);
}

/**
 * §10.8: "beams given explicitly via `<beam>` vs. left for the renderer
 * to infer" is a named cross-software divergence, and a file that states
 * its own beaming is the authority on it -- re-deriving grouping from the
 * time signature would silently override, say, a drum chart's deliberate
 * cross-beat grouping.
 *
 * Walks the level-1 hints: `begin` opens a group, `continue` extends it,
 * `end` closes it. A note with no hint at all closes any open group (it
 * is unbeamed, and an unbeamed note breaks a run exactly as a rest does).
 * Hooks (`forward hook`/`backward hook`) only ever occur at levels 2+ in
 * real files, but are treated as `continue` here rather than as a group
 * break, so a malformed file that puts one at level 1 degrades to
 * something sensible instead of splitting a beam mid-run.
 *
 * Malformed input never throws (§10.7): a `continue`/`end` with no open
 * group simply opens one. As with `groupBeams`, a group of fewer than 2
 * events is dropped -- a lone note keeps its individual flag.
 */
export function groupBeamsFromHints(events: readonly BeamHintedEvent[]): readonly BeamGroup[] {
  const groups: BeamGroup[] = [];
  let current: number[] = [];

  const flush = (): void => {
    if (current.length >= 2) groups.push({ eventIndices: current });
    current = [];
  };

  events.forEach((event, i) => {
    if (event.isRest || event.beamValue === undefined) {
      flush();
      return;
    }
    switch (event.beamValue) {
      case 'begin':
        flush();
        current.push(i);
        break;
      case 'continue':
      case 'forward hook':
      case 'backward hook':
        current.push(i);
        break;
      case 'end':
        current.push(i);
        flush();
        break;
    }
  });
  flush();

  return groups;
}
