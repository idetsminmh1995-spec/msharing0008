/* Shared asset gate for every VideoEngine-backed instrument page. */
(function () {
  const STATUS = new Set(['idle', 'checking', 'retrying', 'ok', 'failed', 'warning', 'skipped']);
  const STYLE_ID = 'video-asset-gate-style';

  function outroDetails(outro, failure = null) {
    const source = outro?.source === 'r2' || outro?.source === 'builtin' ? outro.source : 'unavailable';
    const number = (value) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; };
    const failureReason = failure?.kind || (failure?.status ? 'http-' + String(failure.status) : null);
    return {
      source,
      key: typeof outro?.key === 'string' ? outro.key : null,
      bytes: number(outro?.bytes),
      ms: number(outro?.ms),
      attempts: number(outro?.attempts),
      reason: typeof outro?.reason === 'string' ? outro.reason : (failureReason || (source === 'unavailable' ? 'resolver-unavailable' : null)),
      duration: number(outro?.seconds),
      state: typeof outro?.state === 'string' ? outro.state : (source === 'unavailable' ? 'unavailable' : source + '-ready'),
      fallback: source === 'builtin' || Boolean(outro?.fallback),
    };
  }

  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .video-asset-gate{margin-top:10px;padding:10px 12px;border:1px solid #e8ded7;border-radius:10px;background:#fff;font:inherit;font-size:11px;line-height:1.4;color:#292320}
      .video-asset-gate__head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:800}
      .video-asset-gate__summary{font-weight:700}
      .video-asset-gate__rows{display:grid;gap:4px;margin-top:7px}
      .video-asset-gate__row{display:grid;grid-template-columns:16px minmax(88px,auto) minmax(0,1fr);gap:6px;align-items:baseline}
      .video-asset-gate__icon{font-weight:900}
      .video-asset-gate__reason{color:#756b65;overflow-wrap:anywhere}
      .video-asset-gate__row[data-status="ok"] .video-asset-gate__icon{color:#22864a}
      .video-asset-gate__row[data-status="failed"] .video-asset-gate__icon{color:#a21d2a}
      .video-asset-gate__row[data-status="warning"] .video-asset-gate__icon{color:#b57900}
      .video-asset-gate__row[data-status="checking"] .video-asset-gate__icon,.video-asset-gate__row[data-status="retrying"] .video-asset-gate__icon{color:#b57900}
      .video-asset-gate__actions{display:flex;gap:6px;margin-top:8px}
      .video-asset-gate__actions button{font:inherit;cursor:pointer}
      .video-asset-gate[data-status="blocked"]{border-color:#e3a4aa;background:#fff8f8}
      .video-asset-gate[data-status="ready-warning"]{border-color:#e4c983;background:#fffdf7}
    `;
    document.head?.append(style);
  }

  function create(options = {}) {
    ensureStyles();
    const page = options.page || (typeof location !== 'undefined' ? location.pathname : 'video');
    const engine = typeof window !== 'undefined' ? window.VideoEngine : null;
    const groupList = (options.groups || []).map((group) => ({
      id: String(group.id),
      label: group.label || String(group.id),
      required: group.required !== false,
    }));
    const groups = new Map(groupList.map((group) => [group.id, group]));
    const state = new Map(groupList.map((group) => [group.id, {
      id: group.id, label: group.label, required: group.required, status: 'idle', message: 'not checked', details: {},
    }]));
    let startedAt = null;
    let warnings = [];
    let panel = options.panel || null;
    let rows = null;
    let summary = null;

    if (typeof document !== 'undefined' && !panel) {
      panel = document.createElement('section');
      const anchor = options.anchor || document.getElementById('costLine');
      if (anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    }
    if (panel && typeof document !== 'undefined') {
      panel.classList.add('video-asset-gate');
      panel.setAttribute('aria-live', 'polite');
      panel.innerHTML = '<div class="video-asset-gate__head"><span>Asset gate</span><span class="video-asset-gate__summary">Not checked</span></div><div class="video-asset-gate__rows"></div><div class="video-asset-gate__actions"><button id="copyAssetReport" type="button" data-video-gate-copy>Copy report</button><button id="downloadAssetReport" type="button" data-video-gate-download>Download report</button></div>';
      rows = panel.querySelector('.video-asset-gate__rows');
      summary = panel.querySelector('.video-asset-gate__summary');
      panel.querySelector('[data-video-gate-copy]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        try {
          const report = options.getReport?.() || snapshot();
          const text = options.serializeReport?.(report) || JSON.stringify(report, null, 2);
          await navigator.clipboard.writeText(text);
          button.textContent = 'Copied';
          setTimeout(() => { button.textContent = 'Copy report'; }, 1200);
        } catch (error) {
          button.textContent = 'Copy unavailable';
          setTimeout(() => { button.textContent = 'Copy report'; }, 1600);
        }
      });
      panel.querySelector('[data-video-gate-download]')?.addEventListener('click', () => {
        const report = options.getReport?.() || snapshot();
        const text = options.serializeReport?.(report) || JSON.stringify(report, null, 2);
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = options.reportName || `${String(page).replace(/[^a-z0-9-]/gi, '-')}-asset-report.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      });
    }

    function overallStatus() {
      const values = [...state.values()];
      const blocked = values.some((item) => item.required && item.status === 'failed');
      const checking = values.some((item) => item.required && ['idle', 'checking', 'retrying'].includes(item.status));
      const optionalProblem = values.some((item) => !item.required && item.status === 'failed');
      if (blocked) return 'blocked';
      if (checking) return startedAt === null ? 'idle' : 'checking';
      return optionalProblem || warnings.length ? 'ready-warning' : 'ready';
    }

    function render() {
      if (!panel || !rows || !summary) return;
      const status = overallStatus();
      panel.dataset.status = status;
      summary.textContent = ({
        idle: 'Not checked', checking: 'Checking…', blocked: 'Blocked', ready: 'Ready', 'ready-warning': 'Ready with warnings',
      })[status];
      rows.replaceChildren();
      for (const item of state.values()) {
        const row = document.createElement('div');
        row.className = 'video-asset-gate__row';
        row.dataset.status = item.status;
        const icon = document.createElement('span');
        icon.className = 'video-asset-gate__icon';
        icon.textContent = ({ ok: '✓', failed: '✗', warning: '!', checking: '⟳', retrying: '⟳', skipped: '–', idle: '·' })[item.status] || '·';
        const label = document.createElement('b');
        label.textContent = item.label + (item.required ? ' *' : ' (optional)');
        const reason = document.createElement('span');
        reason.className = 'video-asset-gate__reason';
        reason.textContent = item.message || item.status;
        row.append(icon, label, reason);
        rows.append(row);
      }
    }

    function set(id, status, message = '', details = {}) {
      if (!STATUS.has(status)) throw new TypeError(`Unknown asset status: ${status}`);
      const group = groups.get(id);
      if (!group) throw new Error(`Unknown asset gate group: ${id}`);
      const item = { id, label: group.label, required: group.required, status, message: String(message || status), details: { ...details } };
      state.set(id, item);
      if (group.required && engine) {
        if (status === 'ok') engine.resolveRequired(id, details);
        else if (status === 'failed') engine.rejectRequired(id, new Error(item.message));
        else if (status === 'checking' || status === 'retrying' || status === 'idle') engine.requireAsset(id);
      }
      render();
      return item;
    }

    function setOutro(outro, failure = null) {
      const details = outroDetails(outro, failure);
      const ready = details.source === 'r2' || details.source === 'builtin';
      const message = ready
        ? (details.source === 'builtin' ? 'Built-in Thank You ending ready' : 'R2 Thank You ending ready')
        : 'Thank You ending unavailable: ' + details.reason;
      set('outro', ready ? 'ok' : 'failed', message, details);
      return snapshot();
    }

    function start() {
      startedAt = performance.now();
      warnings = [];
      for (const group of groupList) set(group.id, 'idle', 'not checked');
      for (const group of groupList) if (group.required) set(group.id, 'checking', 'waiting for check');
      render();
      return api;
    }

    function apply(result = {}) {
      const entries = [...(result.required || []), ...(result.optional || [])];
      let recognized = false;
      for (const entry of entries) {
        if (!groups.has(entry.id)) continue;
        recognized = true;
        const status = entry.status === 'ok' ? 'ok'
          : entry.status === 'retrying' ? 'retrying'
            : entry.status === 'failed' ? 'failed'
              : entry.status === 'skipped' ? 'skipped' : 'checking';
        set(entry.id, status, entry.message || entry.error || status, entry);
      }
      if (result.ok === false && !recognized) {
        const message = result.error || result.message || 'Asset check failed.';
        for (const group of groupList.filter((candidate) => candidate.required)) set(group.id, 'failed', message);
      }
      warnings.push(...(result.warnings || []));
      render();
      return snapshot();
    }

    async function check(id, work, options = {}) {
      const group = groups.get(id);
      if (!group) throw new Error(`Unknown asset gate group: ${id}`);
      set(id, 'checking', options.message || 'checking');
      try {
        const value = await work();
        if (value === false || value == null) throw new Error(options.emptyMessage || `${group.label} is unavailable.`);
        set(id, 'ok', options.successMessage || 'ready', options.details || {});
        return value;
      } catch (error) {
        const message = error?.message || String(error);
        set(id, 'failed', message);
        if (group.required) throw error;
        warnings.push(`${group.label}: ${message}`);
        return null;
      }
    }

    function assertReady() {
      const blocked = [...state.values()].filter((item) => item.required && item.status !== 'ok');
      if (blocked.length) throw new Error(`Asset gate blocked export — ${blocked.map((item) => `${item.label}: ${item.message}`).join('; ')}`);
      engine?.assertAssetsReady?.();
      return true;
    }

    function failPending(error) {
      const message = error?.message || String(error || 'Export preparation failed.');
      for (const item of state.values()) if (item.required && ['idle', 'checking', 'retrying'].includes(item.status)) set(item.id, 'failed', message);
      render();
      return snapshot();
    }

    function addWarning(message) {
      warnings.push(String(message));
      render();
    }

    function snapshot(extra = {}) {
      const items = [...state.values()].map((item) => ({ ...item, details: { ...item.details } }));
      const status = overallStatus();
      const outroItem = state.get('outro');
      const outro = outroItem ? {
        source: outroItem.details.source ?? null,
        key: outroItem.details.key ?? null,
        bytes: outroItem.details.bytes ?? 0,
        ms: outroItem.details.ms ?? 0,
        attempts: outroItem.details.attempts ?? 0,
        reason: outroItem.details.reason ?? null,
        duration: outroItem.details.duration ?? 0,
        state: outroItem.details.state ?? outroItem.status,
        fallback: outroItem.details.fallback ?? false,
        status: outroItem.status,
        message: outroItem.message,
      } : null;
      return {
        schema: 'video-asset-gate', schemaVersion: 1, page,
        createdAt: new Date().toISOString(),
        status,
        ok: status === 'ready' || status === 'ready-warning',
        required: items.filter((item) => item.required),
        optional: items.filter((item) => !item.required),
        outro,
        warnings: [...warnings],
        timings: { totalMs: startedAt === null ? 0 : Math.max(0, Math.round(performance.now() - startedAt)) },
        ...extra,
      };
    }

    const api = { start, set, setOutro, apply, check, assertReady, failPending, addWarning, snapshot, render };
    render();
    return api;
  }

  window.VideoAssetGate = Object.freeze({ create, outroDetails, STATUS: Object.freeze([...STATUS]) });
})();
