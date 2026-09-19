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
  /**
   * STATUS C3/§9.4: an ADDITIVE meter's own written form ("3+2+2"), when
   * the file writes one. `timeNumerator` stays the numeric total (7),
   * which is what every beat/tick calculation in the engine needs; this
   * is only what gets DRAWN. Phase 12 could already render this; nothing
   * read it from a file until now.
   */
  readonly timeNumeratorDisplay?: string;
  readonly clefSign?: string;
  readonly clefLine?: number;
  /** §9.18/Integration A: how many staves this part has (piano = 2). Absent means one staff. */
  readonly staves?: number;
  /**
   * Each staff's own line count, keyed by staff number, from
   * `<staff-details><staff-lines>`. Absent means the ordinary 5. A guitar
   * tab staff declares 6; some percussion parts declare 1. Read from the
   * file rather than inferred from the clef, since the file is the
   * authority on its own staff and a clef does not imply a line count.
   */
  readonly staffLinesByStaff?: Readonly<Record<number, number>>;
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
    timeNumeratorDisplay?: string;
    clefSign?: string;
    clefLine?: number;
    staves?: number;
    clefsByStaff?: Record<number, ClefSpec>;
    staffLinesByStaff?: Record<number, number>;
  } = {};

  const divisionsEl = firstChildNamed(attributesEl, 'divisions');
  const divisions = intOf(divisionsEl);
  if (divisions !== undefined) result.divisions = divisions;

  const staves = intOf(firstChildNamed(attributesEl, 'staves'));
  if (staves !== undefined) result.staves = staves;

  const staffDetailsEls = childrenNamed(attributesEl, 'staff-details');
  if (staffDetailsEls.length > 0) {
    const linesByStaff: Record<number, number> = {};
    for (const el of staffDetailsEls) {
      const rawNumber = el.getAttribute('number');
      const staffNumber = rawNumber !== null ? Number(rawNumber) : 1;
      const lines = intOf(firstChildNamed(el, 'staff-lines'));
      if (lines !== undefined && lines > 0 && Number.isFinite(staffNumber)) {
        linesByStaff[staffNumber] = lines;
      }
    }
    if (Object.keys(linesByStaff).length > 0) result.staffLinesByStaff = linesByStaff;
  }

  const keyEl = firstChildNamed(attributesEl, 'key');
  if (keyEl !== undefined) {
    const fifths = intOf(firstChildNamed(keyEl, 'fifths'));
    if (fifths !== undefined) result.fifths = fifths;
  }

  const timeEl = firstChildNamed(attributesEl, 'time');
  if (timeEl !== undefined) {
    // STATUS C3/§9.4: an additive meter is written either as one <beats>
    // holding "3+2+2", or as several <beats>/<beat-type> pairs. BOTH used
    // to parse as plain 3/8 here, because `intOf` runs Number.parseInt,
    // which stops dead at the '+' and silently returns just the first
    // term -- a real, silent wrong-time-signature bug on any 7/8 file
    // written the common way. The numeric total is what every tick and
    // beaming calculation needs; the written form is kept separately, for
    // display only.
    const beatsEls = childrenNamed(timeEl, 'beats');
    const terms: number[] = [];
    const written: string[] = [];
    for (const el of beatsEls) {
      const raw = textOf(el);
      if (raw === undefined || raw.length === 0) continue;
      written.push(raw);
      for (const piece of raw.split('+')) {
        const n = Number.parseInt(piece.trim(), 10);
        if (!Number.isNaN(n)) terms.push(n);
      }
    }
    if (terms.length > 0) {
      result.timeNumerator = terms.reduce((sum, n) => sum + n, 0);
      const display = written.join('+');
      // Only an ACTUAL additive meter gets a display override; a plain
      // "4" must keep numeratorDisplay absent so Phase 12 renders it the
      // ordinary way and existing snapshots stay byte-identical.
      if (terms.length > 1) result.timeNumeratorDisplay = display;
    }
    const beatType = intOf(firstChildNamed(timeEl, 'beat-type'));
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
