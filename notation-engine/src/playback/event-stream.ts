import type { MeasureEvent, Score } from '../core/index.js';
import { tickToSeconds } from '../timing/tick-seconds.js';
import type { TempoMap } from '../timing/tempo-map.js';

/**
 * PLAN.md §17.1: one notated event -- a bare note, or a chord (whose
 * several `noteIds` sound together) -- at the GLOBAL tick it starts on,
 * resolved to real seconds via §12's tempo map. A rest never appears
 * here; it has nothing for a host to highlight or trigger. This is the
 * stream a host app drives animation, note-highlighting or an audio
 * trigger from -- see §17.3: the engine only produces the data, it never
 * touches audio/video/animation itself.
 */
export interface NotationEvent {
  readonly tick: number;
  readonly seconds: number;
  /**
   * One id per notehead sounding at this tick in this (part, voice) --
   * length 1 for a bare note, one per member for a chord. Built as
   * `${partId}#m${measureNumber}#v${voiceId}#e${eventIndexInVoice}`,
   * with `#n${noteIndexInChord}` appended for a chord member. Stable and
   * deterministic for identical input (§4.4) -- not a randomly generated
   * id, so re-rendering the same file always produces the same ids, and
   * a host can safely persist them (e.g. "the note the user clicked").
   */
  readonly noteIds: readonly string[];
  /**
   * Populated only once a host runs §13's MIDI<->MusicXML alignment
   * (Phase 42) and threads its result back in. `renderFromMusicXml` has
   * no MIDI file to align against, so its own event stream never sets
   * this -- left as a documented gap rather than guessed at.
   */
  readonly midiNotes?: readonly number[];
  readonly measureNumber: number;
}

function noteIdsForEvent(
  partId: string,
  measureNumber: number,
  voiceId: number,
  eventIndex: number,
  event: MeasureEvent,
): readonly string[] {
  const base = `${partId}#m${measureNumber}#v${voiceId}#e${eventIndex}`;
  if (event.kind === 'note') return [base];
  if (event.kind === 'chord') return event.notes.map((_, i) => `${base}#n${i}`);
  return [];
}

/**
 * Builds the full, score-wide, tick-sorted event stream. `globalTickOffsetByMeasure`
 * must be the SAME measure -> tick-offset map `positionToX`/`xToPosition`
 * use (see `computePlaybackData`, which passes the one map to both) --
 * that is what keeps an event's own `tick` and the tick a cursor would
 * seek to reach it in exact agreement, never two independently-computed
 * numbers that could drift apart.
 */
export function buildEventStream(
  score: Score,
  globalTickOffsetByMeasure: ReadonlyMap<number, number>,
  tempoMap: TempoMap,
): readonly NotationEvent[] {
  const events: NotationEvent[] = [];
  for (const part of score.parts) {
    for (const measure of part.measures) {
      const offset = globalTickOffsetByMeasure.get(measure.number) ?? 0;
      for (const voice of measure.voices) {
        let tickInMeasure = 0;
        voice.events.forEach((event, index) => {
          const noteIds = noteIdsForEvent(part.id, measure.number, voice.id, index, event);
          if (noteIds.length > 0) {
            const tick = offset + tickInMeasure;
            events.push({
              tick,
              seconds: tickToSeconds(tempoMap, tick),
              noteIds,
              measureNumber: measure.number,
            });
          }
          tickInMeasure += event.duration.ticks;
        });
      }
    }
  }
  events.sort((a, b) => a.tick - b.tick);
  return events;
}

/** §17.1's own `getEventStream()` -- a plain accessor kept as an exported function (rather than reading `playback.events` directly) so the public shape matches the spec's own pseudocode exactly. */
export function getEventStream(playback: {
  readonly events: readonly NotationEvent[];
}): readonly NotationEvent[] {
  return playback.events;
}
