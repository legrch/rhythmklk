# Auto Clicker Chrome Extension

[English](README.md) | [Русский](README.ru.md)

A lightweight and powerful auto clicker extension for Chrome with customizable click intervals and point selection.

![Auto Clicker Screenshot](screenshot.png)

## Features

- 🎯 Point selection with visual feedback
- ⏱️ Customizable click intervals
- 🔄 Random interval jitter for more natural clicking
- 🖼️ Works in iframes and Flash elements
- 🎮 Keyboard shortcuts support
- 🐛 Debug mode for troubleshooting

## Installation

### Method 1: Direct Installation
1. Download the [latest release](../../releases/latest/download/autoclicker.zip)
2. Unzip the downloaded file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the unzipped folder

### Method 2: Manual Build
1. Clone this repository
```bash
git clone https://github.com/YOUR_USERNAME/autoclicker.git
cd autoclicker
```
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the cloned folder

## Usage

1. Click the extension icon in Chrome toolbar
2. Click "Choose Point" and select a point on the webpage
3. Set your desired click interval (in seconds)
4. Click "Start" to begin auto-clicking
5. Click "Stop" to end auto-clicking

### Keyboard Shortcuts
- `Ctrl+B` (Windows) / `Cmd+B` (Mac): Open extension popup
- `Alt+S`: Toggle auto clicker on/off

## Development

The extension is built using vanilla JavaScript and follows Chrome's Manifest V3 guidelines.

### Project Structure
```
├── manifest.json     # Extension manifest
├── popup.html       # Extension popup UI
├── popup.js         # Popup logic
├── content.js       # Content script for clicking
├── background.js    # Service worker
└── icons/          # Extension icons
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Privacy

This extension requires the following permissions:
- `activeTab`: To interact with the current tab
- `storage`: To save settings
- `commands`: For keyboard shortcuts
- `scripting`: To inject content scripts

No data is collected or transmitted outside your browser. 