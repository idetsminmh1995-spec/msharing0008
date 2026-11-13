import type { MeasureEvent, Score } from '../core/index.js';
import { isPitched } from '../core/pitch.js';
import { tickToSeconds } from '../timing/tick-seconds.js';
import type { TempoMap } from '../timing/tempo-map.js';

/** A pitch in the engine's scientific octave representation converted to a MIDI note number. */
function midiNoteForEvent(event: MeasureEvent): readonly number[] {
  const notes = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
  return notes.flatMap((note) => {
    if (!isPitched(note.pitch)) return [];
    const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[note.pitch.step];
    const midi = (note.pitch.octave + 1) * 12 + natural + note.pitch.alter;
    return Number.isInteger(midi) && midi >= 0 && midi <= 127 ? [midi] : [];
  });
}

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
  /** Duration in ticks, for hosts that schedule a real audio note-off. */
  readonly durationTicks: number;
  /** MusicXML part ID for selecting or routing this event as one playback track. */
  readonly partId: string;
  /** One id per notehead sounding at this tick in this (part, voice). */
  readonly noteIds: readonly string[];
  /** MIDI note numbers derived from pitched MusicXML notes; unpitched notes remain host-mapped. */
  readonly midiNotes?: readonly number[];
  /** Populated only once a host runs MIDI↔MusicXML alignment. */
  readonly midiNotesAligned?: readonly number[];
  readonly measureNumber: number;
}

export function notationEventId(
  partId: string,
  measureNumber: number,
  voiceId: number,
  eventIndex: number,
): string {
  return `${partId}#m${measureNumber}#v${voiceId}#e${eventIndex}`;
}

export function elementIdForNoteId(noteId: string): string {
  const cut = noteId.lastIndexOf('#n');
  return cut === -1 ? noteId : noteId.slice(0, cut);
}

function noteIdsForEvent(
  partId: string,
  measureNumber: number,
  voiceId: number,
  eventIndex: number,
  event: MeasureEvent,
): readonly string[] {
  const base = notationEventId(partId, measureNumber, voiceId, eventIndex);
  if (event.kind === 'note') return [base];
  if (event.kind === 'chord') return event.notes.map((_, i) => `${base}#n${i}`);
  return [];
}

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
          const startTick = event.startTick ?? tickInMeasure;
          const noteIds = noteIdsForEvent(part.id, measure.number, voice.id, index, event);
          if (noteIds.length > 0) {
            const tick = offset + startTick;
            const midiNotes = midiNoteForEvent(event);
            events.push({
              tick,
              seconds: tickToSeconds(tempoMap, tick),
              durationTicks: event.duration.ticks,
              partId: part.id,
              noteIds,
              ...(midiNotes.length > 0 ? { midiNotes } : {}),
              measureNumber: measure.number,
            });
          }
          tickInMeasure = startTick + event.duration.ticks;
        });
      }
    }
  }
  events.sort((a, b) => a.tick - b.tick);
  return events;
}

export function getEventStream(playback: {
  readonly events: readonly NotationEvent[];
}): readonly NotationEvent[] {
  return playback.events;
}

export function getTrackEventStream(
  playback: { readonly events: readonly NotationEvent[] },
  partId: string,
): readonly NotationEvent[] {
  return playback.events.filter((event) => event.partId === partId);
}
