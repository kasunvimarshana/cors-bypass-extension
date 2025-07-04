// CORS Bypass Extension Background Script
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

let currentSettings = { ...DEFAULT_SETTINGS };
let corsEnabled = true;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  await updateIcon();
  await setupCorsRules();
  
  console.log('CORS Bypass Extension installed and initialized');
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('corsSettings');
    currentSettings = { ...DEFAULT_SETTINGS, ...result.corsSettings };
    corsEnabled = currentSettings.enabled;
  } catch (error) {
    console.error('Error loading settings:', error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

// Listen for settings changes
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'sync' && changes.corsSettings) {
    currentSettings = { ...DEFAULT_SETTINGS, ...changes.corsSettings.newValue };
    corsEnabled = currentSettings.enabled;
    await updateIcon();
    await setupCorsRules();
    
    if (currentSettings.debugMode) {
      console.log('Settings updated:', currentSettings);
    }
  }
});

// Update extension icon and badge
async function updateIcon() {
  try {
    const iconPath = corsEnabled ? {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    } : {
      "16": "icons/icon16-disabled.png",
      "32": "icons/icon32-disabled.png",
      "48": "icons/icon48-disabled.png",
      "128": "icons/icon128-disabled.png"
    };

    await chrome.action.setIcon({ path: iconPath });
    await chrome.action.setBadgeText({ text: corsEnabled ? 'ON' : 'OFF' });
    await chrome.action.setBadgeBackgroundColor({ 
      color: corsEnabled ? '#10B981' : '#EF4444' 
    });
  } catch (error) {
    console.error('Error updating icon:', error);
  }
}

// Setup CORS bypass rules using declarativeNetRequest
async function setupCorsRules() {
  try {
    // Remove ALL existing dynamic rules first
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
      
      // Wait a bit to ensure rules are fully removed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!corsEnabled) return;

    // Create new rules with unique IDs based on timestamp
    const rules = [];
    const baseId = Date.now() % 1000000; // Use timestamp to ensure uniqueness
    let ruleId = baseId;

    // Rule for modifying response headers - Fixed: removed 'fetch' from resourceTypes
    rules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'Access-Control-Allow-Origin',
            operation: 'set',
            value: getOriginValue()
          },
          {
            header: 'Access-Control-Allow-Methods',
            operation: 'set',
            value: currentSettings.allowMethods
          },
          {
            header: 'Access-Control-Allow-Headers',
            operation: 'set',
            value: currentSettings.allowHeaders
          },
          {
            header: 'Access-Control-Allow-Credentials',
            operation: 'set',
            value: currentSettings.allowCredentials ? 'true' : 'false'
          },
          {
            header: 'Access-Control-Expose-Headers',
            operation: 'set',
            value: '*'
          }
        ]
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['xmlhttprequest'] // Fixed: removed 'fetch', only use 'xmlhttprequest'
      }
    });

    // Rule for handling preflight OPTIONS requests
    rules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'Access-Control-Allow-Origin',
            operation: 'set',
            value: getOriginValue()
          },
          {
            header: 'Access-Control-Allow-Methods',
            operation: 'set',
            value: currentSettings.allowMethods
          },
          {
            header: 'Access-Control-Allow-Headers',
            operation: 'set',
            value: currentSettings.allowHeaders
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
        requestMethods: ['options']
      }
    });

    // Additional rule for general HTTP requests (covers fetch API calls)
    rules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'Access-Control-Allow-Origin',
            operation: 'set',
            value: getOriginValue()
          },
          {
            header: 'Access-Control-Allow-Methods',
            operation: 'set',
            value: currentSettings.allowMethods
          },
          {
            header: 'Access-Control-Allow-Headers',
            operation: 'set',
            value: currentSettings.allowHeaders
          },
          {
            header: 'Access-Control-Allow-Credentials',
            operation: 'set',
            value: currentSettings.allowCredentials ? 'true' : 'false'
          }
        ]
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['script', 'other'] // These resource types can cover fetch API calls
      }
    });

    // Add the new rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });

    if (currentSettings.debugMode) {
      console.log('CORS rules updated successfully:', rules.map(r => ({ id: r.id, resourceTypes: r.condition.resourceTypes, requestMethods: r.condition.requestMethods })));
    }
  } catch (error) {
    console.error('Error setting up CORS rules:', error);
    
    // If there's still an ID conflict, try to clear all rules and retry once
    if (error.message.includes('unique ID')) {
      try {
        const allRules = await chrome.declarativeNetRequest.getDynamicRules();
        if (allRules.length > 0) {
          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: allRules.map(r => r.id)
          });
          console.log('Cleared all existing rules due to ID conflict');
        }
      } catch (clearError) {
        console.error('Error clearing rules:', clearError);
      }
    }
  }
}

// Get origin value based on settings
function getOriginValue() {
  switch (currentSettings.allowOrigin) {
    case 'custom':
      return currentSettings.customOrigin || '*';
    case 'request_origin':
      return '*'; // Will be handled dynamically
    default:
      return '*';
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener(async () => {
  corsEnabled = !corsEnabled;
  
  // Update settings
  const newSettings = { ...currentSettings, enabled: corsEnabled };
  await chrome.storage.sync.set({ corsSettings: newSettings });
  
  await updateIcon();
  await setupCorsRules();
  
  if (currentSettings.debugMode) {
    console.log('CORS bypass toggled:', corsEnabled ? 'enabled' : 'disabled');
  }
});

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getStatus':
      sendResponse({ 
        enabled: corsEnabled, 
        settings: currentSettings 
      });
      break;
      
    case 'toggleCors':
      corsEnabled = !corsEnabled;
      updateSettings({ enabled: corsEnabled });
      sendResponse({ enabled: corsEnabled });
      break;
      
    case 'updateSettings':
      updateSettings(request.settings);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});

// Update settings helper
async function updateSettings(newSettings) {
  try {
    currentSettings = { ...currentSettings, ...newSettings };
    corsEnabled = currentSettings.enabled;
    
    await chrome.storage.sync.set({ corsSettings: currentSettings });
    await updateIcon();
    await setupCorsRules();
    
    if (currentSettings.debugMode) {
      console.log('Settings updated via message:', currentSettings);
    }
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

// Domain matching utility
function isUrlAllowed(url, patterns) {
  if (patterns.includes('*')) return true;
  
  try {
    const parsedUrl = new URL(url);
    return patterns.some(pattern => {
      if (pattern.startsWith('*.')) {
        const domain = pattern.substring(2);
        return (
          parsedUrl.hostname === domain || 
          parsedUrl.hostname.endsWith('.' + domain)
        );
      }
      return parsedUrl.hostname === pattern;
    });
  } catch (e) {
    return false;
  }
}

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  await updateIcon();
  await setupCorsRules();
});