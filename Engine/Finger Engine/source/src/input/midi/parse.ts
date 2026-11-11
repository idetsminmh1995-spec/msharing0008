/**
 * parse.ts — Standard MIDI File to `ParsedPart[]` (Plan Part 03 §B).
 *
 * MIDI brings pitch and time and nothing else: no strings, no frets,
 * no fingers [IN-M03]. That makes it the honest test of the solver --
 * every position in the output was decided by the engine rather than
 * copied from the file, which is why fixture F-13 exists.
 *
 * The bytes are read here rather than borrowed from the Notation
 * Engine's reader on purpose: this engine ships as one self-contained
 * bundle with no cross-package imports, and it needs two things
 * notation does not keep -- the channel each note was on and the
 * track's General MIDI program -- to pick the guitar track at all
 * [IN-M02] and to read pitch bend [IN-M05].
 */
import type { NoteEvent, ParsedPart, TimeSignatureChange } from '../../core/types.js';
import { tempoMap, type TempoSegment } from '../../core/tempo.js';
import type { EngineWarning } from '../../core/timeline-schema.js';
import { TICKS_PER_QUARTER } from '../musicxml/parse.js';

interface Reader {
  readonly bytes: Uint8Array;
  offset: number;
}

function u8(reader: Reader): number {
  const value = reader.bytes[reader.offset] ?? 0;
  reader.offset += 1;
  return value;
}

function u16(reader: Reader): number {
  return (u8(reader) << 8) | u8(reader);
}

function u32(reader: Reader): number {
  return ((u8(reader) << 24) | (u8(reader) << 16) | (u8(reader) << 8) | u8(reader)) >>> 0;
}

/** MIDI's variable-length quantity: seven bits per byte, high bit = "more to come". */
function varInt(reader: Reader): number {
  let value = 0;
  for (let i = 0; i < 4; i++) {
    const byte = u8(reader);
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return value;
}

interface RawNote {
  readonly channel: number;
  readonly pitch: number;
  readonly velocity: number;
  readonly startTick: number;
  endTick: number;
}

interface RawTrack {
  name: string;
  program: number | undefined;
  channels: Set<number>;
  notes: RawNote[];
  bends: { tick: number; channel: number; semitones: number }[];
}

export interface MidiParseResult {
  readonly parts: readonly ParsedPart[];
  readonly warnings: readonly EngineWarning[];
}

/**
 * Every track of a MIDI file, as a part.
 *
 * Nothing is quantized [IN-M07]: the timing in the file is the timing
 * a person played, and rounding it to a grid would throw away the
 * feel the video is meant to show.
 */
export function parseMidi(data: ArrayBuffer | Uint8Array): MidiParseResult {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const warnings: EngineWarning[] = [];
  const reader: Reader = { bytes, offset: 0 };

  if (readChunkName(reader) !== 'MThd') {
    return {
      parts: [],
      warnings: [{ code: 'NOT_MIDI', message: 'no MThd header: this is not a MIDI file' }],
    };
  }
  const headerLength = u32(reader);
  const headerEnd = reader.offset + headerLength;
  u16(reader); // format: the engine reads every track either way
  const trackCount = u16(reader);
  const division = u16(reader);
  reader.offset = headerEnd;

  if ((division & 0x8000) !== 0) {
    return {
      parts: [],
      warnings: [
        {
          code: 'MIDI_SMPTE_UNSUPPORTED',
          message: 'this file counts time in SMPTE frames, which this engine does not read',
        },
      ],
    };
  }
  const fileTicksPerQuarter = division === 0 ? 480 : division;
  const scale = TICKS_PER_QUARTER / fileTicksPerQuarter;

  const tempoEvents = new Map<number, number>();
  const timeSignatures = new Map<number, TimeSignatureChange>();
  const tracks: RawTrack[] = [];

  for (let index = 0; index < trackCount && reader.offset < bytes.length; index++) {
    if (readChunkName(reader) !== 'MTrk') break;
    const length = u32(reader);
    const end = Math.min(bytes.length, reader.offset + length);
    tracks.push(readTrack(reader, end, scale, tempoEvents, timeSignatures));
    reader.offset = end;
  }

  const segments: TempoSegment[] = [...tempoEvents.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startTick, microsecondsPerQuarter]) => ({ startTick, microsecondsPerQuarter }));
  const map = tempoMap(TICKS_PER_QUARTER, segments);
  const meters = [...timeSignatures.values()].sort((a, b) => a.tick - b.tick);

  const parts: ParsedPart[] = [];
  for (let index = 0; index < tracks.length; index++) {
    const track = tracks[index] as RawTrack;
    if (track.notes.length === 0) continue;
    parts.push({
      partId: `t${index + 1}`,
      name: track.name === '' ? `Track ${index + 1}` : track.name,
      ...(track.program !== undefined ? { gmProgram: track.program } : {}),
      instrumentHint: {},
      notes: toNoteEvents(track, index + 1),
      tempoMap: map,
      timeSignatures: meters,
      hasTab: false,
    });
  }
  if (parts.length === 0) {
    warnings.push({ code: 'NO_NOTES', message: 'the file has no sounding notes in any track' });
  }
  return { parts, warnings };
}

function readChunkName(reader: Reader): string {
  return String.fromCharCode(u8(reader), u8(reader), u8(reader), u8(reader));
}

function readTrack(
  reader: Reader,
  end: number,
  scale: number,
  tempoEvents: Map<number, number>,
  timeSignatures: Map<number, TimeSignatureChange>,
): RawTrack {
  const track: RawTrack = {
    name: '',
    program: undefined,
    channels: new Set<number>(),
    notes: [],
    bends: [],
  };
  const sounding = new Map<number, RawNote>();
  let tick = 0;
  let status = 0;

  while (reader.offset < end) {
    tick += varInt(reader);
    const at = Math.round(tick * scale);
    let byte = u8(reader);
    if (byte < 0x80) {
      // Running status: this byte is data, and the last status still stands.
      reader.offset -= 1;
      byte = status;
    } else if (byte < 0xf0) {
      status = byte;
    }

    if (byte === 0xff) {
      const type = u8(reader);
      const length = varInt(reader);
      const start = reader.offset;
      if (type === 0x51 && length === 3) {
        const value = (u8(reader) << 16) | (u8(reader) << 8) | u8(reader);
        if (!tempoEvents.has(at) && value > 0) tempoEvents.set(at, value);
      } else if (type === 0x58 && length >= 2) {
        const numerator = u8(reader);
        const denominator = Math.pow(2, u8(reader));
        if (!timeSignatures.has(at)) timeSignatures.set(at, { tick: at, numerator, denominator });
      } else if (type === 0x03 && track.name === '') {
        let name = '';
        for (let i = 0; i < length; i++) name += String.fromCharCode(u8(reader));
        track.name = name.trim();
      }
      reader.offset = start + length;
      continue;
    }
    if (byte === 0xf0 || byte === 0xf7) {
      reader.offset += varInt(reader);
      continue;
    }

    const command = byte & 0xf0;
    const channel = byte & 0x0f;
    if (command === 0x90 || command === 0x80) {
      const pitch = u8(reader);
      const velocity = u8(reader);
      track.channels.add(channel);
      const key = channel * 128 + pitch;
      // [IN-M01] a note-on with velocity 0 is a note-off, which most
      // files use because it lets them run the status byte.
      if (command === 0x90 && velocity > 0) {
        // [IN-M04] the same pitch starting again ends the one sounding.
        const open = sounding.get(key);
        if (open !== undefined) open.endTick = at;
        const note: RawNote = { channel, pitch, velocity, startTick: at, endTick: at };
        sounding.set(key, note);
        track.notes.push(note);
      } else {
        const open = sounding.get(key);
        if (open !== undefined && at > open.startTick) open.endTick = at;
        sounding.delete(key);
      }
      continue;
    }
    if (command === 0xc0) {
      track.program = u8(reader);
      track.channels.add(channel);
      continue;
    }
    if (command === 0xe0) {
      // [IN-M05] pitch bend, 14 bits, centre 8192.
      const low = u8(reader);
      const high = u8(reader);
      const value = ((high << 7) | low) - 8192;
      track.bends.push({ tick: at, channel, semitones: (value / 8192) * 2 });
      continue;
    }
    if (command === 0xd0) {
      u8(reader);
      continue;
    }
    u8(reader);
    u8(reader);
  }

  // A note the file never ended still has to end somewhere.
  for (const note of track.notes) {
    if (note.endTick <= note.startTick) note.endTick = note.startTick + TICKS_PER_QUARTER;
  }
  return track;
}

function toNoteEvents(track: RawTrack, trackNumber: number): readonly NoteEvent[] {
  const ordered = [...track.notes].sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
  return ordered.map((note, index) => ({
    noteId: `t${trackNumber}-n${index}`,
    pitch: note.pitch,
    tick: note.startTick,
    durationTicks: Math.max(1, note.endTick - note.startTick),
    time: 0,
    duration: 0,
    velocity: note.velocity,
    voice: note.channel + 1,
    techniques: [],
    sourceRef: { format: 'midi' as const, part: `t${trackNumber}`, index },
  }));
}

/**
 * [IN-M02] The tracks that could be the guitar.
 *
 * Channel 10 is the drum kit and is never one. A General MIDI program
 * of 24..31 is a guitar and wins; bass (32..39) and everything else
 * are left out. When the file says nothing useful, every candidate is
 * returned and the caller asks the user rather than guessing.
 */
export function guitarTracks(parts: readonly ParsedPart[]): readonly ParsedPart[] {
  const notDrums = parts.filter((part) => !part.notes.every((note) => note.voice === 10));
  const byProgram = notDrums.filter(
    (part) => part.gmProgram !== undefined && part.gmProgram >= 24 && part.gmProgram <= 31,
  );
  if (byProgram.length > 0) return byProgram;
  const named = notDrums.filter((part) => /guitar|gtr|guit/i.test(part.name));
  if (named.length > 0) return named;
  return notDrums.filter(
    (part) => part.gmProgram === undefined || part.gmProgram < 32 || part.gmProgram > 39,
  );
}
