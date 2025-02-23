let clickerConfig = {
  x: null,
  y: null,
  interval: 6000, // Default 6 seconds
  isRunning: false,
  clickCount: 0,
  intervalId: null
};

// Handle point selection
function handlePointSelection(e) {
  clickerConfig.x = e.clientX;
  clickerConfig.y = e.clientY;
  
  chrome.storage.sync.set({ 
    clickerPoint: { x: clickerConfig.x, y: clickerConfig.y }
  });
  
  document.removeEventListener('click', handlePointSelection, true);
  console.log(`Click point selected at (${clickerConfig.x}, ${clickerConfig.y})`);
}

// Perform click at the selected point
function performClick() {
  if (!clickerConfig.x || !clickerConfig.y) return;
  
  const element = document.elementFromPoint(clickerConfig.x, clickerConfig.y);
  if (element) {
    element.click();
    clickerConfig.clickCount++;
    console.log(`Click performed (${clickerConfig.clickCount} clicks total)`);
  }
}

// Toggle auto clicker
function toggleClicker() {
  clickerConfig.isRunning = !clickerConfig.isRunning;
  chrome.storage.sync.set({ isClicking: clickerConfig.isRunning });
  
  if (clickerConfig.isRunning) {
    console.log('Auto Clicker started');
    performClick(); // Immediate first click
    clickerConfig.intervalId = setInterval(performClick, clickerConfig.interval);
  } else {
    console.log('Auto Clicker stopped');
    if (clickerConfig.intervalId) {
      clearInterval(clickerConfig.intervalId);
      clickerConfig.intervalId = null;
    }
  }
}

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'startSelection':
      document.addEventListener('click', handlePointSelection, true);
      break;
    case 'updateInterval':
      clickerConfig.interval = message.interval * 1000;
      if (clickerConfig.isRunning) {
        clearInterval(clickerConfig.intervalId);
        clickerConfig.intervalId = setInterval(performClick, clickerConfig.interval);
      }
      break;
    case 'toggle':
      toggleClicker();
      break;
  }
});

// Load saved configuration
chrome.storage.sync.get(['clickerPoint', 'clickInterval', 'isClicking'], (result) => {
  if (result.clickerPoint) {
    clickerConfig.x = result.clickerPoint.x;
    clickerConfig.y = result.clickerPoint.y;
  }
  if (result.clickInterval) {
    clickerConfig.interval = result.clickInterval * 1000;
  }
  if (result.isClicking) {
    toggleClicker();
  }
}); 