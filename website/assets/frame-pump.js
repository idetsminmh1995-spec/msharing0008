/**
 * frame-pump.js — one video frame per drawn frame, at a steady rate.
 *
 * Recording a canvas has two clocks in it, and they are the reason a
 * generated video judders:
 *
 * 1. `captureStream(fps)` samples the canvas on the BROWSER's timer,
 *    which drifts against whatever timer is doing the drawing. Every
 *    so often a drawn frame is sampled twice or not at all. Asking for
 *    `captureStream(0)` and calling `requestFrame()` after each draw
 *    removes that clock entirely: what is drawn is what is recorded,
 *    once, stamped at the moment it was drawn.
 *
 * 2. `setInterval(33)` guarded by a "busy" flag loses a whole period
 *    every time a frame runs long -- 33ms becomes 66ms, and the rate
 *    collapses well below the target. Measured on the metronome page
 *    before this existed: 22.4fps for a 30fps request, with gaps from
 *    28ms to 42ms. The pump instead aims at fixed target times and
 *    ticks faster than it draws, so a late frame is picked up at the
 *    next opportunity rather than at the next period.
 *
 * The ticks come from a Worker, because a hidden tab throttles its own
 * timers to about one a second -- which would turn a take the person
 * left running in another tab into a slideshow. A worker's timers are
 * not throttled that way, and the worker does nothing but post an
 * empty message, so it costs nothing.
 */
(function () {
  /** All the worker does is tick. Inlined so the page stays one file. */
  const TICKER_SOURCE =
    'let id = null;' +
    'onmessage = (e) => {' +
    '  if (id !== null) { clearInterval(id); id = null; }' +
    '  if (e.data && e.data.every > 0) id = setInterval(() => postMessage(0), e.data.every);' +
    '};';

  function makeTicker(everyMs, onTick) {
    try {
      const url = URL.createObjectURL(new Blob([TICKER_SOURCE], { type: 'text/javascript' }));
      const worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = onTick;
      worker.postMessage({ every: everyMs });
      return {
        stop() {
          worker.postMessage({ every: 0 });
          worker.terminate();
        },
      };
    } catch (err) {
      // No workers (a file:// page, a locked-down embed): the main
      // thread's timer still works, it just throttles in a hidden tab.
      const timer = setInterval(onTick, everyMs);
      return {
        stop() {
          clearInterval(timer);
        },
      };
    }
  }

  /**
   * A stream of this canvas, and the call that commits one frame to it.
   *
   * `commit` is a no-op on a browser with no `requestFrame`, where the
   * stream is timed the old way instead -- a judder is better than a
   * blank video.
   */
  function captureCanvas(canvas, fps) {
    try {
      const stream = canvas.captureStream(0);
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.requestFrame === 'function') {
        return { stream, commit: () => track.requestFrame() };
      }
      for (const t of stream.getTracks()) t.stop();
    } catch (err) {
      /* fall through to the timed capture */
    }
    return { stream: canvas.captureStream(fps), commit: () => {} };
  }

  /**
   * Runs `draw` at `fps` until `stop()`, committing each drawn frame.
   *
   * `draw` may be async; it is never re-entered. It is handed the
   * frame's target time in milliseconds since the pump started, so a
   * caller that wants an even cadence has one, and one that would
   * rather read a real clock can ignore it.
   */
  function start(canvas, fps, draw) {
    const captured = captureCanvas(canvas, fps);
    const every = 1000 / fps;
    let stopped = false;
    let busy = false;
    let frame = 0;
    let drawn = 0;
    let stoppedAt = null;
    const startedAt = performance.now();

    // Ticking at a quarter of the frame interval, not at the frame
    // interval: a draw that overruns is then picked up within 8ms
    // instead of waiting out a whole 33ms period.
    const ticker = makeTicker(Math.max(4, every / 4), async () => {
      if (stopped || busy) return;
      const now = performance.now() - startedAt;
      if (now < frame * every) return;
      // Caught up past several targets (a long stall, a hidden tab on
      // a browser without workers): skip to the current one rather
      // than drawing a burst of frames nobody waited for.
      frame = Math.max(frame + 1, Math.floor(now / every) + 1);
      busy = true;
      try {
        await draw(now);
        if (!stopped) {
          captured.commit();
          drawn += 1;
        }
      } catch (err) {
        console.error('Frame pump: a frame failed to draw.', err);
      } finally {
        busy = false;
      }
    });

    return {
      stream: captured.stream,
      /** Frames committed, and the rate they were committed at. */
      count: () => drawn,
      fps: () => {
        // Frozen at stop(): the caller reads this from the recorder's
        // own stop handler, and the wait for that must not be counted
        // as time the pump spent not drawing.
        const seconds = ((stoppedAt ?? performance.now()) - startedAt) / 1000;
        return seconds > 0 ? drawn / seconds : 0;
      },
      stop() {
        stopped = true;
        stoppedAt = performance.now();
        ticker.stop();
      },
    };
  }

  window.FramePump = { start };
})();
