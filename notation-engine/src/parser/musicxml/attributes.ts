import { childrenNamed, firstChildNamed, intOf, textOf } from './dom-helpers.js';

/** One `<clef>`'s own sign/line, keyed by staff number in AttributesUpdate.clefsByStaff. */
export interface ClefSpec {
  readonly sign: string;
  readonly line?: number;
}

/**
 * The running per-part state an `<attributes>` element updates. `<attributes>`
 * can legally appear mid-measure (§10.8), not only at a measure's start, so
 * this is applied as a delta merged into whatever was already in effect --
 * never assumed to be the complete state on its own.
 */
export interface AttributesUpdate {
  readonly divisions?: number;
  readonly fifths?: number;
  readonly timeNumerator?: number;
  readonly timeDenominator?: number;
  readonly clefSign?: string;
  readonly clefLine?: number;
  /** §9.18/Integration A: how many staves this part has (piano = 2). Absent means one staff. */
  readonly staves?: number;
  /**
   * Every `<clef>` in this element, keyed by its `number` attribute (an
   * unnumbered clef is staff 1). A multi-staff part declares one clef per
   * staff -- keeping only the first, as this parser did before Integration A,
   * is exactly what collapsed a piano's bass staff onto its treble staff.
   */
  readonly clefsByStaff?: Readonly<Record<number, ClefSpec>>;
}

/** Parses one `<attributes>` element. Clefs are captured per staff (`clefsByStaff`); `clefSign`/`clefLine` remain as staff 1's own clef, the single-staff case every caller before Integration A assumed. */
export function parseAttributesElement(attributesEl: Element): AttributesUpdate {
  const result: {
    divisions?: number;
    fifths?: number;
    timeNumerator?: number;
    timeDenominator?: number;
    clefSign?: string;
    clefLine?: number;
    staves?: number;
    clefsByStaff?: Record<number, ClefSpec>;
  } = {};

  const divisionsEl = firstChildNamed(attributesEl, 'divisions');
  const divisions = intOf(divisionsEl);
  if (divisions !== undefined) result.divisions = divisions;

  const staves = intOf(firstChildNamed(attributesEl, 'staves'));
  if (staves !== undefined) result.staves = staves;

  const keyEl = firstChildNamed(attributesEl, 'key');
  if (keyEl !== undefined) {
    const fifths = intOf(firstChildNamed(keyEl, 'fifths'));
    if (fifths !== undefined) result.fifths = fifths;
  }

  const timeEl = firstChildNamed(attributesEl, 'time');
  if (timeEl !== undefined) {
    const beats = intOf(firstChildNamed(timeEl, 'beats'));
    const beatType = intOf(firstChildNamed(timeEl, 'beat-type'));
    if (beats !== undefined) result.timeNumerator = beats;
    if (beatType !== undefined) result.timeDenominator = beatType;
  }

  const clefEls = childrenNamed(attributesEl, 'clef');
  if (clefEls.length > 0) {
    const byStaff: Record<number, ClefSpec> = {};
    for (const el of clefEls) {
      const rawNumber = el.getAttribute('number');
      const staffNumber = rawNumber !== null ? Number(rawNumber) : 1;
      const sign = textOf(firstChildNamed(el, 'sign'));
      if (sign === undefined || !Number.isFinite(staffNumber)) continue;
      const line = intOf(firstChildNamed(el, 'line'));
      byStaff[staffNumber] = line !== undefined ? { sign, line } : { sign };
    }
    if (Object.keys(byStaff).length > 0) {
      result.clefsByStaff = byStaff;
      // Staff 1's clef stays mirrored onto the flat clefSign/clefLine
      // fields so every pre-Integration-A caller keeps working unchanged.
      const staff1 = byStaff[1];
      if (staff1 !== undefined) {
        result.clefSign = staff1.sign;
        if (staff1.line !== undefined) result.clefLine = staff1.line;
      }
    }
  }

  return result;
}
