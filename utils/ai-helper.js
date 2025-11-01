// Situ - AI Helper
// Interface with Chrome's on-device LanguageModel API

import { AI_PROMPTS } from './constants.js';

export class AIHelper {
  static session = null;
  static isAvailable = false;

  /**
   * Check if Chrome's AI is available
   */
  static async checkAvailability() {
    try {
      if (typeof LanguageModel === 'undefined') {
        console.warn('LanguageModel API not available');
        this.isAvailable = false;
        return false;
      }

      const availability = await LanguageModel.availability();

      if (availability === 'available') {
        this.isAvailable = true;
        return true;
      } else if (availability === 'downloading') {
        console.log('AI model is downloading...');
        this.isAvailable = false;
        return false;
      } else {
        console.warn('AI model not ready:', availability);
        this.isAvailable = false;
        return false;
      }
    } catch (error) {
      console.error('Error checking AI availability:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Create or reuse AI session
   */
  static async getSession() {
    if (this.session) {
      return this.session;
    }

    try {
      this.session = await LanguageModel.create({
        expectedOutputs: [
          { type: 'text', languages: ['en'] }
        ]
      });
      return this.session;
    } catch (error) {
      console.error('Error creating AI session:', error);
      return null;
    }
  }

  /**
   * Destroy current session
   */
  static async destroySession() {
    if (this.session) {
      try {
        await this.session.destroy();
        this.session = null;
      } catch (error) {
        console.error('Error destroying session:', error);
      }
    }
  }

  /**
   * Send a prompt to the AI
   */
  static async prompt(text, options = {}) {
    try {
      const session = await this.getSession();
      if (!session) {
        throw new Error('AI session not available');
      }

      const response = await session.prompt(text, options);
      return { success: true, response };
    } catch (error) {
      console.error('Error sending prompt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get definition for a word
   */
  static async getDefinition(word) {
    try {
      const prompt = AI_PROMPTS.getDefinition(word);
      const result = await this.prompt(prompt);

      if (result.success) {
        return { success: true, definition: result.response.trim() };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error getting definition:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get example sentence for a word
   */
  static async getExample(word) {
    try {
      const prompt = AI_PROMPTS.getExample(word);
      const result = await this.prompt(prompt);

      if (result.success) {
        return { success: true, example: result.response.trim() };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error getting example:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get synonyms for a word
   */
  static async getSynonyms(word) {
    try {
      const prompt = AI_PROMPTS.getSynonyms(word);
      const result = await this.prompt(prompt);

      if (result.success) {
        // Parse the response to extract synonyms
        const synonyms = result.response
          .split(/[,\n]/)
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.length < 30);

        return { success: true, synonyms };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error getting synonyms:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get writing suggestion
   */
  static async getWritingSuggestion(text, targetWords) {
    try {
      if (!targetWords || targetWords.length === 0) {
        return { success: false, error: 'No target words provided' };
      }

      const prompt = AI_PROMPTS.getContextualSuggestion(text, targetWords);
      const result = await this.prompt(prompt);

      if (result.success) {
        return { success: true, suggestion: result.response.trim() };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error getting writing suggestion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get multiple example sentences for a word
   */
  static async getMultipleExamples(word, count = 3, proficiency = 'intermediate') {
    try {
      const prompt = AI_PROMPTS.getMultipleExamples(word, count, proficiency);
      const result = await this.prompt(prompt);

      if (result.success) {
        // Parse the response to extract examples
        const examples = result.response
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .slice(0, count); // Ensure we only get the requested count

        return { success: true, examples };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error getting multiple examples:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Evaluate word difficulty
   */
  static async getDifficulty(word) {
    try {
      const prompt = AI_PROMPTS.getDifficulty(word);
      const result = await this.prompt(prompt);

      if (result.success) {
        const difficulty = result.response.trim().toLowerCase();
        // Validate the response
        if (['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
          return { success: true, difficulty };
        }
        // Default to intermediate if invalid response
        return { success: true, difficulty: 'intermediate' };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error getting difficulty:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enrich word data with AI
   * Gets definition, examples, synonyms, and difficulty in one go
   */
  static async enrichWord(word, proficiency = 'intermediate', sourceSentence = null) {
    try {
      const [defResult, examplesResult, synonymsResult, difficultyResult] = await Promise.all([
        this.getDefinition(word),
        this.getMultipleExamples(word, 3, proficiency),
        this.getSynonyms(word),
        this.getDifficulty(word)
      ]);

      let examples = examplesResult.success ? examplesResult.examples : [];

      // If there's a source sentence, use it as the first example
      if (sourceSentence && sourceSentence.trim()) {
        examples = [sourceSentence, ...examples].slice(0, 3);
      }

      return {
        definition: defResult.success ? defResult.definition : '',
        examples: examples,
        synonyms: synonymsResult.success ? synonymsResult.synonyms : [],
        difficulty: difficultyResult.success ? difficultyResult.difficulty : 'intermediate'
      };
    } catch (error) {
      console.error('Error enriching word:', error);
      return {
        definition: '',
        examples: [],
        synonyms: [],
        difficulty: 'intermediate'
      };
    }
  }

  /**
   * Evaluate a writing challenge sentence
   */
  static async evaluateWritingChallenge(word, sentence) {
    try {
      const prompt = AI_PROMPTS.evaluateWritingChallenge(word, sentence);
      const result = await this.prompt(prompt);

      if (result.success) {
        return { success: true, feedback: result.response.trim() };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error evaluating writing challenge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stream a prompt (for real-time responses)
   */
  static async *promptStreaming(text, options = {}) {
    try {
      const session = await this.getSession();
      if (!session) {
        throw new Error('AI session not available');
      }

      const stream = session.promptStreaming(text, options);

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      console.error('Error streaming prompt:', error);
      throw error;
    }
  }
}
