import { childrenNamed, firstChildNamed, intOf } from './dom-helpers.js';

/**
 * Parses one `<score-part>`'s `<midi-instrument>` children into a map from
 * `<midi-instrument id="...">` (the same id a `<note><instrument
 * id="...">` references) to its GM percussion note number.
 *
 * §10.5's documented off-by-one, applied here: MusicXML's
 * `<midi-unpitched>` is **1-based** while GM note numbers are 0-based --
 * subtract 1. Confirmed by the MusicXML spec itself, not assumed.
 */
export function parseMidiInstrumentMap(scorePartEl: Element): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const midiInstrumentEl of childrenNamed(scorePartEl, 'midi-instrument')) {
    const id = midiInstrumentEl.getAttribute('id');
    const rawUnpitched = intOf(firstChildNamed(midiInstrumentEl, 'midi-unpitched'));
    if (id !== null && rawUnpitched !== undefined) {
      map.set(id, rawUnpitched - 1);
    }
  }
  return map;
}
