// Geometry readers for tests that need to assert on what was actually DRAWN
// (stem direction, stem end, notehead positions), not just on the parsed model.
//
// The renderer wraps every playable event in <g data-id="P1#m2#v1#e0">...</g>.
// A notehead's ledger lines are nested <g> elements, and the barline / beams
// that follow an event are siblings, not children -- so the event's own markup
// is found by balancing <g> ... </g> from its opening tag, never by a
// non-greedy match or by "up to the next data-id".

// SMuFL notehead range (U+E0A0..U+E1AF). Excludes accidentals, rests, flags.
const NOTEHEAD_FIRST = 0xe0a0;
const NOTEHEAD_LAST = 0xe1af;

const TEXT_RE = /<text x="([\d.-]+)" y="([\d.-]+)"[^>]*>([\s\S])<\/text>/gu;
const LINE_RE = /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"([^>]*)\/>/g;

const G_TAG_RE = /<g[\s>]|<\/g>/g;

/** The SVG markup of one event's own <g data-id="..."> group, or undefined when it was not drawn. */
export function eventMarkup(svg, id) {
  const open = svg.indexOf(`<g data-id="${id}"`);
  if (open < 0) return undefined;
  G_TAG_RE.lastIndex = open;
  let depth = 0;
  for (let m = G_TAG_RE.exec(svg); m !== null; m = G_TAG_RE.exec(svg)) {
    depth += m[0] === '</g>' ? -1 : 1;
    if (depth === 0) return svg.slice(open, m.index + m[0].length);
  }
  return undefined;
}

/**
 * What was drawn for one event: its noteheads (x, y, SMuFL codepoint) and its
 * vertical stem lines. `stem` is the first stem, with its drawn direction:
 * 'up' when the line runs toward smaller y (the page's top), else 'down'.
 */
export function eventGeometry(svg, id) {
  const markup = eventMarkup(svg, id);
  if (markup === undefined) return undefined;

  const heads = [];
  for (const m of markup.matchAll(TEXT_RE)) {
    const codepoint = m[3].codePointAt(0);
    if (codepoint >= NOTEHEAD_FIRST && codepoint <= NOTEHEAD_LAST) {
      heads.push({ x: Number(m[1]), y: Number(m[2]), codepoint });
    }
  }

  const stems = [];
  for (const m of markup.matchAll(LINE_RE)) {
    if (m[1] !== m[3]) continue; // horizontal ledger lines are not stems
    const y1 = Number(m[2]);
    const y2 = Number(m[4]);
    stems.push({ x: Number(m[1]), y1, y2, direction: y2 < y1 ? 'up' : 'down' });
  }

  return { heads, stems, stem: stems[0] };
}
