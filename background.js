// Service Worker for CORS Bypass Extension
class CORSBypassExtension {
  constructor() {
    this.enabled = true;
    this.customRules = new Map();
    this.init();
  }

  init() {
    console.log('🚀 CORS Bypass Extension initializing...');

    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('📦 Extension installed/updated');
      this.setupDefaultRules();
      this.loadSettings();
    });

    // Listen for messages from popup/content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Message received:', request);
      this.handleMessage(request, sender, sendResponse);
      return true; // Will respond asynchronously
    });

    // Listen for tab updates to inject content script
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        console.log('🔄 Tab updated:', tab.url);
        this.injectContentScript(tabId, tab.url);
      }
    });

    // Load settings on startup
    this.loadSettings().then(() => {
      console.log('⚙️ Settings loaded, enabled:', this.enabled);
      this.updateBadge();
    });
  }

  async setupDefaultRules() {
    console.log('🔧 Setting up default CORS rules...');
    try {
      // Clear existing dynamic rules
      const existingRules =
        await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = existingRules.map((rule) => rule.id);

      if (ruleIdsToRemove.length > 0) {
        console.log('🗑️ Removing existing rules:', ruleIdsToRemove);
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
        });
      }

      if (this.enabled) {
        // Add CORS bypass rules
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
                  value: '*',
                },
                {
                  header: 'Access-Control-Allow-Methods',
                  operation: 'set',
                  value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
                },
                {
                  header: 'Access-Control-Allow-Headers',
                  operation: 'set',
                  value: '*',
                },
                {
                  header: 'Access-Control-Allow-Credentials',
                  operation: 'set',
                  value: 'true',
                },
                {
                  header: 'Access-Control-Expose-Headers',
                  operation: 'set',
                  value: '*',
                },
                {
                  header: 'Access-Control-Max-Age',
                  operation: 'set',
                  value: '86400',
                },
              ],
            },
            condition: {
              urlFilter: '*',
              resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame'],
            },
          },
          {
            id: 1001,
            priority: 2,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [
                { header: 'Origin', operation: 'remove' },
                { header: 'Referer', operation: 'remove' },
              ],
            },
            condition: {
              urlFilter: '*',
              resourceTypes: ['xmlhttprequest'],
            },
          },
        ];

        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: corsRules,
        });

        console.log('✅ CORS bypass rules added successfully');
      } else {
        console.log('🔴 CORS bypass disabled, no rules added');
      }
    } catch (error) {
      console.error('❌ Error setting up CORS rules:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('🔍 Handling message:', request.action);
    try {
      switch (request.action) {
        case 'getStatus':
          console.log('📊 Status requested, enabled:', this.enabled);
          sendResponse({ enabled: this.enabled });
          break;

        case 'toggle':
          console.log('🔄 Toggle requested, current state:', this.enabled);
          this.enabled = !this.enabled;
          console.log('🔄 New state:', this.enabled);
          await this.saveSettings();
          await this.setupDefaultRules(); // Re-setup rules based on new state
          this.updateBadge();
          sendResponse({ enabled: this.enabled });
          break;

        case 'addCustomRule':
          console.log('➕ Adding custom rule:', request.rule);
          await this.addCustomRule(request.rule);
          sendResponse({ success: true });
          break;

        case 'removeCustomRule':
          console.log('➖ Removing custom rule:', request.ruleId);
          await this.removeCustomRule(request.ruleId);
          sendResponse({ success: true });
          break;

        case 'getCustomRules':
          console.log('📋 Custom rules requested');
          sendResponse({ rules: Array.from(this.customRules.values()) });
          break;

        case 'makeRequest':
          console.log('🌐 Proxy request:', request.url);
          const result = await this.makeProxyRequest(
            request.url,
            request.options
          );
          sendResponse(result);
          break;

        default:
          console.warn('⚠️ Unknown action:', request.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async makeProxyRequest(url, options = {}) {
    console.log('🔗 Making proxy request to:', url);
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || null,
        mode: 'cors',
        credentials: 'include',
      });

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      console.log('✅ Proxy request successful:', response.status);
      return {
        success: true,
        data: data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      console.error('❌ Proxy request failed:', error);
      return {
        success: false,
        error: error.message,
        status: 0,
        statusText: 'Network Error',
      };
    }
  }

  async addCustomRule(rule) {
    const ruleId = Date.now();
    const customRule = {
      id: ruleId,
      priority: rule.priority || 1,
      action: rule.action,
      condition: rule.condition,
    };

    this.customRules.set(ruleId, customRule);
    await this.saveSettings();

    if (this.enabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [customRule],
      });
    }
    console.log('✅ Custom rule added:', ruleId);
  }

  async removeCustomRule(ruleId) {
    this.customRules.delete(ruleId);
    await this.saveSettings();

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
    });
    console.log('✅ Custom rule removed:', ruleId);
  }

  async injectContentScript(tabId, url) {
    try {
      if (
        this.enabled &&
        (url.startsWith('http://') || url.startsWith('https://'))
      ) {
        console.log('💉 Injecting content script into tab:', tabId);
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js'],
        });
      }
    } catch (error) {
      console.log('⚠️ Could not inject content script:', error.message);
    }
  }

  updateBadge() {
    const text = this.enabled ? 'ON' : 'OFF';
    const color = this.enabled ? '#4CAF50' : '#F44336';

    console.log('🏷️ Updating badge:', text, color);
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  }

  async saveSettings() {
    console.log('💾 Saving settings...');
    try {
      await chrome.storage.local.set({
        enabled: this.enabled,
        customRules: Array.from(this.customRules.entries()),
      });
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  async loadSettings() {
    console.log('📂 Loading settings...');
    try {
      const data = await chrome.storage.local.get(['enabled', 'customRules']);
      this.enabled = data.enabled !== undefined ? data.enabled : true;

      if (data.customRules) {
        this.customRules = new Map(data.customRules);
      }

      console.log(
        '✅ Settings loaded - enabled:',
        this.enabled,
        'custom rules:',
        this.customRules.size
      );
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }
}

// Initialize the extension
const corsExtension = new CORSBypassExtension();
