/**
 * PRAGMA / OIOS Discovery Chat Client Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const companyId = urlParams.get('id');

  if (!companyId) {
    alert('Invalid Session: Missing Lead ID. Redirecting to home.');
    window.location.href = '/';
    return;
  }

  // DOM Elements
  const progressBar = document.getElementById('progress-bar');
  const chatClientTitle = document.getElementById('chat-client-title');
  const chatStageDisplay = document.getElementById('chat-stage-display');
  const messageFeed = document.getElementById('message-feed');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const btnSkip = document.getElementById('btn-skip');
  const btnExitChat = document.getElementById('btn-exit-chat');
  
  // Resume Banner Elements
  const resumeBanner = document.getElementById('resume-banner');
  const btnResumeYes = document.getElementById('btn-resume-yes');
  const btnResumeNo = document.getElementById('btn-resume-no');

  // Exit Modal Elements
  const exitModal = document.getElementById('exit-modal');
  const modalExitCancel = document.getElementById('modal-exit-cancel');
  const modalExitConfirm = document.getElementById('modal-exit-confirm');

  // Chat State
  let sessionState = {
    companyName: 'Discovery Partner',
    currentStage: 'business',
    currentQuestionIndex: 0,
    messageHistory: []
  };

  // Enable/Disable Send button based on text input
  chatInput.addEventListener('input', () => {
    btnSend.disabled = chatInput.value.trim().length === 0;
  });

  // Handle Enter to Send
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.value.trim().length > 0 && !btnSend.disabled) {
        sendMessage();
      }
    }
  });

  // Modal event listeners
  btnExitChat.addEventListener('click', () => {
    exitModal.style.display = 'flex';
  });

  modalExitCancel.addEventListener('click', () => {
    exitModal.style.display = 'none';
  });

  modalExitConfirm.addEventListener('click', () => {
    window.location.href = '/';
  });

  // API Call: Initialize or Resume Chat Session
  async function initSession(resume = null) {
    try {
      const res = await fetch('/api/public/discovery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, resume })
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 409 && resume === null) {
          // Unresolved draft session exists, show resume banner
          resumeBanner.style.display = 'flex';
          return;
        }
        alert(errData.error || 'Failed to initialize discovery session.');
        window.location.href = '/';
        return;
      }

      const data = await res.json();
      sessionState = data;
      resumeBanner.style.display = 'none';
      
      // Update company name
      chatClientTitle.textContent = data.companyName || 'Discovery Partner';
      
      // Update UI & feed
      renderMessageHistory();
      updateProgressUI();
      
      chatInput.focus();
    } catch (err) {
      console.error('Failed to init session:', err);
      alert('Connection error. Please try again.');
    }
  }

  // Bind Resume buttons
  if (btnResumeYes && btnResumeNo) {
    btnResumeYes.addEventListener('click', () => initSession(true));
    btnResumeNo.addEventListener('click', () => initSession(false));
  }

  // Render chat feed from history
  function renderMessageHistory() {
    messageFeed.innerHTML = '';
    const history = sessionState.messageHistory || [];
    
    history.forEach(msg => {
      appendMessageBubble(msg.sender, msg.text, msg.timestamp);
    });

    scrollToBottom();
  }

  // Append a message bubble to UI
  function appendMessageBubble(sender, text, timestamp) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Convert newlines to breaks
    const formattedText = text.replace(/\n/g, '<br>');

    msgDiv.innerHTML = `
      <div class="msg-bubble">${formattedText}</div>
      <div class="msg-meta">${sender === 'bot' ? 'PRAGMA AI' : 'You'} &bull; ${timeStr}</div>
    `;

    messageFeed.appendChild(msgDiv);
  }

  function scrollToBottom() {
    messageFeed.scrollTop = messageFeed.scrollHeight;
  }

  // Update progress bar
  function updateProgressUI() {
    const stage = sessionState.currentStage || 'business';
    chatStageDisplay.textContent = `STAGE: ${stage.toUpperCase()}`;

    const stages = ['business', 'process', 'systems', 'people', 'data'];
    const activeIdx = stages.indexOf(stage);

    document.querySelectorAll('.steps-progress .step').forEach(stepEl => {
      const stepStage = stepEl.getAttribute('data-stage');
      const stepIdx = stages.indexOf(stepStage);
      
      stepEl.classList.remove('active', 'completed');
      
      if (stepIdx === activeIdx) {
        stepEl.classList.add('active');
      } else if (stepIdx < activeIdx) {
        stepEl.classList.add('completed');
      }
    });

    // Handle completed session
    if (sessionState.status === 'completed') {
      document.querySelectorAll('.steps-progress .step').forEach(s => s.classList.add('completed'));
      chatInput.disabled = true;
      chatInput.placeholder = 'Discovery session completed.';
      btnSend.disabled = true;
      btnSkip.disabled = true;
    }
  }

  // API Call: Send User Message
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Clear input
    chatInput.value = '';
    btnSend.disabled = true;

    // Append user message locally
    appendMessageBubble('user', text);
    scrollToBottom();

    // Disable input while bot is thinking
    chatInput.disabled = true;
    btnSkip.disabled = true;

    try {
      const res = await fetch('/api/public/discovery/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, message: text })
      });

      if (!res.ok) {
        throw new Error('API Error');
      }

      const data = await res.json();
      sessionState = data;

      // Append bot response
      appendMessageBubble('bot', data.reply);
      updateProgressUI();

      // Check if complete
      if (data.status === 'completed') {
        completeSession();
      } else {
        chatInput.disabled = false;
        btnSkip.disabled = false;
        chatInput.focus();
      }
    } catch (err) {
      console.error(err);
      appendMessageBubble('bot', 'Sorry, I encountered a connection error. Please try sending your message again.');
      chatInput.disabled = false;
      btnSkip.disabled = false;
    }
    scrollToBottom();
  }

  // API Call: Skip current question
  async function skipQuestion() {
    chatInput.value = '';
    btnSend.disabled = true;
    chatInput.disabled = true;
    btnSkip.disabled = true;

    try {
      const res = await fetch('/api/public/discovery/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });

      if (!res.ok) {
        throw new Error('API Error');
      }

      const data = await res.json();
      sessionState = data;

      // Append bot reply
      appendMessageBubble('bot', data.reply);
      updateProgressUI();

      if (data.status === 'completed') {
        completeSession();
      } else {
        chatInput.disabled = false;
        btnSkip.disabled = false;
        chatInput.focus();
      }
    } catch (err) {
      console.error(err);
      appendMessageBubble('bot', 'Failed to skip. Please try again.');
      chatInput.disabled = false;
      btnSkip.disabled = false;
    }
    scrollToBottom();
  }

  // Call API to compile Assessment and save final Intake
  async function completeSession() {
    try {
      const res = await fetch('/api/public/discovery/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });
      if (res.ok) {
        console.log('Session finalized successfully');
      }
    } catch (err) {
      console.error('Failed to complete session on server:', err);
    }
  }

  // Bind Buttons
  btnSend.addEventListener('click', sendMessage);
  btnSkip.addEventListener('click', skipQuestion);

  // Initialize
  initSession();
});
