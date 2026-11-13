/**
 * clefs.ts — MuseScore's own clef table.
 *
 * MuseScore positions a note on the staff with two numbers and one
 * subtraction, and this file is both of them:
 *
 *     absStep = stepIndex + (octave + 1) * 7      // C-1 = 0, C4 = 35
 *     line    = pitchOffset(clef) - absStep       // 0 = TOP staff line,
 *                                                 // +1 per HALF space down
 *
 * `pitchOffset` is the whole clef: it is the absolute diatonic step
 * that would sit on line 0. Everything else about a clef -- which
 * glyph, which staff group, where its own symbol is drawn, where a key
 * signature's accidentals go -- hangs off the same row.
 *
 * `staffPositionFromLine` in `staff-position.ts` converts `line` into
 * this engine's own y convention; nothing here assumes either one.
 */

import type { MuseScoreSource } from './provenance.js';

export const CLEF_TABLE_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/clef.cpp',
  symbol: 'ClefInfo::clefTable[]',
  what: "every clef's staff line, pitch offset, SMuFL symbol, staff group and key-signature accidental lines",
};

export const STAFF_POSITION_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/utils.cpp',
  symbol: 'absStep(int tpc, int pitch) / relStep(int line, ClefType clef)',
  what: 'the two-line rule that turns a pitch into a staff line under a clef',
};

export const MUSICXML_CLEF_SOURCE: MuseScoreSource = {
  path: 'src/importexport/musicxml/internal/import/importmusicxmlpass2.cpp',
  symbol: 'MusicXmlParserPass2::clef()',
  what: 'which ClefType MuseScore picks for a MusicXML <sign>/<line>/<clef-octave-change>',
};

/** Which kind of staff a clef belongs on -- MuseScore's own StaffGroup. */
export type MuseScoreStaffGroup = 'STANDARD' | 'PERCUSSION' | 'TAB';

export interface MuseScoreClef {
  /** MuseScore's own ClefType enumerator name, so a row can be found in its source. */
  readonly type: string;
  /**
   * The staff line the clef GLYPH is drawn on, counted 1..5 from the
   * BOTTOM -- MuseScore's `ClefInfo::line`. Treble is 2 (the G line),
   * bass 4, alto 3.
   */
  readonly line: number;
  /**
   * The absolute diatonic step that would land on line 0 (the top staff
   * line). Treble 45, bass 33, alto 41 -- see the formula above.
   */
  readonly pitchOffset: number;
  /** SMuFL glyph name for the clef itself. */
  readonly symId: string;
  readonly staffGroup: MuseScoreStaffGroup;
  /**
   * Where a key signature's accidentals go under this clef, as staff
   * lines in the same units as `pitchOffset` produces: the first seven
   * are the sharps in order (F C G D A E B), the last seven the flats
   * (B E A D G C F).
   */
  readonly keySignatureLines: readonly number[];
}

/**
 * Every clef MuseScore knows, in its own enum order.
 *
 * Kept whole rather than trimmed to the ones this project draws today:
 * the point of the table is that a file asking for a baritone F clef or
 * a 15ma treble gets the answer MuseScore would give, and a trimmed
 * table silently gives a different one.
 */
export const MUSESCORE_CLEFS: readonly MuseScoreClef[] = [
  {
    type: 'G',
    line: 2,
    pitchOffset: 45,
    symId: 'gClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'G15_MB',
    line: 2,
    pitchOffset: 31,
    symId: 'gClef15mb',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'G8_VB',
    line: 2,
    pitchOffset: 38,
    symId: 'gClef8vb',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'G8_VA',
    line: 2,
    pitchOffset: 52,
    symId: 'gClef8va',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'G15_MA',
    line: 2,
    pitchOffset: 59,
    symId: 'gClef15ma',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'G8_VB_O',
    line: 2,
    pitchOffset: 38,
    symId: 'gClef8vbOld',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'G8_VB_P',
    line: 2,
    pitchOffset: 45,
    symId: 'gClef8vbParens',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'G_1',
    line: 1,
    pitchOffset: 47,
    symId: 'gClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'C1',
    line: 1,
    pitchOffset: 43,
    symId: 'cClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [5, 1, 4, 0, 3, -1, 2, 2, 6, 3, 7, 4, 8, 5],
  },
  {
    type: 'C2',
    line: 2,
    pitchOffset: 41,
    symId: 'cClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [3, 6, 2, 5, 1, 4, 0, 0, 4, 1, 5, 2, 6, 3],
  },
  {
    type: 'C3',
    line: 3,
    pitchOffset: 39,
    symId: 'cClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [1, 4, 0, 3, 6, 2, 5, 5, 2, 6, 3, 7, 4, 8],
  },
  {
    type: 'C4',
    line: 4,
    pitchOffset: 37,
    symId: 'cClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [6, 2, 5, 1, 4, 0, 3, 3, 0, 4, 1, 5, 2, 6],
  },
  {
    type: 'C5',
    line: 5,
    pitchOffset: 35,
    symId: 'cClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [4, 0, 3, -1, 2, 5, 1, 1, 5, 2, 6, 3, 7, 4],
  },
  {
    type: 'C_19C',
    line: 2,
    pitchOffset: 45,
    symId: 'cClefSquare',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'C1_F18C',
    line: 1,
    pitchOffset: 43,
    symId: 'cClefFrench',
    staffGroup: 'STANDARD',
    keySignatureLines: [5, 1, 4, 0, 3, -1, 2, 2, 6, 3, 7, 4, 8, 5],
  },
  {
    type: 'C3_F18C',
    line: 3,
    pitchOffset: 39,
    symId: 'cClefFrench',
    staffGroup: 'STANDARD',
    keySignatureLines: [1, 4, 0, 3, 6, 2, 5, 5, 2, 6, 3, 7, 4, 8],
  },
  {
    type: 'C4_F18C',
    line: 4,
    pitchOffset: 37,
    symId: 'cClefFrench',
    staffGroup: 'STANDARD',
    keySignatureLines: [6, 2, 5, 1, 4, 0, 3, 3, 0, 4, 1, 5, 2, 6],
  },
  {
    type: 'C1_F20C',
    line: 1,
    pitchOffset: 43,
    symId: 'cClefFrench20C',
    staffGroup: 'STANDARD',
    keySignatureLines: [5, 1, 4, 0, 3, -1, 2, 2, 6, 3, 7, 4, 8, 5],
  },
  {
    type: 'C3_F20C',
    line: 3,
    pitchOffset: 39,
    symId: 'cClefFrench20C',
    staffGroup: 'STANDARD',
    keySignatureLines: [1, 4, 0, 3, 6, 2, 5, 5, 2, 6, 3, 7, 4, 8],
  },
  {
    type: 'C4_F20C',
    line: 4,
    pitchOffset: 37,
    symId: 'cClefFrench20C',
    staffGroup: 'STANDARD',
    keySignatureLines: [6, 2, 5, 1, 4, 0, 3, 3, 0, 4, 1, 5, 2, 6],
  },
  {
    type: 'F',
    line: 4,
    pitchOffset: 33,
    symId: 'fClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'F15_MB',
    line: 4,
    pitchOffset: 19,
    symId: 'fClef15mb',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'F8_VB',
    line: 4,
    pitchOffset: 26,
    symId: 'fClef8vb',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'F_8VA',
    line: 4,
    pitchOffset: 40,
    symId: 'fClef8va',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'F_15MA',
    line: 4,
    pitchOffset: 47,
    symId: 'fClef15ma',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'F_B',
    line: 3,
    pitchOffset: 35,
    symId: 'fClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [4, 0, 3, -1, 2, 5, 1, 1, 5, 2, 6, 3, 7, 4],
  },
  {
    type: 'F_C',
    line: 5,
    pitchOffset: 31,
    symId: 'fClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'F_F18C',
    line: 4,
    pitchOffset: 33,
    symId: 'fClefFrench',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'F_19C',
    line: 4,
    pitchOffset: 33,
    symId: 'fClef19thCentury',
    staffGroup: 'STANDARD',
    keySignatureLines: [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9],
  },
  {
    type: 'PERC',
    line: 2,
    pitchOffset: 45,
    symId: 'unpitchedPercussionClef1',
    staffGroup: 'PERCUSSION',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'PERC2',
    line: 2,
    pitchOffset: 45,
    symId: 'unpitchedPercussionClef2',
    staffGroup: 'PERCUSSION',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'TAB',
    line: 5,
    pitchOffset: 45,
    symId: 'sixStringTabClef',
    staffGroup: 'TAB',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'TAB4',
    line: 5,
    pitchOffset: 45,
    symId: 'fourStringTabClef',
    staffGroup: 'TAB',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'TAB_SERIF',
    line: 5,
    pitchOffset: 45,
    symId: 'sixStringTabClefSerif',
    staffGroup: 'TAB',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'TAB4_SERIF',
    line: 5,
    pitchOffset: 45,
    symId: 'fourStringTabClefSerif',
    staffGroup: 'TAB',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
  {
    type: 'C4_8VB',
    line: 4,
    pitchOffset: 30,
    symId: 'cClef8vb',
    staffGroup: 'STANDARD',
    keySignatureLines: [6, 2, 5, 1, 4, 0, 3, 3, 0, 4, 1, 5, 2, 6],
  },
  {
    type: 'G8_VB_C',
    line: 2,
    pitchOffset: 38,
    symId: 'gClef8vbCClef',
    staffGroup: 'STANDARD',
    keySignatureLines: [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7],
  },
];

const BY_TYPE = new Map(MUSESCORE_CLEFS.map((c) => [c.type, c]));

/** One clef by its MuseScore enumerator name, or undefined. */
export function museScoreClef(type: string): MuseScoreClef | undefined {
  return BY_TYPE.get(type);
}

/**
 * Which clef MuseScore picks for a MusicXML `<clef>`.
 *
 * Exactly the branch ladder MuseScore's own importer runs, including
 * its defaults for a `<clef>` that omits `<line>` (MusicXML 2.0 allows
 * it, and Primus writes it that way) and its two non-pitch signs.
 * Returns undefined for a combination MuseScore itself does not
 * recognise -- it logs and leaves the clef alone there, and inventing
 * one here would be exactly the guess this layer refuses to make.
 */
export function museScoreClefForMusicXml(
  sign: string,
  line?: number,
  octaveChange = 0,
): MuseScoreClef | undefined {
  const s = sign;
  const i = octaveChange;
  let l = line;
  if (l === undefined) {
    if (s === 'G') l = 2;
    else if (s === 'F') l = 4;
    else if (s === 'C') l = 3;
  }
  let type: string | undefined;
  if (s === 'G' && l === 2) {
    type =
      i === 0
        ? 'G'
        : i === 1
          ? 'G8_VA'
          : i === 2
            ? 'G15_MA'
            : i === -1
              ? 'G8_VB'
              : i === -2
                ? 'G15_MB'
                : undefined;
  } else if (s === 'G' && l === 1 && i === 0) {
    type = 'G_1';
  } else if (s === 'F' && l === 3 && i === 0) {
    type = 'F_B';
  } else if (s === 'F' && l === 4) {
    type =
      i === 0
        ? 'F'
        : i === 1
          ? 'F_8VA'
          : i === 2
            ? 'F_15MA'
            : i === -1
              ? 'F8_VB'
              : i === -2
                ? 'F15_MB'
                : undefined;
  } else if (s === 'F' && l === 5 && i === 0) {
    type = 'F_C';
  } else if (s === 'C') {
    type =
      l === 5
        ? 'C5'
        : l === 4
          ? i === -1
            ? 'C4_8VB'
            : 'C4'
          : l === 3
            ? 'C3'
            : l === 2
              ? 'C2'
              : l === 1
                ? 'C1'
                : undefined;
  } else if (s === 'percussion') {
    type = 'PERC';
  } else if (s === 'TAB') {
    type = 'TAB';
  }
  return type === undefined ? undefined : BY_TYPE.get(type);
}
