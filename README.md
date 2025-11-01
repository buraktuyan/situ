# Situ - Learn Vocabulary While Browsing

**Tagline:** *Learning happens in situ - in the moment, in context*

Situ is a powerful Chrome extension that transforms your daily browsing into an immersive vocabulary learning experience for ESL (English as a Second Language) students. No flashcards, no dedicated study sessions—just natural, contextual learning that happens automatically as you explore the web.

## 🌟 Key Features

### 📖 Reading Mode - Learn Through Exposure
- **Automatic Highlighting**: Your target vocabulary words are automatically highlighted on every webpage you visit
- **Instant Hover Tooltips**: See quick definitions and usage stats without interrupting your reading flow
- **Detailed Word Cards**: Click any highlighted word to view comprehensive information including examples and synonyms
- **Recently Seen Tracking**: NEW! View actual sentences where you encountered each word, with clickable links back to the source pages
- **Smart Encounter Tracking**: Automatically counts how many times you've seen each word to measure your exposure

### ✍️ Writing Mode - Active Vocabulary Building
- **AI-Powered Suggestions**: Get intelligent recommendations to incorporate your vocabulary words into your writing
- **Universal Integration**: Works seamlessly on Gmail, Reddit, Discord, Twitter, and any text input field
- **Real-Time Enrichment**: Click the "✨ Enrich" button to transform your text using your target vocabulary
- **Usage Tracking**: Automatically tracks when you successfully use vocabulary words in your writing
- **Natural Activation**: Helps convert passive vocabulary knowledge into active usage

### 🤖 Built-in AI Features
- **100% Offline Processing**: Powered by Chrome's built-in Gemini Nano - no external API calls, no data leaves your device
- **Auto-Enrichment**: Right-click any word on the web to instantly add it to your vocabulary with AI-generated content
- **Smart Definitions**: Automatically generates clear, ESL-friendly definitions
- **Contextual Examples**: Creates relevant example sentences to demonstrate proper usage
- **Synonym Discovery**: Finds related words to expand your vocabulary naturally
- **Privacy-First**: All AI processing happens locally on your device

### 📊 Comprehensive Progress Tracking
- **Daily Statistics**: Monitor your vocabulary exposure and usage each day
- **Weekly Charts**: Visualize your learning journey with interactive weekly progress graphs
- **Top Words**: See which vocabulary words you encounter most frequently
- **Daily Goals**: Set and track daily encounter goals to maintain consistent progress
- **Seen vs. Used Metrics**: Track both passive exposure (reading) and active usage (writing)

### 🎯 Interactive Practice Modes
- **Flashcard System**: Study your vocabulary with an interactive flashcard interface
- **Writing Challenges**: Practice using words in context with guided sentence-writing exercises
- **Immediate Feedback**: Get instant validation when you correctly use vocabulary words
- **Randomized Practice**: Words are shuffled to ensure effective retention
- **Progress Indicators**: Track your progress through each practice session

### 🎨 Customizable Experience
- **Flexible Highlight Styles**: Choose between background highlights, underlines, or both
- **Difficulty Levels**: Organize and filter words by beginner, intermediate, or advanced levels
- **Independent Mode Controls**: Toggle reading and writing modes separately based on your needs
- **Import/Export**: Backup your vocabulary lists or share them with fellow learners
- **Source Attribution**: NEW! See the original context where you first encountered each word with clickable source links

### 📱 Beautiful, Accessible Interface
- **Modern Purple-Themed Design**: Clean, professional interface that's easy on the eyes
- **Quick-Access Popup**: View stats, add words, and toggle modes with one click from your toolbar
- **Full Dashboard**: Comprehensive vocabulary management in a dedicated interface
- **ARIA-Compliant**: Full keyboard navigation and screen reader support
- **Responsive Design**: Works seamlessly across different screen sizes

## 💡 Inspiration

As language learners ourselves, we noticed a fundamental problem: traditional vocabulary learning is disconnected from real-world usage. You study flashcards for hours, only to forget words when you actually need them. We wanted to bridge that gap.

The name "Situ" comes from the Latin phrase "in situ," meaning "in the natural or original position." It reflects our core philosophy: **the best way to learn vocabulary is in context, at the moment you encounter it naturally.**

We were inspired by how children learn languages—through constant exposure and usage in meaningful contexts, not through memorization drills. Situ brings that natural learning process to adult language learners navigating the web.

## 🎯 What It Does

Situ creates an immersive vocabulary learning environment within your browser:

1. **Passive Learning Through Reading**: As you browse your favorite websites, Situ automatically highlights your target vocabulary words. You see them in real contexts—news articles, blog posts, social media. Each encounter reinforces your memory without any effort on your part.

2. **Active Learning Through Writing**: When you compose emails, write comments, or post on social media, Situ suggests ways to incorporate your vocabulary words naturally. This transforms passive knowledge into active usage.

3. **AI-Enhanced Vocabulary Building**: Found an interesting word on a webpage? Right-click and add it to your vocabulary. Situ uses Chrome's built-in AI to instantly generate definitions, usage examples, and synonyms—all without internet connectivity.

4. **Context Preservation**: Unlike traditional flashcards that strip words of context, Situ's "Recently Seen" feature captures the actual sentences where you encountered each word. Click any word in your dashboard to see where you found it on the web, complete with links back to the original pages.

5. **Progress Tracking & Motivation**: Watch your vocabulary exposure grow with daily statistics, weekly charts, and achievement tracking. Set daily encounter goals to maintain consistency.

6. **Flexible Practice**: When you have a few minutes, use the flashcard system or writing challenges to actively review your vocabulary.

## 🛠️ How We Built It

**Technology Stack:**
- **Manifest V3**: Built on Chrome's latest extension standard for enhanced security and performance
- **Vanilla JavaScript (ES6+)**: No frameworks—pure, optimized code for fast performance
- **Chrome Storage Sync API**: Seamlessly synchronizes vocabulary across all your Chrome devices
- **Chrome LanguageModel API (Gemini Nano)**: Leverages Chrome's built-in on-device AI for privacy-focused intelligent features
- **Content Scripts**: Seamlessly integrates with any webpage for highlighting and writing assistance
- **MutationObserver API**: Intelligently detects dynamic content changes for real-time highlighting
- **Service Workers**: Efficient background processing for context menus and messaging

**Architecture Highlights:**
- **Modular Design**: Separated concerns across background scripts, content scripts, popup, and dashboard
- **Performance Optimization**: Batched statistics updates to prevent Chrome storage quota issues
- **Efficient Text Processing**: Advanced TreeWalker and regex-based highlighting that works on complex web pages
- **Debounced Operations**: Smart throttling prevents excessive processing on dynamic websites
- **Semantic HTML & ARIA**: Accessibility-first design from the ground up

**Development Process:**
1. Started with core reading mode functionality and text highlighting engine
2. Built AI integration layer for offline word enrichment
3. Added writing mode with contextual suggestions
4. Implemented comprehensive statistics and progress tracking
5. Created the Recently Seen feature to capture learning context
6. Developed interactive practice modes for active review
7. Polished UI/UX with extensive user testing and refinement

## 🚧 Challenges We Ran Into

**1. Chrome Storage Quota Limitations**
Chrome's sync storage has strict quota limits (100KB total, limited write operations). With users potentially encountering dozens of words per browsing session, we quickly hit quota errors.

**Solution**: Implemented a sophisticated batching system that groups statistics updates and flushes them periodically, dramatically reducing write operations while maintaining data accuracy.

**2. Highlighting on Dynamic Websites**
Modern websites (especially single-page applications) constantly modify their DOM. Our initial highlighting approach would miss new content or create performance issues.

**Solution**: Built a MutationObserver-based system with intelligent debouncing that monitors page changes and re-highlights only when necessary, avoiding infinite loops and performance degradation.

**3. Avoiding Infinite Highlighting Loops**
Our highlighting creates new DOM elements (spans). If not careful, the MutationObserver would detect these as new content and try to re-highlight them, causing crashes.

**Solution**: Implemented a filtering system that checks for `situ-` prefixed class names and skips all Situ UI elements during the highlighting traversal.

**4. Preserving Context for Learning**
Initially, we only stored word definitions. User testing revealed that learners wanted to remember *where* they encountered words—the actual context matters for memory formation.

**Solution**: Developed the "Recently Seen" feature that extracts the surrounding sentence when a word is highlighted and stores it with a link to the source URL, creating a rich context history.

**5. Writing Mode Integration Complexity**
Different websites implement text inputs differently (textarea vs. contenteditable vs. custom inputs). Making writing suggestions work universally was challenging.

**Solution**: Created an adaptive attachment system that detects multiple types of text fields and positions suggestion buttons dynamically using getBoundingClientRect calculations.

**6. AI Model Availability**
Chrome's LanguageModel API is experimental and requires specific Chrome versions and flags. Handling cases where AI is unavailable proved tricky.

**Solution**: Added comprehensive AI availability checks with graceful fallbacks and helpful error messages guiding users to enable the required Chrome features.

## 🏆 Accomplishments That We're Proud Of

**1. True Offline AI Processing**
We're proud to be one of the first extensions to leverage Chrome's built-in Gemini Nano for 100% offline, privacy-first AI features. Users can enrich vocabulary with zero latency and zero privacy concerns.

**2. Context-Aware Learning**
The "Recently Seen" feature represents a breakthrough in vocabulary learning design. By preserving not just definitions but actual usage contexts with source links, we've created a learning tool that mirrors how humans naturally acquire language.

**3. Performance on Complex Websites**
Our highlighting engine works flawlessly on everything from simple blogs to complex web applications (Gmail, Twitter, Reddit). The TreeWalker-based algorithm with smart filtering handles edge cases gracefully.

**4. Seamless User Experience**
Despite complex functionality under the hood, the user experience is incredibly simple: install, add words, browse as normal. Learning happens automatically without disrupting your workflow.

**5. Comprehensive Feature Set**
We built a complete vocabulary learning ecosystem—not just highlighting, but AI enrichment, writing assistance, multiple practice modes, statistics tracking, and more. It's a standalone learning platform.

**6. Accessibility Commitment**
Every feature includes ARIA labels, keyboard navigation, and semantic HTML. We're proud that Situ is usable by learners with diverse accessibility needs.

**7. Open Source & Educational**
We've documented our code extensively and made it open source, helping other developers learn Chrome extension development and AI integration techniques.

## 📚 What We Learned

**Technical Insights:**
- **Chrome Storage is Tricky**: Understanding quota limits, sync vs. local storage, and write operation costs was crucial. Batching and debouncing are essential patterns.
- **Content Script Performance Matters**: Operations that run on every page load must be highly optimized. We learned to profile extensively and minimize DOM traversals.
- **The Power of On-Device AI**: Chrome's LanguageModel API is incredibly powerful. We learned prompt engineering techniques specific to Gemini Nano for optimal definition and example generation.
- **MutationObserver Nuances**: Learned to use sophisticated filtering and disconnection strategies to avoid performance issues on dynamic sites.

**UX/Design Lessons:**
- **Context is King for Learning**: User testing confirmed that preserving the original context where words are encountered is critical for memory retention.
- **Subtlety Matters**: Early versions had overly aggressive highlighting that users found distracting. We learned to balance visibility with subtlety.
- **Progressive Disclosure**: Not all features should be immediately visible. The popup provides quick access, while the dashboard houses advanced features.

**Language Learning Pedagogy:**
- **Spaced Repetition Through Natural Exposure**: Seeing words repeatedly in different contexts (natural spaced repetition) is more effective than scheduled flashcard reviews.
- **Active vs. Passive Vocabulary**: Tracking both "seen" and "used" metrics helped us understand the gap between recognition and production in language learning.
- **Motivation Through Progress**: Visible statistics and goal-setting significantly increased user engagement.

**Development Process:**
- **Iterate Based on Real Usage**: User testing revealed use cases we never anticipated (like wanting to see source URLs for recently seen contexts).
- **Start Simple, Add Complexity**: We started with just highlighting, then added features incrementally based on user needs.
- **Document as You Build**: Writing clear code comments and documentation early saved countless hours during feature additions.

## 🚀 What's Next for Situ

**Short-Term Enhancements:**
- **Audio Pronunciations**: Integrate text-to-speech for word pronunciations using Chrome's built-in speech synthesis API
- **Word Families & Etymology**: Show related word forms (noun/verb/adjective variations) and word origins to deepen understanding
- **Enhanced Practice Modes**: Add multiple-choice quizzes, fill-in-the-blank exercises, and synonym matching games
- **Customizable Highlight Colors**: Let users choose different colors for different difficulty levels or word categories

**Medium-Term Features:**
- **Spaced Repetition Algorithm**: Implement intelligent review scheduling based on forgetting curves to optimize retention
- **Multi-Language Support**: Expand beyond English to support vocabulary learning for Spanish, French, Mandarin, and more
- **Collaborative Vocabulary Lists**: Enable sharing curated word lists between teachers and students or study groups
- **Browser Action Shortcuts**: Add keyboard shortcuts for common actions (add word, toggle modes, open dashboard)
- **Smart Word Recommendations**: Use AI to suggest new vocabulary words based on user's current level and reading habits

**Long-Term Vision:**
- **Mobile Companion App**: Bring Situ to mobile browsers for vocabulary learning on phones and tablets
- **Integration with Popular ESL Resources**: Connect with services like Anki, Quizlet, or language learning platforms for seamless workflow
- **Teacher Dashboard**: Create a separate interface for educators to manage student vocabularies and track class progress
- **Gamification & Social Features**: Add achievements, streaks, leaderboards, and social sharing to increase motivation
- **Advanced AI Features**: Use AI to assess writing quality, suggest better word choices, and provide personalized learning paths
- **Reading Level Analysis**: Automatically assess webpage difficulty and suggest appropriate vocabulary based on content complexity
- **API for Third-Party Integration**: Allow other educational tools to integrate with Situ's vocabulary tracking system

**Research & Innovation:**
- **Learning Analytics**: Implement comprehensive analytics to help users understand their learning patterns and optimize study strategies
- **A/B Testing Framework**: Build infrastructure to test different learning approaches and determine what's most effective
- **Accessibility Enhancements**: Add support for dyslexic-friendly fonts, color-blind modes, and enhanced screen reader integration
- **Offline-First PWA Dashboard**: Create a progressive web app version of the dashboard that works completely offline

## 🚀 Installation

### Prerequisites
1. **Chrome Browser**: Version 128 or later (Dev, Canary, or stable channel)
2. **Enable Chrome AI Features**:
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
   - Select "Enabled"
   - Navigate to `chrome://flags/#optimization-guide-on-device-model`
   - Select "Enabled BypassPerfRequirement"
   - Restart Chrome

### Install the Extension
1. Clone or download this repository
   ```bash
   git clone https://github.com/buraktuyan/situ.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `situ` directory
6. The Situ icon should appear in your toolbar!

### First Steps
1. Click the Situ icon and add a few vocabulary words
2. Browse any website and watch your words get highlighted automatically
3. Click on highlighted words to see full details
4. Try the writing mode by clicking in any text field
5. Open the dashboard to explore practice modes and statistics

## 📖 Quick Usage Guide

**Adding Words:**
- **From any webpage**: Right-click a word → "Add to Situ"
- **From popup**: Click the Situ icon → type word → click +
- **From dashboard**: Open dashboard → "Add Word" → AI auto-enrichment

**Reading Mode:**
- Words highlight automatically on every webpage
- Hover for quick definition tooltip
- Click for full details including examples and recently seen contexts

**Writing Mode:**
- Click any text field to see "✨ Enrich" button
- Click button to get AI suggestions using your vocabulary
- Apply suggestions to enhance your writing

**Practice:**
- Open dashboard → Practice tab
- Choose flashcards or writing challenges
- Track your progress in the Stats tab

## 🔒 Privacy & Security

- **100% Local AI Processing**: All AI features use Chrome's built-in Gemini Nano—no external servers
- **No Data Collection**: We don't track, collect, or transmit any user data
- **Optional Sync**: Vocabulary syncs across your Chrome browsers via your Google account (can be disabled)
- **No External APIs**: Everything runs locally in your browser
- **Open Source**: Full code transparency—review it yourself on GitHub

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with Chrome's experimental LanguageModel API (Gemini Nano)
- Inspired by the language learning research on contextual acquisition
- Designed with feedback from ESL students and educators worldwide
- Special thanks to the Chrome Extensions community for their excellent documentation and support

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/buraktuyan/situ/issues)
- Check [Chrome AI documentation](https://developer.chrome.com/docs/ai/) for AI-related questions
- Review existing issues for solutions

---

**Made with 💜 for language learners everywhere**

*Situ - Because the best learning happens in context, not in isolation*
