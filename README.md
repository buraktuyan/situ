# Chrome AI Prompt Extension

A simple Chrome extension that uses Chrome's built-in AI (Gemini Nano) via the Prompt API to generate responses to user prompts with streaming support.

## Features

- Simple and intuitive popup interface
- Real-time streaming responses from Chrome's built-in AI
- Automatic API availability checking
- Clean, modern UI with gradient design
- Support for Ctrl+Enter keyboard shortcut to submit prompts

## Requirements

### Browser Requirements
- **Chrome 128 or later** (Stable, Dev, or Canary)
- Supported on:
  - Windows 10 or 11
  - macOS 13+ (Ventura and onwards)
  - Linux
  - ChromeOS (Platform 16389.0.0+) on Chromebook Plus devices

### Hardware Requirements
- At least 22 GB of free space on the volume that contains your Chrome profile
- One of the following:
  - GPU with more than 4 GB of VRAM, OR
  - CPU with 16 GB of RAM or more and 4+ CPU cores

## Setup Instructions

### 1. Enable Chrome AI Features

Since the Prompt API is experimental, you need to enable it first:

#### Option A: Using Chrome Flags (Recommended for Chrome 128+)

1. Open Chrome and navigate to `chrome://flags`
2. Search for and enable the following flags:
   - `chrome://flags/#optimization-guide-on-device-model`
   - `chrome://flags/#prompt-api-for-gemini-nano`
3. Relaunch Chrome when prompted

#### Option B: Using Command Line Flags

Launch Chrome with these flags:
```bash
chrome --enable-features=OptimizationGuideModelDownloading,PromptAPIForGeminiNano,AIPromptAPI
```

### 2. Download the Gemini Nano Model

After enabling the flags:

1. Open Chrome DevTools (F12) on any page
2. Run this command in the Console:
   ```javascript
   await ai.languageModel.create();
   ```
3. Wait for the model to download (this may take several minutes)
4. You can check download progress in `chrome://components/` - look for "Optimization Guide On Device Model"

### 3. Install the Extension

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the directory containing this extension

## Usage

1. Click the extension icon in Chrome's toolbar to open the popup
2. The status bar will show if Chrome AI is ready
3. Enter your prompt in the text area
4. Click "Send Prompt" or press Ctrl+Enter
5. Watch as the AI response streams in real-time!

## How It Works

This extension uses Chrome's built-in AI capabilities:

- **Prompt API**: Provides access to the Gemini Nano model running locally on your device
- **Streaming**: Responses are streamed chunk by chunk for a better user experience
- **On-Device**: All processing happens locally - no data is sent to external servers

## API Usage

The extension demonstrates the basic Prompt API workflow:

```javascript
// Check availability
const availability = await window.ai.languageModel.availability();

// Create a session
const session = await window.ai.languageModel.create();

// Get streaming response
const stream = await session.promptStreaming(prompt);
for await (const chunk of stream) {
  // Update UI with each chunk
  console.log(chunk);
}
```

## Troubleshooting

### "Chrome AI is not available"
- Make sure you're using Chrome 128 or later
- Verify you've enabled the required flags
- Check that your device meets the hardware requirements

### "Chrome AI model is downloading"
- Wait for the download to complete
- Check progress at `chrome://components/`
- Ensure you have enough free disk space (22+ GB)

### Responses not working
- Open DevTools Console (F12) to see any error messages
- Try creating a session manually in the console: `await ai.languageModel.create()`
- Restart Chrome after enabling flags

## Limitations

- Only works in Chrome 128+ with flags enabled
- Requires significant disk space and RAM
- Single session model (no concurrent requests)
- Currently supports English, Spanish, and Japanese (as of Chrome 140+)

## Resources

- [Chrome AI Documentation](https://developer.chrome.com/docs/ai/built-in)
- [Prompt API Guide](https://developer.chrome.com/docs/ai/prompt-api)
- [Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)

## License

See LICENSE file for details.
