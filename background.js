import { DEFAULT_SETTINGS } from './config.js';
import { isUrlAllowed } from './utils.js';

let settings = { ...DEFAULT_SETTINGS };

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('corsSettings', (data) => {
    if (data.corsSettings) {
      settings = { ...settings, ...data.corsSettings };
    }
    updateCorsRules(settings);
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.corsSettings) {
    settings = { ...DEFAULT_SETTINGS, ...changes.corsSettings.newValue };
    updateCorsRules(settings);
  }
});

function updateCorsRules(config) {
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
  });
}