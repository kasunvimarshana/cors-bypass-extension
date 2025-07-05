// Service Worker for CORS Bypass Extension
class CORSBypassExtension {
  constructor() {
    this.enabled = true;
    this.customRules = new Map();
    this.init();
  }

  init() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      this.setupDefaultRules();
      this.loadSettings();
    });

    // Listen for messages from popup/content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Will respond asynchronously
    });

    // Listen for tab updates to inject content script
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.injectContentScript(tabId, tab.url);
      }
    });

    // Update badge based on status
    this.updateBadge();
  }

  async setupDefaultRules() {
    try {
      // Clear existing rules
      const existingRules =
        await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = existingRules.map((rule) => rule.id);

      if (ruleIdsToRemove.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
        });
      }

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

      console.log('CORS bypass rules added successfully');
    } catch (error) {
      console.error('Error setting up CORS rules:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getStatus':
          sendResponse({ enabled: this.enabled });
          break;

        case 'toggle':
          this.enabled = !this.enabled;
          await this.saveSettings();
          await this.updateRules();
          this.updateBadge();
          sendResponse({ enabled: this.enabled });
          break;

        case 'addCustomRule':
          await this.addCustomRule(request.rule);
          sendResponse({ success: true });
          break;

        case 'removeCustomRule':
          await this.removeCustomRule(request.ruleId);
          sendResponse({ success: true });
          break;

        case 'getCustomRules':
          sendResponse({ rules: Array.from(this.customRules.values()) });
          break;

        case 'makeRequest':
          const result = await this.makeProxyRequest(
            request.url,
            request.options
          );
          sendResponse(result);
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async makeProxyRequest(url, options = {}) {
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

      return {
        success: true,
        data: data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 0,
        statusText: 'Network Error',
      };
    }
  }

  async updateRules() {
    if (this.enabled) {
      await this.setupDefaultRules();
    } else {
      // Remove all dynamic rules
      const existingRules =
        await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = existingRules.map((rule) => rule.id);

      if (ruleIdsToRemove.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
        });
      }
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
  }

  async removeCustomRule(ruleId) {
    this.customRules.delete(ruleId);
    await this.saveSettings();

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
    });
  }

  async injectContentScript(tabId, url) {
    try {
      if (
        this.enabled &&
        (url.startsWith('http://') || url.startsWith('https://'))
      ) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['inject.js'],
        });
      }
    } catch (error) {
      // Ignore errors for restricted pages
    }
  }

  updateBadge() {
    const text = this.enabled ? 'ON' : 'OFF';
    const color = this.enabled ? '#4CAF50' : '#F44336';

    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  }

  async saveSettings() {
    await chrome.storage.local.set({
      enabled: this.enabled,
      customRules: Array.from(this.customRules.entries()),
    });
  }

  async loadSettings() {
    const data = await chrome.storage.local.get(['enabled', 'customRules']);
    this.enabled = data.enabled !== undefined ? data.enabled : true;

    if (data.customRules) {
      this.customRules = new Map(data.customRules);
    }

    this.updateBadge();
  }
}

// Initialize the extension
const corsExtension = new CORSBypassExtension();
