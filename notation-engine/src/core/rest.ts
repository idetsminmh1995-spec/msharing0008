import type { Duration } from './duration.js';
import type { VoiceId } from './note.js';

/** A silence -- has a Duration and a Voice, but no Pitch at all (not even an unpitched display position). */
export interface Rest {
  readonly kind: 'rest';
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
