/**
 * app.js - EcoAI Client Controller & State Management
 * Connects elements, charts, form actions, Speech-to-Text, and Chat interfaces.
 */

// Application Constants
const MAX_CHART_CO2 = 15.0; // Benchmark for 100% height of individual bars
const GOAL_SAVINGS = {
  led_bulbs: 12.0,
  metro_commute: 20.0,
  meatless_monday: 15.0,
  max_recycling: 10.0
};

// Application State
let appState = {
  logs: {
    transport: { value: 0, subType: 'walk', co2: 0, unit: 'km' },
    electricity: { value: 0, subType: 'green', co2: 0, unit: 'kWh' },
    food: { value: 0, subType: 'vegan', co2: 0, unit: 'meals' },
    shopping: { value: 0, subType: 'none', co2: 0, unit: 'items' },
    waste: { value: 0, subType: 'recycle_high', co2: 0, unit: 'bags' }
  },
  activeGoals: [],
  chatHistory: [],
  apiKey: ''
};

// Initialize Speech Recognition
let recognition = null;
let isRecording = false;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromLocalStorage();
  initSettingsModal();
  initTabNavigation();
  initFormListeners();
  initElectricitySlider();
  initGoalListeners();
  initChatListeners();
  initVoiceRecognition();
  updateDashboard();
  
  // Quick greeting text animation trigger
  setTimeout(() => {
    showToast("Welcome to EcoAI! 🍃 Try speaking a habit to log.");
  }, 1000);
});

/* ==========================================================================
   State & Storage Management
   ========================================================================== */

function saveStateToLocalStorage() {
  localStorage.setItem('ecoai_state', JSON.stringify({
    logs: appState.logs,
    activeGoals: appState.activeGoals,
    chatHistory: appState.chatHistory
  }));
}

function loadStateFromLocalStorage() {
  // Load State
  const savedState = localStorage.getItem('ecoai_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      if (parsed.logs) appState.logs = parsed.logs;
      if (parsed.activeGoals) appState.activeGoals = parsed.activeGoals;
      if (parsed.chatHistory) appState.chatHistory = parsed.chatHistory;
    } catch (e) {
      console.error('Failed to parse saved state:', e);
    }
  }
  
  // Load API Key
  appState.apiKey = localStorage.getItem('ecoai_gemini_key') || '';
  const keyInput = document.getElementById('geminiApiKeyInput');
  if (keyInput) keyInput.value = appState.apiKey;
  
  // Apply saved goals to checkboxes
  appState.activeGoals.forEach(goalId => {
    const chk = document.getElementById(`goal-${goalId}`);
    if (chk) {
      chk.checked = true;
      chk.closest('.goal-item').classList.add('active');
    }
  });
}

/* ==========================================================================
   Tab Navigation & Forms
   ========================================================================== */

function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const forms = document.querySelectorAll('.log-form');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Update Tab Button States
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      // Update Tab Content Form Visibility
      forms.forEach(form => {
        if (form.id === `form-${tabId}`) {
          form.classList.add('active');
        } else {
          form.classList.remove('active');
        }
      });
    });
  });
}

function initElectricitySlider() {
  const slider = document.getElementById('elec-slider');
  const kwhInput = document.getElementById('elec-kwh');
  
  if (!slider || !kwhInput) return;
  
  // Connect Slider to Input Box
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    if (val === 1) kwhInput.value = 4;   // Low estimate
    else if (val === 2) kwhInput.value = 10; // Medium estimate
    else if (val === 3) kwhInput.value = 25; // Large estimate
    else kwhInput.value = '';             // Custom estimate
  });
  
  // Reset slider if user writes manually in input box
  kwhInput.addEventListener('input', () => {
    slider.value = 0; // custom state
  });
}

function initFormListeners() {
  // Helper to process logging action
  const logHabit = (category, value, subType) => {
    const co2 = window.Calculator.calculateCategoryCarbon(category, value, subType);
    appState.logs[category] = {
      value: value,
      subType: subType,
      co2: co2,
      unit: appState.logs[category].unit
    };
    saveStateToLocalStorage();
    updateDashboard();
    showToast(`Logged: ${value} ${appState.logs[category].unit} for ${category.toUpperCase()} (+${co2.toFixed(2)} kg CO₂)`);
  };

  // 1. Transport Form
  document.getElementById('form-transport').addEventListener('submit', (e) => {
    e.preventDefault();
    const distance = parseFloat(document.getElementById('trans-distance').value);
    const type = document.getElementById('trans-type').value;
    logHabit('transport', distance, type);
    e.target.reset();
  });
  
  // 2. Electricity Form
  document.getElementById('form-electricity').addEventListener('submit', (e) => {
    e.preventDefault();
    const source = document.getElementById('elec-source').value;
    let kwh = parseFloat(document.getElementById('elec-kwh').value);
    
    if (isNaN(kwh) || kwh <= 0) {
      // Fallback estimate based on slider position if input is empty
      const sliderVal = parseInt(document.getElementById('elec-slider').value);
      if (sliderVal === 1) kwh = 4;
      else if (sliderVal === 2) kwh = 10;
      else if (sliderVal === 3) kwh = 25;
      else kwh = 0;
    }
    
    logHabit('electricity', kwh, source);
    e.target.reset();
    document.getElementById('elec-slider').value = 0;
  });
  
  // 3. Food Form
  document.getElementById('form-food').addEventListener('submit', (e) => {
    e.preventDefault();
    const meals = parseFloat(document.getElementById('food-meals').value);
    const diet = document.getElementById('food-diet').value;
    logHabit('food', meals, diet);
  });
  
  // 4. Shopping Form
  document.getElementById('form-shopping').addEventListener('submit', (e) => {
    e.preventDefault();
    const items = parseInt(document.getElementById('shop-count').value);
    const type = document.getElementById('shop-type').value;
    logHabit('shopping', items, type);
    e.target.reset();
  });
  
  // 5. Waste Form
  document.getElementById('form-waste').addEventListener('submit', (e) => {
    e.preventDefault();
    const bags = parseInt(document.getElementById('waste-bags').value);
    const recycleRate = document.getElementById('waste-recycle').value;
    logHabit('waste', bags, recycleRate);
    e.target.reset();
  });
}

/* ==========================================================================
   Active Goals & Cumulative Savings
   ========================================================================== */

function initGoalListeners() {
  const goalsContainer = document.getElementById('goalsList');
  if (!goalsContainer) return;
  
  goalsContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('goal-checkbox')) {
      const checkbox = e.target;
      const goalItem = checkbox.closest('.goal-item');
      const goalId = goalItem.getAttribute('data-goal-id');
      
      if (checkbox.checked) {
        goalItem.classList.add('active');
        if (!appState.activeGoals.includes(goalId)) {
          appState.activeGoals.push(goalId);
        }
      } else {
        goalItem.classList.remove('active');
        appState.activeGoals = appState.activeGoals.filter(id => id !== goalId);
      }
      
      saveStateToLocalStorage();
      updateDashboard();
      
      const saving = GOAL_SAVINGS[goalId] || 0;
      if (checkbox.checked) {
        showToast(`Goal Adopted! Projected monthly savings: -${saving} kg CO₂`);
      }
    }
  });
}

/* ==========================================================================
   Dashboard Renderer (Score and Charts)
   ========================================================================== */

function updateDashboard() {
  let totalCO2 = 0;
  
  // Update Category Badge UI and calculate total CO2
  Object.keys(appState.logs).forEach(cat => {
    const log = appState.logs[cat];
    totalCO2 += log.co2;
    
    // Update Badge Values
    const valNode = document.getElementById(`val-${cat}`);
    const co2Node = document.getElementById(`co2-${cat}`);
    if (valNode) valNode.textContent = `${log.value} ${log.unit}`;
    if (co2Node) co2Node.textContent = log.co2.toFixed(2);
    
    // Update SVG Chart Bars
    const bar = document.getElementById(`bar-${cat}`);
    if (bar) {
      const percentage = Math.min((log.co2 / MAX_CHART_CO2) * 100, 100);
      bar.style.height = `${percentage}%`;
      bar.setAttribute('data-tooltip', `${log.co2.toFixed(2)} kg CO₂`);
    }
  });
  
  // Calculate Grade Stats & Update Circular Score Gauge
  const stats = window.Calculator.getCarbonScoreStats(totalCO2);
  
  const totalScoreVal = document.getElementById('totalScoreValue');
  const scoreBadge = document.getElementById('scoreGradeBadge');
  const scoreDesc = document.getElementById('scoreDescription');
  const gaugeFill = document.getElementById('scoreGaugeFill');
  
  if (totalScoreVal) totalScoreVal.textContent = totalCO2.toFixed(1);
  if (scoreBadge) {
    scoreBadge.textContent = stats.grade;
    scoreBadge.style.color = stats.badgeColor;
    scoreBadge.style.textShadow = `0 0 10px ${stats.badgeColor}55`;
  }
  if (scoreDesc) scoreDesc.textContent = stats.description;
  
  if (gaugeFill) {
    // Circumference is ~440 (2 * Math.PI * 70 = 439.8)
    const circumference = 440;
    // Map max score limit to 30 kg CO2 for radial fill visual representation
    const percentage = Math.min(totalCO2 / 30, 1);
    const offset = circumference * (1 - percentage);
    
    gaugeFill.style.strokeDashoffset = offset;
    gaugeFill.style.stroke = stats.badgeColor;
  }
  
  // Calculate Cumulative Goal Savings
  let totalSaved = 0;
  appState.activeGoals.forEach(goalId => {
    totalSaved += GOAL_SAVINGS[goalId] || 0;
  });
  
  const savingsValNode = document.getElementById('savingsValue');
  if (savingsValNode) savingsValNode.textContent = totalSaved.toFixed(1);
}

/* ==========================================================================
   Settings & Modals
   ========================================================================== */

function initSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('openSettingsBtn');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const saveBtn = document.getElementById('saveSettingsBtn');
  const clearBtn = document.getElementById('clearSettingsBtn');
  const keyInput = document.getElementById('geminiApiKeyInput');
  
  if (!modal || !openBtn || !closeBtn || !saveBtn || !clearBtn || !keyInput) return;
  
  openBtn.addEventListener('click', () => {
    modal.classList.add('active');
  });
  
  const closeModal = () => {
    modal.classList.remove('active');
  };
  
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Save Settings
  saveBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (key) {
      localStorage.setItem('ecoai_gemini_key', key);
      appState.apiKey = key;
      showToast("Gemini API Key saved successfully! ⚡");
    } else {
      showToast("Please enter a valid API key.");
    }
    closeModal();
  });
  
  // Clear Settings
  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('ecoai_gemini_key');
    appState.apiKey = '';
    keyInput.value = '';
    showToast("Gemini API Key removed. Using offline simulator.");
    closeModal();
  });
}

/* ==========================================================================
   EcoAI Chatbot Interface & Logic
   ========================================================================== */

function initChatListeners() {
  const sendBtn = document.getElementById('sendChatBtn');
  const chatInput = document.getElementById('chatInput');
  const clearBtn = document.getElementById('clearChatBtn');
  
  if (!sendBtn || !chatInput || !clearBtn) return;
  
  sendBtn.addEventListener('click', handleChatSubmit);
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleChatSubmit();
    }
  });
  
  clearBtn.addEventListener('click', () => {
    const chatBox = document.getElementById('chatMessages');
    chatBox.innerHTML = `
      <div class="message-bubble ai">
        <p>Chat logs cleared. Ask me anything or log a daily habit! 🍃</p>
      </div>
    `;
    appState.chatHistory = [];
    saveStateToLocalStorage();
    showToast("Chat logs cleared.");
  });
  
  // Reload chat history if exists
  if (appState.chatHistory && appState.chatHistory.length > 0) {
    const chatBox = document.getElementById('chatMessages');
    chatBox.innerHTML = ''; // Clear defaults
    appState.chatHistory.forEach(msg => {
      renderChatBubble(msg.role === 'user' ? 'user' : 'ai', msg.text, false);
    });
  }
}

function handleChatSubmit() {
  const inputEl = document.getElementById('chatInput');
  const userText = inputEl.value.trim();
  
  if (!userText) return;
  
  // Add to UI
  renderChatBubble('user', userText);
  inputEl.value = '';
  
  // Add to History
  appState.chatHistory.push({ role: 'user', text: userText });
  
  // Start Loader
  const loader = document.getElementById('typingLoader');
  loader.style.display = 'flex';
  
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Handle Processing
  setTimeout(async () => {
    let responseText = "";
    let parsedHabit = null;
    
    try {
      if (appState.apiKey) {
        // Query Live Gemini
        const result = await window.EcoAI.queryGemini(appState.apiKey, userText, appState.logs, appState.chatHistory);
        responseText = result.text;
        parsedHabit = result.parsedHabit;
      } else {
        // Run Offline local parser
        parsedHabit = window.EcoAI.parseHabitFromText(userText);
        const simResult = window.EcoAI.getSimulatedAIReply(userText, parsedHabit, appState.logs);
        responseText = simResult.text;
      }
      
      // If a habit was successfully parsed, apply it to the dashboard state!
      if (parsedHabit) {
        const co2Val = window.Calculator.calculateCategoryCarbon(parsedHabit.category, parsedHabit.value, parsedHabit.subType);
        
        // Merge values if category already has entries, or replace. 
        // For standard daily logging, it replaces or adds to it.
        // Let's replace the log to keep it simple, or add distance/meals.
        let newValue = parsedHabit.value;
        
        // For cumulative adding during a live session:
        if (parsedHabit.category === 'transport' || parsedHabit.category === 'food' || parsedHabit.category === 'shopping' || parsedHabit.category === 'waste') {
          // If logs already have a value of same subtype, add them. Otherwise replace.
          if (appState.logs[parsedHabit.category].subType === parsedHabit.subType) {
            newValue = appState.logs[parsedHabit.category].value + parsedHabit.value;
          }
        }
        
        const finalCo2 = window.Calculator.calculateCategoryCarbon(parsedHabit.category, newValue, parsedHabit.subType);
        
        appState.logs[parsedHabit.category] = {
          value: newValue,
          subType: parsedHabit.subType,
          co2: finalCo2,
          unit: appState.logs[parsedHabit.category].unit
        };
        
        saveStateToLocalStorage();
        updateDashboard();
      }
      
    } catch (err) {
      console.error(err);
      responseText = `⚠️ Error processing: ${err.message}. Please check your connection or settings.`;
    } finally {
      // Stop Loader
      loader.style.display = 'none';
      
      // Render AI Bubble
      renderChatBubble('ai', responseText);
      appState.chatHistory.push({ role: 'model', text: responseText });
      saveStateToLocalStorage();
    }
  }, 1000);
}

function renderChatBubble(sender, text, animate = true) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${sender}`;
  
  // Format markdown helper inside bubble
  let formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
    
  bubble.innerHTML = formattedText;
  
  // If AI sender, append a Text-to-Speech link
  if (sender === 'ai') {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    const speakLink = document.createElement('span');
    speakLink.className = 'action-link';
    speakLink.innerHTML = `
      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
      </svg>
      Listen
    `;
    
    // Bind click to speak
    speakLink.addEventListener('click', () => {
      speakText(text);
    });
    
    actions.appendChild(speakLink);
    bubble.appendChild(actions);
  }
  
  if (animate) {
    bubble.style.animation = 'fadeIn 0.3s ease-out';
  }
  
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Speak aloud helper
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showToast("Text-to-speech is not supported on this browser.");
    return;
  }
  
  // Cancel current speech
  window.speechSynthesis.cancel();
  
  // Clean text from Markdown chars
  const cleanText = text.replace(/[*#`_]/g, '');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  // Speak
  window.speechSynthesis.speak(utterance);
  showToast("Audio playing... 🔊");
}

/* ==========================================================================
   Voice Input Integration (Web Speech API)
   ========================================================================== */

function initVoiceRecognition() {
  const recordBtn = document.getElementById('voiceRecordBtn');
  const chatInput = document.getElementById('chatInput');
  
  if (!recordBtn || !chatInput) return;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    recordBtn.title = "Voice recognition is not supported in this browser.";
    recordBtn.addEventListener('click', () => {
      showToast("Voice recognition is not supported in your current browser.");
    });
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  recognition.onstart = () => {
    isRecording = true;
    recordBtn.classList.add('recording');
    document.getElementById('chatStatus').textContent = "Listening...";
    chatInput.placeholder = "Listening to your voice... Speak now!";
    showToast("Microphone active. Talk now! 🎤");
  };
  
  recognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    isRecording = false;
    recordBtn.classList.remove('recording');
    document.getElementById('chatStatus').textContent = "Online";
    chatInput.placeholder = "Type a message or record voice...";
    showToast(`Voice Error: ${e.error}`);
  };
  
  recognition.onend = () => {
    isRecording = false;
    recordBtn.classList.remove('recording');
    document.getElementById('chatStatus').textContent = "Online";
    chatInput.placeholder = "Type a message or record voice...";
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    
    // Auto submit transcription!
    showToast("Voice transcribed! Processing...");
    setTimeout(() => {
      handleChatSubmit();
    }, 500);
  };
  
  // Clicking record button toggles Speech Recognition
  recordBtn.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
}

/* ==========================================================================
   Global Toast Notification
   ========================================================================== */

function showToast(message) {
  const toast = document.getElementById('toastBox');
  const msgText = document.getElementById('toastMessage');
  
  if (!toast || !msgText) return;
  
  msgText.textContent = message;
  toast.classList.add('active');
  
  // Clear after 3 seconds
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}
