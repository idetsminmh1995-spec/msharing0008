(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const engine = window.VideoEngine;
  const generateButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const previewCanvas = document.querySelector('[data-video-preview]');
  const sourceLabel = document.querySelector('[data-video-source]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const fullscreenButton = document.querySelector('[data-video-fullscreen]');
  const timeLabel = document.querySelector('[data-video-time]');
  const stage = document.querySelector('[data-video-stage]');
  const formatLabel = document.querySelector('[data-video-format]');
  const settingsForm = document.querySelector('[data-studio-settings]');
  const musicXmlInput = document.querySelector('[data-musicxml-input]');
  const musicXmlName = document.querySelector('[data-musicxml-name]');
  const logoInput = document.querySelector('[data-logo-input]');
  const logoName = document.querySelector('[data-logo-name]');
  const logoPreview = document.querySelector('[data-logo-preview]');
  const titleOne = document.querySelector('[data-title-one]');
  const titleOneColor = document.querySelector('[data-title-one-color]');
  const titleOneSize = document.querySelector('[data-title-one-size]');
  const titleTwo = document.querySelector('[data-title-two]');
  const titleTwoColor = document.querySelector('[data-title-two-color]');
  const titleTwoSize = document.querySelector('[data-title-two-size]');
  const drumBrand = document.querySelector('[data-drum-brand]');
  const drumModel = document.querySelector('[data-drum-model]');
  const notationView = document.querySelector('[data-notation-view]');
  const soundModel = document.querySelector('[data-sound-model]');
  const soundVolume = document.querySelector('[data-sound-volume]');
  const soundVolumeValue = document.querySelector('[data-sound-volume-value]');
  const countVoiceEnabled = document.querySelector('[data-count-voice-enabled]');
  const countVoice = document.querySelector('[data-count-voice]');
  const countVolume = document.querySelector('[data-count-volume]');
  const countVolumeValue = document.querySelector('[data-count-volume-value]');
  const countDisplay = document.querySelector('[data-count-display]');
  const videoColor = document.querySelector('[data-video-color]');
  const videoRatio = document.querySelector('[data-video-ratio]');
  const FPS = 30;
  // Only for a score that states no tempo: 120 BPM is the MusicXML default.
  const QUARTER_SECONDS = 0.5;
  const DEFAULT_LOGO = 'assets/logo/m-sharing-drum-logo.svg';
  // The reference picture's own second mark, on the frame's corner.
  const CORNER_LOGO = 'assets/logo/m-sharing-mark.svg';
  const DEFAULT_META = { beats: 4, beatType: 4, bpm: 120, key: '' };
  const RATIO_SIZES = {
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
  };

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();

  /**
   * The drum voices. Each is a short synthesized stroke, because the Plan
   * does not let an adapter assume the Sound Engine exists. `decay` is how
   * long the stroke rings; `tone` is where its body sits.
   */
  const DRUM_VOICES = {
    kick: { tone: 52, sweepTo: 42, decay: 0.16, gain: 0.85, noise: 0.02 },
    snare: { tone: 190, sweepTo: 165, decay: 0.13, gain: 0.5, noise: 0.55 },
    hihat: { tone: 7600, sweepTo: 6100, decay: 0.05, gain: 0.22, noise: 0.85 },
  };
  /**
   * How the four Sound Model choices differ. `ring` stretches every stroke,
   * which is what separates a dry Studio take from a long Room one;
   * `bright` moves the body up or down.
   */
  const SOUND_MODELS = {
    visual: { level: 0, ring: 1, bright: 1 },
    natural: { level: 1, ring: 1, bright: 1 },
    studio: { level: 1, ring: 0.8, bright: 1.15 },
    room: { level: 1, ring: 1.9, bright: 0.9 },
  };

  let isRendering = false;
  let cancelRequested = false;
  let objectUrl = null;
  let logoImage = null;
  let cornerLogoImage = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const getSize = () => RATIO_SIZES[videoRatio?.value] || RATIO_SIZES['16:9'];

  const getSettings = () => ({
    instrument: selectedTool,
    titleOne: titleOne?.value.trim() || 'DRUM PERFORMANCE',
    titleOneColor: titleOneColor?.value || getPalette(videoColor?.value || 'black').titleOne,
    titleOneSize: Number(titleOneSize?.value) || 22,
    titleTwo: titleTwo?.value.trim() || 'VISUAL PREVIEW',
    titleTwoColor: titleTwoColor?.value || getPalette(videoColor?.value || 'black').titleTwo,
    titleTwoSize: Number(titleTwoSize?.value) || 11,
    brand: drumBrand?.value.trim() || 'M Sharing',
    model: drumModel?.value || 'custom',
    notation: notationView?.value || 'page',
    soundModel: soundModel?.value || 'visual',
    soundVolume: Number(soundVolume?.value) || 0,
    countEnabled: countVoiceEnabled?.value === 'on',
    countVoice: countVoice?.value || 'one-two',
    countVolume: Number(countVolume?.value) || 0,
    countDisplay: countDisplay?.value || 'beats',
    // The Drum reference picture puts TIME / BPM / COUNT boxes in the Title
    // band; the other pages keep the plain stats row until their own
    // reference exists.
    infoBoxes: true,
    // The reference picture rings the note being played with a rounded box.
    cursorShape: 'box',
    color: videoColor?.value || 'black',
    ratio: videoRatio?.value || '16:9',
    size: getSize(),
    logoImage,
    cornerLogoImage,
    musicXmlName: musicXmlInput?.files?.[0]?.name || '',
  });

  const hexToRgba = (hex, alpha) => {
    const clean = String(hex).replace('#', '');
    const value = clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean;
    const red = Number.parseInt(value.slice(0, 2), 16) || 242;
    const green = Number.parseInt(value.slice(2, 4), 16) || 13;
    const blue = Number.parseInt(value.slice(4, 6), 16) || 61;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const getPalette = (color) => engine.paletteFor(color);

  const syncControlState = () => {
    const settings = getSettings();
    if (formatLabel) formatLabel.textContent = `${settings.ratio} · ${settings.size.width}×${settings.size.height}`;
    // The stage takes the video's own shape, so a portrait preview is not
    // letterboxed inside a landscape box (§၁၅).
    if (stage) stage.dataset.videoRatio = settings.ratio;
    if (soundVolumeValue) soundVolumeValue.value = `${settings.soundVolume}%`;
    if (countVolumeValue) countVolumeValue.value = `${settings.countVolume}%`;
    const countOn = settings.countEnabled;
    if (countVoice) countVoice.disabled = !countOn;
    if (countVolume) countVolume.disabled = !countOn;
    if (logoPreview && !logoInput?.files?.[0]) logoPreview.src = DEFAULT_LOGO;
  };

  // Two bars of quarters, so the pattern is timed by the same tempo map as a score.
  const defaultPattern = () => {
    const hits = [];
    for (let quarter = 0; quarter < 8; quarter += 1) {
      hits.push({ type: quarter % 2 === 0 ? 'kick' : 'snare', quarter });
      hits.push({ type: 'hihat', quarter });
    }
    return hits;
  };

  const drumTypeFromNote = (note) => {
    const step = note.querySelector('unpitched display-step')?.textContent?.trim().toUpperCase();
    const octave = Number(note.querySelector('unpitched display-octave')?.textContent);
    if (step === 'C' || (step === 'B' && octave <= 3)) return 'kick';
    if (step === 'D' || step === 'E') return 'snare';
    return 'hihat';
  };


  /** Metre, tempo and key as the file states them; the first value wins. */
  const readMeta = (document) => {
    const meta = { ...DEFAULT_META };
    const attributes = document.querySelector('attributes');
    const beats = Number(attributes?.querySelector('time beats')?.textContent);
    const beatType = Number(attributes?.querySelector('time beat-type')?.textContent);
    if (Number.isFinite(beats) && beats > 0) meta.beats = beats;
    if (Number.isFinite(beatType) && beatType > 0) meta.beatType = beatType;
    const fifths = attributes?.querySelector('key fifths')?.textContent;
    if (fifths !== undefined && fifths !== null && fifths.trim() !== '') {
      meta.key = engine.keyName(Number(fifths), attributes.querySelector('key mode')?.textContent);
    }
    const perMinute = Number(document.querySelector('sound[tempo]')?.getAttribute('tempo'));
    const metronome = Number(document.querySelector('metronome per-minute')?.textContent);
    const bpm = Number.isFinite(perMinute) && perMinute > 0 ? perMinute : metronome;
    if (Number.isFinite(bpm) && bpm > 0) meta.bpm = Math.round(bpm);
    return meta;
  };

  /**
   * The GM percussion number each `<instrument id>` stands for. Read once
   * per file from the part list: a note's own `<instrument>` is a reference,
   * and the number lives beside it in `<midi-instrument>`.
   *
   * MusicXML writes `midi-unpitched` as 1-128 while the General MIDI
   * percussion map -- and every kit folder in R2 -- is numbered from 0, so
   * the value is shifted down to match the notation engine, which makes the
   * same adjustment for the same reason.
   */
  const readMidiInstruments = (document) => {
    const byId = new Map();
    for (const node of document.querySelectorAll('midi-instrument')) {
      const id = node.getAttribute('id');
      const raw = Number(node.querySelector('midi-unpitched')?.textContent);
      if (id && Number.isFinite(raw)) byId.set(id, raw - 1);
    }
    return byId;
  };

  const parseMusicXml = async (file) => {
    if (!file) return null;
    const source = await engine.readScoreText(file);
    const document = new DOMParser().parseFromString(source, 'application/xml');
    if (document.querySelector('parsererror')) throw new Error('MusicXML file could not be parsed.');
    const meta = readMeta(document);
    const midiInstruments = readMidiInstruments(document);
    // A score may carry other parts beside the drums (a bass, a backing
    // line). Only one part is the drum performance; reading every part
    // would make the video as long as the whole score is stacked up.
    const parts = [...document.querySelectorAll('part')];
    const part = parts.find((candidate) => candidate.querySelector('clef sign')?.textContent?.trim().toLowerCase() === 'percussion')
      || parts.find((candidate) => candidate.querySelector('note unpitched'))
      || parts[0]
      || document;
    const measures = [...part.querySelectorAll('measure')];
    if (!measures.length) throw new Error('MusicXML does not contain any measures.');
    const hits = [];
    let absoluteQuarter = 0;
    let divisions = 1;
    for (const measure of measures) {
      const divisionNode = measure.querySelector('attributes divisions');
      if (divisionNode) divisions = Math.max(1, Number(divisionNode.textContent) || 1);
      let cursor = absoluteQuarter;
      // A drum score writes its second voice after a <backup> that rewinds to
      // the top of the bar. Reading only <note> would lay the voices end to
      // end and make the video twice as long as the score.
      for (const child of [...measure.children]) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'backup' || tag === 'forward') {
          const shift = Math.max(0, Number(child.querySelector(':scope > duration')?.textContent) || 0) / divisions;
          cursor += tag === 'backup' ? -shift : shift;
          continue;
        }
        if (tag !== 'note') continue;
        const duration = Math.max(0, Number(child.querySelector(':scope > duration')?.textContent) || 0) / divisions;
        const isChord = Boolean(child.querySelector(':scope > chord'));
        if (!child.querySelector(':scope > rest')) {
          hits.push({
            type: drumTypeFromNote(child),
            quarter: cursor,
            midi: midiInstruments.get(child.querySelector(':scope > instrument')?.getAttribute('id')),
          });
        }
        if (!isChord) cursor += duration;
      }
      absoluteQuarter = Math.max(absoluteQuarter, cursor);
    }
    return hits.length ? { hits, meta, endQuarter: absoluteQuarter } : null;
  };

  const getHits = async () => {
    const fallback = { hits: defaultPattern(), endQuarter: 8, meta: DEFAULT_META };
    const file = musicXmlInput?.files?.[0];
    if (!file) return { ...fallback, source: 'default drum pattern' };
    const parsed = await parseMusicXml(file);
    return parsed
      ? { ...parsed, source: file.name }
      : { ...fallback, source: `${file.name} · default pattern fallback` };
  };

  /**
   * Hits in seconds on the score's own tempo map: the notation cursor and the
   * lane markers must agree about when a note is played, and the tempo marks
   * are what say so. 120 BPM applies only when the file states no tempo.
   */
  const timeHits = (hits, endQuarter, notationState) => {
    const api = notationState?.api;
    const tempoMap = notationState?.playback?.tempoMap;
    // Everything the hit already knew rides along: the lane it belongs to
    // is not the only thing a renderer needs, and the GM number is what
    // picks the kit picture.
    const keep = (hit) => ({ type: hit.type, midi: hit.midi, quarter: hit.quarter });
    if (!api || !tempoMap) {
      return {
        hits: hits.map((hit) => ({ ...keep(hit), at: hit.quarter * QUARTER_SECONDS })),
        seconds: endQuarter * QUARTER_SECONDS,
      };
    }
    const toSeconds = (quarter) => api.tickToSeconds(tempoMap, quarter * api.TICKS_PER_QUARTER);
    // A repeated score is heard more often than it is written, so a hit lands
    // once per pass: each pass restarts its own measure clock at
    // `startSeconds`, which is what keeps the lanes on the notation cursor.
    const performance = notationState?.playback?.performance;
    if (performance?.hasRepeats) {
      const at = [];
      for (const hit of hits) {
        const tick = hit.quarter * api.TICKS_PER_QUARTER;
        const writtenSeconds = toSeconds(hit.quarter);
        for (const entry of performance.entries) {
          if (tick >= entry.writtenTick && tick < entry.writtenTick + entry.ticks) {
            at.push({ ...keep(hit), at: entry.startSeconds + (writtenSeconds - entry.writtenStartSeconds) });
          }
        }
      }
      at.sort((left, right) => left.at - right.at);
      return { hits: at, seconds: performance.totalSeconds };
    }
    return {
      hits: hits.map((hit) => ({ ...keep(hit), at: toSeconds(hit.quarter) })),
      seconds: toSeconds(endQuarter),
    };
  };

  if (!engine || !generateButton || !status || !stage || !video || !download) {
    setStatus('Video Engine or Studio controls are not available on this page.');
    if (generateButton) generateButton.disabled = true;
    return;
  }

  // Metronome, Guitar, Piano, Bass, Strings (the violin) and Voice have adapters
  // of their own; a tool with no adapter must never fall through to the drum
  // branch and render a drum video.
  if (selectedTool === 'metronome' || selectedTool === 'guitar' || selectedTool === 'piano' || selectedTool === 'bass' || selectedTool === 'strings' || selectedTool === 'violin' || selectedTool === 'voice') return;
  if (selectedTool !== 'drums') {
    setStatus('Visual video export is currently available in Drum, Metronome, Guitar, Piano, Bass, Strings and Voice Studio. Other instrument adapters are not implemented yet.');
    generateButton.disabled = true;
    settingsForm?.querySelectorAll('input,select').forEach((control) => { control.disabled = true; });
    return;
  }


  /**
   * The kit's pictures for the frame being rendered, or an error that stops
   * the render.
   *
   * Main Plan §၁၃.၁ gives every ratio its own picture set and makes the
   * base picture a required asset, so a kit with no art for the chosen
   * ratio stops the export and says which ratios it does carry. A video
   * drawn from another ratio's photographs, or from a lane chart standing
   * in for the kit, is not the video the Plan describes.
   */
  async function loadKit(settings, hits) {
    const drumKit = window.DrumKit;
    if (!drumKit) throw new Error('The drum kit module is not loaded, so no kit pictures are available.');
    // The bucket's manifest is the authority on which kits exist (§၁၀), so
    // it is read before the kit is looked up: a kit uploaded to R2 must
    // reach the video without a code change.
    const manifest = drumKit.loadManifest ? await drumKit.loadManifest() : null;
    if (manifest?.source === 'built-in' && manifest.error) {
      console.warn(`The drum kit manifest could not be read (${manifest.error}); using the built-in kit list.`);
    }
    const name = `${settings.brand}/${settings.model}`;
    if (!drumKit.KITS[name]) {
      throw new Error(`No drum kit is known by the name "${name}".`);
    }
    setStatus('Loading the drum kit from R2…');
    const art = await drumKit.loadArt(name, settings.ratio);
    const strokes = hits
      .filter((hit) => Number.isFinite(hit.midi))
      .map((hit) => ({ note: hit.midi, at: hit.at }));
    const limbs = drumKit.solveLimbs(strokes.map((stroke) => ({ time: stroke.at, note: stroke.note })));
    strokes.forEach((stroke, index) => { stroke.limb = limbs[index]; });
    const resolved = await drumKit.loadHitImages(art, strokes);
    return {
      draw: (ctx, rect, at) => drumKit.draw(ctx, rect, art, at, strokes, resolved),
      missing: drumKit.missingSummary(strokes),
    };
  }

  async function drawPerformance(ctx, at, settings, meta, kit, notationState) {
    const { width, height } = settings.size;
    const palette = getPalette(settings.color);

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * 0.72, height * 0.12, 4, width * 0.72, height * 0.12, Math.max(180, width * 0.4));
    glow.addColorStop(0, hexToRgba('#f20d3d', settings.color === 'white' ? 0.1 : 0.24));
    glow.addColorStop(1, hexToRgba('#f20d3d', 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height * 0.55);

    await engine.composeFrame(ctx, {
      instrument: selectedTool,
      width,
      height,
      parts: {
        title: (target, rect) => engine.drawTitlePart(target, rect, at, meta, palette, settings),
        notation: (target, rect) => engine.drawNotationPart(target, rect, at, notationState, palette),
        instrument: (target, rect) => kit.draw(target, rect, at),
      },
    });
    // Outside composeFrame's bands: the reference picture puts this mark on
    // the frame's own corner, over whatever band happens to be there.
    engine.drawCornerLogo(ctx, {
      width, height, palette, image: settings.cornerLogoImage,
    });
  }

  /**
   * The Plan's length rule counts the count-in as part of the video: one
   * bar of the score's own metre, before the score itself starts.
   */
  const countInSeconds = (settings, meta) => {
    if (!settings.countEnabled) return 0;
    const beatSeconds = (60 / Math.max(1, meta.bpm)) * (4 / Math.max(1, meta.beatType));
    return meta.beats * beatSeconds;
  };

  /**
   * The count-in frame: the Title band, whose COUNT box is the count. The
   * count has one home on the frame, so nothing here draws it a second time.
   */
  async function drawCountIn(ctx, at, settings, meta) {
    const { width, height } = settings.size;
    const palette = getPalette(settings.color);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    await engine.composeFrame(ctx, {
      instrument: selectedTool,
      width,
      height,
      parts: {
        title: (target, rect) => engine.drawTitlePart(target, rect, at, meta, palette, settings),
      },
    });
    engine.drawCornerLogo(ctx, { width, height, palette, image: settings.cornerLogoImage });
  }

  /**
   * One stroke of a drum, at `at` seconds, on a context that is rendering
   * offline. A stroke is a pitched body that falls away plus a burst of
   * noise for the stick; a kick has almost no noise, a hi-hat almost
   * nothing else.
   */
  const addStroke = (context, voice, at, gainScale, model) => {
    const body = DRUM_VOICES[voice] || DRUM_VOICES.snare;
    const level = body.gain * gainScale;
    if (level <= 0) return;
    const decay = body.decay * model.ring;

    const tone = context.createOscillator();
    const toneGain = context.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(body.tone * model.bright, at);
    tone.frequency.exponentialRampToValueAtTime(Math.max(20, body.sweepTo * model.bright), at + decay);
    toneGain.gain.setValueAtTime(0, at);
    toneGain.gain.linearRampToValueAtTime(level, at + 0.002);
    toneGain.gain.exponentialRampToValueAtTime(0.0008, at + decay);
    tone.connect(toneGain);
    toneGain.connect(context.destination);
    tone.start(at);
    tone.stop(at + decay + 0.02);

    if (body.noise > 0) {
      const frames = Math.max(1, Math.ceil(decay * context.sampleRate));
      const noise = context.createBuffer(1, frames, context.sampleRate);
      const channel = noise.getChannelData(0);
      // A fixed seed keeps one render byte-identical to the next, which is
      // what makes the export testable.
      let seed = 12345;
      for (let index = 0; index < frames; index += 1) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        channel[index] = (seed / 0x3fffffff - 1) * (1 - index / frames);
      }
      const source = context.createBufferSource();
      const noiseGain = context.createGain();
      source.buffer = noise;
      noiseGain.gain.value = level * body.noise;
      source.connect(noiseGain);
      noiseGain.connect(context.destination);
      source.start(at);
    }
  };

  /**
   * The drum performance as one AudioBuffer covering the whole video,
   * count-in included: the count is spoken over a click, so a silent
   * count-in would leave the first bar out of time with the picture.
   *
   * The spoken count is its own sound, not a property of the drum model,
   * so it is heard even when the drum model is Visual Only.
   */
  async function createDrumAudio({ settings, hits, countIn, duration, meta }) {
    const model = SOUND_MODELS[settings.soundModel] || SOUND_MODELS.visual;
    const wantsDrums = model.level > 0;
    // A count-in of zero seconds has nothing to count, so asking for the
    // recordings there would be a download with no sound behind it.
    const wantsCount = settings.countEnabled && countIn > 0;
    if (!wantsDrums && !wantsCount) return null;
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error('This browser cannot synthesize the drum sound. Try a current version of Chrome, Edge, Safari, or Firefox.');

    // The recordings are fetched before the context is built: an offline
    // render cannot wait for a network read once it has started.
    const voices = wantsCount ? await engine.countVoiceSamples(meta.beats) : [];

    const sampleRate = 48000;
    const total = countIn + duration;
    const context = new OfflineContext(2, Math.max(1, Math.ceil(total * sampleRate)), sampleRate);

    const soundGain = settings.soundVolume / 100;
    if (wantsDrums) {
      for (const hit of hits) {
        addStroke(context, hit.type, countIn + hit.at, soundGain, model);
      }
    }

    if (wantsCount) {
      const beatSeconds = (60 / Math.max(1, meta.bpm)) * (4 / Math.max(1, meta.beatType));
      const countGain = settings.countVolume / 100;
      for (let beat = 0; beat < meta.beats; beat += 1) {
        const at = beat * beatSeconds;
        if (at >= countIn) break;
        // The count is a woodblock under the voice: a bright click on every
        // beat, the downbeat higher, so the player hears where the bar
        // starts even if a recording is missing.
        addStroke(context, 'hihat', at, countGain * 0.8, model);
        if (beat === 0) addStroke(context, 'snare', at, countGain * 0.35, model);
        const voice = voices[beat];
        if (voice) {
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = voice;
          gain.gain.value = countGain;
          source.connect(gain);
          gain.connect(context.destination);
          source.start(at);
        }
      }
    }

    return await context.startRendering();
  }

  /**
   * The score, decoded and laid out for this frame shape, kept between
   * rebuilds. The preview is rebuilt on every settings change and the
   * export builds once more; decoding the SVG each time would put a full
   * score render behind every keystroke in a Title field.
   */
  const notationCache = new Map();
  async function notationFor(settings) {
    const file = musicXmlInput?.files?.[0] || null;
    const key = [file ? `${file.name}:${file.size}:${file.lastModified}` : 'none',
      settings.notation, settings.size.width, settings.size.height, settings.titleOne,
      settings.color].join('|');
    if (notationCache.has(key)) return notationCache.get(key);
    const state = await engine.prepareNotationFor(
      file, { ...settings, palette: getPalette(settings.color) }, ['title', 'notation', 'instrument'],
    );
    if (state?.error) {
      setStatus(`Notation could not be prepared: ${state.error}`);
      return state;
    }
    notationCache.set(key, state);
    return state;
  }

  /**
   * Everything a frame of this video needs, at one frame size: the parts the
   * Plan counts as the length (count-in, score, Thank You), the sound, and
   * the notation decoded once. The preview and the export both call this, so
   * neither can draw a video the other would not.
   */
  async function buildTimeline(settings) {
    const { hits: written, endQuarter, meta, source } = await getHits();
    const notationState = await notationFor(settings);
    const timed = timeHits(written, endQuarter, notationState?.error ? null : notationState);
    const hits = timed.hits;
    const kit = await loadKit(settings, hits);
    // The Plan's length: the count-in the score is played in, then the
    // score's own length, with no cap of the Studio's.
    const countIn = countInSeconds(settings, meta);
    const duration = Math.max(1, timed.seconds);
    const segments = [];
    if (countIn > 0) {
      segments.push({ seconds: countIn, draw: (ctx, at) => drawCountIn(ctx, at, settings, meta) });
    }
    segments.push({ seconds: duration, draw: (ctx, at) => drawPerformance(ctx, at, settings, meta, kit, notationState) });

    // The sound spans the count-in and the performance together, so it
    // rides on the first of those two segments and starts at zero.
    const audio = await createDrumAudio({ settings, hits, countIn, duration, meta });
    if (audio) segments[0].audio = audio;
    // The Plan's last part of the length: the Thank You clip. The engine
    // owns its address and shape, so the page only asks for it.
    const ending = await engine.thankYouSegment(settings.size.width, settings.size.height, { instrument: 'drum', color: settings.color });
    if (ending) segments.push(ending);
    return { segments, audio, meta, source, notationState, countIn, duration, kit };
  }

  // ---------------------------------------------------------------
  // Live Preview (§၁၂). The preview draws the same segments the export
  // encodes, through the engine's own frame clock, so what is on the
  // canvas is what the file will hold. It never touches an encoder.
  // ---------------------------------------------------------------

  // A long score would need a soundtrack buffer measured in hundreds of
  // megabytes just to preview it; past this the preview stays silent and
  // says so, and the export still carries the sound.
  const PREVIEW_AUDIO_LIMIT = 600;

  const preview = {
    plan: null,
    size: null,
    settings: null,
    seconds: 0,
    audioBuffer: null,
    audioContext: null,
    source: null,
    startedAt: 0,
    offset: 0,
    playing: false,
    rafId: 0,
    token: 0,
    drawing: false,
    pendingAt: null,
  };

  /**
   * The preview draws at the export's own pixel size (§၁၅): the canvas is
   * 1920x1080 (or 1080x1080 / 1080x1920) and CSS scales it down into the
   * stage. A smaller canvas would be a different picture, not the same one.
   */
  const previewSizeFor = (size) => ({ width: size.width, height: size.height });

  const previewVisible = () => Boolean(preview.plan) && !previewCanvas?.hidden;

  const setSource = (kind, text) => {
    if (!sourceLabel) return;
    sourceLabel.textContent = text;
    sourceLabel.dataset.kind = kind;
  };

  const stopPreviewClock = () => {
    preview.playing = false;
    if (preview.rafId) cancelAnimationFrame(preview.rafId);
    preview.rafId = 0;
    if (preview.source) {
      try { preview.source.stop(); } catch { /* already stopped */ }
      preview.source.disconnect();
      preview.source = null;
    }
    if (playButton) playButton.textContent = '▶';
    stage?.classList.remove('is-playing');
  };

  /** Releases everything the preview holds. Export calls this first. */
  function stopPreview() {
    preview.token += 1;
    stopPreviewClock();
    preview.audioBuffer = null;
    if (preview.audioContext && preview.audioContext.state !== 'closed') {
      void preview.audioContext.close();
    }
    preview.audioContext = null;
    preview.plan = null;
    preview.seconds = 0;
  }

  /**
   * Draws the frame for one time. Concurrent requests collapse into the
   * newest one: a drag of the timeline asks for frames faster than a
   * 1080p kit photo can be drawn, and drawing every one of them would
   * leave the preview behind the handle.
   */
  async function drawPreviewFrame(at) {
    if (!preview.plan || !previewCanvas) return;
    if (preview.drawing) { preview.pendingAt = at; return; }
    preview.drawing = true;
    const token = preview.token;
    try {
      const ctx = previewCanvas.getContext('2d');
      await engine.drawFrameAt(ctx, preview.plan, at);
      if (token !== preview.token) return;
      updatePreviewControls(at);
    } catch (error) {
      setStatus(`Live preview could not draw this frame: ${error.message || error}`);
    } finally {
      preview.drawing = false;
      const pending = preview.pendingAt;
      preview.pendingAt = null;
      if (pending !== null && token === preview.token) void drawPreviewFrame(pending);
    }
  }

  function updatePreviewControls(at) {
    const total = preview.seconds;
    const shown = Math.min(Math.max(0, at), total);
    if (timeline) {
      timeline.max = String(total || 1);
      timeline.value = String(shown);
    }
    if (timeLabel) timeLabel.textContent = `${formatTime(shown)} / ${formatTime(total)}`;
  }

  const previewClock = () => preview.offset + (performance.now() - preview.startedAt) / 1000;

  function previewTick() {
    if (!preview.playing) return;
    const at = previewClock();
    if (at >= preview.seconds) {
      stopPreviewClock();
      preview.offset = preview.seconds;
      void drawPreviewFrame(preview.seconds);
      updatePreviewControls(preview.seconds);
      return;
    }
    void drawPreviewFrame(at);
    preview.rafId = requestAnimationFrame(previewTick);
  }

  async function playPreview() {
    if (!preview.plan) return;
    if (preview.offset >= preview.seconds) preview.offset = 0;
    preview.startedAt = performance.now();
    preview.playing = true;
    if (playButton) playButton.textContent = '❚❚';
    stage?.classList.add('is-playing');
    // Starting the sound can wait on the audio context; a pause that lands
    // in that gap must win, or the clock would come back on its own.
    await startPreviewAudio(preview.offset);
    if (!preview.playing) return;
    preview.rafId = requestAnimationFrame(previewTick);
  }

  function pausePreview() {
    preview.offset = Math.min(previewClock(), preview.seconds);
    stopPreviewClock();
    void drawPreviewFrame(preview.offset);
  }

  async function startPreviewAudio(offset) {
    if (!preview.audioBuffer) return;
    try {
      if (!preview.audioContext) preview.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (preview.audioContext.state === 'suspended') await preview.audioContext.resume();
      if (preview.source) { try { preview.source.stop(); } catch { /* already stopped */ } preview.source.disconnect(); }
      const source = preview.audioContext.createBufferSource();
      source.buffer = preview.audioBuffer;
      source.connect(preview.audioContext.destination);
      source.start(0, Math.min(offset, Math.max(0, preview.audioBuffer.duration - 0.01)));
      preview.source = source;
    } catch (error) {
      setStatus(`Live preview is visual only: ${error.message || error}`);
    }
  }

  /**
   * Builds the preview's timeline and shows its first frame. `settings`
   * is the page's settings; the frame size is the preview's own, so the
   * layout is the export's at a smaller pixel count.
   */
  async function startPreview(settings, { size, at = 0, autoplay = false } = {}) {
    if (isRendering) return;
    const canvasSize = size || previewSizeFor(settings.size);
    const token = ++preview.token;
    stopPreviewClock();
    const previewSettings = { ...settings, size: canvasSize };
    preview.settings = settings;
    preview.size = canvasSize;
    try {
      const { segments } = await buildTimeline(previewSettings);
      // An export that started while this was being built owns the stage.
      if (token !== preview.token || isRendering) return;
      const plan = engine.timelinePlan(segments, FPS);
      preview.plan = plan;
      preview.seconds = plan.seconds;
      preview.audioBuffer = null;
      if (previewCanvas) {
        previewCanvas.width = canvasSize.width;
        previewCanvas.height = canvasSize.height;
        previewCanvas.hidden = false;
      }
      if (video) video.hidden = true;
      if (placeholder) placeholder.hidden = true;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      preview.offset = Math.min(Math.max(0, at), Math.max(0, plan.seconds - 1 / FPS));
      setSource('preview', plan.seconds > PREVIEW_AUDIO_LIMIT ? 'Live preview · visual only' : 'Live preview');
      await drawPreviewFrame(preview.offset);
      if (token !== preview.token) return;
      if (plan.seconds <= PREVIEW_AUDIO_LIMIT) void loadPreviewAudio(plan, token);
      if (autoplay) await playPreview();
    } catch (error) {
      if (token !== preview.token) return;
      setStatus(`Live preview failed: ${error.message || error}`);
    }
  }

  async function loadPreviewAudio(plan, token) {
    try {
      const buffer = await engine.timelineAudio(plan);
      if (token !== preview.token || !buffer) return;
      preview.audioBuffer = buffer;
      setSource('preview', 'Live preview · with sound');
      if (preview.playing) await startPreviewAudio(previewClock());
    } catch {
      // A silent preview is still a preview; the export carries the sound.
      if (token === preview.token) setSource('preview', 'Live preview · visual only');
    }
  }

  let previewTimer = 0;
  /** Settings changed: redraw soon, once, at the frame the user is on. */
  function schedulePreview() {
    if (isRendering) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const settings = getSettings();
      if (!preview.plan) { void startPreview(settings); return; }
      const at = preview.playing ? previewClock() : preview.offset;
      const keepSize = preview.size && previewSizeFor(settings.size).width === preview.size.width ? preview.size : null;
      void startPreview(settings, { size: keepSize, at, autoplay: preview.playing });
    }, 300);
  }

  function updatePlaybackControls() {
    // The rendered file keeps its own clock even while hidden behind the
    // preview; letting it write the label would show its time, not the
    // preview's.
    if (previewVisible()) return;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (timeline) {
      timeline.max = String(duration || 1);
      timeline.value = String(Math.min(video.currentTime || 0, duration || 0));
    }
    if (timeLabel) timeLabel.textContent = formatTime(video.currentTime || 0);
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(value));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  async function generateVideo() {
    if (isRendering) {
      cancelRequested = true;
      setStatus('Cancelling video render…');
      return;
    }
    const settings = getSettings();
    isRendering = true;
    cancelRequested = false;
    generateButton.disabled = true;
    generateButton.textContent = 'Generating…';
    if (placeholder) placeholder.hidden = true;
    stopPreview();
    try {
      setStatus(`Preparing ${musicXmlInput?.files?.[0]?.name || 'default drum pattern'} · ${settings.ratio} · 0%`);
      const { segments, audio, notationState, kit } = await buildTimeline(settings);
      if (notationState?.error) setStatus(`Notation could not be prepared: ${notationState.error}`);
      const result = await engine.render({
        width: settings.size.width,
        height: settings.size.height,
        fps: FPS,
        segments,
        onProgress: (progress, phase) => { if (!cancelRequested) setStatus(`${phase} · ${Math.round(progress * 100)}%`); },
        shouldStop: () => cancelRequested,
      });
      if (cancelRequested || result.cancelled) {
        setStatus('Video render cancelled. Adjust the settings and generate again.');
        return;
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(result.blob);
      video.src = objectUrl;
      video.hidden = false;
      video.load();
      if (previewCanvas) previewCanvas.hidden = true;
      setSource('rendered', 'Rendered file');
      download.href = objectUrl;
      download.download = `msharing-${settings.ratio.replace(':', 'x')}-drum.${result.extension}`;
      download.hidden = false;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      updatePlaybackControls();
      // The status names the drum sound, because that is the part the
      // Sound Model controls. The Thank You clip carries its own sound
      // whether or not the drums do, so claiming the whole file is silent
      // would be a lie once the ending is attached. The spoken count is a
      // sound of its own too, so Visual Only with a count-in is not silent.
      const audioNote = audio
        ? (SOUND_MODELS[settings.soundModel]?.level > 0
          ? `${settings.soundModel} drum sound`
          : 'count voice only')
        : 'visual only · no drum sound';
      // A kit that had no picture for a note leaves that stroke unlit. Say
      // so, rather than shipping a video with a silent hole in it.
      const missingNote = kit?.missing ? ` · ${kit.missing}` : '';
      setStatus(`Rendered ${result.frames} frames · ${settings.ratio} · ${audioNote}${missingNote}`);
    } catch (error) {
      setStatus(`Video render failed: ${error.message || error}`);
    } finally {
      isRendering = false;
      generateButton.disabled = false;
      generateButton.textContent = 'Generate Video';
      cancelRequested = false;
    }
  }

  generateButton.addEventListener('click', () => { void generateVideo(); });

  // This adapter drives the stage for both sources, so the shell's own
  // video handlers stand down (script.js reads this marker).
  if (stage) stage.dataset.videoAdapter = 'drums';

  /**
   * The Play button drives whichever source is on show: the live canvas
   * while it is visible, the rendered file once one exists.
   */
  const togglePlayback = async () => {
    if (previewVisible()) {
      if (preview.playing) pausePreview();
      else await playPreview();
      return;
    }
    if (video.paused) {
      await video.play();
      if (playButton) playButton.textContent = '❚❚';
      stage.classList.add('is-playing');
    } else {
      video.pause();
      if (playButton) playButton.textContent = '▶';
      stage.classList.remove('is-playing');
    }
  };

  playButton?.addEventListener('click', () => { void togglePlayback(); });

  timeline?.addEventListener('input', () => {
    const at = Number(timeline.value) || 0;
    if (previewVisible()) {
      preview.offset = Math.min(at, Math.max(0, preview.seconds - 1 / FPS));
      if (preview.playing) {
        preview.startedAt = performance.now();
        void startPreviewAudio(preview.offset);
      }
      void drawPreviewFrame(preview.offset);
      updatePreviewControls(preview.offset);
      return;
    }
    video.currentTime = at;
    updatePlaybackControls();
  });

  // Space plays and pauses, as every video player does -- unless the focus
  // is in a control that types or selects, where Space is a character.
  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' && event.key !== ' ') return;
    const active = document.activeElement;
    const tag = active?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || active?.isContentEditable) return;
    if (event.target?.closest?.('[data-studio-settings]')) return;
    if (!previewVisible() && video.hidden) return;
    event.preventDefault();
    void togglePlayback();
  });

  fullscreenButton?.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (stage.requestFullscreen) void stage.requestFullscreen();
  });
  settingsForm?.addEventListener('submit', (event) => event.preventDefault());
  // The bucket names a kit by brand AND model, so the model list is the
  // brand's own: a model left over from another brand would name a folder
  // that does not exist and the render would quietly lose its kit. Both
  // lists follow the bucket's manifest, so a brand it adds is selectable
  // without touching the page.
  const syncKitOptions = () => {
    const kits = window.DrumKit?.KITS;
    if (!drumBrand || !drumModel || !kits) return;
    const entries = Object.values(kits);
    const previousBrand = drumBrand.value;
    const brands = [...new Set(entries.map((kit) => kit.brand))];
    if (brands.length) {
      drumBrand.replaceChildren(...brands.map((brand) => {
        const kit = entries.find((entry) => entry.brand === brand);
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = kit?.brandLabel || brand;
        return option;
      }));
      drumBrand.value = brands.includes(previousBrand) ? previousBrand : brands[0];
    }
    const models = entries.filter((kit) => kit.brand === drumBrand.value);
    if (!models.length) return;
    const previous = drumModel.value;
    drumModel.replaceChildren(...models.map((kit) => {
      const option = document.createElement('option');
      option.value = kit.model;
      option.textContent = kit.label;
      return option;
    }));
    drumModel.value = models.some((kit) => kit.model === previous) ? previous : models[0].model;
  };
  syncKitOptions();
  drumBrand?.addEventListener('change', syncKitOptions);
  // The lists above start from the built-in table; the bucket's manifest is
  // the authority, so they are rebuilt once it answers.
  window.DrumKit?.loadManifest?.().then(syncKitOptions).catch(() => {});
  [titleOne, titleOneColor, titleOneSize, titleTwo, titleTwoColor, titleTwoSize, drumBrand, drumModel, notationView, soundModel, soundVolume, countVoiceEnabled, countVoice, countVolume, countDisplay, videoColor, videoRatio].forEach((control) => {
    control?.addEventListener('input', () => { syncControlState(); schedulePreview(); });
    control?.addEventListener('change', () => { syncControlState(); schedulePreview(); });
  });
  // §၁၄: switching Video Color repaints everything. A Title picker the user
  // has not touched still holds the previous theme's default, so it follows
  // the theme; a colour the user chose is theirs and is kept.
  let lastThemeTitles = getPalette(videoColor?.value || 'black');
  videoColor?.addEventListener('change', () => {
    const next = getPalette(videoColor.value);
    for (const [input, key] of [[titleOneColor, 'titleOne'], [titleTwoColor, 'titleTwo']]) {
      if (!input) continue;
      if (input.value.toLowerCase() === lastThemeTitles[key].toLowerCase()) input.value = next[key];
    }
    lastThemeTitles = next;
    // This listener runs after the shared control loop, so the preview it
    // scheduled still holds the old Title colours; ask for one more frame.
    syncControlState();
    schedulePreview();
  });
  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    setStatus(file ? `MusicXML selected: ${file.name}. Ready to generate.` : 'Choose a MusicXML file or use the default drum pattern.');
    schedulePreview();
  });
  logoInput?.addEventListener('change', () => {
    const file = logoInput.files?.[0];
    if (!file) {
      logoImage = new Image();
      logoImage.src = DEFAULT_LOGO;
      if (logoName) logoName.textContent = 'Default M Sharing Drum Logo';
      if (logoPreview) logoPreview.src = DEFAULT_LOGO;
      return;
    }
    const object = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      logoImage = image;
      if (logoPreview) logoPreview.src = object;
      if (logoName) logoName.textContent = file.name;
      setStatus(`Logo selected: ${file.name}. Ready to generate.`);
      schedulePreview();
    };
    image.onerror = () => { URL.revokeObjectURL(object); setStatus('The selected logo could not be loaded.'); };
    image.src = object;
  });
  video.addEventListener('loadedmetadata', updatePlaybackControls);
  video.addEventListener('timeupdate', updatePlaybackControls);
  video.addEventListener('ended', () => { if (playButton) playButton.textContent = '▶'; stage.classList.remove('is-playing'); });
  window.addEventListener('pagehide', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    stopPreview();
  }, { once: true });

  logoImage = new Image();
  logoImage.onload = () => schedulePreview();
  logoImage.src = DEFAULT_LOGO;

  cornerLogoImage = new Image();
  cornerLogoImage.onload = () => schedulePreview();
  cornerLogoImage.src = CORNER_LOGO;
  syncControlState();
  // The Plan opens the preview as soon as the settings are valid, so the
  // page never shows an empty stage while a render is still unasked for.
  schedulePreview();
})();
