import { DEFAULT_SETTINGS } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const fields = {
    globalToggle: document.getElementById('globalToggle'),
    originMode: document.getElementById('originMode'),
    customOrigin: document.getElementById('customOrigin'),
    methods: document.getElementById('methods'),
    headers: document.getElementById('headers'),
    credentials: document.getElementById('credentials'),
    removeExisting: document.getElementById('removeExisting'),
    domainList: document.getElementById('domainList'),
  };

  chrome.storage.sync.get(
    'corsSettings',
    ({ corsSettings = DEFAULT_SETTINGS }) => {
      fields.globalToggle.checked = corsSettings.enabled;
      fields.originMode.value = corsSettings.allowOrigin;
      fields.customOrigin.value = corsSettings.customOrigin;
      fields.methods.value = corsSettings.allowMethods;
      fields.headers.value = corsSettings.allowHeaders;
      fields.credentials.checked = corsSettings.allowCredentials;
      fields.removeExisting.checked = corsSettings.removeExisting;
      fields.domainList.value = corsSettings.domains.join('\n');
    }
  );

  document.getElementById('saveButton').onclick = () => {
    const newSettings = {
      enabled: fields.globalToggle.checked,
      allowOrigin: fields.originMode.value,
      customOrigin: fields.customOrigin.value,
      allowMethods: fields.methods.value,
      allowHeaders: fields.headers.value,
      allowCredentials: fields.credentials.checked,
      removeExisting: fields.removeExisting.checked,
      domains: fields.domainList.value
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean),
    };
    chrome.storage.sync.set({ corsSettings: newSettings }, () =>
      alert('Settings Saved')
    );
  };

  document.getElementById('resetButton').onclick = () => {
    if (confirm('Reset to default?'))
      chrome.storage.sync.set({ corsSettings: DEFAULT_SETTINGS }, () =>
        location.reload()
      );
  };
});
