/**
 * A volta -- the "1." / "2." bracket over a repeated section's
 * alternative endings (§9.18's barline family, the part of it that is
 * drawn above the staff rather than through it).
 *
 * Geometry only: where the lines go relative to the bracket's own left
 * end. `render/volta.ts` turns this into SVG, and the renderer decides
 * the absolute x/y, exactly as the barline pair does.
 */
export interface VoltaGeometry {
  /** The horizontal line, from x=0 to x=width at y=0 (y grows DOWNWARD, as everywhere in this engine's SVG space). */
  readonly width: number;
  /** How far the end hooks drop below the horizontal line. 0 for a bracket with no hook at that end. */
  readonly startHookDepth: number;
  readonly endHookDepth: number;
  readonly thickness: number;
}

export interface VoltaEngravingMetrics {
  /** `getEngravingDefault('repeatEndingLineThickness')`, or a fallback. */
  readonly thickness: number;
  /** How far the hooks drop, in staff spaces. Bravura's own `repeatEndingLineThickness` says nothing about this; 1.5 staff spaces matches standard practice and every other program's output. */
  readonly hookDepth: number;
}

export interface VoltaSpec {
  readonly width: number;
  /**
   * Whether this bracket is the volta's OWN beginning, as opposed to
   * its continuation on a later system -- a volta broken across a
   * system break gets a hook only on its first piece.
   */
  readonly hasStartHook: boolean;
  /**
   * Whether the volta CLOSES here. False both for a continuation that
   * runs on to the next system and for MusicXML's `discontinue` type,
   * which is an open-ended volta -- the two look the same on the page
   * and are the same fact about the bracket.
   */
  readonly hasEndHook: boolean;
}

export function computeVoltaGeometry(
  spec: VoltaSpec,
  metrics: VoltaEngravingMetrics,
): VoltaGeometry {
  return {
    width: Math.max(0, spec.width),
    startHookDepth: spec.hasStartHook ? metrics.hookDepth : 0,
    endHookDepth: spec.hasEndHook ? metrics.hookDepth : 0,
    thickness: metrics.thickness,
  };
}

/**
 * The bracket's own label from its volta numbers: "1." for a single
 * ending, "1, 2." for one that serves two passes.
 *
 * A trailing period on the last number is the convention every engraving
 * manual and every other program follows, and it is what tells a reader
 * the label is an ending number rather than a fingering or a bar number.
 */
export function voltaLabel(numbers: readonly number[]): string {
  if (numbers.length === 0) return '';
  return `${numbers.join(', ')}.`;
}
