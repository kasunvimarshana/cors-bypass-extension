// Content Script for CORS Bypass Extension
(function () {
  'use strict';

  class CORSContentScript {
    constructor() {
      console.log('📄 CORS Content Script initializing...');
      this.init();
    }

    init() {
      // Inject the main script into the page
      this.injectScript();

      // Listen for messages from the injected script
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        if (event.data.type === 'CORS_BYPASS_REQUEST') {
          console.log('📨 Received CORS bypass request:', event.data);
          this.handleCORSRequest(event.data);
        }
      });

      // Monitor for CORS errors
      this.monitorCORSErrors();

      console.log('✅ Content script initialized successfully');
    }

    injectScript() {
      console.log('💉 Injecting script into page...');
      try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.onload = function () {
          console.log('✅ Inject script loaded successfully');
          this.remove();
        };
        script.onerror = function () {
          console.error('❌ Failed to load inject script');
        };
        (document.head || document.documentElement).appendChild(script);
      } catch (error) {
        console.error('❌ Error injecting script:', error);
      }
    }

    async handleCORSRequest(data) {
      console.log('🔄 Handling CORS request:', data.url);
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'makeRequest',
          url: data.url,
          options: data.options,
        });

        console.log('📥 CORS request response:', response);

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
        console.error('❌ Error handling CORS request:', error);
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
      console.log('👁️ Setting up CORS error monitoring...');

      // Override console.error to catch CORS errors
      const originalError = console.error;
      console.error = function (...args) {
        const message = args.join(' ');
        if (message.includes('CORS') || message.includes('Cross-Origin')) {
          console.log('🚨 CORS error detected:', message);
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
        console.log('📡 XHR opened:', method, url);
        return originalXHROpen.call(this, method, url, async, user, password);
      };

      XMLHttpRequest.prototype.send = function (data) {
        const xhr = this;
        console.log('📤 XHR sending:', xhr._method, xhr._url);

        // Add error listener
        xhr.addEventListener('error', function () {
          console.log('🚨 XHR CORS error detected:', xhr._method, xhr._url);
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

        // Add load listener for success logging
        xhr.addEventListener('load', function () {
          console.log('✅ XHR completed:', xhr._method, xhr._url, xhr.status);
        });

        return originalXHRSend.call(this, data);
      };

      console.log('✅ CORS error monitoring set up');
    }
  }

  // Initialize content script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🎬 DOM loaded, initializing content script...');
      new CORSContentScript();
    });
  } else {
    console.log('🎬 DOM already loaded, initializing content script...');
    new CORSContentScript();
  }
})();
