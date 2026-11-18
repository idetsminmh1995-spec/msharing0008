import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { childrenNamed, firstChildNamed, textOf } from './dom-helpers.js';

/**
 * One `<midi-instrument>`'s routing data, as the file states it.
 *
 * §10.5's documented off-by-one, applied here the same way for every
 * field: MusicXML numbers these **1-based** while the MIDI wire format is
 * 0-based, so `program`/`bank`/`channel` are stored already decremented.
 * Confirmed against the MusicXML 4.0 spec, not assumed: `<midi-program>`
 * is 1-128, `<midi-bank>` 1-16384, `<midi-channel>` 1-16, and
 * `<midi-unpitched>` 1-128.
 */
export interface MidiInstrumentInfo {
  /** GM percussion note number (0-127), from `<midi-unpitched>`. Unpitched percussion only. */
  readonly gmNote?: number;
  /** MIDI program number (0-127), from `<midi-program>`. */
  readonly program?: number;
  /** MIDI bank number (0-16383), from `<midi-bank>`. */
  readonly bank?: number;
  /** MIDI channel (0-15), from `<midi-channel>`. */
  readonly channel?: number;
}

interface BoundedInt {
  /** True when the child element is present at all. */
  readonly present: boolean;
  /** The 1-based value exactly as written, when it parsed as a plain integer. */
  readonly raw: string | undefined;
  /** The parsed value, present only when it was a valid 1..maxInclusive integer. */
  readonly value: number | undefined;
}

/** Reads one optional 1-based integer child, leaving the caller to emit its own literal-coded diagnostic (so the diagnostics-coverage guard can still discover the code). */
function readBoundedInt(parent: Element, childName: string): BoundedInt {
  const el = firstChildNamed(parent, childName);
  if (el === undefined) return { present: false, raw: undefined, value: undefined };
  const raw = textOf(el);
  const parsed = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : undefined;
  const value =
    parsed !== undefined && Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
  return { present: true, raw, value };
}

/**
 * Parses one `<score-part>`'s `<midi-instrument>` children into a map from
 * `<midi-instrument id="...">` (the same id a `<note><instrument
 * id="...">` references) to its routing data.
 *
 * A `<midi-instrument>` with no recognized child at all is omitted rather
 * than stored as an empty record, so "this part names no routing" stays
 * distinguishable from "this part names routing with a zero program".
 */
export function parseMidiInstrumentInfoMap(
  scorePartEl: Element,
  diagnostics?: Diagnostic[],
  location?: DiagnosticLocation,
): ReadonlyMap<string, MidiInstrumentInfo> {
  const map = new Map<string, MidiInstrumentInfo>();
  for (const midiInstrumentEl of childrenNamed(scorePartEl, 'midi-instrument')) {
    const id = midiInstrumentEl.getAttribute('id');
    if (id === null) continue;

    const unpitched = readBoundedInt(midiInstrumentEl, 'midi-unpitched');
    let gmNote: number | undefined;
    if (unpitched.present) {
      if (unpitched.value !== undefined && unpitched.value <= 128) {
        gmNote = unpitched.value - 1;
      } else {
        diagnostics?.push(
          diagnostic(
            'warning',
            'INVALID_MIDI_UNPITCHED',
            `Invalid <midi-unpitched> "${unpitched.raw ?? ''}"; expected an integer from 1 to 128, so this instrument has no GM mapping.`,
            location,
          ),
        );
      }
    }

    const program = readBoundedInt(midiInstrumentEl, 'midi-program');
    let programValue: number | undefined;
    if (program.present) {
      if (program.value !== undefined && program.value <= 128) {
        programValue = program.value - 1;
      } else {
        diagnostics?.push(
          diagnostic(
            'warning',
            'INVALID_MIDI_PROGRAM',
            `Invalid <midi-program> "${program.raw ?? ''}"; expected an integer from 1 to 128, so this instrument has no program.`,
            location,
          ),
        );
      }
    }

    const bank = readBoundedInt(midiInstrumentEl, 'midi-bank');
    let bankValue: number | undefined;
    if (bank.present) {
      if (bank.value !== undefined && bank.value <= 16384) {
        bankValue = bank.value - 1;
      } else {
        diagnostics?.push(
          diagnostic(
            'warning',
            'INVALID_MIDI_BANK',
            `Invalid <midi-bank> "${bank.raw ?? ''}"; expected an integer from 1 to 16384, so this instrument has no bank.`,
            location,
          ),
        );
      }
    }

    const channel = readBoundedInt(midiInstrumentEl, 'midi-channel');
    let channelValue: number | undefined;
    if (channel.present) {
      if (channel.value !== undefined && channel.value <= 16) {
        channelValue = channel.value - 1;
      } else {
        diagnostics?.push(
          diagnostic(
            'warning',
            'INVALID_MIDI_CHANNEL',
            `Invalid <midi-channel> "${channel.raw ?? ''}"; expected an integer from 1 to 16, so this instrument has no channel.`,
            location,
          ),
        );
      }
    }

    if (
      gmNote === undefined &&
      programValue === undefined &&
      bankValue === undefined &&
      channelValue === undefined
    ) {
      continue;
    }
    map.set(id, {
      ...(gmNote !== undefined ? { gmNote } : {}),
      ...(programValue !== undefined ? { program: programValue } : {}),
      ...(bankValue !== undefined ? { bank: bankValue } : {}),
      ...(channelValue !== undefined ? { channel: channelValue } : {}),
    });
  }
  return map;
}

/**
 * The GM-note projection of `parseMidiInstrumentInfoMap`, kept as its own
 * function because the drum-notehead and hi-hat layers only ever want the
 * percussion note number. Instruments with no `<midi-unpitched>` (a
 * pitched instrument, which routes by program/bank instead) do not appear.
 */
export function parseMidiInstrumentMap(
  scorePartEl: Element,
  diagnostics?: Diagnostic[],
  location?: DiagnosticLocation,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const [id, info] of parseMidiInstrumentInfoMap(scorePartEl, diagnostics, location)) {
    if (info.gmNote !== undefined) map.set(id, info.gmNote);
  }
  return map;
}
