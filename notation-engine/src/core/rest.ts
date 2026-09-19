import type { Duration } from './duration.js';
import type { VoiceId } from './note.js';

/** A silence -- has a Duration and a Voice, but no Pitch at all (not even an unpitched display position). */
export interface Rest {
  readonly kind: 'rest';
  readonly duration: Duration;
  readonly voice: VoiceId;
  readonly staff?: number;
  /** Phase 35 Tier 2/§10.4: `<notations><fermata>` -- a rest can carry one exactly as a note can. Parsed and preserved; §9 has no fermata placement section yet, so nothing draws it. */
  readonly hasFermata?: boolean;
}

export interface RestInit {
  duration: Duration;
  voice: VoiceId;
  staff?: number;
  hasFermata?: boolean;
}

export function rest(init: RestInit): Rest {
  return { kind: 'rest', ...init };
}
