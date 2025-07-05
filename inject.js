// Injected Script for CORS Bypass Extension
(function () {
  'use strict';

  class CORSBypassInjector {
    constructor() {
      this.pendingRequests = new Map();
      this.requestId = 0;
      this.requestTimeout = 30000; // 30 seconds timeout
      this.init();
    }

    init() {
      console.log('🌐 CORS Bypass Injector initializing...');

      // Override fetch API
      this.overrideFetch();

      // Override XMLHttpRequest
      this.overrideXMLHttpRequest();

      // Listen for responses from content script
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        if (event.data.type === 'CORS_BYPASS_RESPONSE') {
          console.log('📥 Received bypass response:', event.data);
          this.handleResponse(event.data);
        } else if (event.data.type === 'CORS_ERROR_DETECTED') {
          console.log('🚨 CORS error detected:', event.data.message);
        }
      });

      console.log('✅ CORS Bypass Extension injected successfully');
    }

    overrideFetch() {
      console.log('🔄 Overriding fetch API...');
      const originalFetch = window.fetch;
      const self = this;

      window.fetch = function (input, init = {}) {
        // Check if this is a cross-origin request
        const url = typeof input === 'string' ? input : input.url;

        if (self.isCrossOrigin(url)) {
          console.log('🔄 Bypassing CORS for fetch:', url);
          return self.makeBypassRequest(url, init);
        }

        console.log('📡 Same-origin fetch request:', url);
        // Use original fetch for same-origin requests
        return originalFetch.call(this, input, init);
      };

      console.log('✅ Fetch API override complete');
    }

    overrideXMLHttpRequest() {
      console.log('🔄 Overriding XMLHttpRequest...');
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
          console.log('📡 XHR opened:', method, url);
          return originalOpen.call(this, m, u, async, user, password);
        };

        xhr.setRequestHeader = function (header, value) {
          headers[header] = value;
          console.log('📋 XHR header set:', header, value);
          return originalSetRequestHeader.call(this, header, value);
        };

        xhr.send = function (data) {
          console.log('📤 XHR sending:', method, url);

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
                console.log('✅ XHR bypass successful:', response.status);

                // Simulate XHR response
                Object.defineProperty(xhr, 'status', {
                  value: response.status,
                  writable: false,
                });
                Object.defineProperty(xhr, 'statusText', {
                  value: response.statusText,
                  writable: false,
                });
                Object.defineProperty(xhr, 'responseText', {
                  value:
                    typeof response.data === 'string'
                      ? response.data
                      : JSON.stringify(response.data),
                  writable: false,
                });
                Object.defineProperty(xhr, 'response', {
                  value: response.data,
                  writable: false,
                });
                Object.defineProperty(xhr, 'readyState', {
                  value: 4,
                  writable: false,
                });

                // Trigger events
                if (xhr.onreadystatechange) {
                  console.log('🔄 Triggering onreadystatechange');
                  xhr.onreadystatechange();
                }
                if (xhr.onload) {
                  console.log('✅ Triggering onload');
                  xhr.onload();
                }
              })
              .catch((error) => {
                console.error('❌ XHR bypass failed:', error);

                Object.defineProperty(xhr, 'status', {
                  value: 0,
                  writable: false,
                });
                Object.defineProperty(xhr, 'statusText', {
                  value: 'Network Error',
                  writable: false,
                });
                Object.defineProperty(xhr, 'readyState', {
                  value: 4,
                  writable: false,
                });

                if (xhr.onerror) {
                  console.log('❌ Triggering onerror');
                  xhr.onerror();
                }
              });

            return;
          }

          console.log('📡 Same-origin XHR request:', url);
          // Use original send for same-origin requests
          return originalSend.call(this, data);
        };

        return xhr;
      };

      // Copy static properties
      Object.setPrototypeOf(
        window.XMLHttpRequest.prototype,
        originalXHR.prototype
      );
      Object.setPrototypeOf(window.XMLHttpRequest, originalXHR);

      console.log('✅ XMLHttpRequest override complete');
    }

    async makeBypassRequest(url, options = {}) {
      console.log('🚀 Making bypass request to:', url);
      const requestId = ++this.requestId;

      return new Promise((resolve, reject) => {
        this.pendingRequests.set(requestId, { resolve, reject });

        console.log('📨 Sending bypass request:', requestId);

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
            console.log('⏰ Request timeout:', requestId);
            this.pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, this.requestTimeout);
      });
    }

    handleResponse(data) {
      console.log('📥 Handling response for request:', data.requestId);
      const pendingRequest = this.pendingRequests.get(data.requestId);

      if (pendingRequest) {
        console.log('✅ Found pending request:', data.requestId);
        this.pendingRequests.delete(data.requestId);

        if (data.response.success) {
          console.log('✅ Request successful:', data.requestId);
          // Create a Response object that mimics the fetch Response interface
          const response = this.createFetchResponse(data.response);
          pendingRequest.resolve(response);
        } else {
          console.error(
            '❌ Request failed:',
            data.requestId,
            data.response.error
          );
          pendingRequest.reject(
            new Error(data.response.error || 'Request failed')
          );
        }
      } else {
        console.warn('⚠️ No pending request found for:', data.requestId);
      }
    }

    createFetchResponse(responseData) {
      console.log('🔄 Creating fetch response object');

      // Create a Response-like object
      const response = {
        status: responseData.status,
        statusText: responseData.statusText,
        ok: responseData.status >= 200 && responseData.status < 300,
        headers: new Headers(responseData.headers || {}),
        url: responseData.url,
        redirected: false,
        type: 'cors',

        // Response body methods
        text: async () => {
          console.log('📄 Converting response to text');
          return typeof responseData.data === 'string'
            ? responseData.data
            : JSON.stringify(responseData.data);
        },

        json: async () => {
          console.log('📄 Converting response to JSON');
          if (typeof responseData.data === 'string') {
            try {
              return JSON.parse(responseData.data);
            } catch (e) {
              throw new Error('Invalid JSON response');
            }
          }
          return responseData.data;
        },

        blob: async () => {
          console.log('📄 Converting response to blob');
          const text =
            typeof responseData.data === 'string'
              ? responseData.data
              : JSON.stringify(responseData.data);
          return new Blob([text], { type: 'text/plain' });
        },

        arrayBuffer: async () => {
          console.log('📄 Converting response to arrayBuffer');
          const text =
            typeof responseData.data === 'string'
              ? responseData.data
              : JSON.stringify(responseData.data);
          return new TextEncoder().encode(text).buffer;
        },

        formData: async () => {
          console.log('📄 Converting response to formData');
          throw new Error('FormData response not supported');
        },

        // Additional methods
        clone: () => {
          console.log('📄 Cloning response');
          return this.createFetchResponse(responseData);
        },
      };

      // Make the response object non-enumerable for certain properties
      Object.defineProperty(response, 'body', {
        value: null,
        writable: false,
        enumerable: false,
      });

      Object.defineProperty(response, 'bodyUsed', {
        value: false,
        writable: false,
        enumerable: false,
      });

      console.log('✅ Fetch response object created');
      return response;
    }

    isCrossOrigin(url) {
      try {
        const currentOrigin = window.location.origin;
        const requestUrl = new URL(url, window.location.href);
        const requestOrigin = requestUrl.origin;

        const isCrossOrigin = currentOrigin !== requestOrigin;
        console.log(
          '🔍 Origin check:',
          currentOrigin,
          '→',
          requestOrigin,
          '=',
          isCrossOrigin ? 'CROSS-ORIGIN' : 'SAME-ORIGIN'
        );

        return isCrossOrigin;
      } catch (error) {
        console.error('❌ Error checking origin:', error);
        // If we can't determine, assume it's cross-origin for safety
        return true;
      }
    }

    // Utility method to check if the extension is available
    isExtensionAvailable() {
      return typeof window.postMessage === 'function';
    }

    // Method to handle cleanup
    cleanup() {
      console.log('🧹 Cleaning up pending requests...');
      this.pendingRequests.forEach((request, id) => {
        console.log('❌ Rejecting pending request:', id);
        request.reject(new Error('Extension cleanup'));
      });
      this.pendingRequests.clear();
      console.log('✅ Cleanup complete');
    }
  }

  // Initialize the injector
  const corsInjector = new CORSBypassInjector();

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    console.log('📴 Page unloading, cleaning up...');
    corsInjector.cleanup();
  });

  // Expose injector for debugging (optional)
  if (typeof window !== 'undefined' && window.console) {
    window.corsInjector = corsInjector;
    console.log(
      '🔧 CORS Injector exposed as window.corsInjector for debugging'
    );
  }

  console.log('🎯 CORS Bypass Injection complete');
})();
