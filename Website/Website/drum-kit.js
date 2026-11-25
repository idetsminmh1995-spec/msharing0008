/**
 * The drum kit's pictures, fetched from R2 and drawn into the video frame.
 *
 * R2 holds one folder per kit, per frame ratio:
 *
 *   drums/{Brand}/{Model}/{ratio}/Drum Bg.png     the kit itself
 *   drums/{Brand}/{Model}/{ratio}/R38.png         a hand's stick, right side
 *   drums/{Brand}/{Model}/{ratio}/L38.png         a hand's stick, left side
 *   drums/{Brand}/{Model}/{ratio}/36.png          a foot's pedal
 *
 * The number is the General MIDI percussion note, so which picture lights
 * is decided by the note the score writes -- and, for hands, by which hand
 * the sticking engine says plays it. Nothing here is downloaded and
 * stored: the browser fetches the PNGs from the bucket directly, which is
 * why the bucket answers with `Access-Control-Allow-Origin: *` and the
 * images can be drawn onto a canvas that is then encoded.
 */
(() => {
  const R2_BASE = 'https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev/drums';

  /**
   * The kits the bucket held when this file was written. The bucket's own
   * `manifest.json` is the authority; this table is only the fallback used
   * when the bucket does not answer with one, and `manifestState()` says
   * which of the two a render used.
   */
  const BUILT_IN_KITS = {
    'RolandDrums/VAD716': { brand: 'RolandDrums', brandLabel: 'Roland', model: 'VAD716', label: 'Roland VAD716' },
    'MSDrums/MS Drum 1': { brand: 'MSDrums', brandLabel: 'M Sharing', model: 'MS Drum 1', label: 'M Sharing Drum 1' },
    'MSDrums/MS Drum 2': { brand: 'MSDrums', brandLabel: 'M Sharing', model: 'MS Drum 2', label: 'M Sharing Drum 2' },
  };

  const MANIFEST_FILE = 'manifest.json';

  const RATIO_PATHS = { '16:9': '16x9', '1:1': '1x1', '9:16': '9x16' };
  // Every ratio is its own picture set: Main Plan §၁၃.၁ forbids stretching
  // one ratio's art into another, so there is no fallback between folders.
  const BACKGROUND_FILE = 'Drum Bg.png';

  /** The live kit list: the built-in table until the bucket's manifest answers. */
  const KITS = { ...BUILT_IN_KITS };

  /** What the kit list came from, and why, so a page can say it out loud. */
  let manifestState = { source: 'built-in', error: null, kits: Object.keys(KITS) };

  const manifestUrl = () => `${R2_BASE}/${MANIFEST_FILE}`;

  /** The manifest is read once per page; a rebuild must not re-download it. */
  let manifestRequest = null;

  /**
   * Reads the bucket's own kit list.
   *
   * Main Plan §၁၀ makes the manifest the authority: a kit uploaded to R2
   * has to reach the video without a code change, and a picture that is
   * expected but absent has to be reported rather than skipped in silence.
   * A bucket that answers with no manifest keeps the built-in list and
   * records why, so the page can say the list may be incomplete.
   */
  const loadManifest = ({ reload = false } = {}) => {
    if (reload || !manifestRequest) manifestRequest = readManifest();
    return manifestRequest;
  };

  const readManifest = async () => {
    try {
      const response = await fetch(manifestUrl(), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`manifest request failed (${response.status})`);
      const manifest = await response.json();
      const listed = Array.isArray(manifest?.kits) ? manifest.kits : [];
      if (listed.length === 0) throw new Error('the manifest lists no kits');
      const next = {};
      for (const entry of listed) {
        const brand = String(entry?.brand ?? '').trim();
        const model = String(entry?.model ?? '').trim();
        if (!brand || !model) continue;
        next[`${brand}/${model}`] = {
          brand,
          brandLabel: entry.brandLabel ? String(entry.brandLabel) : brand,
          model,
          label: entry.label ? String(entry.label) : `${brand} ${model}`,
          background: entry.background ? String(entry.background) : BACKGROUND_FILE,
          ...(Array.isArray(entry.ratios) ? { ratios: entry.ratios.map(String) } : {}),
          // `hits` names the stroke pictures a ratio folder holds, so a kit
          // that names them differently is read from the bucket rather than
          // guessed at from the note number.
          ...(entry.hits && typeof entry.hits === 'object' ? { hits: entry.hits } : {}),
        };
      }
      if (Object.keys(next).length === 0) throw new Error('the manifest names no usable kit');
      for (const key of Object.keys(KITS)) delete KITS[key];
      Object.assign(KITS, next);
      manifestState = { source: 'manifest', error: null, kits: Object.keys(KITS) };
    } catch (error) {
      // A manifest that will not answer leaves the built-in table behind,
      // including after an earlier manifest had replaced it: the list a
      // page shows must never be the one from a manifest that is gone.
      for (const key of Object.keys(KITS)) delete KITS[key];
      Object.assign(KITS, BUILT_IN_KITS);
      manifestState = {
        source: 'built-in',
        error: String(error?.message || error),
        kits: Object.keys(KITS),
      };
    }
    return manifestState;
  };

  /** How long one hit's picture stays lit. A stroke is an instant, not a pose. */
  const HIT_VISIBLE_S = 0.11;

  const imageCache = new Map();

  const kitUrl = (kit, ratioPath, file) => {
    const folder = kit.split('/').map(encodeURIComponent).join('/');
    return `${R2_BASE}/${folder}/${ratioPath}/${encodeURIComponent(file)}`;
  };

  /** A picture, decoded once. A file that will not load resolves to null. */
  const loadImage = (href) => {
    if (imageCache.has(href)) return imageCache.get(href);
    const promise = new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = href;
    });
    imageCache.set(href, promise);
    return promise;
  };

  /**
   * The drawn extent of a kit picture, in image pixels.
   *
   * Every picture in a kit is a full 1920x1080 overlay and most of that is
   * transparent, so fitting the raw frame to a band would shrink the kit to
   * a sliver. Measuring the ink is what lets the band be filled. The alpha
   * is read at a quarter scale: a bounding box does not need every pixel,
   * and 2 million reads per kit would be a visible stall.
   */
  const measureInk = (image) => {
    const scale = 0.25;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (data[(y * canvas.width + x) * 4 + 3] <= 10) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < 0) return { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    const toFull = 1 / scale;
    return {
      x: left * toFull,
      y: top * toFull,
      width: (right + 1 - left) * toFull,
      height: (bottom + 1 - top) * toFull,
    };
  };

  /**
   * A kit's pictures for one frame ratio: the background from that ratio's
   * own folder.
   *
   * Main Plan §၁၃.၁ gives every ratio its own picture set and forbids
   * stretching one ratio's art into another, so a kit that carries only
   * landscape art cannot serve a square or portrait video: the failure is
   * reported with the ratios the kit does carry, and the export stops
   * rather than shipping a picture that was never drawn for the frame.
   */
  const loadArt = async (kit, ratio) => {
    const entry = KITS[kit];
    if (!entry) throw new RangeError(`No drum kit is known by the name "${kit}".`);
    const wanted = RATIO_PATHS[ratio];
    if (!wanted) throw new RangeError(`No drum pictures are stored for the ratio "${ratio}".`);
    // A manifest may say which ratio folders a kit actually carries; that
    // list is a fact about the bucket, so it is believed over the guess
    // that every kit has all three.
    const declared = entry.ratios?.length ? entry.ratios : null;
    if (declared && !declared.includes(wanted)) {
      throw new Error(`The kit "${entry.label}" has no ${wanted} pictures; it carries ${declared.join(', ')}.`);
    }
    const background = await loadImage(kitUrl(kit, wanted, entry.background || BACKGROUND_FILE));
    if (background) {
      return { kit, ratioPath: wanted, background, ink: measureInk(background) };
    }
    throw new Error(`The kit "${entry.label}" has no background picture in R2 for ${wanted}.`);
  };

  /**
   * Every GM note number that means the SAME drum, so a kit that uploaded
   * `36.png` still lights when the score writes 35.
   *
   * Read from the sticking engine's own GM map rather than hand-listed
   * here: 35/36 are both a kick because that map says so, and a second copy
   * of that knowledge would drift from it.
   */
  const gmAliases = () => {
    const api = window.StickingEngine;
    if (!api) return new Map();
    const byInstrument = new Map();
    for (const [note, instrument] of Object.entries(api.GM_DRUM_MAP)) {
      const group = byInstrument.get(instrument);
      if (group === undefined) byInstrument.set(instrument, [Number(note)]);
      else group.push(Number(note));
    }
    const aliases = new Map();
    for (const group of byInstrument.values()) {
      for (const note of group) aliases.set(note, group);
    }
    return aliases;
  };

  /**
   * The filenames that could hold this stroke's picture, best first.
   *
   * A hand needs its side -- the picture is a stick coming from the left or
   * the right -- so `R38.png` / `L38.png`. A foot does not: one pedal
   * picture serves either foot, and a kit that uploaded a plain `36.png` is
   * not missing anything. Hands therefore prefer the sided name and feet
   * the bare number, each falling back to the other so a kit named the
   * other way still lights.
   */
  const imageCandidates = (limb, midiNote, aliases, hits) => {
    const side = limb === 'RH' || limb === 'RF' ? 'R' : 'L';
    const isFoot = limb === 'RF' || limb === 'LF';
    // A manifest that lists its stroke pictures is believed over the naming
    // rule: the bucket is what the video has to match.
    const listed = (note) => (hits?.[note] ?? hits?.[String(note)]) || null;
    const forNote = (note) => {
      const declared = listed(note);
      if (declared) return [].concat(declared);
      return isFoot
        ? [`${note}.png`, `${side}${note}.png`]
        : [`${side}${note}.png`, `${note}.png`];
    };
    const candidates = forNote(midiNote);
    for (const alias of aliases.get(midiNote) ?? []) {
      if (alias !== midiNote) candidates.push(...forNote(alias));
    }
    return candidates;
  };

  /**
   * Which limb plays each note, in the order the notes were given.
   *
   * The engine's ids count from one per run, so the counter is reset first
   * and `src_00000007` read back as index 6: without the reset a second
   * render would start where the first left off and every stroke would
   * light the wrong drum. Returns `null` entries when the engine is
   * unavailable, so a caller can fall back to a side-less guess.
   */
  const solveLimbs = (noteList) => {
    const api = window.StickingEngine;
    if (!api || noteList.length === 0) return noteList.map(() => null);
    api.resetIdCounter();
    const engine = new api.Engine({
      style: api.drummerStyle({ dominantHand: 'right' }),
      intent: api.performanceIntent(),
      genre: 'rock',
      seed: 42,
      mode: 'HIGH',
    });
    const performance = engine.run({ noteList });
    const limbs = noteList.map(() => null);
    for (const event of performance.events) {
      const index = Number.parseInt(String(event.sourceId).split('_')[1], 10) - 1;
      if (Number.isFinite(index) && index >= 0 && index < limbs.length) {
        limbs[index] = event.limb;
      }
    }
    return limbs;
  };

  /**
   * Loads every picture the given strokes need, and returns the ones that
   * exist. A stroke whose picture is missing in this kit is dropped rather
   * than drawn with a neighbour's picture: a wrong drum is worse than no
   * drum. The dropped stroke is marked, so the caller can say which notes
   * went unlit instead of leaving the hole silent.
   */
  const loadHitImages = async (art, strokes) => {
    const aliases = gmAliases();
    const hits = KITS[art.kit]?.hits ?? null;
    const wanted = new Map();
    for (const stroke of strokes) {
      const names = imageCandidates(stroke.limb ?? 'RH', stroke.note, aliases, hits);
      wanted.set(stroke, names);
    }
    const resolved = new Map();
    await Promise.all([...wanted].map(async ([stroke, names]) => {
      for (const name of names) {
        const image = await loadImage(kitUrl(art.kit, art.ratioPath, name));
        if (image) {
          resolved.set(stroke, { image, name });
          return;
        }
      }
      stroke.missing = true;
    }));
    return resolved;
  };

  /** The notes this kit has no picture for, as one line for the status. */
  const missingSummary = (strokes) => {
    const notes = [...new Set(strokes.filter((stroke) => stroke.missing).map((stroke) => stroke.note))];
    if (notes.length === 0) return null;
    return `no picture for note${notes.length === 1 ? '' : 's'} ${notes.join(', ')}`;
  };

  /**
   * Paints the kit and lights the strokes happening at `at`.
   *
   * The band is filled by the kit's INK, not by the 1920x1080 frame it is
   * stored in, so the drums are as large as the band allows and the
   * transparent margin around them is not counted as part of the picture.
   * The hit overlays share the frame's coordinate space, so they are drawn
   * with the background's own transform.
   */
  const draw = (ctx, rect, art, at, strokes, resolved) => {
    const { ink, background } = art;
    const scale = Math.min(rect.width / ink.width, rect.height / ink.height);
    const dx = rect.x + rect.width / 2 - (ink.x + ink.width / 2) * scale;
    const dy = rect.y + rect.height / 2 - (ink.y + ink.height / 2) * scale;
    ctx.drawImage(background, dx, dy,
      background.naturalWidth * scale, background.naturalHeight * scale);

    for (const stroke of strokes) {
      if (Math.abs(at - stroke.at) > HIT_VISIBLE_S) continue;
      const hit = resolved.get(stroke);
      if (!hit) continue;
      ctx.drawImage(hit.image, dx, dy,
        hit.image.naturalWidth * scale, hit.image.naturalHeight * scale);
    }
  };

  window.DrumKit = {
    R2_BASE,
    KITS,
    BUILT_IN_KITS,
    RATIO_PATHS,
    BACKGROUND_FILE,
    MANIFEST_FILE,
    HIT_VISIBLE_S,
    loadManifest,
    manifestState: () => manifestState,
    loadArt,
    loadHitImages,
    missingSummary,
    imageCandidates,
    solveLimbs,
    draw,
    kitUrl,
  };
})();
