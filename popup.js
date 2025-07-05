class CORSPopup {
  constructor() {
    console.log('🎨 CORS Popup initializing...');
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadStatus();
  }

  bindEvents() {
    console.log('🔗 Binding popup events...');
    document.getElementById('toggleBtn').addEventListener('click', () => {
      console.log('🔄 Toggle button clicked');
      this.toggleExtension();
    });

    document.getElementById('testBtn').addEventListener('click', () => {
      console.log('🧪 Test button clicked');
      this.toggleTestSection();
    });

    document.getElementById('sendTestBtn').addEventListener('click', () => {
      console.log('📤 Send test button clicked');
      this.sendTestRequest();
    });

    document.getElementById('rulesBtn').addEventListener('click', () => {
      console.log('⚙️ Rules button clicked');
      this.showRules();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      console.log('🗑️ Clear button clicked');
      this.clearCache();
    });
  }

  async loadStatus() {
    console.log('📊 Loading extension status...');
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getStatus',
      });
      console.log('✅ Status loaded:', response);
      this.updateUI(response.enabled);
    } catch (error) {
      console.error('❌ Error loading status:', error);
      // Show error state
      this.updateUI(false);
      this.showError('Failed to load extension status');
    }
  }

  async toggleExtension() {
    console.log('🔄 Toggling extension...');
    const toggleBtn = document.getElementById('toggleBtn');
    const originalText = toggleBtn.textContent;

    // Show loading state
    toggleBtn.textContent = 'Loading...';
    toggleBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'toggle',
      });
      console.log('✅ Toggle response:', response);
      this.updateUI(response.enabled);
    } catch (error) {
      console.error('❌ Error toggling extension:', error);
      this.showError('Failed to toggle extension');

      // Restore button state
      toggleBtn.textContent = originalText;
      toggleBtn.disabled = false;
    }
  }

  updateUI(enabled) {
    console.log('🎨 Updating UI - enabled:', enabled);
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

    // Re-enable button
    toggleBtn.disabled = false;
  }

  showError(message) {
    console.error('🚨 Showing error:', message);
    const statusText = document.getElementById('statusText');
    statusText.textContent = `Error: ${message}`;
    statusText.style.color = '#f44336';

    // Reset color after 3 seconds
    setTimeout(() => {
      statusText.style.color = '';
    }, 3000);
  }

  toggleTestSection() {
    console.log('🧪 Toggling test section...');
    const testSection = document.getElementById('testSection');
    const isHidden = testSection.classList.contains('hidden');

    if (isHidden) {
      testSection.classList.remove('hidden');
      console.log('✅ Test section shown');
    } else {
      testSection.classList.add('hidden');
      console.log('✅ Test section hidden');
    }
  }

  async sendTestRequest() {
    console.log('📤 Sending test request...');
    const url = document.getElementById('testUrl').value.trim();
    const resultDiv = document.getElementById('testResult');

    if (!url) {
      console.warn('⚠️ No URL provided for test');
      resultDiv.innerHTML = '<div class="error">Please enter a URL</div>';
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      console.warn('⚠️ Invalid URL:', url);
      resultDiv.innerHTML = '<div class="error">Please enter a valid URL</div>';
      return;
    }

    resultDiv.innerHTML = 'Testing... 🔄';
    console.log('🌐 Testing URL:', url);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'makeRequest',
        url: url,
        options: { method: 'GET' },
      });

      console.log('📥 Test response:', response);

      if (response.success) {
        const dataPreview =
          typeof response.data === 'string'
            ? response.data.substring(0, 200)
            : JSON.stringify(response.data).substring(0, 200);

        resultDiv.innerHTML = `
          <div class="success">✅ Success!</div>
          <div><strong>Status:</strong> ${response.status} ${
          response.statusText
        }</div>
          <div><strong>Response:</strong> ${dataPreview}${
          dataPreview.length >= 200 ? '...' : ''
        }</div>
        `;
      } else {
        resultDiv.innerHTML = `
          <div class="error">❌ Failed</div>
          <div><strong>Error:</strong> ${response.error}</div>
          <div><strong>Status:</strong> ${response.status}</div>
        `;
      }
    } catch (error) {
      console.error('❌ Test request error:', error);
      resultDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
    }
  }

  async showRules() {
    console.log('📋 Showing rules...');
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getCustomRules',
      });

      const rules = response.rules || [];
      console.log('📋 Custom rules:', rules);

      const rulesInfo = `
Active Rules: ${rules.length}

Default CORS headers are automatically added when enabled:
• Access-Control-Allow-Origin: *
• Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD
• Access-Control-Allow-Headers: *
• Access-Control-Allow-Credentials: true

Custom Rules: ${
        rules.length > 0
          ? rules.map((rule) => `\n• Rule ID: ${rule.id}`).join('')
          : 'None'
      }
      `;

      alert(rulesInfo);
    } catch (error) {
      console.error('❌ Error showing rules:', error);
      alert('Error loading rules information');
    }
  }

  async clearCache() {
    console.log('🗑️ Clearing cache...');
    try {
      // Clear storage
      await chrome.storage.local.clear();
      console.log('✅ Cache cleared successfully');
      alert(
        'Cache cleared successfully! Extension will reload default settings.'
      );

      // Reload status
      this.loadStatus();
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      alert('Error clearing cache');
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎬 DOM loaded, initializing popup...');
  new CORSPopup();
});
