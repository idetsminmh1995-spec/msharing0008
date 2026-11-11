/**
 * §9.21's placement rule -- confirmed directly (Finale's own tutorial:
 * "common practice to place the tempo marking above only the top
 * staff"). Placement-only: a real tempo mark (a note-value glyph + "=" +
 * a number) needs general multi-glyph/text composition this engine
 * hasn't built yet -- see §9.21's stated limitation.
 */
export function tempoMarkSide(): 'above' {
  return 'above';
}

/**
 * §9.21's placement rule for rehearsal marks -- near-universal
 * convention (boxed or circled letter/number, above the staff).
 * Placement-only, for the same reason as tempoMarkSide: drawing an
 * arbitrary letter/number inside a box or circle needs general text
 * rendering this engine hasn't built yet.
 */
export function rehearsalMarkSide(): 'above' {
  return 'above';
}
