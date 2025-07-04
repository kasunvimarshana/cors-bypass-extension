document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleEnabled');
  const status = document.getElementById('statusText');
  const btn = document.getElementById('optionsButton');

  chrome.storage.sync.get('corsSettings', ({ corsSettings }) => {
    const enabled = corsSettings?.enabled ?? true;
    toggle.checked = enabled;
    status.textContent = enabled ? 'Enabled' : 'Disabled';
  });

  toggle.addEventListener('change', () => {
    chrome.storage.sync.get('corsSettings', ({ corsSettings }) => {
      chrome.storage.sync.set({
        corsSettings: { ...corsSettings, enabled: toggle.checked },
      });
      status.textContent = toggle.checked ? 'Enabled' : 'Disabled';
    });
  });

  btn.addEventListener('click', () => chrome.runtime.openOptionsPage());
});
