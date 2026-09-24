/**
 * metronome-engine — eleven metronome video designs, in TypeScript,
 * drawn as SVG.
 *
 * One entry point: hand it the design, the ratio, the style and the
 * state of one frame, and it returns a complete `<svg>` string. No
 * DOM, no clock, no audio -- which is what lets the same call render a
 * live preview, an exported frame and a test.
 */

import { canvasFor, header } from './layout.js';
import { DESIGNS, designById } from './designs/index.js';
import { escapeText, n, rect } from './svg.js';
import { isLightPalette, paletteForDesign } from './theme.js';
import { ASPECT_RATIOS } from './types.js';
import type {
  AspectRatio,
  Canvas,
  Design,
  DesignContext,
  MetronomeFrame,
  MetronomeRenderInput,
  Palette,
} from './types.js';

export { DESIGNS, DEFAULT_DESIGN_ID, designById } from './designs/index.js';
export { ASPECT_RATIOS } from './types.js';
export { canvasFor } from './layout.js';
export { paletteForDesign, isLightPalette } from './theme.js';
export type {
  AspectRatio,
  Canvas,
  Design,
  DesignContext,
  MetronomeFrame,
  MetronomeRenderInput,
  Palette,
};

/** What a picker needs to list the designs without importing their code. */
export interface DesignSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** What this design's colours are called, for a picker. */
  readonly look: string;
  /** The design's own palette, for anything that has to sit beside its frame. */
  readonly palette: Palette;
  /** True when the design's ground is light -- a host may need to know. */
  readonly isLight: boolean;
}

export function listDesigns(): readonly DesignSummary[] {
  return DESIGNS.map((design) => {
    const palette = paletteForDesign(design.id);
    return {
      id: design.id,
      name: design.name,
      description: design.description,
      look: design.look,
      palette,
      isLight: isLightPalette(palette),
    };
  });
}

/**
 * Clamps a frame into something a design can draw without checking.
 *
 * Every design reads `beat`, `beatsPerBar` and `phase` directly, and
 * eleven copies of "what if beat is 0" is eleven chances to get it
 * wrong. It is fixed once, here, at the boundary.
 */
function normalizeFrame(frame: MetronomeFrame): MetronomeFrame {
  const beatsPerBar = Math.max(1, Math.round(frame.beatsPerBar));
  const beat = Math.min(beatsPerBar, Math.max(1, Math.round(frame.beat)));
  return {
    beat,
    beatsPerBar,
    phase: Math.min(1, Math.max(0, Number.isFinite(frame.phase) ? frame.phase : 0)),
    bar: Math.max(1, Math.round(frame.bar)),
    bpm: Math.max(1, Math.round(frame.bpm)),
    timeSignature: {
      numerator: Math.max(1, Math.round(frame.timeSignature.numerator)),
      denominator: Math.max(1, Math.round(frame.timeSignature.denominator)),
    },
  };
}

/** One frame of one design, as a complete standalone `<svg>` document. */
export function renderMetronomeFrame(input: MetronomeRenderInput): string {
  const design: Design = designById(input.design) ?? DESIGNS[0]!;
  const aspect: AspectRatio = ASPECT_RATIOS.includes(input.aspect) ? input.aspect : '16x9';
  const canvas = canvasFor(aspect);
  // The look belongs to the DESIGN, not to a switch. Picking design 6
  // is picking white-and-red the same way it is picking a big number.
  const palette = paletteForDesign(design.id);
  const frame = normalizeFrame(input.frame);

  const context: DesignContext = {
    canvas,
    palette,
    frame,
    title: input.title ?? '',
    subtitle: input.subtitle ?? '',
    logoUrl: input.logoUrl === '' ? undefined : input.logoUrl,
  };

  const background = rect(0, 0, canvas.width, canvas.height, { fill: palette.background });
  const body = design.draw(context);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(canvas.width)} ${n(canvas.height)}" ` +
    `width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ` +
    `role="img" aria-label="${escapeText(`${design.name} metronome, beat ${frame.beat} of ${frame.beatsPerBar}`)}">` +
    background +
    header(context) +
    body +
    '</svg>'
  );
}
