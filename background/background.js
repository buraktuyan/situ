// Situ - Background Service Worker
// Handles context menus, message passing, and coordination

import { CONTEXT_MENU_ID } from '../utils/constants.js';
import { StorageManager } from '../utils/storage.js';
import { AIHelper } from '../utils/ai-helper.js';

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Situ installed:', details.reason);

  // Create context menu
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Add "%s" to Situ',
    contexts: ['selection']
  });

  // Initialize default settings if first install
  if (details.reason === 'install') {
    console.log('First install - initializing default settings');
    const settings = await StorageManager.getSettings();
    console.log('Settings initialized:', settings);
  }

  // Check AI availability
  await AIHelper.checkAvailability();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    const selectedText = info.selectionText.trim();

    try {
      // Show processing notification
      chrome.tabs.sendMessage(tab.id, {
        action: 'wordProcessing',
        word: selectedText
      });

      // Request the full sentence context from the content script
      const contextResponse = await chrome.tabs.sendMessage(tab.id, {
        action: 'getSentenceContext',
        word: selectedText
      }).catch(() => ({ sentence: null }));

      const sourceSentence = contextResponse?.sentence || null;
      const sourceUrl = tab.url || '';

      // Check if AI is available for enrichment
      const aiAvailable = await AIHelper.checkAvailability();

      let wordData = {
        word: selectedText,
        sourceUrl: sourceUrl,
        sourceSentence: sourceSentence
      };

      // If AI is available, enrich the word with definition, examples, etc.
      if (aiAvailable) {
        console.log('Enriching word with AI:', selectedText);
        const settings = await StorageManager.getSettings();
        const enrichedData = await AIHelper.enrichWord(
          selectedText,
          settings.difficulty || 'intermediate',
          sourceSentence
        );
        wordData = { ...wordData, ...enrichedData };
      }

      // Add to vocabulary
      const result = await StorageManager.addWord(wordData);

      // Notify the user
      if (result.success) {
        // Send message to content script to show notification
        chrome.tabs.sendMessage(tab.id, {
          action: 'wordAdded',
          word: result.word
        });

        // Show badge temporarily
        chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId: tab.id });

        setTimeout(() => {
          chrome.action.setBadgeText({ text: '', tabId: tab.id });
        }, 2000);
      } else if (result.error === 'Word already exists') {
        // Notify that word exists
        chrome.tabs.sendMessage(tab.id, {
          action: 'wordExists',
          word: selectedText
        });
      }
    } catch (error) {
      console.error('Error adding word from context menu:', error);
      chrome.tabs.sendMessage(tab.id, {
        action: 'wordError',
        word: selectedText
      });
    }
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep the message channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.action) {
      case 'getVocabulary':
        const vocabulary = await StorageManager.getVocabulary();
        sendResponse({ success: true, vocabulary });
        break;

      case 'addWord':
        const addResult = await StorageManager.addWord(message.wordData);
        sendResponse(addResult);
        break;

      case 'updateWord':
        const updateResult = await StorageManager.updateWord(message.id, message.updates);
        sendResponse(updateResult);
        break;

      case 'deleteWord':
        const deleteResult = await StorageManager.deleteWord(message.id);
        sendResponse(deleteResult);
        break;

      case 'getSettings':
        const settings = await StorageManager.getSettings();
        sendResponse({ success: true, settings });
        break;

      case 'updateSettings':
        const settingsResult = await StorageManager.updateSettings(message.settings);
        sendResponse(settingsResult);

        // Notify all tabs about settings change
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            settings: settingsResult.settings
          }).catch(() => {
            // Ignore errors for tabs that don't have content script
          });
        });
        break;

      case 'getStats':
        const stats = await StorageManager.getStats();
        sendResponse({ success: true, stats });
        break;

      case 'incrementSeenCount':
        await StorageManager.incrementSeenCount(message.word);
        sendResponse({ success: true });
        break;

      case 'incrementUsedCount':
        await StorageManager.incrementUsedCount(message.word);
        sendResponse({ success: true });
        break;

      case 'addRecentlySeen':
        await StorageManager.addRecentlySeen(message.word, message.sentence, message.url);
        sendResponse({ success: true });
        break;

      case 'enrichWord':
        const aiAvailable = await AIHelper.checkAvailability();
        if (aiAvailable) {
          const enrichedData = await AIHelper.enrichWord(message.word);
          sendResponse({ success: true, data: enrichedData });
        } else {
          sendResponse({ success: false, error: 'AI not available' });
        }
        break;

      case 'getDefinition':
        const defResult = await AIHelper.getDefinition(message.word);
        sendResponse(defResult);
        break;

      case 'getExample':
        const exampleResult = await AIHelper.getExample(message.word);
        sendResponse(exampleResult);
        break;

      case 'getSynonyms':
        const synonymsResult = await AIHelper.getSynonyms(message.word);
        sendResponse(synonymsResult);
        break;

      case 'getWritingSuggestion':
        const suggestionResult = await AIHelper.getWritingSuggestion(
          message.text,
          message.targetWords
        );
        sendResponse(suggestionResult);
        break;

      case 'checkAIAvailability':
        const available = await AIHelper.checkAvailability();
        sendResponse({ success: true, available });
        break;

      case 'exportData':
        const exportData = await StorageManager.exportVocabulary();
        sendResponse({ success: true, data: exportData });
        break;

      case 'importData':
        const importResult = await StorageManager.importVocabulary(message.data);
        sendResponse(importResult);
        break;

      case 'clearAllData':
        const clearResult = await StorageManager.clearAllData();
        sendResponse(clearResult);
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes.situ_vocabulary) {
    const newVocabulary = changes.situ_vocabulary.newValue || [];
    const count = newVocabulary.length;

    // Update badge with word count
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#6B46C1' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});

// Keep service worker alive (optional, for persistent operations)
let keepAliveInterval = null;

function keepAlive() {
  if (keepAliveInterval === null) {
    keepAliveInterval = setInterval(() => {
      chrome.runtime.getPlatformInfo(() => {
        // This keeps the service worker alive
      });
    }, 20000); // Every 20 seconds
  }
}

// Start keep-alive
keepAlive();

console.log('Situ background service worker initialized');
