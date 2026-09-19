import { TICKS_PER_QUARTER } from '../core/duration-math.js';
import type { MusicalPosition } from '../timing/measure-position.js';
import type { TempoMap } from '../timing/tempo-map.js';
import { tickToSeconds } from '../timing/tick-seconds.js';
import type { NotationEvent } from './event-stream.js';

export interface PlaybackPosition {
  readonly tick: number;
  readonly seconds: number;
  readonly position: MusicalPosition;
}

/** The one piece of a measure's rendered layout `positionToX`/`xToPosition` need -- the exact same shape `renderFromMusicXml`'s own internal `computeMeasureLayout` already produces. */
export interface PlaybackMeasureLayout {
  readonly width: number;
  readonly positionsByTick: ReadonlyMap<number, number>;
  /**
   * How much of this measure's own width its HEADER takes -- the clef,
   * key signature and time signature it actually draws, which is not the
   * same for every measure (a system start restates all three; an
   * ordinary measure draws none) and not a constant across scores (a
   * four-sharp key signature is four units wider than no key signature).
   *
   * `positionsByTick`'s values are relative to just past this, not to the
   * measure's bare x -- so a note's real x is
   * `placement.x + headerWidth + positionsByTick.get(tick)`.
   *
   * Added in the final end-to-end review: this used to be one score-wide
   * constant (6.0), which the RENDERER already overrode per staff when a
   * real header was wider. The cursor did not, so on the user's own
   * E-major score `positionToX` reported x=6.00 for a note drawn at
   * x=10.5 -- four and a half staff spaces of playback drift, on every
   * measure with a header wider than the constant.
   */
  readonly headerWidth: number;
}

/** Where one measure sits on the page -- the playback-relevant slice of `renderFromMusicXml`'s own internal `MeasurePlacement`. */
export interface PlaybackMeasurePlacement {
  readonly x: number;
  /** This measure's own drawn width -- what `playheadX` interpolates across, and (in page mode) the JUSTIFIED width, not the pre-justification one. */
  readonly width: number;
  readonly systemIndex: number;
  readonly pageIndex: number;
  /** That system's own vertical origin, in the same staff-space coordinates the SVG uses -- what Phase 49's cursor needs to draw its marker on the right system in page mode. */
  readonly systemY: number;
}

export interface EventPosition {
  readonly x: number;
  readonly systemIndex: number;
  readonly pageIndex: number;
  /** The vertical origin of the system this x belongs to -- 0 in scroll mode, the system's own offset in page mode. */
  readonly systemY: number;
}

/**
 * PLAN.md §17.1's full "what the engine provides" for one rendered score,
 * computed ONCE by `computePlaybackData` (called from `renderFromMusicXml`
 * itself, from the exact layout maps that produced the SVG) -- never a
 * second, independently-computed layout that could drift from what was
 * actually drawn. `positionToX`, `xToPosition`, `resolvePosition` and
 * `getEventStream` are all pure functions of this data, matching this
 * codebase's own established `geometry/`-style shape (explicit data in,
 * explicit data out) rather than closures with hidden state.
 */
export interface PlaybackData {
  readonly measureNumbersInOrder: readonly number[];
  readonly globalTickOffsetByMeasure: ReadonlyMap<number, number>;
  readonly timeSignatureByMeasure: ReadonlyMap<
    number,
    { readonly numerator: number; readonly denominator: number }
  >;
  readonly measureLayoutsByNumber: ReadonlyMap<number, PlaybackMeasureLayout>;
  readonly placementByMeasureNumber: ReadonlyMap<number, PlaybackMeasurePlacement>;
  /**
   * The floor every measure's header is at least this wide -- what a
   * measure that draws no header at all still reserves. The REAL
   * per-measure width is `measureLayoutsByNumber.get(n).headerWidth`,
   * which is what `positionToX` uses; this is only the fallback for a
   * measure with no layout entry.
   */
  readonly measureHeaderAllowance: number;
  readonly tempoMap: TempoMap;
  readonly events: readonly NotationEvent[];
}

/** The last measure in performance order whose own start is at or before `tick` -- binary search, since `measureNumbersInOrder`'s offsets are monotonically non-decreasing by construction (`computePlaybackData` builds them as a running sum of non-negative measure lengths). */
function measureAtTick(playback: PlaybackData, tick: number): number | undefined {
  const order = playback.measureNumbersInOrder;
  if (order.length === 0) return undefined;
  let low = 0;
  let high = order.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const midMeasure = order[mid];
    const midOffset =
      midMeasure !== undefined ? (playback.globalTickOffsetByMeasure.get(midMeasure) ?? 0) : 0;
    if (midOffset <= tick) low = mid;
    else high = mid - 1;
  }
  return order[low];
}

/** The largest recorded tick at or before `tickInMeasure` -- a rendered note's own x is exactly correct for every tick from its own onset up to (not including) the next one, so "the note currently sounding" is the floor, not the nearest. */
function floorEntry(
  positionsByTick: ReadonlyMap<number, number>,
  tickInMeasure: number,
): number | undefined {
  let best: number | undefined;
  for (const t of positionsByTick.keys()) {
    if (t <= tickInMeasure && (best === undefined || t > best)) best = t;
  }
  return best;
}

/**
 * §17.2's own musical-position half of a `PlaybackPosition`. Deliberately
 * does not reuse `timing/measure-position.ts`'s `MeasureMap`/`tickToPosition`
 * machinery: that module is built for the case where only a sparse list of
 * time-signature CHANGE points is known and every measure's own length must
 * be reconstructed from them (rounding to the nearest whole measure at each
 * change, by its own documented design). Here, `computePlaybackData` already
 * has every measure's own real length from the layout pass that rendered
 * it -- indexing that directly is both simpler and exact, with no rounding
 * step to round.
 */
function tickToMusicalPosition(playback: PlaybackData, tick: number): MusicalPosition {
  const measureNumber = measureAtTick(playback, tick);
  if (measureNumber === undefined) return { measureNumber: 1, beat: 1, tickInMeasure: 0 };
  const offset = playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0;
  const tickInMeasure = tick - offset;
  const denominator = playback.timeSignatureByMeasure.get(measureNumber)?.denominator ?? 4;
  const beatLenTicks = (4 / denominator) * TICKS_PER_QUARTER;
  const beat = 1 + tickInMeasure / beatLenTicks;
  return { measureNumber, beat, tickInMeasure };
}

/** §17.1's `PlaybackPosition` for an arbitrary tick -- tick, real seconds (§12's tempo map) and measure+beat, all three views of the same instant. */
export function resolvePosition(playback: PlaybackData, tick: number): PlaybackPosition {
  return {
    tick,
    seconds: tickToSeconds(playback.tempoMap, tick),
    position: tickToMusicalPosition(playback, tick),
  };
}

/** §17.1: time -> where on the page. The x of the note currently sounding at `tick` (see `floorEntry`), in the same coordinate space the rendered SVG itself uses. */
export function positionToX(playback: PlaybackData, tick: number): EventPosition {
  const measureNumber = measureAtTick(playback, tick);
  if (measureNumber === undefined) return { x: 0, systemIndex: 0, pageIndex: 0, systemY: 0 };
  const offset = playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0;
  const tickInMeasure = Math.max(0, tick - offset);
  const layout = playback.measureLayoutsByNumber.get(measureNumber);
  const placement = playback.placementByMeasureNumber.get(measureNumber);
  const floorTick =
    layout !== undefined ? floorEntry(layout.positionsByTick, tickInMeasure) : undefined;
  const withinMeasureX =
    floorTick !== undefined ? (layout?.positionsByTick.get(floorTick) ?? 0) : 0;
  const headerWidth = layout?.headerWidth ?? playback.measureHeaderAllowance;
  return {
    x: (placement?.x ?? 0) + headerWidth + withinMeasureX,
    systemIndex: placement?.systemIndex ?? 0,
    pageIndex: placement?.pageIndex ?? 0,
    systemY: placement?.systemY ?? 0,
  };
}

/**
 * §17.1, for a MOVING playhead: where the music is at `tick`, as a
 * continuous position rather than the last note's own x.
 *
 * `positionToX` answers "where is the note sounding right now", which is
 * what note-highlighting and `xToPosition` need -- and it is a STEP
 * function, holding still between one note and the next. A playback line
 * driven by it freezes on each note and jumps, and on a measure with no
 * notes at all (a whole rest) it does not move for the entire measure.
 * The user reported exactly that: "even if there is no note, in 4/4 it
 * should still travel four beats".
 *
 * So this interpolates between the surrounding positions instead:
 * between two notes, proportionally to the tick; after a measure's last
 * note, on toward that measure's own right edge. At a note's exact tick
 * it returns exactly what `positionToX` does, so the two never disagree
 * about where a note IS -- only about what happens in between.
 */
export function playheadX(playback: PlaybackData, tick: number): EventPosition {
  const measureNumber = measureAtTick(playback, tick);
  if (measureNumber === undefined) return { x: 0, systemIndex: 0, pageIndex: 0, systemY: 0 };
  const placement = playback.placementByMeasureNumber.get(measureNumber);
  const layout = playback.measureLayoutsByNumber.get(measureNumber);
  const frame = {
    systemIndex: placement?.systemIndex ?? 0,
    pageIndex: placement?.pageIndex ?? 0,
    systemY: placement?.systemY ?? 0,
  };
  if (layout === undefined || placement === undefined) {
    return { x: positionToX(playback, tick).x, ...frame };
  }

  const offset = playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0;
  const tickInMeasure = Math.max(0, tick - offset);
  const noteAreaX = placement.x + layout.headerWidth;

  // The measure's own tick length, so the last note can interpolate
  // toward the barline over the RIGHT amount of time.
  const signature = playback.timeSignatureByMeasure.get(measureNumber);
  const measureTicks =
    signature !== undefined
      ? signature.numerator * (4 / signature.denominator) * TICKS_PER_QUARTER
      : undefined;

  const entries = [...layout.positionsByTick.entries()].sort((a, b) => a[0] - b[0]);
  // A measure with no events at all (an empty measure, or one whose
  // rest produced no spacing entry) still spans real time, so the
  // playhead crosses it from its note area to its right edge.
  let fromTick = 0;
  let fromX = noteAreaX;
  let toTick = measureTicks ?? tickInMeasure;
  let toX = placement.x + placement.width;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry === undefined || entry[0] > tickInMeasure) break;
    fromTick = entry[0];
    fromX = noteAreaX + entry[1];
    const next = entries[i + 1];
    if (next !== undefined) {
      toTick = next[0];
      toX = noteAreaX + next[1];
    } else {
      toTick = measureTicks ?? fromTick;
      toX = placement.x + placement.width;
    }
  }

  const span = toTick - fromTick;
  if (span <= 0) return { x: fromX, ...frame };
  const fraction = Math.min(1, Math.max(0, (tickInMeasure - fromTick) / span));
  return { x: fromX + (toX - fromX) * fraction, ...frame };
}

/**
 * How close to a note's own x still counts as that note, absorbing the
 * floating-point error of `positionToX`'s own addition being undone.
 * 1e-9 staff spaces is a hundred-millionth of a notehead.
 */
const X_EPSILON = 1e-9;

/** §17.1: where on the page -> time, for click-to-seek in a host app. The exact inverse of `positionToX` at a real event's own x (floor-by-x within the chosen measure mirrors `positionToX`'s own floor-by-tick). `systemIndex` narrows the search to one system, since the same x can legitimately appear in several (one per system/page). */
export function xToPosition(playback: PlaybackData, x: number, systemIndex: number): number {
  const candidates = [...playback.placementByMeasureNumber.entries()]
    .filter(([, p]) => p.systemIndex === systemIndex)
    .sort((a, b) => a[1].x - b[1].x);
  if (candidates.length === 0) return 0;

  let chosen = candidates[0];
  for (const candidate of candidates) {
    if (candidate[1].x <= x) chosen = candidate;
    else break;
  }
  const measureNumber = chosen?.[0];
  const placement = chosen?.[1];
  if (measureNumber === undefined || placement === undefined) return 0;

  const layout = playback.measureLayoutsByNumber.get(measureNumber);
  const localX = x - placement.x - (layout?.headerWidth ?? playback.measureHeaderAllowance);
  let bestTick = 0;
  let bestX: number | undefined;
  if (layout !== undefined) {
    for (const [tick, tickX] of layout.positionsByTick) {
      // `localX` is a subtraction of three numbers that were added to
      // produce `x` in the first place, so an EXACT hit on a note can
      // come back a few ulps short and fall to the previous note. Found
      // in the final review: clicking precisely on a notehead selected
      // the one before it. The tolerance is far below one staff space,
      // so it can never reach a genuinely different note.
      if (tickX <= localX + X_EPSILON && (bestX === undefined || tickX > bestX)) {
        bestX = tickX;
        bestTick = tick;
      }
    }
  }
  const offset = playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0;
  return offset + bestTick;
}
