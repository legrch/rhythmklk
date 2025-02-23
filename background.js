// Update badge when clicker status changes
function updateBadge(isRunning) {
  chrome.action.setBadgeText({
    text: isRunning ? 'ON' : ''
  });
  chrome.action.setBadgeBackgroundColor({
    color: isRunning ? '#4CAF50' : '#666666'
  });
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateBadge') {
    updateBadge(message.isRunning);
  }
});

// Initialize badge state from storage
chrome.storage.sync.get(['isClicking'], (result) => {
  updateBadge(result.isClicking || false);
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-clicker') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleClicker' });
      }
    });
  }
}); 