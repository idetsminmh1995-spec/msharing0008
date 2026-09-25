/**
 * stages.ts — cutting the part into moments (Plan SV-01..04).
 *
 * A stage is one instant at which something starts: a single note or
 * a whole chord. The solver walks stages, not notes, because what the
 * left hand has to do is decided by everything sounding at once, and
 * because the interesting question -- how long has the hand got to get
 * there -- is a question about the gap between two stages.
 */
import type { NoteEvent, Stage } from '../core/types.js';

export interface StageConfig {
  /** [SV-02] onsets closer together than this are one stage. */
  readonly onsetToleranceSec: number;
  /** [SV-04] a silence at least this long starts a new segment. */
  readonly segmentGapSec: number;
}

export interface SolveStage extends Stage {
  /** Seconds since the previous stage started. */
  readonly dt: number;
  /** [SV-03] how long the hand is actually free to move before this onset. */
  readonly freeTime: number;
  /** [LH-13] how far back the hand could have started moving if the last stage was all open strings. */
  readonly openWindow: number;
  /** [SV-04] true when nothing was sounding for a while: no transition cost from the stage before. */
  readonly segmentStart: boolean;
}

/**
 * [SV-01/SV-02] Group the notes into onset moments.
 *
 * MusicXML gives exact ticks, so its chords land on identical times;
 * MIDI comes from a person's hands and needs the tolerance, which is
 * why the same grouping serves both (IN-M07 keeps real timing rather
 * than quantizing it away).
 */
export function buildStages(
  notes: readonly NoteEvent[],
  config: StageConfig,
  canPlayOpen: (pitch: number) => boolean,
): readonly SolveStage[] {
  const ordered = [...notes].sort((a, b) => a.time - b.time || a.pitch - b.pitch);
  const groups: NoteEvent[][] = [];
  for (const note of ordered) {
    const current = groups[groups.length - 1];
    const first = current?.[0];
    if (
      current !== undefined &&
      first !== undefined &&
      note.time - first.time <= config.onsetToleranceSec
    ) {
      current.push(note);
    } else {
      groups.push([note]);
    }
  }

  const stages: SolveStage[] = [];
  let lastFrettedTime = Number.NEGATIVE_INFINITY;
  // Walked forward with a running list of what is still ringing and a
  // running latest end, rather than re-scanning every earlier note at
  // every stage: a five-minute solo has thousands of stages, and
  // re-scanning turns the stage builder into the slowest thing in the
  // engine (01 §5's two-second budget).
  let sounding: NoteEvent[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;

  for (const [index, onsets] of groups.entries()) {
    const time = onsets[0]?.time ?? 0;
    const previousGroup = groups[index - 1];
    const previous = stages[index - 1];

    // [SV-10] what is still ringing from before and must keep its finger.
    sounding = sounding.filter((note) => note.time + note.duration > time + 1e-6);
    const sustained = sounding.filter((note) => note.time < time - config.onsetToleranceSec);

    // [SV-03] the hand is free from the moment the previous notes may
    // be released. A note cut short by this very onset releases here,
    // so a fast passage reports almost no free time -- which is the
    // point: that is what makes a rushed shift expensive.
    const release =
      previousGroup === undefined
        ? time
        : Math.max(...previousGroup.map((note) => Math.min(note.time + note.duration, time)));
    const dt = previous === undefined ? 0 : time - previous.time;
    const freeTime = previousGroup === undefined ? Infinity : Math.max(0, time - release);

    // [SV-04] a long silence means the next phrase starts fresh: the
    // player's hand went wherever it liked in between, so charging for
    // the move would be inventing a difficulty nobody felt.
    const segmentStart = index === 0 || time - lastEnd >= config.segmentGapSec;

    // [LH-13] an open string rings on its own, so the hand may already
    // be travelling while it sounds. How far back that window reaches
    // is the last moment something HAD to be fretted.
    const openWindow =
      lastFrettedTime === Number.NEGATIVE_INFINITY ? Infinity : time - lastFrettedTime;
    if (onsets.some((note) => !canPlayOpen(note.pitch))) lastFrettedTime = time;

    stages.push({ index, time, onsets, sustained, dt, freeTime, openWindow, segmentStart });

    for (const note of onsets) {
      sounding.push(note);
      lastEnd = Math.max(lastEnd, note.time + note.duration);
    }
  }

  return stages;
}
