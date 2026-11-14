(() => {
  const workspace = document.querySelector('[data-editor-workspace]');
  if (!workspace) return;
  const engine = window.NotationEngine;
  const fileInput = document.querySelector('[data-file-input]');
  const openButton = document.querySelector('[data-editor-open]');
  const canvas = document.querySelector('[data-score-canvas]');
  const empty = document.querySelector('[data-editor-empty]');
  const title = document.querySelector('[data-editor-title]');
  const status = document.querySelector('[data-editor-status]');
  const zoomOutput = document.querySelector('[data-editor-zoom]');
  const zoomIn = document.querySelector('[data-editor-zoom-in]');
  const zoomOut = document.querySelector('[data-editor-zoom-out]');
  let zoom = 100;

  const announce = (message) => { status.textContent = message; };
  const setZoom = (value) => {
    zoom = Math.min(200, Math.max(50, value));
    canvas.style.zoom = `${zoom}%`;
    zoomOutput.textContent = `${zoom}%`;
    zoomIn.disabled = zoom >= 200;
    zoomOut.disabled = zoom <= 50;
  };
  const renderXml = (xml, filename) => {
    if (!engine?.renderFromMusicXml) { announce('Notation Engine is unavailable.'); return; }
    try {
      const result = engine.renderFromMusicXml(xml, { config: { layout: { mode: 'page' } } });
      const documentSvg = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
      const svg = documentSvg.documentElement;
      if (svg.localName !== 'svg' || documentSvg.querySelector('parsererror')) throw new Error('The score renderer returned invalid SVG.');
      canvas.replaceChildren(document.importNode(svg, true));
      canvas.hidden = false; empty.hidden = true;
      title.textContent = filename.replace(/\.[^.]+$/, '') || 'Untitled score';
      const visibleDiagnostics = (result.diagnostics || []).filter((item) => item.code !== 'UNKNOWN_ELEMENT' || !/octave-shift/.test(item.message || ''));
      announce(visibleDiagnostics.length ? `Opened with ${visibleDiagnostics.length} diagnostic${visibleDiagnostics.length === 1 ? '' : 's'}.` : 'Score ready.');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The score could not be opened.');
    }
  };
  const openFile = async (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['musicxml', 'xml', 'mxl'].includes(extension || '')) { announce('Choose a .musicxml, .xml, or .mxl file.'); return; }
    announce('Opening score…');
    try {
      let xml = '';
      if (extension === 'mxl') {
        const result = engine.unzipMxl(new Uint8Array(await file.arrayBuffer()), window.DOMParser);
        if (!result.xmlText) throw new Error(result.diagnostics?.[0]?.message || 'The MXL score could not be read.');
        xml = result.xmlText;
      } else xml = await file.text();
      renderXml(xml, file.name);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The score could not be opened.');
    }
  };
  openButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => openFile(fileInput.files?.[0]));
  zoomIn.addEventListener('click', () => setZoom(zoom + 10));
  zoomOut.addEventListener('click', () => setZoom(zoom - 10));
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); fileInput.click(); }
    if ((event.ctrlKey || event.metaKey) && event.key === '=') { event.preventDefault(); setZoom(zoom + 10); }
    if ((event.ctrlKey || event.metaKey) && event.key === '-') { event.preventDefault(); setZoom(zoom - 10); }
  });
  setZoom(100);
})();