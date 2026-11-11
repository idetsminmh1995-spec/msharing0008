import { type PlaybackData } from './playback/index.js';
import type { Diagnostic } from './parser/index.js';
import { type ParseMusicXmlOptions, type ParseResult } from './parser/index.js';
import { type PartialEngineConfig } from './config/index.js';
/**
 * Phase 50/§8: every element category `config.colors.overrides` can be
 * keyed by.
 *
 * §8's ColorConfig deliberately types `overrides` as a plain
 * string-keyed map (the `config/` module may import from nothing else in
 * the codebase, §4.1), so this union is where the real key set is
 * *stated*. A caller writing `{ overrides: { notehead: '#c00' } }` is
 * writing one of these names; anything else silently matches nothing,
 * which is why the supported names are enumerated here rather than left
 * to be discovered from the renderer's call sites.
 */
export type ColorCategory = 'staff' | 'ledger' | 'barline' | 'brace' | 'notehead' | 'stem' | 'flag' | 'beam' | 'rest' | 'accidental' | 'clef' | 'keySignature' | 'timeSignature' | 'tie' | 'slur' | 'tuplet' | 'mark' | 'dynamic' | 'hairpin' | 'tempo' | 'barNumber' | 'tabNumber' | 'volta';
/** What `renderParsedMusicXml` takes: everything `renderFromMusicXml` does, minus the parser's own options (parsing already happened). */
export interface RenderParsedMusicXmlOptions {
    /**
     * Integration L/§16.2 + Phase 50/§8: the engine config. Every section
     * the renderer can act on is live -- see `buildTheme` and
     * `Doc/phase-50-theming-api.md`.
     */
    readonly config?: PartialEngineConfig;
}
export interface RenderFromMusicXmlOptions extends ParseMusicXmlOptions, RenderParsedMusicXmlOptions {
}
export interface RenderFromMusicXmlResult {
    readonly svg: string;
    readonly diagnostics: readonly Diagnostic[];
    /** Phase 48/PLAN.md §17.1: the position API and event stream for this exact render -- pass this into `positionToX`/`xToPosition`/`resolvePosition`/`getEventStream` (all pure functions of it). */
    readonly playback: PlaybackData;
}
/**
 * The engine's main entry point: MusicXML text in, a complete SVG string
 * out.
 *
 * It began as Phase 21's deliberately naive vertical slice (fixed-width
 * measures via `layout/naive.ts`) -- PLAN.md §22 said that phase "exists
 * to be thrown away", and Stage 8 duly threw it away. Nothing here uses
 * `layout/naive.ts` any more: measure widths come from §14's real
 * spacing algorithm (Integration E), grand-staff distance from §15's
 * skyline (Integration F), and system/page placement from §16.1/§16.2
 * (Phase 45 and Integration L).
 *
 * Content handling grew the same way: every part renders with its own
 * clefs, line counts, brace and continuous barline (Integrations A/B);
 * tab frets (C); tempo marks (D/G); articulations and ornaments (H);
 * slurs and tuplets (I); dynamics and hairpins (J); multi-voice notehead
 * collisions (K).
 */
/**
 * Phase 53/§18.1: render a score that has ALREADY been parsed.
 *
 * §18.1's own performance strategy says "the `Score` and layout result
 * are cached so resize/re-theme never re-parse", and until this phase
 * there was no way to honour it: `renderFromMusicXml` always parsed, so
 * every resize, every theme change and every scroll/page switch paid for
 * the XML again. Parsing is by far the most expensive step (measured on
 * a 100-measure score in Chromium: 35.8ms of a 46.9ms total), so a host
 * driving an interactive resize was spending three quarters of its
 * budget re-deriving a `Score` it already had.
 *
 * Hold the `parseMusicXml` result, call this as often as you like.
 * `renderFromMusicXml` is exactly `parseMusicXml` + this, so nothing
 * about the one-shot path changes.
 */
export declare function renderParsedMusicXml(parsed: ParseResult, options?: RenderParsedMusicXmlOptions): RenderFromMusicXmlResult;
/**
 * Parse a MusicXML document and render it, in one call -- the ordinary
 * entry point, and exactly `parseMusicXml` followed by
 * `renderParsedMusicXml`.
 *
 * For anything that re-renders the SAME score (a resize, a theme change,
 * a scroll/page switch), keep the `parseMusicXml` result and call
 * `renderParsedMusicXml` instead: parsing is the expensive step, and
 * §18.1's interactive budgets assume it is not repeated.
 */
export declare function renderFromMusicXml(xmlText: string, options?: RenderFromMusicXmlOptions): RenderFromMusicXmlResult;
