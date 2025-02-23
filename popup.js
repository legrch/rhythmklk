document.addEventListener('DOMContentLoaded', () => {
  const intervalInput = document.getElementById('interval');
  const selectPointButton = document.getElementById('selectPoint');
  const startButton = document.getElementById('startClicker');
  const stopButton = document.getElementById('stopClicker');
  const statusElement = document.getElementById('status');
  const debugCheckbox = document.getElementById('debug');
  const runTimeElement = document.getElementById('runTime');

  let startTime = null;
  let timerInterval = null;

  function updateStats() {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      runTimeElement.textContent = `${minutes}:${seconds}`;
    } else {
      runTimeElement.textContent = '00:00';
    }
  }

  function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateStats, 1000);
  }

  function stopTimer() {
    startTime = null;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateStats();
  }

  function updateStatus(message, type = '') {
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    console.log(`[AutoClicker Popup] ${message}`);
  }

  function updateButtons(hasPoint, isRunning) {
    startButton.disabled = !hasPoint || isRunning;
    stopButton.disabled = !isRunning;
    
    if (hasPoint) {
      selectPointButton.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M19,19H5V5H19V19M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M13,17H15V7H13V17M9,17H11V7H9V17Z"/>
        </svg>
        Change Point
      `;
    } else {
      selectPointButton.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M7,2L17,12L7,22L7,2M9,6.83L13.17,11L9,15.17V6.83Z"/>
        </svg>
        Select Point
      `;
    }

    if (isRunning) {
      statusElement.classList.add('running');
    } else {
      statusElement.classList.remove('running');
    }
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
      updateStatus('Auto Clicker is running', 'running');
      startTimer();
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
      updateStatus('Click on the page to select point', 'selecting');
      window.close();
    });
  });

  // Handle start clicking
  startButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'start' });
      chrome.storage.sync.set({ isClicking: true });
      updateStatus('Auto Clicker started', 'running');
      updateButtons(true, true);
      startTimer();
    });
  });

  // Handle stop clicking
  stopButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stop' });
      chrome.storage.sync.set({ isClicking: false });
      updateStatus('Auto Clicker stopped');
      updateButtons(true, false);
      stopTimer();
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

  // Listen for point selection and badge updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'pointSelected') {
      updateButtons(true, false);
      updateStatus('Point selected - Ready to start');
    } else if (message.type === 'updateBadge') {
      // Update button states when badge state changes
      updateButtons(true, message.isRunning);
      if (message.isRunning) {
        updateStatus('Auto Clicker is running', 'running');
        startTimer();
      } else {
        updateStatus('Auto Clicker stopped');
        stopTimer();
      }
    }
  });

  // Clean up on popup close
  window.addEventListener('unload', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });
}); 