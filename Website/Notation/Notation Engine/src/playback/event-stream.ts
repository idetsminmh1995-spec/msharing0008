import type { MeasureEvent, Note, Score } from '../core/index.js';
import { isPitched, midiNoteNumber } from '../core/pitch.js';
import { tickToSeconds } from '../timing/tick-seconds.js';
import type { TempoMap } from '../timing/tempo-map.js';
import type { MidiInstrumentInfo } from '../parser/musicxml/instrument.js';
import type { DirectionEvent } from '../parser/musicxml/parse.js';
import type { ParsedDynamicLevel } from '../parser/musicxml/direction.js';
import { DEFAULT_VELOCITY, velocityForDynamic } from './dynamics.js';

/** One sounding notehead of an event, before ties are resolved. */
interface Notehead {
  readonly midi: number;
  readonly tieStart: boolean;
  readonly tieStop: boolean;
}

/**
 * The noteheads an event sounds, in written order, with their own tie
 * flags -- one entry per pitched note, plus every unpitched note whose
 * `<instrument>` resolves to a GM key number.
 *
 * Kept per notehead rather than per event because a chord ties its
 * noteheads independently: `C` can be held across a barline while `E` in
 * the same chord is struck again. A single flag on the event cannot say
 * that, so tie resolution works from this.
 *
 * An unpitched note with no resolved GM number is left out entirely: its
 * display position is layout, not identity, so it has no pitch to tie to
 * and nothing to sound.
 */
function noteheadsFor(
  event: MeasureEvent,
  transposeSemitones: number,
  instruments: ReadonlyMap<string, MidiInstrumentInfo> | undefined,
): readonly Notehead[] {
  const notes = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
  return notes.flatMap((note: Note): readonly Notehead[] => {
    if (isPitched(note.pitch)) {
      const midi = midiNoteNumber(note.pitch, transposeSemitones);
      return midi === undefined
        ? []
        : [{ midi, tieStart: note.tieStart === true, tieStop: note.tieStop === true }];
    }
    const instrumentId = note.instrumentId;
    const gmNote = instrumentId === undefined ? undefined : instruments?.get(instrumentId)?.gmNote;
    return gmNote === undefined
      ? []
      : [{ midi: gmNote, tieStart: note.tieStart === true, tieStop: note.tieStop === true }];
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
   *
   * Only set when EVERY notehead of the event is held over. A chord can
   * tie some of its notes and restrike the rest, which this one flag
   * cannot express; `sounding` is the per-notehead truth.
   */
  readonly tiedFromPrevious?: boolean;
  /**
   * The whole tie chain's sounding length, in ticks, set on the event
   * that STARTS the chain. A note tied across a barline is one note as
   * far as the ear is concerned, so a host schedules one note-off at the
   * end of this, not at `durationTicks`.
   *
   * Only set when every struck notehead of the event shares one chain
   * length; `sounding` is the per-notehead truth.
   */
  readonly tieChainDurationTicks?: number;
  /**
   * What this event actually sounds, one entry per notehead, in the order
   * `midiNotes` lists them.
   *
   * A chord ties its noteheads independently -- `C` held across the
   * barline while `E` is struck again -- which the two flags above cannot
   * say. A host that schedules audio reads this; one that only highlights
   * the page can keep using `tiedFromPrevious`.
   */
  readonly sounding?: readonly SoundingNote[];
}

/** One notehead this event sounds, and how. */
export interface SoundingNote {
  readonly midi: number;
  /** False when the notehead continues a tie: it is the same note still held. */
  readonly strike: boolean;
  /**
   * How long to hold it, in ticks, measured from this event's start. The
   * head of a tie chain carries the whole chain, so a host schedules one
   * note-off there rather than one per notehead.
   */
  readonly ticks: number;
  /**
   * `ticks` as seconds, filled in by `unfoldEvents` for a host that
   * schedules audio. Absent on the `PlaybackData.events` the renderer
   * works from.
   */
  readonly seconds?: number;
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
  /** The noteheads each entry of `events` sounds, so ties resolve per notehead. */
  const written: (readonly Notehead[])[] = [];
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
          const noteheads = noteheadsFor(event, transposeSemitones, instruments);
          if (noteIds.length > 0) {
            const tick = offset + startTick;
            events.push({
              tick,
              seconds: tickToSeconds(tempoMap, tick),
              durationTicks: event.duration.ticks,
              partId: part.id,
              noteIds,
              ...(noteheads.length > 0 ? { midiNotes: noteheads.map((note) => note.midi) } : {}),
              measureNumber: measure.number,
              velocity: DEFAULT_VELOCITY,
            });
            written.push(noteheads);
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
 * Marks the noteheads a tie holds over, and gives the head of each chain
 * the chain's whole sounding length.
 *
 * A tie joins one PITCH within one voice: the same pitch in another voice
 * at the same time is a different note, and pairing the two would hold one
 * of them over forever. The voice is recoverable from the event id
 * (`part#m1#v1#e0`, or `part#m1#v1#e0#n0` for a chord's noteheads), which
 * is why this groups rather than walking the whole stream.
 */
function resolveTies(
  voiceEvents: readonly NotationEvent[],
  written: readonly (readonly Notehead[])[],
): void {
  const groups = new Map<string, number[]>();
  voiceEvents.forEach((event, index) => {
    const key = voiceKeyOf(event);
    const list = groups.get(key) ?? [];
    list.push(index);
    groups.set(key, list);
  });
  for (const indices of groups.values()) resolveTiesInVoice(voiceEvents, written, indices);
}

/**
 * `${partId}#v${voiceId}` from an event id, so a chain never crosses a voice.
 *
 * The chord suffix matters: a chord's note ids carry `#n0`, `#n1`, ...,
 * and an id pattern that stopped at `#e0` would treat every chord note as
 * its own voice. That is what used to make a chord tie resolve to nothing
 * at all -- the first bar's note and the second bar's note landed in
 * different groups, so no chain was ever opened.
 */
function voiceKeyOf(event: NotationEvent): string {
  const id = event.noteIds[0] ?? '';
  const match = /^(.*)#m\d+#v(\d+)#e\d+(?:#n\d+)?$/.exec(id);
  return match ? `${match[1]}#v${match[2]}` : id;
}

function resolveTiesInVoice(
  voiceEvents: readonly NotationEvent[],
  written: readonly (readonly Notehead[])[],
  indices: readonly number[],
): void {
  /** Open chains, keyed by MIDI number: a tie holds one pitch, so only that same pitch continues it. */
  const open = new Map<number, { event: number; notehead: number }>();
  for (const index of indices) {
    const event = voiceEvents[index];
    const noteheads = written[index];
    if (event === undefined || noteheads === undefined || noteheads.length === 0) continue;
    const sounding: SoundingNote[] = [];
    for (let position = 0; position < noteheads.length; position += 1) {
      const notehead = noteheads[position];
      if (notehead === undefined) continue;
      const head = open.get(notehead.midi);
      const headEvent = head === undefined ? undefined : voiceEvents[head.event];
      const headSounding = headEvent === undefined ? undefined : mutableSounding(headEvent);
      if (notehead.tieStop && head !== undefined && headEvent !== undefined) {
        // The chain is the head's own length plus every notehead it has
        // grown through, and the note already sounding is not struck again.
        const carried = headSounding?.[head.notehead];
        const held = (carried?.ticks ?? headEvent.durationTicks) + event.durationTicks;
        if (headSounding !== undefined && carried !== undefined) {
          headSounding[head.notehead] = { ...carried, ticks: held };
        }
        sounding.push({ midi: notehead.midi, strike: false, ticks: held });
        if (!notehead.tieStart) open.delete(notehead.midi);
        continue;
      }
      if (notehead.tieStart) open.set(notehead.midi, { event: index, notehead: position });
      else open.delete(notehead.midi);
      sounding.push({ midi: notehead.midi, strike: true, ticks: event.durationTicks });
    }
    (event as { sounding?: readonly SoundingNote[] }).sounding = sounding;
  }
  for (const index of indices) {
    const event = voiceEvents[index];
    const notes = event === undefined ? undefined : event.sounding;
    if (event === undefined || notes === undefined || notes.length === 0) continue;
    // The whole-event flags stay for the hosts that already read them: set
    // only when EVERY notehead agrees, so a partially tied chord never
    // claims to be held whole and a mixed-length chord never claims one
    // chain length.
    if (notes.every((note) => !note.strike)) {
      (event as { tiedFromPrevious?: boolean }).tiedFromPrevious = true;
    }
    const lengths = new Set(notes.filter((note) => note.strike).map((note) => note.ticks));
    const [only] = [...lengths];
    if (lengths.size === 1 && only !== undefined && only !== event.durationTicks) {
      (event as { tieChainDurationTicks?: number }).tieChainDurationTicks = only;
    }
  }
}

/** An event's sounding list as a mutable array, for a chain to grow in place. */
function mutableSounding(event: NotationEvent): SoundingNote[] | undefined {
  return event.sounding === undefined ? undefined : (event.sounding as SoundingNote[]);
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
  written: readonly (readonly Notehead[])[],
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
