(() => {
  const page = document.querySelector('[data-notation-page]');
  if (!page || page.querySelector('[data-editor-panel]')) return;

  const storageKey = 'msharing-notation-lab-draft-v1';
  const state = {
    title: 'Untitled score',
    composer: '',
    tempo: 100,
    beats: 4,
    beatType: 4,
    notes: [],
    selected: 0,
  };

  const escapeXml = (value) => String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
  const pitchParts = (pitch) => {
    const match = /^([A-G])([#b]?)([0-8])$/.exec(pitch);
    if (!match) return { step: 'C', alter: 0, octave: 4 };
    return { step: match[1], alter: match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0, octave: Number(match[3]) };
  };
  const durationMap = { whole: 16, half: 8, quarter: 4, eighth: 2, sixteenth: 1 };
  const durationLabel = { whole: 'Whole', half: 'Half', quarter: 'Quarter', eighth: 'Eighth', sixteenth: '16th' };

  const panel = document.createElement('aside');
  panel.className = 'notation-editor';
  panel.dataset.editorPanel = '';
  panel.setAttribute('aria-label', 'Score editor');
  panel.innerHTML = `
    <div class="notation-editor__head">
      <div><p class="notation-editor__eyebrow">SCORE BUILDER</p><h2>Compose</h2></div>
      <span class="notation-editor__count" data-editor-count>0 notes</span>
    </div>
    <div class="notation-editor__meta">
      <label>Title<input data-editor-title maxlength="80" value="Untitled score" /></label>
      <label>Composer<input data-editor-composer maxlength="80" placeholder="Optional" /></label>
      <label>Tempo<input data-editor-tempo type="number" min="30" max="280" value="100" /></label>
      <label>Meter<select data-editor-meter><option value="4/4">4/4</option><option value="3/4">3/4</option><option value="6/8">6/8</option></select></label>
    </div>
    <div class="notation-editor__entry">
      <div class="notation-editor__section"><span>Note entry</span><kbd>N</kbd></div>
      <div class="notation-editor__choices" role="group" aria-label="Pitch">
        ${['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'].map((pitch, index) => `<button type="button" data-pitch="${pitch}" class="${index === 0 ? 'is-selected' : ''}">${pitch}</button>`).join('')}
      </div>
      <div class="notation-editor__duration" role="group" aria-label="Duration">
        ${Object.entries(durationLabel).map(([key, label]) => `<button type="button" data-duration="${key}" class="${key === 'quarter' ? 'is-selected' : ''}">${label}</button>`).join('')}
      </div>
      <div class="notation-editor__actions">
        <button type="button" class="notation-editor__primary" data-add-note>Add note</button>
        <button type="button" data-add-rest>Add rest</button>
      </div>
    </div>
    <ol class="notation-editor__events" data-editor-events aria-label="Score events"></ol>
    <div class="notation-editor__footer">
      <button type="button" data-undo disabled>Undo</button><button type="button" data-clear disabled>Clear</button>
      <button type="button" data-export disabled>Export MusicXML</button>
      <button type="button" class="notation-editor__primary" data-preview disabled>Preview score</button>
    </div>`;

  page.querySelector('.notation-stage')?.before(panel);
  const $ = (selector) => panel.querySelector(selector);
  const events = $('[data-editor-events]');
  let currentPitch = 'C4';
  let currentDuration = 'quarter';

  const persist = () => localStorage.setItem(storageKey, JSON.stringify(state));
  const setStatus = (message) => {
    const status = page.querySelector('[data-status]');
    if (status) { status.textContent = message; status.classList.add('is-visible'); }
  };
  const buildXml = () => {
    const measureNotes = state.notes.length ? state.notes : [{ rest: true, duration: 'whole' }];
    const body = measureNotes.map((note) => {
      const duration = durationMap[note.duration];
      if (note.rest) return `<note><rest/><duration>${duration}</duration><type>${note.duration}</type></note>`;
      const part = pitchParts(note.pitch);
      return `<note><pitch><step>${part.step}</step>${part.alter ? `<alter>${part.alter}</alter>` : ''}<octave>${part.octave}</octave></pitch><duration>${duration}</duration><type>${note.duration}</type></note>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="4.0"><work><work-title>${escapeXml(state.title || 'Untitled score')}</work-title></work><identification><creator type="composer">${escapeXml(state.composer)}</creator></identification><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><time><beats>${state.beats}</beats><beat-type>${state.beatType}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${state.tempo}</per-minute></metronome></direction-type><sound tempo="${state.tempo}"/></direction>${body}</measure></part></score-partwise>`;
  };
  const render = () => {
    $('[data-editor-count]').textContent = `${state.notes.length} note${state.notes.length === 1 ? '' : 's'}`;
    events.replaceChildren(...state.notes.map((note, index) => {
      const item = document.createElement('li');
      item.className = index === state.selected ? 'is-selected' : '';
      item.innerHTML = `<button type="button" data-select="${index}"><strong>${note.rest ? 'Rest' : note.pitch}</strong><small>${durationLabel[note.duration]}</small></button><button type="button" data-remove="${index}" aria-label="Remove event ${index + 1}">×</button>`;
      return item;
    }));
    ['[data-undo]','[data-clear]','[data-export]','[data-preview]'].forEach((selector) => { $(selector).disabled = state.notes.length === 0; });
    persist();
  };
  const addEvent = (rest = false) => {
    state.notes.push({ rest, pitch: currentPitch, duration: currentDuration });
    state.selected = state.notes.length - 1;
    render();
  };
  const syncMeta = () => {
    state.title = $('[data-editor-title]').value.trim() || 'Untitled score';
    state.composer = $('[data-editor-composer]').value.trim();
    state.tempo = Math.max(30, Math.min(280, Number($('[data-editor-tempo]').value) || 100));
    const [beats, beatType] = $('[data-editor-meter]').value.split('/').map(Number);
    state.beats = beats; state.beatType = beatType; persist();
  };
  const preview = () => {
    syncMeta();
    const xml = buildXml();
    const file = new File([xml], `${state.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'notation'}.musicxml`, { type: 'application/vnd.recordare.musicxml+xml' });
    const input = page.querySelector('[data-file-input]');
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus('Score preview updated.');
  };
  const exportXml = () => {
    syncMeta();
    const blob = new Blob([buildXml()], { type: 'application/vnd.recordare.musicxml+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'notation'}.musicxml`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('MusicXML exported.');
  };
  const restore = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || !Array.isArray(saved.notes)) return;
      Object.assign(state, saved);
      $('[data-editor-title]').value = state.title;
      $('[data-editor-composer]').value = state.composer;
      $('[data-editor-tempo]').value = state.tempo;
      $('[data-editor-meter]').value = `${state.beats}/${state.beatType}`;
    } catch { localStorage.removeItem(storageKey); }
  };

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.pitch) { currentPitch = button.dataset.pitch; panel.querySelectorAll('[data-pitch]').forEach((item) => item.classList.toggle('is-selected', item === button)); }
    if (button.dataset.duration) { currentDuration = button.dataset.duration; panel.querySelectorAll('[data-duration]').forEach((item) => item.classList.toggle('is-selected', item === button)); }
    if (button.matches('[data-add-note]')) addEvent();
    if (button.matches('[data-add-rest]')) addEvent(true);
    if (button.dataset.remove !== undefined) { state.notes.splice(Number(button.dataset.remove), 1); state.selected = Math.max(0, state.notes.length - 1); render(); }
    if (button.dataset.select !== undefined) { state.selected = Number(button.dataset.select); render(); }
    if (button.matches('[data-undo]')) { state.notes.pop(); state.selected = Math.max(0, state.notes.length - 1); render(); }
    if (button.matches('[data-clear]')) { state.notes = []; state.selected = 0; render(); setStatus('Draft cleared.'); }
    if (button.matches('[data-preview]')) preview();
    if (button.matches('[data-export]')) exportXml();
  });
  panel.querySelectorAll('input,select').forEach((field) => field.addEventListener('change', syncMeta));
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,select,textarea')) return;
    if (event.key.toLowerCase() === 'n') { event.preventDefault(); addEvent(); }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); addEvent(true); }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); preview(); }
    if (event.key === 'Backspace' && state.notes.length) { event.preventDefault(); state.notes.pop(); render(); }
  });
  restore();
  render();
})();