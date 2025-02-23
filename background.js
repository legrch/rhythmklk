// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Auto Clicker extension installed');
});

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  
  if (command === 'toggle-clicker') {
    try {
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Active tabs:', tabs);
      
      if (!tabs || tabs.length === 0) {
        console.error('No active tab found');
        return;
      }
      
      const activeTab = tabs[0];
      console.log('Sending toggle message to tab:', activeTab.id);
      
      // Send toggle message to content script
      await chrome.tabs.sendMessage(activeTab.id, { 
        type: 'toggle',
        timestamp: Date.now()
      });
      console.log('Toggle message sent successfully');
    } catch (error) {
      console.error('Error in command handler:', error);
    }
  }
}); 