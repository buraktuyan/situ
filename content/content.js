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
  let pendingWordUpdates = []; // Batch word tracking updates
  let wordUpdateTimeout = null;

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

      // Extract sentence for context
      const sentence = extractSentenceFromNode(textNode, word);

      // Queue word tracking update (batched to avoid quota issues)
      pendingWordUpdates.push({
        word: word,
        incrementSeen: true,
        recentlySeen: sentence ? {
          sentence: sentence,
          url: window.location.href
        } : null
      });

      // Schedule batched word tracking update
      scheduleWordTrackingUpdate();

      // Batch stat updates to avoid quota issues
      pendingStatUpdates.wordsSeen++;
      scheduleStatsUpdate();
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

  // ============ WORD TRACKING BATCHING ============

  function scheduleWordTrackingUpdate() {
    // Clear existing timeout
    if (wordUpdateTimeout) {
      clearTimeout(wordUpdateTimeout);
    }

    // Schedule batched update after 2 seconds of inactivity
    // (shorter than stats to ensure timely updates)
    wordUpdateTimeout = setTimeout(() => {
      flushWordTrackingUpdates();
    }, 2000);
  }

  function flushWordTrackingUpdates() {
    if (pendingWordUpdates.length > 0) {
      chrome.runtime.sendMessage({
        action: 'batchUpdateWordTracking',
        updates: [...pendingWordUpdates]
      });

      // Reset pending updates
      pendingWordUpdates = [];
    }

    wordUpdateTimeout = null;
  }

  // Flush all pending updates on page unload
  window.addEventListener('beforeunload', () => {
    flushStatsUpdates();
    flushWordTrackingUpdates();
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

    const repositionButton = () => {
      if (button && document.body.contains(button)) {
        positionSuggestionButton(field, button);
      }
    };

    field.addEventListener('focus', () => {
      updateButtonVisibility(field, button);
      if (button && !document.body.contains(button)) {
        positionSuggestionButton(field, button);
        document.body.appendChild(button);
      }
    });

    field.addEventListener('input', () => {
      updateButtonVisibility(field, button);
    });

    // Reposition button when text selection changes
    field.addEventListener('mouseup', repositionButton);
    field.addEventListener('keyup', repositionButton);
    field.addEventListener('select', repositionButton);

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
    button.innerHTML = '✨ Enhance';
    button.title = 'Get vocabulary suggestions';
    button.setAttribute('aria-label', 'Get vocabulary suggestions');

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await showWritingSuggestions(field);
    });

    return button;
  }

  function updateButtonVisibility(field, button) {
    const text = field.value || field.textContent || '';
    if (!text.trim()) {
      button.style.display = 'none';
    } else {
      button.style.display = 'block';
    }
  }

  function positionSuggestionButton(field, button) {
    let targetRect;

    // Check if there's a text selection
    if (field.selectionStart !== undefined && field.selectionStart !== field.selectionEnd) {
      // For input/textarea elements with text selection
      // Create a temporary element to measure the selection position
      const fieldRect = field.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(field);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const paddingTop = parseFloat(computedStyle.paddingTop);

      // Use the field's rect and position button at bottom right
      // (calculating exact selection position in textarea is complex, so we use field bounds)
      targetRect = fieldRect;
    } else {
      // No selection, use field bounds
      targetRect = field.getBoundingClientRect();
    }

    button.style.position = 'fixed';
    button.style.top = `${targetRect.bottom + 5}px`;
    button.style.left = `${targetRect.right - button.offsetWidth - 10}px`;
  }

  async function showWritingSuggestions(field) {
    const text = field.value || field.textContent || '';

    if (!text.trim()) {
      showNotification('Please enter some text first', 'info');
      return;
    }

    // Get the last 10 added vocabulary words (most recent)
    const recentWords = vocabulary
      .slice(0, 10)
      .map(v => v.word);

    // Get relevant vocabulary words not already in the text
    const targetWords = vocabulary
      .filter(v => !text.toLowerCase().includes(v.word.toLowerCase()))
      .slice(0, 5)
      .map(v => v.word);

    if (targetWords.length === 0) {
      showNotification('You\'re already using your vocabulary!', 'success');
      return;
    }

    // Show panel with loading state immediately
    showSuggestionPanelLoading(field, targetWords);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getWritingSuggestion',
        text: text,
        targetWords: targetWords,
        recentWords: recentWords
      });

      if (response.success) {
        updateSuggestionPanelWithContent(response.suggestion, targetWords);
      } else {
        updateSuggestionPanelWithError('Could not generate suggestions');
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      updateSuggestionPanelWithError('Error getting suggestions');
    }
  }

  function showSuggestionPanelLoading(field, targetWords) {
    // Remove existing panel
    removeSuggestionPanel();

    const panel = document.createElement('div');
    panel.className = 'situ-suggestion-panel';
    panel.setAttribute('data-field-id', Math.random().toString(36));
    panel.innerHTML = `
      <div class="situ-panel-header">
        <h4>✨ Writing Suggestions</h4>
        <button class="situ-panel-close" aria-label="Close">&times;</button>
      </div>
      <div class="situ-panel-content">
        <div class="situ-loading-container">
          <div class="situ-spinner"></div>
          <p class="situ-loading-text">Generating suggestions...</p>
        </div>
        <div class="situ-suggestion-content" style="display: none;"></div>
      </div>
    `;

    document.body.appendChild(panel);

    // Store field reference
    panel._field = field;

    // Position panel
    const rect = field.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - 300)}px`;
    panel.style.left = `${Math.max(20, rect.left)}px`;
    panel.style.maxWidth = `${Math.min(500, rect.width)}px`;

    // Event handlers
    panel.querySelector('.situ-panel-close').addEventListener('click', removeSuggestionPanel);
  }

  function updateSuggestionPanelWithContent(suggestion, targetWords) {
    const panel = document.querySelector('.situ-suggestion-panel');
    if (!panel) return;

    const loadingContainer = panel.querySelector('.situ-loading-container');
    const contentContainer = panel.querySelector('.situ-suggestion-content');

    if (loadingContainer) loadingContainer.style.display = 'none';
    if (contentContainer) {
      contentContainer.style.display = 'block';
      // Render HTML directly (suggestion now contains proper HTML formatting)
      contentContainer.innerHTML = `
        <div class="situ-suggestion-box">
          <div class="situ-suggestion-text">${suggestion}</div>
        </div>
        <div class="situ-target-words-box">
          <div class="situ-target-label">Target vocabulary:</div>
          <div class="situ-target-chips">
            ${targetWords.map(word => `<span class="situ-word-chip">${escapeHtml(word)}</span>`).join('')}
          </div>
        </div>
        <div class="situ-panel-actions">
          <button class="situ-btn-secondary" data-action="dismiss">Dismiss</button>
        </div>
      `;

      // Add event handlers for buttons
      const field = panel._field;
      contentContainer.querySelector('[data-action="dismiss"]').addEventListener('click', removeSuggestionPanel);
    }
  }

  function updateSuggestionPanelWithError(errorMessage) {
    const panel = document.querySelector('.situ-suggestion-panel');
    if (!panel) return;

    const loadingContainer = panel.querySelector('.situ-loading-container');
    const contentContainer = panel.querySelector('.situ-suggestion-content');

    if (loadingContainer) loadingContainer.style.display = 'none';
    if (contentContainer) {
      contentContainer.style.display = 'block';
      contentContainer.innerHTML = `
        <div class="situ-error-message">
          <p>⚠️ ${escapeHtml(errorMessage)}</p>
        </div>
        <div class="situ-panel-actions">
          <button class="situ-btn-secondary" data-action="dismiss">Close</button>
        </div>
      `;

      contentContainer.querySelector('[data-action="dismiss"]').addEventListener('click', removeSuggestionPanel);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
