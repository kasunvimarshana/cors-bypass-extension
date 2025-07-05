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

let settings = { ...DEFAULT_SETTINGS };

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  // Load settings
  const data = await chrome.storage.sync.get('corsSettings');
  if (!data?.corsSettings) {
    await chrome.storage.sync.set({ corsSettings: DEFAULT_SETTINGS });
  }

  // Update dynamic rules
  await updateDynamicRules();
});

// Load saved settings on startup
chrome.storage.sync.get('corsSettings', (data) => {
  if (data?.corsSettings) {
    settings = { ...DEFAULT_SETTINGS, ...data.corsSettings };
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'sync' && changes.corsSettings) {
    settings = { ...DEFAULT_SETTINGS, ...changes.corsSettings.newValue };
    console.log('CORS Bypass settings updated:', settings);
    await updateDynamicRules();
  }
});

// Update dynamic rules based on settings
async function updateDynamicRules() {
  try {
    // Remove existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map((rule) => rule.id);

    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
      });
    }

    // Add new rules if enabled
    if (settings.enabled) {
      const rules = createDynamicRules();
      if (rules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: rules,
        });
      }
    }

    console.log('Dynamic rules updated successfully');
  } catch (error) {
    console.error('Error updating dynamic rules:', error);
  }
}

// Create dynamic rules based on settings
function createDynamicRules() {
  const rules = [];

  // Base rule for CORS headers
  const responseHeaders = [];

  // Add origin header
  const originValue = getOriginValue();
  responseHeaders.push({
    header: 'Access-Control-Allow-Origin',
    operation: 'set',
    value: originValue,
  });

  // Add methods header
  responseHeaders.push({
    header: 'Access-Control-Allow-Methods',
    operation: 'set',
    value: settings.allowMethods,
  });

  // Add headers header
  responseHeaders.push({
    header: 'Access-Control-Allow-Headers',
    operation: 'set',
    value: settings.allowHeaders,
  });

  // Add credentials header
  responseHeaders.push({
    header: 'Access-Control-Allow-Credentials',
    operation: 'set',
    value: settings.allowCredentials ? 'true' : 'false',
  });

  // Add max-age header
  responseHeaders.push({
    header: 'Access-Control-Max-Age',
    operation: 'set',
    value: '86400',
  });

  // Add expose headers
  responseHeaders.push({
    header: 'Access-Control-Expose-Headers',
    operation: 'set',
    value: '*',
  });

  // Create main rule
  const mainRule = {
    id: 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: responseHeaders,
    },
    condition: {
      resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other'],
    },
  };

  // Add domain conditions if not all domains
  if (
    settings.domains &&
    settings.domains.length > 0 &&
    !settings.domains.includes('*')
  ) {
    mainRule.condition.requestDomains = settings.domains.map((domain) => {
      if (domain.startsWith('*.')) {
        return domain.substring(2);
      }
      return domain;
    });
  }

  rules.push(mainRule);

  // Add rule for removing existing headers if requested
  if (settings.removeExisting) {
    const removeRule = {
      id: 2,
      priority: 2,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'Access-Control-Allow-Origin', operation: 'remove' },
          { header: 'Access-Control-Allow-Methods', operation: 'remove' },
          { header: 'Access-Control-Allow-Headers', operation: 'remove' },
          { header: 'Access-Control-Allow-Credentials', operation: 'remove' },
          { header: 'Access-Control-Expose-Headers', operation: 'remove' },
          { header: 'Access-Control-Max-Age', operation: 'remove' },
        ],
      },
      condition: {
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other'],
      },
    };

    if (
      settings.domains &&
      settings.domains.length > 0 &&
      !settings.domains.includes('*')
    ) {
      removeRule.condition.requestDomains = settings.domains.map((domain) => {
        if (domain.startsWith('*.')) {
          return domain.substring(2);
        }
        return domain;
      });
    }

    rules.push(removeRule);
  }

  return rules;
}

// Get origin value based on settings
function getOriginValue() {
  switch (settings.allowOrigin) {
    case 'custom':
      return settings.customOrigin || '*';
    case 'request_origin':
      return '*'; // In declarativeNetRequest, we can't dynamically set to request origin
    case '*':
    default:
      return '*';
  }
}

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup
});

// Content script injection for advanced origin handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleCors') {
    settings.enabled = !settings.enabled;
    chrome.storage.sync.set({ corsSettings: settings });
    updateDynamicRules();
    sendResponse({ enabled: settings.enabled });
  }
});
