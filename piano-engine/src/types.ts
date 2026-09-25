/**
 * types.ts — what a piano stage is made of.
 *
 * The stage is the part of a video frame under the notation: notes
 * falling towards a keyboard, and the keys they land on lighting up.
 * Nothing here knows about a score, a file or a page -- a caller hands
 * over notes in seconds and gets a drawing back.
 */

/** Which hand plays a note. A piano score says so by staff: 1 is the right hand, 2 the left. */
export type Hand = 'left' | 'right';

/** The four keyboards people actually own. */
export type KeyboardSize = 61 | 73 | 76 | 88;

/** One note, in the same seconds the audio is counted in. */
export interface PianoNote {
  /** MIDI note number: 60 is middle C. */
  readonly midi: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly hand: Hand;
}

/** One key of the drawn keyboard, in the box it was laid out for. */
export interface PianoKey {
  readonly midi: number;
  /** True for the raised short keys -- C#, D#, F#, G#, A#. */
  readonly black: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * One line of the grid the notes fall through: a barline, or a beat
 * inside a bar.
 *
 * In seconds, like everything else here, because the grid IS the
 * music's own time -- the caller reads the bars and beats off the
 * score and hands them over, rather than this engine assuming 4/4 or
 * a fixed tempo.
 */
export interface GridLine {
  readonly seconds: number;
  readonly kind: 'bar' | 'beat';
}

/** One falling bar, already clipped to the area it falls through. */
export interface FallingBar {
  readonly midi: number;
  readonly hand: Hand;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Every colour the stage draws with.
 *
 * The two hand colours are the point of the thing: a viewer reads
 * which hand plays what from colour alone, so they are a caller's
 * choice rather than a constant in here.
 */
export interface PianoColors {
  readonly whiteKey: string;
  readonly blackKey: string;
  readonly keyEdge: string;
  /** The line the notes land on, along the top of the keyboard. */
  readonly strikeLine: string;
  /** The grid the notes fall through: a barline, and the beats inside a bar. Faint on purpose -- it is there to be read past, not at. */
  readonly barLine: string;
  readonly beatLine: string;
  readonly leftHand: string;
  readonly rightHand: string;
  /** Behind the falling notes. `'none'` draws nothing, which is what a video frame wants. */
  readonly background: string;
}

export interface PianoStageOptions {
  readonly size: KeyboardSize;
  /** The whole stage box: falling notes above, keyboard along the bottom. */
  readonly width: number;
  readonly height: number;
  /** Where the music is now, in seconds. */
  readonly seconds: number;
  readonly notes?: readonly PianoNote[];
  /** Bars and beats to rule the falling area with. Empty or absent draws no grid. */
  readonly gridLines?: readonly GridLine[];
  /**
   * How long a note takes to fall from the top of the stage to the
   * keyboard. Longer means more of the coming music is on screen at
   * once, and slower-looking movement.
   */
  readonly leadSeconds?: number;
  /** Height of the keyboard itself. Defaults to a third of the stage, clamped so the keys stay playable-looking. */
  readonly keyboardHeight?: number;
  readonly colors?: Partial<PianoColors>;
}

/**
 * One rectangle of a drawn frame.
 *
 * The stage is described as a list of these rather than as markup, so
 * the same frame can be written as SVG for a page and painted onto a
 * canvas for a video without either one re-deciding what it looks
 * like.
 */
export interface StageShape {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  /** Corner radius. Bars have one; keys do not. */
  readonly radius?: number;
}
