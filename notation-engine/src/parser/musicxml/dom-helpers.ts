/** Only the ELEMENT children of a node (skips text/comment nodes). */
export function childElements(el: Element): Element[] {
  const result: Element[] = [];
  for (const child of Array.from(el.children)) {
    result.push(child);
  }
  return result;
}

/** The first child element with a given tag name, if any. */
export function firstChildNamed(el: Element, name: string): Element | undefined {
  for (const child of childElements(el)) {
    if (child.tagName === name) return child;
  }
  return undefined;
}

/** Every child element with a given tag name, in document order. */
export function childrenNamed(el: Element, name: string): Element[] {
  return childElements(el).filter((child) => child.tagName === name);
}

/** Trimmed text content of an element, or undefined if the element itself is undefined. */
export function textOf(el: Element | undefined): string | undefined {
  if (el === undefined) return undefined;
  const text = el.textContent;
  return text === null ? undefined : text.trim();
}

/** Text content parsed as an integer, or undefined if missing/unparseable. */
export function intOf(el: Element | undefined): number | undefined {
  const text = textOf(el);
  if (text === undefined) return undefined;
  const n = Number.parseInt(text, 10);
  return Number.isNaN(n) ? undefined : n;
}

/** An attribute's value, or undefined if absent. */
export function attrOf(el: Element, name: string): string | undefined {
  return el.hasAttribute(name) ? (el.getAttribute(name) ?? undefined) : undefined;
}
