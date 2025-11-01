// Situ - Popup JavaScript

// DOM elements
const totalWordsEl = document.getElementById('totalWords');
const seenTodayEl = document.getElementById('seenToday');
const usedTodayEl = document.getElementById('usedToday');
const readingModeToggle = document.getElementById('readingModeToggle');
const writingModeToggle = document.getElementById('writingModeToggle');
const newWordInput = document.getElementById('newWordInput');
const addWordBtn = document.getElementById('addWordBtn');
const addWordStatus = document.getElementById('addWordStatus');
const recentWordsList = document.getElementById('recentWordsList');
const viewAllBtn = document.getElementById('viewAllBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const aiStatus = document.getElementById('aiStatus');

// State
let vocabulary = [];
let settings = {};
let stats = {};

// Initialize
async function initialize() {
  try {
    // Load data
    await Promise.all([
      loadVocabulary(),
      loadSettings(),
      loadStats(),
      checkAIStatus()
    ]);

    // Render UI
    updateStats();
    updateToggles();
    renderRecentWords();
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

// Load vocabulary
async function loadVocabulary() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getVocabulary' });
    if (response?.success) {
      vocabulary = response.vocabulary;
    }
  } catch (error) {
    console.error('Error loading vocabulary:', error);
  }
}

// Load settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response?.success) {
      settings = response.settings;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Load stats
async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    if (response?.success) {
      stats = response.stats;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Check AI status
async function checkAIStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });

    if (response?.success && response.available) {
      aiStatus.querySelector('.ai-indicator').classList.add('available');
      aiStatus.querySelector('.ai-text').textContent = 'AI features available';
    } else {
      aiStatus.querySelector('.ai-indicator').classList.add('unavailable');
      aiStatus.querySelector('.ai-text').textContent = 'AI features unavailable';
    }
  } catch (error) {
    console.error('Error checking AI status:', error);
    aiStatus.querySelector('.ai-indicator').classList.add('unavailable');
    aiStatus.querySelector('.ai-text').textContent = 'AI features unavailable';
  }
}

// Update stats display
function updateStats() {
  totalWordsEl.textContent = vocabulary.length;

  const today = new Date().toISOString().split('T')[0];
  const todayStats = stats.dailyStats?.[today] || { seen: 0, used: 0 };

  seenTodayEl.textContent = todayStats.seen || 0;
  usedTodayEl.textContent = todayStats.used || 0;
}

// Update toggles
function updateToggles() {
  readingModeToggle.checked = settings.readingMode !== false;
  writingModeToggle.checked = settings.writingMode !== false;
}

// Render recent words
function renderRecentWords() {
  if (vocabulary.length === 0) {
    recentWordsList.innerHTML = `
      <div class="empty-state">
        <p>No words yet. Add your first word above or select text on any page and right-click!</p>
      </div>
    `;
    return;
  }

  // Sort by most recently added and take first 3
  const recentWords = [...vocabulary]
    .sort((a, b) => b.addedDate - a.addedDate)
    .slice(0, 3);

  recentWordsList.innerHTML = recentWords.map(word => `
    <div class="situ-word-item" data-word-id="${word.id}">
      <div class="situ-word-item-header">
        <div class="situ-word-text">${word.word}</div>
        <div class="situ-word-stats">
          <span title="Times seen">👁️ ${word.seenCount || 0}</span>
          <span title="Times used">✍️ ${word.usedCount || 0}</span>
        </div>
      </div>
      ${word.definition ? `<div class="situ-word-definition">${truncate(word.definition, 80)}</div>` : ''}
    </div>
  `).join('');

  // Add click listeners
  document.querySelectorAll('.situ-word-item').forEach(item => {
    item.addEventListener('click', () => {
      const wordId = item.getAttribute('data-word-id');
      openDashboardWithWord(wordId);
    });
  });
}

// Truncate text
function truncate(text, length) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Add word
async function addWord() {
  const word = newWordInput.value.trim();

  if (!word) {
    showStatus('Please enter a word or phrase', 'warning');
    return;
  }

  // Disable button
  addWordBtn.disabled = true;
  showStatus('Adding word...', 'info', true);

  try {
    // Check if AI is available for enrichment
    const aiResponse = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });
    const aiAvailable = aiResponse?.success && aiResponse.available;

    let wordData = { word };

    // Enrich with AI if available
    if (aiAvailable) {
      showStatus('Generating definition and examples...', 'info', true);
      const enrichResponse = await chrome.runtime.sendMessage({
        action: 'enrichWord',
        word: word
      });

      if (enrichResponse?.success) {
        wordData = { ...wordData, ...enrichResponse.data };
      }
    }

    // Add to vocabulary
    const response = await chrome.runtime.sendMessage({
      action: 'addWord',
      wordData: wordData
    });

    if (response?.success) {
      showStatus(`"${word}" added successfully!`, 'success');
      newWordInput.value = '';

      // Reload data
      await loadVocabulary();
      await loadStats();
      updateStats();
      renderRecentWords();

      // Clear status after delay
      setTimeout(() => hideStatus(), 2000);
    } else {
      if (response?.error === 'Word already exists') {
        showStatus(`"${word}" is already in your vocabulary`, 'warning');
      } else {
        showStatus(response?.error || 'Failed to add word', 'error');
      }
    }
  } catch (error) {
    console.error('Error adding word:', error);
    showStatus('Error adding word', 'error');
  } finally {
    addWordBtn.disabled = false;
  }
}

// Show status message
function showStatus(message, type = 'info', showSpinner = false) {
  addWordStatus.className = `status-message ${type}`;

  if (showSpinner && type === 'info') {
    addWordStatus.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
  } else {
    addWordStatus.textContent = message;
  }
}

// Hide status message
function hideStatus() {
  addWordStatus.className = 'status-message';
}

// Update settings
async function updateSettings(key, value) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { [key]: value }
    });

    if (response?.success) {
      settings = response.settings;

      // Notify content scripts
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingsUpdated',
          settings: settings
        }).catch(() => {
          // Ignore if content script not loaded
        });
      }
    }
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

// Open dashboard
function openDashboard() {
  chrome.runtime.openOptionsPage();
}

// Open dashboard with specific word
function openDashboardWithWord(wordId) {
  chrome.runtime.openOptionsPage(() => {
    // Note: We can't directly pass parameters to options page
    // But the dashboard can read from URL hash
    chrome.storage.local.set({ selectedWordId: wordId });
  });
  window.close();
}

// Event listeners
addWordBtn.addEventListener('click', addWord);

newWordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addWord();
  }
});

readingModeToggle.addEventListener('change', (e) => {
  updateSettings('readingMode', e.target.checked);
});

writingModeToggle.addEventListener('change', (e) => {
  updateSettings('writingMode', e.target.checked);
});

viewAllBtn.addEventListener('click', openDashboard);
dashboardBtn.addEventListener('click', openDashboard);

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    // Reload and update
    initialize();
  }
});

// Initialize on load
initialize();
