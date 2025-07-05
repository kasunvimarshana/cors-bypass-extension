// Enhanced Injected Script for CORS Bypass Extension
(function() {
  'use strict';

  // Prevent multiple injections
  if (window.corsbypassInjected) {
    return;
  }
  window.corsbypassInjected = true;

  class CORSBypassInjector {
    constructor() {
      this.pendingRequests = new Map();
      this.requestId = 0;
      this.logger = new Logger('Inject');
      this.init();
    }

    init() {
      this.logger.info('🎯 Initializing CORS Bypass Injector...');
      
      // Override fetch API
      this.overrideFetch();

      // Override XMLHttpRequest
      this.overrideXMLHttpRequest();

      // Listen for responses from content script
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        if (event.data.type === 'CORS_BYPASS_RESPONSE') {
          this.handleResponse(event.data);
        }
      });

      this.logger.success('✅ CORS Bypass Extension injected successfully');
    }

    overrideFetch() {
      const originalFetch = window.fetch;
      const self = this;

      window.fetch = function(input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;
        
        if (self.isCrossOrigin(url)) {
          self.logger.info('🔄 Bypassing CORS for fetch:', url);
          return self.makeBypassRequest(url, init);
        }

        // Use original fetch for same-origin requests
        return originalFetch.call(this, input, init);
      };

      this.logger.debug('Fetch API overridden');
    }

    overrideXMLHttpRequest() {
      const originalXHR = window.XMLHttpRequest;
      const self = this;

      window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        const originalSetRequestHeader = xhr.setRequestHeader;

        let method, url, headers = {};

        xhr.open = function(m, u, async, user, password) {
          method = m;
          url = u;
          return originalOpen.call(this, m, u, async, user, password);
        };

        xhr.setRequestHeader = function(header, value) {
          headers[header] = value;
          return originalSetRequestHeader.call(this, header, value);
        };

        xhr.send = function(data) {
          if (self.isCrossOrigin(url)) {
            self.logger.info('🔄 Bypassing CORS for XHR:', url);

            // Use our bypass method
            self.makeBypassRequest(url, {
              method: method,
              headers: headers,
              body: data
            }).then(response => {
              self.logger.debug('XHR bypass response received');
              
              // Simulate XHR response
              Object.defineProperty(xhr, 'status', { value: response.status });
              Object.defineProperty(xhr, 'statusText', { value: response.statusText });
              Object.defineProperty(xhr, 'responseText', { 
                value: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
              });
              Object.defineProperty(xhr, 'response', { value: response.data });
              Object.defineProperty(xhr, 'readyState', { value: 4 });

              // Add response headers
              const originalGetResponseHeader = xhr.getResponseHeader;
              const originalGetAllResponseHeaders = xhr.getAllResponseHeaders;
              
              xhr.getResponseHeader = function(header) {
                return response.headers && response.headers[header.toLowerCase()] || null;
              };
              
              xhr.getAllResponseHeaders = function() {
                if (!response.headers) return '';
                return Object.entries(response.headers)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('\r\n');
              };

              // Trigger events
              if (xhr.onreadystatechange) xhr.onreadystatechange();
              if (xhr.onload) xhr.onload();
            }).catch(error => {
              self.logger.error('XHR bypass error:', error);
              
              Object.defineProperty(xhr, 'status', { value: 0 });
              Object.defineProperty(xhr, 'statusText', { value: 'Network Error' });
              Object.defineProperty(xhr, 'readyState', { value: 4 });

              if (xhr.onerror) xhr.onerror();
            });

            return;
          }

          // Use original send for same-origin requests
          return originalSend.call(this, data);
        };

        return xhr;
      };

      this.logger.debug('XMLHttpRequest overridden');
    }

    async makeBypassRequest(url, options = {}) {
      const requestId = ++this.requestId;
      
      this.logger.debug('Making bypass request:', requestId, url);

      return new Promise((resolve, reject) => {
        this.pendingRequests.set(requestId, { resolve, reject });

        // Send request to content script
        window.postMessage({
          type: 'CORS_BYPASS_REQUEST',
          requestId: requestId,
          url: url,
          options: options
        }, '*');

        // Set timeout
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            this.logger.error('Request timeout:', requestId);
            reject(new Error('Request timeout'));
          }
        }, 30000); // 30 second timeout
      });
    }

    handleResponse(data) {
      const { requestId, response } = data;
      const pending = this.pendingRequests.get(requestId);

      if (!pending) {
        this.logger.warn('No pending request for ID:', requestId);
        return;
      }

      this.pendingRequests.delete(requestId);
      this.logger.debug('Handling response for request:', requestId, response.success);

      if (response.success) {
        // Create a Response-like object for fetch compatibility
        const mockResponse = {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.statusText,
          headers: this.createHeadersObject(response.headers || {}),
          data: response.data,
          url: response.url,
          redirected: false,
          type: 'cors',
          json: () => Promise.resolve(
            typeof response.data === 'object' ? response.data : JSON.parse(response.data)
          ),
          text: () => Promise.resolve(
            typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
          ),
          blob: () => Promise.resolve(new Blob([
            typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
          ])),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          formData: () => Promise.resolve(new FormData()),
          clone: () => mockResponse
        };

        pending.resolve(mockResponse);
      } else {
        pending.reject(new Error(response.error || 'Request failed'));
      }
    }

    createHeadersObject(headersObj) {
      const headers = new Map();
      
      Object.entries(headersObj).forEach(([key, value]) => {
        headers.set(key.toLowerCase(), value);
      });
      
      return {
        get: (name) => headers.get(name.toLowerCase()),
        has: (name) => headers.has(name.toLowerCase()),
        keys: () => headers.keys(),
        values: () => headers.values(),
        entries: () => headers.entries(),
        forEach: (callback) => headers.forEach(callback),
        [Symbol.iterator]: () => headers.entries()
      };
    }

    isCrossOrigin(url) {
      try {
        const requestUrl = new URL(url, window.location.href);
        const isCrossOrigin = requestUrl.origin !== window.location.origin;
        
        if (isCrossOrigin) {
          this.logger.debug('Cross-origin request detected:', requestUrl.origin, 'vs', window.location.origin);
        }
        
        return isCrossOrigin;
      } catch (e) {
        this.logger.error('Error checking cross-origin:', e);
        return false;
      }
    }
  }

  // Enhanced CORS bypass utilities
  class CORSUtils {
    static addCORSHeaders(response) {
      const headers = response.headers || {};
      return {
        ...headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': '*'
      };
    }

    static createProxyUrl(targetUrl, proxyBase = '') {
      if (!proxyBase) return targetUrl;
      return `${proxyBase}${encodeURIComponent(targetUrl)}`;
    }

    static async testCORS(url) {
      try {
        const response = await fetch(url, {
          method: 'OPTIONS',
          headers: {
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    }
  }

  // Simple logger for inject script
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

  // Global API for external usage
  window.CORSBypass = {
    isActive: true,
    version: '1.0.0',

    async fetch(url, options = {}) {
      const injector = new CORSBypassInjector();
      return injector.makeBypassRequest(url, options);
    },

    async testURL(url) {
      return CORSUtils.testCORS(url);
    },

    createProxy(url, proxy) {
      return CORSUtils.createProxyUrl(url, proxy);
    },

    addHeaders(response) {
      return CORSUtils.addCORSHeaders(response);
    },

    getStats() {
      return {
        version: this.version,
        isActive: this.isActive,
        features: ['fetch', 'xhr', 'proxy', 'logging']
      };
    }
  };

  // Initialize the injector
  const injector = new CORSBypassInjector();

  // Notify that extension is ready
  window.dispatchEvent(new CustomEvent('corsbypass:ready', {
    detail: {
      version: '1.0.0',
      features: ['fetch', 'xhr', 'proxy', 'logging'],
      injector: injector
    }
  }));

  // Add some global utilities
  window.corsbypass = window.CORSBypass;
})();