/**
 * noteheads.ts — which SMuFL glyph draws a notehead.
 *
 * Two tables, and the gap between them is the point.
 *
 * The first is the set of notehead GROUPS this engine draws. A group
 * names the glyph to use for a whole, a half, a quarter (every shorter
 * duration takes the quarter's filled head) and a breve. Almost every
 * group is the same whichever way the stem points; the few that are not
 * say so with `upStem`, because an arrow head has to point away from its
 * own stem.
 *
 * The second is how a MusicXML `<notehead>` value maps onto a group.
 * It holds the trap this project has already been bitten by once and
 * which is worth stating twice: MusicXML's "cross" is the PLUS shape (+)
 * and MusicXML's "x" is the X. Reading them the other way round turns
 * every hi-hat in a drum chart into a plus sign, and the file itself
 * gives no hint that anything is wrong.
 *
 * Every glyph name is SMuFL's own; the group set is chosen to cover what
 * a MusicXML file or a drum kit can ask for, and the mapping follows the
 * MusicXML spec's own list of `<notehead>` values.
 */

import type { DefaultsSource } from './sources.js';

export const NOTEHEAD_GROUP_SOURCE: DefaultsSource = {
  source: 'smufl',
  symbol: 'noteheadBlack / noteheadHalf / noteheadWhole and the notehead* families',
  what: 'the SMuFL glyph name for each notehead shape and duration',
};

export const MUSICXML_NOTEHEAD_SOURCE: DefaultsSource = {
  source: 'musicxml',
  symbol: '<notehead> (notehead-value)',
  what: 'the set of notehead shape names a file may ask for',
};

/** Which of a group's four glyphs to take. */
export type NoteheadType = 'whole' | 'half' | 'quarter' | 'breve';

export interface NoteheadGroup {
  /** This engine's own stable id for the group. */
  readonly group: string;
  /** whole, half, quarter, breve — the glyphs for a DOWN stem (and for no stem). */
  readonly glyphs: Readonly<Record<NoteheadType, string>>;
  /** Only where an UP stem changes the glyph; absent means it does not. */
  readonly upStem?: Readonly<Record<NoteheadType, string>>;
}

/**
 * Every notehead group a MusicXML file or a drum kit can reach.
 *
 * The set is deliberately limited to heads that a file or a kit names.
 * Pitch-name, solfège-spelled and shape-note systems that only an editor
 * UI offers are not here: a MusicXML `<notehead>` value does not reach
 * them, and adding them would be inventing notation nobody asked to draw.
 */
export const NOTEHEAD_GROUPS: readonly NoteheadGroup[] = [
  {
    group: 'normal',
    glyphs: {
      whole: 'noteheadWhole',
      half: 'noteheadHalf',
      quarter: 'noteheadBlack',
      breve: 'noteheadDoubleWhole',
    },
  },
  {
    group: 'cross',
    glyphs: {
      whole: 'noteheadXWhole',
      half: 'noteheadXHalf',
      quarter: 'noteheadXBlack',
      breve: 'noteheadXDoubleWhole',
    },
  },
  {
    group: 'plus',
    glyphs: {
      whole: 'noteheadPlusWhole',
      half: 'noteheadPlusHalf',
      quarter: 'noteheadPlusBlack',
      breve: 'noteheadPlusDoubleWhole',
    },
  },
  {
    group: 'circle-x',
    glyphs: {
      whole: 'noteheadCircleXWhole',
      half: 'noteheadCircleXHalf',
      quarter: 'noteheadCircleX',
      breve: 'noteheadCircleXDoubleWhole',
    },
  },
  {
    group: 'with-x',
    glyphs: {
      whole: 'noteheadWholeWithX',
      half: 'noteheadHalfWithX',
      quarter: 'noteheadVoidWithX',
      breve: 'noteheadDoubleWholeWithX',
    },
  },
  {
    group: 'triangle',
    glyphs: {
      whole: 'noteheadTriangleUpWhole',
      half: 'noteheadTriangleUpHalf',
      quarter: 'noteheadTriangleUpBlack',
      breve: 'noteheadTriangleUpDoubleWhole',
    },
  },
  {
    group: 'inverted-triangle',
    glyphs: {
      whole: 'noteheadTriangleDownWhole',
      half: 'noteheadTriangleDownHalf',
      quarter: 'noteheadTriangleDownBlack',
      breve: 'noteheadTriangleDownDoubleWhole',
    },
  },
  {
    group: 'slashed',
    glyphs: {
      whole: 'noteheadSlashedWhole1',
      half: 'noteheadSlashedHalf1',
      quarter: 'noteheadSlashedBlack1',
      breve: 'noteheadSlashedDoubleWhole1',
    },
  },
  {
    group: 'back-slashed',
    glyphs: {
      whole: 'noteheadSlashedWhole2',
      half: 'noteheadSlashedHalf2',
      quarter: 'noteheadSlashedBlack2',
      breve: 'noteheadSlashedDoubleWhole2',
    },
  },
  {
    group: 'diamond',
    glyphs: {
      whole: 'noteheadDiamondWhole',
      half: 'noteheadDiamondHalf',
      quarter: 'noteheadDiamondBlack',
      breve: 'noteheadDiamondDoubleWhole',
    },
  },
  {
    group: 'diamond-old',
    glyphs: {
      whole: 'noteheadDiamondWholeOld',
      half: 'noteheadDiamondHalfOld',
      quarter: 'noteheadDiamondBlackOld',
      breve: 'noteheadDiamondDoubleWholeOld',
    },
  },
  {
    group: 'circled',
    glyphs: {
      whole: 'noteheadCircledWhole',
      half: 'noteheadCircledHalf',
      quarter: 'noteheadCircledBlack',
      breve: 'noteheadCircledDoubleWhole',
    },
  },
  {
    group: 'circled-large',
    glyphs: {
      whole: 'noteheadCircledWholeLarge',
      half: 'noteheadCircledHalfLarge',
      quarter: 'noteheadCircledBlackLarge',
      breve: 'noteheadCircledDoubleWholeLarge',
    },
  },
  {
    group: 'arrow',
    glyphs: {
      whole: 'noteheadLargeArrowUpWhole',
      half: 'noteheadLargeArrowUpHalf',
      quarter: 'noteheadLargeArrowUpBlack',
      breve: 'noteheadLargeArrowUpDoubleWhole',
    },
    upStem: {
      whole: 'noteheadLargeArrowDownWhole',
      half: 'noteheadLargeArrowDownHalf',
      quarter: 'noteheadLargeArrowDownBlack',
      breve: 'noteheadLargeArrowDownDoubleWhole',
    },
  },
  {
    group: 'brevis-square',
    glyphs: {
      whole: 'noteheadWhole',
      half: 'noteheadHalf',
      quarter: 'noteheadBlack',
      breve: 'noteheadDoubleWholeSquare',
    },
  },
  {
    group: 'slash',
    glyphs: {
      whole: 'noteheadSlashWhiteWhole',
      half: 'noteheadSlashWhiteHalf',
      quarter: 'noteheadSlashHorizontalEnds',
      breve: 'noteheadSlashWhiteWhole',
    },
    upStem: {
      whole: 'noteheadSlashWhiteWhole',
      half: 'noteheadSlashWhiteHalf',
      quarter: 'noteheadSlashHorizontalEnds',
      breve: 'noteheadSlashWhiteDoubleWhole',
    },
  },
  {
    group: 'slash-diamond',
    glyphs: {
      whole: 'noteheadSlashDiamondWhite',
      half: 'noteheadSlashDiamondWhite',
      quarter: 'noteheadSlashHorizontalEnds',
      breve: 'noteheadSlashWhiteWhole',
    },
    upStem: {
      whole: 'noteheadSlashDiamondWhite',
      half: 'noteheadSlashDiamondWhite',
      quarter: 'noteheadSlashHorizontalEnds',
      breve: 'noteheadSlashWhiteDoubleWhole',
    },
  },
  {
    group: 'heavy-x',
    glyphs: {
      whole: 'noteheadHeavyX',
      half: 'noteheadHeavyX',
      quarter: 'noteheadHeavyX',
      breve: 'noteheadHeavyX',
    },
  },
  {
    group: 'heavy-x-hat',
    glyphs: {
      whole: 'noteheadHeavyXHat',
      half: 'noteheadHeavyXHat',
      quarter: 'noteheadHeavyXHat',
      breve: 'noteheadHeavyXHat',
    },
  },
];

const BY_GROUP = new Map(NOTEHEAD_GROUPS.map((g) => [g.group, g]));

/** The glyph for one group, head type and stem. */
export function noteheadGlyph(
  group: string,
  headType: NoteheadType,
  stem: 'up' | 'down' = 'down',
): string | undefined {
  const row = BY_GROUP.get(group);
  if (row === undefined) return undefined;
  return (stem === 'up' ? (row.upStem ?? row.glyphs) : row.glyphs)[headType];
}

/**
 * MusicXML's `<notehead>` values, as this engine reads them.
 *
 * A value not listed here falls back to the normal head, which is what
 * the spec asks a reader to do for an unrecognised value — the map says
 * so by not holding the key rather than by inventing a group for it.
 */
export const MUSICXML_NOTEHEAD_TO_GROUP: Readonly<Record<string, string>> = {
  normal: 'normal',
  slash: 'slash',
  triangle: 'triangle',
  diamond: 'diamond',
  cross: 'plus',
  x: 'cross',
  'circle-x': 'circle-x',
  'inverted triangle': 'inverted-triangle',
  slashed: 'slashed',
  'back slashed': 'back-slashed',
};

/** The group for a MusicXML `<notehead>` value, or undefined. */
export function groupForMusicXmlNotehead(value: string): string | undefined {
  return MUSICXML_NOTEHEAD_TO_GROUP[value.trim().toLowerCase()];
}
