import { JSDOM } from 'jsdom';

/** A real DOMParser (from jsdom) for tests to inject into parseMusicXml, per §10's "tests inject a parser so Node can run them." */
export function testDomParser() {
  const dom = new JSDOM();
  return dom.window.DOMParser;
}
