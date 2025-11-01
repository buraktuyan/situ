let session = null;
let isProcessing = false;
let abortController = null;

const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const stopBtn = document.getElementById('stopBtn');
const responseDiv = document.getElementById('response');
const statusDiv = document.getElementById('status');

// Check API availability on load
async function checkAvailability() {
  try {
    // Check if the global LanguageModel API is available
    if (typeof LanguageModel === "undefined") {
      showStatus('Global LanguageModel API is not available. Please enable Chrome AI flags.', 'error');
      submitBtn.disabled = true;
      return false;
    }

    // Check model availability using the new API
    const availability = await LanguageModel.availability();

    if (availability === 'available') {
      showStatus('Chrome AI is ready!', 'success');
      submitBtn.disabled = false;
      return true;
    } else if (availability === 'downloading') {
      showStatus('Chrome AI model is downloading... Please wait and try again later', 'warning');
      submitBtn.disabled = true;
      return false;
    } else {
      showStatus(`Model is not ready. Status: '${availability}'. Check chrome://on-device-internals`, 'error');
      submitBtn.disabled = true;
      return false;
    }
  } catch (error) {
    showStatus(`Error checking availability: ${error.message}`, 'error');
    submitBtn.disabled = true;
    return false;
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

// Handle prompt submission (non-streaming)
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
  stopBtn.disabled = false;
  responseDiv.textContent = '';
  showStatus('Thinking...', 'info');

  // Create abort controller for this request
  abortController = new AbortController();

  try {
    // Create a new session
    if (!session) {
      session = await LanguageModel.create({
        expectedOutputs: [
          { type: "text", languages: ["en"] }
        ]
      });
      showStatus('Session created. Sending prompt...', 'info');
    }

    // Send the prompt to the model with abort signal
    const response = await session.prompt(prompt, {
      signal: abortController.signal
    });

    // Display the response
    responseDiv.textContent = response;
    showStatus('Response generated!', 'success');
  } catch (error) {
    if (error.name === 'AbortError') {
      showStatus('Prompt was stopped by user', 'warning');
      responseDiv.textContent += '\n\n[Stopped by user]';
    } else {
      showStatus(`Error: ${error.message}`, 'error');
      responseDiv.textContent = `Error: ${error.message}\n\nPlease make sure you're using Chrome 128+ and have enabled the Prompt API feature flags.`;
    }
  } finally {
    // Clean up the session
    if (session) {
      await session.destroy();
      session = null;
      console.log('Session destroyed.');
    }
    isProcessing = false;
    submitBtn.disabled = false;
    stopBtn.disabled = true;
    abortController = null;
  }
}

// Handle streaming prompt submission
async function handleStreamingSubmit() {
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
  stopBtn.disabled = false;
  responseDiv.textContent = '';
  showStatus('Streaming response...', 'info');

  // Create abort controller for this request
  abortController = new AbortController();

  try {
    // Create a new session
    if (!session) {
      session = await LanguageModel.create({
        expectedOutputs: [
          { type: "text", languages: ["en"] }
        ]
      });
      showStatus('Session created. Streaming prompt...', 'info');
    }

    // Stream the prompt response with abort signal
    const stream = session.promptStreaming(prompt, {
      signal: abortController.signal
    });

    // Process the stream chunks
    for await (const chunk of stream) {
      responseDiv.textContent += chunk;
      // Auto-scroll to bottom as new content arrives
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    showStatus('Streaming complete!', 'success');
  } catch (error) {
    if (error.name === 'AbortError') {
      showStatus('Streaming was stopped by user', 'warning');
      responseDiv.textContent += '\n\n[Stopped by user]';
    } else {
      showStatus(`Error: ${error.message}`, 'error');
      // Preserve any partial streaming results
      if (responseDiv.textContent) {
        responseDiv.textContent += `\n\n[Error: ${error.message}]`;
      } else {
        responseDiv.textContent = `Error: ${error.message}\n\nPlease make sure you're using Chrome 128+ and have enabled the Prompt API feature flags.`;
      }
    }
  } finally {
    // Clean up the session
    if (session) {
      await session.destroy();
      session = null;
      console.log('Session destroyed.');
    }
    isProcessing = false;
    submitBtn.disabled = false;
    stopBtn.disabled = true;
    abortController = null;
  }
}

// Handle stop button click
function handleStop() {
  if (abortController) {
    abortController.abort();
    showStatus('Stopping...', 'info');
  }
}

// Event listeners
submitBtn.addEventListener('click', handleStreamingSubmit);
stopBtn.addEventListener('click', handleStop);

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
    handleStreamingSubmit();
  }
});

// Initialize
checkAvailability();
