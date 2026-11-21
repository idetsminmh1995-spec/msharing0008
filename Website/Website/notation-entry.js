/**
 * The Notation Lab entry page: the Create wizard and the file handoff.
 *
 * "Create" no longer jumps straight into an empty editor. It opens the
 * three-step setup MuseScore puts in front of a new score -- instruments,
 * then key/time/tempo/measures, then a review -- and hands the answer to
 * the editor, which builds the MusicXML and opens it. See
 * `notation-newscore.js` for the catalog and the MusicXML it writes.
 */
(() => {
  const input = document.querySelector('[data-notation-open-input]');
  const openAction = document.querySelector('[data-notation-open]');
  const createAction = document.querySelector('[data-notation-create]');
  const feedback = document.querySelector('[data-notation-feedback]');
  const editorUrl = 'notation-editor.html';
  const allowed = ['musicxml', 'xml', 'mxl'];
  const setFeedback = (message) => { feedback.textContent = message; feedback.hidden = !message; };
  const goToEditor = (intent) => { window.location.assign(`${editorUrl}?intent=${intent}`); };

  // ---- new-score wizard --------------------------------------------------

  const NewScore = window.NotationNewScore;
  const wizard = document.querySelector('[data-newscore]');
  const panel = document.querySelector('[data-newscore-panel]');
  const heading = document.querySelector('[data-newscore-heading]');
  const statusLine = document.querySelector('[data-newscore-status]');
  const groupsHost = document.querySelector('[data-newscore-groups]');
  const previewHost = document.querySelector('[data-newscore-preview]');
  const summaryHost = document.querySelector('[data-newscore-summary]');
  const titleInput = document.querySelector('[data-newscore-title-input]');
  const composerInput = document.querySelector('[data-newscore-composer-input]');
  const keySelect = document.querySelector('[data-newscore-key]');
  const timeSelect = document.querySelector('[data-newscore-time]');
  const tempoInput = document.querySelector('[data-newscore-tempo]');
  const measuresInput = document.querySelector('[data-newscore-measures]');
  const backButton = document.querySelector('[data-newscore-back]');
  const nextButton = document.querySelector('[data-newscore-next]');
  const dismissers = [...document.querySelectorAll('[data-newscore-dismiss]')];
  const stepHosts = [...document.querySelectorAll('[data-newscore-step]')];
  const STEPS = ['instruments', 'setup', 'review'];
  const HEADINGS = {
    instruments: 'Choose instruments',
    setup: 'Score setup',
    review: 'Review',
  };
  const NEXT_LABELS = { instruments: 'Continue', setup: 'Continue', review: 'Create score' };
  const selected = new Set(NewScore ? NewScore.DEFAULT_SPEC.instrumentIds : ['piano']);
  let step = 0;
  let lastFocused = null;

  const setStatus = (message) => { statusLine.textContent = message; statusLine.hidden = !message; };

  function buildInstrumentGroups() {
    const groups = new Map();
    for (const instrument of NewScore.INSTRUMENTS) {
      if (!groups.has(instrument.group)) groups.set(instrument.group, []);
      groups.get(instrument.group).push(instrument);
    }
    groupsHost.textContent = '';
    for (const [group, instruments] of groups) {
      const section = document.createElement('section');
      section.className = 'newscore__group';
      const label = document.createElement('h3');
      label.className = 'newscore__group-label';
      label.textContent = group;
      const list = document.createElement('div');
      list.className = 'newscore__chips';
      for (const instrument of instruments) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'newscore__chip';
        chip.dataset.instrumentId = instrument.id;
        chip.setAttribute('aria-pressed', String(selected.has(instrument.id)));
        chip.textContent = instrument.name;
        chip.addEventListener('click', () => toggleInstrument(instrument));
        list.append(chip);
      }
      section.append(label, list);
      groupsHost.append(section);
    }
  }

  function toggleInstrument(instrument) {
    if (selected.has(instrument.id)) {
      // One instrument must remain: a score with no part has nothing to
      // write into, so the last chip cannot be switched off.
      if (selected.size === 1) {
        setStatus('Keep at least one instrument.');
        return;
      }
      selected.delete(instrument.id);
    } else {
      selected.add(instrument.id);
    }
    setStatus('');
    syncInstrumentChips();
    syncPreview();
  }

  function syncInstrumentChips() {
    for (const chip of groupsHost.querySelectorAll('[data-instrument-id]')) {
      chip.setAttribute('aria-pressed', String(selected.has(chip.dataset.instrumentId)));
    }
  }

  function currentSpec() {
    return NewScore.normaliseSpec({
      title: titleInput.value,
      composer: composerInput.value,
      instrumentIds: [...selected],
      key: keySelect.value,
      time: timeSelect.value,
      tempo: tempoInput.value,
      measures: measuresInput.value,
    });
  }

  /** A plain-language restatement of the choices, so the review step needs
   *  no musical knowledge to check. */
  function syncPreview() {
    if (!previewHost) return;
    const summary = NewScore.summarise(currentSpec());
    const count = summary.instrumentNames.length;
    previewHost.textContent =
      `${count} ${count === 1 ? 'instrument' : 'instruments'} · ` +
      `${summary.keyLabel} · ${summary.time} · ${summary.tempo} BPM · ${summary.measures} bars`;
  }

  function fillChoices() {
    keySelect.textContent = '';
    for (const [value, label] of Object.entries(NewScore.KEY_LABELS)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      keySelect.append(option);
    }
    keySelect.value = NewScore.DEFAULT_SPEC.key;
    timeSelect.textContent = '';
    for (const time of NewScore.TIME_SIGNATURES) {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      timeSelect.append(option);
    }
    timeSelect.value = NewScore.DEFAULT_SPEC.time;
  }

  function syncStep() {
    const name = STEPS[step];
    stepHosts.forEach((host) => { host.hidden = host.dataset.newscoreStep !== name; });
    heading.textContent = HEADINGS[name];
    backButton.hidden = step === 0;
    nextButton.textContent = NEXT_LABELS[name];
    setStatus('');
    if (name === 'setup') {
      syncPreview();
      titleInput.focus();
    } else if (name === 'review') {
      renderSummary();
      nextButton.focus();
    } else {
      const firstChip = groupsHost.querySelector('[data-instrument-id]');
      if (firstChip) firstChip.focus();
    }
  }

  function renderSummary() {
    const summary = NewScore.summarise(currentSpec());
    const rows = [
      ['Instruments', summary.instrumentNames.join(', ')],
      ['Title', summary.title],
      ['Key', summary.keyLabel],
      ['Time signature', summary.time],
      ['Tempo', `${summary.tempo} BPM`],
      ['Measures', String(summary.measures)],
    ];
    if (summary.composer) rows.splice(2, 0, ['Composer', summary.composer]);
    summaryHost.textContent = '';
    for (const [term, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      summaryHost.append(dt, dd);
    }
  }

  function openWizard() {
    if (!NewScore) return;
    lastFocused = document.activeElement;
    step = 0;
    wizard.hidden = false;
    document.body.classList.add('is-newscore-open');
    syncStep();
    nextButton.focus();
  }

  function closeWizard() {
    wizard.hidden = true;
    document.body.classList.remove('is-newscore-open');
    setStatus('');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function finish() {
    const spec = currentSpec();
    try {
      sessionStorage.setItem('notation-lab-new-score', JSON.stringify(spec));
    } catch {
      setFeedback('This browser could not store the score setup. Please try again.');
      return;
    }
    goToEditor('new');
  }

  function advance() {
    if (STEPS[step] === 'instruments' && selected.size === 0) {
      setStatus('Choose at least one instrument.');
      return;
    }
    if (step === STEPS.length - 1) {
      finish();
      return;
    }
    step += 1;
    syncStep();
  }

  function retreat() {
    if (step === 0) return;
    step -= 1;
    syncStep();
  }

  if (NewScore && wizard) {
    buildInstrumentGroups();
    fillChoices();
    nextButton.addEventListener('click', advance);
    backButton.addEventListener('click', retreat);
    for (const dismisser of dismissers) dismisser.addEventListener('click', closeWizard);
    for (const control of [keySelect, timeSelect, tempoInput, measuresInput]) {
      control.addEventListener('input', syncPreview);
      control.addEventListener('change', syncPreview);
    }
    wizard.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeWizard();
        return;
      }
      // Keep focus inside the dialog while it is modal.
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll('button, input, select')]
        .filter((element) => !element.hidden && !element.disabled && element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  openAction.addEventListener('click', () => input.click());
  createAction.addEventListener('click', () => {
    if (NewScore && wizard) openWizard();
    else goToEditor('create');
  });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(extension || '')) {
      setFeedback('Choose a .musicxml, .xml, or .mxl file.');
      input.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setFeedback('This file is too large for the browser handoff. Please open it from the Editor.');
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      sessionStorage.setItem('notation-lab-pending-file', JSON.stringify({ name: file.name, type: file.type, data: btoa(binary) }));
      goToEditor('open');
    } catch {
      setFeedback('The selected file could not be prepared for the Editor.');
    }
  });
})();