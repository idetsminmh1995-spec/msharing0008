import { childElements, childrenNamed } from './dom-helpers.js';

/**
 * §10.6: `<score-timewise>` is the rarely-used alternative document
 * order -- measures on the outside, parts nested inside each measure
 * (the mirror image of `<score-partwise>`'s part-on-the-outside shape).
 * Converts to partwise on load so the rest of the parser only ever sees
 * one shape -- a mechanical transposition of the nesting, not a musical
 * transformation: every part/measure/note element is preserved exactly,
 * only the grouping changes.
 *
 * Parts are collected in the order their id is FIRST seen (matching
 * their natural left-to-right appearance across the timewise document's
 * measures), since `<score-timewise>` has no single place listing part
 * order the way `<part-list>` does for content -- `<part-list>` itself
 * is copied over unchanged either way.
 */
export function convertTimewiseToPartwise(timewiseRoot: Element): Element {
  const doc = timewiseRoot.ownerDocument;
  if (doc === null) {
    throw new Error('Cannot convert <score-timewise>: its root element has no owner document.');
  }

  const partwiseRoot = doc.createElement('score-partwise');
  const version = timewiseRoot.getAttribute('version');
  if (version !== null) partwiseRoot.setAttribute('version', version);

  // Everything that isn't a <measure> (work title, identification,
  // part-list, credits, defaults, ...) carries over unchanged -- only
  // the measure/part nesting itself needs transposing.
  for (const child of childElements(timewiseRoot)) {
    if (child.tagName !== 'measure') {
      partwiseRoot.appendChild(child.cloneNode(true));
    }
  }

  const partsById = new Map<string, Element>();
  const partOrder: string[] = [];

  for (const measureEl of childrenNamed(timewiseRoot, 'measure')) {
    const measureNumber = measureEl.getAttribute('number');
    for (const partInMeasureEl of childrenNamed(measureEl, 'part')) {
      const id = partInMeasureEl.getAttribute('id');
      if (id === null) continue;

      let partEl = partsById.get(id);
      if (partEl === undefined) {
        partEl = doc.createElement('part');
        partEl.setAttribute('id', id);
        partsById.set(id, partEl);
        partOrder.push(id);
      }

      const newMeasureEl = doc.createElement('measure');
      if (measureNumber !== null) newMeasureEl.setAttribute('number', measureNumber);
      for (const contentChild of childElements(partInMeasureEl)) {
        newMeasureEl.appendChild(contentChild.cloneNode(true));
      }
      partEl.appendChild(newMeasureEl);
    }
  }

  for (const id of partOrder) {
    const partEl = partsById.get(id);
    if (partEl !== undefined) partwiseRoot.appendChild(partEl);
  }

  return partwiseRoot;
}
