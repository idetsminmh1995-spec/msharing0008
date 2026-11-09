/* Structured render diagnostics shared by the video pages. */
(function () {
  function create(meta) {
    return {
      schema: 1,
      createdAt: new Date().toISOString(),
      page: location.href,
      meta: { ...meta },
      assets: [],
      warnings: [],
      result: { status: 'running' },
    };
  }

  function addAsset(report, record) { report.assets.push({ ...record }); return record; }
  function addWarning(report, message, data = {}) { report.warnings.push({ message, ...data }); }
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

  window.RenderReport = Object.freeze({ create, addAsset, addWarning, finish, stringify, download });
})();
