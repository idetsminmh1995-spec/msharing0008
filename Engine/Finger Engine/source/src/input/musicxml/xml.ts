/**
 * xml.ts — a very small XML reader, for MusicXML only.
 *
 * WHY NOT `DOMParser`: the engine runs in a Web Worker in the browser
 * (P-010) and in `node --test` in CI, and only one of those two has a
 * DOM. The Notation Engine solves this by having its host inject a
 * parser; this engine is handed plain text and must read it anywhere,
 * so it brings its own.
 *
 * It is deliberately NOT a general XML parser. It reads elements,
 * attributes, text and the five predefined entities, and it skips the
 * declaration, the doctype, comments and processing instructions --
 * which is the whole of MusicXML as every exporter writes it. It never
 * throws: a malformed file yields whatever could be read, because
 * losing a fingering is better than losing the video (the same
 * decision the Notation Engine made for its own parser).
 */

export interface XmlNode {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly XmlNode[];
  /** The element's own text, with the text of its children left out. */
  readonly text: string;
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/** The five predefined entities plus numeric ones; anything else is left alone. */
export function decodeEntities(raw: string): string {
  return raw.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body] ?? whole;
  });
}

interface MutableNode {
  name: string;
  attributes: Record<string, string>;
  children: MutableNode[];
  text: string;
}

function readAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match = pattern.exec(raw);
  while (match !== null) {
    attributes[match[1] as string] = decodeEntities(match[3] ?? match[4] ?? '');
    match = pattern.exec(raw);
  }
  return attributes;
}

/** The document's root element, or undefined if there is not one. */
export function parseXml(source: string): XmlNode | undefined {
  const stack: MutableNode[] = [];
  let root: MutableNode | undefined;
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf('<', cursor);
    if (open < 0) break;

    if (open > cursor) {
      const chunk = source.slice(cursor, open);
      const parent = stack[stack.length - 1];
      if (parent !== undefined && chunk.trim() !== '') parent.text += decodeEntities(chunk);
    }

    if (source.startsWith('<!--', open)) {
      const end = source.indexOf('-->', open);
      cursor = end < 0 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', open)) {
      const end = source.indexOf(']]>', open);
      const body = source.slice(open + 9, end < 0 ? source.length : end);
      const parent = stack[stack.length - 1];
      if (parent !== undefined) parent.text += body;
      cursor = end < 0 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<?', open)) {
      const end = source.indexOf('?>', open);
      cursor = end < 0 ? source.length : end + 2;
      continue;
    }
    if (source.startsWith('<!', open)) {
      // A doctype, which may carry a bracketed internal subset.
      let end = source.indexOf('>', open);
      const bracket = source.indexOf('[', open);
      if (bracket >= 0 && (end < 0 || bracket < end)) {
        const close = source.indexOf(']>', bracket);
        end = close < 0 ? -1 : close + 1;
      }
      cursor = end < 0 ? source.length : end + 1;
      continue;
    }

    const close = source.indexOf('>', open);
    if (close < 0) break;
    const inner = source.slice(open + 1, close);

    if (inner.startsWith('/')) {
      const name = inner.slice(1).trim();
      for (let depth = stack.length - 1; depth >= 0; depth--) {
        if ((stack[depth] as MutableNode).name === name) {
          stack.length = depth;
          break;
        }
      }
      cursor = close + 1;
      continue;
    }

    const selfClosing = inner.endsWith('/');
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const space = body.search(/\s/);
    const name = (space < 0 ? body : body.slice(0, space)).trim();
    const node: MutableNode = {
      name,
      attributes: space < 0 ? {} : readAttributes(body.slice(space)),
      children: [],
      text: '',
    };
    const parent = stack[stack.length - 1];
    if (parent === undefined) {
      if (root === undefined) root = node;
    } else {
      parent.children.push(node);
    }
    if (!selfClosing) stack.push(node);
    cursor = close + 1;
  }

  return root;
}

/** Every direct child with this name. */
export function childrenNamed(node: XmlNode | undefined, name: string): readonly XmlNode[] {
  return node === undefined ? [] : node.children.filter((child) => child.name === name);
}

/** The first direct child with this name. */
export function childNamed(node: XmlNode | undefined, name: string): XmlNode | undefined {
  return node === undefined ? undefined : node.children.find((child) => child.name === name);
}

/** A named child's trimmed text, or undefined when there is no such child. */
export function childText(node: XmlNode | undefined, name: string): string | undefined {
  const child = childNamed(node, name);
  return child === undefined ? undefined : child.text.trim();
}

/** A named child's text as a number, or undefined when it is missing or not one. */
export function childNumber(node: XmlNode | undefined, name: string): number | undefined {
  const text = childText(node, name);
  if (text === undefined || text === '') return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** Every descendant with this name, in document order. */
export function descendants(node: XmlNode | undefined, name: string): readonly XmlNode[] {
  if (node === undefined) return [];
  const out: XmlNode[] = [];
  const walk = (current: XmlNode) => {
    for (const child of current.children) {
      if (child.name === name) out.push(child);
      walk(child);
    }
  };
  walk(node);
  return out;
}
