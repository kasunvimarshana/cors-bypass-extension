// Enhanced CORS Bypass Extension Background Script
class CORSBypassExtension {
  constructor() {
    this.enabled = true;
    this.customRules = new Map();
    this.logger = new Logger('Background');
    this.init();
  }

  init() {
    this.logger.info('🚀 Initializing CORS Bypass Extension...');
    
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.logger.info('Extension installed:', details.reason);
      this.setupDefaultRules();
      this.loadSettings();
    });

    // Listen for messages from popup/content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.logger.info('Received message:', request.action, 'from:', sender.tab?.url || 'popup');
      this.handleMessage(request, sender, sendResponse);
      return true; // Will respond asynchronously
    });

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && this.enabled) {
        this.logger.debug('Tab updated:', tab.url);
        this.injectContentScript(tabId, tab.url);
      }
    });

    // Listen for startup
    chrome.runtime.onStartup.addListener(() => {
      this.logger.info('Extension started');
      this.loadSettings();
    });

    // Initialize
    this.loadSettings();
  }

  async setupDefaultRules() {
    try {
      this.logger.info('Setting up default CORS rules...');
      
      // Get existing dynamic rules
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = existingRules.map(rule => rule.id);
      this.logger.debug('Existing rules to remove:', ruleIdsToRemove);

      // Remove existing rules
      if (ruleIdsToRemove.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove
        });
        this.logger.info('Removed existing rules:', ruleIdsToRemove.length);
      }

      // Add new CORS bypass rules
      const corsRules = [
        {
          id: 1000,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              {
                header: 'Access-Control-Allow-Origin',
                operation: 'set',
                value: '*'
              },
              {
                header: 'Access-Control-Allow-Methods',
                operation: 'set',
                value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD'
              },
              {
                header: 'Access-Control-Allow-Headers',
                operation: 'set',
                value: '*'
              },
              {
                header: 'Access-Control-Allow-Credentials',
                operation: 'set',
                value: 'true'
              },
              {
                header: 'Access-Control-Expose-Headers',
                operation: 'set',
                value: '*'
              },
              {
                header: 'Access-Control-Max-Age',
                operation: 'set',
                value: '86400'
              }
            ]
          },
          condition: {
            urlFilter: '*',
            resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'media', 'websocket', 'other']
          }
        },
        {
          id: 1001,
          priority: 2,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'Origin', operation: 'remove' },
              { header: 'Referer', operation: 'remove' }
            ]
          },
          condition: {
            urlFilter: '*',
            resourceTypes: ['xmlhttprequest']
          }
        }
      ];

      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: corsRules
      });

      this.logger.success('✅ CORS bypass rules added successfully');
    } catch (error) {
      this.logger.error('❌ Error setting up CORS rules:', error);
      throw error;
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      const { action } = request;
      this.logger.info(`Handling action: ${action}`);

      switch (action) {
        case 'getStatus':
          const status = { enabled: this.enabled };
          this.logger.debug('Status requested:', status);
          sendResponse(status);
          break;

        case 'toggle':
          this.enabled = !this.enabled;
          this.logger.info(`Toggle requested. New state: ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
          
          await this.saveSettings();
          await this.updateRules();
          this.updateBadge();
          
          const toggleResponse = { enabled: this.enabled };
          this.logger.success('Toggle completed:', toggleResponse);
          sendResponse(toggleResponse);
          break;

        case 'addCustomRule':
          await this.addCustomRule(request.rule);
          this.logger.info('Custom rule added');
          sendResponse({ success: true });
          break;

        case 'removeCustomRule':
          await this.removeCustomRule(request.ruleId);
          this.logger.info('Custom rule removed');
          sendResponse({ success: true });
          break;

        case 'getCustomRules':
          const rules = Array.from(this.customRules.values());
          this.logger.debug('Custom rules requested:', rules.length);
          sendResponse({ rules });
          break;

        case 'makeRequest':
          const result = await this.makeProxyRequest(request.url, request.options);
          this.logger.debug('Proxy request completed:', result.success);
          sendResponse(result);
          break;

        case 'clearCache':
          await this.clearCache();
          this.logger.info('Cache cleared');
          sendResponse({ success: true });
          break;

        case 'getLogs':
          const logs = Logger.getLogs();
          sendResponse({ logs });
          break;

        default:
          this.logger.warn('Unknown action:', action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async makeProxyRequest(url, options = {}) {
    try {
      this.logger.info('Making proxy request to:', url);
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || null,
        mode: 'cors',
        credentials: 'include'
      });

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      const result = {
        success: true,
        data: data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };

      this.logger.success('Proxy request successful:', response.status);
      return result;
    } catch (error) {
      this.logger.error('Proxy request failed:', error);
      return {
        success: false,
        error: error.message,
        status: 0,
        statusText: 'Network Error'
      };
    }
  }

  async updateRules() {
    try {
      this.logger.info('Updating rules. Enabled:', this.enabled);
      
      if (this.enabled) {
        await this.setupDefaultRules();
      } else {
        // Remove all dynamic rules
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const ruleIdsToRemove = existingRules.map(rule => rule.id);

        if (ruleIdsToRemove.length > 0) {
          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIdsToRemove
          });
          this.logger.info('Removed all rules:', ruleIdsToRemove.length);
        }
      }
    } catch (error) {
      this.logger.error('Error updating rules:', error);
      throw error;
    }
  }

  async addCustomRule(rule) {
    const ruleId = Date.now();
    const customRule = {
      id: ruleId,
      priority: rule.priority || 1,
      action: rule.action,
      condition: rule.condition
    };

    this.customRules.set(ruleId, customRule);
    await this.saveSettings();

    if (this.enabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [customRule]
      });
    }
  }

  async removeCustomRule(ruleId) {
    this.customRules.delete(ruleId);
    await this.saveSettings();

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId]
    });
  }

  async injectContentScript(tabId, url) {
    try {
      if (this.enabled && (url.startsWith('http://') || url.startsWith('https://'))) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['inject.js']
        });
        this.logger.debug('Content script injected into tab:', tabId);
      }
    } catch (error) {
      this.logger.debug('Could not inject content script:', error.message);
    }
  }

  updateBadge() {
    const text = this.enabled ? 'ON' : 'OFF';
    const color = this.enabled ? '#4CAF50' : '#F44336';

    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });

    this.logger.debug('Badge updated:', text, color);
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        enabled: this.enabled,
        customRules: Array.from(this.customRules.entries())
      });
      this.logger.debug('Settings saved');
    } catch (error) {
      this.logger.error('Error saving settings:', error);
    }
  }

  async loadSettings() {
    try {
      const data = await chrome.storage.local.get(['enabled', 'customRules']);
      this.enabled = data.enabled !== undefined ? data.enabled : true;

      if (data.customRules) {
        this.customRules = new Map(data.customRules);
      }

      this.logger.info('Settings loaded. Enabled:', this.enabled);
      this.updateBadge();
    } catch (error) {
      this.logger.error('Error loading settings:', error);
    }
  }

  async clearCache() {
    try {
      await chrome.storage.local.clear();
      this.customRules.clear();
      this.enabled = true;
      this.updateBadge();
      this.logger.info('Cache cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }
}

// Enhanced Logger class
class Logger {
  static logs = [];
  static maxLogs = 1000;

  constructor(context) {
    this.context = context;
  }

  static getLogs() {
    return this.logs.slice(-100); // Return last 100 logs
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      args
    };

    Logger.logs.push(logEntry);
    if (Logger.logs.length > Logger.maxLogs) {
      Logger.logs.shift();
    }

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

  error(message, ...args) {
    this.log('ERROR', message, ...args);
  }

  warn(message, ...args) {
    this.log('WARN', message, ...args);
  }

  info(message, ...args) {
    this.log('INFO', message, ...args);
  }

  debug(message, ...args) {
    this.log('DEBUG', message, ...args);
  }

  success(message, ...args) {
    this.log('SUCCESS', message, ...args);
  }
}

// Initialize the extension
const corsExtension = new CORSBypassExtension();