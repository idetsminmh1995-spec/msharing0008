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
