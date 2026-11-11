import { type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
/**
 * Parses one `<score-part>`'s `<midi-instrument>` children into a map from
 * `<midi-instrument id="...">` (the same id a `<note><instrument
 * id="...">` references) to its GM percussion note number.
 *
 * §10.5's documented off-by-one, applied here: MusicXML's
 * `<midi-unpitched>` is **1-based** while GM note numbers are 0-based --
 * subtract 1. Confirmed by the MusicXML spec itself, not assumed.
 */
export declare function parseMidiInstrumentMap(scorePartEl: Element, diagnostics?: Diagnostic[], location?: DiagnosticLocation): ReadonlyMap<string, number>;
