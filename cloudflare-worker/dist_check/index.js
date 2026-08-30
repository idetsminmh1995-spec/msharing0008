// cloudflare-worker/src/index.ts
//
// Serves the full Drum MIDI -> Video app from ONE Worker/domain:
//   - GET /                                serves the frontend app (HTML/JS)
//   - GET /api/drum-sets                   lists drum sets discovered in R2
//   - GET /api/drum-sets/:name/:aspect/manifest   lists that set's assets
//   - GET /assets/:name/:aspect/*file      streams the actual PNG from R2
//
// The frontend never talks to R2 directly -- it only calls this Worker
// (using relative URLs, since it's now served from the same origin).
//
// R2 key layout actually used:
//   drums/{drumSetName}/{aspect}/Drum Bg.png
//   drums/{drumSetName}/{aspect}/R{note}.png
//   drums/{drumSetName}/{aspect}/L{note}.png
// `aspect` is one of "16x9", "9x16", "1x1".
const R2_PREFIX = 'drums/';
const BACKGROUND_FILENAME = 'Drum Bg.png';
const VALID_ASPECTS = new Set(['16x9', '9x16', '1x1']);
function corsHeaders(request, env) {
    const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim());
    const origin = request.headers.get('Origin') ?? '';
    const allowOrigin = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0] ?? '*';
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };
}
function json(data, status, headers) {
    return new Response(JSON.stringify(data, null, 2), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
function errorResponse(message, status, headers) {
    return json({ error: message }, status, headers);
}
async function listDrumSets(bucket) {
    const names = new Set();
    let cursor;
    do {
        const result = await bucket.list({ prefix: R2_PREFIX, delimiter: '/', cursor });
        for (const prefix of result.delimitedPrefixes) {
            const parts = prefix.split('/').filter(Boolean);
            if (parts.length >= 2)
                names.add(parts[1]);
        }
        cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
    return [...names].sort();
}
async function listManifest(bucket, drumSet, aspect) {
    const prefix = `${R2_PREFIX}${drumSet}/${aspect}/`;
    const files = [];
    let hasBackground = false;
    let cursor;
    do {
        const result = await bucket.list({ prefix, cursor });
        for (const obj of result.objects) {
            const relative = obj.key.slice(prefix.length);
            if (!relative || relative.endsWith('/'))
                continue;
            if (relative === BACKGROUND_FILENAME)
                hasBackground = true;
            else
                files.push(relative);
        }
        cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
    return { hasBackground, files: files.sort() };
}
const APP_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Drum MIDI Canvas Preview — Real Assets</title>
<style>
  :root {
    --bg: #0f1117; --panel: #171a23; --panel-2: #1f2330; --border: #2a2f3d;
    --text: #e8e9ee; --text-dim: #8b90a3; --accent: #ff6b4a;
    --hand-r: #4ac8ff; --hand-l: #ff4a9e; --ok: #4aff9e; --err: #ff4a5e;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 20px; }
  .app { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: var(--text-dim); font-size: 13px; margin-bottom: 20px; }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 14px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  button, input, select { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 13px; }
  button { cursor: pointer; }
  button:hover:not(:disabled), select:hover { border-color: var(--accent); }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #1a0e0a; font-weight: 600; }
  input[type="text"] { flex: 1; min-width: 220px; font-family: ui-monospace, monospace; font-size: 12px; }
  input[type="range"] { flex: 1; min-width: 160px; accent-color: var(--accent); }
  label { font-size: 12px; color: var(--text-dim); }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .meta-row { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 12px; font-size: 12px; color: var(--text-dim); }
  .meta-row b { color: var(--text); }
  .canvas-wrap { display: flex; justify-content: center; background: #000; border-radius: 10px; overflow: hidden; }
  canvas { max-width: 100%; height: auto; display: block; }
  .status { font-size: 12px; padding: 8px 12px; border-radius: 8px; margin-top: 10px; }
  .status.ok { background: rgba(74,255,158,0.1); border: 1px solid var(--ok); color: var(--ok); }
  .status.err { background: rgba(255,74,94,0.12); border: 1px solid var(--err); color: var(--err); }
  .status.loading { background: rgba(139,144,163,0.12); border: 1px solid var(--border); color: var(--text-dim); }
  .asset-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip { font-size: 11px; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-dim); }
  .chip.have { border-color: var(--ok); color: var(--ok); }
  .chip.missing { border-color: var(--err); color: var(--err); opacity: 0.7; }
  .log-box { max-height: 180px; overflow-y: auto; font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: 12px; line-height: 1.7; }
  .log-row { display: flex; gap: 10px; padding: 2px 6px; border-radius: 4px; color: var(--text-dim); }
  .log-row .t { width: 60px; }
  .log-row .n { width: 90px; }
  .log-row .h-r { color: var(--hand-r); }
  .log-row .h-l { color: var(--hand-l); }
  .log-row .missing-tag { color: var(--err); font-size: 10px; }
  .log-row.current { background: var(--panel-2); color: var(--text); }
  .hidden { display: none !important; }
  code { background: var(--panel-2); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
<div class="app">
  <h1>Drum MIDI → Canvas Preview (real assets)</h1>
  <div class="subtitle">Pick a drum set and aspect ratio, then upload a MIDI file to preview and export your drum performance video.</div>

  <div class="panel">
    <div class="row">
      <div class="field">
        <label>Drum set</label>
        <select id="drumSetSelect" disabled><option>Loading…</option></select>
      </div>
      <div class="field">
        <label>Aspect ratio</label>
        <select id="aspectSelect" disabled>
          <option value="16x9">16:9</option>
          <option value="9x16">9:16</option>
          <option value="1x1">1:1</option>
        </select>
      </div>
    </div>
    <div id="connectionStatus" class="status loading hidden"></div>
    <div id="assetChips" class="asset-chips"></div>
  </div>

  <div class="panel">
    <div class="row">
      <input type="file" id="midiFile" accept=".mid,.midi" disabled />
      <button id="loadDemoBtn" disabled>Load Demo Pattern</button>
    </div>
    <div class="meta-row" id="metaRow">
      <span>BPM: <b id="bpmVal">–</b></span>
      <span>Time sig: <b id="tsVal">–</b></span>
      <span>Duration: <b id="durVal">–</b></span>
      <span>Notes: <b id="noteCountVal">–</b></span>
    </div>
  </div>

  <div class="panel">
    <div class="canvas-wrap">
      <canvas id="canvas" width="1280" height="720"></canvas>
    </div>
    <div class="row" style="margin-top:12px;">
      <button id="playBtn" disabled>▶ Play</button>
      <button id="pauseBtn" disabled>⏸ Pause</button>
      <input type="range" id="seekBar" min="0" max="1000" value="0" disabled />
      <span id="timeVal" style="font-variant-numeric: tabular-nums; font-size: 13px; color: var(--text-dim);">0.00s / 0.00s</span>
    </div>
  </div>

  <div class="panel">
    <div class="row">
      <button id="generateBtn" class="primary" disabled>⬇ Generate &amp; Download MP4</button>
      <span id="renderStatus" style="font-size:12px; color: var(--text-dim);"></span>
    </div>
    <div id="renderProgressWrap" class="hidden" style="margin-top:10px; background: var(--panel-2); border-radius: 6px; overflow: hidden; height: 8px;">
      <div id="renderProgressBar" style="height:100%; width:0%; background: var(--accent); transition: width 0.1s linear;"></div>
    </div>
    <div id="downloadWrap" class="hidden" style="margin-top:10px;"></div>
    <div class="hint" style="margin-top:8px;">V1: video only, no audio yet (audio synthesis is a planned fast-follow). Requires a browser with WebCodecs support (current Chrome/Edge). No ffmpeg.wasm fallback in this build yet — unsupported browsers get a clear error instead of a silent failure.</div>
  </div>

  <div class="panel">
    <div style="font-size:13px; margin-bottom:8px; color: var(--text-dim);">Timeline events</div>
    <div class="log-box" id="eventLog"></div>
  </div>
</div>

<script>
(function () {
  'use strict';

  const MAX_MIDI_DURATION_SECONDS = 10 * 60;
  const HIT_VISUAL_DURATION = 0.15; // seconds a hit stays composited — configurable per spec

  const GM_DRUM_NAMES = {
    35: 'Kick (Ac.)', 36: 'Kick', 37: 'Side Stick', 38: 'Snare', 39: 'Hand Clap',
    40: 'Snare (El.)', 41: 'Low Tom', 42: 'Closed Hi-Hat', 43: 'High Tom',
    44: 'Pedal Hi-Hat', 45: 'Low-Mid Tom', 46: 'Open Hi-Hat', 48: 'Hi-Mid Tom',
    49: 'Crash', 50: 'High Tom 2', 51: 'Ride', 55: 'Splash', 57: 'Crash 2', 59: 'Ride 2',
  };
  function noteLabel(n) { return GM_DRUM_NAMES[n] || ('Note ' + n); }

  // ===================================================================
  // Errors + binary MIDI parser + timeline builder
  // (identical logic to the earlier standalone preview / Node module)
  // ===================================================================
  class MidiParseError extends Error { constructor(m) { super(m); this.name = 'MidiParseError'; } }
  class MidiTooLongError extends MidiParseError {
    constructor(d, max) { super(\`MIDI duration (\${d.toFixed(1)}s) exceeds the maximum supported duration (\${max}s).\`); this.name = 'MidiTooLongError'; }
  }

  function parseMidiArrayBuffer(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    let pos = 0;
    function readStr(len) { let s = ''; for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(pos + i)); pos += len; return s; }
    function readUint32() { const v = view.getUint32(pos); pos += 4; return v; }
    function readUint16() { const v = view.getUint16(pos); pos += 2; return v; }
    function readUint8() { const v = view.getUint8(pos); pos += 1; return v; }
    function readVLQ() { let value = 0, byte; do { byte = readUint8(); value = (value << 7) | (byte & 0x7f); } while (byte & 0x80); return value; }

    if (arrayBuffer.byteLength < 14) throw new MidiParseError('File is too small to be a valid MIDI file.');
    let headerId; try { headerId = readStr(4); } catch (e) { throw new MidiParseError('Could not read MIDI header.'); }
    if (headerId !== 'MThd') throw new MidiParseError('Not a valid MIDI file (missing MThd header).');
    const headerLen = readUint32();
    readUint16(); // format
    const numTracks = readUint16();
    const division = readUint16();
    if (division & 0x8000) throw new MidiParseError('SMPTE time-division MIDI files are not supported.');
    const ppq = division;
    pos += Math.max(0, headerLen - 6);

    const rawEvents = [];
    try {
      for (let t = 0; t < numTracks; t++) {
        const chunkId = readStr(4);
        const chunkLen = readUint32();
        const chunkEnd = pos + chunkLen;
        if (chunkId !== 'MTrk') { pos = chunkEnd; continue; }
        let tick = 0, runningStatus = null;
        while (pos < chunkEnd) {
          const delta = readVLQ(); tick += delta;
          let statusByte = readUint8();
          if (statusByte < 0x80) {
            pos -= 1; statusByte = runningStatus;
            if (statusByte == null) throw new MidiParseError('Corrupted MIDI: running status used before any status byte was set.');
          } else runningStatus = statusByte;
          const eventType = statusByte & 0xf0, channel = statusByte & 0x0f;
          if (statusByte === 0xff) {
            const metaType = readUint8(); const len = readVLQ(); const dataStart = pos;
            if (metaType === 0x51 && len === 3) {
              const usPerQuarter = (readUint8() << 16) | (readUint8() << 8) | readUint8();
              rawEvents.push({ tick, type: 'tempo', usPerQuarter });
            } else if (metaType === 0x58 && len >= 2) {
              const numerator = readUint8(); const denomPower = readUint8();
              rawEvents.push({ tick, type: 'timeSignature', numerator, denominator: Math.pow(2, denomPower) });
            }
            pos = dataStart + len;
          } else if (statusByte === 0xf0 || statusByte === 0xf7) { const len = readVLQ(); pos += len; }
          else if (eventType === 0x80) { const note = readUint8(); readUint8(); rawEvents.push({ tick, type: 'noteOff', note, channel }); }
          else if (eventType === 0x90) {
            const note = readUint8(); const velocity = readUint8();
            rawEvents.push(velocity === 0 ? { tick, type: 'noteOff', note, channel } : { tick, type: 'noteOn', note, velocity, channel });
          } else if (eventType === 0xa0 || eventType === 0xb0 || eventType === 0xe0) pos += 2;
          else if (eventType === 0xc0 || eventType === 0xd0) pos += 1;
          else throw new MidiParseError(\`Corrupted or unsupported MIDI event (0x\${statusByte.toString(16)}) in track \${t}.\`);
        }
      }
    } catch (err) {
      if (err instanceof MidiParseError) throw err;
      throw new MidiParseError('Unexpected error while parsing MIDI bytes — the file is likely corrupted.');
    }

    if (!rawEvents.some((e) => e.type === 'noteOn')) throw new MidiParseError('This MIDI file contains no notes.');

    let tempoEvents = rawEvents.filter((e) => e.type === 'tempo').sort((a, b) => a.tick - b.tick);
    if (tempoEvents.length === 0 || tempoEvents[0].tick > 0) tempoEvents = [{ tick: 0, usPerQuarter: 500000 }, ...tempoEvents];
    const tempoChanges = [];
    { let cumTime = 0; for (let i = 0; i < tempoEvents.length; i++) { const ev = tempoEvents[i]; if (i > 0) { const prev = tempoEvents[i - 1]; cumTime += (ev.tick - prev.tick) * (prev.usPerQuarter / 1e6) / ppq; } tempoChanges.push({ tick: ev.tick, time: cumTime, bpm: 60000000 / ev.usPerQuarter }); } }
    function ticksToSeconds(tick) { let seg = tempoChanges[0]; for (const s of tempoChanges) { if (s.tick <= tick) seg = s; else break; } return seg.time + (tick - seg.tick) * (60 / seg.bpm) / ppq; }

    let tsEvents = rawEvents.filter((e) => e.type === 'timeSignature').sort((a, b) => a.tick - b.tick);
    if (tsEvents.length === 0 || tsEvents[0].tick > 0) tsEvents = [{ tick: 0, numerator: 4, denominator: 4 }, ...tsEvents];
    const timeSignatures = tsEvents.map((e) => ({ tick: e.tick, time: ticksToSeconds(e.tick), numerator: e.numerator, denominator: e.denominator }));

    const queues = new Map(); const notes = [];
    const noteEvents = rawEvents.filter((e) => e.type === 'noteOn' || e.type === 'noteOff').sort((a, b) => a.tick - b.tick);
    for (const ev of noteEvents) {
      const key = ev.channel * 1000 + ev.note;
      if (ev.type === 'noteOn') { if (!queues.has(key)) queues.set(key, []); queues.get(key).push({ tick: ev.tick, velocity: ev.velocity }); }
      else if (queues.has(key) && queues.get(key).length > 0) {
        const on = queues.get(key).shift();
        const onTime = ticksToSeconds(on.tick), offTime = ticksToSeconds(ev.tick);
        notes.push({ midiNote: ev.note, time: onTime, duration: Math.max(0, offTime - onTime), velocity: on.velocity / 127 });
      }
    }
    for (const [key, q] of queues) for (const on of q) notes.push({ midiNote: key % 1000, time: ticksToSeconds(on.tick), duration: 0.1, velocity: on.velocity / 127 });
    notes.sort((a, b) => a.time - b.time);

    const lastTick = Math.max(0, ...rawEvents.map((e) => e.tick));
    const durationSeconds = ticksToSeconds(lastTick);
    if (durationSeconds > MAX_MIDI_DURATION_SECONDS) throw new MidiTooLongError(durationSeconds, MAX_MIDI_DURATION_SECONDS);

    return { notes, tempoChanges, timeSignatures, durationSeconds, ppq };
  }

  function buildAnimationTimeline(notes) {
    const lastHandByNote = new Map();
    return [...notes].sort((a, b) => a.time - b.time).map((note) => {
      const prev = lastHandByNote.get(note.midiNote);
      const hand = prev === 'R' ? 'L' : 'R';
      lastHandByNote.set(note.midiNote, hand);
      return { time: note.time, midiNote: note.midiNote, hand, velocity: note.velocity, duration: note.duration };
    });
  }

  function loadDemoParsedMidi() {
    const notes = [
      { midiNote: 36, time: 0.000, duration: 0.10, velocity: 0.90 }, { midiNote: 42, time: 0.000, duration: 0.05, velocity: 0.60 },
      { midiNote: 42, time: 0.600, duration: 0.05, velocity: 0.50 }, { midiNote: 38, time: 1.200, duration: 0.10, velocity: 0.85 },
      { midiNote: 42, time: 1.200, duration: 0.05, velocity: 0.60 }, { midiNote: 36, time: 1.800, duration: 0.10, velocity: 0.95 },
      { midiNote: 42, time: 1.800, duration: 0.05, velocity: 0.55 }, { midiNote: 42, time: 2.400, duration: 0.05, velocity: 0.50 },
      { midiNote: 38, time: 3.000, duration: 0.10, velocity: 0.90 }, { midiNote: 42, time: 3.000, duration: 0.05, velocity: 0.60 },
      { midiNote: 36, time: 3.600, duration: 0.10, velocity: 0.90 }, { midiNote: 42, time: 3.600, duration: 0.05, velocity: 0.60 },
      { midiNote: 38, time: 4.029, duration: 0.10, velocity: 0.85 }, { midiNote: 42, time: 4.029, duration: 0.05, velocity: 0.55 },
      { midiNote: 42, time: 4.457, duration: 0.05, velocity: 0.50 },
    ];
    return {
      notes,
      tempoChanges: [{ tick: 0, time: 0, bpm: 100 }, { tick: 2880, time: 3.6, bpm: 140 }],
      timeSignatures: [{ tick: 0, time: 0, numerator: 3, denominator: 4 }],
      durationSeconds: 4.557,
      ppq: 480,
    };
  }

  // ===================================================================
  // DOM + app state
  // ===================================================================
  const els = {
    drumSetSelect: document.getElementById('drumSetSelect'), aspectSelect: document.getElementById('aspectSelect'),
    connectionStatus: document.getElementById('connectionStatus'),
    assetChips: document.getElementById('assetChips'),
    midiFile: document.getElementById('midiFile'), loadDemoBtn: document.getElementById('loadDemoBtn'),
    playBtn: document.getElementById('playBtn'), pauseBtn: document.getElementById('pauseBtn'),
    seekBar: document.getElementById('seekBar'), timeVal: document.getElementById('timeVal'),
    bpmVal: document.getElementById('bpmVal'), tsVal: document.getElementById('tsVal'),
    durVal: document.getElementById('durVal'), noteCountVal: document.getElementById('noteCountVal'),
    canvas: document.getElementById('canvas'), eventLog: document.getElementById('eventLog'),
    generateBtn: document.getElementById('generateBtn'), renderStatus: document.getElementById('renderStatus'),
    renderProgressWrap: document.getElementById('renderProgressWrap'), renderProgressBar: document.getElementById('renderProgressBar'),
    downloadWrap: document.getElementById('downloadWrap'),
  };
  const ctx = els.canvas.getContext('2d');
  const ASPECT_SIZES = { '16x9': [1280, 720], '9x16': [720, 1280], '1x1': [900, 900] };

  // Hardcoded for this deployment -- end users never see or configure this,
  // they just pick a drum set/aspect and upload a MIDI file.
  const WORKER_BASE = '';

  let currentDrumSet = null, currentAspect = '16x9';
  let backgroundImg = null;
  let noteAssets = new Map(); // midiNote -> { R: HTMLImageElement|null, L: HTMLImageElement|null }
  let availableNoteSet = new Set();

  let parsedMidi = null, timeline = [];
  let isPlaying = false, playStartPerf = 0, currentTime = 0, nextEventIndex = 0, rafId = null;
  let activeHits = []; // { midiNote, hand, until }

  function setStatus(kind, message) {
    els.connectionStatus.className = 'status ' + kind;
    els.connectionStatus.textContent = message;
    els.connectionStatus.classList.remove('hidden');
  }

  async function connectToWorker() {
    setStatus('loading', 'Connecting…');
    try {
      const res = await fetch(\`\${WORKER_BASE}/api/drum-sets\`);
      if (!res.ok) throw new Error(\`Worker responded \${res.status}\`);
      const data = await res.json();
      const sets = data.drumSets || [];
      els.drumSetSelect.innerHTML = sets.length
        ? sets.map((s) => \`<option value="\${s}">\${s}</option>\`).join('')
        : '<option value="">(no drum sets found)</option>';
      els.drumSetSelect.disabled = sets.length === 0;
      els.aspectSelect.disabled = sets.length === 0;
      if (sets.length === 0) {
        setStatus('err', 'Connected, but no drum sets are available yet in R2.');
        return;
      }
      setStatus('ok', \`Ready. \${sets.length} drum set(s) available.\`);
      await loadAssets(); // auto-load the first drum set + default aspect immediately
    } catch (err) {
      setStatus('err', \`Could not reach the asset server: \${err.message}. Please try again shortly.\`);
    }
  }

  els.drumSetSelect.addEventListener('change', loadAssets);
  els.aspectSelect.addEventListener('change', loadAssets);

  async function loadAssets() {
    currentDrumSet = els.drumSetSelect.value;
    currentAspect = els.aspectSelect.value;
    if (!currentDrumSet) return;

    const [w, h] = ASPECT_SIZES[currentAspect] || [1280, 720];
    els.canvas.width = w; els.canvas.height = h;

    setStatus('loading', \`Loading manifest for \${currentDrumSet} (\${currentAspect})…\`);
    
    try {
      const res = await fetch(\`\${WORKER_BASE}/api/drum-sets/\${encodeURIComponent(currentDrumSet)}/\${currentAspect}/manifest\`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || \`Worker responded \${res.status}\`);
      const manifest = await res.json();

      // Only load what's needed for this drum set + aspect (spec section 14) —
      // never prefetch every drum set / every aspect ratio.
      noteAssets = new Map();
      availableNoteSet = new Set();
      const loadPromises = [];

      if (manifest.hasBackground && manifest.backgroundFile) {
        backgroundImg = new Image();
        backgroundImg.crossOrigin = 'anonymous'; // required so the canvas isn't "tainted" -- otherwise VideoFrame/MP4 export fails
        loadPromises.push(new Promise((resolve) => {
          backgroundImg.onload = resolve;
          backgroundImg.onerror = resolve; // graceful — missing bg won't crash the app
          backgroundImg.src = \`\${WORKER_BASE}/assets/\${currentDrumSet}/\${currentAspect}/\${encodeURIComponent(manifest.backgroundFile)}\`;
        }));
      } else {
        backgroundImg = null;
      }

      const filePattern = /^([RL])(\\d+)\\.png$/i;
      for (const file of manifest.files || []) {
        const m = file.match(filePattern);
        if (!m) continue; // ignore anything that doesn't match the naming convention
        const hand = m[1].toUpperCase();
        const note = parseInt(m[2], 10);
        if (!noteAssets.has(note)) noteAssets.set(note, { R: null, L: null });
        availableNoteSet.add(note);
        const img = new Image();
        img.crossOrigin = 'anonymous'; // same reason as background — avoid a tainted canvas
        loadPromises.push(new Promise((resolve) => {
          img.onload = resolve; img.onerror = resolve;
          img.src = \`\${WORKER_BASE}/assets/\${currentDrumSet}/\${currentAspect}/\${encodeURIComponent(file)}\`;
        }));
        noteAssets.get(note)[hand] = img;
      }

      await Promise.all(loadPromises);
      setStatus('ok', \`Loaded \${currentDrumSet} (\${currentAspect}) — background: \${manifest.hasBackground ? 'yes' : 'no'}, note assets: \${[...availableNoteSet].sort((a,b)=>a-b).join(', ') || 'none'}.\`);
      renderAssetChips();
      drawFrame();

      els.midiFile.disabled = false;
      els.loadDemoBtn.disabled = false;
      updateGenerateAvailability();
    } catch (err) {
      setStatus('err', \`Failed to load assets: \${err.message}\`);
    } finally {
      
    }
  }

  function renderAssetChips() {
    if (!parsedMidi) { els.assetChips.innerHTML = ''; return; }
    const notesInMidi = [...new Set(parsedMidi.notes.map((n) => n.midiNote))].sort((a, b) => a - b);
    els.assetChips.innerHTML = notesInMidi
      .map((n) => {
        const have = availableNoteSet.has(n);
        return \`<span class="chip \${have ? 'have' : 'missing'}">\${noteLabel(n)} (#\${n}) \${have ? '✓' : '✗ no asset'}</span>\`;
      })
      .join('');
  }

  // ===================================================================
  // MIDI loading
  // ===================================================================
  function loadParsed(pm) {
    isPlaying = false; if (rafId) cancelAnimationFrame(rafId); rafId = null;
    parsedMidi = pm;
    timeline = buildAnimationTimeline(pm.notes);
    currentTime = 0; nextEventIndex = 0; activeHits = [];

    els.bpmVal.textContent = pm.tempoChanges.map((t) => t.bpm.toFixed(0)).join(' → ');
    els.tsVal.textContent = pm.timeSignatures.map((s) => \`\${s.numerator}/\${s.denominator}\`).join(', ');
    els.durVal.textContent = pm.durationSeconds.toFixed(2) + 's';
    els.noteCountVal.textContent = pm.notes.length;

    els.seekBar.max = Math.round(pm.durationSeconds * 1000);
    els.seekBar.value = 0; els.seekBar.disabled = false;
    els.playBtn.disabled = false; els.pauseBtn.disabled = false;

    renderAssetChips();
    renderEventLog();
    updateTimeDisplay();
    drawFrame();
    updateGenerateAvailability();
  }

  function updateGenerateAvailability() {
    els.generateBtn.disabled = !(parsedMidi && currentDrumSet);
  }

  els.loadDemoBtn.addEventListener('click', () => loadParsed(loadDemoParsedMidi()));
  els.midiFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      loadParsed(parseMidiArrayBuffer(buffer));
    } catch (err) {
      setStatus('err', err.message || String(err));
    }
  });

  function renderEventLog() {
    els.eventLog.innerHTML = timeline.map((e, i) => {
      const handClass = e.hand === 'R' ? 'h-r' : 'h-l';
      const missing = !availableNoteSet.has(e.midiNote);
      return \`<div class="log-row" data-idx="\${i}"><span class="t">\${e.time.toFixed(3)}s</span><span class="n">\${noteLabel(e.midiNote)}</span><span class="\${handClass}">\${e.hand}</span>\${missing ? '<span class="missing-tag">no asset</span>' : ''}</div>\`;
    }).join('');
  }
  function highlightLogAt(index) {
    const prev = els.eventLog.querySelector('.log-row.current'); if (prev) prev.classList.remove('current');
    const row = els.eventLog.querySelector(\`[data-idx="\${index}"]\`);
    if (row) { row.classList.add('current'); row.scrollIntoView({ block: 'nearest' }); }
  }

  // ===================================================================
  // Canvas compositing — background, then any currently-active hit layers.
  // Assets are drawn full-canvas at (0,0): they're pre-aligned/pre-composed,
  // so no dynamic positioning/scaling logic per spec section 5.
  // ===================================================================
  function drawFrame() {
    const w = els.canvas.width, h = els.canvas.height;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    if (backgroundImg && backgroundImg.complete && backgroundImg.naturalWidth) {
      ctx.drawImage(backgroundImg, 0, 0, w, h);
    }
    for (const hit of activeHits) {
      const assetSet = noteAssets.get(hit.midiNote);
      const img = assetSet ? assetSet[hit.hand] : null;
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, 0, 0, w, h);
      }
    }
  }

  function triggerEventsUpTo(t) {
    let lastIdx = -1;
    while (nextEventIndex < timeline.length && timeline[nextEventIndex].time <= t) {
      const ev = timeline[nextEventIndex];
      activeHits.push({ midiNote: ev.midiNote, hand: ev.hand, until: ev.time + HIT_VISUAL_DURATION });
      lastIdx = nextEventIndex;
      nextEventIndex++;
    }
    if (lastIdx >= 0) highlightLogAt(lastIdx);
  }

  function pruneActiveHits(t) { activeHits = activeHits.filter((h) => h.until > t); }

  function updateTimeDisplay() {
    els.timeVal.textContent = \`\${currentTime.toFixed(2)}s / \${parsedMidi.durationSeconds.toFixed(2)}s\`;
    els.seekBar.value = Math.round(currentTime * 1000);
  }

  function play() {
    if (isPlaying || !parsedMidi) return;
    isPlaying = true;
    playStartPerf = performance.now() - currentTime * 1000;
    rafId = requestAnimationFrame(loop);
  }
  function pause() { isPlaying = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  function loop() {
    if (!isPlaying) return;
    currentTime = (performance.now() - playStartPerf) / 1000;
    if (currentTime >= parsedMidi.durationSeconds) {
      currentTime = parsedMidi.durationSeconds;
      triggerEventsUpTo(currentTime); pruneActiveHits(currentTime);
      updateTimeDisplay(); drawFrame(); pause();
      return;
    }
    triggerEventsUpTo(currentTime); pruneActiveHits(currentTime);
    updateTimeDisplay(); drawFrame();
    rafId = requestAnimationFrame(loop);
  }

  els.playBtn.addEventListener('click', play);
  els.pauseBtn.addEventListener('click', pause);
  els.seekBar.addEventListener('input', () => {
    currentTime = Number(els.seekBar.value) / 1000;
    nextEventIndex = timeline.findIndex((e) => e.time > currentTime);
    if (nextEventIndex === -1) nextEventIndex = timeline.length;
    activeHits = [];
    if (isPlaying) playStartPerf = performance.now() - currentTime * 1000;
    updateTimeDisplay(); drawFrame();
    const prev = els.eventLog.querySelector('.log-row.current'); if (prev) prev.classList.remove('current');
  });

  // ===================================================================
  // Final video rendering — deterministic, frame-by-frame, using
  // WebCodecs (VideoEncoder) + mp4-muxer for the MP4 container.
  //
  // This is separate from the real-time preview above (spec section 15):
  // instead of driving frames off wall-clock time via requestAnimationFrame,
  // it steps through fixed timestamps (0, 1/fps, 2/fps, ...) so the output
  // always reproduces exactly what the timeline says, regardless of the
  // machine's rendering speed.
  // ===================================================================
  const RENDER_FPS = 30;

  function computeActiveHitsAt(t) {
    // Same rule as the live preview: a hit is "on screen" for
    // HIT_VISUAL_DURATION seconds after it fires.
    const active = [];
    for (const ev of timeline) {
      if (ev.time <= t && t < ev.time + HIT_VISUAL_DURATION) {
        active.push({ midiNote: ev.midiNote, hand: ev.hand });
      }
    }
    return active;
  }

  function renderFrameAt(renderCtx, w, h, t) {
    renderCtx.fillStyle = '#000'; renderCtx.fillRect(0, 0, w, h);
    if (backgroundImg && backgroundImg.complete && backgroundImg.naturalWidth) {
      renderCtx.drawImage(backgroundImg, 0, 0, w, h);
    }
    for (const hit of computeActiveHitsAt(t)) {
      const assetSet = noteAssets.get(hit.midiNote);
      const img = assetSet ? assetSet[hit.hand] : null;
      if (img && img.complete && img.naturalWidth) {
        renderCtx.drawImage(img, 0, 0, w, h);
      }
    }
  }

  els.generateBtn.addEventListener('click', async () => {
    if (!parsedMidi || !currentDrumSet) return;

    if (typeof VideoEncoder === 'undefined') {
      els.renderStatus.textContent = 'This browser does not support WebCodecs (VideoEncoder). Try current Chrome or Edge. (ffmpeg.wasm fallback not implemented in this build yet.)';
      els.renderStatus.style.color = 'var(--err)';
      return;
    }

    els.generateBtn.disabled = true;
    els.downloadWrap.classList.add('hidden');
    els.renderProgressWrap.classList.remove('hidden');
    els.renderStatus.style.color = 'var(--text-dim)';
    els.renderStatus.textContent = 'Loading encoder…';

    try {
      const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.mjs');

      const w = els.canvas.width, h = els.canvas.height;
      const totalFrames = Math.max(1, Math.ceil(parsedMidi.durationSeconds * RENDER_FPS));

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = w; renderCanvas.height = h;
      const renderCtx = renderCanvas.getContext('2d');

      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width: w, height: h },
        fastStart: 'in-memory',
      });

      const encoderErrors = [];
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => encoderErrors.push(e),
      });
      videoEncoder.configure({
        codec: 'avc1.42001f', // H.264 baseline — broadly compatible
        width: w,
        height: h,
        bitrate: 4_000_000,
        framerate: RENDER_FPS,
      });

      els.renderStatus.textContent = \`Rendering frame 0 / \${totalFrames}…\`;

      for (let i = 0; i < totalFrames; i++) {
        const t = i / RENDER_FPS;
        renderFrameAt(renderCtx, w, h, t);

        const frame = new VideoFrame(renderCanvas, { timestamp: Math.round((i / RENDER_FPS) * 1e6) });
        videoEncoder.encode(frame, { keyFrame: i % (RENDER_FPS * 2) === 0 });
        frame.close();

        if (encoderErrors.length) throw encoderErrors[0];

        if (i % 5 === 0 || i === totalFrames - 1) {
          const pct = Math.round(((i + 1) / totalFrames) * 100);
          els.renderProgressBar.style.width = pct + '%';
          els.renderStatus.textContent = \`Rendering frame \${i + 1} / \${totalFrames} (\${pct}%)…\`;
          // Let the UI repaint between frames instead of blocking the whole time.
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      els.renderStatus.textContent = 'Finalizing MP4…';
      await videoEncoder.flush();
      muxer.finalize();

      const { buffer } = muxer.target;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      els.downloadWrap.innerHTML = '';
      const link = document.createElement('a');
      link.href = url;
      link.download = \`\${currentDrumSet}-\${currentAspect}-drum-video.mp4\`;
      link.textContent = \`⬇ Download \${link.download} (\${(blob.size / 1024 / 1024).toFixed(2)} MB)\`;
      link.style.color = 'var(--ok)';
      link.style.fontWeight = '600';
      els.downloadWrap.appendChild(link);
      els.downloadWrap.classList.remove('hidden');

      els.renderStatus.style.color = 'var(--ok)';
      els.renderStatus.textContent = \`Done — \${totalFrames} frames rendered at \${RENDER_FPS}fps.\`;
    } catch (err) {
      els.renderStatus.style.color = 'var(--err)';
      els.renderStatus.textContent = 'Render failed: ' + (err && err.message ? err.message : String(err));
    } finally {
      els.generateBtn.disabled = false;
    }
  });

  // Initial blank frame
  drawFrame();

  // Auto-connect on load -- end users only see drum set/aspect pickers and
  // the MIDI upload field, never a "Connect" step.
  connectToWorker();
})();
</script>
</body>
</html>
`;
export default {
    async fetch(request, env) {
        const headers = corsHeaders(request, env);
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers });
        }
        const url = new URL(request.url);
        const segments = url.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
        // Serve the frontend app at the root.
        if (request.method === 'GET' && segments.length === 0) {
            return new Response(APP_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        if (request.method !== 'GET') {
            return errorResponse('Only GET requests are supported.', 405, headers);
        }
        try {
            if (segments[0] === 'api' && segments[1] === 'drum-sets' && segments.length === 2) {
                const drumSets = await listDrumSets(env.DRUM_ASSETS);
                return json({ drumSets }, 200, headers);
            }
            if (segments[0] === 'api' && segments[1] === 'drum-sets' && segments.length === 5 && segments[4] === 'manifest') {
                const [, , drumSet, aspect] = segments;
                if (!VALID_ASPECTS.has(aspect)) {
                    return errorResponse(`Unknown aspect ratio "${aspect}". Expected one of: ${[...VALID_ASPECTS].join(', ')}.`, 400, headers);
                }
                const manifest = await listManifest(env.DRUM_ASSETS, drumSet, aspect);
                if (!manifest.hasBackground && manifest.files.length === 0) {
                    return errorResponse(`Drum set "${drumSet}" (${aspect}) not found or has no assets.`, 404, headers);
                }
                return json({ drumSet, aspect, hasBackground: manifest.hasBackground, backgroundFile: manifest.hasBackground ? BACKGROUND_FILENAME : null, files: manifest.files }, 200, headers);
            }
            if (segments[0] === 'assets' && segments.length >= 4) {
                const [, drumSet, aspect, ...rest] = segments;
                if (!VALID_ASPECTS.has(aspect)) {
                    return errorResponse(`Unknown aspect ratio "${aspect}".`, 400, headers);
                }
                const filePath = rest.join('/');
                if (filePath.includes('..')) {
                    return errorResponse('Invalid asset path.', 400, headers);
                }
                const key = `${R2_PREFIX}${drumSet}/${aspect}/${filePath}`;
                const object = await env.DRUM_ASSETS.get(key);
                if (!object) {
                    return errorResponse(`Asset not found: ${filePath}`, 404, headers);
                }
                const respHeaders = new Headers(headers);
                object.writeHttpMetadata(respHeaders);
                respHeaders.set('Content-Type', object.httpMetadata?.contentType ?? 'image/png');
                respHeaders.set('Cache-Control', 'public, max-age=86400, immutable');
                respHeaders.set('ETag', object.httpEtag);
                return new Response(object.body, { status: 200, headers: respHeaders });
            }
            return errorResponse('Not found.', 404, headers);
        }
        catch (err) {
            console.error('Worker error:', err);
            return errorResponse('Internal error while accessing R2.', 500, headers);
        }
    },
};
