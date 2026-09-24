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
 *
 * And it SETTLES ON A RATE THE MACHINE CAN ACTUALLY KEEP. Asking for
 * more frames than the encoder can take does not produce a faster
 * video, it produces a worse one: measured on one machine, a 30fps
 * request kept 82% of its frames and landed at an uneven 19fps, while
 * asking that same machine for 25 kept 99% and held a steady 25. So
 * the pump watches the rate it is really achieving and steps down a
 * rung when it cannot hold the one it asked for. It never steps back
 * up: a rate that wobbles between two values looks worse than either.
 */
(function () {
  /** The rates worth settling on, fastest first. */
  const RUNGS = [30, 25, 20, 15];

  /**
   * What the last take on this page settled on.
   *
   * A second take starts there rather than paying for the same
   * discovery again -- the machine has not changed since the first.
   */
  let learnedFps = null;

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
    let target = Math.min(fps, learnedFps ?? fps);
    let every = 1000 / target;
    let stopped = false;
    let busy = false;
    let frame = 0;
    let drawn = 0;
    let stoppedAt = null;
    const startedAt = performance.now();

    // The window the rate is judged over. Long enough that one slow
    // frame is not a verdict, short enough that a take does not spend
    // its opening seconds at a rate it cannot hold.
    const CHECK_MS = 1500;
    let windowStart = startedAt;
    let windowFrames = 0;

    /**
     * Steps down when the achieved rate falls short of the asked-for
     * one, and re-bases the frame clock so the new rate starts clean
     * rather than trying to catch up on frames at the old one.
     */
    function reconsider(nowAbsolute) {
      if (nowAbsolute - windowStart < CHECK_MS) return;
      const achieved = (windowFrames * 1000) / (nowAbsolute - windowStart);
      windowStart = nowAbsolute;
      windowFrames = 0;
      if (achieved >= target * 0.9) return;
      const next = RUNGS.find((r) => r < target * 0.95);
      if (next === undefined) return;
      target = next;
      every = 1000 / target;
      learnedFps = target;
      frame = Math.floor((nowAbsolute - startedAt) / every) + 1;
    }

    // Ticking at a quarter of the frame interval, not at the frame
    // interval: a draw that overruns is then picked up within 8ms
    // instead of waiting out a whole 33ms period.
    const ticker = makeTicker(Math.max(4, 1000 / RUNGS[0] / 4), async () => {
      if (stopped || busy) return;
      const absolute = performance.now();
      const now = absolute - startedAt;
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
          windowFrames += 1;
        }
      } catch (err) {
        console.error('Frame pump: a frame failed to draw.', err);
      } finally {
        busy = false;
        reconsider(performance.now());
      }
    });

    return {
      stream: captured.stream,
      /** Frames committed, the rate achieved, and the rate asked for. */
      count: () => drawn,
      target: () => target,
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
