import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { childrenNamed, firstChildNamed, textOf } from './dom-helpers.js';

/**
 * Parses one `<score-part>`'s `<midi-instrument>` children into a map from
 * `<midi-instrument id="...">` (the same id a `<note><instrument
 * id="...">` references) to its GM percussion note number.
 *
 * §10.5's documented off-by-one, applied here: MusicXML's
 * `<midi-unpitched>` is **1-based** while GM note numbers are 0-based --
 * subtract 1. Confirmed by the MusicXML spec itself, not assumed.
 */
export function parseMidiInstrumentMap(
  scorePartEl: Element,
  diagnostics?: Diagnostic[],
  location?: DiagnosticLocation,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const midiInstrumentEl of childrenNamed(scorePartEl, 'midi-instrument')) {
    const id = midiInstrumentEl.getAttribute('id');
    const midiUnpitchedEl = firstChildNamed(midiInstrumentEl, 'midi-unpitched');
    if (midiUnpitchedEl === undefined) continue;
    const rawUnpitched = textOf(midiUnpitchedEl);
    const value =
      rawUnpitched !== undefined && /^\d+$/.test(rawUnpitched) ? Number(rawUnpitched) : undefined;
    if (value === undefined || !Number.isSafeInteger(value) || value < 1 || value > 128) {
      diagnostics?.push(
        diagnostic(
          'warning',
          'INVALID_MIDI_UNPITCHED',
          `Invalid <midi-unpitched> "${rawUnpitched ?? ''}"; expected an integer from 1 to 128, so this instrument has no GM mapping.`,
          location,
        ),
      );
      continue;
    }
    if (id !== null) {
      map.set(id, value - 1);
    }
  }
  return map;
}
