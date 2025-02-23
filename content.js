let clickerConfig = {
  x: null,
  y: null,
  interval: 5000, // Default 5 seconds
  jitterRange: 1000, // ±1 second jitter
  isRunning: false,
  clickCount: 0,
  intervalId: null,
  debug: true, // Debug mode enabled by default
  pointSelected: false // Track if point has been selected
};

let lastKnownCoordinates = { x: 0, y: 0 };

// Track mouse movement
document.addEventListener('mousemove', (e) => {
  lastKnownCoordinates.x = e.clientX || e.pageX || e.x || lastKnownCoordinates.x;
  lastKnownCoordinates.y = e.clientY || e.pageY || e.y || lastKnownCoordinates.y;
});

// Debug logger
function debugLog(message, data = null) {
  if (clickerConfig.debug) {
    const timestamp = new Date().toISOString();
    const logMessage = `[AutoClicker ${timestamp}] ${message}`;
    
    if (data) {
      // Format the data to be more readable
      const formattedData = JSON.stringify(data, null, 2);
      console.log(logMessage + ':', formattedData);
    } else {
      console.log(logMessage);
    }
  }
}

// Validate coordinates
function isValidCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value);
}

// Show visual feedback
function showFeedback(message, type = 'info') {
  const existingFeedback = document.getElementById('autoclicker-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  const feedback = document.createElement('div');
  feedback.id = 'autoclicker-feedback';
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background-color: ${type === 'info' ? '#4CAF50' : '#f44336'};
    color: white;
    border-radius: 4px;
    z-index: 999999;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  feedback.textContent = message;
  document.body.appendChild(feedback);

  setTimeout(() => feedback.remove(), 3000);
}

// Handle point selection
function handlePointSelection(e) {
  // Prevent the default action and stop propagation
  e.preventDefault();
  e.stopPropagation();
  
  // Use coordinates from the event or last known position
  const x = e.clientX || e.pageX || e.x || lastKnownCoordinates.x;
  const y = e.clientY || e.pageY || e.y || lastKnownCoordinates.y;
  
  // Add more detailed logging
  debugLog('Click event received', {
    eventCoords: {
      clientX: e.clientX,
      clientY: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      x: e.x,
      y: e.y
    },
    lastKnownCoords: lastKnownCoordinates,
    finalCoords: { x, y },
    target: e.target.tagName,
    currentTarget: e.currentTarget.tagName,
    buttons: e.buttons,
    type: e.type
  });
  
  // Validate coordinates using last known position as fallback
  if (!isValidCoordinate(x) || !isValidCoordinate(y)) {
    debugLog('Invalid coordinates detected, using last known position', {
      lastKnownCoordinates,
      eventCoordinates: {
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY
      }
    });
    
    // If we don't even have valid last known coordinates, show error
    if (!isValidCoordinate(lastKnownCoordinates.x) || !isValidCoordinate(lastKnownCoordinates.y)) {
      showFeedback('Could not detect click position. Please try again.', 'error');
      return;
    }
  }
  
  // Store the validated coordinates
  clickerConfig.x = x;
  clickerConfig.y = y;
  clickerConfig.pointSelected = true;
  
  // Save coordinates
  chrome.storage.sync.set({ 
    clickerPoint: { 
      x: clickerConfig.x, 
      y: clickerConfig.y 
    } 
  });
  
  // Remove the click listener
  document.removeEventListener('click', handlePointSelection, true);
  
  // Log the selection
  debugLog('Click point selected', {
    coordinates: {
      x: clickerConfig.x,
      y: clickerConfig.y
    }
  });
  
  // Show visual feedback
  showFeedback('Click point selected!');
  
  // Notify popup about point selection
  chrome.runtime.sendMessage({ type: 'pointSelected' });
}

// Perform click at the selected point
function performClick() {
  if (!isValidCoordinate(clickerConfig.x) || !isValidCoordinate(clickerConfig.y)) {
    debugLog('Invalid click coordinates', {
      x: clickerConfig.x,
      y: clickerConfig.y
    });
    return;
  }
  
  try {
    // Check if we're in an iframe
    const isInIframe = window !== window.top;
    let targetX = clickerConfig.x;
    let targetY = clickerConfig.y;

    // If we're in the main page, find the target iframe and adjust coordinates
    if (!isInIframe) {
      const element = document.elementFromPoint(clickerConfig.x, clickerConfig.y);
      
      debugLog('Target element found in main frame', {
        tagName: element?.tagName,
        id: element?.id,
        className: element?.className,
        isIframe: element?.tagName === 'IFRAME'
      });

      if (element?.tagName === 'IFRAME') {
        const rect = element.getBoundingClientRect();
        targetX = clickerConfig.x - rect.left;
        targetY = clickerConfig.y - rect.top;

        debugLog('Adjusted coordinates for iframe', {
          original: { x: clickerConfig.x, y: clickerConfig.y },
          adjusted: { x: targetX, y: targetY },
          iframeRect: rect
        });
      }
    }

    // Find the element at the adjusted coordinates
    const targetElement = document.elementFromPoint(targetX, targetY);

    if (!targetElement) {
      debugLog('No element found at coordinates', {
        coordinates: { x: targetX, y: targetY },
        isInIframe
      });
      return;
    }

    debugLog('Attempting click on element', {
      tagName: targetElement.tagName,
      id: targetElement.id,
      className: targetElement.className,
      isInIframe,
      coordinates: { x: targetX, y: targetY }
    });

    // Create and dispatch a complete mouse event sequence
    const events = [
      'mouseenter',
      'mouseover',
      'mousemove',
      'mousedown',
      'mouseup',
      'click'
    ];

    events.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
        screenX: targetX,
        screenY: targetY,
        clientX: targetX,
        clientY: targetY,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        button: 0,
        buttons: eventType === 'mousedown' ? 1 : 0,
        relatedTarget: null,
        composed: true
      });

      // Dispatch to both the target element and document
      targetElement.dispatchEvent(event);
      document.dispatchEvent(event);
    });

    // Try direct click as fallback
    if (typeof targetElement.click === 'function') {
      targetElement.click();
    }

    clickerConfig.clickCount++;
    debugLog('Click sequence completed', {
      element: targetElement.tagName,
      coordinates: { x: targetX, y: targetY },
      clickCount: clickerConfig.clickCount,
      isInIframe,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    debugLog('Click operation failed', {
      error: error.message,
      coordinates: {
        x: clickerConfig.x,
        y: clickerConfig.y
      },
      state: {
        isRunning: clickerConfig.isRunning,
        clickCount: clickerConfig.clickCount,
        isInIframe: window !== window.top
      }
    });
  }
}

// Get next interval with jitter
function getNextInterval() {
  const jitter = (Math.random() * 2 - 1) * clickerConfig.jitterRange; // Random value between -jitterRange and +jitterRange
  const nextInterval = clickerConfig.interval + jitter;
  debugLog('Next interval calculated', {
    baseInterval: clickerConfig.interval,
    jitter,
    nextInterval
  });
  return Math.max(nextInterval, 1000); // Ensure minimum 1 second interval
}

// Start auto clicker
function startClicker() {
  if (!clickerConfig.pointSelected) {
    showFeedback('Please select a click point first', 'error');
    debugLog('Start attempted without selected point');
    return;
  }

  if (clickerConfig.isRunning) {
    debugLog('Clicker is already running');
    return;
  }

  clickerConfig.isRunning = true;
  chrome.storage.sync.set({ isClicking: true });
  chrome.runtime.sendMessage({ type: 'updateBadge', isRunning: true });
  
  debugLog('Auto Clicker started', {
    interval: clickerConfig.interval,
    jitterRange: clickerConfig.jitterRange,
    coordinates: { x: clickerConfig.x, y: clickerConfig.y }
  });
  showFeedback('Auto Clicker Started');
  
  // Schedule first click
  performClick();
  
  // Use recursive setTimeout for variable intervals
  function scheduleNextClick() {
    if (!clickerConfig.isRunning) return;
    
    const nextInterval = getNextInterval();
    clickerConfig.intervalId = setTimeout(() => {
      performClick();
      scheduleNextClick(); // Schedule next click after performing current one
    }, nextInterval);
  }
  
  scheduleNextClick();
}

// Stop auto clicker
function stopClicker() {
  if (!clickerConfig.isRunning) {
    debugLog('Clicker is not running');
    return;
  }

  clickerConfig.isRunning = false;
  chrome.storage.sync.set({ isClicking: false });
  chrome.runtime.sendMessage({ type: 'updateBadge', isRunning: false });
  
  debugLog('Auto Clicker stopped', {
    totalClicks: clickerConfig.clickCount,
    lastCoordinates: { x: clickerConfig.x, y: clickerConfig.y }
  });
  showFeedback('Auto Clicker Stopped');
  
  if (clickerConfig.intervalId) {
    clearTimeout(clickerConfig.intervalId);
    clickerConfig.intervalId = null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Message received', { type: message.type, data: message });
  
  switch (message.type) {
    case 'startSelection':
      if (message.shouldStopCurrent && clickerConfig.isRunning) {
        stopClicker();
      }
      debugLog('Starting point selection mode');
      document.addEventListener('click', handlePointSelection, true);
      break;
    case 'start':
      startClicker();
      break;
    case 'stop':
      stopClicker();
      break;
    case 'updateInterval':
      const oldInterval = clickerConfig.interval;
      clickerConfig.interval = message.interval * 1000;
      debugLog('Interval updated', {
        oldInterval: oldInterval,
        newInterval: clickerConfig.interval
      });
      if (clickerConfig.isRunning) {
        clearTimeout(clickerConfig.intervalId);
        clickerConfig.intervalId = setTimeout(() => {
          performClick();
        }, clickerConfig.interval);
        debugLog('Interval timer reset with new value');
      }
      break;
    case 'setDebug':
      clickerConfig.debug = message.enabled;
      debugLog(`Debug mode ${message.enabled ? 'enabled' : 'disabled'}`);
      break;
    case 'toggleClicker':
      if (clickerConfig.isRunning) {
        stopClicker();
      } else {
        startClicker();
      }
      break;
  }
});

// Load saved configuration
chrome.storage.sync.get(['clickerPoint', 'clickInterval', 'debug'], (result) => {
  debugLog('Loading saved configuration', result);
  
  if (result.clickerPoint) {
    clickerConfig.x = result.clickerPoint.x;
    clickerConfig.y = result.clickerPoint.y;
    clickerConfig.pointSelected = true;
    debugLog('Restored click point', result.clickerPoint);
  }
  if (result.clickInterval) {
    clickerConfig.interval = result.clickInterval * 1000;
    debugLog('Restored interval', { interval: clickerConfig.interval });
  }
  if (typeof result.debug !== 'undefined') {
    clickerConfig.debug = result.debug;
    debugLog('Restored debug mode setting', { debug: clickerConfig.debug });
  }
});

// Ensure clicker stops when page unloads
window.addEventListener('beforeunload', () => {
  if (clickerConfig.isRunning) {
    stopClicker();
  }
});

// Inject click handler script into iframes
function injectClickHandler(iframe) {
  try {
    const script = document.createElement('script');
    script.textContent = `
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'autoClickerClick') {
          const x = event.data.coordinates.x;
          const y = event.data.coordinates.y;
          
          // Find the element at the coordinates
          const element = document.elementFromPoint(x, y);
          
          if (element) {
            const rect = element.getBoundingClientRect();
            const eventConfig = {
              bubbles: true,
              cancelable: true,
              view: window,
              detail: 1,
              screenX: x,
              screenY: y,
              clientX: x,
              clientY: y,
              ctrlKey: false,
              altKey: false,
              shiftKey: false,
              metaKey: false,
              button: 0,
              buttons: 1,
              relatedTarget: null
            };

            ['mouseenter', 'mouseover', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach(type => {
              const evt = new MouseEvent(type, eventConfig);
              element.dispatchEvent(evt);
            });

            // Send confirmation back to parent
            window.parent.postMessage({
              type: 'autoClickerResponse',
              success: true,
              element: {
                tagName: element.tagName,
                className: element.className,
                id: element.id
              },
              coordinates: { x, y }
            }, '*');
          }
        }
      });
    `;

    // Try to inject into the iframe
    if (iframe.contentDocument) {
      iframe.contentDocument.head.appendChild(script);
    } else if (iframe.contentWindow) {
      iframe.contentWindow.eval(script.textContent);
    }
  } catch (error) {
    debugLog('Failed to inject click handler into iframe', {
      error: error.message
    });
  }
}

// Listen for iframe load events to inject the click handler
const observeIframes = () => {
  // Handle existing iframes
  document.querySelectorAll('iframe').forEach(iframe => {
    try {
      iframe.addEventListener('load', () => injectClickHandler(iframe));
      if (iframe.contentDocument?.readyState === 'complete') {
        injectClickHandler(iframe);
      }
    } catch (error) {
      debugLog('Error handling existing iframe', {
        error: error.message,
        iframe: {
          id: iframe.id,
          src: iframe.src
        }
      });
    }
  });

  // Watch for new iframes
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'IFRAME') {
          node.addEventListener('load', () => injectClickHandler(node));
          if (node.contentDocument?.readyState === 'complete') {
            injectClickHandler(node);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// Start observing iframes when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeIframes);
} else {
  observeIframes();
}

// Listen for click confirmations from iframes
window.addEventListener('message', event => {
  if (event.data && event.data.type === 'autoClickerResponse') {
    debugLog('Received click confirmation from iframe', event.data);
  }
}); 