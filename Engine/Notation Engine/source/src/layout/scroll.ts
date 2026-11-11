/**
 * §16.1: "One unbroken system, arbitrarily wide. Measures are laid out
 * left to right at their natural (unjustified) widths. This is the mode
 * a video/cursor use case wants."
 *
 * This formalizes, as its own named and independently testable module,
 * exactly what `render-from-musicxml.ts` was already computing inline
 * since Integration Pass E: each measure's own real, content-driven
 * width (Phase 43's `§14` algorithm, via `computeMeasureLayout`) is
 * placed at the running cumulative x, with no stretching and no limit
 * on how many measures or how wide the result gets -- unlike `§16.2`'s
 * page mode (Phase 46, not yet built), which packs measures into
 * systems and justifies each one once it's full.
 */
export interface ScrollMeasureLayout {
  readonly measureNumber: number;
  readonly x: number;
  readonly width: number;
}

export interface ScrollLayout {
  /** In score order, one entry per measure -- never reordered, never split across "systems" (there is only ever one). */
  readonly measures: readonly ScrollMeasureLayout[];
  /** The sum of every measure's own width -- how wide the single system is, in total. */
  readonly totalWidth: number;
}

export interface ScrollLayoutMeasureInput {
  readonly measureNumber: number;
  readonly width: number;
}

/**
 * Lays out every measure left to right, each at its own given width,
 * starting at x=0. Never stretches a width to fill anything (`§14.3`'s
 * justification is deliberately not applied here -- scroll mode has no
 * "system width" to justify to in the first place, since the system is
 * exactly as wide as its content makes it) and never breaks the
 * sequence into more than one row, no matter how many measures are
 * given or how wide the total becomes.
 */
export function computeScrollLayout(
  measureWidths: readonly ScrollLayoutMeasureInput[],
): ScrollLayout {
  const measures: ScrollMeasureLayout[] = [];
  let x = 0;
  for (const m of measureWidths) {
    measures.push({ measureNumber: m.measureNumber, x, width: m.width });
    x += m.width;
  }
  return { measures, totalWidth: x };
}
