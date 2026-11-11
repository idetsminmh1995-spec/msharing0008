/**
 * §16.3: `engine.resize(widthPx, heightPx)` must re-flow to ANY size,
 * not preset zoom steps, and WITHOUT re-parsing the source file. Per
 * §4.2, the conversion from the internal staff-space coordinate system
 * to pixels happens in exactly one place -- the `<svg>` element's own
 * `width`/`height` versus its `viewBox` -- controlled by one number,
 * `pxPerStaffSpace`. That is what makes the common case (a pure scale
 * change: aspect ratio and content unchanged) an O(1) operation: only
 * that one number changes, and only the `<svg>` element's own
 * `width`/`height` attributes are rewritten -- no re-layout at all.
 */

export interface ViewBox {
  readonly width: number;
  readonly height: number;
}

/**
 * Extracts an existing `<svg>` document's own `viewBox` dimensions --
 * the content's natural size in staff-space units, unaffected by
 * whatever `width`/`height` pixel attributes it currently carries.
 * Returns `undefined` if the string isn't a real SVG document with a
 * `viewBox` (this module never throws on malformed input; a caller
 * that gets `undefined` back has nothing sensible to resize).
 */
export function extractViewBox(svg: string): ViewBox | undefined {
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (match === null) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return undefined;
  return { width, height };
}

/**
 * §16.3's pure-scale computation: given the content's own natural
 * `viewBox` and a target pixel size, computes the single
 * `pxPerStaffSpace` that fits the content within that box while
 * preserving its own aspect ratio (the SAME convention `object-fit:
 * contain` uses) -- the smaller of the two possible per-axis scale
 * factors, so neither dimension overflows the target.
 */
export function computePxPerStaffSpace(
  viewBox: ViewBox,
  targetWidthPx: number,
  targetHeightPx: number,
): number {
  const widthScale = targetWidthPx / viewBox.width;
  const heightScale = targetHeightPx / viewBox.height;
  return Math.min(widthScale, heightScale);
}

export interface ResizeResult {
  readonly svg: string;
  readonly pxPerStaffSpace: number;
}

/**
 * §16.3's O(1) fast path. Rewrites an EXISTING rendered SVG document's
 * own `width`/`height` attributes to fit a new target pixel size,
 * computed via `computePxPerStaffSpace` -- the `viewBox` and every
 * inner element are left completely untouched, which is exactly what
 * makes this operation not need the original `Score`, the parser, or
 * any layout algorithm at all. Returns the original string unchanged
 * (with `pxPerStaffSpace` reported as `0`) if the input has no
 * recognizable `viewBox` to scale against.
 */
export function resizePureScale(
  svg: string,
  targetWidthPx: number,
  targetHeightPx: number,
): ResizeResult {
  const viewBox = extractViewBox(svg);
  if (viewBox === undefined) return { svg, pxPerStaffSpace: 0 };

  const pxPerStaffSpace = computePxPerStaffSpace(viewBox, targetWidthPx, targetHeightPx);
  const newWidthPx = viewBox.width * pxPerStaffSpace;
  const newHeightPx = viewBox.height * pxPerStaffSpace;

  const resized = svg.replace(/<svg xmlns="[^"]*" width="[\d.]+" height="[\d.]+"/, (fullMatch) =>
    fullMatch.replace(
      /width="[\d.]+" height="[\d.]+"/,
      `width="${newWidthPx}" height="${newHeightPx}"`,
    ),
  );

  return { svg: resized, pxPerStaffSpace };
}

/**
 * §16.3's re-flow decision: page mode's system breaking depends on the
 * USABLE width available (§16.2's own `pageWidth - margins`), so a
 * resize whose new width would place a different set of measures into
 * each system needs the real layout algorithms re-run from the cached
 * `Score`, not just a pixel-attribute rewrite.
 *
 * §16.1's scroll mode -- the only mode this engine currently wires into
 * rendering -- has NO width-dependent breaking at all ("one unbroken
 * system, arbitrarily wide" is unconditional), so for it this function
 * always returns `false`: a scroll-mode resize is unconditionally the
 * pure-scale case. This function exists for page mode's future
 * integration (Phase 46's own algorithm is built but not yet wired into
 * rendering), where an actual usable-width comparison becomes
 * meaningful.
 */
export function needsReflow(
  layoutMode: 'scroll' | 'page',
  oldUsableWidthSp: number,
  newUsableWidthSp: number,
): boolean {
  if (layoutMode === 'scroll') return false;
  return oldUsableWidthSp !== newUsableWidthSp;
}
