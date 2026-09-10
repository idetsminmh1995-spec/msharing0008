import type { Duration } from './duration.js';
import type { Note, VoiceId } from './note.js';

/**
 * Two or more Notes sounding together at the same tick, in the same voice.
 * Every member note MUST share the same duration/voice/staff -- that's what
 * makes them one chord instead of separate sequential notes. Enforced by
 * the chord() factory below rather than left for every caller to get right
 * independently.
 */
export interface Chord {
  readonly kind: 'chord';
  readonly notes: readonly Note[];
  readonly duration: Duration;
  readonly voice: VoiceId;
  readonly staff?: number;
}

export function chord(notes: readonly Note[]): Chord {
  const [firstNote, ...otherNotes] = notes;
  if (firstNote === undefined || otherNotes.length === 0) {
    throw new Error('A Chord needs at least 2 notes -- use note() directly for a single notehead.');
  }
  for (const n of otherNotes) {
    if (n.voice !== firstNote.voice) {
      throw new Error('All notes in a Chord must share the same voice.');
    }
    if (n.duration.ticks !== firstNote.duration.ticks) {
      throw new Error('All notes in a Chord must share the same duration.');
    }
    if (n.staff !== firstNote.staff) {
      throw new Error('All notes in a Chord must share the same staff.');
    }
  }
  return firstNote.staff === undefined
    ? { kind: 'chord', notes, duration: firstNote.duration, voice: firstNote.voice }
    : {
        kind: 'chord',
        notes,
        duration: firstNote.duration,
        voice: firstNote.voice,
        staff: firstNote.staff,
      };
}
