import type { PageConfig, SpacingConfig } from '../config/config.js';
import { computeScrollLayout, type ScrollLayoutMeasureInput } from './scroll.js';
import { justifySystem } from './spacing.js';

/**
 * §16.2: "Measures are packed into systems until the next measure would
 * exceed the usable width, then a system break occurs and the
 * completed system is justified (§14.3). Systems are packed onto pages
 * until the next system would exceed usable height, then a page break
 * occurs." Also: "Respects explicit `<print new-system="yes">`/
 * `new-page="yes">` from MusicXML."
 */
export interface PageMeasureInput {
  readonly measureNumber: number;
  readonly width: number;
  /** From `<print new-system="yes">` on this measure -- forces a system break BEFORE this measure, regardless of remaining width. */
  readonly forceNewSystem?: boolean;
  /** From `<print new-page="yes">` on this measure -- forces a page break BEFORE this measure (which also forces a system break). */
  readonly forceNewPage?: boolean;
}

export interface PageSystemMeasureLayout {
  readonly measureNumber: number;
  readonly x: number;
  readonly width: number;
}

export interface PageSystem {
  readonly measures: readonly PageSystemMeasureLayout[];
}

export interface Page {
  readonly systems: readonly PageSystem[];
}

export interface PageLayout {
  readonly pages: readonly Page[];
  readonly usableWidth: number;
  readonly usableHeight: number;
}

/** One system's own measures, before justification -- x-positions are LOCAL to this system (each one starts fresh at 0), unlike scroll mode's single continuous timeline. */
function groupIntoRawSystems(
  measures: readonly PageMeasureInput[],
  usableWidth: number,
): PageMeasureInput[][] {
  const systems: PageMeasureInput[][] = [];
  let current: PageMeasureInput[] = [];
  let currentWidth = 0;

  for (const m of measures) {
    const wouldOverflow = current.length > 0 && currentWidth + m.width > usableWidth;
    if (
      current.length > 0 &&
      (m.forceNewSystem === true || m.forceNewPage === true || wouldOverflow)
    ) {
      systems.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push(m);
    currentWidth += m.width;
  }
  if (current.length > 0) systems.push(current);
  return systems;
}

/** Raw systems (each a measure array) grouped into pages -- accumulating `systemHeight` per system until the next would overflow the usable page height, or that system's first measure forces a page break. */
function groupIntoRawPages(
  rawSystems: readonly PageMeasureInput[][],
  systemHeight: number,
  usableHeight: number,
): PageMeasureInput[][][] {
  const pages: PageMeasureInput[][][] = [];
  let current: PageMeasureInput[][] = [];
  let currentHeight = 0;

  for (const system of rawSystems) {
    const firstMeasure = system[0];
    const wouldOverflow = current.length > 0 && currentHeight + systemHeight > usableHeight;
    if (current.length > 0 && (firstMeasure?.forceNewPage === true || wouldOverflow)) {
      pages.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(system);
    currentHeight += systemHeight;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

/**
 * §16.2's full algorithm. `systemHeight` is a single fixed value applied
 * to every system -- a stated simplification; a real score with a grand
 * staff on some systems and a single staff on others would need a
 * per-system height, not yet computed here.
 *
 * `§14.3`'s own policy that "the final system of a piece is not
 * stretched (ragged-right)" is applied to the literal last system of
 * the whole piece (the last system on the last page), not the last
 * system of each individual page -- a page break is not the end of the
 * piece.
 */
export function computePageLayout(
  measures: readonly PageMeasureInput[],
  systemHeight: number,
  config: PageConfig,
  spacingConfig: SpacingConfig,
): PageLayout {
  const usableWidth = config.pageWidth - config.marginLeft - config.marginRight;
  const usableHeight = config.pageHeight - config.marginTop - config.marginBottom;

  const rawSystems = groupIntoRawSystems(measures, usableWidth);
  const rawPages = groupIntoRawPages(rawSystems, systemHeight, usableHeight);

  const pages: Page[] = rawPages.map((pageSystems, pageIndex) => {
    const systems: PageSystem[] = pageSystems.map((systemMeasures, systemIndexOnPage) => {
      const isLastSystemOfPiece =
        pageIndex === rawPages.length - 1 && systemIndexOnPage === pageSystems.length - 1;

      const scrollInput: ScrollLayoutMeasureInput[] = systemMeasures.map((m) => ({
        measureNumber: m.measureNumber,
        width: m.width,
      }));
      const local = computeScrollLayout(scrollInput);
      const positions = local.measures.map((m) => m.x);
      const originalWidths = local.measures.map((m) => m.width);

      // A system of exactly ONE measure has no internal gap for
      // justifySystem to stretch (it only redistributes space BETWEEN
      // measures) -- real engraving still fills such a system's own
      // width to the full usable width when it isn't the ragged-right
      // final system, so that case is handled directly here, UNLESS the
      // measure is already wider than usable (§14's own "allow the
      // overflow" policy, which this must not override by stretching it
      // even further).
      if (local.measures.length === 1) {
        const only = local.measures[0];
        if (only === undefined) return { measures: [] };
        const shouldFillWidth = !isLastSystemOfPiece && only.width < usableWidth;
        const width = shouldFillWidth ? usableWidth : only.width;
        return { measures: [{ measureNumber: only.measureNumber, x: 0, width }] };
      }

      const finalPositions = isLastSystemOfPiece
        ? positions
        : justifySystem(positions, usableWidth, spacingConfig);
      const wasActuallyJustified = !isLastSystemOfPiece && finalPositions !== positions;

      // justifySystem stretches each measure's own START position, not
      // its width directly -- a measure's real, POST-justification width
      // is the gap to the next measure's own (also stretched) start, and
      // the LAST measure of a JUSTIFIED system fills the remaining
      // usable width exactly, so that system's last barline lands
      // precisely at the right margin. Both the ragged-right
      // (last-system-of-the-piece) case AND a system justifySystem
      // itself declined to stretch (a single too-wide measure, or
      // config.justify === false) instead keep every measure's own
      // ORIGINAL width unchanged.
      const systemMeasureLayouts: PageSystemMeasureLayout[] = local.measures.map((m, i) => {
        const x = finalPositions[i] ?? m.x;
        if (!wasActuallyJustified) {
          return { measureNumber: m.measureNumber, x, width: originalWidths[i] ?? m.width };
        }
        const nextX = i + 1 < finalPositions.length ? finalPositions[i + 1] : usableWidth;
        const width = (nextX ?? usableWidth) - x;
        return { measureNumber: m.measureNumber, x, width };
      });

      return { measures: systemMeasureLayouts };
    });
    return { systems };
  });

  return { pages, usableWidth, usableHeight };
}
