let session = null;
let isProcessing = false;

const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const responseDiv = document.getElementById('response');
const statusDiv = document.getElementById('status');

// Check API availability on load
async function checkAvailability() {
  try {
    if (!window.ai || !window.ai.languageModel) {
      showStatus('Chrome AI is not available in this browser', 'error');
      submitBtn.disabled = true;
      return false;
    }

    const availability = await window.ai.languageModel.availability();

    if (availability === 'no') {
      showStatus('Chrome AI is not available on this device', 'error');
      submitBtn.disabled = true;
      return false;
    }

    if (availability === 'after-download') {
      showStatus('Chrome AI model is downloading... Please wait and try again later', 'warning');
      submitBtn.disabled = true;
      return false;
    }

    if (availability === 'readily') {
      showStatus('Chrome AI is ready!', 'success');
      return true;
    }

    return false;
  } catch (error) {
    showStatus(`Error checking availability: ${error.message}`, 'error');
    submitBtn.disabled = true;
    return false;
  }
}

// Create AI session
async function createSession() {
  try {
    if (!session) {
      session = await window.ai.languageModel.create();
    }
    return session;
  } catch (error) {
    showStatus(`Error creating session: ${error.message}`, 'error');
    throw error;
  }
}

// Show status messages
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
}

// Handle prompt submission
async function handleSubmit() {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    showStatus('Please enter a prompt', 'warning');
    return;
  }

  if (isProcessing) {
    showStatus('Already processing a request...', 'warning');
    return;
  }

  isProcessing = true;
  submitBtn.disabled = true;
  responseDiv.textContent = '';
  showStatus('Processing...', 'info');

  try {
    // Create session if not exists
    const aiSession = await createSession();

    // Stream the response
    const stream = await aiSession.promptStreaming(prompt);

    let fullResponse = '';

    for await (const chunk of stream) {
      fullResponse = chunk;
      responseDiv.textContent = fullResponse;
      // Auto-scroll to bottom
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    showStatus('Response complete!', 'success');
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    responseDiv.textContent = `Error: ${error.message}\n\nPlease make sure you're using Chrome 128+ and have enabled the Prompt API feature flags.`;
  } finally {
    isProcessing = false;
    submitBtn.disabled = false;
  }
}

// Event listeners
submitBtn.addEventListener('click', handleSubmit);

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    handleSubmit();
  }
});

// Initialize
checkAvailability();
