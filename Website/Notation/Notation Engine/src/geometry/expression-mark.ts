import { estimateTextWidth, TEXT_ASCENT_PER_EM, TEXT_DESCENT_PER_EM } from './text-metrics.js';

/**
 * §9.21's placement rule -- confirmed directly (Finale's own tutorial:
 * "common practice to place the tempo marking above only the top
 * staff").
 */
export function tempoMarkSide(): 'above' {
  return 'above';
}

/**
 * §9.21's placement rule for rehearsal marks -- near-universal
 * convention (boxed or circled letter/number, above the staff).
 */
export function rehearsalMarkSide(): 'above' {
  return 'above';
}

/**
 * The box around a rehearsal mark, in staff spaces.
 *
 * A rehearsal mark is a letter or number in a box -- §9.21 called it out
 * as needing "general text/multi-glyph composition" and left it at its
 * placement rule. The text is now drawable (§19.10's gap closed by the
 * text layer), so the box can be sized from the same estimate the text
 * itself reserves room with: the box must be at least as wide as the
 * text it encloses, or the letter falls out of the frame.
 */
export interface RehearsalMarkBox {
  readonly textWidth: number;
  /** Total width, padding included. */
  readonly width: number;
  /** Total height, padding included. */
  readonly height: number;
  /** Clear space between the text's own ink and the frame, per side. */
  readonly padding: number;
  readonly thickness: number;
  /** How far above the text's baseline the frame's top edge sits. */
  readonly ascent: number;
  /** How far below the text's baseline the frame's bottom edge sits. */
  readonly descent: number;
}

/**
 * Sizes the frame around `text`. The padding and stroke are conventional
 * (no source specifies them for a rehearsal mark specifically, the same
 * situation as every other offset constant in this engine): a frame that
 * touches its own letter is not a frame.
 */
export function computeRehearsalMarkBox(
  text: string,
  fontSize: number,
  padding = 0.45,
  thickness = 0.16,
): RehearsalMarkBox {
  const textWidth = estimateTextWidth(text, fontSize);
  const ascent = fontSize * TEXT_ASCENT_PER_EM;
  const descent = fontSize * TEXT_DESCENT_PER_EM;
  return {
    textWidth,
    width: textWidth + 2 * padding,
    height: ascent + descent + 2 * padding,
    padding,
    thickness,
    ascent,
    descent,
  };
}
