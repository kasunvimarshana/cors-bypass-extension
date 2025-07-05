class CORSPopup {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadStatus();
  }

  bindEvents() {
    document
      .getElementById('toggleBtn')
      .addEventListener('click', () => this.toggleExtension());
    document
      .getElementById('testBtn')
      .addEventListener('click', () => this.toggleTestSection());
    document
      .getElementById('sendTestBtn')
      .addEventListener('click', () => this.sendTestRequest());
    document
      .getElementById('rulesBtn')
      .addEventListener('click', () => this.showRules());
    document
      .getElementById('clearBtn')
      .addEventListener('click', () => this.clearCache());
  }

  async loadStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getStatus',
      });
      this.updateUI(response.enabled);
    } catch (error) {
      console.error('Error loading status:', error);
    }
  }

  async toggleExtension() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'toggle',
      });
      this.updateUI(response.enabled);
    } catch (error) {
      console.error('Error toggling extension:', error);
    }
  }

  updateUI(enabled) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const toggleBtn = document.getElementById('toggleBtn');

    if (enabled) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'CORS Bypass Active';
      toggleBtn.textContent = 'Disable';
      toggleBtn.className = 'toggle-btn active';
    } else {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'CORS Bypass Disabled';
      toggleBtn.textContent = 'Enable';
      toggleBtn.className = 'toggle-btn inactive';
    }
  }

  toggleTestSection() {
    const testSection = document.getElementById('testSection');
    testSection.classList.toggle('hidden');
  }

  async sendTestRequest() {
    const url = document.getElementById('testUrl').value.trim();
    const resultDiv = document.getElementById('testResult');

    if (!url) {
      resultDiv.innerHTML = '<div class="error">Please enter a URL</div>';
      return;
    }

    resultDiv.innerHTML = 'Testing...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'makeRequest',
        url: url,
        options: { method: 'GET' },
      });

      if (response.success) {
        resultDiv.innerHTML = `
                            <div class="success">✅ Success!</div>
                            <div>Status: ${response.status}</div>
                            <div>Response: ${JSON.stringify(
                              response.data
                            ).substring(0, 200)}...</div>
                        `;
      } else {
        resultDiv.innerHTML = `
                            <div class="error">❌ Failed</div>
                            <div>Error: ${response.error}</div>
                        `;
      }
    } catch (error) {
      resultDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
    }
  }

  async showRules() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getCustomRules',
      });
      const rules = response.rules || [];

      alert(
        `Active Rules: ${rules.length}\n\nDefault CORS headers are automatically added when enabled.`
      );
    } catch (error) {
      console.error('Error showing rules:', error);
    }
  }

  async clearCache() {
    try {
      // Clear storage
      await chrome.storage.local.clear();
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error clearing cache');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize popup
  new CORSPopup();
});
