(() => {
  const pending = sessionStorage.getItem('notation-lab-pending-file');
  if (!pending) return;
  sessionStorage.removeItem('notation-lab-pending-file');
  try {
    const payload = JSON.parse(pending);
    const binary = atob(payload.data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const file = new File([bytes], payload.name, { type: payload.type || 'application/octet-stream' });
    const input = document.querySelector('[data-file-input]');
    if (!input) throw new Error('File control is unavailable.');
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    const status = document.querySelector('[data-status]');
    if (status) { status.textContent = 'The selected file could not be opened. Please choose it again.'; status.classList.add('is-visible'); }
  }
})();