/**
 * §9.18's rule, confirmed across six independent sources with full
 * agreement: a brace connects multiple staves belonging to ONE
 * instrument (the canonical case: a piano declaring `<staves>2</staves>`
 * in MusicXML) -- needs no external grouping metadata, since it's
 * inherent to the part's own declared structure.
 */
export function needsBrace(stavesInPart: number): boolean {
  return stavesInPart >= 2;
}

/**
 * §9.18's barline rule: within a brace group, the barline runs
 * continuously through every staff and the gap between them -- the
 * SAME test as `needsBrace`, by design (both follow from "is this one
 * instrument's own multiple staves?"). Across DIFFERENT parts, this
 * engine draws no continuous barline at all (§9.18's stated,
 * conservative default in the absence of `<part-group>` data).
 */
export function needsContinuousBarline(stavesInGroup: number): boolean {
  return needsBrace(stavesInGroup);
}

export interface BraceShape {
  readonly x: number;
  readonly topY: number;
  readonly bottomY: number;
}

/** The brace's vertical extent -- spans from the top staff's own top line to the bottom staff's own bottom line, at a fixed X to the left of the system's first barline/clef. */
export function computeBraceShape(topStaffY: number, bottomStaffY: number, x: number): BraceShape {
  return { x, topY: topStaffY, bottomY: bottomStaffY };
}
