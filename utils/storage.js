// Situ - Storage Management
// Handles all chrome.storage.sync operations

import { STORAGE_KEYS, DEFAULT_SETTINGS, MAX_VOCABULARY_SIZE } from './constants.js';

/**
 * Vocabulary Item Structure:
 * {
 *   id: string (timestamp-based unique ID),
 *   word: string (the word or phrase),
 *   definition: string,
 *   examples: string[],
 *   synonyms: string[],
 *   addedDate: number (timestamp),
 *   lastSeen: number (timestamp),
 *   seenCount: number,
 *   usedCount: number (times used in writing),
 *   difficulty: 'beginner' | 'intermediate' | 'advanced',
 *   notes: string,
 *   tags: string[],
 *   sourceUrl: string (URL where word was found, if added via context menu),
 *   sourceSentence: string (original sentence where word was found),
 *   recentlySeen: Array<{sentence: string, url: string, timestamp: number}> (last 3 occurrences from different pages)
 * }
 */

export class StorageManager {
  /**
   * Get all vocabulary items
   */
  static async getVocabulary() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.VOCABULARY);
      return result[STORAGE_KEYS.VOCABULARY] || [];
    } catch (error) {
      console.error('Error getting vocabulary:', error);
      return [];
    }
  }

  /**
   * Add a new word to vocabulary
   */
  static async addWord(wordData) {
    try {
      const vocabulary = await this.getVocabulary();

      // Check if word already exists
      const existing = vocabulary.find(
        item => item.word.toLowerCase() === wordData.word.toLowerCase()
      );

      if (existing) {
        return { success: false, error: 'Word already exists', existing };
      }

      // Check vocabulary size limit
      if (vocabulary.length >= MAX_VOCABULARY_SIZE) {
        return { success: false, error: 'Vocabulary limit reached' };
      }

      const newWord = {
        id: `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        word: wordData.word.trim(),
        definition: wordData.definition || '',
        examples: wordData.examples || [],
        synonyms: wordData.synonyms || [],
        addedDate: Date.now(),
        lastSeen: Date.now(),
        seenCount: 0,
        usedCount: 0,
        difficulty: wordData.difficulty || 'intermediate',
        notes: wordData.notes || '',
        tags: wordData.tags || [],
        sourceUrl: wordData.sourceUrl || '',
        sourceSentence: wordData.sourceSentence || '',
        recentlySeen: []
      };

      vocabulary.push(newWord);
      await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: vocabulary });

      // Update stats
      await this.updateStats('wordsAdded', 1);

      return { success: true, word: newWord };
    } catch (error) {
      console.error('Error adding word:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing word
   */
  static async updateWord(id, updates) {
    try {
      const vocabulary = await this.getVocabulary();
      const index = vocabulary.findIndex(item => item.id === id);

      if (index === -1) {
        return { success: false, error: 'Word not found' };
      }

      vocabulary[index] = { ...vocabulary[index], ...updates };
      await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: vocabulary });

      return { success: true, word: vocabulary[index] };
    } catch (error) {
      console.error('Error updating word:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a word
   */
  static async deleteWord(id) {
    try {
      const vocabulary = await this.getVocabulary();
      const filtered = vocabulary.filter(item => item.id !== id);

      await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: filtered });
      return { success: true };
    } catch (error) {
      console.error('Error deleting word:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Increment seen count for a word
   */
  static async incrementSeenCount(word) {
    try {
      const vocabulary = await this.getVocabulary();
      const item = vocabulary.find(
        v => v.word.toLowerCase() === word.toLowerCase()
      );

      if (item) {
        item.seenCount++;
        item.lastSeen = Date.now();
        await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: vocabulary });
        await this.updateStats('wordsSeen', 1);
      }
    } catch (error) {
      console.error('Error incrementing seen count:', error);
    }
  }

  /**
   * Increment seen count for a word (vocabulary only, no stats update)
   * Used to avoid quota issues by batching stats separately
   */
  static async incrementSeenCountOnly(word) {
    try {
      const vocabulary = await this.getVocabulary();
      const item = vocabulary.find(
        v => v.word.toLowerCase() === word.toLowerCase()
      );

      if (item) {
        item.seenCount++;
        item.lastSeen = Date.now();
        await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: vocabulary });
      }
    } catch (error) {
      console.error('Error incrementing seen count:', error);
    }
  }

  /**
   * Batch update stats (used to avoid quota issues)
   */
  static async batchUpdateStats(updates) {
    try {
      const stats = await this.getStats();
      const today = new Date().toISOString().split('T')[0];

      if (!stats.dailyStats[today]) {
        stats.dailyStats[today] = { seen: 0, used: 0, added: 0 };
      }

      // Apply batched updates
      if (updates.wordsSeen) {
        stats.wordsSeen = (stats.wordsSeen || 0) + updates.wordsSeen;
        stats.dailyStats[today].seen += updates.wordsSeen;
      }

      if (updates.wordsUsed) {
        stats.wordsUsed = (stats.wordsUsed || 0) + updates.wordsUsed;
        stats.dailyStats[today].used += updates.wordsUsed;
      }

      if (updates.wordsAdded) {
        stats.wordsAdded = (stats.wordsAdded || 0) + updates.wordsAdded;
        stats.dailyStats[today].added += updates.wordsAdded;
      }

      await chrome.storage.sync.set({ [STORAGE_KEYS.STATS]: stats });
    } catch (error) {
      console.error('Error batch updating stats:', error);
    }
  }

  /**
   * Increment used count for a word
   */
  static async incrementUsedCount(word) {
    try {
      const vocabulary = await this.getVocabulary();
      const item = vocabulary.find(
        v => v.word.toLowerCase() === word.toLowerCase()
      );

      if (item) {
        item.usedCount++;
        await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: vocabulary });
        await this.updateStats('wordsUsed', 1);
      }
    } catch (error) {
      console.error('Error incrementing used count:', error);
    }
  }

  /**
   * Add a recently seen entry for a word
   */
  static async addRecentlySeen(word, sentence, url) {
    try {
      const vocabulary = await this.getVocabulary();
      const item = vocabulary.find(
        v => v.word.toLowerCase() === word.toLowerCase()
      );

      if (item) {
        // Initialize recentlySeen array if it doesn't exist
        if (!item.recentlySeen) {
          item.recentlySeen = [];
        }

        // Check if this URL is already in the recently seen list
        const existingIndex = item.recentlySeen.findIndex(entry => entry.url === url);

        // If same webpage, update existing entry instead of adding new one
        if (existingIndex !== -1) {
          item.recentlySeen[existingIndex] = {
            sentence,
            url,
            timestamp: Date.now()
          };
        } else {
          // Add new entry
          item.recentlySeen.unshift({
            sentence,
            url,
            timestamp: Date.now()
          });

          // Keep only last 3 entries from different pages
          if (item.recentlySeen.length > 3) {
            item.recentlySeen = item.recentlySeen.slice(0, 3);
          }
        }

        await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: vocabulary });
      }
    } catch (error) {
      console.error('Error adding recently seen:', error);
    }
  }

  /**
   * Get settings
   */
  static async getSettings() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update settings
   */
  static async updateSettings(updates) {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...updates };
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: newSettings });
      return { success: true, settings: newSettings };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get stats
   */
  static async getStats() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.STATS);
      return result[STORAGE_KEYS.STATS] || {
        wordsAdded: 0,
        wordsSeen: 0,
        wordsUsed: 0,
        dailyStats: {} // { 'YYYY-MM-DD': { seen: 0, used: 0, added: 0 } }
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { wordsAdded: 0, wordsSeen: 0, wordsUsed: 0, dailyStats: {} };
    }
  }

  /**
   * Update stats
   */
  static async updateStats(key, increment = 1) {
    try {
      const stats = await this.getStats();
      stats[key] = (stats[key] || 0) + increment;

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      if (!stats.dailyStats[today]) {
        stats.dailyStats[today] = { seen: 0, used: 0, added: 0 };
      }

      const dailyKey = key === 'wordsAdded' ? 'added' :
                       key === 'wordsSeen' ? 'seen' : 'used';
      stats.dailyStats[today][dailyKey] += increment;

      await chrome.storage.sync.set({ [STORAGE_KEYS.STATS]: stats });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  /**
   * Search vocabulary
   */
  static async searchVocabulary(query) {
    try {
      const vocabulary = await this.getVocabulary();
      const lowerQuery = query.toLowerCase();

      return vocabulary.filter(item =>
        item.word.toLowerCase().includes(lowerQuery) ||
        item.definition.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      console.error('Error searching vocabulary:', error);
      return [];
    }
  }

  /**
   * Export vocabulary as JSON
   */
  static async exportVocabulary() {
    try {
      const vocabulary = await this.getVocabulary();
      const settings = await this.getSettings();
      const stats = await this.getStats();

      return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        vocabulary,
        settings,
        stats
      };
    } catch (error) {
      console.error('Error exporting vocabulary:', error);
      return null;
    }
  }

  /**
   * Import vocabulary from JSON
   */
  static async importVocabulary(data) {
    try {
      if (data.vocabulary) {
        await chrome.storage.sync.set({ [STORAGE_KEYS.VOCABULARY]: data.vocabulary });
      }
      if (data.settings) {
        await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: data.settings });
      }
      if (data.stats) {
        await chrome.storage.sync.set({ [STORAGE_KEYS.STATS]: data.stats });
      }
      return { success: true };
    } catch (error) {
      console.error('Error importing vocabulary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all data (with confirmation)
   */
  static async clearAllData() {
    try {
      await chrome.storage.sync.remove([
        STORAGE_KEYS.VOCABULARY,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.STATS
      ]);
      return { success: true };
    } catch (error) {
      console.error('Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }
}
