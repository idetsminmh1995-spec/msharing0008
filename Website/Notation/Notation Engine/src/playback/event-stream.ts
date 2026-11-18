import type { MeasureEvent, Note, Score } from '../core/index.js';
import { isPitched, midiNoteNumber } from '../core/pitch.js';
import { tickToSeconds } from '../timing/tick-seconds.js';
import type { TempoMap } from '../timing/tempo-map.js';
import type { MidiInstrumentInfo } from '../parser/musicxml/instrument.js';

/** A pitch in the engine's scientific octave representation converted to a MIDI note number. */
function midiNoteForEvent(event: MeasureEvent, transposeSemitones: number): readonly number[] {
  const notes = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
  return notes.flatMap((note) => {
    const midi = midiNoteNumber(note.pitch, transposeSemitones);
    return midi === undefined ? [] : [midi];
  });
}

/**
 * An unpitched percussion note's MIDI key number, from the part's
 * `<midi-instrument>` map: a `<note><instrument id="...">` names which
 * drum it is, and that id resolves to a GM percussion note. Without it
 * there is no way to know WHICH drum a display position means -- the
 * display position is layout, not identity -- so a note with no resolved
 * GM number stays silent rather than guessing.
 */
function percussionMidiNotesForEvent(
  event: MeasureEvent,
  instruments: ReadonlyMap<string, MidiInstrumentInfo> | undefined,
): readonly number[] {
  if (instruments === undefined) return [];
  const notes = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
  return notes.flatMap((note: Note) => {
    if (isPitched(note.pitch) || note.instrumentId === undefined) return [];
    const gmNote = instruments.get(note.instrumentId)?.gmNote;
    return gmNote !== undefined ? [gmNote] : [];
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
  /**
   * MusicXML `<transpose>` semitones per `${partId}:${measureNumber}`,
   * applied to the MIDI numbers so playback sounds at concert pitch
   * while the drawn notation stays at written pitch (see
   * `core/pitch.ts`'s `soundingPitch()`). Omitted means no part
   * transposes, which is every score that carries no `<transpose>`.
   */
  transposeSemitonesByPartAndMeasure?: ReadonlyMap<string, number>,
  /**
   * Each part's `<midi-instrument>` map, so an unpitched percussion note
   * resolves to a real GM key number and actually sounds. Omitted means no
   * part carries percussion routing, so unpitched notes stay silent (they
   * have no other way to name their drum).
   */
  midiInstrumentsByPart?: ReadonlyMap<string, ReadonlyMap<string, MidiInstrumentInfo>>,
): readonly NotationEvent[] {
  const events: NotationEvent[] = [];
  for (const part of score.parts) {
    const instruments = midiInstrumentsByPart?.get(part.id);
    for (const measure of part.measures) {
      const offset = globalTickOffsetByMeasure.get(measure.number) ?? 0;
      const transposeSemitones =
        transposeSemitonesByPartAndMeasure?.get(`${part.id}:${measure.number}`) ?? 0;
      for (const voice of measure.voices) {
        let tickInMeasure = 0;
        voice.events.forEach((event, index) => {
          const startTick = event.startTick ?? tickInMeasure;
          const noteIds = noteIdsForEvent(part.id, measure.number, voice.id, index, event);
          if (noteIds.length > 0) {
            const tick = offset + startTick;
            const midiNotes = [
              ...midiNoteForEvent(event, transposeSemitones),
              ...percussionMidiNotesForEvent(event, instruments),
            ];
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
