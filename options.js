// Options page script for CORS Bypass Extension
const DEFAULT_SETTINGS = {
  enabled: true,
  allowOrigin: 'request_origin',
  customOrigin: '',
  allowMethods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
  allowHeaders: '*',
  allowCredentials: true,
  domains: ['*'],
  removeExisting: true,
  debugMode: false
};

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const globalToggle = document.getElementById('globalToggle');
  const debugMode = document.getElementById('debugMode');
  const originRadios = document.querySelectorAll('input[name="origin"]');
  const customOrigin = document.getElementById('customOrigin');
  const customOriginSetting = document.getElementById('customOriginSetting');
  const allowedMethods = document.getElementById('allowedMethods');
  const allowedHeaders = document.getElementById('allowedHeaders');
  const allowCredentials = document.getElementById('allowCredentials');
  const removeExisting = document.getElementById('removeExisting');
  const domainList = document.getElementById('domainList');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const exportButton = document.getElementById('exportButton');
  const importButton = document.getElementById('importButton');
  const importFile = document.getElementById('importFile');
  const statusMessage = document.getElementById('statusMessage');

  // Load saved settings on page load
  loadSettings();

  // Event listeners
  saveButton.addEventListener('click', saveSettings);
  resetButton.addEventListener('click', resetSettings);
  exportButton.addEventListener('click', exportSettings);
  importButton.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importSettings);

  // Origin radio change handler
  originRadios.forEach(radio => {
    radio.addEventListener('change', handleOriginChange);
  });

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get('corsSettings');
      const settings = { ...DEFAULT_SETTINGS, ...result.corsSettings };
      
      // Populate form fields
      globalToggle.checked = settings.enabled;
      debugMode.checked = settings.debugMode;
      
      // Set origin radio
      const originRadio = document.querySelector(`input[name="origin"][value="${settings.allowOrigin}"]`);
      if (originRadio) {
        originRadio.checked = true;
      }
      
      customOrigin.value = settings.customOrigin;
      allowedMethods.value = settings.allowMethods;
      allowedHeaders.value = settings.allowHeaders;
      allowCredentials.checked = settings.allowCredentials;
      removeExisting.checked = settings.removeExisting;
      domainList.value = settings.domains.join('\n');
      
      // Handle custom origin visibility
      handleOriginChange();
      
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('Error loading settings', 'error');
    }
  }

  // Save settings to storage
  async function saveSettings() {
    try {
      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;

      const selectedOrigin = document.querySelector('input[name="origin"]:checked')?.value || 'request_origin';
      
      const newSettings = {
        enabled: globalToggle.checked,
        debugMode: debugMode.checked,
        allowOrigin: selectedOrigin,
        customOrigin: customOrigin.value.trim(),
        allowMethods: allowedMethods.value.trim(),
        allowHeaders: allowedHeaders.value.trim(),
        allowCredentials: allowCredentials.checked,
        removeExisting: removeExisting.checked,
        domains: domainList.value
          .split('\n')
          .map(d => d.trim())
          .filter(d => d.length > 0)
      };

      // Validate settings
      if (selectedOrigin === 'custom' && !newSettings.customOrigin) {
        throw new Error('Custom origin cannot be empty when custom mode is selected');
      }

      if (newSettings.domains.length === 0) {
        newSettings.domains = ['*'];
      }

      await chrome.storage.sync.set({ corsSettings: newSettings });
      
      showStatus('Settings saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus(`Error saving settings: ${error.message}`, 'error');
    } finally {
      saveButton.textContent = 'Save All Settings';
      saveButton.disabled = false;
    }
  }

  // Reset settings to defaults
  async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.sync.set({ corsSettings: DEFAULT_SETTINGS });
      loadSettings();
      showStatus('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      showStatus('Error resetting settings', 'error');
    }
  }

  // Export settings to JSON file
  async function exportSettings() {
    try {
      const result = await chrome.storage.sync.get('corsSettings');
      const settings = { ...DEFAULT_SETTINGS, ...result.corsSettings };
      
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cors-bypass-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showStatus('Settings exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting settings:', error);
      showStatus('Error exporting settings', 'error');
    }
  }

  // Import settings from JSON file
  async function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validate imported settings
      const validatedSettings = { ...DEFAULT_SETTINGS, ...importedSettings };
      
      await chrome.storage.sync.set({ corsSettings: validatedSettings });
      loadSettings();
      showStatus('Settings imported successfully', 'success');
      
    } catch (error) {
      console.error('Error importing settings:', error);
      showStatus('Error importing settings: Invalid file format', 'error');
    } finally {
      importFile.value = ''; // Reset file input
    }
  }

  // Handle origin radio button changes
  function handleOriginChange() {
    const selectedOrigin = document.querySelector('input[name="origin"]:checked')?.value;
    customOriginSetting.style.display = selectedOrigin === 'custom' ? 'block' : 'none';
  }

  // Show status message
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }
});