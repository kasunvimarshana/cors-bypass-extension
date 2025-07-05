// Enhanced Content Script for CORS Bypass Extension
(function() {
  'use strict';

  class CORSContentScript {
    constructor() {
      this.logger = new Logger('Content');
      this.init();
    }

    init() {
      this.logger.info('🎯 Initializing CORS Content Script...');
      
      // Inject the main script into the page
      this.injectScript();

      // Listen for messages from the injected script
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        switch (event.data.type) {
          case 'CORS_BYPASS_REQUEST':
            this.handleCORSRequest(event.data);
            break;
          case 'CORS_ERROR_DETECTED':
            this.handleCORSError(event.data);
            break;
          case 'XHR_CORS_ERROR':
            this.handleXHRError(event.data);
            break;
        }
      });

      // Monitor for CORS errors
      this.monitorCORSErrors();
      
      this.logger.success('✅ Content script initialized successfully');
    }

    injectScript() {
      try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.onload = function() {
          this.remove();
        };
        script.onerror = (error) => {
          this.logger.error('Failed to inject script:', error);
        };
        
        (document.head || document.documentElement).appendChild(script);
        this.logger.debug('Inject script added to DOM');
      } catch (error) {
        this.logger.error('Error injecting script:', error);
      }
    }

    async handleCORSRequest(data) {
      try {
        this.logger.info('Handling CORS request:', data.url);
        
        const response = await chrome.runtime.sendMessage({
          action: 'makeRequest',
          url: data.url,
          options: data.options
        });

        this.logger.debug('CORS request response:', response.success);

        // Send response back to injected script
        window.postMessage({
          type: 'CORS_BYPASS_RESPONSE',
          requestId: data.requestId,
          response: response
        }, '*');
      } catch (error) {
        this.logger.error('Error handling CORS request:', error);
        
        window.postMessage({
          type: 'CORS_BYPASS_RESPONSE',
          requestId: data.requestId,
          response: {
            success: false,
            error: error.message
          }
        }, '*');
      }
    }

    handleCORSError(data) {
      this.logger.warn('CORS error detected:', data.message);
      
      // Could notify background script about CORS errors
      chrome.runtime.sendMessage({
        action: 'corsErrorDetected',
        error: data.message,
        timestamp: data.timestamp,
        url: window.location.href
      }).catch(() => {
        // Ignore errors
      });
    }

    handleXHRError(data) {
      this.logger.warn('XHR CORS error detected:', data.url);
      
      // Could notify background script about XHR errors
      chrome.runtime.sendMessage({
        action: 'xhrErrorDetected',
        method: data.method,
        url: data.url,
        timestamp: data.timestamp,
        pageUrl: window.location.href
      }).catch(() => {
        // Ignore errors
      });
    }

    monitorCORSErrors() {
      // Override console.error to catch CORS errors
      const originalError = console.error;
      const self = this;
      
      console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('CORS') || message.includes('Cross-Origin')) {
          self.logger.debug('Console CORS error intercepted:', message);
          
          window.postMessage({
            type: 'CORS_ERROR_DETECTED',
            message: message,
            timestamp: new Date().toISOString()
          }, '*');
        }
        originalError.apply(console, args);
      };

      // Monitor XMLHttpRequest for CORS errors
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._corsMethod = method;
        this._corsUrl = url;
        return originalXHROpen.call(this, method, url, async, user, password);
      };

      XMLHttpRequest.prototype.send = function(data) {
        const xhr = this;

        // Add error listener
        xhr.addEventListener('error', function() {
          self.logger.debug('XHR error intercepted:', xhr._corsUrl);
          
          window.postMessage({
            type: 'XHR_CORS_ERROR',
            method: xhr._corsMethod,
            url: xhr._corsUrl,
            timestamp: new Date().toISOString()
          }, '*');
        });

        return originalXHRSend.call(this, data);
      };

      // Monitor fetch for CORS errors
      const originalFetch = window.fetch;
      
      window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        
        return originalFetch.call(this, input, init).catch(error => {
          if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
            self.logger.debug('Fetch CORS error intercepted:', url);
            
            window.postMessage({
              type: 'CORS_ERROR_DETECTED',
              message: error.message,
              url: url,
              timestamp: new Date().toISOString()
            }, '*');
          }
          throw error;
        });
      };

      this.logger.debug('CORS error monitoring enabled');
    }
  }

  // Simple logger for content script
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

  // Initialize content script based on document state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new CORSContentScript();
    });
  } else {
    new CORSContentScript();
  }
})();