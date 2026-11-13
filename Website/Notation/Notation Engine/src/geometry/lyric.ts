/**
 * §9.22's placement rule: below the staff, universally -- confirmed by
 * Noteflight's own published lyric-writing conventions with no
 * exception noted for the common case.
 */
export function lyricSide(): 'below' {
  return 'below';
}

/** The real SMuFL glyph for the centered hyphen drawn between syllables of the same word -- confirmed to exist rather than needing to be drawn as raw geometry. */
export function lyricHyphenGlyphName(): string {
  return 'lyricsHyphenBaseline';
}

/** The real SMuFL glyph for an elision joining two syllables under one note. */
export function lyricElisionGlyphName(): string {
  return 'lyricsElision';
}

/** The centered X for a hyphen between two syllables -- simple midpoint, matching the real convention ("the hyphen will be centered between the syllables"). */
export function computeHyphenX(syllableAEndX: number, syllableBStartX: number): number {
  return (syllableAEndX + syllableBStartX) / 2;
}

export interface ExtenderLineShape {
  readonly startX: number;
  readonly endX: number;
  readonly y: number;
}

/**
 * A melisma extender line's endpoints -- genuinely drawn geometry (no
 * SMuFL glyph represents an arbitrary-length line), using Bravura's real
 * `lyricLineThickness` (0.16sp) for its stroke width at render time, the
 * same reasoning already applied to hairpins (§9.21), ties (§9.15), and
 * slurs (§9.16).
 */
export function computeExtenderLine(startX: number, endX: number, y: number): ExtenderLineShape {
  return { startX, endX, y };
}

/**
 * One syllable as it reaches the row layout: where its note is, how wide
 * the syllable draws, and the two facts that decide the punctuation
 * around it (`<syllabic>`, `<extend/>`).
 *
 * `x` is the NOTE's x, not the text's -- a syllable is centered on its
 * note, so the layout below is what turns one into the other. Keeping
 * the input in note coordinates is what lets the caller compute every x
 * the same way it computes a notehead's.
 */
export interface LyricSyllableBox {
  readonly text: string;
  readonly x: number;
  readonly width: number;
  readonly syllabic?: 'single' | 'begin' | 'middle' | 'end';
  /** `<extend/>`: this syllable is held as a melisma. */
  readonly extend: boolean;
  /**
   * Where an extender line stops if this syllable has none after it --
   * the right edge of the melisma, which only the caller knows (the next
   * syllable's note, or the end of the measure).
   */
  readonly melismaEndX: number;
}

/** One thing a lyric row draws, already positioned in staff spaces. */
export type LyricRenderItem =
  | { readonly kind: 'syllable'; readonly text: string; readonly x: number; readonly width: number }
  | { readonly kind: 'hyphen'; readonly x: number }
  | { readonly kind: 'elision'; readonly x: number }
  | { readonly kind: 'extender'; readonly startX: number; readonly endX: number };

export interface LyricRowOptions {
  /** Advance of the SMuFL hyphen glyph at the row's own font size. */
  readonly hyphenWidth: number;
  /** Advance of the SMuFL elision glyph at the row's own font size. */
  readonly elisionWidth: number;
  /** Clear space between a syllable's own edge and the punctuation that follows it. */
  readonly punctuationGap: number;
}

/**
 * Lays out one verse's syllables left to right, adding the punctuation
 * §9.22 specifies: a hyphen between two syllables of the same word, an
 * elision between two syllables sung on one note, and an extender line
 * for a melisma.
 *
 * Two details are the whole reason this is a function rather than three
 * lines inside the renderer:
 *
 *  - Syllables sharing one x are an ELISION (MusicXML writes several
 *    `<lyric>` elements with the same `number` on one note). They are
 *    laid out as one group, centered on the note as a whole, so the
 *    elision glyph lands between them instead of on top of one.
 *  - A hyphen belongs to the syllable BEFORE it, so it is emitted when
 *    that syllable's `<syllabic>` says the word continues. A file that
 *    omits `<syllabic>` (which is legal -- it means `single`) gets no
 *    hyphen, which is the honest reading: nothing said the word splits.
 */
export function layoutLyricRow(
  boxes: readonly LyricSyllableBox[],
  options: LyricRowOptions,
): readonly LyricRenderItem[] {
  const items: LyricRenderItem[] = [];

  interface Group {
    readonly boxes: readonly LyricSyllableBox[];
    readonly left: number;
    readonly right: number;
  }
  const groups: Group[] = [];
  for (const box of boxes) {
    const previous = groups[groups.length - 1];
    if (previous !== undefined && previous.boxes[0]?.x === box.x) {
      groups[groups.length - 1] = {
        boxes: [...previous.boxes, box],
        left: previous.left,
        right: previous.right,
      };
      continue;
    }
    groups.push({ boxes: [box], left: box.x - box.width / 2, right: box.x + box.width / 2 });
  }

  // Re-center each group's members as a whole, and emit the syllables
  // with an elision glyph between neighbours.
  const centered: { left: number; right: number; last: LyricSyllableBox }[] = [];
  for (const group of groups) {
    const first = group.boxes[0];
    if (first === undefined) continue;
    const total =
      group.boxes.reduce((sum, box) => sum + box.width, 0) +
      (group.boxes.length - 1) * options.elisionWidth;
    let cursor = first.x - total / 2;
    const left = cursor;
    for (const [index, box] of group.boxes.entries()) {
      items.push({ kind: 'syllable', text: box.text, x: cursor + box.width / 2, width: box.width });
      cursor += box.width;
      if (group.boxes[index + 1] !== undefined) {
        items.push({ kind: 'elision', x: cursor + options.elisionWidth / 2 });
        cursor += options.elisionWidth;
      }
    }
    const last = group.boxes[group.boxes.length - 1];
    if (last === undefined) continue;
    centered.push({ left, right: cursor, last });
  }

  for (const [index, entry] of centered.entries()) {
    const next = centered[index + 1];

    // A hyphen only where the file says the word continues AND there is
    // a next syllable in this row to continue to. A `<syllabic>begin`
    // whose partner is in the next measure gets no hyphen at the
    // measure's edge -- there is nothing on the other side of it to
    // join to, and a hyphen running into a barline reads as a hyphen
    // between a word and the barline.
    if (
      next !== undefined &&
      (entry.last.syllabic === 'begin' || entry.last.syllabic === 'middle')
    ) {
      items.push({
        kind: 'hyphen',
        x: computeHyphenX(entry.right + options.punctuationGap, next.left - options.punctuationGap),
      });
    }

    if (entry.last.extend) {
      const startX = entry.right + options.punctuationGap;
      // The melisma ends at the next syllable of this verse when there
      // is one, so the line stops where the next word starts rather
      // than running under it.
      const endX = next !== undefined ? next.left - options.punctuationGap : entry.last.melismaEndX;
      if (endX > startX) items.push({ kind: 'extender', startX, endX });
    }
  }

  return items;
}

/**
 * The baseline y of lyric verse `rowIndex` (0-based) below a staff's
 * bottom line. Verse 0 is the first line of text; each further verse
 * steps down by one row height.
 */
export function lyricRowBaselineY(
  staffBottomY: number,
  rowIndex: number,
  gap: number,
  rowHeight: number,
): number {
  return staffBottomY + gap + rowIndex * rowHeight;
}
