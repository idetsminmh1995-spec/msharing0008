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
  /**
   * Where this event starts within its measure, in ticks.
   *
   * Set by the parser from §10.1's own cursor, which honours `<backup>`
   * and `<forward>`. It is NOT redundant with summing the durations
   * before it: a voice can legitimately have GAPS (a `<forward>` skips
   * time without writing a rest, which is how MuseScore writes a kick
   * drum that plays on beats 1 and 3 and nothing in between) and can
   * legitimately start partway into the measure. Summing durations
   * silently pulls every event after a gap too early -- on this
   * project's own drum file that put the kick's beamed pair on beat 2
   * instead of beat 3.
   *
   * Optional because a hand-built `Score` (tests, a future editor) may
   * not set it; consumers fall back to the running sum, which is exactly
   * right for a voice with no gaps.
   */
  readonly startTick?: number;
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
