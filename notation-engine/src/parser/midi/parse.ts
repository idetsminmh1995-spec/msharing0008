import { ByteReader } from './byte-reader.js';
import { readVariableLengthQuantity } from './vlq.js';
import { midiDiagnostic, type MidiDiagnostic } from './diagnostic.js';
import type {
  MidiFile,
  MidiTrack,
  MidiNote,
  TempoEvent,
  TimeSignatureEvent,
  KeySignatureEvent,
} from './midi-file.js';

/** §11.2: every downstream tick is normalized to this, exactly matching the MusicXML side's own TICKS_PER_QUARTER (§6.2) so both parsers' outputs are directly comparable. */
const TICKS_PER_QUARTER = 480;

export interface ParseMidiResult {
  readonly midiFile: MidiFile | undefined;
  readonly diagnostics: readonly MidiDiagnostic[];
}

interface RawNoteEvent {
  readonly rawTick: number;
  readonly channel: number;
  readonly noteNumber: number;
  readonly velocity: number;
}

interface RawMetaEvents {
  readonly tempoEvents: TempoEvent[];
  readonly timeSignatureEvents: TimeSignatureEvent[];
  readonly keySignatureEvents: KeySignatureEvent[];
}

/**
 * §11: turns a `.mid` byte stream into a note list plus a tempo/meta
 * timeline. Never throws (§11.2, mirroring §10.7's own discipline for
 * the MusicXML side) -- every real failure mode (bad magic, truncated
 * chunk, SMPTE division, format 2) returns `midiFile: undefined` plus a
 * diagnostic explaining why, rather than an exception.
 */
export function parseMidiFile(bytes: Uint8Array): ParseMidiResult {
  const diagnostics: MidiDiagnostic[] = [];
  const reader = new ByteReader(bytes);

  const headerMagic = reader.readAscii(4);
  if (headerMagic !== 'MThd') {
    diagnostics.push(
      midiDiagnostic(
        'error',
        'BAD_HEADER_MAGIC',
        `Expected "MThd" header chunk, got "${headerMagic ?? 'nothing'}".`,
      ),
    );
    return { midiFile: undefined, diagnostics };
  }

  const headerLength = reader.readUint32BE();
  const format = reader.readUint16BE();
  const trackCount = reader.readUint16BE();
  const division = reader.readUint16BE();
  if (
    headerLength === undefined ||
    format === undefined ||
    trackCount === undefined ||
    division === undefined
  ) {
    diagnostics.push(
      midiDiagnostic('error', 'TRUNCATED_HEADER', 'MThd header chunk is truncated.'),
    );
    return { midiFile: undefined, diagnostics };
  }

  // §11.1: high bit of `division` set means SMPTE frames, not PPQ --
  // rare, and rather than mis-parse a timing scheme this parser doesn't
  // implement, reject it cleanly.
  if ((division & 0x8000) !== 0) {
    diagnostics.push(
      midiDiagnostic(
        'error',
        'SMPTE_DIVISION_UNSUPPORTED',
        'SMPTE-frame-based timing division is not supported.',
      ),
    );
    return { midiFile: undefined, diagnostics };
  }
  const ppq = division;

  if (format === 2) {
    diagnostics.push(
      midiDiagnostic(
        'error',
        'FORMAT_2_UNSUPPORTED',
        'Format 2 (independent multi-song) files are not supported.',
      ),
    );
    return { midiFile: undefined, diagnostics };
  }
  if (format !== 0 && format !== 1) {
    diagnostics.push(
      midiDiagnostic('error', 'UNKNOWN_FORMAT', `Unrecognized MIDI file format ${format}.`),
    );
    return { midiFile: undefined, diagnostics };
  }

  // Any header length beyond the standard 6 bytes is legal (future
  // MThd extensions) -- skip whatever's left of the declared header
  // rather than assuming exactly 6, matching §11.2's "respect declared
  // length" rule already required for meta events.
  const headerBytesReadSoFar = 6; // format + ntrks + division, each uint16
  if (headerLength > headerBytesReadSoFar) {
    reader.skip(headerLength - headerBytesReadSoFar);
  }

  const tracks: MidiTrack[] = [];
  const allTempoEvents: TempoEvent[] = [];
  const allTimeSignatureEvents: TimeSignatureEvent[] = [];
  const allKeySignatureEvents: KeySignatureEvent[] = [];

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
    const trackMagic = reader.readAscii(4);
    const trackLength = reader.readUint32BE();
    if (trackMagic !== 'MTrk' || trackLength === undefined) {
      diagnostics.push(
        midiDiagnostic(
          'error',
          'BAD_TRACK_MAGIC',
          `Expected "MTrk" for track ${trackIndex}, got "${trackMagic ?? 'nothing'}".`,
          { trackIndex },
        ),
      );
      break; // §10.7-style partial recovery: keep whatever tracks parsed so far.
    }

    const trackEnd = reader.position + trackLength;
    const { notes, meta } = parseTrackEvents(reader, trackEnd, trackIndex, diagnostics);
    tracks.push({ notes: notes.map((n) => normalizeNote(n, ppq)) });
    allTempoEvents.push(...meta.tempoEvents.map((e) => normalizeTempoEvent(e, ppq)));
    allTimeSignatureEvents.push(
      ...meta.timeSignatureEvents.map((e) => normalizeTimeSignatureEvent(e, ppq)),
    );
    allKeySignatureEvents.push(
      ...meta.keySignatureEvents.map((e) => normalizeKeySignatureEvent(e, ppq)),
    );
  }

  const midiFile: MidiFile = {
    format,
    ppq,
    tracks,
    tempoEvents: allTempoEvents,
    timeSignatureEvents: allTimeSignatureEvents,
    keySignatureEvents: allKeySignatureEvents,
  };
  return { midiFile, diagnostics };
}

/** A note with still-raw (file-PPQ) ticks -- normalized once, right before leaving parseTrackEvents' caller, never re-derived downstream. */
interface RawMidiNote {
  readonly rawTick: number;
  readonly rawDurationTicks: number;
  readonly channel: number;
  readonly noteNumber: number;
  readonly velocity: number;
}

function normalizeTick(rawTick: number, ppq: number): number {
  return (rawTick * TICKS_PER_QUARTER) / ppq;
}

function normalizeNote(note: RawMidiNote, ppq: number): MidiNote {
  return {
    tick: normalizeTick(note.rawTick, ppq),
    durationTicks: normalizeTick(note.rawDurationTicks, ppq),
    channel: note.channel,
    noteNumber: note.noteNumber,
    velocity: note.velocity,
  };
}

function normalizeTempoEvent(event: TempoEvent, ppq: number): TempoEvent {
  return {
    tick: normalizeTick(event.tick, ppq),
    microsecondsPerQuarter: event.microsecondsPerQuarter,
  };
}

function normalizeTimeSignatureEvent(event: TimeSignatureEvent, ppq: number): TimeSignatureEvent {
  return {
    tick: normalizeTick(event.tick, ppq),
    numerator: event.numerator,
    denominator: event.denominator,
  };
}

function normalizeKeySignatureEvent(event: KeySignatureEvent, ppq: number): KeySignatureEvent {
  return {
    tick: normalizeTick(event.tick, ppq),
    sharpsFlats: event.sharpsFlats,
    isMinor: event.isMinor,
  };
}

function parseTrackEvents(
  reader: ByteReader,
  trackEnd: number,
  trackIndex: number,
  diagnostics: MidiDiagnostic[],
): { notes: RawMidiNote[]; meta: RawMetaEvents } {
  const notes: RawMidiNote[] = [];
  const meta: RawMetaEvents = { tempoEvents: [], timeSignatureEvents: [], keySignatureEvents: [] };
  // §11.1: an active note-on per (channel, noteNumber), so a later
  // note-off (or a note-on with velocity 0 -- §11.1's own explicit rule)
  // can compute its duration.
  const active = new Map<string, RawNoteEvent>();

  let rawTick = 0;
  let runningStatus: number | undefined;

  while (reader.position < trackEnd && !reader.atEnd()) {
    const delta = readVariableLengthQuantity(reader);
    if (delta === undefined) {
      diagnostics.push(
        midiDiagnostic(
          'warning',
          'TRUNCATED_TRACK',
          `Track ${trackIndex} ends mid-event (bad delta-time); keeping events parsed so far.`,
          { trackIndex },
        ),
      );
      break;
    }
    rawTick += delta;

    const peeked = reader.peekBytes(1);
    if (peeked === undefined) break;
    let statusByte: number | undefined = peeked[0];
    if (statusByte !== undefined && (statusByte & 0x80) !== 0) {
      reader.readUint8(); // consume the status byte we just peeked
      runningStatus = statusByte;
    } else {
      // §11.1: running status -- this byte is actually the FIRST data
      // byte of whatever status byte was last seen, not a new one.
      statusByte = runningStatus;
    }
    if (statusByte === undefined) {
      diagnostics.push(
        midiDiagnostic(
          'warning',
          'TRUNCATED_TRACK',
          `Track ${trackIndex}: a data byte appeared before any status byte.`,
          { trackIndex },
        ),
      );
      break;
    }

    if (statusByte === 0xff) {
      const ok = parseMetaEvent(reader, rawTick, trackIndex, meta, diagnostics);
      if (!ok) break;
      continue;
    }
    if (statusByte === 0xf0 || statusByte === 0xf7) {
      const sysexLength = readVariableLengthQuantity(reader);
      if (sysexLength === undefined || !reader.skip(sysexLength)) {
        diagnostics.push(
          midiDiagnostic(
            'warning',
            'TRUNCATED_TRACK',
            `Track ${trackIndex}: truncated SysEx event.`,
            {
              trackIndex,
            },
          ),
        );
        break;
      }
      continue;
    }

    const highNibble = statusByte & 0xf0;
    const channel = statusByte & 0x0f;
    const dataByteCount = highNibble === 0xc0 || highNibble === 0xd0 ? 1 : 2;
    const data0 = reader.readUint8();
    const data1 = dataByteCount === 2 ? reader.readUint8() : 0;
    if (data0 === undefined || data1 === undefined) {
      diagnostics.push(
        midiDiagnostic(
          'warning',
          'TRUNCATED_TRACK',
          `Track ${trackIndex}: truncated channel-voice event.`,
          {
            trackIndex,
          },
        ),
      );
      break;
    }

    if (highNibble === 0x90 || highNibble === 0x80) {
      // §11.1: note-off may be encoded as note-on with velocity 0 --
      // both paths below funnel into the same start/stop bookkeeping.
      const isRealNoteOn = highNibble === 0x90 && data1 > 0;
      const key = `${channel}:${data0}`;
      if (isRealNoteOn) {
        active.set(key, { rawTick, channel, noteNumber: data0, velocity: data1 });
      } else {
        const start = active.get(key);
        if (start !== undefined) {
          notes.push({
            rawTick: start.rawTick,
            rawDurationTicks: rawTick - start.rawTick,
            channel: start.channel,
            noteNumber: start.noteNumber,
            velocity: start.velocity,
          });
          active.delete(key);
        }
      }
    }
    // Other channel-voice events (control change, program change,
    // pitch bend, aftertouch) carry no notation-relevant data for this
    // parser's stated scope (§11's own "note list plus tempo/meta
    // timeline") and are simply not recorded, having already been
    // correctly consumed above so the stream stays in sync.
  }

  return { notes, meta };
}

/** Returns false if the meta event was truncated (caller should stop parsing this track). */
function parseMetaEvent(
  reader: ByteReader,
  rawTick: number,
  trackIndex: number,
  meta: RawMetaEvents,
  diagnostics: MidiDiagnostic[],
): boolean {
  const metaType = reader.readUint8();
  const length = readVariableLengthQuantity(reader);
  if (metaType === undefined || length === undefined) {
    diagnostics.push(
      midiDiagnostic(
        'warning',
        'TRUNCATED_TRACK',
        `Track ${trackIndex}: truncated meta event header.`,
        {
          trackIndex,
        },
      ),
    );
    return false;
  }
  const payload = reader.readBytes(length);
  if (payload === undefined) {
    diagnostics.push(
      midiDiagnostic(
        'warning',
        'TRUNCATED_TRACK',
        `Track ${trackIndex}: meta event declares length ${length} but the track ends first.`,
        { trackIndex },
      ),
    );
    return false;
  }

  // §11.1: tempo (FF 51 03), time signature (FF 58 04), key signature
  // (FF 59 02) -- everything else (including end-of-track, FF 2F 00) is
  // intentionally skipped by its OWN declared length above, per §11.2's
  // "unknown meta event -> skip by declared length" rule, never assumed.
  if (metaType === 0x51 && length === 3) {
    const microsecondsPerQuarter =
      ((payload[0] ?? 0) << 16) | ((payload[1] ?? 0) << 8) | (payload[2] ?? 0);
    meta.tempoEvents.push({ tick: rawTick, microsecondsPerQuarter });
  } else if (metaType === 0x58 && length === 4) {
    const numerator = payload[0] ?? 4;
    const dd = payload[1] ?? 2;
    meta.timeSignatureEvents.push({ tick: rawTick, numerator, denominator: 2 ** dd });
  } else if (metaType === 0x59 && length === 2) {
    const rawSf = payload[0] ?? 0;
    // A signed byte: values 0-127 are positive as-is, 128-255 represent -128..-1.
    const sharpsFlats = rawSf > 127 ? rawSf - 256 : rawSf;
    const isMinor = (payload[1] ?? 0) === 1;
    meta.keySignatureEvents.push({ tick: rawTick, sharpsFlats, isMinor });
  }
  return true;
}
