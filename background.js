// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-clicker') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle' });
    });
  }
}); 