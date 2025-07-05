// Injected Script for CORS Bypass Extension
(function () {
  'use strict';

  class CORSBypassInjector {
    constructor() {
      this.pendingRequests = new Map();
      this.requestId = 0;
      this.init();
    }

    init() {
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

      console.log('🌐 CORS Bypass Extension injected successfully');
    }

    overrideFetch() {
      const originalFetch = window.fetch;
      const self = this;

      window.fetch = function (input, init = {}) {
        // Check if this is a cross-origin request
        const url = typeof input === 'string' ? input : input.url;

        if (self.isCrossOrigin(url)) {
          console.log('🔄 Bypassing CORS for fetch:', url);
          return self.makeBypassRequest(url, init);
        }

        // Use original fetch for same-origin requests
        return originalFetch.call(this, input, init);
      };
    }

    overrideXMLHttpRequest() {
      const originalXHR = window.XMLHttpRequest;
      const self = this;

      window.XMLHttpRequest = function () {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        const originalSetRequestHeader = xhr.setRequestHeader;

        let method,
          url,
          headers = {};

        xhr.open = function (m, u, async, user, password) {
          method = m;
          url = u;
          return originalOpen.call(this, m, u, async, user, password);
        };

        xhr.setRequestHeader = function (header, value) {
          headers[header] = value;
          return originalSetRequestHeader.call(this, header, value);
        };

        xhr.send = function (data) {
          if (self.isCrossOrigin(url)) {
            console.log('🔄 Bypassing CORS for XHR:', url);

            // Use our bypass method
            self
              .makeBypassRequest(url, {
                method: method,
                headers: headers,
                body: data,
              })
              .then((response) => {
                // Simulate XHR response
                Object.defineProperty(xhr, 'status', {
                  value: response.status,
                });
                Object.defineProperty(xhr, 'statusText', {
                  value: response.statusText,
                });
                Object.defineProperty(xhr, 'responseText', {
                  value:
                    typeof response.data === 'string'
                      ? response.data
                      : JSON.stringify(response.data),
                });
                Object.defineProperty(xhr, 'response', {
                  value: response.data,
                });
                Object.defineProperty(xhr, 'readyState', { value: 4 });

                // Trigger events
                if (xhr.onreadystatechange) xhr.onreadystatechange();
                if (xhr.onload) xhr.onload();
              })
              .catch((error) => {
                Object.defineProperty(xhr, 'status', { value: 0 });
                Object.defineProperty(xhr, 'statusText', {
                  value: 'Network Error',
                });
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
    }

    async makeBypassRequest(url, options = {}) {
      const requestId = ++this.requestId;

      return new Promise((resolve, reject) => {
        this.pendingRequests.set(requestId, { resolve, reject });

        // Send request to content script
        window.postMessage(
          {
            type: 'CORS_BYPASS_REQUEST',
            requestId: requestId,
            url: url,
            options: options,
          },
          '*'
        );

        // Set timeout
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, 30000); // 30 second timeout
      });
    }

    handleResponse(data) {
      const { requestId, response } = data;
      const pending = this.pendingRequests.get(requestId);

      if (!pending) return;

      this.pendingRequests.delete(requestId);

      if (response.success) {
        // Create a Response-like object for fetch compatibility
        const mockResponse = {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.statusText,
          headers: new Map(Object.entries(response.headers || {})),
          data: response.data,
          json: () =>
            Promise.resolve(
              typeof response.data === 'object'
                ? response.data
                : JSON.parse(response.data)
            ),
          text: () =>
            Promise.resolve(
              typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data)
            ),
          blob: () =>
            Promise.resolve(
              new Blob([
                typeof response.data === 'string'
                  ? response.data
                  : JSON.stringify(response.data),
              ])
            ),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          clone: () => mockResponse,
        };

        pending.resolve(mockResponse);
      } else {
        pending.reject(new Error(response.error || 'Request failed'));
      }
    }

    isCrossOrigin(url) {
      try {
        const requestUrl = new URL(url, window.location.href);
        return requestUrl.origin !== window.location.origin;
      } catch (e) {
        return false;
      }
    }
  }

  // Advanced CORS bypass utilities
  class CORSUtils {
    static addCORSHeaders(response) {
      const headers = response.headers || {};
      return {
        ...headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': '*',
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
            'Access-Control-Request-Headers': 'Content-Type',
          },
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    }
  }

  // Global API for external usage
  window.CORSBypass = {
    isActive: true,

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
  };

  // Initialize the injector
  new CORSBypassInjector();

  // Notify that extension is ready
  window.dispatchEvent(
    new CustomEvent('corsbypass:ready', {
      detail: { version: '1.0.0', features: ['fetch', 'xhr', 'proxy'] },
    })
  );
})();
