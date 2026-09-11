import { childrenNamed, firstChildNamed, intOf, textOf } from './dom-helpers.js';

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
}

/** Parses one `<attributes>` element. Only the first `<clef>` (or the one explicitly numbered "1") is used -- multi-staff parts with independent per-staff clefs are a later phase's concern. */
export function parseAttributesElement(attributesEl: Element): AttributesUpdate {
  const result: {
    divisions?: number;
    fifths?: number;
    timeNumerator?: number;
    timeDenominator?: number;
    clefSign?: string;
    clefLine?: number;
  } = {};

  const divisionsEl = firstChildNamed(attributesEl, 'divisions');
  const divisions = intOf(divisionsEl);
  if (divisions !== undefined) result.divisions = divisions;

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
  const clefEl =
    clefEls.find((el) => el.getAttribute('number') === '1' || !el.hasAttribute('number')) ??
    clefEls[0];
  if (clefEl !== undefined) {
    const sign = textOf(firstChildNamed(clefEl, 'sign'));
    const line = intOf(firstChildNamed(clefEl, 'line'));
    if (sign !== undefined) result.clefSign = sign;
    if (line !== undefined) result.clefLine = line;
  }

  return result;
}
