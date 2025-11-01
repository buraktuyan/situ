// Situ - Constants and Configuration
// Learn vocabulary while browsing

export const COLORS = {
  // Primary purple theme
  primary: '#6B46C1',
  primaryLight: '#8B5CF6',
  primaryDark: '#5B21B6',
  primaryFaint: 'rgba(107, 70, 193, 0.1)',

  // Accent colors
  accent: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Neutrals
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Highlight colors for reading mode
  highlight: 'rgba(236, 72, 153, 0.25)',
  highlightBorder: '#EC4899'
};

export const STORAGE_KEYS = {
  VOCABULARY: 'situ_vocabulary',
  SETTINGS: 'situ_settings',
  STATS: 'situ_stats'
};

export const DEFAULT_SETTINGS = {
  readingMode: true,
  writingMode: true,
  highlightColor: COLORS.highlight,
  highlightStyle: 'background', // 'background' | 'underline' | 'both'
  autoSuggest: true,
  suggestionDelay: 1000, // ms
  showDefinitions: true,
  difficulty: 'intermediate', // 'beginner' | 'intermediate' | 'advanced'
  dailyGoal: 10, // words to encounter per day
  notificationsEnabled: true
};

export const DIFFICULTY_LEVELS = {
  beginner: { name: 'Beginner', color: COLORS.success },
  intermediate: { name: 'Intermediate', color: COLORS.warning },
  advanced: { name: 'Advanced', color: COLORS.error }
};

export const CONTEXT_MENU_ID = 'situ-add-word';

export const AI_PROMPTS = {
  getDefinition: (word) =>
    `Provide a clear, concise definition of the word "${word}" suitable for an ESL student. Keep it under 50 words.`,

  getExample: (word) =>
    `Generate a natural, practical example sentence using the word "${word}" that an ESL student would find helpful. Make it relevant to everyday situations.`,

  getSynonyms: (word) =>
    `List 3-5 common synonyms for "${word}" that an intermediate ESL student should know.`,

  getContextualSuggestion: (text, targetWords) =>
    `Given this text: "${text}"\n\nSuggest how to naturally incorporate one of these vocabulary words: ${targetWords.join(', ')}. Provide the complete rewritten sentence.`
};

export const MAX_VOCABULARY_SIZE = 1000;
export const RECENT_WORDS_LIMIT = 5;
export const STATS_TRACKING_DAYS = 30;
