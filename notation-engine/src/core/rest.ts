import type { Duration } from './duration.js';
import type { VoiceId } from './note.js';

/** A silence -- has a Duration and a Voice, but no Pitch at all (not even an unpitched display position). */
export interface Rest {
  readonly kind: 'rest';
  readonly duration: Duration;
  readonly voice: VoiceId;
  readonly staff?: number;
}

export interface RestInit {
  duration: Duration;
  voice: VoiceId;
  staff?: number;
}

export function rest(init: RestInit): Rest {
  return { kind: 'rest', ...init };
}
