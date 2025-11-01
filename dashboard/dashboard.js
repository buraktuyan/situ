// Situ - Dashboard JavaScript

// State
let vocabulary = [];
let settings = {};
let stats = {};
let currentEditingWord = null;
let flashcardIndex = 0;
let flashcardWords = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// Vocabulary tab elements
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const difficultyFilter = document.getElementById('difficultyFilter');
const addNewWordBtn = document.getElementById('addNewWordBtn');
const vocabularyList = document.getElementById('vocabularyList');

// Modal elements
const wordModal = document.getElementById('wordModal');
const modalTitle = document.getElementById('modalTitle');
const wordInput = document.getElementById('wordInput');
const definitionInput = document.getElementById('definitionInput');
const examplesInput = document.getElementById('examplesInput');
const synonymsInput = document.getElementById('synonymsInput');
const difficultyInput = document.getElementById('difficultyInput');
const notesInput = document.getElementById('notesInput');
const getDefinitionBtn = document.getElementById('getDefinitionBtn');
const getExampleBtn = document.getElementById('getExampleBtn');
const saveWordBtn = document.getElementById('saveWordBtn');
const cancelWordBtn = document.getElementById('cancelWordBtn');
const modalClose = document.querySelector('.modal-close');

// Practice elements
const startFlashcardsBtn = document.getElementById('startFlashcardsBtn');
const flashcardView = document.getElementById('flashcardView');
const flashcard = document.getElementById('flashcard');
const prevFlashcard = document.getElementById('prevFlashcard');
const nextFlashcard = document.getElementById('nextFlashcard');
const exitFlashcards = document.getElementById('exitFlashcards');

// Settings elements
const settingReadingMode = document.getElementById('settingReadingMode');
const settingWritingMode = document.getElementById('settingWritingMode');
const settingHighlightStyle = document.getElementById('settingHighlightStyle');
const settingDailyGoal = document.getElementById('settingDailyGoal');
const settingDifficulty = document.getElementById('settingDifficulty');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const clearDataBtn = document.getElementById('clearDataBtn');

// Initialize
async function initialize() {
  await loadAllData();
  renderVocabulary();
  renderStats();
  populateSettings();
  setupEventListeners();
}

// Load all data
async function loadAllData() {
  try {
    const [vocabResponse, settingsResponse, statsResponse] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getVocabulary' }),
      chrome.runtime.sendMessage({ action: 'getSettings' }),
      chrome.runtime.sendMessage({ action: 'getStats' })
    ]);

    if (vocabResponse?.success) {
      vocabulary = vocabResponse.vocabulary;
    }

    if (settingsResponse?.success) {
      settings = settingsResponse.settings;
    }

    if (statsResponse?.success) {
      stats = statsResponse.stats;
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  // Vocabulary
  addNewWordBtn.addEventListener('click', () => openWordModal());
  searchInput.addEventListener('input', renderVocabulary);
  sortSelect.addEventListener('change', renderVocabulary);
  difficultyFilter.addEventListener('change', renderVocabulary);

  // Modal
  saveWordBtn.addEventListener('click', saveWord);
  cancelWordBtn.addEventListener('click', closeWordModal);
  modalClose.addEventListener('click', closeWordModal);
  wordModal.addEventListener('click', (e) => {
    if (e.target === wordModal) closeWordModal();
  });
  getDefinitionBtn.addEventListener('click', getAIDefinition);
  getExampleBtn.addEventListener('click', getAIExample);

  // Practice
  startFlashcardsBtn.addEventListener('click', startFlashcards);
  flashcard.addEventListener('click', flipFlashcard);
  prevFlashcard.addEventListener('click', showPrevFlashcard);
  nextFlashcard.addEventListener('click', showNextFlashcard);
  exitFlashcards.addEventListener('click', exitFlashcardsMode);

  // Settings
  settingReadingMode.addEventListener('change', (e) => updateSetting('readingMode', e.target.checked));
  settingWritingMode.addEventListener('change', (e) => updateSetting('writingMode', e.target.checked));
  settingHighlightStyle.addEventListener('change', (e) => updateSetting('highlightStyle', e.target.value));
  settingDailyGoal.addEventListener('change', (e) => updateSetting('dailyGoal', parseInt(e.target.value)));
  settingDifficulty.addEventListener('change', (e) => updateSetting('difficulty', e.target.value));
  exportDataBtn.addEventListener('click', exportData);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', importData);
  clearDataBtn.addEventListener('click', clearAllData);

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      loadAllData().then(() => {
        renderVocabulary();
        renderStats();
      });
    }
  });
}

// Switch tab
function switchTab(tabId) {
  navItems.forEach(item => item.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  const navItem = document.querySelector(`[data-tab="${tabId}"]`);
  const tabContent = document.getElementById(tabId);

  if (navItem && tabContent) {
    navItem.classList.add('active');
    tabContent.classList.add('active');

    if (tabId === 'stats') {
      renderStats();
    }
  }
}

// Render vocabulary
function renderVocabulary() {
  const searchTerm = searchInput.value.toLowerCase();
  const sort = sortSelect.value;
  const difficultyLevel = difficultyFilter.value;

  // Filter vocabulary
  let filtered = vocabulary.filter(word => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm) ||
                         word.definition?.toLowerCase().includes(searchTerm);
    const matchesDifficulty = difficultyLevel === 'all' || word.difficulty === difficultyLevel;
    return matchesSearch && matchesDifficulty;
  });

  // Sort vocabulary
  filtered.sort((a, b) => {
    switch (sort) {
      case 'alphabetical':
        return a.word.localeCompare(b.word);
      case 'mostSeen':
        return (b.seenCount || 0) - (a.seenCount || 0);
      case 'mostUsed':
        return (b.usedCount || 0) - (a.usedCount || 0);
      case 'recent':
      default:
        return b.addedDate - a.addedDate;
    }
  });

  // Render
  if (filtered.length === 0) {
    vocabularyList.innerHTML = `
      <div class="empty-state">
        <p>No words found. ${searchTerm ? 'Try a different search term.' : 'Add your first word!'}</p>
      </div>
    `;
    return;
  }

  vocabularyList.innerHTML = filtered.map(word => `
    <div class="vocabulary-card">
      <div class="difficulty-badge difficulty-${word.difficulty || 'intermediate'}">
        ${word.difficulty || 'intermediate'}
      </div>
      <div class="vocabulary-card-header">
        <div class="word-title">${word.word}</div>
        <div class="word-actions">
          <button class="icon-btn" onclick="editWord('${word.id}')" title="Edit" aria-label="Edit word">✏️</button>
          <button class="icon-btn" onclick="deleteWord('${word.id}')" title="Delete" aria-label="Delete word">🗑️</button>
        </div>
      </div>
      ${word.definition ? `<div class="word-definition">${word.definition}</div>` : ''}
      ${word.examples?.length > 0 ? `
        <div class="word-examples">
          <div class="word-examples-title">Examples:</div>
          <ul>
            ${word.examples.map(ex => `<li>${ex}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div class="word-meta">
        <div class="meta-item">
          <span>👁️</span>
          <span>Seen ${word.seenCount || 0}</span>
        </div>
        <div class="meta-item">
          <span>✍️</span>
          <span>Used ${word.usedCount || 0}</span>
        </div>
        <div class="meta-item">
          <span>📅</span>
          <span>Added ${formatDate(word.addedDate)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

// Open word modal
function openWordModal(wordId = null) {
  currentEditingWord = wordId;

  if (wordId) {
    const word = vocabulary.find(w => w.id === wordId);
    if (word) {
      modalTitle.textContent = 'Edit Word';
      wordInput.value = word.word;
      definitionInput.value = word.definition || '';
      examplesInput.value = word.examples?.join('\n') || '';
      synonymsInput.value = word.synonyms?.join(', ') || '';
      difficultyInput.value = word.difficulty || 'intermediate';
      notesInput.value = word.notes || '';
    }
  } else {
    modalTitle.textContent = 'Add New Word';
    wordInput.value = '';
    definitionInput.value = '';
    examplesInput.value = '';
    synonymsInput.value = '';
    difficultyInput.value = 'intermediate';
    notesInput.value = '';
  }

  wordModal.classList.add('active');
  wordModal.setAttribute('aria-hidden', 'false');
  wordInput.focus();
}

// Close word modal
function closeWordModal() {
  wordModal.classList.remove('active');
  wordModal.setAttribute('aria-hidden', 'true');
  currentEditingWord = null;
}

// Save word
async function saveWord() {
  const word = wordInput.value.trim();

  if (!word) {
    alert('Please enter a word or phrase');
    return;
  }

  const wordData = {
    word,
    definition: definitionInput.value.trim(),
    examples: examplesInput.value.split('\n').filter(ex => ex.trim()).map(ex => ex.trim()),
    synonyms: synonymsInput.value.split(',').filter(s => s.trim()).map(s => s.trim()),
    difficulty: difficultyInput.value,
    notes: notesInput.value.trim()
  };

  saveWordBtn.disabled = true;
  saveWordBtn.textContent = 'Saving...';

  try {
    let response;

    if (currentEditingWord) {
      response = await chrome.runtime.sendMessage({
        action: 'updateWord',
        id: currentEditingWord,
        updates: wordData
      });
    } else {
      response = await chrome.runtime.sendMessage({
        action: 'addWord',
        wordData
      });
    }

    if (response?.success) {
      await loadAllData();
      renderVocabulary();
      closeWordModal();
    } else {
      alert(response?.error || 'Failed to save word');
    }
  } catch (error) {
    console.error('Error saving word:', error);
    alert('Error saving word');
  } finally {
    saveWordBtn.disabled = false;
    saveWordBtn.textContent = 'Save Word';
  }
}

// Edit word (global function for onclick)
window.editWord = function(wordId) {
  openWordModal(wordId);
};

// Delete word (global function for onclick)
window.deleteWord = async function(wordId) {
  const word = vocabulary.find(w => w.id === wordId);
  if (!word) return;

  if (!confirm(`Delete "${word.word}"?`)) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteWord',
      id: wordId
    });

    if (response?.success) {
      await loadAllData();
      renderVocabulary();
    }
  } catch (error) {
    console.error('Error deleting word:', error);
    alert('Error deleting word');
  }
};

// Get AI definition
async function getAIDefinition() {
  const word = wordInput.value.trim();

  if (!word) {
    alert('Please enter a word first');
    return;
  }

  getDefinitionBtn.disabled = true;
  getDefinitionBtn.textContent = 'Getting...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getDefinition',
      word
    });

    if (response?.success) {
      definitionInput.value = response.definition;
    } else {
      alert('AI is not available. Please enable Chrome AI features.');
    }
  } catch (error) {
    console.error('Error getting definition:', error);
    alert('Error getting definition');
  } finally {
    getDefinitionBtn.disabled = false;
    getDefinitionBtn.textContent = 'Get AI Definition';
  }
}

// Get AI example
async function getAIExample() {
  const word = wordInput.value.trim();

  if (!word) {
    alert('Please enter a word first');
    return;
  }

  getExampleBtn.disabled = true;
  getExampleBtn.textContent = 'Getting...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getExample',
      word
    });

    if (response?.success) {
      const currentExamples = examplesInput.value.trim();
      examplesInput.value = currentExamples
        ? `${currentExamples}\n${response.example}`
        : response.example;
    } else {
      alert('AI is not available. Please enable Chrome AI features.');
    }
  } catch (error) {
    console.error('Error getting example:', error);
    alert('Error getting example');
  } finally {
    getExampleBtn.disabled = false;
    getExampleBtn.textContent = 'Get AI Example';
  }
}

// Start flashcards
function startFlashcards() {
  if (vocabulary.length === 0) {
    alert('Add some words to your vocabulary first!');
    return;
  }

  flashcardWords = [...vocabulary].sort(() => Math.random() - 0.5);
  flashcardIndex = 0;

  document.querySelector('.practice-modes').style.display = 'none';
  flashcardView.style.display = 'block';

  showFlashcard();
}

// Show flashcard
function showFlashcard() {
  if (flashcardWords.length === 0) return;

  const word = flashcardWords[flashcardIndex];

  document.getElementById('flashcardWord').textContent = word.word;
  document.getElementById('flashcardDefinition').textContent = word.definition || 'No definition available';

  const examplesHtml = word.examples?.length > 0
    ? `<ul style="margin-top: 12px; text-align: left;">${word.examples.map(ex => `<li>${ex}</li>`).join('')}</ul>`
    : '';
  document.getElementById('flashcardExamples').innerHTML = examplesHtml;

  document.getElementById('flashcardProgress').textContent =
    `${flashcardIndex + 1} / ${flashcardWords.length}`;

  flashcard.classList.remove('flipped');

  prevFlashcard.disabled = flashcardIndex === 0;
  nextFlashcard.disabled = flashcardIndex === flashcardWords.length - 1;
}

// Flip flashcard
function flipFlashcard() {
  flashcard.classList.toggle('flipped');
}

// Show previous flashcard
function showPrevFlashcard() {
  if (flashcardIndex > 0) {
    flashcardIndex--;
    showFlashcard();
  }
}

// Show next flashcard
function showNextFlashcard() {
  if (flashcardIndex < flashcardWords.length - 1) {
    flashcardIndex++;
    showFlashcard();
  }
}

// Exit flashcards
function exitFlashcardsMode() {
  flashcardView.style.display = 'none';
  document.querySelector('.practice-modes').style.display = 'grid';
}

// Render stats
function renderStats() {
  // Total counts
  document.getElementById('totalWordsCount').textContent = vocabulary.length;

  const totalSeen = vocabulary.reduce((sum, word) => sum + (word.seenCount || 0), 0);
  const totalUsed = vocabulary.reduce((sum, word) => sum + (word.usedCount || 0), 0);

  document.getElementById('totalSeenCount').textContent = totalSeen;
  document.getElementById('totalUsedCount').textContent = totalUsed;

  // Daily goal
  const today = new Date().toISOString().split('T')[0];
  const todayStats = stats.dailyStats?.[today] || { seen: 0 };
  const dailyGoal = settings.dailyGoal || 10;
  const progress = Math.min(100, Math.round((todayStats.seen / dailyGoal) * 100));

  document.getElementById('dailyGoalProgress').textContent = `${progress}%`;

  // Weekly chart
  renderWeeklyChart();

  // Top words
  renderTopWords();
}

// Render weekly chart
function renderWeeklyChart() {
  const chartContainer = document.getElementById('weeklyChart');
  const days = 7;
  const chartData = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStats = stats.dailyStats?.[dateStr] || { seen: 0, used: 0 };

    chartData.push({
      date: dateStr,
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      seen: dayStats.seen
    });
  }

  const maxSeen = Math.max(...chartData.map(d => d.seen), 1);

  chartContainer.innerHTML = chartData.map(day => {
    const height = (day.seen / maxSeen) * 100;
    return `
      <div class="chart-bar" style="height: ${height}%;">
        <div class="chart-bar-label">${day.day}</div>
      </div>
    `;
  }).join('');
}

// Render top words
function renderTopWords() {
  const topWords = [...vocabulary]
    .sort((a, b) => (b.seenCount || 0) - (a.seenCount || 0))
    .slice(0, 5);

  const topWordsContainer = document.getElementById('topWordsList');

  if (topWords.length === 0) {
    topWordsContainer.innerHTML = '<div class="empty-state"><p>No words encountered yet</p></div>';
    return;
  }

  topWordsContainer.innerHTML = topWords.map(word => `
    <div class="top-word-item">
      <div class="top-word-name">${word.word}</div>
      <div class="top-word-count">Seen ${word.seenCount || 0} times</div>
    </div>
  `).join('');
}

// Populate settings
function populateSettings() {
  settingReadingMode.checked = settings.readingMode !== false;
  settingWritingMode.checked = settings.writingMode !== false;
  settingHighlightStyle.value = settings.highlightStyle || 'background';
  settingDailyGoal.value = settings.dailyGoal || 10;
  settingDifficulty.value = settings.difficulty || 'intermediate';
}

// Update setting
async function updateSetting(key, value) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { [key]: value }
    });

    if (response?.success) {
      settings = response.settings;
    }
  } catch (error) {
    console.error('Error updating setting:', error);
  }
}

// Export data
async function exportData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportData' });

    if (response?.success) {
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `situ-vocabulary-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data');
  }
}

// Import data
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!confirm('This will replace your current vocabulary. Continue?')) {
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'importData',
      data
    });

    if (response?.success) {
      await loadAllData();
      renderVocabulary();
      renderStats();
      alert('Data imported successfully!');
    } else {
      alert('Error importing data');
    }
  } catch (error) {
    console.error('Error importing data:', error);
    alert('Error importing data. Make sure the file is valid JSON.');
  } finally {
    importFileInput.value = '';
  }
}

// Clear all data
async function clearAllData() {
  if (!confirm('This will delete ALL your vocabulary and settings. This cannot be undone. Are you sure?')) {
    return;
  }

  if (!confirm('Are you REALLY sure? This is your last chance!')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearAllData' });

    if (response?.success) {
      await loadAllData();
      renderVocabulary();
      renderStats();
      populateSettings();
      alert('All data cleared');
    }
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Error clearing data');
  }
}

// Initialize on load
initialize();
