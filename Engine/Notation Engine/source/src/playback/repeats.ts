import type { TempoMap } from '../timing/tempo-map.js';
import { secondsToTick, tickToSeconds } from '../timing/tick-seconds.js';

export type RepeatDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A repeat structure this engine could not resolve exactly.
 *
 * Its own type rather than the MusicXML parser's `Diagnostic`, for the
 * same reason `timing/diagnostic.ts` is its own: repeat resolution
 * consumes barline DATA from a parser but has no business depending on
 * that parser's reporting shape. `renderParsedMusicXml` translates
 * these into the render's diagnostics, so a caller still sees one list.
 */
export interface RepeatDiagnostic {
  readonly severity: RepeatDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

export function repeatDiagnostic(
  severity: RepeatDiagnosticSeverity,
  code: string,
  message: string,
): RepeatDiagnostic {
  return { severity, code, message };
}

/**
 * One written measure, as the repeat resolver needs it: its number, its
 * length, and whatever repeat/volta marks sit on its two edges.
 *
 * `repeatStart`/`repeatEndTimes` are already resolved from BOTH sides of
 * each barline by the caller. A barline is shared between two measures
 * and either may declare it (`<barline location="left">` on the measure
 * after, or `location="right"` on the measure before), so reading only
 * one side puts a real file's repeat a whole measure out of place --
 * the same trap Integration Q hit when drawing them.
 */
export interface RepeatMeasureSpec {
  readonly measureNumber: number;
  readonly ticks: number;
  /** A repeat-begin barline at this measure's LEFT edge: the section repeats from here. */
  readonly repeatStart: boolean;
  /**
   * A repeat-end barline at this measure's RIGHT edge, and how many
   * times the section is played IN TOTAL. `undefined` means no repeat
   * end here. MusicXML's own default when `<repeat>` carries no `times`
   * is 2, applied by the caller, so `1` here really does mean "written
   * as times=1", i.e. play once and move on.
   */
  readonly repeatEndTimes?: number;
  /** The volta numbers this measure OPENS (`<ending type="start">`), if any. */
  readonly endingStart?: readonly number[];
  /** Whether a volta CLOSES at this measure's right edge (`<ending type="stop"|"discontinue">`). */
  readonly endingStop: boolean;
  /**
   * True when that close was MusicXML's `discontinue` rather than
   * `stop`. Identical for playback -- the volta ends either way -- and
   * different on the page: a `discontinue` bracket has no down-hook at
   * its right end, which is how an ending that simply runs on is
   * written.
   */
  readonly endingDiscontinue?: boolean;
}

/** One measure, one time through: where it sits in written time and where it sits in performance time. */
export interface PerformanceEntry {
  readonly measureNumber: number;
  readonly ticks: number;
  /** Tick offset of this measure in PERFORMANCE order -- strictly increasing across the plan. */
  readonly performanceTick: number;
  /** Tick offset of the same measure in the WRITTEN score -- what `playheadX`/`positionToX` take. */
  readonly writtenTick: number;
  /** Seconds from the start of the performance to this measure's downbeat. */
  readonly startSeconds: number;
  /** Seconds from the start of the WRITTEN score to the same downbeat -- how `startSeconds` is turned back into a written tick. */
  readonly writtenStartSeconds: number;
  /** 1-based: the how-many-th time through this measure this entry is. */
  readonly pass: number;
}

/**
 * The written score unfolded into the order it is actually played.
 *
 * §17.2 used to say the engine never simulates playback order, and that
 * a host wanting the marker to jump back at a repeat must supply the
 * tick it jumped to. That is a defensible boundary for a D.S. or a
 * manual seek -- but it left every ordinary two-bar drum repeat with a
 * cursor that simply stopped at the repeat barline, which a reader
 * reported as exactly the bug it is. A repeat is written IN THE FILE;
 * reading what the file says is this engine's job. The boundary stays
 * where it belongs: the engine says where the music goes, the host still
 * decides what to draw and when.
 */
export interface RepeatPlan {
  readonly entries: readonly PerformanceEntry[];
  /** Total length of the performance, in ticks -- longer than the written score whenever anything repeats. */
  readonly totalTicks: number;
  /** Total length of the performance, in seconds. */
  readonly totalSeconds: number;
  /** False when the score has no repeat marks at all, in which case performance time and written time are the same thing. */
  readonly hasRepeats: boolean;
}

/**
 * The most times any one measure may be played before the resolver
 * gives up and reports `REPEAT_RUNAWAY`.
 *
 * A malformed file CAN describe an endless repeat (a backward repeat
 * with no forward one before it, inside a section that itself repeats,
 * is enough), and an unfolder that trusts its input will happily build
 * an array until the process dies. 64 is far above any real musical
 * repeat count and far below anything that hurts.
 */
const MAX_PASSES_PER_MEASURE = 64;

/** MusicXML's own default for `<repeat direction="backward">` with no `times`: play the section twice. */
export const DEFAULT_REPEAT_TIMES = 2;

/** The written order, played once through -- what a score with no repeats resolves to, and the fallback when resolution gives up. */
function straightThrough(measures: readonly RepeatMeasureSpec[]): readonly number[] {
  return measures.map((m) => m.measureNumber);
}

/**
 * Resolves the written measures into the INDEX order they are played
 * in, honouring repeat begin/end barlines (including `times="4"` and
 * friends), nested repeats, and first/second/nth-time voltas.
 *
 * Returned as indices rather than measure numbers because a measure
 * number is not a key here: the same measure legitimately appears many
 * times, and files exist whose measure numbers repeat or are missing
 * ("X1", pickup bars numbered 0).
 */
function resolveOrder(measures: readonly RepeatMeasureSpec[]): {
  readonly order: readonly number[];
  readonly diagnostics: readonly RepeatDiagnostic[];
} {
  const diagnostics: RepeatDiagnostic[] = [];
  const n = measures.length;
  if (n === 0) return { order: [], diagnostics };

  const order: number[] = [];
  /** Sections currently open, innermost last. The bottom entry is the implicit "from the top" section every score has. */
  const sections: { start: number; pass: number }[] = [{ start: 0, pass: 1 }];
  /** How many times each repeat-end barline has already sent us back, keyed by its measure index. */
  const taken = new Map<number, number>();
  const playCount = new Map<number, number>();

  /**
   * Where to resume when the measure at `from` opens a volta this pass
   * is not part of: the next volta that DOES include this pass, or, if
   * there is none, the first measure after the whole volta block.
   */
  const skipTarget = (from: number, pass: number): number => {
    for (let j = from + 1; j < n; j++) {
      const numbers = measures[j]?.endingStart;
      if (numbers !== undefined && numbers.includes(pass)) return j;
    }
    for (let j = from; j < n; j++) {
      if (measures[j]?.endingStop === true) return j + 1;
    }
    return n;
  };

  let i = 0;
  while (i < n) {
    const measure = measures[i];
    if (measure === undefined) break;

    const section = sections[sections.length - 1] ?? { start: 0, pass: 1 };
    if (measure.repeatStart && section.start !== i) {
      sections.push({ start: i, pass: 1 });
    }
    const current = sections[sections.length - 1] ?? { start: 0, pass: 1 };

    // A volta for a different pass: jump over it rather than playing it.
    const endingStart = measure.endingStart;
    if (endingStart !== undefined && !endingStart.includes(current.pass)) {
      const target = skipTarget(i, current.pass);
      if (target <= i) break; // never move backwards here -- that is a loop
      i = target;
      continue;
    }

    const plays = (playCount.get(i) ?? 0) + 1;
    playCount.set(i, plays);
    if (plays > MAX_PASSES_PER_MEASURE) {
      diagnostics.push(
        repeatDiagnostic(
          'warning',
          'REPEAT_RUNAWAY',
          `Measure ${measure.measureNumber} would be played more than ${MAX_PASSES_PER_MEASURE} times; ` +
            'the repeat structure does not terminate. Playing the score straight through instead.',
        ),
      );
      return { order: straightThrough(measures).map((_, index) => index), diagnostics };
    }
    order.push(i);

    const times = measure.repeatEndTimes;
    if (times !== undefined) {
      const already = (taken.get(i) ?? 0) + 1;
      taken.set(i, already);
      if (already < times) {
        // Re-entering the section resets any repeat NESTED inside it --
        // an inner 2x repeat plays twice on each outer pass, not only on
        // the first. Its own counter is the thing that has to be
        // forgotten, and only for the span being replayed.
        for (const index of [...taken.keys()]) {
          if (index >= current.start && index < i) taken.delete(index);
        }
        current.pass = already + 1;
        i = current.start;
        continue;
      }
      // Exhausted: this section is finished, so it stops being the one
      // an enclosing repeat-end would jump back into.
      if (sections.length > 1 && current.start !== 0) sections.pop();
      taken.delete(i);
    }

    i++;
  }

  return { order, diagnostics };
}

export interface BuildRepeatPlanInput {
  readonly measures: readonly RepeatMeasureSpec[];
  /** Each measure's own tick offset in the WRITTEN score -- `PlaybackData.globalTickOffsetByMeasure`. */
  readonly writtenTickByMeasure: ReadonlyMap<number, number>;
  readonly tempoMap: TempoMap;
}

/**
 * Unfolds a score's repeats into a `RepeatPlan`: for every measure, every
 * time it is played, where that playing sits in performance time and
 * which written measure it is.
 */
export function buildRepeatPlan(input: BuildRepeatPlanInput): {
  readonly plan: RepeatPlan;
  readonly diagnostics: readonly RepeatDiagnostic[];
} {
  const { measures, writtenTickByMeasure, tempoMap } = input;
  const hasRepeats = measures.some(
    (m) => m.repeatStart || m.repeatEndTimes !== undefined || m.endingStart !== undefined,
  );
  const { order, diagnostics } = resolveOrder(measures);

  const entries: PerformanceEntry[] = [];
  const passByIndex = new Map<number, number>();
  let performanceTick = 0;
  let startSeconds = 0;
  for (const index of order) {
    const measure = measures[index];
    if (measure === undefined) continue;
    const pass = (passByIndex.get(index) ?? 0) + 1;
    passByIndex.set(index, pass);

    const writtenTick = writtenTickByMeasure.get(measure.measureNumber) ?? 0;
    const writtenStartSeconds = tickToSeconds(tempoMap, writtenTick);
    entries.push({
      measureNumber: measure.measureNumber,
      ticks: measure.ticks,
      performanceTick,
      writtenTick,
      startSeconds,
      writtenStartSeconds,
      pass,
    });
    performanceTick += measure.ticks;
    // This measure's own duration at ITS OWN place in the written tempo
    // map -- not a constant, and not the previous measure's: a repeated
    // section crossing a tempo change takes a different amount of real
    // time on each pass only if the tempo map says so, and this reads
    // that rather than assuming either way.
    startSeconds += tickToSeconds(tempoMap, writtenTick + measure.ticks) - writtenStartSeconds;
  }

  return {
    plan: {
      entries,
      totalTicks: performanceTick,
      totalSeconds: startSeconds,
      hasRepeats,
    },
    diagnostics,
  };
}

/** The last entry starting at or before `performanceTick` -- binary search over a strictly increasing list. */
function entryAtPerformanceTick(plan: RepeatPlan, performanceTick: number): number {
  const entries = plan.entries;
  if (entries.length === 0) return -1;
  let low = 0;
  let high = entries.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((entries[mid]?.performanceTick ?? 0) <= performanceTick) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** The last entry starting at or before `seconds`. */
function entryAtSeconds(plan: RepeatPlan, seconds: number): number {
  const entries = plan.entries;
  if (entries.length === 0) return -1;
  let low = 0;
  let high = entries.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((entries[mid]?.startSeconds ?? 0) <= seconds) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** Where one moment of the performance is: which written tick it plays, and which time through. */
export interface PerformancePoint {
  /** The WRITTEN tick -- pass this to `playheadX`/`positionToX`, which know nothing of repeats. */
  readonly writtenTick: number;
  readonly performanceTick: number;
  readonly measureNumber: number;
  /** 1-based: the how-many-th time through that measure. A host showing "2 of 4" reads this. */
  readonly pass: number;
}

/** Maps a tick in performance order onto the written tick it plays. */
export function performanceTickToWritten(
  plan: RepeatPlan,
  performanceTick: number,
): PerformancePoint {
  const index = entryAtPerformanceTick(plan, performanceTick);
  const entry = plan.entries[index];
  if (entry === undefined) {
    return { writtenTick: performanceTick, performanceTick, measureNumber: 0, pass: 1 };
  }
  const within = Math.min(Math.max(0, performanceTick - entry.performanceTick), entry.ticks);
  return {
    writtenTick: entry.writtenTick + within,
    performanceTick,
    measureNumber: entry.measureNumber,
    pass: entry.pass,
  };
}

/**
 * Maps a moment of audio playback (seconds from the start of the
 * performance) onto the written tick sounding then.
 *
 * Goes through the WRITTEN tempo map deliberately: the same measure
 * played twice has one tempo curve, written once, and re-deriving it
 * per pass would be a second source of truth that could drift from the
 * first.
 */
export function performanceSecondsToWritten(
  plan: RepeatPlan,
  tempoMap: TempoMap,
  seconds: number,
): PerformancePoint {
  const index = entryAtSeconds(plan, seconds);
  const entry = plan.entries[index];
  if (entry === undefined) {
    const tick = secondsToTick(tempoMap, seconds);
    return { writtenTick: tick, performanceTick: tick, measureNumber: 0, pass: 1 };
  }
  const intoMeasure = Math.max(0, seconds - entry.startSeconds);
  const writtenTick = secondsToTick(tempoMap, entry.writtenStartSeconds + intoMeasure);
  const clamped = Math.min(
    Math.max(writtenTick, entry.writtenTick),
    entry.writtenTick + entry.ticks,
  );
  return {
    writtenTick: clamped,
    performanceTick: entry.performanceTick + (clamped - entry.writtenTick),
    measureNumber: entry.measureNumber,
    pass: entry.pass,
  };
}

/**
 * Every performance tick at which `writtenTick` is played -- the inverse
 * of `performanceTickToWritten`, which is one-to-many exactly because a
 * repeated bar is played more than once.
 */
export function writtenTickToPerformanceTicks(
  plan: RepeatPlan,
  writtenTick: number,
): readonly number[] {
  const out: number[] = [];
  for (const entry of plan.entries) {
    if (writtenTick >= entry.writtenTick && writtenTick < entry.writtenTick + entry.ticks) {
      out.push(entry.performanceTick + (writtenTick - entry.writtenTick));
    }
  }
  return out;
}
