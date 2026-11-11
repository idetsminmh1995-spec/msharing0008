/**
 * Convert written-score drum events into the ordered note-list input used by
 * the sticking solver. A written event can occur more than once in playback
 * when the score contains repeats; the performance plan is authoritative.
 */
import type { NoteListEntry } from './rule01-input.js';

export interface WrittenNoteListEntry {
  readonly writtenTick: number;
  readonly note: number;
  readonly velocity?: number;
  readonly channel?: number;
  readonly trackName?: string;
}

/** The subset of notation-engine RepeatPlan entries required by this adapter. */
export interface PerformanceMeasureEntry {
  readonly performanceTick: number;
  readonly writtenTick: number;
  readonly ticks: number;
  readonly startSeconds: number;
  readonly writtenStartSeconds: number;
}

function asNoteListEntry(note: WrittenNoteListEntry, time: number): NoteListEntry {
  return {
    time,
    note: note.note,
    ...(note.velocity !== undefined ? { velocity: note.velocity } : {}),
    ...(note.channel !== undefined ? { channel: note.channel } : {}),
    ...(note.trackName !== undefined ? { trackName: note.trackName } : {}),
  };
}

/**
 * Expand each note at its written tick into every occurrence in playback
 * order. `tickToSeconds` converts WRITTEN ticks using the score tempo map;
 * its difference from the measure's written downbeat preserves tempo changes
 * while `startSeconds` places each repeat pass on the performance timeline.
 * A supplied plan is authoritative: notes in a written measure omitted by
 * playback (for example, an unselected volta ending) are intentionally omitted.
 * With no plan, notes fall back to straight-through written time.
 */
export function expandWrittenNoteList(
  notes: readonly WrittenNoteListEntry[],
  performanceEntries: readonly PerformanceMeasureEntry[],
  tickToSeconds: (writtenTick: number) => number,
): NoteListEntry[] {
  const orderedNotes = notes
    .map((note, sourceOrder) => ({ note, sourceOrder }))
    .sort((a, b) => a.note.writtenTick - b.note.writtenTick || a.sourceOrder - b.sourceOrder);

  if (performanceEntries.length === 0) {
    return orderedNotes.map(({ note }) => asNoteListEntry(note, tickToSeconds(note.writtenTick)));
  }

  const occurrences: NoteListEntry[] = [];
  const orderedEntries = [...performanceEntries].sort(
    (a, b) => a.performanceTick - b.performanceTick,
  );
  const writtenSeconds = orderedNotes.map(({ note }) => tickToSeconds(note.writtenTick));

  for (const entry of orderedEntries) {
    for (let index = 0; index < orderedNotes.length; index++) {
      const item = orderedNotes[index];
      const noteSeconds = writtenSeconds[index];
      if (item === undefined || noteSeconds === undefined) continue;
      const { note } = item;
      if (
        note.writtenTick < entry.writtenTick ||
        note.writtenTick >= entry.writtenTick + entry.ticks
      ) {
        continue;
      }

      // The written tempo map supplies the within-measure offset; the
      // performance plan supplies the downbeat for this specific pass.
      const time = entry.startSeconds + (noteSeconds - entry.writtenStartSeconds);
      occurrences.push(asNoteListEntry(note, time));
    }
  }

  return occurrences.sort((a, b) => a.time - b.time);
}
