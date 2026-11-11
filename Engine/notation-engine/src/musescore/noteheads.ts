/**
 * noteheads.ts -- which SMuFL glyph MuseScore draws for a notehead.
 *
 * Two tables, and the gap between them is the point.
 *
 * The first is MuseScore's own notehead groups: for each group, the
 * glyph it uses for a whole, a half, a quarter (every shorter duration
 * takes the quarter's filled head) and a breve. Almost every group is
 * the same whichever way the stem points; the few that are not say so
 * with `upStem`, because an arrow notehead has to point away from its
 * own stem.
 *
 * The second is how MuseScore reads a MusicXML `<notehead>` element.
 * It holds the trap this project has already been bitten by once and
 * which is worth stating twice: MusicXML's "cross" is the PLUS shape
 * (+) and MusicXML's "x" is the X. Reading them the other way round
 * turns every hi-hat in a drum chart into a plus sign, and the file
 * itself gives no hint that anything is wrong.
 */

import type { MuseScoreSource } from './provenance.js';

export const NOTEHEAD_GROUP_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/note.cpp',
  symbol: 'static const SymId noteHeads[2][...][...]',
  what: 'the SMuFL glyph per notehead group, head type and stem direction',
};

export const NOTEHEAD_ENUM_SOURCE: MuseScoreSource = {
  path: 'src/engraving/types/types.h',
  symbol: 'enum class NoteHeadGroup / enum class NoteHeadType',
  what: 'the group and head-type names, and their order',
};

export const MUSICXML_NOTEHEAD_SOURCE: MuseScoreSource = {
  path: 'src/importexport/musicxml/internal/import/importmusicxmlpass2.cpp',
  symbol: 'convertNotehead(String mxmlName)',
  what: 'MusicXML <notehead> value to MuseScore notehead group',
};

/** MuseScore's `NoteHeadType`: which of a group's four glyphs to take. */
export type MuseScoreHeadType = 'whole' | 'half' | 'quarter' | 'breve';

export interface MuseScoreNoteheadGroup {
  /** MuseScore's own `NoteHeadGroup` enumerator name. */
  readonly group: string;
  /** whole, half, quarter, breve -- the glyphs for a DOWN stem (and for no stem). */
  readonly glyphs: Readonly<Record<MuseScoreHeadType, string>>;
  /** Only where an UP stem changes the glyph; absent means it does not. */
  readonly upStem?: Readonly<Record<MuseScoreHeadType, string>>;
}

/**
 * Every notehead group a MusicXML file or a drumset can reach.
 *
 * MuseScore's full table goes on past these into solfege names, pitch
 * names, German pitch names and Swiss rudiment heads -- schemes that
 * are chosen in MuseScore's own UI and that no MusicXML file asks for,
 * so they are cited and left there rather than copied.
 */
export const MUSESCORE_NOTEHEAD_GROUPS: readonly MuseScoreNoteheadGroup[] = [
  {
    group: 'HEAD_NORMAL',
    glyphs: {
      whole: 'noteheadWhole',
      half: 'noteheadHalf',
      quarter: 'noteheadBlack',
      breve: 'noteheadDoubleWhole',
    },
  },
  {
    group: 'HEAD_CROSS',
    glyphs: {
      whole: 'noteheadXWhole',
      half: 'noteheadXHalf',
      quarter: 'noteheadXBlack',
      breve: 'noteheadXDoubleWhole',
    },
  },
  {
    group: 'HEAD_PLUS',
    glyphs: {
      whole: 'noteheadPlusWhole',
      half: 'noteheadPlusHalf',
      quarter: 'noteheadPlusBlack',
      breve: 'noteheadPlusDoubleWhole',
    },
  },
  {
    group: 'HEAD_XCIRCLE',
    glyphs: {
      whole: 'noteheadCircleXWhole',
      half: 'noteheadCircleXHalf',
      quarter: 'noteheadCircleX',
      breve: 'noteheadCircleXDoubleWhole',
    },
  },
  {
    group: 'HEAD_WITHX',
    glyphs: {
      whole: 'noteheadWholeWithX',
      half: 'noteheadHalfWithX',
      quarter: 'noteheadVoidWithX',
      breve: 'noteheadDoubleWholeWithX',
    },
  },
  {
    group: 'HEAD_TRIANGLE_UP',
    glyphs: {
      whole: 'noteheadTriangleUpWhole',
      half: 'noteheadTriangleUpHalf',
      quarter: 'noteheadTriangleUpBlack',
      breve: 'noteheadTriangleUpDoubleWhole',
    },
  },
  {
    group: 'HEAD_TRIANGLE_DOWN',
    glyphs: {
      whole: 'noteheadTriangleDownWhole',
      half: 'noteheadTriangleDownHalf',
      quarter: 'noteheadTriangleDownBlack',
      breve: 'noteheadTriangleDownDoubleWhole',
    },
  },
  {
    group: 'HEAD_SLASHED1',
    glyphs: {
      whole: 'noteheadSlashedWhole1',
      half: 'noteheadSlashedHalf1',
      quarter: 'noteheadSlashedBlack1',
      breve: 'noteheadSlashedDoubleWhole1',
    },
  },
  {
    group: 'HEAD_SLASHED2',
    glyphs: {
      whole: 'noteheadSlashedWhole2',
      half: 'noteheadSlashedHalf2',
      quarter: 'noteheadSlashedBlack2',
      breve: 'noteheadSlashedDoubleWhole2',
    },
  },
  {
    group: 'HEAD_DIAMOND',
    glyphs: {
      whole: 'noteheadDiamondWhole',
      half: 'noteheadDiamondHalf',
      quarter: 'noteheadDiamondBlack',
      breve: 'noteheadDiamondDoubleWhole',
    },
  },
  {
    group: 'HEAD_DIAMOND_OLD',
    glyphs: {
      whole: 'noteheadDiamondWholeOld',
      half: 'noteheadDiamondHalfOld',
      quarter: 'noteheadDiamondBlackOld',
      breve: 'noteheadDiamondDoubleWholeOld',
    },
  },
  {
    group: 'HEAD_CIRCLED',
    glyphs: {
      whole: 'noteheadCircledWhole',
      half: 'noteheadCircledHalf',
      quarter: 'noteheadCircledBlack',
      breve: 'noteheadCircledDoubleWhole',
    },
  },
  {
    group: 'HEAD_CIRCLED_LARGE',
    glyphs: {
      whole: 'noteheadCircledWholeLarge',
      half: 'noteheadCircledHalfLarge',
      quarter: 'noteheadCircledBlackLarge',
      breve: 'noteheadCircledDoubleWholeLarge',
    },
  },
  {
    group: 'HEAD_LARGE_ARROW',
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
    group: 'HEAD_BREVIS_ALT',
    glyphs: {
      whole: 'noteheadWhole',
      half: 'noteheadHalf',
      quarter: 'noteheadBlack',
      breve: 'noteheadDoubleWholeSquare',
    },
  },
  {
    group: 'HEAD_SLASH',
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
    group: 'HEAD_LARGE_DIAMOND',
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
    group: 'HEAD_SOL',
    glyphs: {
      whole: 'noteShapeRoundWhite',
      half: 'noteShapeRoundWhite',
      quarter: 'noteShapeRoundBlack',
      breve: 'noteShapeRoundDoubleWhole',
    },
  },
  {
    group: 'HEAD_LA',
    glyphs: {
      whole: 'noteShapeSquareWhite',
      half: 'noteShapeSquareWhite',
      quarter: 'noteShapeSquareBlack',
      breve: 'noteShapeSquareDoubleWhole',
    },
  },
  {
    group: 'HEAD_FA',
    glyphs: {
      whole: 'noteShapeTriangleRightWhite',
      half: 'noteShapeTriangleRightWhite',
      quarter: 'noteShapeTriangleRightBlack',
      breve: 'noteShapeTriangleRightDoubleWhole',
    },
    upStem: {
      whole: 'noteShapeTriangleLeftWhite',
      half: 'noteShapeTriangleLeftWhite',
      quarter: 'noteShapeTriangleLeftBlack',
      breve: 'noteShapeTriangleLeftDoubleWhole',
    },
  },
  {
    group: 'HEAD_MI',
    glyphs: {
      whole: 'noteShapeDiamondWhite',
      half: 'noteShapeDiamondWhite',
      quarter: 'noteShapeDiamondBlack',
      breve: 'noteShapeDiamondDoubleWhole',
    },
  },
  {
    group: 'HEAD_DO',
    glyphs: {
      whole: 'noteShapeTriangleUpWhite',
      half: 'noteShapeTriangleUpWhite',
      quarter: 'noteShapeTriangleUpBlack',
      breve: 'noteShapeTriangleUpDoubleWhole',
    },
  },
  {
    group: 'HEAD_RE',
    glyphs: {
      whole: 'noteShapeMoonWhite',
      half: 'noteShapeMoonWhite',
      quarter: 'noteShapeMoonBlack',
      breve: 'noteShapeMoonDoubleWhole',
    },
  },
  {
    group: 'HEAD_TI',
    glyphs: {
      whole: 'noteShapeTriangleRoundWhite',
      half: 'noteShapeTriangleRoundWhite',
      quarter: 'noteShapeTriangleRoundBlack',
      breve: 'noteShapeTriangleRoundDoubleWhole',
    },
  },
  {
    group: 'HEAD_HEAVY_CROSS',
    glyphs: {
      whole: 'noteheadHeavyX',
      half: 'noteheadHeavyX',
      quarter: 'noteheadHeavyX',
      breve: 'noteheadHeavyX',
    },
  },
  {
    group: 'HEAD_HEAVY_CROSS_HAT',
    glyphs: {
      whole: 'noteheadHeavyXHat',
      half: 'noteheadHeavyXHat',
      quarter: 'noteheadHeavyXHat',
      breve: 'noteheadHeavyXHat',
    },
  },
];

const BY_GROUP = new Map(MUSESCORE_NOTEHEAD_GROUPS.map((g) => [g.group, g]));

/**
 * The glyph MuseScore draws for one group, head type and stem.
 *
 * `stem` defaults to 'down' because that is the column MuseScore keeps
 * every stem-independent group in; passing 'up' only changes the answer
 * for the groups that have an `upStem` row at all.
 */
export function museScoreNoteheadGlyph(
  group: string,
  headType: MuseScoreHeadType,
  stem: 'up' | 'down' = 'down',
): string | undefined {
  const row = BY_GROUP.get(group);
  if (row === undefined) return undefined;
  return (stem === 'up' ? (row.upStem ?? row.glyphs) : row.glyphs)[headType];
}

/**
 * MusicXML's `<notehead>` values, as MuseScore reads them.
 *
 * Verbatim in its coverage: a value MuseScore does not list here falls
 * back to the normal head in its importer, and this map says so by not
 * holding the key rather than by inventing a group for it.
 */
export const MUSICXML_NOTEHEAD_TO_GROUP: Readonly<Record<string, string>> = {
  slash: 'HEAD_SLASH',
  triangle: 'HEAD_TRIANGLE_UP',
  diamond: 'HEAD_DIAMOND',
  cross: 'HEAD_PLUS',
  x: 'HEAD_CROSS',
  'circle-x': 'HEAD_XCIRCLE',
  'inverted triangle': 'HEAD_TRIANGLE_DOWN',
  slashed: 'HEAD_SLASHED1',
  'back slashed': 'HEAD_SLASHED2',
  normal: 'HEAD_NORMAL',
  do: 'HEAD_DO',
  re: 'HEAD_RE',
  mi: 'HEAD_MI',
  fa: 'HEAD_FA',
  'fa up': 'HEAD_FA',
  so: 'HEAD_SOL',
  la: 'HEAD_LA',
  ti: 'HEAD_TI',
};

/** MuseScore's notehead group for a MusicXML `<notehead>` value, or undefined. */
export function museScoreGroupForMusicXmlNotehead(value: string): string | undefined {
  return MUSICXML_NOTEHEAD_TO_GROUP[value.trim().toLowerCase()];
}
