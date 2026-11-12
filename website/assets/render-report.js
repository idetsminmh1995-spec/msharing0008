/* Structured render diagnostics shared by the video pages. */
(function () {
  function create(meta) {
    return {
      schema: 1,
      createdAt: new Date().toISOString(),
      page: location.href,
      meta: { ...meta },
      outro: { source: null, key: null, bytes: 0, ms: 0, attempts: 0, reason: null, duration: 0, state: 'pending', fallback: false },
      assets: [],
      warnings: [],
      result: { status: 'running' },
    };
  }

  function addAsset(report, record) { report.assets.push({ ...record }); return record; }
  function addWarning(report, message, data = {}) { report.warnings.push({ message, ...data }); }
  function setOutro(report, details = {}) {
    if (!report) return null;
    const source = details.source === 'r2' || details.source === 'builtin' ? details.source : 'unavailable';
    const number = (value) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; };
    report.outro = {
      source,
      key: typeof details.key === 'string' ? details.key : null,
      bytes: number(details.bytes),
      ms: number(details.ms),
      attempts: number(details.attempts),
      reason: typeof details.reason === 'string' ? details.reason : null,
      duration: number(details.duration),
      state: details.state || (source === 'unavailable' ? 'unavailable' : source + '-ready'),
      fallback: source === 'builtin' || Boolean(details.fallback),
    };
    return report.outro;
  }
  function finish(report, result) {
    report.result = { ...result };
    return report;
  }
  function stringify(report) { return JSON.stringify(report, null, 2); }
  function download(report, name = 'drum-render-report.json') {
    const blob = new Blob([stringify(report)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  window.RenderReport = Object.freeze({ create, addAsset, addWarning, setOutro, finish, stringify, download });
})();
