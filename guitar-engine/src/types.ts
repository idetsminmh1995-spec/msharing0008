/**
 * types.ts — what a guitar stage is made of.
 *
 * A guitar is not a piano: the same pitch can be played in several
 * places, and WHERE it is played is the whole point of the picture. So
 * a note here is a position -- a string and a fret -- not a pitch, and
 * the drawing is a fretboard with those positions lit.
 *
 * Nothing here knows about a score or a page: a caller hands over
 * positions in seconds and gets a drawing back.
 */

/**
 * Which finger stops a note, numbered as a score numbers them.
 *
 * 0 is an open string -- no finger at all -- and it is a real answer
 * rather than a missing one, which is why it has a number. `undefined`
 * means nobody has said yet, and that is drawn in its own colour so an
 * unanswered note never borrows a finger's.
 */
export type Finger = 0 | 1 | 2 | 3 | 4;

/** One note, as a place on the neck, in the same seconds the audio is counted in. */
export interface GuitarNote {
  /** 1 is the highest-pitched string, as MusicXML and every tab numbers them. */
  readonly string: number;
  /** 0 is the open string. */
  readonly fret: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly finger?: Finger;
  /**
   * The fret this note SLIDES to, if it does.
   *
   * A slide is one finger travelling along a string while it sounds,
   * so the mark this note draws is not at a fret but between two of
   * them, moving. Absent for the ordinary note that stays put.
   */
  readonly slideToFret?: number;
}

/** A note as it is being played at one moment: the same note, at the fret it is on NOW. */
export interface LivePosition {
  readonly string: number;
  /** Fractional while a slide is travelling -- 5.4 is four tenths of the way from the 5th fret to the 6th. */
  readonly fret: number;
  readonly finger?: Finger;
  /** True while this note is sliding, so a caller can draw the movement rather than a dot. */
  readonly sliding: boolean;
  /** Where the slide started and where it is going. Equal to `fret` when it is not sliding. */
  readonly fromFret: number;
  readonly toFret: number;
}

/** Where a string is drawn, and how thick. */
export interface StringLine {
  readonly string: number;
  /** Along the neck's short axis: y in a horizontal neck. */
  readonly offset: number;
  readonly thickness: number;
}

/** Where a fret wire is drawn. `fret` 0 is the nut. */
export interface FretWire {
  readonly fret: number;
  /** Along the neck's long axis: x in a horizontal neck. */
  readonly offset: number;
}

export interface GuitarColors {
  /** The neck itself. */
  readonly board: string;
  readonly boardEdge: string;
  readonly fretWire: string;
  readonly nut: string;
  readonly inlay: string;
  readonly string: string;
  /** A note nobody has assigned a finger to yet -- not a finger's colour. */
  readonly unassigned: string;
  /** An open string: played, but by no finger. */
  readonly open: string;
  /** 1 index, 2 middle, 3 ring, 4 little. */
  readonly index: string;
  readonly middle: string;
  readonly ring: string;
  readonly little: string;
  /** Behind the neck. `'none'` draws nothing, which is what a video frame wants. */
  readonly background: string;
}

export interface FretboardOptions {
  readonly width: number;
  readonly height: number;
  /** How many strings the instrument has: 6 for a guitar, 4 for a bass. */
  readonly strings?: number;
  /** The first and last fret drawn. The nut is fret 0. */
  readonly firstFret?: number;
  readonly lastFret?: number;
  readonly colors?: Partial<GuitarColors>;
}

export interface GuitarStageOptions extends FretboardOptions {
  /** Where the music is now, in seconds. */
  readonly seconds: number;
  readonly notes?: readonly GuitarNote[];
}

/**
 * One shape of a drawn frame.
 *
 * The stage is a list of these rather than markup, so the same frame
 * can be written as SVG for a page and painted onto a canvas for a
 * video without either one re-deciding what it looks like.
 */
export interface StageShape {
  readonly kind: 'rect' | 'circle';
  readonly x: number;
  readonly y: number;
  /** A rect's box; a circle's diameter. */
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly radius?: number;
  readonly opacity?: number;
}
