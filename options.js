const DEFAULT_SETTINGS = {
  enabled: true,
  allowOrigin: 'request_origin',
  customOrigin: '',
  allowMethods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
  allowHeaders: '*',
  allowCredentials: true,
  domains: ['*'],
  removeExisting: true,
  logRequests: false,
};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Event listeners
  document.getElementById('saveButton').addEventListener('click', saveSettings);
  document
    .getElementById('resetButton')
    .addEventListener('click', resetSettings);
  document
    .getElementById('exportButton')
    .addEventListener('click', exportSettings);
  document
    .getElementById('importButton')
    .addEventListener('click', importSettings);
  document
    .getElementById('fileInput')
    .addEventListener('change', handleFileImport);

  // Enable/disable custom origin input based on radio selection
  document.querySelectorAll('input[name="origin"]').forEach((radio) => {
    radio.addEventListener('change', updateCustomOriginState);
  });
});

async function loadSettings() {
  try {
    const data = await chrome.storage.sync.get('corsSettings');
    const settings = data.corsSettings || DEFAULT_SETTINGS;

    // General settings
    document.getElementById('globalToggle').checked = settings.enabled;
    document.getElementById('logRequests').checked = settings.logRequests;

    // Origin settings
    document.querySelector(
      `input[name="origin"][value="${settings.allowOrigin}"]`
    ).checked = true;
    document.getElementById('customOrigin').value = settings.customOrigin || '';

    // Permission settings
    document.getElementById('allowedMethods').value = settings.allowMethods;
    document.getElementById('allowedHeaders').value = settings.allowHeaders;
    document.getElementById('allowCredentials').checked =
      settings.allowCredentials;
    document.getElementById('removeExisting').checked = settings.removeExisting;

    // Domain settings
    document.getElementById('domainList').value = settings.domains.join('\n');

    updateCustomOriginState();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  try {
    const settings = {
      enabled: document.getElementById('globalToggle').checked,
      allowOrigin: document.querySelector('input[name="origin"]:checked').value,
      customOrigin: document.getElementById('customOrigin').value.trim(),
      allowMethods: document.getElementById('allowedMethods').value.trim(),
      allowHeaders: document.getElementById('allowedHeaders').value.trim(),
      allowCredentials: document.getElementById('allowCredentials').checked,
      removeExisting: document.getElementById('removeExisting').checked,
      logRequests: document.getElementById('logRequests').checked,
      domains: document
        .getElementById('domainList')
        .value.split('\n')
        .map((d) => d.trim())
        .filter((d) => d.length > 0),
    };

    // Validation
    if (settings.allowOrigin === 'custom' && !settings.customOrigin) {
      alert('Please enter a custom origin URL');
      return;
    }

    if (settings.domains.length === 0) {
      settings.domains = ['*'];
    }

    await chrome.storage.sync.set({ corsSettings: settings });
    showNotification('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('Error saving settings', 'error');
  }
}

async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    try {
      await chrome.storage.sync.set({ corsSettings: DEFAULT_SETTINGS });
      loadSettings();
      showNotification('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      showNotification('Error resetting settings', 'error');
    }
  }
}

async function exportSettings() {
  try {
    const data = await chrome.storage.sync.get('corsSettings');
    const settings = data.corsSettings || DEFAULT_SETTINGS;
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cors-bypass-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting settings:', error);
    showNotification('Error exporting settings', 'error');
  }
}

function importSettings() {
  document.getElementById('fileInput').click();
}

async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const settings = JSON.parse(e.target.result);
      await chrome.storage.sync.set({ corsSettings: settings });
      loadSettings();
      showNotification('Settings imported successfully!', 'success');
    } catch (error) {
      console.error('Error importing settings:', error);
      showNotification('Error importing settings: Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

function updateCustomOriginState() {
  const customRadio = document.querySelector(
    'input[name="origin"][value="custom"]'
  );
  const customOriginInput = document.getElementById('customOrigin');
  customOriginInput.disabled = !customRadio.checked;
  if (customRadio.checked) {
    customOriginInput.focus();
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('notification-show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('notification-show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add MV3 specific notice to options page
document.addEventListener('DOMContentLoaded', () => {
  const footer = document.querySelector('.footer .info');
  if (footer) {
    const mv3Notice = document.createElement('div');
    mv3Notice.innerHTML = `
      <p><strong>Manifest V3 Update:</strong> This extension now uses the modern declarativeNetRequest API 
      for better performance and security. Some advanced features like dynamic origin mirroring are limited 
      by the new API but overall functionality remains the same.</p>
    `;
    mv3Notice.style.marginTop = '15px';
    mv3Notice.style.padding = '10px';
    mv3Notice.style.background = '#e3f2fd';
    mv3Notice.style.border = '1px solid #2196f3';
    mv3Notice.style.borderRadius = '4px';
    mv3Notice.style.fontSize = '13px';
    footer.appendChild(mv3Notice);
  }
});
