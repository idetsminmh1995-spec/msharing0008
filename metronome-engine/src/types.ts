/**
 * types.ts — what a design is handed, and what it hands back.
 *
 * A design never reads a clock, an audio element or the DOM. It is
 * given the state of one frame and returns the SVG for that frame, so
 * the same eleven designs render in a live preview, in an export, and
 * in a test, with nothing to differ between them.
 */

/** The three shapes a video is delivered in. */
export type AspectRatio = '16x9' | '9x16' | '1x1';
export const ASPECT_RATIOS: readonly AspectRatio[] = ['16x9', '9x16', '1x1'];

export interface MetronomeFrame {
  /** 1-based beat within the bar. */
  readonly beat: number;
  /** How many beats this bar has -- 4 for 4/4, 3 for 3/4, 6 for 6/8. */
  readonly beatsPerBar: number;
  /**
   * 0 at the instant the beat lands, rising to 1 just before the next.
   * Designs use it for anything that MOVES between beats -- a swinging
   * pendulum, a sweeping hand, a decaying flash -- so animation is a
   * function of where the music is rather than of a timer this code
   * keeps for itself.
   */
  readonly phase: number;
  /** 1-based bar number, for designs that show it. */
  readonly bar: number;
  readonly bpm: number;
  readonly timeSignature: { readonly numerator: number; readonly denominator: number };
}

export interface MetronomeRenderInput {
  readonly design: string;
  readonly aspect: AspectRatio;
  readonly frame: MetronomeFrame;
  /** Shown by the designs that have a place for it. Empty means no title. */
  readonly title?: string;
  readonly subtitle?: string;
  /**
   * A URL (or data URI) for the mark a design places in its frame.
   * Omitted means the design simply leaves that space alone rather
   * than drawing a placeholder -- a broken image icon in an exported
   * video is worse than no logo.
   */
  readonly logoUrl?: string;
}

/** The canvas a design draws into, in SVG user units. */
export interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly aspect: AspectRatio;
  /** The shorter side -- the sane unit for anything that must not depend on orientation. */
  readonly short: number;
  /** The longer side. */
  readonly long: number;
  readonly isPortrait: boolean;
  readonly isSquare: boolean;
}

export interface Palette {
  readonly background: string;
  readonly ink: string;
  readonly inkSoft: string;
  readonly accent: string;
  readonly accentSoft: string;
  /** Sits on top of `accent`. */
  readonly onAccent: string;
}

export interface DesignContext {
  readonly canvas: Canvas;
  readonly palette: Palette;
  readonly frame: MetronomeFrame;
  readonly title: string;
  readonly subtitle: string;
  readonly logoUrl: string | undefined;
}

export interface Design {
  readonly id: string;
  readonly name: string;
  /** One line for a picker: what makes this one different from the other ten. */
  readonly description: string;
  /**
   * How to describe this design's look in a picker -- "black & red",
   * "paper & ink". The colours themselves live in `theme.ts`; this is
   * only what to call them.
   */
  readonly look: string;
  /** The design's own body, drawn inside the shared <svg> shell. */
  draw(context: DesignContext): string;
}
