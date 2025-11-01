# Situ - Learn Vocabulary While Browsing

**Tagline:** *Learn vocabulary while browsing*

Situ is a powerful Chrome Extension designed for ESL (English as a Second Language) students that seamlessly integrates vocabulary learning into your daily browsing experience. No dedicated study time needed—learning happens *in situ*, with subtle nudges and tracking.

## 🌟 Features

### 📖 Reading Mode
- **Automatic Highlighting**: Your target vocabulary words are automatically highlighted on any webpage you visit
- **Instant Definitions**: Hover over highlighted words to see definitions and usage stats
- **Detailed Word Cards**: Click on any highlighted word to see full details, examples, and synonyms
- **Smart Tracking**: Automatically tracks how many times you've encountered each word

### ✍️ Writing Mode
- **Contextual Suggestions**: Get AI-powered suggestions to use your target vocabulary in text fields
- **Seamless Integration**: Works on Gmail, Reddit, Discord, and any text input field
- **Usage Tracking**: Tracks when you successfully use your vocabulary words in writing
- **Natural Learning**: Helps activate passive vocabulary through practical use

### 🤖 AI-Powered Features
- **Auto-Enrichment**: Uses Chrome's built-in AI (LanguageModel API) to automatically generate definitions, examples, and synonyms
- **100% Local Processing**: All AI features run on-device for privacy and speed
- **Smart Examples**: Get contextually relevant example sentences for each word
- **Synonym Discovery**: Automatically find related words to expand your vocabulary

### 📱 Beautiful Interface
- **Modern Design**: Clean, purple-themed interface following accessibility best practices
- **Quick Access Popup**: View stats and add words with a single click
- **Comprehensive Dashboard**: Manage your entire vocabulary library
- **Practice Mode**: Flashcard-based practice to reinforce learning

### 📊 Progress Tracking
- **Daily Statistics**: See how many words you've encountered and used each day
- **Weekly Charts**: Visualize your learning progress over time
- **Top Words**: Track which words you encounter most frequently
- **Goal Setting**: Set daily encounter goals to stay motivated

### 🔧 Customization
- **Highlight Styles**: Choose between background highlighting, underlines, or both
- **Difficulty Levels**: Organize words by beginner, intermediate, or advanced levels
- **Flexible Settings**: Toggle reading and writing modes independently
- **Import/Export**: Backup and share your vocabulary lists

## 🚀 Installation

### Prerequisites
- **Chrome Browser**: Version 128 or later
- **Chrome AI Features**: Enable the Prompt API in Chrome flags
  1. Navigate to `chrome://flags`
  2. Search for "Prompt API for Gemini Nano"
  3. Enable the feature
  4. Restart Chrome

### Install the Extension
1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `situ` directory
6. The extension icon should appear in your toolbar!

## 📖 Usage Guide

### Adding Words

**Method 1: Context Menu**
- Select any word or phrase on a webpage
- Right-click and choose "Add to Situ"
- The word will be automatically enriched with AI-generated content

**Method 2: Popup**
- Click the Situ icon in your toolbar
- Type a word in the "Add New Word" field
- Click the + button

**Method 3: Dashboard**
- Open the Dashboard from the popup
- Click "Add Word"
- Fill in details manually or use AI assistance

### Using Reading Mode

1. Add words to your vocabulary
2. Ensure Reading Mode is enabled (toggle in popup)
3. Browse any website
4. Your vocabulary words will be automatically highlighted
5. Hover for quick definitions
6. Click for detailed information

### Using Writing Mode

1. Ensure Writing Mode is enabled (toggle in popup)
2. Click on any text field on a website
3. Look for the "✨ Enrich" button
4. Click to get AI suggestions using your vocabulary
5. Review and apply suggestions to enhance your writing

### Practice with Flashcards

1. Open the Dashboard
2. Go to the "Practice" tab
3. Click "Start Practice" under Flashcards
4. Click cards to flip and reveal definitions
5. Navigate with Previous/Next buttons

## 🏗️ Project Structure

```
situ/
├── manifest.json              # Extension configuration
├── background/
│   └── background.js          # Service worker (context menus, messaging)
├── content/
│   ├── content.js             # Reading & Writing mode logic
│   └── content.css            # Content script styling
├── popup/
│   ├── popup.html             # Quick-access popup
│   ├── popup.js               # Popup functionality
│   └── popup.css              # Popup styling
├── dashboard/
│   ├── dashboard.html         # Full dashboard interface
│   ├── dashboard.js           # Dashboard functionality
│   └── dashboard.css          # Dashboard styling
├── utils/
│   ├── constants.js           # Shared constants
│   ├── storage.js             # Storage management
│   └── ai-helper.js           # AI/LanguageModel interface
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 🎨 Design Philosophy

### Color Palette
- **Primary**: Dark Purple (#6B46C1) - Trust, wisdom, learning
- **Accent**: Pink (#EC4899) - Highlights, attention
- **Success**: Green (#10B981) - Achievement, progress
- **Background**: White (#FFFFFF) - Clean, professional

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- High contrast ratios for readability
- Focus indicators for screen readers
- Semantic HTML structure

## 🔒 Privacy & Security

- **100% Local Processing**: All AI features run on-device using Chrome's built-in LanguageModel API
- **No External Servers**: Your vocabulary never leaves your browser
- **Chrome Storage Sync**: Optional sync across your Chrome browsers using your Google account
- **No Analytics**: We don't track your usage or collect any data
- **Open Source**: Full transparency - review the code yourself

## 🛠️ Technology Stack

- **Manifest V3**: Latest Chrome Extension standard
- **ES6+ JavaScript**: Modern, clean code
- **HTML5 & CSS3**: Semantic markup and modern styling
- **Chrome Storage Sync**: Cross-device vocabulary synchronization
- **Chrome LanguageModel API**: On-device AI for definitions and examples
- **Content Scripts**: Seamless webpage integration

## 📝 Development

### Contributing
We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

### Building from Source
No build process required! This is a pure JavaScript extension.

1. Clone the repository
2. Make your changes
3. Test in Chrome using "Load unpacked"
4. Submit a pull request

### Future Enhancements
- [ ] Support for multiple languages beyond English
- [ ] Audio pronunciations
- [ ] Spaced repetition algorithm
- [ ] Word families and etymology
- [ ] Integration with popular vocabulary APIs
- [ ] Mobile companion app
- [ ] Collaborative vocabulary lists
- [ ] Gamification features

## 🐛 Known Limitations

- Requires Chrome 128+ with AI features enabled
- AI model must be downloaded (happens automatically on first use)
- Works best with English language content
- Some websites with complex JavaScript may not highlight correctly
- Maximum vocabulary size: 1000 words (Chrome storage limitation)

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with Chrome's experimental LanguageModel API
- Inspired by the need for contextual, integrated language learning
- Designed for ESL students worldwide

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the Chrome AI documentation at https://developer.chrome.com/docs/ai/

---

**Made with 💜 for language learners everywhere**

*Situ - Because the best time to learn is when you're already engaged*
