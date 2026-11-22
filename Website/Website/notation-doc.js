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

  function insertEvent(doc, { partId, measureNumber, voiceId = 1, event, overwrite = false }) {
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
      //
      // `overwrite` is the exception, and it is what paste means: the
      // clipboard replaces whatever it lands on. A sounding note cannot be
      // carved like a rest (there is no such thing as the tail of a
      // notehead), so it is dropped whole and the gap becomes rests below.
      const kept = [];
      for (const current of base) {
        const currentStart = current.startTick ?? 0;
        const currentEnd = currentStart + current.duration.ticks;
        const overlaps = currentEnd > start && currentStart < end;
        if (!overlaps) {
          kept.push(current);
          continue;
        }
        if (current.kind !== 'rest') {
          if (!overwrite) kept.push(current);
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
      return fillVoice([...kept, event], voiceId, capacity, event.staff ?? 1);
    });
  }

  /**
   * Fills the gaps between events with rests and tops the bar up to its
   * meter, so a voice always spans its whole measure.
   *
   * Every command that changes the shape of a voice -- writing a note,
   * changing a duration, moving a note to another voice -- has to leave
   * the voice covering its bar, or the renderer draws a short measure and
   * the next click lands in the wrong bar.
   */
  function fillVoice(events, voiceId, capacity, staff) {
    const sorted = sortEvents(events);
    const filled = [];
    let cursor = 0;
    for (const current of sorted) {
      const currentStart = current.startTick ?? cursor;
      if (currentStart > cursor) {
        filled.push(...restsForSpan(currentStart - cursor, voiceId, current.staff ?? staff, cursor));
      }
      filled.push(current);
      cursor = currentStart + current.duration.ticks;
    }
    return padVoiceToCapacity(filled, voiceId, capacity, staff);
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
            events: padVoiceToCapacity(sortEvents(voice.events), voice.id, capacity, staffOfVoice(voice)),
          })),
        };
      }),
    }));
  }

  /**
   * The staff a voice is drawn on, taken from its own events.
   *
   * A grand staff holds one voice per staff, so padding every voice with
   * rests on staff 1 would drop the lower staff's rests onto the upper one
   * and leave the bass staff short of its meter.
   */
  function staffOfVoice(voice) {
    const staff = voice.events.find((event) => event.staff !== undefined)?.staff;
    return staff ?? 1;
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
        return padVoiceToCapacity(sortEvents(working), voiceId, capacity, staffOfVoice({ events: working }));
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
      const merge = (target, fields) => {
        const next = { ...target };
        for (const [key, value] of Object.entries(fields)) {
          if (value === null || value === undefined) delete next[key];
          else next[key] = value;
        }
        return next;
      };
      const apply = (target) => merge(target, patch);
      // A chord's marks belong to each of its notes, so a palette action
      // on a chord marks every note in it -- which is what MuseScore does.
      // `notes` is the one field that replaces the chord's members instead
      // of being merged into each of them: a caller that has already built
      // the new member list must not have it nested inside every note.
      if (current.kind !== 'chord') {
        sorted[eventIndex] = apply(current);
        return sorted;
      }
      const { notes, ...fields } = patch;
      sorted[eventIndex] = notes === undefined || notes === null
        ? { ...current, notes: current.notes.map((note) => merge(note, fields)) }
        : { ...merge(current, fields), notes };
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

  // ---- palette edits -----------------------------------------------------
  //
  // The palette writes three different kinds of thing: a bar's attributes
  // (clef, key, meter, barline), a mark at a tick (tempo, dynamic, text,
  // pedal, hairpin), and a print flag (a page or system break). Each has
  // its own table in the document, so each gets its own command here.

  /** The attribute fields a mid-score change carries. */
  const ATTRIBUTE_CHANGE_FIELDS = [
    'divisions',
    'fifths',
    'mode',
    'timeNumerator',
    'timeDenominator',
    'timeNumeratorDisplay',
    'clefSign',
    'clefLine',
    'staves',
    'clefsByStaff',
    'transpose',
    'staffLinesByStaff',
  ];

  /** One bar's attributes as the renderer's own change timeline states them. */
  function attributeChangeFor(attribute) {
    const change = {
      partId: attribute.partId,
      measureNumber: attribute.measureNumber,
      tick: 0,
    };
    for (const field of ATTRIBUTE_CHANGE_FIELDS) {
      if (attribute[field] !== undefined) change[field] = attribute[field];
    }
    return change;
  }

  /** Drops the fields a patch sets to null, so a mark can be taken away. */
  function mergeFields(target, fields) {
    const next = { ...target };
    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined) delete next[key];
      else next[key] = value;
    }
    return next;
  }

  /**
   * Changes clef, key or meter from one bar onward.
   *
   * A bar's attributes are the part's whole state materialised per bar by
   * the parser, so "from here on" is a patch of every row at or after this
   * one. The renderer draws clefs and key signatures from `attributeChanges`
   * for every bar past the first, so the same patch is written into that
   * timeline too -- patching `attributes` alone redraws nothing.
   */
  function setAttributesFrom(doc, { partId, measureNumber, patch }) {
    const from = Math.max(1, measureNumber);
    const touched = (entry) => entry.partId === partId && entry.measureNumber >= from;
    const attributes = doc.attributes.map((attribute) =>
      touched(attribute) ? mergeFields(attribute, patch) : attribute,
    );
    const kept = (doc.attributeChanges ?? []).filter(
      (change) => !(touched(change) && change.tick === 0),
    );
    const added = attributes.filter(touched).map(attributeChangeFor);
    const next = {
      ...doc,
      attributes,
      attributeChanges: [...kept, ...added].sort(
        (a, b) => a.measureNumber - b.measureNumber || a.tick - b.tick,
      ),
    };
    // A meter change changes how much a bar holds, so every bar after it
    // has to be refilled to its own new width or it renders short.
    return patch.timeNumerator === undefined && patch.timeDenominator === undefined
      ? next
      : padMeasure(next, partId);
  }

  /**
   * Patches one bar's own barline fields -- its ending edge's style, repeat
   * and volta, or its starting edge's.
   *
   * Barlines live only on `attributes` (the change timeline has no barline
   * fields), so this touches that one row and nothing else.
   */
  function setBarline(doc, { partId, measureNumber, patch }) {
    return {
      ...doc,
      attributes: doc.attributes.map((attribute) =>
        attribute.partId === partId && attribute.measureNumber === measureNumber
          ? mergeFields(attribute, patch)
          : attribute,
      ),
    };
  }

  /** Replaces the tempo mark at a tick, or removes it when `perMinute` is null. */
  function setTempo(doc, { partId, measureNumber, tick = 0, perMinute, beatUnit = 'quarter', beatUnitDots = 0 }) {
    const marks = (doc.tempoMarks ?? []).filter(
      (mark) =>
        !(
          mark.partId === partId &&
          mark.measureNumber === measureNumber &&
          (mark.visualTick ?? mark.tick) === tick
        ),
    );
    if (perMinute === null) return { ...doc, tempoMarks: marks };
    const mark = { partId, measureNumber, tick, beatUnit, beatUnitDots, perMinute };
    return {
      ...doc,
      tempoMarks: [...marks, mark].sort(
        (a, b) => a.measureNumber - b.measureNumber || a.tick - b.tick,
      ),
    };
  }

  /**
   * Merges fields into the direction at one tick, creating it if the bar has
   * none there, and drops it again once nothing is left to draw.
   *
   * Dynamics, words, rehearsal marks, pedals and hairpins all belong to a
   * POSITION rather than to a note, which is why they share one table and
   * one command: two marks on the same beat must stay one `<direction>`.
   */
  function setDirection(doc, { partId, measureNumber, tick = 0, placement = 'below', merge }) {
    const directions = doc.directions ?? [];
    const index = directions.findIndex(
      (direction) =>
        direction.partId === partId &&
        direction.measureNumber === measureNumber &&
        direction.tick === tick,
    );
    const base = index < 0
      ? {
        partId,
        measureNumber,
        tick,
        staff: 1,
        placement,
        dynamics: [],
        wedges: [],
        pedals: [],
        words: [],
        rehearsals: [],
      }
      : directions[index];
    const next = merge({ ...base });
    const others = index < 0 ? directions : directions.filter((_, i) => i !== index);
    const empty = ['dynamics', 'wedges', 'pedals', 'words', 'rehearsals'].every(
      (field) => (next[field] ?? []).length === 0,
    );
    return {
      ...doc,
      directions: (empty ? others : [...others, next]).sort(
        (a, b) => a.measureNumber - b.measureNumber || a.tick - b.tick,
      ),
    };
  }

  /** Sets or clears one bar's page/system break. */
  function setPrint(doc, { partId, measureNumber, newSystem = false, newPage = false }) {
    const prints = (doc.prints ?? []).filter(
      (print) => !(print.partId === partId && print.measureNumber === measureNumber),
    );
    if (!newSystem && !newPage) return { ...doc, prints };
    return {
      ...doc,
      prints: [...prints, { partId, measureNumber, newSystem, newPage }].sort(
        (a, b) => a.measureNumber - b.measureNumber,
      ),
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

  // ---- properties and instrument edits -----------------------------------

  /**
   * Replaces one event's duration, keeping the bar full.
   *
   * A duration change moves every note after it, so the voice is refilled
   * rather than patched: the new length may leave a hole where the old
   * one ended, and only `fillVoice` turns that hole into legal rests. An
   * event that would now run past its own barline is clamped to what the
   * bar has left, which is what MuseScore does instead of spilling into
   * the next bar.
   */
  function setEventDuration(doc, cell, duration) {
    const capacity = ticksPerMeasure(doc, cell.partId, cell.measureNumber);
    return updateVoice(doc, cell.partId, cell.measureNumber, cell.voiceId, (events) => {
      const sorted = sortEvents(events);
      const current = sorted[cell.eventIndex];
      if (!current) return sorted;
      const start = current.startTick ?? 0;
      const room = capacity - start;
      const ticks = Math.min(duration.ticks, room);
      const fitted =
        ticks === duration.ticks
          ? duration
          : E.duration(
              E.durationTypeAndDotsFromTicks(ticks, 3)?.type ?? duration.type,
              E.durationTypeAndDotsFromTicks(ticks, 3)?.dots ?? 0,
              ticks,
            );
      // Everything the old event covered is cleared, so a longer value eats
      // the rests after it and a shorter one leaves rests behind.
      const kept = sorted.filter((_, index) => index !== cell.eventIndex);
      const next = [...kept, { ...current, duration: fitted }];
      return fillVoice(next, cell.voiceId, capacity, current.staff ?? 1);
    });
  }

  /**
   * Moves one event into another voice as `event`.
   *
   * The same beat, written differently: another voice, or the part's other
   * staff (which needs the note re-spelled -- a tab note carries a string
   * and a fret, a notation note carries only its pitch). The beat it
   * leaves becomes a rest, so the bar keeps its meter.
   */
  function moveEvent(doc, cell, { voiceId, event }) {
    const source = eventAt(doc, cell);
    if (source === undefined) return doc;
    const capacity = ticksPerMeasure(doc, cell.partId, cell.measureNumber);
    const without = updateVoice(doc, cell.partId, cell.measureNumber, cell.voiceId, (events) =>
      fillVoice(
        sortEvents(events).filter((_, index) => index !== cell.eventIndex),
        cell.voiceId,
        capacity,
        source.staff ?? 1,
      ),
    );
    return updateVoice(without, cell.partId, cell.measureNumber, voiceId, (events) => {
      const kept = events.filter(
        (current) =>
          (current.startTick ?? 0) !== (event.startTick ?? 0) || current.kind === 'rest',
      );
      return fillVoice([...kept, event], voiceId, capacity, event.staff ?? 1);
    });
  }

  /**
   * Moves one event into another voice of the same bar.
   *
   * Voices are drawn on their own stems, so this is how a writer splits a
   * chord into two parts. The event keeps its tick, staff and pitches; the
   * source voice is refilled with rests where it used to be.
   */
  function setEventVoice(doc, cell, voiceId) {
    if (voiceId === cell.voiceId) return doc;
    const event = eventAt(doc, cell);
    if (event === undefined) return doc;
    return moveEvent(doc, cell, { voiceId, event: { ...event, voice: voiceId } });
  }

  /**
   * Writes new pitches onto the selected event's notes.
   *
   * `pitches` runs parallel to the event's own note list, so a chord is
   * re-pitched member by member and a single note is the one-element case.
   * A tab note also carries the string and fret it was written on, and
   * those describe the OLD pitch -- leaving them behind would draw the new
   * pitch on the old string. They are dropped here and re-derived by the
   * caller, which is the only place that knows the instrument's tuning.
   */
  function setNotesPitch(doc, cell, pitches) {
    return updateVoice(doc, cell.partId, cell.measureNumber, cell.voiceId, (events) => {
      const sorted = sortEvents(events);
      const current = sorted[cell.eventIndex];
      if (!current || current.kind === 'rest') return sorted;
      const repitch = (note, index) => {
        const pitch = pitches[index];
        if (pitch === undefined) return note;
        const { stringNumber, fret, ...rest } = note;
        return { ...rest, pitch: { ...note.pitch, ...pitch } };
      };
      sorted[cell.eventIndex] =
        current.kind === 'chord'
          ? { ...current, notes: current.notes.map(repitch) }
          : repitch(current, 0);
      return sorted;
    });
  }

  // ---- parts -------------------------------------------------------------

  /** Renames a part; the part list and the mixer both read this. */
  function renamePart(doc, partId, name) {
    return updatePart(doc, partId, (part) => ({ ...part, name }));
  }

  /**
   * Adds a part after the existing ones.
   *
   * A new part needs everything the parser would have produced for it: a
   * measure list, one attributes row per bar, the same rows in the change
   * timeline the renderer draws clefs from, and its `<midi-instrument>`
   * routing so playback can reach it. The caller states the part's own
   * layout (staves, clefs, tab lines, transpose) because that belongs to
   * the instrument, while key and meter are the score's and are copied
   * from bar 1.
   */
  function addPart(doc, { partId, name, layout = {}, routing = new Map() }) {
    if (doc.score.parts.some((part) => part.id === partId)) return doc;
    const template = doc.attributes.find((attribute) => attribute.measureNumber === 1);
    if (template === undefined) return doc;
    const count = Math.max(...doc.score.parts.map((part) => part.measures.length), 1);
    const attributes = [];
    const measures = [];
    for (let number = 1; number <= count; number += 1) {
      const existing = doc.attributes.find(
        (attribute) => attribute.partId === template.partId && attribute.measureNumber === number,
      );
      const attribute = {
        ...(existing ?? template),
        ...layout,
        partId,
        measureNumber: number,
      };
      attributes.push(attribute);
      const staves = Math.max(1, attribute.staves ?? 1);
      const voices = [];
      for (let staff = 1; staff <= staves; staff += 1) {
        voices.push(
          E.voice(staff, [
            E.rest({
              duration: E.duration('whole', 0, measureTicks(attribute)),
              voice: staff,
              staff,
              startTick: 0,
            }),
          ]),
        );
      }
      measures.push(E.measure(number, voices));
    }
    const gmNotes = new Map();
    for (const [instrumentId, info] of routing) {
      if (info.gmNote !== undefined) gmNotes.set(instrumentId, info.gmNote);
    }
    return {
      ...doc,
      score: {
        ...doc.score,
        parts: [...doc.score.parts, E.part(partId, measures, name)],
      },
      attributes: [...doc.attributes, ...attributes],
      attributeChanges: [...(doc.attributeChanges ?? []), ...attributes.map(attributeChangeFor)],
      midiInstrumentInfoByPart: new Map([
        ...(doc.midiInstrumentInfoByPart ?? new Map()),
        [partId, routing],
      ]),
      midiInstrumentsByPart: new Map([
        ...(doc.midiInstrumentsByPart ?? new Map()),
        [partId, gmNotes],
      ]),
    };
  }

  /**
   * Removes a part and everything keyed to it.
   *
   * The last part is never removed: a score with no parts has nothing for
   * the renderer to draw and nothing for the editor to write into. Every
   * side table keyed by part id goes with it, or a later part that happens
   * to reuse the id would inherit the old one's clefs and routing.
   */
  function removePart(doc, partId) {
    if (doc.score.parts.length <= 1) return doc;
    if (!doc.score.parts.some((part) => part.id === partId)) return doc;
    const withoutPart = (entries) =>
      Array.isArray(entries) ? entries.filter((entry) => entry.partId !== partId) : entries;
    const drop = (map) => {
      if (!(map instanceof Map) || !map.has(partId)) return map;
      const next = new Map(map);
      next.delete(partId);
      return next;
    };
    return {
      ...doc,
      score: {
        ...doc.score,
        parts: doc.score.parts.filter((part) => part.id !== partId),
      },
      attributes: withoutPart(doc.attributes),
      attributeChanges: withoutPart(doc.attributeChanges ?? []),
      tempoMarks: withoutPart(doc.tempoMarks ?? []),
      directions: withoutPart(doc.directions ?? []),
      octaveShifts: withoutPart(doc.octaveShifts ?? []),
      harmonies: withoutPart(doc.harmonies ?? []),
      prints: withoutPart(doc.prints ?? []),
      midiInstrumentInfoByPart: drop(doc.midiInstrumentInfoByPart),
      midiInstrumentsByPart: drop(doc.midiInstrumentsByPart),
    };
  }

  /** Points a part at another GM program, keeping its `<midi-instrument>` id. */
  function setPartProgram(doc, partId, program) {
    const routing = doc.midiInstrumentInfoByPart?.get(partId);
    if (!routing || routing.size === 0) return doc;
    const next = new Map();
    for (const [instrumentId, info] of routing) {
      next.set(instrumentId, { ...info, program });
    }
    return {
      ...doc,
      midiInstrumentInfoByPart: new Map([
        ...(doc.midiInstrumentInfoByPart ?? new Map()),
        [partId, next],
      ]),
    };
  }

  /** The `<instrument id>` a part's routing names first, or undefined. */
  const instrumentIdOf = (doc, partId) =>
    [...(doc.midiInstrumentInfoByPart?.get(partId)?.keys() ?? [])][0];

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
    // Every measure-keyed side table is cut down the same way, not just
    // the three that happen to matter today: an excerpt carrying a tempo
    // mark or a dynamic from a bar it does not include would paste that
    // marking somewhere it was never written.
    const trimmed = { ...doc };
    for (const table of MEASURE_KEYED_TABLES) {
      const entries = doc[table];
      if (Array.isArray(entries)) trimmed[table] = entries.filter(inRange);
    }
    return {
      ...trimmed,
      score: { ...doc.score, parts: [{ ...part, measures }] },
    };
  }

  // ---- pasting -----------------------------------------------------------

  /**
   * Writes a parsed excerpt into this document at `cell`, keeping its
   * rhythm and its bar structure.
   *
   * A copy is a whole little document (see `excerpt`), so pasting is a
   * parse plus a walk: every part's notes are re-inserted at the target
   * beat, and a selection that runs past the end of its first bar carries
   * on into the bars after it. Bars that do not exist yet are appended,
   * because a paste of a whole phrase into a one-bar score has nowhere
   * else to go.
   *
   * `cell` is the entry cursor: `{ partId, measureNumber, voiceId, tick }`.
   */
  function paste(doc, parsed, cell) {
    const source = parsed.score.parts[0];
    if (!source) return doc;
    const voiceId = cell.voiceId ?? 1;
    // The excerpt's own timeline, in its own ticks: each note's distance
    // from the excerpt's first bar. Reading it flat is what lets a phrase
    // cross a barline -- the source's bar structure is not the target's.
    const placed = [];
    let excerptOffset = 0;
    for (const measure of source.measures) {
      for (const voice of measure.voices) {
        for (const event of sortEvents(voice.events)) {
          if (event.kind === 'rest') continue;
          placed.push({ at: excerptOffset + (event.startTick ?? 0), event });
        }
      }
      excerptOffset += measureTicks(attributeFor(parsed, source.id, measure.number));
    }
    placed.sort((a, b) => a.at - b.at);

    let next = doc;
    for (const { at, event } of placed) {
      // `at` is measured from the paste point, so every note is placed
      // independently -- one note crossing a barline must not shift the
      // ones after it.
      let number = cell.measureNumber;
      let tick = (cell.tick ?? 0) + at;
      for (;;) {
        const capacity = ticksPerMeasure(next, cell.partId, number);
        if (tick < capacity) break;
        tick -= capacity;
        number += 1;
        next = ensureMeasure(next, cell.partId, number);
      }
      const fitted = fitToBar(event, tick, ticksPerMeasure(next, cell.partId, number));
      // Nothing fits in what is left of the bar -- the paste point sits
      // closer to the barline than the shortest note can express. Skipping
      // one note beats writing a duration the engine cannot name.
      if (fitted === null) continue;
      // Paste REPLACES what it lands on: without `overwrite` the pasted
      // note stacks on the one already sounding there and the bar runs
      // past its own meter.
      next = insertEvent(next, {
        partId: cell.partId,
        measureNumber: number,
        voiceId,
        event: { ...fitted, voice: voiceId, startTick: tick },
        overwrite: true,
      });
    }
    return next;
  }

  /**
   * Shortens a pasted note so it ends at the barline.
   *
   * A bar holds its meter and nothing more, so a whole note dropped on
   * the last beat has to become a quarter. Letting it run over makes the
   * bar longer than its own time signature, which every later measure's
   * position is measured from.
   *
   * `null` means the room left is smaller than the shortest note the
   * engine can write -- there is nothing to shorten the note TO, so the
   * caller drops it rather than inventing a duration.
   */
  function fitToBar(event, startTick, capacity) {
    const room = capacity - startTick;
    if (room <= 0) return null;
    if (event.duration.ticks <= room) return event;
    const fitted = largestNotatableAtMost(room);
    if (fitted === null) return null;
    return {
      ...event,
      duration: E.duration(fitted.type, fitted.dots, fitted.ticks),
    };
  }

  /**
   * The longest written value that fits in `ticks`, or `null` when even a
   * 32nd is too long.
   *
   * `durationTypeAndDotsFromTicks` only answers for an exact match, and the
   * room left before a barline is whatever the meter leaves -- 100 ticks,
   * or 1820 -- so an exact-match-only lookup finds nothing and a paste
   * near the end of a bar has no legal note to fall back on.
   */
  function largestNotatableAtMost(ticks) {
    let best = null;
    for (const type of ['whole', 'half', 'quarter', 'eighth', '16th', '32nd']) {
      for (let dots = 0; dots <= 3; dots += 1) {
        const span = E.ticksForDisplayedDuration({ type, dots });
        if (span <= ticks && (best === null || span > best.ticks)) best = { type, dots, ticks: span };
      }
    }
    return best;
  }

  /** Appends bars until `measureNumber` exists in this part. */
  function ensureMeasure(doc, partId, measureNumber) {
    let next = doc;
    while (!partOf(next, partId).measures.some((measure) => measure.number === measureNumber)) {
      const grown = appendMeasure(next, partId);
      if (grown === next) break;
      next = grown;
    }
    return next;
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
    setEventDuration,
    setEventVoice,
    moveEvent,
    setNotesPitch,
    renamePart,
    addPart,
    removePart,
    setPartProgram,
    instrumentIdOf,
    setSetup,
    setAttributesFrom,
    setBarline,
    setTempo,
    setDirection,
    setPrint,
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
    paste,
    toMusicXml,
  };
})();
