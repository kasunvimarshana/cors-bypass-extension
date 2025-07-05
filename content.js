// Content Script for CORS Bypass Extension
(function () {
  'use strict';

  class CORSContentScript {
    constructor() {
      this.init();
    }

    init() {
      // Inject the main script into the page
      this.injectScript();

      // Listen for messages from the injected script
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        if (event.data.type === 'CORS_BYPASS_REQUEST') {
          this.handleCORSRequest(event.data);
        }
      });

      // Monitor for CORS errors
      this.monitorCORSErrors();
    }

    injectScript() {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('inject.js');
      script.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    }

    async handleCORSRequest(data) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'makeRequest',
          url: data.url,
          options: data.options,
        });

        // Send response back to injected script
        window.postMessage(
          {
            type: 'CORS_BYPASS_RESPONSE',
            requestId: data.requestId,
            response: response,
          },
          '*'
        );
      } catch (error) {
        window.postMessage(
          {
            type: 'CORS_BYPASS_RESPONSE',
            requestId: data.requestId,
            response: {
              success: false,
              error: error.message,
            },
          },
          '*'
        );
      }
    }

    monitorCORSErrors() {
      // Override console.error to catch CORS errors
      const originalError = console.error;
      console.error = function (...args) {
        const message = args.join(' ');
        if (message.includes('CORS') || message.includes('Cross-Origin')) {
          // Notify about CORS error
          window.postMessage(
            {
              type: 'CORS_ERROR_DETECTED',
              message: message,
              timestamp: new Date().toISOString(),
            },
            '*'
          );
        }
        originalError.apply(console, args);
      };

      // Monitor XMLHttpRequest for CORS errors
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (
        method,
        url,
        async,
        user,
        password
      ) {
        this._method = method;
        this._url = url;
        return originalXHROpen.call(this, method, url, async, user, password);
      };

      XMLHttpRequest.prototype.send = function (data) {
        const xhr = this;

        // Add error listener
        xhr.addEventListener('error', function () {
          window.postMessage(
            {
              type: 'XHR_CORS_ERROR',
              method: xhr._method,
              url: xhr._url,
              timestamp: new Date().toISOString(),
            },
            '*'
          );
        });

        return originalXHRSend.call(this, data);
      };
    }
  }

  // Initialize content script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new CORSContentScript();
    });
  } else {
    new CORSContentScript();
  }
})();
