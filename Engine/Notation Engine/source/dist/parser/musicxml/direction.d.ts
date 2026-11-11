import { type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
/**
 * Phase 35 Tier 2/§10.4 -- `<direction>`'s own sub-elements, the v2
 * elements that attach to a measure POSITION rather than to any single
 * note: `<dynamics>`, `<wedge>`, `<words>` and `<rehearsal>`.
 * (`<metronome>` is deliberately NOT here: Integration D already owns it
 * in `parse.ts`, feeding the `tempoMarks` side-table, and moving it now
 * would churn working code for no gain.)
 *
 * Per §4.1 the parser depends on `core/` only, so the level/kind unions
 * below are declared structurally here rather than imported from
 * `geometry/` -- the same explicitly-documented arrangement
 * `config/config.ts` already uses for `DrumMapEntryOverride`. They are
 * written to match `geometry/dynamic.ts`'s `DynamicLevel` and
 * `geometry/hairpin.ts`'s `HairpinKind` exactly, so a renderer can pass
 * one straight to the other with no cast.
 */
/** Structurally identical to `geometry/dynamic.ts`'s `DynamicLevel` -- see this file's header. */
export type ParsedDynamicLevel = 'pppppp' | 'ppppp' | 'pppp' | 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'ffff' | 'fffff' | 'ffffff' | 'sf' | 'sfp' | 'sfpp' | 'fp' | 'rf' | 'sfz' | 'sffz' | 'fz' | 'n' | 'pf' | 'sfzp';
/** 'crescendo'/'decrescendo' are structurally identical to `geometry/hairpin.ts`'s `HairpinKind`; 'stop' is this parser's own marker for the wedge's closing element, which has no geometry of its own. */
export type ParsedWedgeType = 'crescendo' | 'decrescendo' | 'stop';
export interface ParsedWedge {
    readonly type: ParsedWedgeType;
    /** From the element's `number` attribute, defaulting to 1 -- how two overlapping wedges stay distinguishable. */
    readonly number: number;
}
export interface ParsedDirectionContent {
    readonly dynamics: readonly ParsedDynamicLevel[];
    readonly wedges: readonly ParsedWedge[];
    /** `<words>` text, preserved though §9.21 cannot draw arbitrary text yet (no text-font system) -- §10.7's no-silent-loss rule. */
    readonly words: readonly string[];
    /** `<rehearsal>` text, preserved for the same reason as `words`. */
    readonly rehearsals: readonly string[];
    /** `<sound tempo="...">` -- a playback tempo with no `<beat-unit>`; MusicXML defines it as quarter-notes per minute. */
    readonly soundTempo?: number;
}
/** `<sound tempo="...">` as a positive number, or undefined. Accepts a decimal (the spec's own type is a decimal, not an integer). */
export declare function parseSoundTempo(soundEl: Element): number | undefined;
/**
 * Parses one `<direction>`'s recognized content. `<metronome>` is skipped
 * silently here (its own caller handles it); anything genuinely
 * unrecognized becomes an `info` diagnostic naming it, per §10.7.
 */
export declare function parseDirectionElement(directionEl: Element, location: DiagnosticLocation): {
    content: ParsedDirectionContent;
    diagnostics: readonly Diagnostic[];
};
/** `<direction staff="N">`'s staff, defaulting to 1 -- which staff of a grand staff the marking belongs under. */
export declare function directionStaff(directionEl: Element): number;
/** `<direction placement="above|below">`, if stated. §9.21's own default placement applies when it isn't. */
export declare function directionPlacement(directionEl: Element): 'above' | 'below' | undefined;
