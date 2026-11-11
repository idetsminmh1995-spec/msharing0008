/**
 * logos.ts — one mark per design.
 *
 * The same idea as `theme.ts`: what a design LOOKS like belongs to the
 * design, not to a switch the person flips before every video. The
 * palette already works that way, and so does the mark now -- pick
 * Pendulum and the drum logo is in the corner, pick Beat Dots and the
 * piano logo is.
 *
 * What is stored is a NAME, not a file path. The engine has no idea
 * where a host keeps its images and should not: a page resolves
 * `'drum'` to whatever it has, and the same engine serves a site whose
 * marks live somewhere else entirely. `metronomeLogoName(id)` is the
 * whole interface.
 *
 * A mark the person uploads themselves still wins over all of this --
 * that is the page's decision, and it is the right one: a table of
 * defaults is for when nobody has said anything.
 */

/**
 * Which instrument's mark belongs to each design.
 *
 * The owner chose the first two outright: Pendulum is the drum, Beat
 * Dots is the piano. The rest take the remaining instruments in the
 * order the designs are listed in, so each has one of its own, and the
 * last four take the house mark -- there are eleven designs and seven
 * instruments, and repeating a drum on design 9 would say something
 * untrue about it rather than nothing.
 */
const LOGOS: Readonly<Record<string, string>> = {
  pendulum: 'drum',
  'beat-dots': 'piano',
  'pulse-ring': 'guitar',
  'bar-meter': 'bass',
  'sweep-dial': 'violin',
  'big-number': 'cello',
  'segment-ring': 'vocal',
  'travel-line': 'sharing',
  'flash-frame': 'sharing',
  'bounce-ball': 'sharing',
  'stack-blocks': 'sharing',
};

/** The house mark, for a design with no instrument of its own. */
export const DEFAULT_LOGO_NAME = 'sharing';

/**
 * The mark this design carries, as a name a host resolves to a file.
 *
 * An unknown design gets the house mark rather than nothing: a corner
 * that is empty on one design and branded on the other ten reads as a
 * bug, and the house mark is never wrong.
 */
export function metronomeLogoName(designId: string): string {
  return LOGOS[designId] ?? DEFAULT_LOGO_NAME;
}
