// Console Log Shim for Poof
// This script intercepts console methods and sends them to the parent iframe
(function() {
  // Only run if not in LIVE/production environment
  // Check if VITE_ENV is set to LIVE via window object (Vite injects env vars into window)
  if (typeof window !== 'undefined' && window.__VITE_ENV__ === 'LIVE') {
    return; // Silent exit on LIVE - no logs, no interference
  }

  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  // Track shim health
  let messagesSent = 0;
  let messagesFailed = 0;
  let lastError = null;

  // Helper function to serialize console arguments
  function serializeArgs(args) {
    return Array.from(args).map(arg => {
      try {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'function') return arg.toString();
        if (typeof arg === 'object') {
          // Handle Error objects specially
          if (arg instanceof Error) {
            return {
              message: arg.message,
              stack: arg.stack,
              name: arg.name,
            };
          }
          // Try to stringify, but catch circular references
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch (e) {
            return String(arg);
          }
        }
        return arg;
      } catch (e) {
        return String(arg);
      }
    });
  }

  // Helper function to send message to parent
  function sendToParent(level, args) {
    try {
      const serializedArgs = serializeArgs(args);

      // Send to parent iframe
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'POOF_CONSOLE_LOG',
          level: level,
          args: serializedArgs,
          timestamp: Date.now(),
        }, '*');
        messagesSent++;
      } else {
        // Not in an iframe - this is expected in some cases
        if (messagesFailed === 0) {
          originalConsole.warn('[Console Shim] Not running in iframe - messages will not be forwarded');
        }
        messagesFailed++;
      }
    } catch (e) {
      // If we can't send to parent, track the error
      messagesFailed++;
      lastError = e.message;
      // Only log the first few errors to avoid spam
      if (messagesFailed <= 3) {
        originalConsole.error('[Console Shim] Error sending message:', e);
      }
    }
  }

  // Override console methods
  console.log = function(...args) {
    sendToParent('log', args);
    originalConsole.log.apply(console, args);
  };

  console.error = function(...args) {
    sendToParent('error', args);
    originalConsole.error.apply(console, args);
  };

  console.warn = function(...args) {
    sendToParent('warn', args);
    originalConsole.warn.apply(console, args);
  };

  console.info = function(...args) {
    sendToParent('info', args);
    originalConsole.info.apply(console, args);
  };

  console.debug = function(...args) {
    sendToParent('debug', args);
    originalConsole.debug.apply(console, args);
  };

  // Also capture uncaught errors and promise rejections
  window.addEventListener('error', function(event) {
    sendToParent('error', [event.message, event.filename, event.lineno, event.colno, event.error]);
  });

  window.addEventListener('unhandledrejection', function(event) {
    sendToParent('error', ['Unhandled Promise Rejection:', event.reason]);
  });

  // Log successful initialization (only in non-LIVE environments)
  originalConsole.log('[Console Shim] Initialized successfully - console methods are being intercepted');

  // Expose health check function for debugging
  window.__poofConsoleShimHealth = function() {
    return {
      active: true,
      messagesSent,
      messagesFailed,
      lastError,
      inIframe: window.parent && window.parent !== window,
    };
  };

  // Log health stats periodically (every 50 messages) for debugging
  let logCount = 0;
  const trackHealth = function() {
    logCount++;
    if (logCount % 50 === 0) {
      originalConsole.info('[Console Shim] Health check:', window.__poofConsoleShimHealth());
    }
  };

  // Override console methods with health tracking
  console.log = function(...args) {
    sendToParent('log', args);
    originalConsole.log.apply(console, args);
    trackHealth();
  };

  console.error = function(...args) {
    sendToParent('error', args);
    originalConsole.error.apply(console, args);
    trackHealth();
  };

  console.warn = function(...args) {
    sendToParent('warn', args);
    originalConsole.warn.apply(console, args);
    trackHealth();
  };

  console.info = function(...args) {
    sendToParent('info', args);
    originalConsole.info.apply(console, args);
    trackHealth();
  };

  console.debug = function(...args) {
    sendToParent('debug', args);
    originalConsole.debug.apply(console, args);
    trackHealth();
  };
})();
