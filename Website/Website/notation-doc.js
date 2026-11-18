/**
 * Notation Lab — score document, edit commands, and MusicXML serialization.
 *
 * The rendered SVG is never the source of truth. Every edit rebuilds this
 * structured document (the engine's own `ParseResult` shape) and the engine
 * re-renders from it, the same way MuseScore edits a semantic score rather
 * than the pixels it drew.
 *
 * The engine has no MusicXML writer, so `toMusicXml` here is the only path
 * that turns an edited document back into a portable file.
 */
(() => {
  const E = window.NotationEngine;
  const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const DIVISION_CANDIDATES = [4, 8, 16, 32, 64, 128, 256, 512];
  const FALLBACK_DIVISIONS = 4;

  const escapeXml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const ACCIDENTAL_NAME = {
    '-2': 'flat-flat',
    '-1': 'flat',
    0: 'natural',
    1: 'sharp',
    2: 'double-sharp',
  };

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

  /** A `<divisions>` value that keeps every duration and measure length a whole number. */
  function divisionsFor(doc) {
    const values = [];
    for (const part of doc.score.parts) {
      for (const measure of part.measures) {
        values.push(measureTicks(attributeFor(doc, part.id, measure.number)));
        for (const voice of measure.voices) {
          for (const event of voice.events) values.push(event.duration.ticks);
        }
      }
    }
    for (const divisions of DIVISION_CANDIDATES) {
      if (values.every((ticks) => Number.isInteger((ticks * divisions) / E.TICKS_PER_QUARTER))) {
        return divisions;
      }
    }
    return FALLBACK_DIVISIONS;
  }

  const toDivisions = (ticks, divisions) =>
    Math.round((ticks * divisions) / E.TICKS_PER_QUARTER);

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

  function insertEvent(doc, { partId, measureNumber, voiceId = 1, event }) {
    const capacity = ticksPerMeasure(doc, partId, measureNumber);
    return updateVoice(doc, partId, measureNumber, voiceId, (events) =>
      sortEvents([...withoutPlaceholderRest(events, capacity), event]),
    );
  }

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

  /** Appends an empty measure to a part, carrying the current attributes forward. */
  function appendMeasure(doc, partId) {
    const part = partOf(doc, partId);
    const last = part.measures[part.measures.length - 1];
    if (!last) return doc;
    const number = last.number + 1;
    const template = attributeFor(doc, partId, last.number) ?? doc.attributes[0];
    const capacity = measureTicks(template);
    const filler = E.rest({
      duration: E.duration('whole', 0, capacity),
      voice: 1,
      staff: 1,
      startTick: 0,
    });
    const withMeasure = updatePart(doc, partId, (current) => ({
      ...current,
      measures: [...current.measures, E.measure(number, [E.voice(1, [filler])])],
    }));
    return {
      ...withMeasure,
      attributes: [...withMeasure.attributes, { ...template, measureNumber: number }],
      attributeChanges: [
        ...withMeasure.attributeChanges,
        { ...(doc.attributeChanges.find((a) => a.partId === partId) ?? template), measureNumber: number },
      ],
    };
  }

  /** Removes the last measure of a part, keeping at least one. */
  function removeLastMeasure(doc, partId) {
    const part = partOf(doc, partId);
    if (part.measures.length <= 1) return doc;
    const number = part.measures[part.measures.length - 1].number;
    const trimmed = updatePart(doc, partId, (current) => ({
      ...current,
      measures: current.measures.slice(0, -1),
    }));
    return {
      ...trimmed,
      attributes: trimmed.attributes.filter(
        (a) => !(a.partId === partId && a.measureNumber === number),
      ),
      attributeChanges: trimmed.attributeChanges.filter(
        (a) => !(a.partId === partId && a.measureNumber === number),
      ),
    };
  }

  // ---- MusicXML serialization --------------------------------------------

  function pitchXml(note) {
    const pitch = note.pitch;
    if (!pitch) return '';
    if (pitch.kind === 'unpitched') {
      return `<unpitched><display-step>${pitch.displayStep}</display-step><display-octave>${pitch.displayOctave}</display-octave></unpitched>`;
    }
    const alter = pitch.alter || 0;
    return `<pitch><step>${pitch.step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${pitch.octave}</octave></pitch>`;
  }

  function accidentalXml(note) {
    const pitch = note.pitch;
    if (!pitch || pitch.kind !== 'pitched') return '';
    const alter = pitch.alter || 0;
    if (!alter) return '';
    const name = ACCIDENTAL_NAME[alter];
    return name ? `<accidental>${name}</accidental>` : '';
  }

  function noteCommon(event, divisions) {
    const dots = '<dot/>'.repeat(event.duration.dots || 0);
    return `<duration>${toDivisions(event.duration.ticks, divisions)}</duration><voice>${event.voice}</voice><type>${event.duration.type}</type>${dots}`;
  }

  function eventXml(event, divisions) {
    const staff = event.staff ?? 1;
    const common = noteCommon(event, divisions);
    if (event.kind === 'rest') {
      return `<note><rest/>${common}<staff>${staff}</staff></note>`;
    }
    if (event.kind === 'chord') {
      return event.notes
        .map((note, index) => {
          const chordTag = index > 0 ? '<chord/>' : '';
          return `<note>${chordTag}${pitchXml(note)}${common}${accidentalXml(note)}<staff>${staff}</staff></note>`;
        })
        .join('');
    }
    return `<note>${pitchXml(event)}${common}${accidentalXml(event)}<staff>${staff}</staff></note>`;
  }

  function attributesXml(attribute, divisions, previous) {
    if (!attribute) return '';
    const same =
      previous &&
      previous.divisions === divisions &&
      previous.fifths === attribute.fifths &&
      previous.timeNumerator === attribute.timeNumerator &&
      previous.timeDenominator === attribute.timeDenominator &&
      previous.clefSign === attribute.clefSign &&
      previous.clefLine === attribute.clefLine;
    if (same) return '';
    const clef = attribute.clefsByStaff?.[1] ?? {
      sign: attribute.clefSign,
      line: attribute.clefLine,
    };
    const staves = attribute.staves && attribute.staves > 1 ? `<staves>${attribute.staves}</staves>` : '';
    return (
      '<attributes>' +
      `<divisions>${divisions}</divisions>` +
      `<key><fifths>${attribute.fifths ?? 0}</fifths></key>` +
      `<time><beats>${attribute.timeNumerator}</beats><beat-type>${attribute.timeDenominator}</beat-type></time>` +
      `<clef><sign>${clef.sign}</sign>${clef.line !== undefined ? `<line>${clef.line}</line>` : ''}</clef>` +
      staves +
      '</attributes>'
    );
  }

  function measureXml(doc, partId, measure, divisions, previousAttribute) {
    const attribute = attributeFor(doc, partId, measure.number);
    const head = attributesXml(attribute, divisions, previousAttribute);
    const body = [];
    measure.voices.forEach((voice, voiceIndex) => {
      let cursor = 0;
      for (const event of sortEvents(voice.events)) {
        const start = event.startTick ?? cursor;
        if (start > cursor) {
          body.push(`<forward><duration>${toDivisions(start - cursor, divisions)}</duration></forward>`);
        } else if (start < cursor) {
          body.push(`<backup><duration>${toDivisions(cursor - start, divisions)}</duration></backup>`);
        }
        body.push(eventXml(event, divisions));
        cursor = start + event.duration.ticks;
      }
      if (voiceIndex < measure.voices.length - 1 && cursor > 0) {
        body.push(`<backup><duration>${toDivisions(cursor, divisions)}</duration></backup>`);
      }
    });
    return `<measure number="${measure.number}">${head}${body.join('')}</measure>`;
  }

  /** The whole edited document as a portable MusicXML 4.0 file. */
  function toMusicXml(doc) {
    const divisions = divisionsFor(doc);
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
      '<score-partwise version="4.0">',
      `<work><work-title>${escapeXml(doc.score.title || 'Untitled score')}</work-title></work>`,
    ];
    const composer = doc.score.composer;
    if (composer) {
      lines.push(
        `<identification><creator type="composer">${escapeXml(composer)}</creator></identification>`,
      );
    }
    lines.push('<part-list>');
    for (const part of doc.score.parts) {
      lines.push(
        `<score-part id="${escapeXml(part.id)}"><part-name>${escapeXml(part.name || 'Music')}</part-name></score-part>`,
      );
    }
    lines.push('</part-list>');
    for (const part of doc.score.parts) {
      lines.push(`<part id="${escapeXml(part.id)}">`);
      let previousAttribute;
      for (const measure of part.measures) {
        lines.push(measureXml(doc, part.id, measure, divisions, previousAttribute));
        previousAttribute = { ...attributeFor(doc, part.id, measure.number), divisions };
      }
      lines.push('</part>');
    }
    lines.push('</score-partwise>');
    return lines.join('\n');
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
    divisionsFor,
    insertEvent,
    deleteEvent,
    replaceEvent,
    setVoiceEvents,
    setSetup,
    appendMeasure,
    removeLastMeasure,
    withoutPlaceholderRest,
    sortEvents,
    pitchFromStaffPosition,
    clefDefinitionFor,
    clefNameFromSign,
    toMusicXml,
  };
})();
