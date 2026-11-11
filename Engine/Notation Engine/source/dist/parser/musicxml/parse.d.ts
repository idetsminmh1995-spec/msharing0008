import type { DurationType } from '../../core/duration.js';
import { type Score } from '../../core/score.js';
import { type Diagnostic } from './diagnostic.js';
import { type ClefSpec } from './attributes.js';
import { type ScoreCredit, type ScoreDefaults, type ScoreIdentity } from './defaults.js';
import { type ParsedDynamicLevel, type ParsedWedge } from './direction.js';
import { type ParsedHarmony } from './harmony.js';
/**
 * The per-(part, measure) clef/key/time/barline side-table §10 asks for --
 * separate from the core `Score`, which never knows about clefs or key/time
 * signatures at all (those are notational, not musical, per Phase 3).
 * Every measure gets an entry, even ones with no `<attributes>` of their
 * own -- inheriting whatever was last in effect, matching MusicXML's own
 * "attributes persist until changed" semantics.
 */
export interface MeasureAttributes {
    readonly partId: string;
    readonly measureNumber: number;
    readonly divisions: number;
    readonly fifths: number;
    /** `<key><mode>` as the file wrote it, lower-cased. Absent when it wrote none -- `fifths` alone cannot tell G major from E minor. */
    readonly mode?: string;
    readonly timeNumerator: number;
    readonly timeDenominator: number;
    /** STATUS C3/§9.4: an additive meter's written form ("3+2+2"), when the file wrote one. Absent for an ordinary meter. */
    readonly timeNumeratorDisplay?: string;
    readonly clefSign: string;
    readonly clefLine?: number;
    /** Integration A: how many staves this part has (piano = 2, most instruments = 1). */
    readonly staves: number;
    /** Integration A: every staff's own clef, keyed by staff number -- what a grand staff needs so its bass staff isn't collapsed onto its treble staff. */
    readonly clefsByStaff: Readonly<Record<number, ClefSpec>>;
    /** Integration B: each staff's own line count (tab = 6, most = 5), keyed by staff number. Absent entries mean the ordinary 5. */
    readonly staffLinesByStaff: Readonly<Record<number, number>>;
    /** Raw MusicXML <bar-style> text (e.g. "light-heavy") for this measure's ending (right-edge) barline, if present -- from a <barline> with no `location`, or an explicit `location="right"`. Mapping this to Phase 13's BarlineType is a later integration step's job, not the parser's. */
    readonly barlineStyle?: string;
    readonly repeatDirection?: 'forward' | 'backward';
    /**
     * `<repeat times="N">` on that same ending barline -- how many times
     * the repeated section is played IN TOTAL, not how many times it is
     * jumped back to. MusicXML's default when the attribute is absent is
     * 2 (play it, jump back, play it again), which is why this is
     * optional rather than defaulted here: "the file said 2" and "the
     * file said nothing" are different facts, and only the repeat
     * resolver needs to collapse them.
     */
    readonly repeatTimes?: number;
    /** `<ending number="1,2">` on the ending barline -- the volta numbers this measure's right edge closes. */
    readonly endingNumbers?: readonly number[];
    /** That `<ending>`'s own type. `discontinue` is an open-ended volta (no down-hook), which plays exactly like `stop`. */
    readonly endingType?: 'start' | 'stop' | 'discontinue';
    /**
     * Integration Q: the SAME two fields, but for a `<barline location="left">`
     * -- this measure's OWN starting (left-edge) barline, a different
     * physical position from its ending one above. Real files commonly write
     * a repeat's opening barline this way, on the first measure of the
     * repeated section, rather than as a `location="right"` on the measure
     * before it -- both describe the same barline conceptually, but only
     * `location` says which edge of THIS measure to draw it on.
     */
    readonly leftBarlineStyle?: string;
    readonly leftRepeatDirection?: 'forward' | 'backward';
    readonly leftRepeatTimes?: number;
    /** `<ending number="1,2" type="start">` on the STARTING barline -- the volta numbers this measure opens, which is where a volta bracket is drawn from. */
    readonly leftEndingNumbers?: readonly number[];
    readonly leftEndingType?: 'start' | 'stop' | 'discontinue';
}
export interface TempoMarkEvent {
    readonly partId: string;
    readonly measureNumber: number;
    /** This measure-local tick, from the shared §10.1 cursor, at which the mark appears -- a <direction> is a marking, not a note/rest, and never advances that cursor. */
    readonly tick: number;
    readonly beatUnit: DurationType;
    readonly beatUnitDots: number;
    readonly perMinute: number;
}
/**
 * Phase 35 Tier 2/§10.4: one `<direction>`'s recognized content at the
 * measure-local tick it appeared at. A side-table for the same reason
 * `tempoMarks` is one -- a direction attaches to a POSITION, not to a
 * note, so Phase 3's core `Score` deliberately has nowhere to put it.
 */
export interface DirectionEvent {
    readonly partId: string;
    readonly measureNumber: number;
    /** Measure-local tick from §10.1's shared cursor. A `<direction>` is a marking and never advances it. */
    readonly tick: number;
    /** `<direction staff="N">`, defaulting to 1 -- which staff of a grand staff this marking sits under. */
    readonly staff: number;
    readonly placement?: 'above' | 'below';
    readonly dynamics: readonly ParsedDynamicLevel[];
    readonly wedges: readonly ParsedWedge[];
    readonly words: readonly string[];
    readonly rehearsals: readonly string[];
}
/** Phase 35 Tier 2/§10.4: one `<harmony>` (chord symbol) at a measure-local tick. See `harmony.ts` for why the `<kind>` is preserved raw rather than reduced. */
export interface HarmonyEvent extends ParsedHarmony {
    readonly partId: string;
    readonly measureNumber: number;
    readonly tick: number;
}
/**
 * Phase 35 Tier 2/§10.4: one `<print>`'s system/page break request.
 * §16.2's page layout consumes this directly ("Respects explicit
 * `<print new-system="yes">`/`new-page="yes"` from MusicXML").
 */
export interface PrintEvent {
    readonly partId: string;
    readonly measureNumber: number;
    readonly newSystem: boolean;
    readonly newPage: boolean;
    /**
     * Integration W: the layout this `<print>` carries, in staff spaces
     * (the file writes tenths). Every field is optional because a
     * `<print>` states only what it wants to change.
     */
    readonly layout?: PrintLayout;
}
/** The layout hints one `<print>` carries, in staff spaces. */
export interface PrintLayout {
    /** `<staff-layout number="N"><staff-distance>`, by staff number: the gap ABOVE that staff. */
    readonly staffDistances?: Readonly<Record<number, number>>;
    /** `<system-layout><system-distance>` -- between this system and the one before it. */
    readonly systemDistance?: number;
    /** `<system-layout><top-system-distance>` -- from the page's top margin to the first system. */
    readonly topSystemDistance?: number;
    readonly systemLeftMargin?: number;
    readonly systemRightMargin?: number;
}
export interface ParseResult {
    readonly score: Score;
    readonly attributes: readonly MeasureAttributes[];
    readonly diagnostics: readonly Diagnostic[];
    /** Integration D: every real <direction><direction-type><metronome> found, in document order. A separate side-table for the same reason midiInstrumentsByPart is -- a rendering-relevant fact Phase 3 deliberately keeps off the core Score/Note types. */
    readonly tempoMarks: readonly TempoMarkEvent[];
    /**
     * Phase 35/§10.4's `<midi-instrument>` data: per-part, a map from each
     * `<instrument id="...">` a `<note>` can reference to its GM
     * percussion note number (already corrected for MusicXML's 1-based
     * vs. GM's 0-based numbering -- see `instrument.ts`). Exposed as its
     * own side-table, the same shape as `attributes`, rather than added to
     * the core `Score`/`Note` types -- this is exactly the kind of "extra
     * fact a renderer might want, that Phase 3 deliberately keeps out of
     * the musical data model" `MeasureAttributes` already exists for.
     * Phase 41's own GM-note-to-notehead-shape default table is what
     * actually consumes this; this phase only makes the mapping available.
     */
    readonly midiInstrumentsByPart: ReadonlyMap<string, ReadonlyMap<string, number>>;
    /** Phase 35 Tier 2/§10.4: every `<direction>` with recognized content, in document order. */
    readonly directions: readonly DirectionEvent[];
    /** Phase 35 Tier 2/§10.4: every `<harmony>`, in document order. */
    readonly harmonies: readonly HarmonyEvent[];
    /** Phase 35 Tier 2/§10.4: every `<print>` that asks for a system or page break, in document order. */
    readonly prints: readonly PrintEvent[];
    /**
     * Integration W/§10.4: `<defaults>` -- the engraving the EXPORTING
     * program used, in staff spaces. Undefined when the file carries no
     * `<defaults>` at all, which most hand-written ones do not.
     */
    readonly defaults?: ScoreDefaults;
    /** Integration W: `<work>` and `<identification>` -- what the score calls itself and who wrote it. */
    readonly identity: ScoreIdentity;
    /** Integration W: every `<credit>` the file places on its own title page, in document order. */
    readonly credits: readonly ScoreCredit[];
}
/** Minimal shape of what a DOMParser needs to provide -- lets tests inject jsdom's (or any other) implementation, per §10's "tests inject a parser so Node can run them." */
export interface DomParserLike {
    parseFromString(text: string, mimeType: string): {
        documentElement: Element | null;
    };
}
export interface ParseMusicXmlOptions {
    readonly domParser?: new () => DomParserLike;
}
/**
 * Turns a MusicXML `<score-partwise>` document into a `Score` (§6) plus
 * the `MeasureAttributes` side-table and any `Diagnostic`s. Never throws
 * on malformed input (§10.7) -- the worst case is an empty `Score` with
 * diagnostics explaining why.
 *
 * Only `<score-partwise>` is accepted directly; `<score-timewise>`
 * conversion is Phase 36, and `.mxl` (compressed) input is Phase 36 too --
 * pass this function the already-decompressed XML text.
 */
export declare function parseMusicXml(xmlText: string, options?: ParseMusicXmlOptions): ParseResult;
