import type { MeasureEvent, Note, Score } from '../core/index.js';
import { isPitched, midiNoteNumber } from '../core/pitch.js';
import { tickToSeconds } from '../timing/tick-seconds.js';
import type { TempoMap } from '../timing/tempo-map.js';
import type { MidiInstrumentInfo } from '../parser/musicxml/instrument.js';
import type { DirectionEvent } from '../parser/musicxml/parse.js';
import type { ParsedDynamicLevel } from '../parser/musicxml/direction.js';
import { DEFAULT_VELOCITY, velocityForDynamic } from './dynamics.js';

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
  /**
   * How loud this event sounds, from the last dynamic marking at or
   * before it. A score with no dynamics gets `DEFAULT_VELOCITY`, so a
   * host can always read this rather than guessing its own.
   */
  readonly velocity?: number;
  /**
   * True when a tie from the previous event continues into this one.
   * The note is the same note still held, so a host must NOT strike it
   * again -- sounding it twice is the audible symptom of ignoring this.
   */
  readonly tiedFromPrevious?: boolean;
  /**
   * The whole tie chain's sounding length, in ticks, set on the event
   * that STARTS the chain. A note tied across a barline is one note as
   * far as the ear is concerned, so a host schedules one note-off at the
   * end of this, not at `durationTicks`.
   */
  readonly tieChainDurationTicks?: number;
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
  /**
   * Every `<direction>` the score carries, so a dynamic marking becomes
   * a velocity. Omitted means the score states no dynamics, and every
   * note sounds at `DEFAULT_VELOCITY`.
   */
  directions?: readonly DirectionEvent[],
): readonly NotationEvent[] {
  const events: NotationEvent[] = [];
  /** The measure event each entry of `events` came from, so ties can be read off the notation. */
  const written: MeasureEvent[] = [];
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
              velocity: DEFAULT_VELOCITY,
            });
            written.push(event);
          }
          tickInMeasure = startTick + event.duration.ticks;
        });
      }
    }
  }
  // Sort the events and their sources together: `resolveTies` pairs them
  // positionally, so a sort that moved one and not the other would pair a
  // note with someone else's tie.
  const order = events
    .map((_, index) => index)
    .sort((a, b) => (events[a]?.tick ?? 0) - (events[b]?.tick ?? 0));
  const sortedEvents = order.flatMap((index) => {
    const event = events[index];
    return event === undefined ? [] : [event];
  });
  const sortedWritten = order.flatMap((index) => {
    const event = written[index];
    return event === undefined ? [] : [event];
  });
  applyDynamics(sortedEvents, sortedWritten, directions, globalTickOffsetByMeasure);
  return sortedEvents;
}

/**
 * Marks the events that a tie holds over, and gives the first event of
 * each chain the chain's whole sounding length.
 *
 * `voiceEvents` is one voice's events in tick order; the result replaces
 * them in place.
 */
function resolveTies(
  voiceEvents: readonly NotationEvent[],
  written: readonly MeasureEvent[],
): void {
  // A tie holds a pitch WITHIN one voice: the same pitch in another voice
  // at the same time is a different note, and pairing the two would hold
  // one of them over forever. The voice is recoverable from the event id
  // (`part#m1#v1#e0`), which is why this groups rather than walking the
  // whole stream.
  const groups = new Map<string, number[]>();
  voiceEvents.forEach((event, index) => {
    const key = voiceKeyOf(event);
    const list = groups.get(key) ?? [];
    list.push(index);
    groups.set(key, list);
  });
  for (const indices of groups.values()) resolveTiesInVoice(voiceEvents, written, indices);
}

/** `${partId}#v${voiceId}` from an event id, so a chain never crosses a voice. */
function voiceKeyOf(event: NotationEvent): string {
  const id = event.noteIds[0] ?? '';
  const match = /^(.*)#m\d+#v(\d+)#e\d+$/.exec(id);
  return match ? `${match[1]}#v${match[2]}` : id;
}

function resolveTiesInVoice(
  voiceEvents: readonly NotationEvent[],
  written: readonly MeasureEvent[],
  indices: readonly number[],
): void {
  /** Open chains, keyed by the exact MIDI note set they sound -- a tie holds a pitch, so only an identical set continues it. */
  const open = new Map<string, number>();
  // An event with no MIDI notes has no pitch to hold, so it can neither
  // open nor continue a chain -- giving it a key would tie it to every
  // other pitchless event in the voice.
  const keyOf = (event: NotationEvent) =>
    event.midiNotes === undefined ? undefined : event.midiNotes.join(',');
  for (const index of indices) {
    const event = voiceEvents[index];
    const source = written[index];
    if (event === undefined || source === undefined) continue;
    const key = keyOf(event);
    if (key === undefined) continue;
    const head = open.get(key);
    const headEvent = head === undefined ? undefined : voiceEvents[head];
    if (hasTieStop(source) && headEvent !== undefined) {
      (event as { tiedFromPrevious?: boolean }).tiedFromPrevious = true;
      const chain = headEvent as { tieChainDurationTicks?: number };
      chain.tieChainDurationTicks =
        (chain.tieChainDurationTicks ?? headEvent.durationTicks) + event.durationTicks;
      if (!hasTieStart(source)) open.delete(key);
      continue;
    }
    if (hasTieStart(source)) open.set(key, index);
    else open.delete(key);
  }
}

/** True when any notehead of this event starts a tie. */
function hasTieStart(event: MeasureEvent): boolean {
  return notesOf(event).some((note) => note.tieStart === true);
}

/** True when any notehead of this event ends a tie. */
function hasTieStop(event: MeasureEvent): boolean {
  return notesOf(event).some((note) => note.tieStop === true);
}

function notesOf(event: MeasureEvent): readonly Note[] {
  if (event.kind === 'note') return [event];
  if (event.kind === 'chord') return event.notes;
  return [];
}

/**
 * Applies every dynamic marking to the notes after it.
 *
 * A dynamic is a direction, not a note property: `<dynamics><p/></dynamics>`
 * says "from here on, play softly" and stays in force until the next one.
 * This walks each part's events in tick order alongside that part's
 * directions, so a note written before any marking keeps the default and
 * one written after `pp` sounds at `pp` -- which is what the page shows.
 */
function applyDynamics(
  events: readonly NotationEvent[],
  written: readonly MeasureEvent[],
  directions: readonly DirectionEvent[] | undefined,
  globalTickOffsetByMeasure: ReadonlyMap<number, number>,
): void {
  resolveTies(events, written);
  if (directions === undefined || directions.length === 0) return;
  const byPart = new Map<string, { tick: number; level: ParsedDynamicLevel }[]>();
  for (const direction of directions) {
    const level = direction.dynamics[0];
    if (level === undefined) continue;
    // A direction's `tick` is measure-local; a note's is global. Converting
    // here is what keeps the comparison honest across a bar line.
    const tick = (globalTickOffsetByMeasure.get(direction.measureNumber) ?? 0) + direction.tick;
    const list = byPart.get(direction.partId) ?? [];
    list.push({ tick, level });
    byPart.set(direction.partId, list);
  }
  for (const list of byPart.values()) list.sort((a, b) => a.tick - b.tick);

  // One cursor per part: each part's own markings apply to its own notes,
  // so a single shared cursor would let one part consume another's.
  const cursorByPart = new Map<string, number>();
  const levelByPart = new Map<string, ParsedDynamicLevel>();
  for (const event of events) {
    const marks = byPart.get(event.partId);
    if (marks === undefined) continue;
    let cursor = cursorByPart.get(event.partId) ?? 0;
    let level = levelByPart.get(event.partId);
    for (;;) {
      const mark = marks[cursor];
      if (mark === undefined || mark.tick > event.tick) break;
      level = mark.level;
      cursor += 1;
    }
    cursorByPart.set(event.partId, cursor);
    if (level !== undefined) {
      levelByPart.set(event.partId, level);
      (event as { velocity?: number }).velocity = velocityForDynamic(level);
    }
  }
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
