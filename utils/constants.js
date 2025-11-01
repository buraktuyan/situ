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
    `Provide a clear, concise definition of "${word}" in one sentence. Keep it simple and under 30 words.`,

  getExample: (word) =>
    `Generate ONE natural, practical example sentence using "${word}". Make it relevant to everyday situations. Return ONLY the sentence, nothing else.`,

  getMultipleExamples: (word, count = 3, proficiency = 'intermediate') =>
    `Generate exactly ${count} natural, practical example sentences using "${word}". Make them appropriate for ${proficiency} level learners and relevant to everyday situations. Return ONLY the sentences, one per line, without numbering or explanations.`,

  getSynonyms: (word) =>
    `List 3-5 common synonyms for "${word}". Return as comma-separated values only.`,

  getDifficulty: (word) =>
    `Evaluate the difficulty level of the word/phrase "${word}" for English language learners. Respond with ONLY one word: "beginner", "intermediate", or "advanced". Consider: word frequency, complexity, and common usage.`,

  getContextualSuggestion: (text, targetWords) =>
    `Given this text: "${text}"\n\nSuggest how to naturally incorporate one of these vocabulary words: ${targetWords.join(', ')}. Provide the complete rewritten sentence.`
};

export const MAX_VOCABULARY_SIZE = 1000;
export const RECENT_WORDS_LIMIT = 5;
export const STATS_TRACKING_DAYS = 30;
