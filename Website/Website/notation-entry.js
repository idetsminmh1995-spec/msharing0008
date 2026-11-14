(() => {
  const input = document.querySelector('[data-notation-open-input]');
  const openAction = document.querySelector('[data-notation-open]');
  const createAction = document.querySelector('[data-notation-create]');
  const feedback = document.querySelector('[data-notation-feedback]');
  const editorUrl = 'notation-editor.html';
  const allowed = ['musicxml', 'xml', 'mxl'];
  const setFeedback = (message) => { feedback.textContent = message; feedback.hidden = !message; };
  const goToEditor = (intent) => { window.location.assign(`${editorUrl}?intent=${intent}`); };

  openAction.addEventListener('click', () => input.click());
  createAction.addEventListener('click', () => goToEditor('create'));
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