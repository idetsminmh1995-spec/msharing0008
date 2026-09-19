import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

/**
 * The engine is loaded into a `vm` sandbox, so every object it returns
 * carries THAT realm's Object prototype -- which `assert.deepEqual`
 * (strict) rejects with "same structure but not reference-equal". Round
 * -tripping through JSON re-creates the value in this realm so structural
 * comparison means what it looks like it means.
 */
const plain = (value) => JSON.parse(JSON.stringify(value));

/** Wraps measure-level XML in the smallest valid score-partwise document. */
function score(measureBody, attributes = '<divisions>2</divisions>') {
  return (
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    `<measure number="1"><attributes>${attributes}</attributes>${measureBody}</measure>` +
    '</part></score-partwise>'
  );
}

const C4 = '<pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>';

function parse(xml) {
  return NE.parseMusicXml(xml, { domParser });
}

function firstEvent(result) {
  return result.score.parts[0].measures[0].voices[0].events[0];
}

function codes(result) {
  return [...result.diagnostics].map((d) => d.code);
}

describe('MusicXML parser v2 Tier 2/3 -- <notations> (Phase 35, §10.4)', () => {
  test('all five of §9.19\'s articulations parse, with strong-accent mapped to marcato', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><notations><articulations>` +
          '<accent/><staccato/><tenuto/><strong-accent/><staccatissimo/>' +
          '</articulations></notations></note>',
      ),
    );
    assert.deepEqual(
      [...firstEvent(result).articulations],
      ['accent', 'staccato', 'tenuto', 'marcato', 'staccatissimo'],
    );
  });

  test('an articulation §9.19 does not support is dropped WITH an UNSUPPORTED_ARTICULATION diagnostic', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><notations><articulations><accent/><spiccato/></articulations></notations></note>`,
      ),
    );
    assert.deepEqual([...firstEvent(result).articulations], ['accent']);
    assert.ok(codes(result).includes('UNSUPPORTED_ARTICULATION'));
  });

  test('all four of §9.20\'s ornaments parse from their MusicXML element names', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><notations><ornaments>` +
          '<trill-mark/><mordent/><turn/><inverted-turn/>' +
          '</ornaments></notations></note>',
      ),
    );
    assert.deepEqual([...firstEvent(result).ornaments], ['trill', 'mordent', 'turn', 'turnInverted']);
  });

  test('<inverted-mordent> reports UNSUPPORTED_ORNAMENT rather than drawing the plain mordent glyph (§9.20\'s stated gap)', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><notations><ornaments><inverted-mordent/></ornaments></notations></note>`,
      ),
    );
    assert.equal(firstEvent(result).ornaments, undefined);
    assert.ok(codes(result).includes('UNSUPPORTED_ORNAMENT'));
  });

  test('<accidental-mark> inside <ornaments> is not reported as an unsupported ornament -- it modifies one, it is not one', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><notations><ornaments><trill-mark/><accidental-mark>sharp</accidental-mark></ornaments></notations></note>`,
      ),
    );
    assert.deepEqual([...firstEvent(result).ornaments], ['trill']);
    assert.ok(!codes(result).includes('UNSUPPORTED_ORNAMENT'));
  });

  test('a fermata parses on a note AND on a rest', () => {
    const noteResult = parse(
      score(`<note>${C4}<type>quarter</type><notations><fermata/></notations></note>`),
    );
    assert.equal(firstEvent(noteResult).hasFermata, true);

    const restResult = parse(
      score(
        '<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type>' +
          '<notations><fermata/></notations></note>',
      ),
    );
    const rest = firstEvent(restResult);
    assert.equal(rest.kind, 'rest');
    assert.equal(rest.hasFermata, true);
  });

  test('slur start/stop carry their own numbers, defaulting to 1 when the attribute is absent', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><notations><slur type="start"/><slur type="start" number="2"/></notations></note>` +
          `<note>${C4}<type>quarter</type><notations><slur type="stop" number="2"/></notations></note>`,
      ),
    );
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.deepEqual([...events[0].slurStarts], [1, 2]);
    assert.equal(events[0].slurStops, undefined);
    assert.deepEqual([...events[1].slurStops], [2]);
  });

  test('a slur "continue" needs no record -- only the two endpoints are kept', () => {
    const result = parse(
      score(`<note>${C4}<type>quarter</type><notations><slur type="continue"/></notations></note>`),
    );
    const ev = firstEvent(result);
    assert.equal(ev.slurStarts, undefined);
    assert.equal(ev.slurStops, undefined);
    assert.ok(!codes(result).includes('UNKNOWN_ELEMENT'));
  });

  test('tuplet start/stop parse as booleans on their own notes', () => {
    const result = parse(
      score(
        `<note>${C4}<type>eighth</type><notations><tuplet type="start"/></notations></note>` +
          `<note>${C4}<type>eighth</type><notations><tuplet type="stop"/></notations></note>`,
      ),
    );
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.equal(events[0].tupletStart, true);
    assert.equal(events[0].tupletStop, undefined);
    assert.equal(events[1].tupletStop, true);
  });

  test('a <notations> child the v2 parser does not handle is reported, not swallowed', () => {
    const result = parse(
      score(`<note>${C4}<type>quarter</type><notations><glissando type="start"/></notations></note>`),
    );
    assert.ok(
      [...result.diagnostics].some(
        (d) => d.code === 'UNKNOWN_ELEMENT' && d.message.includes('glissando'),
      ),
    );
  });

  test('a note with no <notations> at all gains none of the Tier 2 keys (pre-Tier-2 objects stay identical)', () => {
    const result = parse(score(`<note>${C4}<type>quarter</type></note>`));
    const ev = firstEvent(result);
    for (const key of [
      'articulations',
      'ornaments',
      'hasFermata',
      'slurStarts',
      'slurStops',
      'tupletStart',
      'tupletStop',
      'beams',
      'lyrics',
    ]) {
      assert.ok(!(key in ev), `expected no "${key}" key on a plain note, got ${ev[key]}`);
    }
  });
});

describe('MusicXML parser v2 Tier 2/3 -- <beam> and <lyric> (Phase 35, §10.4/§10.8)', () => {
  test('explicit <beam> hints are carried through with their level numbers', () => {
    const result = parse(
      score(
        `<note>${C4}<type>16th</type><beam number="1">begin</beam><beam number="2">begin</beam></note>`,
      ),
    );
    assert.deepEqual(plain(firstEvent(result).beams), [
      { number: 1, value: 'begin' },
      { number: 2, value: 'begin' },
    ]);
  });

  test('an unrecognized <beam> value is dropped WITH an UNSUPPORTED_BEAM_VALUE diagnostic, never guessed at', () => {
    const result = parse(score(`<note>${C4}<type>eighth</type><beam number="1">sideways</beam></note>`));
    assert.equal(firstEvent(result).beams, undefined);
    assert.ok(codes(result).includes('UNSUPPORTED_BEAM_VALUE'));
  });

  test('a lyric syllable parses its number, syllabic, text and extend', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><lyric number="1"><syllabic>begin</syllabic><text>Hal</text></lyric></note>` +
          `<note>${C4}<type>quarter</type><lyric><extend/></lyric></note>`,
      ),
    );
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.deepEqual(plain(events[0].lyrics), [
      { number: 1, syllabic: 'begin', text: 'Hal', extend: false },
    ]);
    // A bare <extend/> continuing a melisma keeps its flag rather than
    // being dropped for having no text (§10.7's no-silent-loss rule).
    assert.deepEqual(plain(events[1].lyrics), [{ number: 1, text: '', extend: true }]);
  });

  test('several <text> elements in one <lyric> (an elision) are joined, not truncated to the first', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type><lyric><text>the</text><elision>_</elision><text>end</text></lyric></note>`,
      ),
    );
    assert.equal(firstEvent(result).lyrics[0].text, 'theend');
  });
});

describe('MusicXML parser v2 Tier 2/3 -- <direction> content (Phase 35, §10.4)', () => {
  test('every one of §9.21\'s nine dynamic levels parses', () => {
    const levels = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz'];
    const result = parse(
      score(
        `<direction><direction-type><dynamics>${levels
          .map((l) => `<${l}/>`)
          .join('')}</dynamics></direction-type></direction><note>${C4}<type>quarter</type></note>`,
      ),
    );
    assert.deepEqual([...result.directions[0].dynamics], levels);
  });

  test('a dynamic §9.21 does not support is dropped WITH an UNSUPPORTED_DYNAMIC diagnostic', () => {
    const result = parse(
      score(
        `<direction><direction-type><dynamics><f/><fp/></dynamics></direction-type></direction><note>${C4}<type>quarter</type></note>`,
      ),
    );
    assert.deepEqual([...result.directions[0].dynamics], ['f']);
    assert.ok(codes(result).includes('UNSUPPORTED_DYNAMIC'));
  });

  test('a wedge parses crescendo/diminuendo/stop, mapping MusicXML\'s "diminuendo" onto §9.21\'s "decrescendo"', () => {
    const result = parse(
      score(
        '<direction><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>' +
          `<note>${C4}<type>quarter</type></note>` +
          '<direction><direction-type><wedge type="stop" number="1"/></direction-type></direction>' +
          '<direction><direction-type><wedge type="diminuendo"/></direction-type></direction>' +
          `<note>${C4}<type>quarter</type></note>`,
      ),
    );
    assert.deepEqual(plain(result.directions[0].wedges), [{ type: 'crescendo', number: 1 }]);
    assert.deepEqual(plain(result.directions[1].wedges), [{ type: 'stop', number: 1 }]);
    assert.deepEqual(plain(result.directions[2].wedges), [{ type: 'decrescendo', number: 1 }]);
  });

  test('a wedge "continue" is not an unsupported wedge -- it neither starts nor ends the span', () => {
    const result = parse(
      score(
        `<direction><direction-type><wedge type="continue"/></direction-type></direction><note>${C4}<type>quarter</type></note>`,
      ),
    );
    assert.ok(!codes(result).includes('UNSUPPORTED_WEDGE'));
  });

  test('an unrecognized wedge type reports UNSUPPORTED_WEDGE', () => {
    const result = parse(
      score(
        `<direction><direction-type><wedge type="sideways"/></direction-type></direction><note>${C4}<type>quarter</type></note>`,
      ),
    );
    assert.ok(codes(result).includes('UNSUPPORTED_WEDGE'));
  });

  test('a direction records its own tick, staff and placement', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type></note>` +
          '<direction placement="below"><direction-type><dynamics><mf/></dynamics></direction-type><staff>2</staff></direction>' +
          `<note>${C4}<type>quarter</type></note>`,
      ),
    );
    const d = result.directions[0];
    assert.equal(d.tick, 480);
    assert.equal(d.staff, 2);
    assert.equal(d.placement, 'below');
    assert.equal(d.measureNumber, 1);
    assert.equal(d.partId, 'P1');
  });

  test('<words> and <rehearsal> text is preserved even though §9.21 cannot draw arbitrary text yet', () => {
    const result = parse(
      score(
        '<direction><direction-type><words>dolce</words></direction-type></direction>' +
          '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>' +
          `<note>${C4}<type>quarter</type></note>`,
      ),
    );
    assert.deepEqual([...result.directions[0].words], ['dolce']);
    assert.deepEqual([...result.directions[1].rehearsals], ['A']);
  });
});

describe('MusicXML parser v2 Tier 2/3 -- <sound tempo>, <harmony>, <print> (Phase 35, §10.4)', () => {
  test('<sound tempo> inside a <direction> becomes a quarter-note tempo mark', () => {
    const result = parse(
      score(`<direction><sound tempo="132"/></direction><note>${C4}<type>quarter</type></note>`),
    );
    assert.equal(result.tempoMarks.length, 1);
    assert.equal(result.tempoMarks[0].beatUnit, 'quarter');
    assert.equal(result.tempoMarks[0].beatUnitDots, 0);
    assert.equal(result.tempoMarks[0].perMinute, 132);
  });

  test('a <direction> carrying BOTH <metronome> and <sound tempo> produces exactly ONE mark -- the notated one', () => {
    const result = parse(
      score(
        '<direction><direction-type><metronome><beat-unit>half</beat-unit><per-minute>60</per-minute></metronome></direction-type>' +
          `<sound tempo="120"/></direction><note>${C4}<type>quarter</type></note>`,
      ),
    );
    assert.equal(result.tempoMarks.length, 1);
    assert.equal(result.tempoMarks[0].beatUnit, 'half');
    assert.equal(result.tempoMarks[0].perMinute, 60);
  });

  test('a bare <sound tempo> directly under <measure> also becomes a tempo mark', () => {
    const result = parse(score(`<sound tempo="88"/><note>${C4}<type>quarter</type></note>`));
    assert.equal(result.tempoMarks.length, 1);
    assert.equal(result.tempoMarks[0].perMinute, 88);
  });

  test('<harmony> keeps its raw <kind> rather than reducing it to a quality glyph (§9.23 cannot draw one yet)', () => {
    const result = parse(
      score(
        '<harmony><root><root-step>D</root-step><root-alter>-1</root-alter></root>' +
          '<kind text="m7">minor-seventh</kind><bass><bass-step>F</bass-step></bass></harmony>' +
          `<note>${C4}<type>quarter</type></note>`,
      ),
    );
    const h = result.harmonies[0];
    assert.equal(h.rootStep, 'D');
    assert.equal(h.rootAlter, -1);
    assert.equal(h.kind, 'minor-seventh');
    assert.equal(h.kindText, 'm7');
    assert.equal(h.bassStep, 'F');
    assert.equal(h.tick, 0);
  });

  test('<print> is recorded only when it actually asks for a system or page break', () => {
    const asks = parse(
      score(`<print new-system="yes"/><note>${C4}<type>quarter</type></note>`),
    );
    assert.deepEqual(plain(asks.prints), [
      { partId: 'P1', measureNumber: 1, newSystem: true, newPage: false },
    ]);

    const doesNot = parse(
      score(`<print><system-layout/></print><note>${C4}<type>quarter</type></note>`),
    );
    assert.equal(doesNot.prints.length, 0);
  });
});

describe('MusicXML parser v2 Tier 2/3 -- additive time signatures (STATUS C3, §9.4)', () => {
  test('"3+2+2" over 8 parses as the numeric total 7 with "3+2+2" kept for display', () => {
    const result = parse(
      score(`<note>${C4}<type>quarter</type></note>`, '<divisions>2</divisions><time><beats>3+2+2</beats><beat-type>8</beat-type></time>'),
    );
    const attrs = result.attributes[0];
    assert.equal(attrs.timeNumerator, 7);
    assert.equal(attrs.timeDenominator, 8);
    assert.equal(attrs.timeNumeratorDisplay, '3+2+2');
  });

  test('several <beats>/<beat-type> pairs sum the same way', () => {
    const result = parse(
      score(
        `<note>${C4}<type>quarter</type></note>`,
        '<divisions>2</divisions><time><beats>3</beats><beat-type>8</beat-type><beats>2</beats><beat-type>8</beat-type></time>',
      ),
    );
    assert.equal(result.attributes[0].timeNumerator, 5);
    assert.equal(result.attributes[0].timeNumeratorDisplay, '3+2');
  });

  test('an ordinary meter keeps timeNumeratorDisplay absent, so nothing about its rendering changes', () => {
    const result = parse(
      score(`<note>${C4}<type>quarter</type></note>`, '<divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>'),
    );
    assert.equal(result.attributes[0].timeNumerator, 4);
    assert.ok(!('timeNumeratorDisplay' in result.attributes[0]));
  });

  test('a later ordinary <time> clears a previous additive display', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<time><beats>3+2</beats><beat-type>8</beat-type></time></attributes>' +
      `<note>${C4}<type>quarter</type></note></measure>` +
      '<measure number="2"><attributes><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' +
      `<note>${C4}<type>quarter</type></note></measure>` +
      '</part></score-partwise>';
    const result = parse(xml);
    assert.equal(result.attributes[0].timeNumeratorDisplay, '3+2');
    assert.ok(!('timeNumeratorDisplay' in result.attributes[1]));
  });
});
