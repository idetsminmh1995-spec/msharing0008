import type { SpacingConfig } from '../config/config.js';
/**
 * The part of `SpacingConfig` §14's own algorithms actually read.
 *
 * A `Pick` rather than the whole interface because `SpacingConfig` also
 * carries `minMeasureWidth`, which is a MEASURE-level floor applied by
 * the renderer, not an input to proportional spacing -- and because the
 * renderer deliberately passes these four with a different `justify`
 * than the config's (a scroll system is never stretched). Taking only
 * what is used keeps a caller from having to invent a value for a field
 * that would be ignored.
 */
type SpacingAlgorithmConfig = Pick<SpacingConfig, 'law' | 'quarterNoteSpace' | 'durationSlope' | 'spacingDensity' | 'spacingIncrement' | 'shortestDurationSpace' | 'minNoteDistance' | 'justify'>;
import { type SpacingDiagnostic } from './spacing-diagnostic.js';
/**
 * §14's own responsibility: decide the x-position of every event in a
 * measure and the measure's total width. Pure math -- produces numbers,
 * not SVG, and takes no dependency on `render/` or `geometry/` for the
 * same reason Phase 3's own dependency table keeps `layout/` one-way
 * (`layout/` orchestrates into positions that `render/` draws, never
 * the reverse).
 */
export interface SpacingEvent {
    readonly ticks: number;
    /**
     * The shortest note or rest STARTING at this attack, in any voice --
     * MuseScore's `Segment::shortestChordRest`.
     *
     * It is NOT the same as `ticks`, and the difference is the whole of
     * MuseScore's multi-voice spacing. `ticks` is the gap to the next
     * attack; this is how long the shortest thing that begins here
     * actually lasts. They are equal whenever the gap is set by a note
     * that ends at the next attack, and they come apart the moment one
     * voice holds a long note while another moves underneath it -- a
     * drum chart's every other bar.
     *
     * Omit it and it is taken as equal to `ticks`, which is what a
     * single-voice measure always is.
     */
    readonly shortestSounding?: number;
    /**
     * How far this attack's own ink reaches to the RIGHT of its x: the
     * notehead, and its augmentation dots. §14.2's minimum-distance floor
     * is measured from this, not from the notehead alone. A caller with
     * nothing more specific may pass 0 here and rely on proportional
     * spacing alone (matching the pre-Phase-43 renderer's own
     * approximation).
     */
    readonly renderedWidth: number;
    /**
     * How far it reaches to the LEFT of its x: its accidental, and the
     * gap between that and the notehead. 0 when there is none.
     *
     * It is a separate number from `renderedWidth` because an accidental
     * is drawn BEFORE its notehead, so it widens the gap that comes
     * INTO this attack and not the one that leaves it. Folding it into
     * the width pushed the following note away instead of this one,
     * which puts the accidental's room on the wrong side of the note
     * that needs it.
     */
    readonly leadingWidth?: number;
    /**
     * The same width, but PER STAFF -- keyed by whatever the caller calls
     * a staff (`"P1:1"`, say). Only the staves that actually draw
     * something at this attack appear.
     *
     * This is what makes the minimum-distance pass behave like
     * MuseScore's, and the difference is a cross-staff one. A dotted note
     * low in the bass staff is wide, and the attack after it may be in
     * the TREBLE staff, half a stave away -- nothing can collide, and
     * MuseScore (which spaces by each element's real shape) lets them sit
     * close. The old pass took one width per attack, the widest anywhere
     * on the system, and pushed the next attack clear of it whatever
     * staff that was: on a grand staff where the two hands alternate,
     * which is most piano music, that inflated the gap after every wide
     * thing in either staff.
     *
     * Omit it and `renderedWidth` is used for one anonymous staff, which
     * is exactly the old behaviour and right for a single-staff part.
     */
    readonly widthsByStaff?: ReadonlyMap<string, number>;
    /** `leadingWidth`, per staff, keyed exactly as `widthsByStaff` is. */
    readonly leadingByStaff?: ReadonlyMap<string, number>;
}
/**
 * §14.1: "the most frequently occurring shortest duration per measure,
 * NOT the globally shortest note" -- one stray 32nd note must not
 * inflate the whole score's spacing. Implemented as: group by exact
 * tick length, rank by frequency (descending), and where two lengths
 * tie on frequency, prefer the SHORTER one -- "shortest" is the
 * qualifier that breaks a frequency tie, not a separate ranking axis.
 *
 * Falls back to a quarter note's own tick length (§6.2's
 * `TICKS_PER_QUARTER`) for an empty measure, since a reference duration
 * of 0 would make every later ratio undefined.
 */
export declare function computeReferenceDuration(events: readonly SpacingEvent[], ticksPerQuarter: number): number;
/**
 * §14.1's duration-proportional space, in staff spaces, that a note of
 * `ticks` is followed by relative to a system's own `referenceTicks`:
 * doubling the duration adds exactly one `spacingIncrement` (a
 * logarithmic relationship -- confirmed by §14's own worked example,
 * 8th->2.4sp, quarter->3.6sp, half->4.8sp, each step +1.2sp for each
 * doubling); a duration SHORTER than the reference instead scales
 * linearly by its own ratio against it, per §14.1's separate,
 * explicitly-stated rule for that case.
 */
export declare function computeEventSpace(ticks: number, referenceTicks: number, config: SpacingAlgorithmConfig): number;
/**
 * The two clocks the two laws measure against.
 *
 * §14's law is relative: it asks how this note compares with the
 * measure's own most common duration, so it needs `referenceTicks`.
 * MuseScore's is absolute: every duration is priced against a quarter
 * note, so it needs `ticksPerQuarter`. Both are carried because a
 * caller does not have to know which law is in force -- the config
 * does.
 */
export interface SpacingClock {
    /** `'increment'` only: `computeReferenceDuration`'s answer for this measure. */
    readonly referenceTicks: number;
    /** `'musescore'` only: one quarter note, in this score's ticks. */
    readonly ticksPerQuarter: number;
}
/**
 * The room one attack is given before anything else moves it, in staff
 * spaces -- under whichever law `config.law` names.
 *
 * `previous` is the attack before this one, which only MuseScore's law
 * reads, and only for the polyrhythm case its own source calls out.
 *
 * The MuseScore branch is `musescore/spacing.ts`'s own function rather
 * than a copy of its arithmetic. That folder is where the number is
 * checked against MuseScore; having the renderer compute it a second
 * way would mean two places to keep in step and one of them unchecked.
 */
export declare function computeAttackSpace(event: SpacingEvent, previous: SpacingEvent | undefined, clock: SpacingClock, config: SpacingAlgorithmConfig): number;
/**
 * The proportional x-position of every event in `events`, left to right,
 * starting at 0 -- each event's own position is the running sum of every
 * earlier event's `computeAttackSpace`. This is the FIRST pass alone;
 * the minimum-distance pass (`applyMinimumDistance`) and justification
 * (`justifySystem`) are deliberately separate functions run afterward,
 * which is how MuseScore stages it too.
 */
export declare function computeProportionalPositions(events: readonly SpacingEvent[], clock: SpacingClock, config: SpacingAlgorithmConfig): readonly number[];
/**
 * §14.2: a second pass over already-computed proportional positions,
 * enforcing a real minimum gap for every adjacent pair -- the left
 * element's own full rendered width plus `config.minNoteDistance`.
 * Where that minimum wins over the proportional gap, every position
 * from that point on is pushed forward by the shortfall (a cascading
 * push, not a local fix -- pushing only one position would leave the
 * NEXT gap too small again).
 */
export declare function applyMinimumDistance(positions: readonly number[], events: readonly SpacingEvent[], config: SpacingAlgorithmConfig): readonly number[];
/**
 * §14.3: stretches a set of adjacent positions so the last one reaches
 * `targetWidth`, distributing the added space proportionally to each
 * gap's OWN natural size ("each spring's flexibility") -- a gap that
 * was already wide absorbs proportionally more of the stretch than a
 * narrow one, keeping the piece's own relative rhythm-driven spacing
 * intact rather than spreading everything evenly.
 *
 * §14.3 also states the *policy* that the final system of a piece is
 * never stretched (ragged-right) -- that decision belongs to whichever
 * caller groups events into systems (§16, not yet built); this function
 * itself is a pure stretch-to-width operation with no opinion on when to
 * call it. `config.justify === false` disables stretching outright.
 */
export declare function justifySystem(positions: readonly number[], targetWidth: number, config: SpacingAlgorithmConfig): readonly number[];
/**
 * §14's own stated error condition: a measure that's wider than the
 * available system width even after §14.2's minimum-distance pass.
 * Returns a warning rather than throwing or clamping -- the overflow is
 * ALLOWED to stand (this function never modifies `positions`), and §16
 * (system/page breaking, not yet built) is where a real fix -- breaking
 * the system earlier -- eventually belongs.
 */
export declare function checkMeasureOverflow(positions: readonly number[], events: readonly SpacingEvent[], availableWidth: number): SpacingDiagnostic | undefined;
export {};
