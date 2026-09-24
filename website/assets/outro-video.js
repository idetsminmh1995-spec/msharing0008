/**
 * outro-video.js — the Thank You clip that closes a generated video.
 *
 * The clip lives in R2 beside the count voices, under `Thank Video/`,
 * in one file per aspect, instrument and frame colour:
 *
 *   Thank Video/16x9/drum/16x9 Black Drum.mp4
 *   Thank Video/9x16/metronome/9x16 White Metronome.mp4
 *
 * Both video pages append it the same way, so the naming rule and the
 * two traps below live here rather than being written out twice.
 *
 * The traps:
 *
 * 1. The clip is fetched as a BLOB and played from an object URL, not
 *    pointed at with a cross-origin src. A <video> streaming from
 *    another origin taints the canvas it is drawn onto -- which stops
 *    the recording dead -- and wants Range requests the Worker does not
 *    answer. A blob is same-origin, seekable, and already downloaded
 *    when the take reaches it.
 * 2. `createMediaElementSource` may be called ONCE per element for the
 *    life of the page. The node is cached on the element, so a second
 *    take still has sound.
 */
(function () {
  const ROOT = 'Thank Video';

  /** "drum" -> "Drum": the file name capitalises what the folder does not. */
  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /**
   * The keys to try, best first.
   *
   * A bucket that has only some of the nine-odd combinations should
   * still close a video, so the list walks outward: this instrument in
   * this colour, then its other colour, then the drum clip of the same
   * shape, and finally the one clip known to exist. The caller takes
   * the first that answers.
   */
  function outroKeys(options) {
    const aspect = options.aspect || '16x9';
    const kind = options.kind || 'drum';
    const style = options.style === 'white' ? 'White' : 'Black';
    const other = style === 'White' ? 'Black' : 'White';
    const wanted = [
      [aspect, kind, style],
      [aspect, kind, other],
      [aspect, 'drum', style],
      [aspect, 'drum', 'Black'],
      ['16x9', 'drum', 'Black'],
    ];
    const keys = [];
    for (const [a, k, s] of wanted) {
      const key = `${ROOT}/${a}/${k}/${a} ${s} ${titleCase(k)}.mp4`;
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }

  function sharedUrl(apiBase, key) {
    return `${apiBase}/assets/shared/` + key.split('/').map(encodeURIComponent).join('/');
  }

  /** key -> {video, key, seconds} | null, so a second take reuses the download. */
  const cache = new Map();

  /**
   * Downloads the first clip that exists and returns it ready to play.
   *
   * Resolves to null when the bucket has none of them -- an ending
   * nobody uploaded is not a failed video, and the caller says so and
   * writes the take without it.
   */
  async function loadOutro(apiBase, options) {
    const keys = outroKeys(options);
    const cacheKey = keys.join('|');
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    let found = null;
    for (const key of keys) {
      try {
        const res = await fetch(sharedUrl(apiBase, key));
        if (!res.ok) continue;
        const blob = await res.blob();
        if (blob.size === 0) continue;
        const video = document.createElement('video');
        video.preload = 'auto';
        video.playsInline = true;
        video.src = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = () => reject(new Error('not playable'));
          setTimeout(resolve, 8000);
        });
        if (!(video.videoWidth > 0)) continue;
        found = { video, key, seconds: Number.isFinite(video.duration) ? video.duration : 0 };
        break;
      } catch (err) {
        /* try the next candidate */
      }
    }
    cache.set(cacheKey, found);
    return found;
  }

  /** The tap into the recording, made once per element. */
  function outroSource(ctx, video) {
    if (!video.__outroSource) {
      video.__outroSource = ctx.createMediaElementSource(video);
    }
    return video.__outroSource;
  }

  /** `object-fit: cover`, so a clip of the wrong shape fills rather than letterboxes. */
  function drawCover(ctx2d, canvas, source) {
    const w = source.videoWidth || source.naturalWidth || 0;
    const h = source.videoHeight || source.naturalHeight || 0;
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    if (!(w > 0) || !(h > 0)) return;
    const scale = Math.max(canvas.width / w, canvas.height / h);
    const dw = w * scale;
    const dh = h * scale;
    ctx2d.drawImage(source, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }

  window.OutroVideo = { outroKeys, sharedUrl, loadOutro, outroSource, drawCover };
})();
