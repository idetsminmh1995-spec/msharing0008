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
  const match = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
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
 * §16.1's scroll mode has NO width-dependent breaking at all ("one
 * unbroken system, arbitrarily wide" is unconditional), so for it this
 * function always returns `false`: a scroll-mode resize is
 * unconditionally the pure-scale case.
 *
 * This compares the ONE number page breaking actually turns on. A caller
 * that also wants page-HEIGHT changes (which move page breaks, not
 * system breaks) to force a re-flow should use `planResize`, which folds
 * both axes into a single decision.
 */
export function needsReflow(
  layoutMode: 'scroll' | 'page',
  oldUsableWidthSp: number,
  newUsableWidthSp: number,
): boolean {
  if (layoutMode === 'scroll') return false;
  return oldUsableWidthSp !== newUsableWidthSp;
}

/** The page geometry page-mode pagination depends on -- the four margins plus the sheet size. */
export interface PageGeometry {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly marginLeft: number;
  readonly marginRight: number;
  readonly marginTop: number;
  readonly marginBottom: number;
}

/** The usable width page-mode system breaking turns on (§16.2's own `pageWidth - margins`). */
export function pageUsableWidth(page: PageGeometry): number {
  return page.pageWidth - page.marginLeft - page.marginRight;
}

/** The usable height page-mode page breaking turns on. */
export function pageUsableHeight(page: PageGeometry): number {
  return page.pageHeight - page.marginTop - page.marginBottom;
}

/**
 * §16.3's decision, in full: what a resize from one size (and, in page
 * mode, one page geometry) to another actually requires.
 *
 * `pureScale` means only the ONE `pxPerStaffSpace` number changes -- the
 * same markup is drawn into a different pixel box (the `resizePureScale`
 * O(1) path). `reflow` means the caller must re-render from the cached
 * `Score` with the new geometry: in page mode, changing either usable
 * width (system breaking) or usable height (page breaking) puts a
 * different set of measures into a different set of systems or pages.
 *
 * Scroll mode never reflows -- its single system has no width- or
 * height-dependent breaking at all. Page mode reflows whenever the
 * usable width OR usable height changes, and is a pure scale otherwise
 * (including a page-mode resize that only changes the target PIXEL box,
 * leaving the sheet geometry alone).
 */
export type ResizePlan =
  { readonly kind: 'pureScale'; readonly pxPerStaffSpace: number } | { readonly kind: 'reflow' };

/**
 * Decides whether a resize is the O(1) pure-scale case or needs a full
 * re-flow, so a caller can pick `resizePureScale` or re-render from the
 * cached `Score` without re-parsing. See `ResizePlan` for what each
 * result means.
 */
export function planResize(input: {
  readonly mode: 'scroll' | 'page';
  /** The existing render's own natural size (staff-space units). */
  readonly viewBox: ViewBox;
  readonly targetWidthPx: number;
  readonly targetHeightPx: number;
  /** Page mode: the geometry of the render being resized. Omit to mean "unchanged". */
  readonly currentPage?: PageGeometry;
  /** Page mode: the geometry the caller wants instead. Omit to mean "unchanged". */
  readonly nextPage?: PageGeometry;
}): ResizePlan {
  if (input.mode === 'page' && input.currentPage !== undefined && input.nextPage !== undefined) {
    const widthChanged = pageUsableWidth(input.currentPage) !== pageUsableWidth(input.nextPage);
    const heightChanged = pageUsableHeight(input.currentPage) !== pageUsableHeight(input.nextPage);
    if (widthChanged || heightChanged) return { kind: 'reflow' };
  }
  return {
    kind: 'pureScale',
    pxPerStaffSpace: computePxPerStaffSpace(
      input.viewBox,
      input.targetWidthPx,
      input.targetHeightPx,
    ),
  };
}
