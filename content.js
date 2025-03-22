let clickerConfig = {
  points: [], // Array to store multiple click points
  currentPointIndex: 0, // Track which point to click next
  interval: 5000, // Default 5 seconds
  jitterRange: 1000, // ±1 second jitter
  jitterEnabled: true, // Jitter enabled by default
  isRunning: false,
  intervalId: null,
  debug: false, // Debug mode desabled by default
  pointSelected: false // Track if any point has been selected
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
    const logMessage = `[RhythmKlk ${timestamp}] ${message}`;
    
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
  const existingFeedback = document.getElementById('rhythmklk-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  const feedback = document.createElement('div');
  feedback.id = 'rhythmklk-feedback';
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
  
  // Create the new point
  const newPoint = { x, y };
  
  // Store the validated coordinates in the points array
  clickerConfig.points.push(newPoint);
  clickerConfig.pointSelected = clickerConfig.points.length > 0;
  
  // Save all points
  chrome.storage.sync.set({ 
    clickerPoints: clickerConfig.points
  });
  
  // Don't remove the click listener - keep collecting points
  // document.removeEventListener('click', handlePointSelection, true);
  
  // Log the selection
  debugLog('Click point added', {
    newPoint,
    allPoints: clickerConfig.points
  });
  
  // Show visual feedback
  showFeedback(`Click point ${clickerConfig.points.length} added!`);
  
  // Notify popup about point selection
  chrome.runtime.sendMessage({ 
    type: 'pointSelected',
    pointCount: clickerConfig.points.length,
    point: newPoint
  });
}

// Perform click at the selected point
function performClick() {
  // Get current point to click
  const currentPoint = clickerConfig.points[clickerConfig.currentPointIndex];
  
  if (!currentPoint || !isValidCoordinate(currentPoint.x) || !isValidCoordinate(currentPoint.y)) {
    debugLog('Invalid click coordinates', {
      currentPoint,
      currentIndex: clickerConfig.currentPointIndex,
      totalPoints: clickerConfig.points.length
    });
    return;
  }
  
  try {
    // Check if we're in an iframe
    const isInIframe = window !== window.top;
    let targetX = currentPoint.x;
    let targetY = currentPoint.y;

    // If we're in the main page, find the target iframe and adjust coordinates
    if (!isInIframe) {
      const element = document.elementFromPoint(currentPoint.x, currentPoint.y);
      
      debugLog('Target element found in main frame', {
        tagName: element?.tagName,
        id: element?.id,
        className: element?.className,
        isIframe: element?.tagName === 'IFRAME'
      });

      if (element?.tagName === 'IFRAME') {
        const rect = element.getBoundingClientRect();
        targetX = currentPoint.x - rect.left;
        targetY = currentPoint.y - rect.top;

        debugLog('Adjusted coordinates for iframe', {
          original: { x: currentPoint.x, y: currentPoint.y },
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
      pointIndex: clickerConfig.currentPointIndex,
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

    debugLog('Click sequence completed', {
      pointIndex: clickerConfig.currentPointIndex,
      element: targetElement.tagName,
      coordinates: { x: targetX, y: targetY },
      isInIframe,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    debugLog('Click operation failed', {
      error: error.message,
      currentPoint,
      currentIndex: clickerConfig.currentPointIndex,
      state: {
        isRunning: clickerConfig.isRunning,
        isInIframe: window !== window.top
      }
    });
  }
  
  // Move to the next point for the next click
  clickerConfig.currentPointIndex = (clickerConfig.currentPointIndex + 1) % clickerConfig.points.length;
}

// Get next interval with jitter
function getNextInterval() {
  if (clickerConfig.jitterEnabled) {
    const jitter = (Math.random() * 2 - 1) * clickerConfig.jitterRange; // Random value between -jitterRange and +jitterRange
    const nextInterval = clickerConfig.interval + jitter;
    debugLog('Next interval calculated with jitter', {
      baseInterval: clickerConfig.interval,
      jitter,
      nextInterval
    });
    return Math.max(nextInterval, 1000); // Ensure minimum 1 second interval
  } else {
    debugLog('Next interval without jitter', {
      interval: clickerConfig.interval
    });
    return clickerConfig.interval;
  }
}

// Start auto clicker
function startClicker() {
  debugLog('Starting clicker with config', {
    points: clickerConfig.points,
    pointCount: clickerConfig.points.length,
    pointSelected: clickerConfig.pointSelected,
    isRunning: clickerConfig.isRunning
  });

  if (clickerConfig.points.length === 0) {
    showFeedback('Please select at least one click point first', 'error');
    debugLog('Start attempted without selected points');
    return;
  }

  if (clickerConfig.isRunning) {
    debugLog('Clicker is already running');
    return;
  }

  clickerConfig.isRunning = true;
  clickerConfig.currentPointIndex = 0; // Start from the first point
  
  // Ensure we set isClicking to true in storage and notify the popup
  chrome.storage.sync.set({ isClicking: true }, () => {
    chrome.runtime.sendMessage({ 
      type: 'updateBadge',
      isRunning: true
    });
  });
  
  debugLog('RhythmKlk started', {
    interval: clickerConfig.interval,
    jitterRange: clickerConfig.jitterRange,
    points: clickerConfig.points
  });
  showFeedback('RhythmKlk Started');
  
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
  // Ensure we set isClicking to false in storage and notify the popup
  chrome.storage.sync.set({ isClicking: false }, () => {
    chrome.runtime.sendMessage({ 
      type: 'updateBadge',
      isRunning: false
    });
  });
  
  // Get the last clicked point safely
  const lastIndex = clickerConfig.currentPointIndex > 0 
    ? clickerConfig.currentPointIndex - 1 
    : clickerConfig.points.length - 1;
  
  const lastPoint = clickerConfig.points[lastIndex] || { x: 0, y: 0 };
  
  debugLog('RhythmKlk stopped', {
    lastPoint,
    pointCount: clickerConfig.points.length
  });
  
  showFeedback('RhythmKlk Stopped');
  
  if (clickerConfig.intervalId) {
    clearTimeout(clickerConfig.intervalId);
    clickerConfig.intervalId = null;
  }
}

// Function to stop point selection mode
function stopPointSelection() {
  document.removeEventListener('click', handlePointSelection, true);
  document.removeEventListener('keydown', handleSelectionKeyPress);
  
  debugLog('Point selection mode stopped', {
    pointsCollected: clickerConfig.points.length
  });
  
  showFeedback('Point selection completed');
  
  // Notify popup about selection completed
  chrome.runtime.sendMessage({ 
    type: 'selectionCompleted',
    pointCount: clickerConfig.points.length
  });
}

// Handle keypress during selection mode
function handleSelectionKeyPress(e) {
  // Stop selection mode when Escape key is pressed
  if (e.key === 'Escape') {
    stopPointSelection();
  }
}

// Function to reset clicker state
function resetState() {
  if (clickerConfig.isRunning) {
    stopClicker();
  }
  
  clickerConfig.points = [];
  clickerConfig.pointSelected = false;
  clickerConfig.currentPointIndex = 0;
  
  chrome.storage.sync.set({
    clickerPoints: [],
    isClicking: false
  }, () => {
    debugLog('Clicker state fully reset');
  });
  
  showFeedback('Clicker state reset');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Message received', { type: message.type, data: message });
  
  switch (message.type) {
    case 'startSelection':
      if (message.shouldStopCurrent && clickerConfig.isRunning) {
        stopClicker();
      }
      
      // Clear existing points when starting selection mode
      resetState();
      
      debugLog('Starting point selection mode with cleared points');
      document.addEventListener('click', handlePointSelection, true);
      document.addEventListener('keydown', handleSelectionKeyPress);
      
      showFeedback('Click to add points. Press ESC when done.');
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
    case 'updatePoints':
      clickerConfig.points = message.points || [];
      clickerConfig.pointSelected = clickerConfig.points.length > 0;
      clickerConfig.currentPointIndex = 0;
      
      debugLog('Points updated from popup', {
        points: clickerConfig.points,
        count: clickerConfig.points.length
      });
      
      // Save to storage
      chrome.storage.sync.set({ clickerPoints: clickerConfig.points });
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
    case 'stopSelection':
      stopPointSelection();
      break;
    case 'resetState':
      resetState();
      break;
    case 'setJitter':
      clickerConfig.jitterEnabled = message.enabled;
      debugLog(`Jitter mode ${message.enabled ? 'enabled' : 'disabled'}`);
      break;
  }
});

// Load saved configuration
chrome.storage.sync.get(['clickerPoints', 'clickInterval', 'debug', 'jitter'], (result) => {
  debugLog('Loading saved configuration', result);
  
  if (result.clickerPoints && result.clickerPoints.length > 0) {
    clickerConfig.points = result.clickerPoints;
    clickerConfig.pointSelected = clickerConfig.points.length > 0;
    debugLog('Restored click points', result.clickerPoints);
  }
  if (result.clickInterval) {
    clickerConfig.interval = result.clickInterval * 1000;
    debugLog('Restored interval', { interval: clickerConfig.interval });
  }
  if (typeof result.debug !== 'undefined') {
    clickerConfig.debug = result.debug;
    debugLog('Restored debug mode setting', { debug: clickerConfig.debug });
  }
  if (typeof result.jitter !== 'undefined') {
    clickerConfig.jitterEnabled = result.jitter;
    debugLog('Restored jitter setting', { jitter: clickerConfig.jitterEnabled });
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
        // Ensure data is properly formatted before processing
        if (event.data && typeof event.data === 'object' && event.data.type === 'rhythmklkClick') {
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
              type: 'rhythmklkResponse',
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
  // Ensure data is properly formatted before processing
  if (event.data && typeof event.data === 'object' && event.data.type === 'rhythmklkResponse') {
    debugLog('Received click confirmation from iframe', event.data);
  }
}); 