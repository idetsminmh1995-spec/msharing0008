import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/guitar-engine.js', import.meta.url), 'utf8'), sandbox);
const G = sandbox.GuitarEngine;

const PHOTO = G.guitarPhoto('guitar.webp');
const FRAME = {
  width: 1920,
  height: 497,
  photo: PHOTO,
  bleed: true,
  handLegend: true,
  stringLabels: false,
  fretNumbers: true,
};

test('the picture is scaled to the width and hung by its strings', () => {
  const place = G.photoPlacement(FRAME);
  assert.equal(place.scale, FRAME.width / PHOTO.width);
  // The strings' middle lands where the drawn neck's middle would, so
  // the hand legend keeps its band above and the numbers their strip
  // below.
  const board = G.guitarLayout(FRAME).board;
  const middle = place.y + ((PHOTO.stringsAtNut[0] + PHOTO.stringsAtNut[1]) / 2) * place.scale;
  assert.ok(Math.abs(middle - (board.y + board.height / 2)) < 1, `hung at ${middle}`);
  // It is BIGGER than the frame: a photographed guitar runs off the
  // top and the bottom the way it runs off the side.
  assert.ok(place.y < 0, 'the body is cut by the top edge');
  assert.ok(place.photo.height * place.scale > FRAME.height * 1.2);
  assert.equal(G.photoPlacement({ width: 1920, height: 497 }), undefined, 'no photo, no placement');
});

test('a photograph shows the frets it has, whatever it is asked for', () => {
  const range = G.fretRange({ ...FRAME, firstFret: 0, lastFret: 5 });
  assert.equal(range.first, 0);
  assert.equal(range.last, G.photoFretCount(PHOTO));
  assert.equal(range.last, 20, 'the sample is a cutaway: twenty frets');
  // Without one, the caller's answer stands.
  assert.equal(G.fretRange({ firstFret: 0, lastFret: 5 }).last, 5);
});

test('a mark lands between the picture’s own two fret wires', () => {
  const scale = G.photoPlacement(FRAME).scale;
  for (const fret of [1, 5, 12, 20]) {
    const wanted = ((PHOTO.frets[fret - 1] + PHOTO.frets[fret]) / 2) * scale;
    assert.ok(
      Math.abs(G.fretCenter(fret, FRAME) - wanted) < 0.5,
      `fret ${fret}: ${G.fretCenter(fret, FRAME)} wanted ${wanted}`,
    );
  }
  // An open string is played at the nut, which is wherever the
  // picture puts it -- not at the left edge of the box.
  assert.ok(Math.abs(G.fretCenter(0, FRAME) - PHOTO.frets[0] * scale) < 0.5);
  // The frets crowd as they climb, because the picture's do.
  const low = G.fretCenter(2, FRAME) - G.fretCenter(1, FRAME);
  const high = G.fretCenter(20, FRAME) - G.fretCenter(19, FRAME);
  assert.ok(high < low * 0.5, `${high} against ${low}`);
});

test('a mark lands on the picture’s own string', () => {
  const place = G.photoPlacement(FRAME);
  const at = (file) => place.y + file * place.scale;
  const nutX = PHOTO.frets[0] * place.scale;
  assert.ok(Math.abs(G.stringYAt(FRAME, 1, nutX) - at(PHOTO.stringsAtNut[0])) < 1);
  assert.ok(Math.abs(G.stringYAt(FRAME, 6, nutX) - at(PHOTO.stringsAtNut[1])) < 1);
  const endX = PHOTO.boardEndX * place.scale;
  assert.ok(Math.abs(G.stringYAt(FRAME, 1, endX) - at(PHOTO.stringsAtEnd[0])) < 1);
  assert.ok(Math.abs(G.stringYAt(FRAME, 6, endX) - at(PHOTO.stringsAtEnd[1])) < 1);
  // They fan out on the way, as the picture's do.
  assert.ok(
    G.stringYAt(FRAME, 6, endX) - G.stringYAt(FRAME, 1, endX) >
      G.stringYAt(FRAME, 6, nutX) - G.stringYAt(FRAME, 1, nutX),
  );
  // Six evenly spread between the two outer ones.
  const lines = G.stringLines(FRAME);
  assert.equal(lines.length, 6);
  const gaps = [];
  for (let i = 1; i < lines.length; i++) gaps.push(lines[i].offset - lines[i - 1].offset);
  for (const gap of gaps) assert.ok(Math.abs(gap - gaps[0]) < 0.001, `even at the nut: ${gaps}`);
});

test('an open string is still shown when the nut is off the edge', () => {
  // A picture framed with the neck running in from the left edge:
  // the nut, and the first fret with it, are off it.
  const bled = {
    ...FRAME,
    photo: { ...PHOTO, frets: [-180, -70, ...PHOTO.frets.slice(2)] },
  };
  assert.ok(G.fretCenter(0, bled) < 0, 'the nut really is off the edge');
  const [mark] = G.markShapes(
    G.positionsAt([{ string: 3, fret: 0, startSeconds: 0, endSeconds: 1, finger: 0 }], 0.5),
    bled,
  );
  assert.ok(mark.x > 0 && mark.x < mark.width, 'held at the edge the nut went past');
  assert.ok(
    Math.abs(mark.y - G.stringYAt(bled, 3, mark.x)) < 1e-6,
    'and still on its own string',
  );
});

test('the photograph replaces the drawn instrument, not the playing', () => {
  const shapes = G.stageShapes({
    ...FRAME,
    seconds: 0.5,
    notes: [{ string: 2, fret: 7, startSeconds: 0, endSeconds: 1, finger: 3 }],
    pick: { direction: 'down', strings: [1, 2], age: 0.1 },
  });
  const roles = shapes.map((shape) => shape.role);
  const pictures = shapes.filter((shape) => shape.kind === 'image');
  assert.equal(pictures.length, 1, 'one picture');
  assert.equal(pictures[0].href, 'guitar.webp');
  assert.equal(pictures[0].role, 'photo');
  // Nothing of the drawn instrument is left to argue with the picture.
  for (const gone of ['neck', 'board', 'binding', 'fret', 'nut', 'inlay', 'string', 'headstock', 'tuner', 'body', 'pickguard', 'soundhole', 'pickup', 'hardware']) {
    assert.ok(!roles.includes(gone), `no drawn ${gone}`);
  }
  // Everything about the playing still gets drawn, on top of it.
  assert.ok(roles.includes('mark'), 'the note being played');
  assert.ok(roles.includes('fretNumber'), 'the fret numbers');
  assert.ok(roles.includes('pickStroke'), 'the picking hand');
  assert.ok(shapes.indexOf(pictures[0]) < roles.indexOf('mark'), 'the picture goes down first');
  // The hand legend is four coloured fingers, and it is still there.
  assert.ok(shapes.some((shape) => shape.fill === G.FINGER_COLORS.index), 'the hand legend');
});

test('the numbers ride under the board the picture actually has', () => {
  const shapes = G.stageShapes({ ...FRAME, seconds: 0, notes: [] });
  const numbers = shapes.filter((shape) => shape.role === 'fretNumber');
  // Not one per fret: the picture's frets crowd as they climb, and a
  // number that will not fit is left out rather than printed over its
  // neighbour. The ones with a marker in the wood keep their place.
  const printed = numbers.map((number) => number.text);
  assert.ok(numbers.length > 10 && numbers.length < 20, `printed ${printed.join(',')}`);
  for (const landmark of ['3', '5', '7', '9', '12', '15', '17', '19']) {
    assert.ok(printed.includes(landmark), `the ${landmark}th is always there`);
  }
  for (let i = 1; i < numbers.length; i++) {
    const gap = numbers[i].x - numbers[i - 1].x;
    assert.ok(gap > numbers[i].fontSize * 0.6, `${printed[i]} clears ${printed[i - 1]}`);
  }
  for (const number of numbers) {
    const board = G.boardEdgesAt(FRAME, number.x);
    assert.ok(number.y > board.bottom, `${number.text} is under the board`);
    assert.ok(number.y < board.bottom + number.fontSize * 1.5, `${number.text} stays close to it`);
  }
  // The board slopes away from the nut, and they go with it.
  assert.ok(numbers[numbers.length - 1].y > numbers[0].y, 'they lean with the neck');
});

test('the SVG writes the picture as an image, and nothing else has to change', () => {
  const svg = G.renderGuitarStage({ ...FRAME, seconds: 0, notes: [] });
  assert.ok(svg.includes('<image'), 'an image element');
  assert.ok(svg.includes('href="guitar.webp"'), 'pointing at the file');
  assert.ok(!svg.includes('fill="none" href'), 'an image is not painted with a fill');
  assert.ok(svg.includes('<text'), 'the fret numbers still get written');
});

// The inlay dots' centres, measured off the acoustic the page draws.
// They are the only thing that says which line in the picture is
// which fret -- a geometric fret series fits the wires just as well
// a fret out -- and they have to come out as numbers a guitar is
// really inlaid at. These are the standard set; the numbering one
// fret over gives 4, 6, 8, 10, 13, 16, 18, which is nobody's guitar.
const ACOUSTIC_DOTS = { 3: 262, 5: 421, 7: 563, 9: 691, 12: 860, 15: 1003, 17: 1087 };

test('the acoustic is numbered from its dots: the nut and twenty frets', () => {
  const photo = G.photoNamed('acoustic-natural', 'acoustic.webp');
  assert.equal(photo.frets.length, 21, 'twenty-one lines across the board');
  assert.equal(G.photoFretCount(photo), 20, 'which is the nut and twenty frets');
  assert.equal(photo.frets[0], 34, 'the first line is the nut, and it is on the picture');
  for (const [fret, dot] of Object.entries(ACOUSTIC_DOTS)) {
    const at = Number(fret);
    const middle = (photo.frets[at - 1] + photo.frets[at]) / 2;
    assert.ok(Math.abs(middle - dot) < 1.5, `fret ${fret} sits at ${middle}, its dot at ${dot}`);
  }
});

test('a cropped picture is faded into the frame, not cut off by it', () => {
  const notes = [];
  assert.equal(
    G.stageShapes({ ...FRAME, seconds: 0, notes }).filter((s) => s.role === 'photoFade').length,
    0,
    'no colour behind the stage, no fade -- a guessed one would be the wrong colour',
  );

  // The sample cutaway is cut by the frame's top edge and ends at its
  // own outline above the bottom one, so it gets ONE band: a band over
  // an outline would be fog over the guitar, not a cut hidden.
  const one = G.stageShapes({ ...FRAME, fadeTo: 'rgb(18, 18, 22)', seconds: 0, notes });
  assert.equal(one.filter((s) => s.role === 'photoFade').length, 1, 'only the edge that is cut');

  // The acoustic the page draws is cut at both: the owner framed it
  // that way, and the frame crops what is left.
  const photo = G.photoNamed('acoustic-natural', 'acoustic.webp');
  const height = G.stageHeightFor(1920, photo, { handLegend: true, fretNumbers: true });
  const CUT = { ...FRAME, photo, height, fadeTo: 'rgb(18, 18, 22)', seconds: 0, notes };
  const faded = G.stageShapes(CUT);
  const fades = faded.filter((shape) => shape.role === 'photoFade');
  assert.equal(fades.length, 2, 'the top edge and the bottom edge, both of them cut');
  const [top, bottom] = fades;

  // Opaque where the picture is cut, gone where the band ends.
  // Both bands run a little past the edge they cover, so the cut --
  // the viewBox, the canvas clip -- is what ends them, and no smoothed
  // sliver of picture survives underneath.
  assert.ok(top.y < 0 && top.y > -4, `the top band starts above the frame, at ${top.y}`);
  assert.equal(top.fill.stops[0].color, 'rgba(18, 18, 22, 1)');
  assert.equal(top.fill.stops.at(-1).color, 'rgba(18, 18, 22, 0)');
  assert.ok(bottom.y < CUT.height && bottom.y + bottom.height > CUT.height, 'and ends below it');
  assert.equal(bottom.fill.stops[0].color, 'rgba(18, 18, 22, 0)');
  assert.equal(bottom.fill.stops.at(-1).color, 'rgba(18, 18, 22, 1)');
  for (const fade of fades) {
    assert.equal(fade.x, 0);
    assert.equal(fade.width, CUT.width);
    let last = -1;
    for (const stop of fade.fill.stops) {
      assert.ok(stop.offset > last, 'the stops climb');
      last = stop.offset;
    }
  }

  // The band never reaches the BOARD: the fade hides the cut across
  // the body, it does not wash out the frets being played on.
  for (const x of [0, CUT.width * 0.25, CUT.width * 0.5]) {
    const board = G.boardEdgesAt(CUT, x);
    assert.ok(board.top > top.height, `the board clears the top band at ${x}`);
    assert.ok(board.bottom < bottom.y, `and the bottom one at ${x}`);
  }

  // Down after the picture, before everything about the playing.
  const roles = faded.map((shape) => shape.role);
  assert.ok(roles.indexOf('photo') < roles.indexOf('photoFade'), 'over the picture');
  assert.ok(roles.indexOf('photoFade') < roles.indexOf('fretNumber'), 'under the numbers');
  const hand = faded.findIndex((shape) => shape.fill === G.FINGER_COLORS.index);
  assert.ok(hand > roles.indexOf('photoFade'), 'under the hand legend');

  // A hex colour is read the same way, and a see-through or unreadable
  // one is not read at all.
  const hexed = G.stageShapes({ ...CUT, fadeTo: '#121216' });
  assert.equal(hexed.filter((s) => s.role === 'photoFade')[0].fill.stops[0].color, top.fill.stops[0].color);
  for (const color of ['transparent', 'none', '', 'rgba(0, 0, 0, 0)', '#12121600', 'wood']) {
    const tried = G.stageShapes({ ...CUT, fadeTo: color });
    assert.equal(tried.filter((s) => s.role === 'photoFade').length, 0, `"${color}" is not a colour`);
  }

  // The SVG carries it as a gradient with see-through stops.
  const svg = G.renderGuitarStage(CUT);
  assert.ok(svg.includes('stop-color="rgba(18, 18, 22, 0)"'), 'the fade ends see-through');
});

test('the classical is the owner’s drawing, read out of the file', () => {
  const photo = G.photoNamed('classical-drawn', 'classical-drawn.svg');
  assert.equal(photo.frets.length, 20, 'twenty lines');
  assert.equal(G.photoFretCount(photo), 19, 'which is the nut and nineteen frets');

  // No dots to argue about: the nut is drawn thick and the numbers
  // come straight out of the artwork. What CAN be checked is that the
  // drawing is a good one -- take the nut and the twelfth as the
  // scale, and every other wire should land where the real rule puts
  // it.
  const nut = photo.frets[0];
  const scale = (photo.frets[12] - nut) * 2;
  for (let fret = 1; fret <= 19; fret++) {
    const want = nut + scale * (1 - Math.pow(2, -fret / 12));
    const off = Math.abs(photo.frets[fret] - want);
    assert.ok(off < 3, `fret ${fret} is ${off.toFixed(1)} from the 17.817 rule`);
  }

  // Turned counter-clockwise, so the low E is at the BOTTOM -- which
  // is string 6, where the engine puts its thickest line.
  const width = 1513.5;
  const height = G.stageHeightFor(width, photo, { handLegend: true, fretNumbers: true });
  const frame = { width, height, photo, bleed: true, handLegend: true, fretNumbers: true };
  const lines = G.stringLines(frame);
  assert.equal(lines.length, 6);
  assert.ok(lines[0].offset < lines[5].offset, 'string 1 rides above string 6');
  assert.ok(lines[0].thickness < lines[5].thickness, 'and is the thinner of the two');

  // A mark on each outer string lands between the picture’s own two
  // fret wires, on the picture’s own string.
  const place = G.photoPlacement(frame);
  for (const [string, fret, edge] of [
    [1, 1, photo.stringsAtNut[0]],
    [6, 19, photo.stringsAtNut[1]],
  ]) {
    const x = G.fretCenter(fret, frame);
    const wanted = ((photo.frets[fret - 1] + photo.frets[fret]) / 2) * place.scale;
    assert.ok(Math.abs(x - wanted) < 0.5, `fret ${fret} at ${x}, wanted ${wanted}`);
    // At the nut the string is where the drawing drew it.
    const y = G.stringYAt(frame, string, G.fretCenter(0.02, frame));
    const drawn = place.y + edge * place.scale;
    assert.ok(Math.abs(y - drawn) < 2, `string ${string} at ${y}, drawn at ${drawn}`);
  }
});
