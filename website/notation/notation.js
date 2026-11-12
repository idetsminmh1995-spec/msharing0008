(() => {
  'use strict';

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const PX_PER_STAFF_SPACE = 20;
  const controls = {
    uploadPanel: document.getElementById('uploadPanel'),
    fileInput: document.getElementById('scoreFile'),
    status: document.getElementById('statusMessage'),
    resultPanel: document.getElementById('resultPanel'),
    fileName: document.getElementById('fileName'),
    fileMeta: document.getElementById('fileMeta'),
    sheet: document.getElementById('scoreSheet'),
    stage: document.getElementById('scoreStage'),
    zoom: document.getElementById('zoomRange'),
    zoomValue: document.getElementById('zoomValue'),
    download: document.getElementById('downloadSvg'),
    clear: document.getElementById('clearScore'),
    diagnosticCount: document.getElementById('diagnosticCount'),
    diagnosticList: document.getElementById('diagnosticList'),
    diagnosticsPanel: document.getElementById('diagnosticsPanel'),
    engineVersion: document.getElementById('engineVersion'),
  };

  let parsedScore = null;
  let safeSvg = null;
  let currentFile = null;
  let currentView = 'page';
  let baseSvgWidth = 0;
  let baseSvgHeight = 0;

  controls.engineVersion.textContent =
    typeof window.NotationEngine !== 'undefined' && window.NotationEngine.ENGINE_VERSION
      ? window.NotationEngine.ENGINE_VERSION
      : 'unavailable';

  function setStatus(message, kind = 'neutral') {
    controls.status.textContent = message;
    controls.status.dataset.kind = kind;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  }

  function getViewConfig(view) {
    if (view === 'landscape') {
      return {
        layout: { mode: 'page' },
        page: { pageWidth: 42, pageHeight: 30 },
      };
    }
    if (view === 'continuous') return { layout: { mode: 'scroll' } };
    return {
      layout: { mode: 'page' },
      page: { pageWidth: 30, pageHeight: 42 },
    };
  }

  function safeSvgFromString(markup) {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    if (doc.querySelector('parsererror') || !doc.documentElement || doc.documentElement.localName !== 'svg') {
      throw new Error('The notation engine returned invalid SVG markup.');
    }
    const svg = document.importNode(doc.documentElement, true);
    const forbidden = new Set(['script', 'foreignObject', 'iframe', 'object', 'embed']);
    const candidates = [svg, ...svg.querySelectorAll('*')];
    for (const element of candidates) {
      if (forbidden.has(element.localName.toLowerCase())) {
        element.remove();
        continue;
      }
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        if (name.startsWith('on')) {
          element.removeAttribute(attribute.name);
        } else if ((name === 'href' || name === 'xlink:href') && value && !value.startsWith('#')) {
          element.removeAttribute(attribute.name);
        } else if (/javascript:|data:text\/html/i.test(value) || (name === 'style' && /url\s*\(/i.test(value))) {
          element.removeAttribute(attribute.name);
        }
      }
    }
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return svg;
  }

  function renderDiagnostics(diagnostics) {
    const items = Array.isArray(diagnostics) ? diagnostics : [];
    controls.diagnosticCount.textContent = String(items.length);
    controls.diagnosticList.replaceChildren();
    if (items.length === 0) {
      const li = document.createElement('li');
      li.dataset.severity = 'info';
      li.textContent = 'No engine diagnostics for this score.';
      controls.diagnosticList.append(li);
      return;
    }
    for (const item of items) {
      const li = document.createElement('li');
      li.dataset.severity = item.severity || 'warning';
      const code = document.createElement('code');
      code.textContent = item.code || 'ENGINE_DIAGNOSTIC';
      li.append(code, document.createTextNode(item.message || 'No diagnostic message provided.'));
      controls.diagnosticList.append(li);
    }
  }

  function applyZoom() {
    const percent = Number(controls.zoom.value);
    controls.zoomValue.value = `${percent}%`;
    controls.zoomValue.textContent = `${percent}%`;
    if (safeSvg && baseSvgWidth > 0) {
      const scale = percent / 100;
      safeSvg.style.width = `${Math.round(baseSvgWidth * scale)}px`;
      safeSvg.style.height = `${Math.round(baseSvgHeight * scale)}px`;
    }
  }

  function renderCurrentView() {
    if (!parsedScore) return;
    if (typeof window.NotationEngine === 'undefined') {
      setStatus('Notation Engine could not be loaded. Refresh the page and try again.', 'error');
      return;
    }
    try {
      const rendered = window.NotationEngine.renderParsedMusicXml(parsedScore, {
        config: getViewConfig(currentView),
      });
      const svg = safeSvgFromString(rendered.svg);
      const viewBox = svg.viewBox.baseVal;
      if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) {
        throw new Error('The rendered score has no usable SVG viewBox.');
      }
      baseSvgWidth = viewBox.width * PX_PER_STAFF_SPACE;
      baseSvgHeight = viewBox.height * PX_PER_STAFF_SPACE;
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.width = `${baseSvgWidth}px`;
      svg.style.height = `${baseSvgHeight}px`;
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `Rendered MusicXML score in ${currentView} view`);
      safeSvg = svg;
      controls.sheet.replaceChildren(svg);
      applyZoom();
      renderDiagnostics(rendered.diagnostics);
      const warnings = (rendered.diagnostics || []).length;
      setStatus(
        warnings === 0
          ? 'Score rendered successfully with no engine diagnostics.'
          : `Score rendered. The engine reported ${warnings} diagnostic${warnings === 1 ? '' : 's'} — open Engine diagnostics below.`,
        warnings === 0 ? 'success' : 'warning',
      );
    } catch (error) {
      console.error('Notation rendering failed:', error);
      controls.sheet.replaceChildren();
      safeSvg = null;
      setStatus(error instanceof Error ? error.message : 'Could not render this MusicXML file.', 'error');
    }
  }

  async function loadFile(file) {
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['musicxml', 'xml', 'mxl'].includes(extension)) {
      setStatus('Choose a .musicxml, .xml, or .mxl score file.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus(`This testing page accepts files up to 20 MiB. This file is ${formatBytes(file.size)}.`, 'error');
      return;
    }
    if (typeof window.NotationEngine === 'undefined') {
      setStatus('Notation Engine could not be loaded. Check the connection and refresh the page.', 'error');
      return;
    }

    setStatus(`Reading ${file.name}…`, 'neutral');
    controls.resultPanel.hidden = true;
    controls.sheet.replaceChildren();
    safeSvg = null;
    parsedScore = null;
    currentFile = file;
    try {
      let xmlText;
      if (extension === 'mxl') {
        const archive = new Uint8Array(await file.arrayBuffer());
        const extracted = window.NotationEngine.unzipMxl(archive, window.DOMParser);
        if (!extracted.xmlText) {
          const detail = (extracted.diagnostics || []).map((d) => `${d.code}: ${d.message}`).join(' ');
          throw new Error(detail || 'Could not find a MusicXML score inside this MXL archive.');
        }
        xmlText = extracted.xmlText;
      } else {
        xmlText = await file.text();
      }
      parsedScore = window.NotationEngine.parseMusicXml(xmlText, { domParser: window.DOMParser });
      controls.fileName.textContent = file.name;
      controls.fileMeta.textContent = `${formatBytes(file.size)} · ${extension.toUpperCase()} · processed locally`;
      controls.resultPanel.hidden = false;
      renderCurrentView();
    } catch (error) {
      console.error('Could not open this score:', error);
      parsedScore = null;
      controls.resultPanel.hidden = true;
      setStatus(error instanceof Error ? error.message : 'Could not read this score.', 'error');
    }
  }

  function clearScore() {
    parsedScore = null;
    safeSvg = null;
    currentFile = null;
    controls.fileInput.value = '';
    controls.resultPanel.hidden = true;
    controls.sheet.replaceChildren();
    controls.diagnosticList.replaceChildren();
    controls.uploadPanel.hidden = false;
    setStatus('Ready when you are — choose a MusicXML file to begin.', 'neutral');
  }

  function downloadSvg() {
    if (!safeSvg || !currentFile) return;
    const copy = safeSvg.cloneNode(true);
    copy.setAttribute('width', String(Math.round(baseSvgWidth)));
    copy.setAttribute('height', String(Math.round(baseSvgHeight)));
    copy.style.width = `${Math.round(baseSvgWidth)}px`;
    copy.style.height = `${Math.round(baseSvgHeight)}px`;
    const source = new XMLSerializer().serializeToString(copy);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const base = currentFile.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-');
    anchor.href = url;
    anchor.download = `${base || 'score'}-${currentView}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  controls.fileInput.addEventListener('change', (event) => loadFile(event.target.files && event.target.files[0]));
  controls.uploadPanel.addEventListener('dragover', (event) => {
    event.preventDefault();
    controls.uploadPanel.classList.add('dragover');
  });
  controls.uploadPanel.addEventListener('dragleave', (event) => {
    if (!controls.uploadPanel.contains(event.relatedTarget)) controls.uploadPanel.classList.remove('dragover');
  });
  controls.uploadPanel.addEventListener('drop', (event) => {
    event.preventDefault();
    controls.uploadPanel.classList.remove('dragover');
    const file = event.dataTransfer && event.dataTransfer.files[0];
    if (file) loadFile(file);
  });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view;
      document.querySelectorAll('[data-view]').forEach((control) => {
        control.setAttribute('aria-pressed', String(control === button));
      });
      if (parsedScore) renderCurrentView();
    });
  });
  controls.zoom.addEventListener('input', applyZoom);
  controls.download.addEventListener('click', downloadSvg);
  controls.clear.addEventListener('click', clearScore);
})();
