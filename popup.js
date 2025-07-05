// Enhanced CORS Popup Controller
class CORSPopup {
  constructor() {
    this.logger = new Logger('Popup');
    this.init();
  }

  init() {
    this.logger.info('🎯 Initializing CORS Popup...');
    this.bindEvents();
    this.loadStatus();
    this.logger.success('✅ Popup initialized successfully');
  }

  bindEvents() {
    this.logger.debug('Binding popup events...');
    
    // Toggle button
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.logger.info('Toggle button clicked');
      this.toggleExtension();
    });

    // Test section toggle
    document.getElementById('testBtn').addEventListener('click', () => {
      this.logger.info('Test button clicked');
      this.toggleTestSection();
    });

    // Send test request
    document.getElementById('sendTestBtn').addEventListener('click', () => {
      this.logger.info('Send test request clicked');
      this.sendTestRequest();
    });

    // Logs section toggle
    document.getElementById('logsBtn').addEventListener('click', () => {
      this.logger.info('Logs button clicked');
      this.toggleLogsSection();
    });

    // Refresh logs
    document.getElementById('refreshLogsBtn').addEventListener('click', () => {
      this.logger.info('Refresh logs clicked');
      this.refreshLogs();
    });

    // Clear cache
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.logger.info('Clear cache clicked');
      this.clearCache();
    });

    // Test URL input enter key
    document.getElementById('testUrl').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendTestRequest();
      }
    });

    this.logger.debug('Event binding completed');
  }

  async loadStatus() {
    try {
      this.logger.info('Loading extension status...');
      const response = await this.sendMessage({ action: 'getStatus' });
      this.logger.debug('Status response:', response);
      this.updateUI(response.enabled);
    } catch (error) {
      this.logger.error('Error loading status:', error);
      this.showError('Failed to load extension status');
    }
  }

  async toggleExtension() {
    try {
      const toggleBtn = document.getElementById('toggleBtn');
      // toggleBtn.disabled = true;
      toggleBtn.textContent = 'Loading...';
      
      this.logger.info('Toggling extension...');
      const response = await this.sendMessage({ action: 'toggle' });
      this.logger.info('Toggle response:', response);
      
      this.updateUI(response.enabled);
      this.showNotification(
        response.enabled ? 'Extension enabled' : 'Extension disabled',
        response.enabled ? 'success' : 'warning'
      );
    } catch (error) {
      this.logger.error('Error toggling extension:', error);
      this.showError('Failed to toggle extension');
    } finally {
      // document.getElementById('toggleBtn').disabled = false;
    }
  }

  updateUI(enabled) {
    this.logger.debug('Updating UI with enabled state:', enabled);
    
    const statusCard = document.getElementById('statusCard');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const toggleBtn = document.getElementById('toggleBtn');

    // Update status indicator
    if (enabled) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'CORS Bypass Active';
      statusText.className = 'status-text success';
      toggleBtn.textContent = 'Disable';
      toggleBtn.className = 'toggle-btn active';
      statusCard.className = 'status-card active';
    } else {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'CORS Bypass Disabled';
      statusText.className = 'status-text error';
      toggleBtn.textContent = 'Enable';
      toggleBtn.className = 'toggle-btn inactive';
      statusCard.className = 'status-card inactive';
    }

    // Add fade-in animation
    statusCard.classList.add('fade-in');
    
    this.logger.success('UI updated successfully');
  }

  toggleTestSection() {
    const testSection = document.getElementById('testSection');
    const logsSection = document.getElementById('logsSection');
    
    // Hide logs section if visible
    logsSection.classList.add('hidden');
    
    // Toggle test section
    testSection.classList.toggle('hidden');
    
    if (!testSection.classList.contains('hidden')) {
      testSection.classList.add('fade-in');
      document.getElementById('testUrl').focus();
    }
    
    this.logger.debug('Test section toggled');
  }

  toggleLogsSection() {
    const logsSection = document.getElementById('logsSection');
    const testSection = document.getElementById('testSection');
    
    // Hide test section if visible
    testSection.classList.add('hidden');
    
    // Toggle logs section
    logsSection.classList.toggle('hidden');
    
    if (!logsSection.classList.contains('hidden')) {
      logsSection.classList.add('fade-in');
      this.refreshLogs();
    }
    
    this.logger.debug('Logs section toggled');
  }

  async sendTestRequest() {
    const url = document.getElementById('testUrl').value.trim();
    const resultDiv = document.getElementById('testResult');
    const sendBtn = document.getElementById('sendTestBtn');

    if (!url) {
      this.showError('Please enter a URL');
      return;
    }

    try {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Testing...';
      resultDiv.innerHTML = '<div class="loading">🔄 Testing CORS request...</div>';
      resultDiv.style.display = 'block';

      this.logger.info('Sending test request to:', url);
      
      const response = await this.sendMessage({
        action: 'makeRequest',
        url: url,
        options: { method: 'GET' }
      });

      this.logger.debug('Test request response:', response);

      if (response.success) {
        const dataPreview = typeof response.data === 'string' 
          ? response.data.substring(0, 300) 
          : JSON.stringify(response.data, null, 2).substring(0, 300);
        
        resultDiv.innerHTML = `
          <div class="success">✅ Request Successful!</div>
          <div><strong>Status:</strong> ${response.status} ${response.statusText}</div>
          <div><strong>Headers:</strong> ${Object.keys(response.headers || {}).length} headers received</div>
          <div><strong>Data Preview:</strong></div>
          <pre style="white-space: pre-wrap; word-break: break-word;">${dataPreview}${dataPreview.length >= 300 ? '...' : ''}</pre>
        `;
        
        this.logger.success('Test request completed successfully');
      } else {
        resultDiv.innerHTML = `
          <div class="error">❌ Request Failed</div>
          <div><strong>Error:</strong> ${response.error}</div>
          <div><strong>Status:</strong> ${response.status || 'Unknown'}</div>
        `;
        
        this.logger.error('Test request failed:', response.error);
      }
    } catch (error) {
      this.logger.error('Error sending test request:', error);
      resultDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Test Request';
    }
  }

  async refreshLogs() {
    try {
      this.logger.info('Refreshing logs...');
      const response = await this.sendMessage({ action: 'getLogs' });
      this.displayLogs(response.logs || []);
    } catch (error) {
      this.logger.error('Error refreshing logs:', error);
      this.showError('Failed to refresh logs');
    }
  }

  displayLogs(logs) {
    const logsContainer = document.getElementById('logsContainer');
    
    if (!logs || logs.length === 0) {
      logsContainer.innerHTML = '<div class="log-entry">No logs available</div>';
      return;
    }

    const logEntries = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const levelClass = `log-${log.level.toLowerCase()}`;
      return `
        <div class="log-entry ${levelClass}">
          [${timestamp}] [${log.context}] ${log.message}
        </div>
      `;
    }).join('');

    logsContainer.innerHTML = logEntries;
    
    // Scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    this.logger.debug('Displayed logs:', logs.length);
  }

  async clearCache() {
    try {
      if (!confirm('Are you sure you want to clear the cache? This will reset all settings.')) {
        return;
      }

      this.logger.info('Clearing cache...');
      const response = await this.sendMessage({ action: 'clearCache' });
      
      if (response.success) {
        this.showNotification('Cache cleared successfully', 'success');
        // Reload status after clearing cache
        setTimeout(() => this.loadStatus(), 500);
      } else {
        this.showError('Failed to clear cache');
      }
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      this.showError('Failed to clear cache');
    }
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 10000);

      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  showNotification(message, type = 'info') {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;

    switch (type) {
      case 'success':
        notification.style.background = 'rgba(76, 175, 80, 0.9)';
        break;
      case 'error':
        notification.style.background = 'rgba(244, 67, 54, 0.9)';
        break;
      case 'warning':
        notification.style.background = 'rgba(255, 193, 7, 0.9)';
        break;
      default:
        notification.style.background = 'rgba(33, 150, 243, 0.9)';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  showError(message) {
    this.showNotification(message, 'error');
  }
}

// Simple logger for popup
class Logger {
  constructor(context) {
    this.context = context;
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${this.context}] ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage, ...args);
        break;
      case 'WARN':
        console.warn(formattedMessage, ...args);
        break;
      case 'INFO':
        console.info(formattedMessage, ...args);
        break;
      case 'DEBUG':
        console.debug(formattedMessage, ...args);
        break;
      case 'SUCCESS':
        console.log(`%c${formattedMessage}`, 'color: #4CAF50; font-weight: bold;', ...args);
        break;
      default:
        console.log(formattedMessage, ...args);
    }
  }

  error(message, ...args) { this.log('ERROR', message, ...args); }
  warn(message, ...args) { this.log('WARN', message, ...args); }
  info(message, ...args) { this.log('INFO', message, ...args); }
  debug(message, ...args) { this.log('DEBUG', message, ...args); }
  success(message, ...args) { this.log('SUCCESS', message, ...args); }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CORSPopup();
});