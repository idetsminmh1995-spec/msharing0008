(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  if (selectedTool !== 'piano') return;

  const engine = window.VideoEngine;
  const piano = window.PianoHandEngine;
  const controls = document.querySelector('[data-piano-controls]');
  const aspectSelect = document.querySelector('[data-piano-aspect]');
  const musicXmlInput = document.querySelector('[data-piano-musicxml-input]');
  const musicXmlName = document.querySelector('[data-piano-musicxml-name]');
  const summaryLabel = document.querySelector('[data-piano-summary]');
  const recordButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const FPS = 30;
  const DIMENSIONS = {
    '16x9': { width: 1280, height: 720 },
    '9x16': { width: 720, height: 1280 },
    '1x1': { width: 720, height: 720 },
  };
  // The parts this page draws, in the order the Piano layout stacks them.
  const PARTS = ['title', 'notation', 'instrument'];
  // White keys a frame shows at once. A whole 88-key keyboard in a
  // 720-pixel-wide frame is 8 pixels a key: no player reads that. A short
  // passage is shown on this many keys rather than on a handful of giant
  // ones, so the keyboard still looks like a keyboard.
  const VISIBLE_WHITES = 29;
  const MIN_VISIBLE_WHITES = 21;

  let isRendering = false;
  let cancelRequested = false;
  let videoUrl = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  if (controls) controls.hidden = false;
  document.querySelector('[data-studio-settings]')?.setAttribute('hidden', '');
  document.querySelector('.drum-pad-grid')?.setAttribute('hidden', '');
  document.querySelector('.tempo-row')?.setAttribute('hidden', '');
  const title = document.querySelector('[data-studio-title]');
  if (title) title.textContent = 'Piano Studio';
  const pageTitle = document.querySelector('title');
  if (pageTitle) pageTitle.textContent = 'Piano Studio — M Sharing';

  if (!engine || !piano || !controls || !aspectSelect || !recordButton ||
      !status || !video || !download) {
    if (recordButton) recordButton.disabled = true;
    setStatus('Piano Hand Human Engine or Video Engine is not available on this page.');
    return;
  }

  const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function readSettings() {
    const aspect = aspectSelect.value;
    if (!DIMENSIONS[aspect]) throw new RangeError('Choose a supported video orientation.');
    const size = DIMENSIONS[aspect];
    return {
      aspect,
      ...size,
      instrument: 'piano',
      size,
      // The page has no Notation View control, so the sheet is the
      // landscape page the other video pages default to.
      notation: 'landscape',
      color: 'black',
    };
  }

  /**
   * The keys the score presses, in the score's own time.
   *
   * A tie is one sound written twice, so its two halves are joined: left
   * apart, the second half would re-strike a key that never came up.
   */
  function readKeys(parsed, api, score) {
    const keys = [];
    for (const part of parsed.score.parts) {
      for (const measure of part.measures) {
        const offset = score.offsets.get(measure.number) ?? 0;
        for (const voice of measure.voices) {
          let cursor = 0;
          for (const event of voice.events) {
            const startTick = event.startTick ?? cursor;
            cursor = startTick + event.duration.ticks;
            const written = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
            for (const note of written) {
              if (note.pitch?.kind !== 'pitched') continue;
              const midi = (note.pitch.octave + 1) * 12 + (SEMITONES[note.pitch.step] ?? 0) + (note.pitch.alter ?? 0);
              if (!Number.isInteger(midi) || midi < 0 || midi > 127) continue;
              keys.push({
                midi,
                startMs: api.tickToSeconds(score.tempoMap, offset + startTick) * 1000,
                endMs: api.tickToSeconds(score.tempoMap, offset + startTick + event.duration.ticks) * 1000,
                tieStart: note.tieStart === true,
                tieStop: note.tieStop === true,
              });
            }
          }
        }
      }
    }
    keys.sort((left, right) => left.startMs - right.startMs || left.midi - right.midi);

    const held = new Map();
    const merged = [];
    for (const key of keys) {
      if (key.tieStop) {
        const open = held.get(key.midi);
        if (open) {
          open.endMs = Math.max(open.endMs, key.endMs);
          if (!key.tieStart) held.delete(key.midi);
          continue;
        }
      }
      merged.push(key);
      if (key.tieStart) held.set(key.midi, key);
    }
    return { keys: merged, endSeconds: score.endSeconds };
  }

  /**
   * The Instrument part: the keyboard the score is played on, windowed
   * onto the keys it uses. A key is down for as long as a note says it
   * is, and the dip is the engine's own press curve rather than a
   * colour that snaps on.
   */
  function drawKeyboard(ctx, rect, at, view, palette) {
    const { keys, firstWhite, whiteCount } = view;
    const atMs = at * 1000;
    const whiteWidth = rect.width / whiteCount;
    // A key is 23.5mm wide and 150mm deep, and that ratio is what makes a
    // keyboard read as a keyboard. The band is not that shape, so the keys
    // take the height their own width asks for and sit in the middle of
    // whatever room is left rather than being stretched to fill it.
    const keyboardHeight = Math.min(rect.height, whiteWidth * (piano.WHITE_KEY_DEPTH_MM / piano.WHITE_KEY_WIDTH_MM));
    const top = rect.y + (rect.height - keyboardHeight) / 2;
    const blackWidth = whiteWidth * (piano.BLACK_KEY_WIDTH_MM / piano.WHITE_KEY_WIDTH_MM);
    const blackHeight = keyboardHeight * (piano.BLACK_KEY_DEPTH_MM / piano.WHITE_KEY_DEPTH_MM);

    ctx.fillStyle = palette.background;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.save();
    ctx.translate(rect.x, top);
    ctx.beginPath();
    ctx.rect(0, 0, rect.width, keyboardHeight);
    ctx.clip();

    const sounding = new Map();
    for (const key of keys) {
      if (atMs < key.startMs - 1 || atMs > key.endMs + 80) continue;
      const depth = piano.keyPressDepthMm(atMs, { timeMs: key.startMs, durationMs: key.endMs - key.startMs });
      sounding.set(key.midi, depth);
    }

    // A black key hangs on the boundary between the two whites it sits
    // between, which is the right-hand one's left edge.
    const whites = [];
    const blacks = [];
    for (const key of view.geometry) {
      if (key.isBlack) {
        const boundary = (piano.whiteIndex(key.midi + 1) - firstWhite) * whiteWidth;
        blacks.push({ ...key, x: boundary - blackWidth / 2 });
      } else {
        whites.push({ ...key, x: (piano.whiteIndex(key.midi) - firstWhite) * whiteWidth });
      }
    }

    const pressed = (key) => Math.min(1, (sounding.get(key.midi) ?? 0) / piano.KEY_DIP_MM);

    for (const key of whites) {
      const down = pressed(key);
      ctx.fillStyle = down > 0 ? mix('#ffffff', palette.accent, down) : '#ffffff';
      ctx.fillRect(key.x, 0, Math.max(1, whiteWidth - 1), keyboardHeight);
      ctx.strokeStyle = 'rgba(16, 24, 40, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(key.x + 0.5, 0.5, Math.max(1, whiteWidth - 1), keyboardHeight - 1);
    }
    for (const key of blacks) {
      const down = pressed(key);
      ctx.fillStyle = down > 0 ? mix('#101828', palette.accent, down) : '#101828';
      ctx.fillRect(key.x, 0, blackWidth, blackHeight);
    }
    ctx.restore();
  }

  /** A colour part-way from `from` to `to`, so a press reads as a press. */
  function mix(from, to, amount) {
    const parse = (hex) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    const [r1, g1, b1] = parse(from);
    const [r2, g2, b2] = parse(to);
    const blend = (a, b) => Math.round(a + (b - a) * Math.max(0, Math.min(1, amount)));
    return `rgb(${blend(r1, r2)}, ${blend(g1, g2)}, ${blend(b1, b2)})`;
  }

  /** The frequency of a MIDI note, in the tuning the notation assumes. */
  const midiToHz = (midi) => 440 * (2 ** ((midi - 69) / 12));

  /**
   * One piano note, at `at` seconds, on a context that renders offline.
   *
   * A struck string is not a sine: the hammer excites a stack of partials
   * that fade at different rates, the upper ones first. Summing the first
   * six partials with their own decays is what makes the result read as a
   * piano rather than a beep, and it needs no sample library.
   */
  const addNote = (context, midi, at, seconds, gain) => {
    if (gain <= 0 || seconds <= 0) return;
    const hz = midiToHz(midi);
    // Low notes ring for seconds, high ones for a fraction of that.
    const ring = Math.max(0.18, Math.min(2.6, 5.5 - midi / 22));
    const length = Math.min(ring, Math.max(0.12, seconds + ring * 0.5));
    const partials = [1, 2, 3, 4, 5, 6];
    const weights = [1, 0.5, 0.28, 0.16, 0.09, 0.05];

    partials.forEach((partial, index) => {
      const osc = context.createOscillator();
      const envelope = context.createGain();
      osc.type = 'sine';
      // A string is slightly sharp on its upper partials; without this the
      // chord sounds like an organ.
      osc.frequency.setValueAtTime(hz * partial * (1 + 0.0004 * partial * partial), at);
      const decay = length / (1 + index * 0.45);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(gain * weights[index], at + 0.004);
      envelope.gain.exponentialRampToValueAtTime(0.0006, at + decay);
      osc.connect(envelope);
      envelope.connect(context.destination);
      osc.start(at);
      osc.stop(at + decay + 0.02);
    });
  };

  /**
   * The whole performance as one AudioBuffer, so the picture and the sound
   * share one timeline and a seek lands on the same note in both.
   *
   * The page has no Sound Model control, so the tone is fixed: the notes
   * the score presses, and nothing else. Silence would be a bug here, not a
   * choice the user made.
   */
  async function createPianoAudio({ keys, seconds }) {
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error('This browser cannot synthesize the piano sound. Try a current version of Chrome, Edge, Safari, or Firefox.');

    const sampleRate = 48000;
    const context = new OfflineContext(2, Math.max(1, Math.ceil(Math.max(1, seconds) * sampleRate)), sampleRate);
    // A dense chord would clip if every note played at full level, so the
    // gain per note falls as more notes sound together. The partials sum to
    // about 2.1, so a note's own peak is a little over twice its gain: 0.11
    // leaves a chord of three notes under full scale instead of squared off.
    const gain = Math.min(0.11, 0.5 / Math.max(1, Math.sqrt(keys.length)));

    for (const key of keys) {
      const at = Math.max(0, key.startMs / 1000);
      if (at >= seconds) continue;
      const held = Math.max(0.05, (key.endMs - key.startMs) / 1000);
      addNote(context, key.midi, at, held, gain);
    }

    return await context.startRendering();
  }

  async function renderPiano() {
    if (isRendering) {
      cancelRequested = true;
      recordButton.disabled = true;
      recordButton.textContent = 'Cancelling…';
      setStatus('Cancelling piano video render…');
      return;
    }

    let settings;
    try {
      settings = readSettings();
    } catch (error) {
      setStatus(error.message);
      return;
    }

    isRendering = true;
    cancelRequested = false;
    recordButton.disabled = false;
    recordButton.textContent = 'Cancel render';
    recordButton.setAttribute('aria-label', 'Cancel piano video render');
    controls.querySelectorAll('input, select').forEach((control) => { control.disabled = true; });
    if (placeholder) placeholder.hidden = true;
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }

    try {
      const file = musicXmlInput?.files?.[0];
      if (!file) throw new Error('Choose a MusicXML file first.');
      setStatus('Reading the score…');
      const api = await engine.loadNotationEngine();
      const parsed = api.parseMusicXml(await file.text());
      const score = engine.scoreTimeline(parsed, api);
      const { keys, endSeconds } = readKeys(parsed, api, score);
      if (keys.length === 0) throw new Error('This score has no pitched notes, so there are no keys to press.');

      const keyboard = piano.buildKeyboard(88);
      const playable = keys
        .map((key) => keyboard.byMidi.get(key.midi))
        .filter((key) => key !== undefined);
      if (playable.length === 0) throw new Error('Every note of this score falls outside an 88-key piano.');

      // The window follows the music: wide enough to hold every key the
      // score uses, never narrower than a readable keyboard, and centred on
      // the passage. A score wider than the widest window still gets all of
      // its keys -- the keys get narrower, but none is left off-screen.
      const lowestWhite = Math.min(...playable.map((key) => piano.whiteIndex(key.midi)));
      const highestWhite = Math.max(...playable.map((key) => piano.whiteIndex(key.midi)));
      const needed = highestWhite - lowestWhite + 3;
      const whiteCount = needed <= VISIBLE_WHITES
        ? Math.max(MIN_VISIBLE_WHITES, needed)
        : needed;
      const firstIndexOf = piano.whiteIndex(keyboard.first);
      const lastWhite = piano.whiteIndex(keyboard.last);
      const margin = Math.floor((whiteCount - (highestWhite - lowestWhite)) / 2);
      const windowStart = Math.max(
        firstIndexOf,
        Math.min(lowestWhite - margin, lastWhite - whiteCount + 1),
      );
      // A window that starts beside a black key cuts that key in half, so
      // it starts on a white key with no black key on its left: a C or an
      // F. The slide only happens when it still leaves every note visible.
      const whiteMidiAt = (index) => keyboard.keys
        .find((key) => !key.isBlack && piano.whiteIndex(key.midi) === index)?.midi;
      const covers = (start) => playable.every((key) => {
        const index = piano.whiteIndex(key.isBlack ? key.midi + 1 : key.midi);
        return index >= start && index < start + whiteCount;
      });
      let firstWhite = windowStart;
      while (firstWhite > firstIndexOf && ![0, 5].includes(piano.pitchClass(whiteMidiAt(firstWhite) ?? 0))) {
        if (!covers(firstWhite - 1)) break;
        firstWhite -= 1;
      }
      const geometry = keyboard.keys.filter((key) => {
        const index = piano.whiteIndex(key.isBlack ? key.midi + 1 : key.midi);
        return index >= firstWhite && index < firstWhite + whiteCount;
      });
      const view = { keys, geometry, firstWhite, whiteCount };

      // The Plan's length rule, with no cap of the page's own: the score's
      // own length, then the Thank You clip the engine owns.
      const seconds = Math.max(1, endSeconds);
      if (summaryLabel) {
        const bars = Math.max(1, Math.round(seconds / 2));
        summaryLabel.textContent = `${keys.length} notes · ${bars} bar${bars === 1 ? '' : 's'} · ${seconds.toFixed(2)} sec`;
      }

      const palette = engine.paletteFor(settings.color);
      const meta = engine.scoreMeta(parsed);

      // The keyboard band is pinned to the height the keys themselves ask
      // for, the way the Guitar page pins its neck: a band taller than a
      // keyboard would only leave it floating in empty background, and the
      // room is better spent on the notation.
      const probe = engine.layoutFor('piano', {
        width: settings.width,
        height: settings.height,
        parts: PARTS,
      });
      const stageWidth = Math.max(1, Math.round(settings.width - probe.pad * 2));
      const keyWidth = stageWidth / whiteCount;
      const keyboardHeight = keyWidth * (piano.WHITE_KEY_DEPTH_MM / piano.WHITE_KEY_WIDTH_MM);
      const free = settings.height - probe.pad * 2;
      settings.shares = { instrument: Math.min(1, keyboardHeight / Math.max(1, free)) };

      setStatus('Laying out the notation…');
      const notation = await engine.prepareNotationFor(file, settings, PARTS);
      if (notation?.error) throw new Error(`The notation could not be prepared: ${notation.error}`);

      const segments = [{
        seconds,
        draw: (ctx, at) => {
          ctx.fillStyle = palette.background;
          ctx.fillRect(0, 0, settings.width, settings.height);
          return engine.composeFrame(ctx, {
            instrument: 'piano',
            width: settings.width,
            height: settings.height,
            shares: settings.shares,
            parts: {
              title: (target, rect) => engine.drawTitlePart(target, rect, at, meta, palette, {
                brand: 'M Sharing',
                model: 'piano',
                titleOne: parsed.score?.title || file.name,
                titleTwo: `${keys.length} notes · ${settings.aspect}`,
              }),
              notation: (target, rect) => engine.drawNotationPart(target, rect, at, notation),
              instrument: (target, rect) => drawKeyboard(target, rect, at, view, palette),
            },
          });
        },
      }];
      // The keys and the notes are one timeline, so the sound rides on the
      // performance segment and starts with it.
      setStatus('Synthesizing the piano sound…');
      segments[0].audio = await createPianoAudio({ keys, seconds });
      const ending = await engine.thankYouSegment(settings.width, settings.height);
      if (ending) segments.push(ending);

      const result = await engine.render({
        width: settings.width,
        height: settings.height,
        fps: FPS,
        segments,
        onProgress: (progress, phase) => {
          if (!cancelRequested) setStatus(`${phase} · ${Math.round(progress * 100)}%`);
        },
        shouldStop: () => cancelRequested,
      });

      if (cancelRequested || result.cancelled) {
        setStatus('Piano video render cancelled. Change settings or try again.');
        return;
      }

      videoUrl = URL.createObjectURL(result.blob);
      video.src = videoUrl;
      video.hidden = false;
      video.load();
      download.href = videoUrl;
      download.download = `piano-${settings.aspect}.${result.extension}`;
      download.hidden = false;
      if (placeholder) placeholder.hidden = true;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      const sound = ending ? 'Thank You ending' : 'no Thank You clip';
      setStatus(`Rendered ${result.frames} frames · ${seconds.toFixed(2)} sec · ${result.container.toUpperCase()} · piano sound · ${sound}`);
    } catch (error) {
      setStatus(`Piano video render failed: ${error.message || error}`);
      if (placeholder) placeholder.hidden = false;
    } finally {
      isRendering = false;
      recordButton.disabled = false;
      recordButton.textContent = 'Generate Piano Video';
      recordButton.setAttribute('aria-label', 'Render piano video');
      controls.querySelectorAll('input, select').forEach((control) => { control.disabled = false; });
      cancelRequested = false;
    }
  }

  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    if (file) setStatus(`MusicXML selected: ${file.name}.`);
  });

  recordButton.textContent = 'Generate Piano Video';
  recordButton.setAttribute('aria-label', 'Render piano video');
  recordButton.addEventListener('click', () => { void renderPiano(); });
  setStatus('Choose a MusicXML file, then generate the video.');
  window.addEventListener('pagehide', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, { once: true });
})();
