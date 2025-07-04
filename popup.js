// Popup script for CORS Bypass Extension
document.addEventListener('DOMContentLoaded', async () => {
  const toggleEnabled = document.getElementById('toggleEnabled');
  const statusLight = document.getElementById('statusLight');
  const statusText = document.getElementById('statusText');
  const originMode = document.getElementById('originMode');
  const customOrigin = document.getElementById('customOrigin');
  const customOriginRow = document.getElementById('customOriginRow');
  const allowCredentials = document.getElementById('allowCredentials');
  const saveButton = document.getElementById('saveButton');
  const optionsButton = document.getElementById('optionsButton');

  let currentSettings = {};

  // Load current status and settings
  await loadCurrentState();

  // Event listeners
  toggleEnabled.addEventListener('change', handleToggle);
  originMode.addEventListener('change', handleOriginModeChange);
  saveButton.addEventListener('click', saveSettings);
  optionsButton.addEventListener('click', openOptions);

  // Load current state from background script
  async function loadCurrentState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
      currentSettings = response.settings;
      
      updateUI(response.enabled, response.settings);
    } catch (error) {
      console.error('Error loading state:', error);
      statusText.textContent = 'Error loading status';
    }
  }

  // Update UI elements
  function updateUI(enabled, settings) {
    // Status indicator
    toggleEnabled.checked = enabled;
    statusLight.className = `status-light ${enabled ? 'active' : 'inactive'}`;
    statusText.textContent = enabled ? 'CORS Bypass Active' : 'CORS Bypass Disabled';

    // Settings
    originMode.value = settings.allowOrigin;
    customOrigin.value = settings.customOrigin || '';
    allowCredentials.checked = settings.allowCredentials;

    // Show/hide custom origin input
    handleOriginModeChange();
  }

  // Handle toggle switch
  async function handleToggle() {
    const enabled = toggleEnabled.checked;
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'toggleCors' 
      });
      
      statusLight.className = `status-light ${response.enabled ? 'active' : 'inactive'}`;
      statusText.textContent = response.enabled ? 'CORS Bypass Active' : 'CORS Bypass Disabled';
    } catch (error) {
      console.error('Error toggling CORS:', error);
      // Revert toggle if error
      toggleEnabled.checked = !enabled;
    }
  }

  // Handle origin mode change
  function handleOriginModeChange() {
    const isCustom = originMode.value === 'custom';
    customOriginRow.style.display = isCustom ? 'block' : 'none';
  }

  // Save settings
  async function saveSettings() {
    const newSettings = {
      ...currentSettings,
      allowOrigin: originMode.value,
      customOrigin: customOrigin.value,
      allowCredentials: allowCredentials.checked
    };

    try {
      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;

      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });

      currentSettings = newSettings;
      
      // Show success feedback
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
        saveButton.disabled = false;
      }, 1000);

    } catch (error) {
      console.error('Error saving settings:', error);
      saveButton.textContent = 'Error';
      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
        saveButton.disabled = false;
      }, 1000);
    }
  }

  // Open options page
  function openOptions() {
    chrome.runtime.openOptionsPage();
  }
});