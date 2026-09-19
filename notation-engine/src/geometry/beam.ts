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
 * §9.12's full grouping algorithm: walks a voice's events (with their
 * already-known start ticks -- the same reconstruction Phase 21's
 * `eventStartTicks` already does) and returns which ones share a beam.
 *
 * `groupTicks` overrides the computed beat length -- e.g. passing
 * `TICKS_PER_QUARTER` (one full quarter's worth) in 4/4 produces the
 * common real-world "groups of 4 eighth notes" convention instead of the
 * textbook-strict groups of 2; omitting it uses the plain beat-based
 * default.
 */
export function groupBeams(
  events: readonly BeamableEvent[],
  startTicks: readonly number[],
  numerator: number,
  denominator: number,
  groupTicks?: number,
): readonly BeamGroup[] {
  const unit = groupTicks ?? beamBeatTicks(numerator, denominator);
  const groups: BeamGroup[] = [];
  let current: number[] = [];
  let currentUnitIndex: number | undefined;

  const flush = (): void => {
    if (current.length >= 2) {
      groups.push({ eventIndices: current });
    }
    current = [];
    currentUnitIndex = undefined;
  };

  events.forEach((event, i) => {
    const tick = startTicks[i] ?? 0;
    if (event.isRest || !isBeamable(event.durationType)) {
      flush();
      return;
    }
    const unitIndex = unit > 0 ? Math.floor(tick / unit) : 0;
    if (currentUnitIndex !== undefined && unitIndex !== currentUnitIndex) {
      flush();
    }
    current.push(i);
    currentUnitIndex = unitIndex;
  });
  flush();

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
