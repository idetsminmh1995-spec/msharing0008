/**
 * Phase 53/§18.1: a synthetic MusicXML score of any size, for the
 * performance budgets.
 *
 * Generated rather than checked in as a fixture, because §18.1's budgets
 * are stated per measure count ("a 100-measure MusicXML") and a
 * benchmark that can only ever run at one size cannot show where a cost
 * stops being linear -- which is the thing worth knowing about a layout
 * engine.
 *
 * Deterministic: the same `measureCount` always produces the same bytes,
 * so a timing that moves means the CODE moved (§4.4's own reasoning,
 * applied to benchmarks).
 */

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * One part, 4/4, eight beamed eighth notes per measure -- the shape that
 * exercises the most code per measure (beam grouping, stem direction,
 * accidental state, per-tick spacing) without needing a hand-written
 * file per size.
 */
export function generateScore(measureCount, { parts = 1 } = {}) {
  const partIds = Array.from({ length: parts }, (_, p) => `P${p + 1}`);

  const partList = partIds
    .map(
      (id, p) =>
        `<score-part id="${id}"><part-name>Part ${p + 1}</part-name></score-part>`,
    )
    .join('');

  const body = partIds
    .map((id, p) => {
      const measures = [];
      for (let m = 1; m <= measureCount; m++) {
        const notes = [];
        for (let n = 0; n < 8; n++) {
          // A slowly walking line, so stem directions and ledger lines
          // vary across the score instead of every measure being identical.
          const index = (m * 3 + n + p * 2) % STEPS.length;
          const octave = 4 + (((m + n) / 7) | 0) % 2;
          const beam =
            n % 4 === 0
              ? '<beam number="1">begin</beam>'
              : n % 4 === 3
                ? '<beam number="1">end</beam>'
                : '<beam number="1">continue</beam>';
          notes.push(
            `<note><pitch><step>${STEPS[index]}</step><octave>${octave}</octave></pitch>` +
              `<duration>2</duration><type>eighth</type>${beam}</note>`,
          );
        }
        const attributes =
          m === 1
            ? '<attributes><divisions>4</divisions><key><fifths>0</fifths></key>' +
              '<time><beats>4</beats><beat-type>4</beat-type></time>' +
              '<clef><sign>G</sign><line>2</line></clef></attributes>'
            : '';
        measures.push(`<measure number="${m}">${attributes}${notes.join('')}</measure>`);
      }
      return `<part id="${id}">${measures.join('')}</part>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<score-partwise version="4.0">' +
    `<part-list>${partList}</part-list>` +
    body +
    '</score-partwise>'
  );
}
