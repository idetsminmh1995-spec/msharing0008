(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const engine = window.VideoEngine;
  const generateButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
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
  const DEFAULT_META = { beats: 4, beatType: 4, bpm: 120, key: '' };
  const RATIO_SIZES = {
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
  };
  const LANES = [
    { id: 'kick', label: 'KICK', y: 0.46, color: '#ff7b55' },
    { id: 'snare', label: 'SNARE', y: 0.64, color: '#ffcf5a' },
    { id: 'hihat', label: 'HI-HAT', y: 0.82, color: '#78a8ff' },
  ];

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
  let notation = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const getSize = () => RATIO_SIZES[videoRatio?.value] || RATIO_SIZES['16:9'];

  const getSettings = () => ({
    instrument: selectedTool,
    titleOne: titleOne?.value.trim() || 'DRUM PERFORMANCE',
    titleOneColor: titleOneColor?.value || '#f8fafc',
    titleOneSize: Number(titleOneSize?.value) || 22,
    titleTwo: titleTwo?.value.trim() || 'VISUAL PREVIEW',
    titleTwoColor: titleTwoColor?.value || '#91a0b5',
    titleTwoSize: Number(titleTwoSize?.value) || 11,
    brand: drumBrand?.value.trim() || 'M Sharing',
    model: drumModel?.value || 'custom',
    notation: notationView?.value || 'landscape',
    soundModel: soundModel?.value || 'visual',
    soundVolume: Number(soundVolume?.value) || 0,
    countEnabled: countVoiceEnabled?.value === 'on',
    countVoice: countVoice?.value || 'one-two',
    countVolume: Number(countVolume?.value) || 0,
    countDisplay: countDisplay?.value || 'beats',
    color: videoColor?.value || 'black',
    ratio: videoRatio?.value || '16:9',
    size: getSize(),
    logoImage,
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

  const parseMusicXml = async (file) => {
    if (!file || file.name.toLowerCase().endsWith('.mxl')) return null;
    const source = await file.text();
    const document = new DOMParser().parseFromString(source, 'application/xml');
    if (document.querySelector('parsererror')) throw new Error('MusicXML file could not be parsed.');
    const meta = readMeta(document);
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
        if (!child.querySelector(':scope > rest')) hits.push({ type: drumTypeFromNote(child), quarter: cursor });
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
    if (!api || !tempoMap) {
      return {
        hits: hits.map((hit) => ({ type: hit.type, at: hit.quarter * QUARTER_SECONDS })),
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
            at.push({ type: hit.type, at: entry.startSeconds + (writtenSeconds - entry.writtenStartSeconds) });
          }
        }
      }
      at.sort((left, right) => left.at - right.at);
      return { hits: at, seconds: performance.totalSeconds };
    }
    return {
      hits: hits.map((hit) => ({ type: hit.type, at: toSeconds(hit.quarter) })),
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


  /** The instrument part: the drum lanes the performance is read from. */
  function drawInstrumentPart(ctx, rect, at, hits, duration, settings, palette) {
    const scale = Math.max(0.6, Math.min(1.2, Math.min(rect.width / 640, rect.height / 360)));
    const labelWidth = Math.round(78 * scale);
    const left = rect.x + labelWidth;
    const right = rect.x + rect.width - Math.round(16 * scale);
    const trackWidth = Math.max(1, right - left);
    const lanePositions = LANES.map((lane, index) => ({
      ...lane,
      y: Math.round(rect.y + rect.height * (0.2 + index * 0.3)),
    }));

    const gridStep = Math.max(1, Math.ceil(duration / 8));
    ctx.font = `${Math.max(9, Math.round(10 * scale))}px monospace`;
    for (let second = 0; second <= duration; second += gridStep) {
      const x = left + (second / duration) * trackWidth;
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(x, rect.y + Math.round(6 * scale));
      ctx.lineTo(x, rect.y + rect.height - Math.round(6 * scale));
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.fillText(`${second}s`, x + 3, rect.y + Math.round(18 * scale));
    }
    for (const lane of lanePositions) {
      ctx.fillStyle = palette.muted;
      ctx.font = `600 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
      ctx.fillText(lane.label, rect.x + Math.round(10 * scale), lane.y + Math.round(4 * scale));
      ctx.strokeStyle = palette.line;
      ctx.beginPath();
      ctx.moveTo(left, lane.y);
      ctx.lineTo(right, lane.y);
      ctx.stroke();
    }
    for (const hit of hits) {
      const lane = lanePositions.find((candidate) => candidate.id === hit.type);
      if (!lane) continue;
      const x = left + (Math.min(hit.at, duration) / duration) * trackWidth;
      const active = Math.abs(at - hit.at) < 0.12;
      ctx.beginPath();
      ctx.fillStyle = lane.color;
      ctx.globalAlpha = active ? 1 : 0.78;
      ctx.arc(x, lane.y, active ? Math.round(8 * scale) : Math.round(5 * scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const playheadX = left + Math.min(1, at / duration) * trackWidth;
    ctx.strokeStyle = '#f20d3d';
    ctx.lineWidth = Math.max(1, Math.round(2 * scale));
    ctx.beginPath();
    ctx.moveTo(playheadX, rect.y + Math.round(6 * scale));
    ctx.lineTo(playheadX, rect.y + rect.height - Math.round(6 * scale));
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = palette.muted;
    ctx.font = `${Math.max(10, Math.round(11 * scale))}px monospace`;
    ctx.fillText(`${at.toFixed(1)} / ${duration.toFixed(1)} sec`, rect.x + Math.round(10 * scale), rect.y + rect.height - Math.round(10 * scale));
  }

  async function drawPerformance(ctx, at, hits, duration, settings, meta) {
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
        notation: (target, rect) => engine.drawNotationPart(target, rect, at, notation),
        instrument: (target, rect) => drawInstrumentPart(target, rect, at, hits, duration, settings, palette),
      },
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

  /** The count-in frame: the Title band, and the count called out large. */
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
    const tokens = engine.countTokens(settings.countDisplay, meta.beats);
    const active = engine.currentCountToken(tokens, settings.countDisplay, meta, at);
    if (active < 0 || active >= tokens.length) return;
    ctx.save();
    ctx.fillStyle = '#f20d3d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(Math.min(width, height) * 0.22)}px Inter, system-ui, sans-serif`;
    ctx.fillText(tokens[active], width / 2, height / 2);
    ctx.restore();
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
   */
  async function createDrumAudio({ settings, hits, countIn, duration, meta }) {
    const model = SOUND_MODELS[settings.soundModel] || SOUND_MODELS.visual;
    if (model.level === 0) return null;
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error('This browser cannot synthesize the drum sound. Try a current version of Chrome, Edge, Safari, or Firefox.');

    const sampleRate = 48000;
    const total = countIn + duration;
    const context = new OfflineContext(2, Math.max(1, Math.ceil(total * sampleRate)), sampleRate);

    const soundGain = settings.soundVolume / 100;
    for (const hit of hits) {
      addStroke(context, hit.type, countIn + hit.at, soundGain, model);
    }

    if (settings.countEnabled) {
      const beatSeconds = (60 / Math.max(1, meta.bpm)) * (4 / Math.max(1, meta.beatType));
      const countGain = settings.countVolume / 100;
      for (let beat = 0; beat < meta.beats; beat += 1) {
        const at = beat * beatSeconds;
        if (at >= countIn) break;
        // The count is a woodblock: a bright click on every beat, the
        // downbeat higher, so the player hears where the bar starts.
        addStroke(context, 'hihat', at, countGain * 0.8, model);
        if (beat === 0) addStroke(context, 'snare', at, countGain * 0.35, model);
      }
    }

    return await context.startRendering();
  }

  function updatePlaybackControls() {
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
    try {
      const { hits: written, endQuarter, meta, source } = await getHits();
      setStatus(`Preparing ${source} · ${settings.ratio} · 0%`);
      notation = await engine.prepareNotationFor(musicXmlInput?.files?.[0], settings, ['title', 'notation', 'instrument']);
      if (notation?.error) {
        setStatus(`Notation could not be prepared: ${notation.error}`);
        notation = null;
      }
      const timed = timeHits(written, endQuarter, notation);
      const hits = timed.hits;
      // The Plan's length: the count-in the score is played in, then the
      // score's own length, with no cap of the Studio's.
      const countIn = countInSeconds(settings, meta);
      const duration = Math.max(1, timed.seconds);
      const segments = [];
      if (countIn > 0) {
        segments.push({ seconds: countIn, draw: (ctx, at) => drawCountIn(ctx, at, settings, meta) });
      }
      segments.push({ seconds: duration, draw: (ctx, at) => drawPerformance(ctx, at, hits, duration, settings, meta) });

      // The sound spans the count-in and the performance together, so it
      // rides on the first of those two segments and starts at zero.
      const audio = await createDrumAudio({ settings, hits, countIn, duration, meta });
      if (audio) segments[0].audio = audio;
      // The Plan's last part of the length: the Thank You clip. The engine
      // owns its address and shape, so the page only asks for it.
      const ending = await engine.thankYouSegment(settings.size.width, settings.size.height);
      if (ending) segments.push(ending);
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
      download.href = objectUrl;
      download.download = `msharing-${settings.ratio.replace(':', 'x')}-drum.${result.extension}`;
      download.hidden = false;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      updatePlaybackControls();
      // The status names the drum sound, because that is the part the
      // Sound Model controls. The Thank You clip carries its own sound
      // whether or not the drums do, so claiming the whole file is silent
      // would be a lie once the ending is attached.
      const audioNote = audio
        ? `${settings.soundModel} drum sound`
        : 'visual only · no drum sound';
      setStatus(`Rendered ${result.frames} frames · ${settings.ratio} · ${audioNote}`);
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
  playButton?.addEventListener('click', async () => {
    if (video.paused) {
      await video.play();
      playButton.textContent = '❚❚';
      stage.classList.add('is-playing');
    } else {
      video.pause();
      playButton.textContent = '▶';
      stage.classList.remove('is-playing');
    }
  });
  timeline?.addEventListener('input', () => { video.currentTime = Number(timeline.value) || 0; updatePlaybackControls(); });
  fullscreenButton?.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (stage.requestFullscreen) void stage.requestFullscreen();
  });
  settingsForm?.addEventListener('submit', (event) => event.preventDefault());
  [titleOne, titleOneColor, titleOneSize, titleTwo, titleTwoColor, titleTwoSize, drumBrand, drumModel, notationView, soundModel, soundVolume, countVoiceEnabled, countVoice, countVolume, countDisplay, videoColor, videoRatio].forEach((control) => {
    control?.addEventListener('input', syncControlState);
    control?.addEventListener('change', syncControlState);
  });
  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    setStatus(file ? `MusicXML selected: ${file.name}. Ready to generate.` : 'Choose a MusicXML file or use the default drum pattern.');
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
    };
    image.onerror = () => { URL.revokeObjectURL(object); setStatus('The selected logo could not be loaded.'); };
    image.src = object;
  });
  video.addEventListener('loadedmetadata', updatePlaybackControls);
  video.addEventListener('timeupdate', updatePlaybackControls);
  video.addEventListener('ended', () => { if (playButton) playButton.textContent = '▶'; stage.classList.remove('is-playing'); });
  window.addEventListener('pagehide', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, { once: true });

  logoImage = new Image();
  logoImage.src = DEFAULT_LOGO;
  syncControlState();
})();
