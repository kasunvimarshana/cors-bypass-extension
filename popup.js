document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleEnabled');
  const statusText = document.getElementById('statusText');
  const modeIndicator = document.getElementById('modeIndicator');
  const quickOriginMode = document.getElementById('quickOriginMode');
  const quickCredentials = document.getElementById('quickCredentials');
  const optionsButton = document.getElementById('optionsButton');
  const refreshButton = document.getElementById('refreshButton');
  const domainCount = document.getElementById('domainCount');

  // Load current settings
  loadSettings();

  // Event listeners
  toggle.addEventListener('change', updateEnabled);
  quickOriginMode.addEventListener('change', updateQuickSettings);
  quickCredentials.addEventListener('change', updateQuickSettings);
  optionsButton.addEventListener('click', openOptions);
  refreshButton.addEventListener('click', refreshCurrentTab);

  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get('corsSettings');
      const settings = data.corsSettings || {};

      const enabled = settings.enabled ?? true;
      toggle.checked = enabled;
      updateStatusDisplay(enabled);

      quickOriginMode.value = settings.allowOrigin || 'request_origin';
      quickCredentials.checked = settings.allowCredentials ?? true;

      const domains = settings.domains || ['*'];
      domainCount.textContent =
        domains.length === 1 && domains[0] === '*'
          ? 'All'
          : domains.length.toString();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function updateEnabled() {
    try {
      const enabled = toggle.checked;
      updateStatusDisplay(enabled);

      const data = await chrome.storage.sync.get('corsSettings');
      const settings = data.corsSettings || {};
      await chrome.storage.sync.set({
        corsSettings: { ...settings, enabled },
      });
    } catch (error) {
      console.error('Error updating enabled state:', error);
    }
  }

  async function updateQuickSettings() {
    try {
      const data = await chrome.storage.sync.get('corsSettings');
      const settings = data.corsSettings || {};
      await chrome.storage.sync.set({
        corsSettings: {
          ...settings,
          allowOrigin: quickOriginMode.value,
          allowCredentials: quickCredentials.checked,
        },
      });
    } catch (error) {
      console.error('Error updating quick settings:', error);
    }
  }

  function updateStatusDisplay(enabled) {
    statusText.textContent = enabled ? 'Enabled' : 'Disabled';
    statusText.className = enabled ? 'status-enabled' : 'status-disabled';
    modeIndicator.textContent = enabled ? 'Active (MV3)' : 'Inactive';
    modeIndicator.className = enabled ? 'mode-active' : 'mode-inactive';
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  async function refreshCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        await chrome.tabs.reload(tab.id);
        window.close();
      }
    } catch (error) {
      console.error('Error refreshing tab:', error);
    }
  }
});
