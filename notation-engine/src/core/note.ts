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
  /** Phase 35/§10.4: an explicit <notehead> override from the file (e.g. "x", "diamond") -- Phase 15's selectNoteheadGlyphName's highest-priority tier. */
  readonly explicitNotehead?: string;
  /** Phase 35/§10.4: true if this note is a <grace/> note. */
  readonly isGrace?: boolean;
  /** Phase 35/§10.4: the grace note's slash attribute -- true for an acciaccatura, false for an appoggiatura. Meaningless unless isGrace is true. */
  readonly graceSlash?: boolean;
  /** Phase 35/§10.4: an explicit <stem> direction from the file -- Phase 16's resolveStemDirection explicitDirection tier. */
  readonly explicitStemDirection?: 'up' | 'down';
  /** Phase 35/§10.4: an explicit <accidental> element's presence -- Phase 19's evaluateAccidental hasExplicitAccidental (courtesy-accidental) parameter. */
  readonly hasExplicitAccidental?: boolean;
}

export interface NoteInit {
  pitch: Pitch;
  duration: Duration;
  voice: VoiceId;
  staff?: number;
  tieStart?: boolean;
  tieStop?: boolean;
  explicitNotehead?: string;
  isGrace?: boolean;
  graceSlash?: boolean;
  explicitStemDirection?: 'up' | 'down';
  hasExplicitAccidental?: boolean;
}

export function note(init: NoteInit): Note {
  return { kind: 'note', ...init };
}
