import type { StemDirection } from './stem.js';

export type ArticulationType = 'accent' | 'staccato' | 'tenuto' | 'marcato' | 'staccatissimo';
export type ArticulationSide = 'above' | 'below';

/**
 * §9.19's default rule ("notehead side") is the exact same relationship
 * ties already use (§9.15): opposite the stem. Marcato is the one named
 * exception -- always above in single-voice writing, regardless of stem
 * direction, confirmed with zero disagreement across every source
 * consulted.
 */
export function articulationSide(
  type: ArticulationType,
  stemDirection: StemDirection,
): ArticulationSide {
  if (type === 'marcato') {
    return 'above';
  }
  return stemDirection === 'down' ? 'above' : 'below';
}

const GLYPH_NAMES: Readonly<Record<ArticulationType, Readonly<Record<ArticulationSide, string>>>> =
  {
    accent: { above: 'articAccentAbove', below: 'articAccentBelow' },
    staccato: { above: 'articStaccatoAbove', below: 'articStaccatoBelow' },
    tenuto: { above: 'articTenutoAbove', below: 'articTenutoBelow' },
    marcato: { above: 'articMarcatoAbove', below: 'articMarcatoBelow' },
    staccatissimo: { above: 'articStaccatissimoAbove', below: 'articStaccatissimoBelow' },
  };

/**
 * The real, pre-drawn SMuFL glyph for this articulation+side -- every
 * articulation has its own separate Above/Below variant (confirmed
 * against glyphnames.json before assuming a single glyph needing a
 * transform), so this is a lookup, not a computed rotation.
 */
export function articulationGlyphName(type: ArticulationType, side: ArticulationSide): string {
  return GLYPH_NAMES[type][side];
}
