document.addEventListener('DOMContentLoaded', () => {
  const intervalInput = document.getElementById('interval');
  const selectPointButton = document.getElementById('selectPoint');
  const startButton = document.getElementById('startClicker');
  const stopButton = document.getElementById('stopClicker');
  const statusElement = document.getElementById('status');
  const debugCheckbox = document.getElementById('debug');

  function updateStatus(message) {
    statusElement.textContent = `Status: ${message}`;
    console.log(`[AutoClicker Popup] ${message}`);
  }

  function updateButtons(hasPoint, isRunning) {
    startButton.disabled = !hasPoint || isRunning;
    stopButton.disabled = !isRunning;
    selectPointButton.textContent = hasPoint ? 'Change Point' : 'Select Point';
  }

  // Load saved settings
  chrome.storage.sync.get(['clickInterval', 'isClicking', 'debug', 'clickerPoint'], (result) => {
    console.log('[AutoClicker Popup] Loading saved settings:', result);
    
    if (result.clickInterval) {
      intervalInput.value = result.clickInterval;
    }

    const hasPoint = !!result.clickerPoint;
    const isRunning = !!result.isClicking;
    
    updateButtons(hasPoint, isRunning);
    
    if (isRunning) {
      updateStatus('Auto Clicker is running');
    } else if (hasPoint) {
      updateStatus('Point selected - Ready to start');
    } else {
      updateStatus('Select a point to begin');
    }

    debugCheckbox.checked = result.debug !== false;
  });

  // Save interval when changed
  intervalInput.addEventListener('change', () => {
    const interval = parseInt(intervalInput.value);
    if (interval < 1) {
      intervalInput.value = 1;
      return;
    }
    
    chrome.storage.sync.set({ clickInterval: interval });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'updateInterval', 
        interval: interval 
      });
    });
  });

  // Handle point selection
  selectPointButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'startSelection',
        shouldStopCurrent: true
      });
      updateStatus('Click on the page to select point');
      window.close();
    });
  });

  // Handle start clicking
  startButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'start' });
      updateStatus('Auto Clicker started');
      updateButtons(true, true);
    });
  });

  // Handle stop clicking
  stopButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stop' });
      updateStatus('Auto Clicker stopped');
      updateButtons(true, false);
    });
  });

  // Handle debug mode toggle
  debugCheckbox.addEventListener('change', () => {
    const debugEnabled = debugCheckbox.checked;
    chrome.storage.sync.set({ debug: debugEnabled });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'setDebug', 
        enabled: debugEnabled 
      });
    });
  });

  // Listen for point selection updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'pointSelected') {
      updateButtons(true, false);
      updateStatus('Point selected - Ready to start');
    }
  });
}); 