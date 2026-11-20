/**
 * Notation Lab — score document, edit commands, and MusicXML serialization.
 *
 * The rendered SVG is never the source of truth. Every edit rebuilds this
 * structured document (the engine's own `ParseResult` shape) and the engine
 * re-renders from it, so edits act on a semantic score rather than on the
 * pixels it drew.
 *
 * The MusicXML writer is the engine's own (`writeMusicXml`); this file owns
 * only the edit commands that keep that document valid.
 */
(() => {
  const E = window.NotationEngine;
  const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const CLEF_BY_SIGN = {
    treble: { sign: 'G', line: 2 },
    bass: { sign: 'F', line: 4 },
    alto: { sign: 'C', line: 3 },
  };

  const partOf = (doc, partId) =>
    doc.score.parts.find((part) => part.id === partId) ?? doc.score.parts[0];

  const attributeFor = (doc, partId, measureNumber) =>
    doc.attributes.find((a) => a.partId === partId && a.measureNumber === measureNumber);

  /** How many ticks one measure of this part's current meter holds. */
  function measureTicks(attribute) {
    if (!attribute) return E.TICKS_PER_QUARTER * 4;
    return (attribute.timeNumerator * (4 / attribute.timeDenominator)) * E.TICKS_PER_QUARTER;
  }

  const ticksPerMeasure = (doc, partId, measureNumber) =>
    measureTicks(attributeFor(doc, partId, measureNumber));

  /** The event a `{ measureNumber, voiceId, eventIndex }` cell points at. */
  function eventAt(doc, cell) {
    const measure = partOf(doc, cell.partId).measures.find((m) => m.number === cell.measureNumber);
    const voice = measure?.voices.find((v) => v.id === cell.voiceId);
    return voice ? voice.events[cell.eventIndex] : undefined;
  }

  // ---- document edits (every one returns a new document) ------------------

  function updatePart(doc, partId, updater) {
    return {
      ...doc,
      score: {
        ...doc.score,
        parts: doc.score.parts.map((part) => (part.id === partId ? updater(part) : part)),
      },
    };
  }

  function updateMeasure(doc, partId, measureNumber, updater) {
    return updatePart(doc, partId, (part) => ({
      ...part,
      measures: part.measures.map((measure) =>
        measure.number === measureNumber ? updater(measure) : measure,
      ),
    }));
  }

  function updateVoice(doc, partId, measureNumber, voiceId, updater) {
    return updateMeasure(doc, partId, measureNumber, (measure) => {
      const voices = measure.voices.length > 0 ? measure.voices : [E.voice(voiceId, [])];
      const exists = voices.some((voice) => voice.id === voiceId);
      const next = exists
        ? voices.map((voice) =>
            voice.id === voiceId ? { ...voice, events: updater([...voice.events]) } : voice,
          )
        : [...voices, E.voice(voiceId, updater([]))];
      return { ...measure, voices: next };
    });
  }

  const sortEvents = (events) =>
    [...events].sort((a, b) => (a.startTick ?? 0) - (b.startTick ?? 0));

  /**
   * A measure written as one full-length rest is how MusicXML says "empty".
   * The first note written into it replaces that placeholder rather than
   * being appended after a rest that already fills the bar.
   */
  function withoutPlaceholderRest(events, capacity) {
    if (events.length !== 1) return events;
    const only = events[0];
    if (only.kind === 'rest' && only.duration.ticks >= capacity) return [];
    return events;
  }

  /**
   * Splits a tick span into the fewest notatable rests, longest value
   * first, so a note written into a later beat is preceded by real rests
   * rather than a hole. The renderer lays a voice out left to right from
   * its first event, so an event with nothing before it is drawn at the
   * barline however late its own start tick is -- the rests are what keep
   * the drawing honest.
   */
  function restsForSpan(ticks, voice, staff, baseTick) {
    const rests = [];
    let placed = 0;
    while (placed < ticks) {
      const remaining = ticks - placed;
      const found = E.durationTypeAndDotsFromTicks(remaining, 3);
      if (found) {
        rests.push(
          E.rest({
            duration: E.duration(found.type, found.dots, remaining),
            voice,
            staff,
            startTick: baseTick + placed,
          }),
        );
        placed += remaining;
        continue;
      }
      // Not a single notatable value: take the largest whole value below it
      // and continue with the remainder.
      let taken = 0;
      for (const type of ['whole', 'half', 'quarter', 'eighth', '16th', '32nd']) {
        const base = E.ticksForDisplayedDuration({ type, dots: 0 });
        if (base <= remaining) {
          rests.push(
            E.rest({ duration: E.duration(type, 0, base), voice, staff, startTick: baseTick + placed }),
          );
          taken = base;
          break;
        }
      }
      if (taken === 0) break;
      placed += taken;
    }
    return rests;
  }

  function insertEvent(doc, { partId, measureNumber, voiceId = 1, event }) {
    const capacity = ticksPerMeasure(doc, partId, measureNumber);
    return updateVoice(doc, partId, measureNumber, voiceId, (events) => {
      const base = withoutPlaceholderRest(events, capacity);
      const start = event.startTick ?? 0;
      const end = start + event.duration.ticks;
      // Drop or trim any REST the new event overlaps. The padding rests
      // above cover the whole bar, so writing into an empty beat lands
      // inside one; without this the new note would stack on the rest and
      // the measure would run past its own meter. Notes are left alone --
      // only a deliberate click into the middle of a sounding note hits
      // one, and shortening it silently would lose music.
      const kept = [];
      for (const current of base) {
        const currentStart = current.startTick ?? 0;
        const currentEnd = currentStart + current.duration.ticks;
        if (current.kind !== 'rest' || currentEnd <= start || currentStart >= end) {
          kept.push(current);
          continue;
        }
        // Carve the new note out of the rest, keeping whatever head and
        // tail remain as rests of their own (a span that is not one
        // notatable value splits, so a hole in the middle of a whole rest
        // still leaves legal note values on both sides).
        if (currentStart < start) {
          kept.push(...restsForSpan(start - currentStart, voiceId, current.staff ?? 1, currentStart));
        }
        if (currentEnd > end) {
          kept.push(...restsForSpan(currentEnd - end, voiceId, current.staff ?? 1, end));
        }
      }
      const sorted = sortEvents([...kept, event]);
      const filled = [];
      let cursor = 0;
      for (const current of sorted) {
        const currentStart = current.startTick ?? cursor;
        if (currentStart > cursor) {
          filled.push(...restsForSpan(currentStart - cursor, voiceId, current.staff ?? 1, cursor));
        }
        filled.push(current);
        cursor = currentStart + current.duration.ticks;
      }
      return padVoiceToCapacity(filled, voiceId, capacity, 1);
    });
  }

  /**
   * Tops a voice up with a rest so its events span the whole measure.
   *
   * The renderer lays a voice out from its own first event to its own
   * last, and takes the measure's drawn width from that span -- a bar
   * holding a lone quarter note renders as a quarter-note-wide measure,
   * so a click past it lands in the NEXT measure and the note the user
   * then writes goes to the wrong bar. Keeping the tail (and, for a
   * measure the placeholder rest already filled, the whole bar) covered
   * by rests keeps every measure its full width and the click geometry
   * stable.
   */
  function padVoiceToCapacity(events, voiceId, capacity, staff) {
    const total = events.reduce((sum, event) => sum + event.duration.ticks, 0);
    if (total >= capacity) return events;
    return [
      ...events,
      ...restsForSpan(capacity - total, voiceId, staff, total),
    ];
  }

  /** Applies `padVoiceToCapacity` to every voice of every measure, so a measure always spans its own meter. */
  function padMeasure(doc, partId) {
    return updatePart(doc, partId, (part) => ({
      ...part,
      measures: part.measures.map((measure) => {
        const capacity = ticksPerMeasure(doc, partId, measure.number);
        return {
          ...measure,
          voices: measure.voices.map((voice) => ({
            ...voice,
            events: padVoiceToCapacity(sortEvents(voice.events), voice.id, capacity, 1),
          })),
        };
      }),
    }));
  }

  /**
   * Deletes a set of events, leaving a rest of the same length in each
   * one's place.
   *
   * This is MuseScore's Delete: the notes go, the rhythm stays. Simply
   * removing the events would shrink the voice's drawn span and pull
   * every later note leftwards, which is what makes a bar look like it
   * lost a beat. Replacing each deleted note with a rest of its own
   * duration keeps the bar full and every later note where the user last
   * saw it.
   *
   * `cells` is a list of `{ partId, measureNumber, voiceId, eventIndex }`
   * so a range can cross measures and staves. Cells are deleted from the
   * highest index down, so earlier indices stay valid as the list shrinks.
   */
  function deleteEvents(doc, cells) {
    const byVoice = new Map();
    for (const cell of cells) {
      const key = `${cell.partId}|${cell.measureNumber}|${cell.voiceId}`;
      if (!byVoice.has(key)) byVoice.set(key, { ...cell, indices: [] });
      byVoice.get(key).indices.push(cell.eventIndex);
    }
    let next = doc;
    for (const group of byVoice.values()) {
      const { partId, measureNumber, voiceId } = group;
      const indices = [...new Set(group.indices)].sort((a, b) => b - a);
      const capacity = ticksPerMeasure(next, partId, measureNumber);
      next = updateVoice(next, partId, measureNumber, voiceId, (events) => {
        const working = sortEvents(events);
        for (const index of indices) {
          const event = working[index];
          if (!event) continue;
          working[index] = E.rest({
            duration: event.duration,
            voice: event.voice,
            staff: event.staff ?? 1,
            startTick: event.startTick ?? 0,
          });
        }
        return padVoiceToCapacity(sortEvents(working), voiceId, capacity, 1);
      });
    }
    return next;
  }

  /**
   * Applies a mark to one event. `patch` names the fields to merge, and
   * a `null` value removes the field -- which is how the palette toggles
   * a mark off without needing a second command per mark.
   */
  function patchEvent(doc, { partId, measureNumber, voiceId = 1, eventIndex, patch }) {
    return updateVoice(doc, partId, measureNumber, voiceId, (events) => {
      const sorted = sortEvents(events);
      const current = sorted[eventIndex];
      if (!current) return sorted;
      const apply = (target) => {
        const next = { ...target };
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === undefined) delete next[key];
          else next[key] = value;
        }
        return next;
      };
      // A chord's marks belong to each of its notes, so a palette action
      // on a chord marks every note in it -- which is what MuseScore does.
      sorted[eventIndex] = current.kind === 'chord'
        ? { ...current, notes: current.notes.map(apply) }
        : apply(current);
      return sorted;
    });
  }

  /** Replaces one dynamic at a tick, or inserts it, keeping directions sorted. */
  function setDynamic(doc, { partId, measureNumber, tick, level, placement = 'below' }) {
    const directions = doc.directions ?? [];
    const index = directions.findIndex(
      (direction) => direction.partId === partId && direction.measureNumber === measureNumber && direction.tick === tick,
    );
    if (level === null) {
      if (index < 0) return doc;
      return { ...doc, directions: directions.filter((_, i) => i !== index) };
    }
    const direction = {
      partId,
      measureNumber,
      tick,
      staff: 1,
      placement,
      dynamics: [level],
      wedges: [],
      pedals: [],
      words: [],
      rehearsals: [],
    };
    const next = index < 0
      ? [...directions, direction]
      : directions.map((current, i) => (i === index ? direction : current));
    return { ...doc, directions: next.sort((a, b) => a.measureNumber - b.measureNumber || a.tick - b.tick) };
  }

  const dynamicAt = (doc, partId, measureNumber, tick) =>
    (doc.directions ?? []).find(
      (direction) => direction.partId === partId && direction.measureNumber === measureNumber && direction.tick === tick,
    )?.dynamics?.[0] ?? null;

  function deleteEvent(doc, { partId, measureNumber, voiceId = 1, eventIndex }) {
    return updateVoice(doc, partId, measureNumber, voiceId, (events) =>
      sortEvents(events.filter((_, index) => index !== eventIndex)),
    );
  }

  function replaceEvent(doc, { partId, measureNumber, voiceId = 1, eventIndex, event }) {
    return updateVoice(doc, partId, measureNumber, voiceId, (events) =>
      sortEvents(events.map((current, index) => (index === eventIndex ? event : current))),
    );
  }

  /** Replaces a whole voice's events — used when entry rewrites one measure's line. */
  function setVoiceEvents(doc, { partId, measureNumber, voiceId = 1, events }) {
    return updateVoice(doc, partId, measureNumber, voiceId, () => sortEvents(events));
  }

  /** Applies clef/key/time across every measure — the toolbar's score-setup controls. */
  function setSetup(doc, { partId, clef, fifths, numerator, denominator }) {
    const patch = (attribute) => {
      const next = { ...attribute };
      if (clef) {
        next.clefSign = clef.sign;
        next.clefLine = clef.line;
        next.clefsByStaff = { ...attribute.clefsByStaff, 1: { sign: clef.sign, line: clef.line } };
      }
      if (typeof fifths === 'number') next.fifths = fifths;
      if (typeof numerator === 'number') next.timeNumerator = numerator;
      if (typeof denominator === 'number') next.timeDenominator = denominator;
      return next;
    };
    return {
      ...doc,
      attributes: doc.attributes.map((a) => (a.partId === partId ? patch(a) : a)),
      attributeChanges: doc.attributeChanges.map((a) => (a.partId === partId ? patch(a) : a)),
    };
  }

  /**
   * The side-tables keyed by measure number, each entry shifted so it keeps
   * pointing at the same music after a bar is inserted or removed.
   *
   * A measure number is a position, not an identity: every table that keys
   * on one -- attributes, tempo marks, dynamics, octave shifts, harmonies,
   * prints -- has to move with the bars, or a mark ends up over the wrong
   * bar the first time a bar is inserted before it.
   */
  const MEASURE_KEYED_TABLES = [
    'attributes',
    'attributeChanges',
    'tempoMarks',
    'directions',
    'octaveShifts',
    'harmonies',
    'prints',
  ];

  function shiftMeasureTables(doc, partId, fromMeasure, delta) {
    const shifted = { ...doc };
    for (const table of MEASURE_KEYED_TABLES) {
      const entries = doc[table];
      if (!Array.isArray(entries)) continue;
      shifted[table] = entries.map((entry) =>
        entry.partId === partId && entry.measureNumber >= fromMeasure
          ? { ...entry, measureNumber: entry.measureNumber + delta }
          : entry,
      );
    }
    return shifted;
  }

  /** An empty measure of the same meter as the one it is copied from. */
  function emptyMeasure(doc, partId, number, like) {
    const template = attributeFor(doc, partId, like) ?? doc.attributes[0];
    const filler = E.rest({
      duration: E.duration('whole', 0, measureTicks(template)),
      voice: 1,
      staff: 1,
      startTick: 0,
    });
    return E.measure(number, [E.voice(1, [filler])]);
  }

  /**
   * Inserts an empty measure after `measureNumber`, renumbering the bars
   * that follow it.
   *
   * Inserting in the middle is what a writer actually asks for -- the new
   * bar belongs where the cursor is, not at the end of the piece -- so the
   * bars after it move down one and keep their own music.
   */
  function insertMeasureAfter(doc, partId, measureNumber) {
    const part = partOf(doc, partId);
    if (part.measures.length === 0) return doc;
    const number = measureNumber + 1;
    const moved = shiftMeasureTables(doc, partId, number, 1);
    const withMeasure = updatePart(moved, partId, (current) => ({
      ...current,
      measures: [
        ...current.measures.map((measure) =>
          measure.number >= number ? { ...measure, number: measure.number + 1 } : measure,
        ),
        emptyMeasure(doc, partId, number, measureNumber),
      ].sort((a, b) => a.number - b.number),
    }));
    const template = attributeFor(doc, partId, measureNumber) ?? doc.attributes[0];
    const change = doc.attributeChanges.find(
      (a) => a.partId === partId && a.measureNumber === measureNumber,
    );
    return {
      ...withMeasure,
      attributes: [...withMeasure.attributes, { ...template, measureNumber: number }],
      // Only a bar that really carries a mid-bar change hands one on; a
      // clef change four bars earlier is not the new bar's business.
      attributeChanges:
        change === undefined
          ? withMeasure.attributeChanges
          : [...withMeasure.attributeChanges, { ...change, measureNumber: number }],
    };
  }

  /** Appends an empty measure to a part, carrying the current attributes forward. */
  function appendMeasure(doc, partId) {
    const part = partOf(doc, partId);
    const last = part.measures[part.measures.length - 1];
    if (!last) return doc;
    return insertMeasureAfter(doc, partId, last.number);
  }

  /** Removes the last measure of a part, keeping at least one. */
  function removeLastMeasure(doc, partId) {
    const part = partOf(doc, partId);
    if (part.measures.length <= 1) return doc;
    return removeMeasure(doc, partId, part.measures[part.measures.length - 1].number);
  }

  /**
   * Removes one measure, renumbering the bars after it. The last bar of a
   * part is never removed, so a score cannot be emptied out from under the
   * renderer.
   */
  function removeMeasure(doc, partId, measureNumber) {
    const part = partOf(doc, partId);
    if (part.measures.length <= 1) return doc;
    if (!part.measures.some((measure) => measure.number === measureNumber)) return doc;
    const dropped = MEASURE_KEYED_TABLES.reduce((next, table) => {
      const entries = next[table];
      if (!Array.isArray(entries)) return next;
      return {
        ...next,
        [table]: entries.filter(
          (entry) => !(entry.partId === partId && entry.measureNumber === measureNumber),
        ),
      };
    }, { ...doc });
    const moved = shiftMeasureTables(dropped, partId, measureNumber + 1, -1);
    return updatePart(moved, partId, (current) => ({
      ...current,
      measures: current.measures
        .filter((measure) => measure.number !== measureNumber)
        .map((measure) =>
          measure.number > measureNumber ? { ...measure, number: measure.number - 1 } : measure,
        ),
    }));
  }

  /**
   * The selection as a document of its own -- what a copy hands to another
   * program.
   *
   * The measures the selection touches are kept whole, with every event it
   * does not cover turned into a rest, so the excerpt keeps its rhythm and
   * its bar lines. `null` means nothing sounding was selected.
   */
  function excerpt(doc, cells) {
    const sounding = cells.filter((cell) => {
      const event = eventAt(doc, cell);
      return event !== undefined && event.kind !== 'rest';
    });
    if (sounding.length === 0) return null;
    const partId = sounding[0].partId;
    const numbers = [...new Set(sounding.map((cell) => cell.measureNumber))].sort((a, b) => a - b);
    const keep = new Set(
      sounding.map((cell) => `${cell.measureNumber}|${cell.voiceId}|${cell.eventIndex}`),
    );
    const part = partOf(doc, partId);
    const measures = part.measures
      .filter((measure) => numbers.includes(measure.number))
      .map((measure) => ({
        ...measure,
        voices: measure.voices.map((voice) => ({
          ...voice,
          events: voice.events.map((event, eventIndex) =>
            event.kind === 'rest' || keep.has(`${measure.number}|${voice.id}|${eventIndex}`)
              ? event
              : E.rest({
                  duration: event.duration,
                  voice: event.voice,
                  staff: event.staff ?? 1,
                  startTick: event.startTick ?? 0,
                }),
          ),
        })),
      }));
    const inRange = (entry) => entry.partId === partId && numbers.includes(entry.measureNumber);
    return {
      ...doc,
      score: { ...doc.score, parts: [{ ...part, measures }] },
      attributes: doc.attributes.filter(inRange),
      attributeChanges: doc.attributeChanges.filter(inRange),
      directions: doc.directions.filter(inRange),
    };
  }

  // ---- MusicXML serialization --------------------------------------------

  /**
   * The whole edited document as a portable MusicXML 4.0 file.
   *
   * The writer is the engine's own (`writeMusicXml`), not a copy kept here.
   * A drum note's identity is the `<instrument id>` it names, resolved
   * through its part's `<midi-instrument>` table -- the same rule the reader
   * and the renderer already follow. A host that restates that rule can get
   * it wrong, and the version that did wrote neither element, so a saved
   * drum score came back silent with every notehead on the middle line.
   */
  function toMusicXml(doc) {
    return E.writeMusicXml(doc);
  }

  // ---- pitch <-> staff position ------------------------------------------

  /** The inverse of the engine's `staffPositionForPitch`, on a clef definition. */
  function pitchFromStaffPosition(clef, staffPosition) {
    const steps = (clef.referenceY - staffPosition) / 0.5;
    const shifted = clef.referenceDiatonicIndex + steps;
    const index = shifted - 7 * (clef.octaveShift || 0);
    const octave = Math.floor(index / 7);
    const offset = ((index % 7) + 7) % 7;
    return { step: STEPS[offset], octave };
  }

  const clefDefinitionFor = (sign) => {
    if (sign === 'F') return E.BASS_CLEF;
    if (sign === 'C') return E.ALTO_CLEF;
    return E.TREBLE_CLEF;
  };

  const clefNameFromSign = (sign) => {
    if (sign === 'F') return 'bass';
    if (sign === 'C') return 'alto';
    return 'treble';
  };

  window.NotationDoc = {
    STEPS,
    CLEF_BY_SIGN,
    partOf,
    attributeFor,
    measureTicks,
    ticksPerMeasure,
    insertEvent,
    deleteEvent,
    deleteEvents,
    patchEvent,
    setDynamic,
    dynamicAt,
    replaceEvent,
    setVoiceEvents,
    setSetup,
    appendMeasure,
    insertMeasureAfter,
    removeLastMeasure,
    removeMeasure,
    padMeasure,
    withoutPlaceholderRest,
    sortEvents,
    pitchFromStaffPosition,
    clefDefinitionFor,
    clefNameFromSign,
    eventAt,
    excerpt,
    toMusicXml,
  };
})();
