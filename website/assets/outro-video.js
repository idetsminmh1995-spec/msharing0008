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
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length === 0) continue;
        const blob = new Blob([bytes], { type: res.headers.get('content-type') || 'video/mp4' });
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
        found = {
          video,
          key,
          seconds: Number.isFinite(video.duration) ? video.duration : 0,
          /**
           * The clip's own sound, as a buffer.
           *
           * A rendered video mixes its audio offline, so the clip
           * cannot simply be played into a live graph -- its samples
           * have to be handed over. Decoded from a COPY of the bytes,
           * because decodeAudioData takes ownership of what it is
           * given and a second take would find an empty buffer.
           */
          async audio(ctx) {
            try {
              return await ctx.decodeAudioData(bytes.slice().buffer);
            } catch (err) {
              console.error('The Thank You clip has no sound this browser can read:', err);
              return null;
            }
          },
        };
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
    if (!(w > 0) || !(h > 0)) return false;
    // A <video> with no current data draws NOTHING, and a frame
    // blacked out first and not drawn on is a black frame in the
    // finished video. Rather than that, leave what is already on the
    // canvas: the take's last frame held for a moment reads as a
    // pause, where black reads as a fault.
    if (source.readyState !== undefined && source.readyState < 2) return false;
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / w, canvas.height / h);
    const dw = w * scale;
    const dh = h * scale;
    ctx2d.drawImage(source, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    return true;
  }

  // -----------------------------------------------------------------
  // Reading the clip a FRAME AT A TIME.
  //
  // The clip used to be played and photographed: the renderer waited
  // out each frame's worth of wall-clock time and copied whatever the
  // <video> happened to be showing. Two things go wrong with that,
  // and both of them were being seen.
  //
  // It JUDDERS: the encoder's own backpressure can hold the loop past
  // the moment a frame was due, so the same picture is copied twice
  // and the next one is missed. Nothing in the video says which frame
  // was wanted, so nothing can put it right.
  //
  // And it can come out as SOUND ONLY: the audio is decoded from the
  // file and mixed exactly, but the picture depends on `play()`
  // succeeding and on the element having data at the instant it is
  // read. A clip whose audio track outlasts its video track plays
  // past its last frame the same way. Either leaves the ending heard
  // but not seen.
  //
  // So the clip is never played. Each frame is SEEKED to and drawn:
  // the element is asked for the frame at 0, 1/30, 2/30... and waited
  // for. It is exact, it cannot drift, and it does not care how busy
  // the encoder is.
  // -----------------------------------------------------------------

  /** A seek that cannot hang a render: after this, the last good frame stands. */
  const SEEK_TIMEOUT_MS = 2000;
  /** How long to wait for the seeked frame to actually be presented. */
  const PRESENT_TIMEOUT_MS = 80;
  /** The rate a caller that does not say is assumed to be rendering at. */
  const DEFAULT_FPS = 30;

  function seekTo(video, seconds) {
    if (video.readyState >= 2 && Math.abs(video.currentTime - seconds) < 1e-3) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        video.removeEventListener('seeked', finish);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, SEEK_TIMEOUT_MS);
      video.addEventListener('seeked', finish);
      try {
        video.currentTime = seconds;
      } catch (err) {
        finish();
      }
    });
  }

  /**
   * Waits for the frame to be on screen, not merely decoded.
   *
   * `seeked` says the data is there; `requestVideoFrameCallback` says
   * the picture has actually been put up, which is the one drawImage
   * will copy. Capped, because a browser without it -- or a frame
   * identical to the one already showing -- must not stall the render.
   */
  function presented(video) {
    if (typeof video.requestVideoFrameCallback !== 'function') return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, PRESENT_TIMEOUT_MS);
      video.requestVideoFrameCallback(finish);
    });
  }

  /**
   * The clip's frame at a moment, ready to draw.
   *
   * Held just inside the end: a clip whose audio runs a beat longer
   * than its pictures is asked for a frame it does not have, and the
   * honest answer is its last one rather than black.
   */
  async function frameAt(video, seconds) {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const last = duration > 0 ? Math.max(0, duration - 0.001) : seconds;
    await seekTo(video, Math.max(0, Math.min(seconds, last)));
    await presented(video);
  }

  /**
   * The clip as a segment of a render: its own length, its own sound,
   * and one seeked frame per frame of video.
   *
   * Built here rather than on each page, so all four pages end the
   * same way and there is one place this has to be right.
   */
  function outroSegment(outro, audio, fps) {
    const rate = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS;
    // Each frame is asked for in the MIDDLE of its own slice of time,
    // not on the edge of it. A clip's frames begin where its container
    // says they begin -- rounded to the millisecond in a WebM, to a
    // timescale tick in an MP4 -- and a frame boundary asked for
    // exactly lands on either side of itself: one frame comes out
    // twice and the next never comes out at all. That is what the
    // judder was. Half a frame in, nothing rounds far enough to
    // matter.
    const middle = 0.5 / rate;
    return {
      seconds: outro.seconds,
      ...(audio ? { audio } : {}),
      onStart: async () => {
        // Never played: muted, paused, and parked on its first frame,
        // so the very first frame of the ending is the right one.
        outro.video.muted = true;
        try {
          outro.video.pause();
        } catch (err) {
          /* an element that will not pause was not playing */
        }
        await frameAt(outro.video, middle);
      },
      draw: async (ctx, at) => {
        await frameAt(outro.video, at + middle);
        drawCover(ctx, ctx.canvas, outro.video);
      },
    };
  }

  window.OutroVideo = {
    outroKeys,
    sharedUrl,
    loadOutro,
    outroSource,
    drawCover,
    frameAt,
    outroSegment,
  };
})();
