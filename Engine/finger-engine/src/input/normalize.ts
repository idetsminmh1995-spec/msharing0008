/**
 * normalize.ts — the last stop before the solver (Plan Part 03 §C).
 *
 * Whatever road a part came in by -- the Notation Engine, a MusicXML
 * file, a MIDI file -- it leaves here in one shape: notes in time
 * order, in seconds, every one of them playable on the instrument.
 * Everything after this point can stop asking where the notes came
 * from.
 */
import type { InstrumentSpec, NoteEvent, ParsedPart } from '../core/types.js';
import { tickToSeconds } from '../core/tempo.js';
import { pitchAt, pitchRange } from '../core/tuning.js';
import type { EngineWarning } from '../core/timeline-schema.js';

export interface NormalizeConfig {
  /** [IN-X23] how long a grace note is given, in seconds. */
  readonly graceDurationSec: number;
  /** [P-013] what to do with a note the instrument cannot play. */
  readonly outOfRange: 'skip' | 'clamp';
}

export interface NormalizedPart {
  readonly notes: readonly NoteEvent[];
  readonly hasTab: boolean;
  /** [IN-N04/V-01] notes whose tab and pitch disagree, so the validator does not report them twice. */
  readonly pitchTabMismatch: ReadonlySet<string>;
  readonly warnings: readonly EngineWarning[];
}

/** Two onsets closer together than this are the same note twice (IN-N02). */
const DUPLICATE_TOLERANCE_SEC = 0.005;

export function normalizePart(
  part: ParsedPart,
  instrument: InstrumentSpec,
  config: NormalizeConfig,
): NormalizedPart {
  const warnings: EngineWarning[] = [];
  const pitchTabMismatch = new Set<string>();

  // [IN-N06] seconds, from the tempo map. A part that arrived through
  // the Notation Engine already has them and is left alone: its times
  // came from the layer that owns them (IN-E01).
  const timed = part.notes.map((note) => {
    if (note.time > 0 || note.duration > 0) return note;
    const time = tickToSeconds(part.tempoMap, note.tick);
    const end = tickToSeconds(part.tempoMap, note.tick + Math.max(1, note.durationTicks));
    return { ...note, time, duration: Math.max(0, end - time) };
  });

  // [IN-N01] time order, then pitch, so a chord is always read low to high.
  const sorted = [...timed].sort((a, b) => a.time - b.time || a.pitch - b.pitch);

  // [IN-X23] a grace note is played BEFORE the note it decorates, out
  // of its time, so it is given a short real duration taken from in
  // front of the main note rather than a written one.
  const graced = placeGraceNotes(sorted, config.graceDurationSec);

  const { lowest, highest } = pitchRange(instrument);
  const kept: NoteEvent[] = [];
  let skipped = 0;

  for (const note of graced) {
    // [IN-N02] the same pitch twice at the same instant is one note.
    // Only the last few notes can be that twin -- the list is in time
    // order -- so the search walks back until it is out of the window
    // instead of over everything kept so far.
    let duplicate = false;
    for (let i = kept.length - 1; i >= 0; i--) {
      const other = kept[i] as NoteEvent;
      if (note.time - other.time > DUPLICATE_TOLERANCE_SEC) break;
      if (other.pitch === note.pitch) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) continue;

    // [IN-N03/P-013] a note the instrument cannot play is skipped, not
    // transposed: moving it would be inventing music the file does not
    // contain, and the rest of the part is unaffected.
    if (note.pitch < lowest || note.pitch > highest) {
      skipped++;
      if (config.outOfRange === 'skip') continue;
    }

    // [IN-N04] the tab says one thing and the pitch another. The tab
    // stays: the person who wrote the file put the note on that string
    // on purpose, and the audio keeps the pitch either way (IN-X13).
    if (note.lockedString !== undefined && note.lockedFret !== undefined) {
      const sounds = pitchAt(instrument, note.lockedString, note.lockedFret);
      if (sounds !== undefined && sounds !== note.pitch) pitchTabMismatch.add(note.noteId);
    }
    kept.push(note);
  }

  if (skipped > 0) {
    warnings.push({
      code: 'OUT_OF_RANGE',
      message: `${skipped} note(s) are outside this instrument's range and were skipped`,
    });
  }
  if (pitchTabMismatch.size > 0) {
    warnings.push({
      code: 'PITCH_TAB_MISMATCH',
      message: `${pitchTabMismatch.size} note(s) sound a different pitch than their written string and fret; the tab was kept`,
    });
  }

  return {
    notes: kept,
    // [IN-N05] one fully-written note is enough to make this a tab part.
    hasTab: kept.some((note) => note.lockedString !== undefined && note.lockedFret !== undefined),
    pitchTabMismatch,
    warnings,
  };
}

function placeGraceNotes(
  notes: readonly NoteEvent[],
  graceDurationSec: number,
): readonly NoteEvent[] {
  if (!notes.some((note) => note.techniques.includes('grace'))) return notes;
  const out = [...notes];
  for (let i = out.length - 1; i >= 0; i--) {
    const note = out[i];
    if (note === undefined || !note.techniques.includes('grace')) continue;
    const main = out[i + 1];
    const start = (main?.time ?? note.time) - graceDurationSec;
    out[i] = { ...note, time: start, duration: graceDurationSec };
  }
  return out.sort((a, b) => a.time - b.time || a.pitch - b.pitch);
}
