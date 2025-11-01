// Situ - Content Script
// Handles Reading Mode (highlighting) and Writing Mode (suggestions)

(async function() {
  'use strict';

  // State
  let vocabulary = [];
  let settings = {};
  let highlightedElements = new Set();
  let writingAssistants = new Map();
  let seenWordsThisSession = new Set(); // Track words seen this session
  let pendingStatUpdates = { wordsSeen: 0 }; // Batch stat updates
  let statsUpdateTimeout = null;

  // Initialize
  async function initialize() {
    try {
      // Get vocabulary and settings
      const [vocabResponse, settingsResponse] = await Promise.all([
        chrome.runtime.sendMessage({ action: 'getVocabulary' }),
        chrome.runtime.sendMessage({ action: 'getSettings' })
      ]);

      if (vocabResponse?.success) {
        vocabulary = vocabResponse.vocabulary;
      }

      if (settingsResponse?.success) {
        settings = settingsResponse.settings;
      }

      // Start features if enabled
      if (settings.readingMode && vocabulary.length > 0) {
        startReadingMode();
      }

      if (settings.writingMode) {
        startWritingMode();
      }

      console.log('Situ initialized:', {
        vocabularyCount: vocabulary.length,
        readingMode: settings.readingMode,
        writingMode: settings.writingMode
      });
    } catch (error) {
      console.error('Error initializing Situ:', error);
    }
  }

  // ============ READING MODE ============

  function startReadingMode() {
    // Highlight existing content
    highlightVocabulary();

    // Watch for new content
    observePageChanges();
  }

  function highlightVocabulary() {
    if (!vocabulary || vocabulary.length === 0) return;

    // Create regex pattern for all vocabulary words
    const words = vocabulary.map(v => v.word);
    const pattern = createWordPattern(words);

    if (!pattern) return;

    // Find and highlight text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script, style, and already highlighted elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip any Situ UI elements (tooltips, cards, panels, etc.)
          let element = parent;
          while (element) {
            if (element.classList) {
              // Check if any class starts with 'situ-'
              for (let className of element.classList) {
                if (className.startsWith('situ-')) {
                  return NodeFilter.FILTER_REJECT;
                }
              }
            }
            element = element.parentElement;
          }

          // Check if text contains any vocabulary word
          if (pattern.test(node.textContent)) {
            return NodeFilter.FILTER_ACCEPT;
          }

          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodesToProcess = [];
    let node;
    while (node = walker.nextNode()) {
      nodesToProcess.push(node);
    }

    // Process nodes
    nodesToProcess.forEach(textNode => {
      highlightTextNode(textNode, pattern);
    });
  }

  function createWordPattern(words) {
    if (!words || words.length === 0) return null;

    // Escape special regex characters and sort by length (longest first)
    const escapedWords = words
      .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length);

    // Create pattern with word boundaries
    return new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
  }

  function highlightTextNode(textNode, pattern) {
    const text = textNode.textContent;
    const matches = [...text.matchAll(pattern)];

    if (matches.length === 0) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach(match => {
      const matchText = match[0];
      const matchIndex = match.index;

      // Add text before match
      if (matchIndex > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex, matchIndex))
        );
      }

      // Create highlight element
      const highlight = createHighlightElement(matchText, textNode);
      fragment.appendChild(highlight);

      lastIndex = matchIndex + matchText.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(
        document.createTextNode(text.substring(lastIndex))
      );
    }

    // Replace text node with fragment
    textNode.parentNode.replaceChild(fragment, textNode);
  }

  function createHighlightElement(word, textNode) {
    const span = document.createElement('span');
    span.className = 'situ-highlight';
    span.textContent = word;
    span.setAttribute('data-word', word.toLowerCase());

    // Add tooltip on hover
    span.addEventListener('mouseenter', handleHighlightHover);
    span.addEventListener('click', handleHighlightClick);

    highlightedElements.add(span);

    // Track that word was seen (only once per session)
    const wordKey = word.toLowerCase();
    if (!seenWordsThisSession.has(wordKey)) {
      seenWordsThisSession.add(wordKey);

      // Increment vocabulary item seen count immediately (single write)
      chrome.runtime.sendMessage({
        action: 'incrementSeenCountOnly',
        word: word
      });

      // Batch stat updates to avoid quota issues
      pendingStatUpdates.wordsSeen++;
      scheduleStatsUpdate();
    }

    // Extract and store the sentence for recently seen
    const sentence = extractSentenceFromNode(textNode, word);
    if (sentence) {
      chrome.runtime.sendMessage({
        action: 'addRecentlySeen',
        word: word,
        sentence: sentence,
        url: window.location.href
      });
    }

    return span;
  }

  function handleHighlightHover(event) {
    const word = event.target.getAttribute('data-word');
    const vocabItem = vocabulary.find(v => v.word.toLowerCase() === word);

    if (vocabItem && vocabItem.definition) {
      showTooltip(event.target, vocabItem);
    }
  }

  function handleHighlightClick(event) {
    const word = event.target.getAttribute('data-word');
    const vocabItem = vocabulary.find(v => v.word.toLowerCase() === word);

    if (vocabItem) {
      showWordDetails(vocabItem, event.target);
    }
  }

  function showTooltip(element, vocabItem) {
    // Remove existing tooltip
    removeTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'situ-tooltip';
    tooltip.innerHTML = `
      <div class="situ-tooltip-word">${vocabItem.word}</div>
      <div class="situ-tooltip-definition">${vocabItem.definition || 'No definition available'}</div>
      ${vocabItem.seenCount > 0 ? `<div class="situ-tooltip-stats">Seen ${vocabItem.seenCount} times</div>` : ''}
    `;

    document.body.appendChild(tooltip);

    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    // Remove tooltip when mouse leaves
    element.addEventListener('mouseleave', removeTooltip, { once: true });
  }

  function removeTooltip() {
    const tooltip = document.querySelector('.situ-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  function showWordDetails(vocabItem, anchorElement) {
    // Remove existing detail panel
    removeWordDetails();

    const panel = document.createElement('div');
    panel.className = 'situ-word-details';

    const recentlySeen = vocabItem.recentlySeen || [];

    panel.innerHTML = `
      <div class="situ-detail-header">
        <h3>${vocabItem.word}</h3>
        <button class="situ-detail-close" aria-label="Close">&times;</button>
      </div>
      <div class="situ-detail-content">
        ${vocabItem.definition ? `<p class="definition"><strong>Definition:</strong> ${vocabItem.definition}</p>` : ''}
        ${vocabItem.examples?.length > 0 ? `
          <div class="examples">
            <strong>Examples:</strong>
            <ul>${vocabItem.examples.map(ex => `<li>${ex}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${recentlySeen.length > 0 ? `
          <div class="examples">
            <strong>Recently Seen:</strong>
            <ul>${recentlySeen.map(entry => {
              let html = `<li>${entry.sentence}`;
              try {
                const domain = new URL(entry.url).hostname.replace('www.', '');
                html += `<br><a href="${entry.url}" target="_blank" style="font-size: 0.9em; color: #6B46C1;">📎 ${domain}</a>`;
              } catch (e) {
                // Invalid URL, skip link
              }
              html += `</li>`;
              return html;
            }).join('')}</ul>
          </div>
        ` : ''}
        ${vocabItem.synonyms?.length > 0 ? `
          <p class="synonyms"><strong>Synonyms:</strong> ${vocabItem.synonyms.join(', ')}</p>
        ` : ''}
        <div class="stats">
          <span>Seen: ${vocabItem.seenCount || 0}</span>
          <span>Used: ${vocabItem.usedCount || 0}</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Position panel
    const rect = anchorElement.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - panel.offsetHeight - 20)}px`;
    panel.style.left = `${Math.min(rect.left, window.innerWidth - panel.offsetWidth - 20)}px`;

    // Close button handler
    panel.querySelector('.situ-detail-close').addEventListener('click', removeWordDetails);

    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeOnOutside(e) {
        if (!panel.contains(e.target) && e.target !== anchorElement) {
          removeWordDetails();
          document.removeEventListener('click', closeOnOutside);
        }
      });
    }, 0);
  }

  function removeWordDetails() {
    const panel = document.querySelector('.situ-word-details');
    if (panel) {
      panel.remove();
    }
  }

  function observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      // Debounce to avoid too many highlights
      clearTimeout(observePageChanges.timeout);
      observePageChanges.timeout = setTimeout(() => {
        highlightVocabulary();
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ============ STATS BATCHING ============

  function scheduleStatsUpdate() {
    // Clear existing timeout
    if (statsUpdateTimeout) {
      clearTimeout(statsUpdateTimeout);
    }

    // Schedule batched update after 5 seconds of inactivity
    statsUpdateTimeout = setTimeout(() => {
      flushStatsUpdates();
    }, 5000);
  }

  function flushStatsUpdates() {
    if (pendingStatUpdates.wordsSeen > 0) {
      chrome.runtime.sendMessage({
        action: 'batchUpdateStats',
        updates: { ...pendingStatUpdates }
      });

      // Reset pending updates
      pendingStatUpdates.wordsSeen = 0;
    }

    statsUpdateTimeout = null;
  }

  // Flush stats on page unload
  window.addEventListener('beforeunload', () => {
    flushStatsUpdates();
  });

  // ============ WRITING MODE ============

  function startWritingMode() {
    // Find all text inputs and textareas
    attachToTextFields();

    // Watch for new text fields
    observeTextFields();
  }

  function attachToTextFields() {
    const fields = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');

    fields.forEach(field => {
      if (!field.hasAttribute('data-situ-attached')) {
        attachWritingAssistant(field);
      }
    });
  }

  function attachWritingAssistant(field) {
    field.setAttribute('data-situ-attached', 'true');

    // Create suggestion button
    const button = createSuggestionButton(field);

    field.addEventListener('focus', () => {
      if (button && !document.body.contains(button)) {
        positionSuggestionButton(field, button);
        document.body.appendChild(button);
      }
    });

    field.addEventListener('blur', () => {
      setTimeout(() => {
        if (button && !button.matches(':hover')) {
          button.remove();
        }
      }, 200);
    });

    writingAssistants.set(field, button);
  }

  function createSuggestionButton(field) {
    const button = document.createElement('button');
    button.className = 'situ-suggest-button';
    button.innerHTML = '✨ Enrich';
    button.title = 'Get vocabulary suggestions';
    button.setAttribute('aria-label', 'Get vocabulary suggestions');

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await showWritingSuggestions(field);
    });

    return button;
  }

  function positionSuggestionButton(field, button) {
    const rect = field.getBoundingClientRect();
    button.style.position = 'fixed';
    button.style.top = `${rect.bottom + window.scrollY + 5}px`;
    button.style.right = `${window.innerWidth - rect.right}px`;
  }

  async function showWritingSuggestions(field) {
    const text = field.value || field.textContent || '';

    if (!text.trim()) {
      showNotification('Please enter some text first', 'info');
      return;
    }

    // Get relevant vocabulary words
    const targetWords = vocabulary
      .filter(v => !text.toLowerCase().includes(v.word.toLowerCase()))
      .slice(0, 5)
      .map(v => v.word);

    if (targetWords.length === 0) {
      showNotification('You\'re already using your vocabulary!', 'success');
      return;
    }

    // Show loading
    showNotification('Getting suggestions...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getWritingSuggestion',
        text: text,
        targetWords: targetWords
      });

      if (response.success) {
        showSuggestionPanel(field, response.suggestion, targetWords);
      } else {
        showNotification('Could not generate suggestions', 'error');
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      showNotification('Error getting suggestions', 'error');
    }
  }

  function showSuggestionPanel(field, suggestion, targetWords) {
    // Remove existing panel
    removeSuggestionPanel();

    const panel = document.createElement('div');
    panel.className = 'situ-suggestion-panel';
    panel.innerHTML = `
      <div class="situ-panel-header">
        <h4>💡 Vocabulary Suggestion</h4>
        <button class="situ-panel-close" aria-label="Close">&times;</button>
      </div>
      <div class="situ-panel-content">
        <p class="suggestion-text">${suggestion}</p>
        <p class="target-words">Using: ${targetWords.join(', ')}</p>
      </div>
      <div class="situ-panel-actions">
        <button class="situ-btn-secondary" data-action="dismiss">Dismiss</button>
        <button class="situ-btn-primary" data-action="apply">Apply</button>
      </div>
    `;

    document.body.appendChild(panel);

    // Position panel
    const rect = field.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - panel.offsetHeight - 20)}px`;
    panel.style.left = `${Math.max(20, rect.left)}px`;
    panel.style.maxWidth = `${Math.min(500, rect.width)}px`;

    // Event handlers
    panel.querySelector('.situ-panel-close').addEventListener('click', removeSuggestionPanel);
    panel.querySelector('[data-action="dismiss"]').addEventListener('click', removeSuggestionPanel);
    panel.querySelector('[data-action="apply"]').addEventListener('click', () => {
      applySuggestion(field, suggestion);
      removeSuggestionPanel();
    });
  }

  function applySuggestion(field, suggestion) {
    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      field.value = suggestion;
    } else {
      field.textContent = suggestion;
    }

    // Trigger input event
    field.dispatchEvent(new Event('input', { bubbles: true }));

    showNotification('Suggestion applied!', 'success');

    // Track usage
    // Extract which words were used (simple check)
    vocabulary.forEach(v => {
      if (suggestion.toLowerCase().includes(v.word.toLowerCase())) {
        chrome.runtime.sendMessage({
          action: 'incrementUsedCount',
          word: v.word
        });
      }
    });
  }

  function removeSuggestionPanel() {
    const panel = document.querySelector('.situ-suggestion-panel');
    if (panel) {
      panel.remove();
    }
  }

  function observeTextFields() {
    const observer = new MutationObserver(() => {
      attachToTextFields();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ============ NOTIFICATIONS ============

  function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.situ-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `situ-notification situ-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('situ-notification-fadeout');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ============ MESSAGE HANDLING ============

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'wordProcessing':
        showNotification(`Adding "${message.word}"...`, 'info');
        break;

      case 'wordAdded':
        vocabulary.push(message.word);
        showNotification(`"${message.word.word}" added to vocabulary!`, 'success');
        if (settings.readingMode) {
          highlightVocabulary();
        }
        break;

      case 'wordExists':
        showNotification(`"${message.word}" is already in your vocabulary`, 'info');
        break;

      case 'wordError':
        showNotification(`Error adding "${message.word}"`, 'error');
        break;

      case 'getSentenceContext':
        const sentence = extractSentenceContext(message.word);
        sendResponse({ sentence });
        break;

      case 'settingsUpdated':
        settings = message.settings;
        // Refresh if needed
        if (settings.readingMode) {
          startReadingMode();
        } else {
          clearHighlights();
        }
        break;

      case 'refreshVocabulary':
        initialize();
        break;
    }
    return true; // Keep message channel open for async response
  });

  /**
   * Extract the sentence containing a specific word from a text node
   */
  function extractSentenceFromNode(textNode, word) {
    try {
      // Get the full text from the text node and parent context
      let fullText = textNode.textContent || '';

      // If text is too short, get more context from parent
      if (fullText.length < 100 && textNode.parentElement) {
        fullText = textNode.parentElement.textContent || fullText;
      }

      // If still too short, try grandparent
      if (fullText.length < 100 && textNode.parentElement?.parentElement) {
        fullText = textNode.parentElement.parentElement.textContent || fullText;
      }

      // Find sentences containing the word
      const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];

      // Return first sentence containing the word
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(word.toLowerCase())) {
          return sentence.trim();
        }
      }

      // If no sentence found with punctuation, return a chunk around the word
      const wordIndex = fullText.toLowerCase().indexOf(word.toLowerCase());
      if (wordIndex !== -1) {
        const start = Math.max(0, wordIndex - 50);
        const end = Math.min(fullText.length, wordIndex + word.length + 100);
        return fullText.substring(start, end).trim();
      }

      return fullText.substring(0, 200).trim();
    } catch (error) {
      console.error('Error extracting sentence from node:', error);
      return null;
    }
  }

  /**
   * Extract the sentence containing a specific word from the selected text
   */
  function extractSentenceContext(word) {
    try {
      const selection = window.getSelection();
      if (!selection || !selection.anchorNode) {
        return null;
      }

      // Get the text content around the selection
      let contextNode = selection.anchorNode;
      if (contextNode.nodeType === Node.TEXT_NODE) {
        contextNode = contextNode.parentElement;
      }

      let fullText = contextNode.textContent || '';

      // If the context is too short, try to get more from parent
      if (fullText.length < 100 && contextNode.parentElement) {
        fullText = contextNode.parentElement.textContent || fullText;
      }

      // Find sentences containing the word
      const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];

      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(word.toLowerCase())) {
          return sentence.trim();
        }
      }

      // If no sentence found, return the selection context
      return fullText.substring(0, 200).trim();
    } catch (error) {
      console.error('Error extracting sentence context:', error);
      return null;
    }
  }

  function clearHighlights() {
    highlightedElements.forEach(el => {
      if (el.parentNode) {
        const textNode = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(textNode, el);
      }
    });
    highlightedElements.clear();
  }

  // ============ INITIALIZATION ============

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
