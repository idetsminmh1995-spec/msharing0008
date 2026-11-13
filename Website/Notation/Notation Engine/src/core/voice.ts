import type { MeasureEvent } from './measure-event.js';
import type { VoiceId } from './note.js';

/**
 * One voice's sequence of events within a single Measure, in chronological
 * order. Multiple Voices on one Part/staff is how Phase 31/32 (SATB choir
 * on one staff, piano LH/RH split, drum hand/foot split) get built on top
 * of this -- nothing here assumes exactly one voice per measure.
 */
export interface Voice {
  readonly id: VoiceId;
  readonly events: readonly MeasureEvent[];
}

export function voice(id: VoiceId, events: readonly MeasureEvent[]): Voice {
  return { id, events };
}
