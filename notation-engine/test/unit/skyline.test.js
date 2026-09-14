import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('addToSkyline (Phase 44, §15.1)', () => {
  test('a single shape added to an empty skyline is recorded as-is', () => {
    const sky = NE.addToSkyline(NE.emptySkyline('north'), { xStart: 0, xEnd: 10, y: -5 });
    const segs = [...sky.segments];
    assert.equal(segs.length, 1);
    assert.equal(segs[0].y, -5);
  });

  test('a NORTH skyline keeps the SMALLER (more negative/higher) y where two shapes overlap', () => {
    let sky = NE.emptySkyline('north');
    sky = NE.addToSkyline(sky, { xStart: 0, xEnd: 10, y: -5 });
    sky = NE.addToSkyline(sky, { xStart: 0, xEnd: 10, y: -8 }); // reaches higher (more negative)
    const seg = [...sky.segments][0];
    assert.equal(seg.y, -8);
  });

  test('a SOUTH skyline keeps the LARGER (more positive/lower) y where two shapes overlap', () => {
    let sky = NE.emptySkyline('south');
    sky = NE.addToSkyline(sky, { xStart: 0, xEnd: 10, y: 5 });
    sky = NE.addToSkyline(sky, { xStart: 0, xEnd: 10, y: 8 }); // reaches lower (more positive)
    const seg = [...sky.segments][0];
    assert.equal(seg.y, 8);
  });

  test('non-overlapping x-ranges are kept as two separate segments, each with its own y', () => {
    let sky = NE.emptySkyline('north');
    sky = NE.addToSkyline(sky, { xStart: 0, xEnd: 5, y: -3 });
    sky = NE.addToSkyline(sky, { xStart: 10, xEnd: 15, y: -6 });
    const segs = [...sky.segments].sort((a, b) => a.xStart - b.xStart);
    assert.equal(segs.length, 2);
    assert.equal(segs[0].y, -3);
    assert.equal(segs[1].y, -6);
  });

  test('a shape partially overlapping an existing segment correctly splits it', () => {
    let sky = NE.emptySkyline('north');
    sky = NE.addToSkyline(sky, { xStart: 0, xEnd: 10, y: -3 });
    sky = NE.addToSkyline(sky, { xStart: 5, xEnd: 15, y: -9 }); // reaches higher, overlaps [5,10)
    const segs = [...sky.segments].sort((a, b) => a.xStart - b.xStart);
    // [0,5) unaffected at -3; [5,15) now -9 (the more extreme value, merged since it's contiguous with the same y).
    const at2 = segs.find((s) => s.xStart <= 2 && 2 < s.xEnd);
    const at7 = segs.find((s) => s.xStart <= 7 && 7 < s.xEnd);
    const at12 = segs.find((s) => s.xStart <= 12 && 12 < s.xEnd);
    assert.equal(at2.y, -3);
    assert.equal(at7.y, -9);
    assert.equal(at12.y, -9);
  });
});

describe('minDistance (Phase 44, §15.1)', () => {
  test('two overlapping skylines return the smallest gap across the overlap', () => {
    const upperSouth = NE.addToSkyline(NE.emptySkyline('south'), { xStart: 0, xEnd: 10, y: 3 });
    const lowerNorth = NE.addToSkyline(NE.emptySkyline('north'), { xStart: 0, xEnd: 10, y: 9 });
    assert.equal(NE.minDistance(upperSouth, lowerNorth), 6);
  });

  test('non-overlapping x-ranges produce no distance constraint at all (undefined)', () => {
    const upperSouth = NE.addToSkyline(NE.emptySkyline('south'), { xStart: 0, xEnd: 5, y: 3 });
    const lowerNorth = NE.addToSkyline(NE.emptySkyline('north'), { xStart: 10, xEnd: 15, y: 9 });
    assert.equal(NE.minDistance(upperSouth, lowerNorth), undefined);
  });

  test('the SMALLEST gap wins when several overlapping sub-ranges have different gaps', () => {
    let upperSouth = NE.emptySkyline('south');
    upperSouth = NE.addToSkyline(upperSouth, { xStart: 0, xEnd: 5, y: 2 });
    upperSouth = NE.addToSkyline(upperSouth, { xStart: 5, xEnd: 10, y: 3 });
    let lowerNorth = NE.emptySkyline('north');
    lowerNorth = NE.addToSkyline(lowerNorth, { xStart: 0, xEnd: 10, y: 8 });
    // gaps: [0,5) -> 8-2=6; [5,10) -> 8-3=5. Smallest is 5.
    assert.equal(NE.minDistance(upperSouth, lowerNorth), 5);
  });
});

describe('placeElement (Phase 44, §15.1 placement procedure)', () => {
  test('an element with no prior content in its x-range uses its own default y, unpushed', () => {
    const sky = NE.emptySkyline('north');
    const result = NE.placeElement(sky, 0, 10, -5, 0.5);
    assert.equal(result.y, -5);
  });

  test('TWO ELEMENTS AT THE SAME X: the second is pushed clear of the first', () => {
    let sky = NE.emptySkyline('north');
    const first = NE.placeElement(sky, 0, 10, -5, 0.5);
    sky = first.skyline;
    const second = NE.placeElement(sky, 0, 10, -5, 0.5); // same x-range, same default y
    // The second must be pushed further out (more negative) than the first, not stacked on top of it.
    assert.ok(second.y < first.y, `expected ${second.y} < ${first.y}`);
    assert.ok(Math.abs(second.y - (first.y - 0.5)) < 1e-9);
  });

  test('NON-OVERLAPPING X-RANGES: placing a second element elsewhere causes no push at all', () => {
    let sky = NE.emptySkyline('north');
    const first = NE.placeElement(sky, 0, 10, -5, 0.5);
    sky = first.skyline;
    const second = NE.placeElement(sky, 20, 30, -5, 0.5); // disjoint x-range
    assert.equal(second.y, -5, 'a disjoint x-range should never be pushed');
  });

  test('placing on a SOUTH skyline pushes in the opposite (more positive) direction', () => {
    let sky = NE.emptySkyline('south');
    const first = NE.placeElement(sky, 0, 10, 5, 0.5);
    sky = first.skyline;
    const second = NE.placeElement(sky, 0, 10, 5, 0.5);
    assert.ok(second.y > first.y);
  });
});

describe('alignedGroupY (Phase 44, §15.2 alignment groups)', () => {
  test("A LYRIC LINE STAYING ALIGNED WHEN ONE SYLLABLE NEEDED EXTRA ROOM: the whole group takes the most-extreme member's position", () => {
    // Simulate 3 syllables placed independently, all wanting the same
    // default y=5 -- but something else (e.g. a wide chord's own
    // accidental) already occupies part of syllable b's x-range,
    // forcing IT alone to be pushed further out than a and c.
    let sky = NE.emptySkyline('south');
    sky = NE.addToSkyline(sky, { xStart: 8, xEnd: 10, y: 6 }); // pre-existing obstacle under syllable b
    const a = NE.placeElement(sky, 0, 3, 5, 0.5);
    sky = a.skyline;
    const b = NE.placeElement(sky, 5, 15, 5, 0.5); // overlaps the obstacle at [8,10) -> must push past it
    sky = b.skyline;
    const c = NE.placeElement(sky, 20, 23, 5, 0.5);

    const groupY = NE.alignedGroupY('south', [a.y, b.y, c.y]);
    // The group's shared y must be the most-extreme (largest, for south) of the three.
    assert.equal(groupY, Math.max(a.y, b.y, c.y));
    // And confirm at least one member genuinely needed pushing, so this
    // test is exercising the real scenario, not three identical values.
    assert.ok(new Set([a.y, b.y, c.y]).size > 1);
    assert.equal(b.y, 6.5); // pushed past the 6-high obstacle, plus padding
  });

  test('a north group takes the SMALLEST (most extreme) member', () => {
    const groupY = NE.alignedGroupY('north', [-3, -7, -2]);
    assert.equal(groupY, -7);
  });

  test('alignedGroupY throws rather than silently returning a meaningless value for an empty group', () => {
    assert.throws(() => NE.alignedGroupY('north', []));
  });
});

describe('computeStaffDistance (Phase 44, §15.1 staff distance)', () => {
  // NOTE: computeStaffDistance's two skylines use a DIFFERENT convention
  // from placeElement's -- each is a POSITIVE local magnitude away from
  // that staff's OWN edge (upperSouth.y = distance below upper's bottom
  // line; lowerNorth.y = distance above lower's top line), never the
  // signed absolute-page convention placeElement/addToSkyline use for
  // placing one element within one already-known staff. See the
  // function's own docstring for why.

  test('STAFF DISTANCE GROWING WHEN THE UPPER STAFF HAS LOW-HANGING CONTENT', () => {
    const lowerNorth = NE.addToSkyline(NE.emptySkyline('north'), { xStart: 0, xEnd: 10, y: 1 });

    const smallUpperSouth = NE.addToSkyline(NE.emptySkyline('south'), { xStart: 0, xEnd: 10, y: 1 });
    const withoutMuchContent = NE.computeStaffDistance(smallUpperSouth, lowerNorth, 3.5);
    assert.equal(withoutMuchContent, 3.5); // required (1+1=2) is below the floor, so the floor wins

    // Now the upper staff has something hanging much lower (e.g. a dynamic mark).
    const bigUpperSouth = NE.addToSkyline(NE.emptySkyline('south'), { xStart: 0, xEnd: 10, y: 6 });
    const withContent = NE.computeStaffDistance(bigUpperSouth, lowerNorth, 3.5);
    assert.ok(withContent > withoutMuchContent, 'distance should grow to accommodate the low-hanging content');
    assert.equal(withContent, 7); // 6 + 1 = 7, exceeding the 3.5 floor
  });

  test('the configured minimum applies even when nothing overlaps at all', () => {
    const upperSouth = NE.addToSkyline(NE.emptySkyline('south'), { xStart: 0, xEnd: 5, y: 1 });
    const lowerNorth = NE.addToSkyline(NE.emptySkyline('north'), { xStart: 50, xEnd: 60, y: 1 });
    assert.equal(NE.computeStaffDistance(upperSouth, lowerNorth, 3.5), 3.5);
  });

  test('the computed distance wins when it genuinely exceeds the configured minimum', () => {
    const upperSouth = NE.addToSkyline(NE.emptySkyline('south'), { xStart: 0, xEnd: 10, y: 10 });
    const lowerNorth = NE.addToSkyline(NE.emptySkyline('north'), { xStart: 0, xEnd: 10, y: 2 });
    assert.equal(NE.computeStaffDistance(upperSouth, lowerNorth, 3.5), 12); // 10 + 2
  });

  test('the TIGHTEST overlapping x-position governs, even if other x-positions need less', () => {
    let upperSouth = NE.emptySkyline('south');
    upperSouth = NE.addToSkyline(upperSouth, { xStart: 0, xEnd: 5, y: 1 });
    upperSouth = NE.addToSkyline(upperSouth, { xStart: 5, xEnd: 10, y: 8 }); // the tight spot
    const lowerNorth = NE.addToSkyline(NE.emptySkyline('north'), { xStart: 0, xEnd: 10, y: 1 });
    assert.equal(NE.computeStaffDistance(upperSouth, lowerNorth, 3.5), 9); // 8 + 1, not 1 + 1
  });
});
