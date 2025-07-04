import { DEFAULT_SETTINGS } from './config.js';
import { isUrlAllowed } from './utils.js';

let settings = { ...DEFAULT_SETTINGS };

console.log("[CORS Bypass] Extension initialized with default settings", settings);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('corsSettings', (data) => {
    if (data.corsSettings) {
      settings = { ...settings, ...data.corsSettings };
      console.log("[CORS Bypass] Loaded saved settings on install", settings);
    }
    updateCorsRules(settings);
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.corsSettings) {
    settings = { ...DEFAULT_SETTINGS, ...changes.corsSettings.newValue };
    console.log("[CORS Bypass] Settings updated from storage change", settings);
    updateCorsRules(settings);
  }
});

function updateCorsRules(config) {
  console.log("[CORS Bypass] Applying CORS rules with config", config);

  const headers = [
    {
      header: 'Access-Control-Allow-Origin',
      operation: 'set',
      value: config.allowOrigin === 'custom' ? config.customOrigin : '*'
    },
    {
      header: 'Access-Control-Allow-Methods',
      operation: 'set',
      value: config.allowMethods
    },
    {
      header: 'Access-Control-Allow-Headers',
      operation: 'set',
      value: config.allowHeaders
    },
    {
      header: 'Access-Control-Allow-Credentials',
      operation: 'set',
      value: config.allowCredentials ? 'true' : 'false'
    }
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: headers
        },
        condition: {
          urlFilter: '|http',
          resourceTypes: ['xmlhttprequest']
        }
      }
    ]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("[CORS Bypass] Failed to apply rules:", chrome.runtime.lastError);
    } else {
      console.log("[CORS Bypass] Rules successfully applied.");
    }
  });
}