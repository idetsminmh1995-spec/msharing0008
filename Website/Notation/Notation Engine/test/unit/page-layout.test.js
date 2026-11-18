import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

const PAGE_CONFIG = {
  pageWidth: 30,
  pageHeight: 42,
  marginTop: 3,
  marginBottom: 3,
  marginLeft: 2.5,
  marginRight: 2.5,
};
// usableWidth = 30 - 2.5 - 2.5 = 25
// usableHeight = 42 - 3 - 3 = 36

const SPACING_CONFIG = {
  spacingIncrement: 1.2,
  shortestDurationSpace: 2.0,
  minNoteDistance: 0.5,
  justify: true,
};

function m(measureNumber, width, extra = {}) {
  return { measureNumber, width, ...extra };
}

describe('system breaking (Phase 46, §16.2)', () => {
  test('measures pack into one system as long as they fit within the usable width', () => {
    const layout = NE.computePageLayout([m(1, 10), m(2, 10)], 10, PAGE_CONFIG, SPACING_CONFIG);
    const page = [...layout.pages][0];
    assert.equal(page.systems.length, 1);
    assert.equal(page.systems[0].measures.length, 2);
  });

  test('a measure that would overflow the usable width starts a NEW system instead', () => {
    // usableWidth=25: measures of 15+15=30 cannot share one system.
    const layout = NE.computePageLayout([m(1, 15), m(2, 15)], 10, PAGE_CONFIG, SPACING_CONFIG);
    const page = [...layout.pages][0];
    assert.equal(page.systems.length, 2);
    assert.equal(page.systems[0].measures.length, 1);
    assert.equal(page.systems[1].measures.length, 1);
  });

  test('a single measure wider than the usable width is still placed alone, never dropped', () => {
    const layout = NE.computePageLayout([m(1, 50)], 10, PAGE_CONFIG, SPACING_CONFIG);
    const page = [...layout.pages][0];
    assert.equal(page.systems.length, 1);
    assert.equal(page.systems[0].measures.length, 1);
    assert.equal(page.systems[0].measures[0].measureNumber, 1);
  });
});

describe('justification of completed systems (Phase 46, §16.2 + §14.3)', () => {
  test('a completed (non-final) system is stretched so its last measure reaches the right margin exactly', () => {
    // Two systems' worth: system 1 (measures 1-2, forced to break by
    // measure 3 not fitting) must be justified to the FULL usableWidth,
    // even though its own natural width (10+10=20) is less than 25.
    const layout = NE.computePageLayout(
      [m(1, 10), m(2, 10), m(3, 20)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    const page = [...layout.pages][0];
    assert.equal(page.systems.length, 2);
    const system1 = page.systems[0];
    const lastMeasure = system1.measures[system1.measures.length - 1];
    assert.ok(Math.abs(lastMeasure.x + lastMeasure.width - 25) < 1e-9);
  });

  test('THE LAST SYSTEM OF THE WHOLE PIECE IS NOT JUSTIFIED (ragged-right, §14.3)', () => {
    const layout = NE.computePageLayout(
      [m(1, 10), m(2, 10), m(3, 20)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    const page = [...layout.pages][0];
    const lastSystem = page.systems[page.systems.length - 1];
    const lastMeasure = lastSystem.measures[lastSystem.measures.length - 1];
    // Measure 3's own natural width is 20 -- if justified it would
    // have to fill to 25 alone, but ragged-right keeps it at its own
    // real width.
    assert.equal(lastMeasure.width, 20);
  });

  test('the ragged-right rule applies to the last system of the PIECE, not merely the last system of a PAGE', () => {
    // Force enough systems to span 2 pages -- the last system of PAGE 1
    // must still be justified, since the piece continues onto page 2.
    const manyMeasures = [m(1, 20), m(2, 20), m(3, 20), m(4, 20), m(5, 20)];
    // systemHeight=20, usableHeight=36 -> only 1 system fits per page.
    const layout = NE.computePageLayout(manyMeasures, 20, PAGE_CONFIG, SPACING_CONFIG);
    assert.ok(layout.pages.length > 1, 'expected the content to span multiple pages');
    const firstPageLastSystem = layout.pages[0].systems[layout.pages[0].systems.length - 1];
    const lastMeasureOfPage1 =
      firstPageLastSystem.measures[firstPageLastSystem.measures.length - 1];
    // Each measure here is alone in its own system (width 20 each,
    // usableWidth=25, so each fits alone but a second wouldn't); being
    // on page 1 (not the last page), it must be justified to fill the
    // usable width, not left at its own natural width of 20.
    assert.ok(Math.abs(lastMeasureOfPage1.x + lastMeasureOfPage1.width - 25) < 1e-9);
  });
});

describe('page breaking (Phase 46, §16.2)', () => {
  test('systems pack onto one page as long as the total height fits', () => {
    const layout = NE.computePageLayout(
      [m(1, 8), m(2, 8), m(3, 8)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    // All 3 fit into one system (8*3=24 < usableWidth 25), so this is
    // trivially one page with one system.
    assert.equal(layout.pages.length, 1);
    assert.equal(layout.pages[0].systems.length, 1);
  });

  test('a system that would overflow the usable HEIGHT starts a new page', () => {
    // Each measure is wide enough (20 > usableWidth/2=12.5) that at
    // most one fits per system (a second 20-wide measure would make
    // 40 > 25). With systemHeight=15, usableHeight=36 -> floor(36/15)=2
    // systems fit per page; a 3rd forces a new page.
    const measures = [m(1, 20), m(2, 20), m(3, 20)];
    const layout = NE.computePageLayout(measures, 15, PAGE_CONFIG, SPACING_CONFIG);
    assert.equal(layout.pages.length, 2);
    assert.equal(layout.pages[0].systems.length, 2);
    assert.equal(layout.pages[1].systems.length, 1);
  });

  test('every measure appears exactly once across the whole layout, in order, regardless of how many pages result', () => {
    const measures = Array.from({ length: 12 }, (_, i) => m(i + 1, 20));
    const layout = NE.computePageLayout(measures, 15, PAGE_CONFIG, SPACING_CONFIG);
    const allMeasureNumbers = [
      ...layout.pages.flatMap((p) =>
        p.systems.flatMap((s) => s.measures.map((mm) => mm.measureNumber)),
      ),
    ];
    assert.deepEqual(
      allMeasureNumbers,
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
  });
});

describe('explicit <print> breaks (Phase 46, §16.2)', () => {
  test('forceNewSystem breaks BEFORE that measure even though it would otherwise fit in the current system', () => {
    const layout = NE.computePageLayout(
      [m(1, 5), m(2, 5, { forceNewSystem: true }), m(3, 5)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    const page = [...layout.pages][0];
    assert.equal(page.systems.length, 2);
    assert.equal(page.systems[0].measures[0].measureNumber, 1);
    assert.equal(page.systems[1].measures[0].measureNumber, 2);
  });

  test('forceNewPage breaks BOTH the system and the page, even though everything would otherwise fit on one page', () => {
    const layout = NE.computePageLayout(
      [m(1, 5), m(2, 5, { forceNewPage: true }), m(3, 5)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    assert.equal(layout.pages.length, 2);
    assert.equal(layout.pages[0].systems[0].measures[0].measureNumber, 1);
    assert.equal(layout.pages[1].systems[0].measures[0].measureNumber, 2);
  });

  test('a forced break on the very FIRST measure has no effect (there is nothing before it to break away from)', () => {
    const layout = NE.computePageLayout(
      [m(1, 5, { forceNewSystem: true }), m(2, 5)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    const page = [...layout.pages][0];
    assert.equal(page.systems.length, 1);
    assert.equal(page.systems[0].measures.length, 2);
  });
});

describe('page height accounting (Phase 47, §16.2)', () => {
  test('a normal page is exactly the configured page height, and totalHeight is pages * pageHeight', () => {
    const layout = NE.computePageLayout(
      [m(1, 8), m(2, 8), m(3, 8)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    assert.equal(layout.pages.length, 1);
    assert.equal(layout.pages[0].height, PAGE_CONFIG.pageHeight);
    assert.equal(layout.totalHeight, layout.pages.length * PAGE_CONFIG.pageHeight);
  });

  test('every system carries the system height it was laid out at', () => {
    const layout = NE.computePageLayout(
      [m(1, 8), m(2, 20), m(3, 8)],
      10,
      PAGE_CONFIG,
      SPACING_CONFIG,
    );
    for (const page of layout.pages) {
      for (const system of page.systems) {
        assert.equal(system.height, 10);
      }
    }
  });

  test('a system TALLER than the usable page height grows its page instead of spilling past the margin', () => {
    // usableHeight = 42 - 3 - 3 = 36. A system of 50 cannot fit inside it.
    const layout = NE.computePageLayout([m(1, 8)], 50, PAGE_CONFIG, SPACING_CONFIG);
    assert.equal(layout.pages.length, 1);
    // The page grows to marginTop + systemHeight + marginBottom.
    assert.equal(layout.pages[0].height, 3 + 50 + 3);
    assert.ok(layout.pages[0].height > PAGE_CONFIG.pageHeight);
  });

  test('an over-tall system does not push the NEXT system onto the same page -- it still breaks the page', () => {
    // Two 50-tall systems: neither fits in the 36 usable height, so each
    // gets its own (grown) page rather than overlapping.
    const layout = NE.computePageLayout([m(1, 20), m(2, 20)], 50, PAGE_CONFIG, SPACING_CONFIG);
    assert.equal(layout.pages.length, 2);
    assert.equal(layout.pages[0].systems.length, 1);
    assert.equal(layout.pages[1].systems.length, 1);
  });

  test('totalHeight sums every page’s OWN (possibly grown) height, not pages * pageHeight', () => {
    const layout = NE.computePageLayout([m(1, 20), m(2, 20)], 50, PAGE_CONFIG, SPACING_CONFIG);
    const expected = layout.pages.reduce((sum, p) => sum + p.height, 0);
    assert.equal(layout.totalHeight, expected);
    assert.ok(layout.totalHeight > layout.pages.length * PAGE_CONFIG.pageHeight);
  });

  test('an empty measure list produces no pages and a zero total height', () => {
    const layout = NE.computePageLayout([], 10, PAGE_CONFIG, SPACING_CONFIG);
    assert.equal(layout.pages.length, 0);
    assert.equal(layout.totalHeight, 0);
  });
});
