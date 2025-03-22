document.addEventListener('DOMContentLoaded', () => {
  const intervalInput = document.getElementById('interval');
  const addPointButton = document.getElementById('addPoint');
  const startButton = document.getElementById('startClicker');
  const stopButton = document.getElementById('stopClicker');
  const statusElement = document.getElementById('status');
  const debugCheckbox = document.getElementById('debug');
  const jitterCheckbox = document.getElementById('jitter');
  const runTimeElement = document.getElementById('runTime');
  const pointsList = document.getElementById('pointsList');
  const clearPointsButton = document.getElementById('clearPoints');

  let points = [];
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
    console.log(`[RhythmKlk Popup] ${message}`);
  }

  function updateButtons(hasPoints, isRunning) {
    startButton.disabled = !hasPoints || isRunning;
    stopButton.disabled = !isRunning;
    clearPointsButton.disabled = isRunning;
    
    if (isRunning) {
      statusElement.classList.add('running');
    } else {
      statusElement.classList.remove('running');
    }
  }
  
  function renderPointsList() {
    pointsList.innerHTML = '';
    
    if (points.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'point-item empty-message';
      emptyMessage.textContent = 'No points added yet';
      pointsList.appendChild(emptyMessage);
      return;
    }
    
    points.forEach((point, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'point-item';
      
      const pointCoords = document.createElement('div');
      pointCoords.className = 'point-coords';
      pointCoords.textContent = `Point ${index + 1}: (${Math.round(point.x)}, ${Math.round(point.y)})`;
      
      const removeButton = document.createElement('button');
      removeButton.className = 'point-remove';
      removeButton.innerHTML = '<svg class="icon" width="16" height="16" viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>';
      removeButton.title = 'Remove point';
      removeButton.dataset.index = index;
      
      removeButton.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        removePoint(idx);
      });
      
      listItem.appendChild(pointCoords);
      listItem.appendChild(removeButton);
      pointsList.appendChild(listItem);
    });
  }
  
  function removePoint(index) {
    points.splice(index, 1);
    
    // Update storage
    chrome.storage.sync.set({ clickerPoints: points });
    
    // Update UI
    renderPointsList();
    updateButtons(points.length > 0, false);
    
    if (points.length === 0) {
      updateStatus('No points selected');
    } else {
      updateStatus(`${points.length} points - Ready to start`);
    }
    
    // Update content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'updatePoints', 
        points: points 
      });
    });
  }
  
  function clearAllPoints() {
    points = [];
    
    // Update storage
    chrome.storage.sync.set({ clickerPoints: [] });
    
    // Update UI
    renderPointsList();
    updateButtons(false, false);
    updateStatus('No points selected');
    
    // Update content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'updatePoints', 
        points: [] 
      });
    });
  }

  // Load saved settings
  chrome.storage.sync.get(['clickerPoints', 'clickInterval', 'isClicking', 'debug', 'jitter'], (result) => {
    console.log('[RhythmKlk Popup] Loading saved settings:', result);
    
    if (result.clickInterval) {
      intervalInput.value = result.clickInterval;
    }

    if (result.clickerPoints && result.clickerPoints.length > 0) {
      points = result.clickerPoints;
      renderPointsList();
      
      // Sync points with content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'updatePoints', 
          points: points 
        });
      });
    }
    
    const hasPoints = points.length > 0;
    const isRunning = !!result.isClicking;
    
    updateButtons(hasPoints, isRunning);
    
    if (isRunning) {
      updateStatus('RhythmKlk is running', 'running');
      startTimer();
    } else if (hasPoints) {
      updateStatus(`${points.length} points - Ready to start`);
    } else {
      updateStatus('Select at least one point to begin');
    }

    debugCheckbox.checked = result.debug !== false;
    
    // Initialize jitter setting (true by default if not set)
    jitterCheckbox.checked = result.jitter !== false;
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
  addPointButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Clear local points array
      points = [];
      renderPointsList();
      updateButtons(false, false);
      
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'resetState'
      }, () => {
        // After reset, start selection mode
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'startSelection',
          shouldStopCurrent: false
        });
        updateStatus('Click on the page to add points (multiple clicks allowed)', 'selecting');
        window.close();
      });
    });
  });
  
  // Handle clear all points
  clearPointsButton.addEventListener('click', () => {
    if (points.length > 0) {
      clearAllPoints();
    }
  });

  // Function to stop point selection mode
  function stopSelection() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stopSelection' });
    });
  }

  // Handle start clicking
  startButton.addEventListener('click', () => {
    // Stop any ongoing selection first
    stopSelection();
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'start' });
      chrome.storage.sync.set({ isClicking: true });
      updateStatus('RhythmKlk started', 'running');
      updateButtons(true, true);
      startTimer();
      window.close();
    });
  });

  // Handle stop clicking
  stopButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stop' });
      chrome.storage.sync.set({ isClicking: false });
      updateStatus('RhythmKlk stopped');
      updateButtons(true, false);
      stopTimer();
      window.close();
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

  // Handle jitter toggle
  jitterCheckbox.addEventListener('change', () => {
    const jitterEnabled = jitterCheckbox.checked;
    chrome.storage.sync.set({ jitter: jitterEnabled });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'setJitter', 
        enabled: jitterEnabled 
      });
    });
  });

  // Listen for point selection and badge updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'pointSelected') {
      if (message.point) {
        // Add the point to our local array
        points.push(message.point);
        renderPointsList();
      }
      updateButtons(points.length > 0, false);
      updateStatus(`${points.length} points added - click more or press Start`, 'selecting');
    } else if (message.type === 'selectionCompleted') {
      updateButtons(points.length > 0, false);
      updateStatus(`${points.length} points ready - Press Start to begin`, '');
    } else if (message.type === 'updateBadge') {
      // Update button states when badge state changes
      updateButtons(points.length > 0, message.isRunning);
      if (message.isRunning) {
        updateStatus('RhythmKlk is running', 'running');
        startTimer();
      } else {
        updateStatus('RhythmKlk stopped');
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