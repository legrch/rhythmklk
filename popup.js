document.addEventListener('DOMContentLoaded', () => {
  const intervalInput = document.getElementById('interval');
  const selectPointButton = document.getElementById('selectPoint');
  const statusElement = document.getElementById('status');

  // Load saved interval
  chrome.storage.sync.get(['clickInterval'], (result) => {
    if (result.clickInterval) {
      intervalInput.value = result.clickInterval;
    }
  });

  // Save interval when changed
  intervalInput.addEventListener('change', () => {
    const interval = parseInt(intervalInput.value);
    chrome.storage.sync.set({ clickInterval: interval });
    
    // Notify content script about interval change
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
      chrome.tabs.sendMessage(tabs[0].id, { type: 'startSelection' });
      statusElement.textContent = 'Status: Click on the page to select a point';
      window.close();
    });
  });

  // Update status
  chrome.storage.sync.get(['isClicking'], (result) => {
    if (result.isClicking) {
      statusElement.textContent = 'Status: Auto Clicker is running';
    }
  });
}); 