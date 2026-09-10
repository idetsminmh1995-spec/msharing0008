import type { Duration } from './duration.js';
import type { Pitch } from './pitch.js';

/**
 * Voice number within a Part -- matches MusicXML's <voice> element. Phase
 * 31/32 build real multi-voice handling (collision avoidance, rest
 * separation) on top of this; here it's just an identifying number.
 */
export type VoiceId = number;

/**
 * A single sounding note -- pitched or unpitched, doesn't matter, both use
 * this same type (see pitch.ts). Multiple Notes at the same tick within the
 * same Voice form a Chord (see chord.ts); a bare Note is always exactly one
 * notehead on its own.
 */
export interface Note {
  readonly kind: 'note';
  readonly pitch: Pitch;
  readonly duration: Duration;
  readonly voice: VoiceId;
  /**
   * Staff number within the Part, for multi-staff instruments like piano
   * (Phase 15's grand staff). Omitted means "the part's only staff."
   */
  readonly staff?: number;
  readonly tieStart?: boolean;
  readonly tieStop?: boolean;
}

export interface NoteInit {
  pitch: Pitch;
  duration: Duration;
  voice: VoiceId;
  staff?: number;
  tieStart?: boolean;
  tieStop?: boolean;
}

export function note(init: NoteInit): Note {
  return { kind: 'note', ...init };
}
