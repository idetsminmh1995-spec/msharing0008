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

import type { GuitarPhotograph } from './photo.js';

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

/** One colour stop of a gradient. The colour carries its own alpha if it needs one. */
export interface GradientStop {
  /** 0 at the start of the gradient, 1 at its end. */
  readonly offset: number;
  readonly color: string;
}

/**
 * A gradient, in the same coordinates as the shape it fills.
 *
 * Wood is not one colour, and neither is a fret wire, a string or a
 * sunburst top. Both renderers can draw these -- SVG as a
 * `<linearGradient>` in its defs, canvas as a `CanvasGradient` -- so
 * the picture can look like an instrument without either side
 * inventing anything the other cannot.
 */
export interface LinearGradient {
  readonly kind: 'linear';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly stops: readonly GradientStop[];
}

export interface RadialGradient {
  readonly kind: 'radial';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly stops: readonly GradientStop[];
}

/** What a shape is filled with. */
export type Paint = string | LinearGradient | RadialGradient;

export interface GuitarColors {
  /** The fretboard itself: the wood the frets are set into. */
  readonly board: string;
  /** The same wood in shadow, for the gradient down the board. */
  readonly boardDark: string;
  readonly boardEdge: string;
  /** The neck's own wood, seen at the edges of the board. */
  readonly neckWood: string;
  readonly neckWoodDark: string;
  /** The cream binding down the edge of a bound neck and a bound body. */
  readonly binding: string;
  readonly fretWire: string;
  /** The dark side of a fret wire, which is what makes it look round. */
  readonly fretShadow: string;
  readonly nut: string;
  readonly inlay: string;
  readonly inlayEdge: string;
  readonly string: string;
  /** The line of light along the top of a wound string. */
  readonly stringShine: string;
  /** The fret numbers under the board -- faint, they are there to be glanced at. */
  readonly fretNumber: string;
  /** The headstock at the left, and the tuning pegs on it. */
  readonly headstock: string;
  readonly headstockEdge: string;
  readonly peg: string;
  readonly pegPost: string;
  /** The numbered circle at the head of each string, and the note name beside it. */
  readonly stringLabel: string;
  readonly stringLabelInk: string;
  /** The body at the right: the top, and what is on it. */
  readonly body: string;
  readonly bodyEdge: string;
  /** The dark rim of a sunburst top, and the amber at its centre. */
  readonly bodyBurst: string;
  readonly bodyCentre: string;
  /** The scratchplate on an electric, and the one on an acoustic. */
  readonly pickguard: string;
  readonly pickguardEdge: string;
  /** An acoustic's soundhole and the ring round it. */
  readonly soundhole: string;
  readonly rosette: string;
  /** An electric's pickups and bridge. */
  readonly pickup: string;
  readonly pickupPole: string;
  readonly hardware: string;
  readonly hardwareDark: string;
  readonly knob: string;
  /** The picking hand's stroke marks, over the strings it is hitting. */
  readonly pick: string;
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
  /**
   * Which guitar this is.
   *
   * Not decoration: an acoustic and an electric are different
   * instruments to look at, and a page that offers both should show
   * the one that was picked. It changes the wood, the body and what
   * is mounted on it -- a soundhole, or pickups.
   */
  readonly instrument?: Instrument;
  /** The fret numbers under the board. On unless a caller says otherwise. */
  readonly fretNumbers?: boolean;
  /**
   * The open-string pitches, as MIDI numbers, in the order the strings
   * are DRAWN: index 0 is string 1, the thinnest and highest.
   *
   * Standard tuning when nothing says otherwise. It is here so the
   * string labels can name the notes -- a reader who knows "the D
   * string" should not have to count lines to find it.
   */
  readonly tuning?: readonly number[];
  /** The numbered circles and note names at the head of each string. On unless a caller says otherwise. */
  readonly stringLabels?: boolean;
  /**
   * Let the instrument run off both edges of the picture.
   *
   * A guitar filmed for a video fills the frame: the neck comes in
   * from one edge and the body leaves by the other, and what you see
   * is a window onto something bigger. Off, the whole instrument is
   * drawn inside the box with its string labels beside it.
   */
  readonly bleed?: boolean;
  /** Draw the four-colour hand in a band above the neck, as the video's own legend. */
  readonly handLegend?: boolean;
  /**
   * What the RIGHT hand is playing with.
   *
   * A plectrum strikes the strings together and is written as one
   * mark over all of them -- the square bracket down, the V up.
   * Fingers pluck them one at a time and are written a letter at a
   * time, on the string each finger takes: p the thumb, then i, m and
   * a. They are two different notations because they are two
   * different things to watch, and a video that shows the wrong one
   * is teaching the wrong hand.
   *
   * A plectrum unless a caller says otherwise.
   */
  readonly picking?: Picking;
  /**
   * A PHOTOGRAPH of a guitar, in place of the drawn one.
   *
   * The drawing is shapes and gradients and looks like what it is.
   * When a picture of a real instrument is wanted instead, this is
   * it -- measured, so the marks still land on the right string in
   * the right fret. Everything the engine would have drawn of the
   * instrument itself is left out; everything that is ABOUT the
   * playing -- the hand, the fret numbers, the marks, the picking
   * strokes -- is drawn on top of the picture exactly as before.
   *
   * The picture decides what is seen, so `instrument`, `firstFret`
   * and `lastFret` no longer do: a photograph shows the frets it
   * shows.
   */
  readonly photo?: GuitarPhotograph;
  readonly colors?: Partial<GuitarColors>;
}

/**
 * Which guitar is drawn.
 *
 * Not decoration: these are different instruments to look at, and a
 * page that offers them should show the one that was picked. Each
 * changes the wood, the inlays, the headstock and what is mounted on
 * the body -- a maple board with dots and a scratchplate, a spruce top
 * with a soundhole, or an ebony board with block inlays and a pair of
 * humbuckers. A `classical` is the one with nothing on its board at
 * all: nylon strings, a plain rosette, and not a marker in the wood.
 *
 * How many FRETS each one has is not decided here, because it is not
 * a property of the drawing -- a classical has nineteen and a modern
 * electric twenty-four, and the caller says which with `lastFret`.
 */
export type Instrument = 'classical' | 'acoustic' | 'electric' | 'singleCut';

/** A plectrum, or the fingers. */
export type Picking = 'pick' | 'fingers';

/**
 * A stroke of the picking hand, as the frame should show it.
 *
 * `age` is how far through its life the mark is, 0 at the stroke and 1
 * when it has faded out -- so a still frame shows the stroke that has
 * just happened rather than nothing at all.
 */
export interface PickMark {
  readonly direction: 'down' | 'up';
  /** The strings being hit, in the drawn numbering. */
  readonly strings: readonly number[];
  readonly age: number;
}

export interface GuitarStageOptions extends FretboardOptions {
  /** Where the music is now, in seconds. */
  readonly seconds: number;
  readonly notes?: readonly GuitarNote[];
  /** [D-004] what the right hand is doing, if anything. */
  readonly pick?: PickMark;
}

/**
 * One shape of a drawn frame.
 *
 * The stage is a list of these rather than markup, so the same frame
 * can be written as SVG for a page and painted onto a canvas for a
 * video without either one re-deciding what it looks like.
 */
export interface StageShape {
  readonly kind: 'rect' | 'circle' | 'text' | 'path' | 'image';
  readonly x: number;
  readonly y: number;
  /** A rect's box; a circle's diameter; a text's own size is `fontSize`. */
  readonly width: number;
  readonly height: number;
  readonly fill: Paint;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly radius?: number;
  readonly opacity?: number;
  /**
   * What this shape is for, when a caller has to tell two shapes of
   * the same kind apart -- the fret numbers under the board from the
   * string labels at the head. It changes nothing about the drawing:
   * a renderer paints every shape the same way.
   */
  readonly role?:
    | 'photo'
    | 'fretNumber'
    | 'stringLabel'
    | 'stringName'
    | 'neck'
    | 'board'
    | 'binding'
    | 'fret'
    | 'nut'
    | 'inlay'
    | 'string'
    | 'headstock'
    | 'tuner'
    | 'body'
    | 'pickguard'
    | 'soundhole'
    | 'pickup'
    | 'hardware'
    | 'mark'
    | 'pickStroke';
  /**
   * Path only: an SVG path, filled (never stroked), in the same
   * coordinates as everything else.
   *
   * Here for one reason -- the picking symbols. A down-stroke is a
   * square bracket and an up-stroke a V, the two marks every guitarist
   * already reads, and neither is a rectangle or a circle.
   */
  readonly d?: string;
  /**
   * Image only: the file to draw, in the box `x`/`y`/`width`/`height`
   * gives it.
   *
   * The one shape a renderer cannot paint out of the box's own
   * numbers. SVG writes an `<image>`; a canvas draws the element it
   * has already loaded for this href. Anything that cannot load it
   * should draw nothing rather than a placeholder -- a grey box where
   * the guitar goes is worse than a frame without one.
   */
  readonly href?: string;
  /** Text only. `x`/`y` are the anchor, which `align` and `baseline` place it against. */
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly align?: 'start' | 'middle' | 'end';
  readonly baseline?: 'top' | 'middle' | 'bottom';
}
