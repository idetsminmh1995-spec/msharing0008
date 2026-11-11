import type { ArticulationType, BeamHint, FermataPlacement, FermataShape, LyricSyllable, OrnamentType } from '../../core/note.js';
import { type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
export interface ParsedNotations {
    readonly articulations: readonly ArticulationType[];
    readonly ornaments: readonly OrnamentType[];
    readonly hasFermata: boolean;
    readonly fermataPlacement?: FermataPlacement;
    readonly fermataShape?: FermataShape;
    /** `<slur type="start">` numbers beginning at this note. A slur with no `number` attribute is number 1, per MusicXML's own default. */
    readonly slurStarts: readonly number[];
    readonly slurStops: readonly number[];
    readonly tupletStart: boolean;
    readonly tupletStop: boolean;
}
/**
 * Parses one `<note>`'s `<notations>` child, if it has one. `<tied>` and
 * `<technical>` are deliberately NOT read here -- `parseNoteElement`
 * already owns both (ties since §10.8's tie/tied divergence work,
 * string/fret since Integration C), and reading them twice in two places
 * is how the two copies eventually disagree.
 */
export declare function parseNotations(noteEl: Element, location: DiagnosticLocation): {
    notations: ParsedNotations;
    diagnostics: readonly Diagnostic[];
};
/**
 * Parses a `<note>`'s own `<beam>` hints (§10.4/§10.8). An unrecognized
 * value is dropped WITH a diagnostic rather than guessed at -- a wrong
 * beam hint silently changes how the music is grouped, which is a
 * musical error, not a cosmetic one.
 */
export declare function parseBeamHints(noteEl: Element, location: DiagnosticLocation): {
    beams: readonly BeamHint[];
    diagnostics: readonly Diagnostic[];
};
/**
 * Parses a `<note>`'s `<lyric>` syllables (§9.22/§10.4). A `<lyric>` with
 * no `<text>` at all (a bare `<extend/>` continuing a previous melisma is
 * the common real case) is kept with an empty string rather than dropped,
 * so the extend flag itself survives -- §10.7's no-silent-loss rule.
 */
export declare function parseLyrics(noteEl: Element): readonly LyricSyllable[];
