// chat.js — Hey Bori chat frontend
// Talks to /api/chat (Vercel serverless function).

(function () {
  'use strict';

  const ENDPOINT = '/api/chat';

  const messagesEl = document.getElementById('messages');
  const welcomeEl  = document.getElementById('welcome');
  const suggestEl  = document.getElementById('suggestions');
  const inputEl    = document.getElementById('input');
  const sendBtn    = document.getElementById('send');
  const langEnBtn  = document.getElementById('lang-en');
  const langEsBtn  = document.getElementById('lang-es');

  if (!messagesEl || !inputEl || !sendBtn) {
    console.warn('[Hey Bori] chat markup not found — aborting.');
    return;
  }

  // ── I18N ──────────────────────────────────────────────────────────────────
  const I18N = {
    en: {
      placeholder: 'Ask Bori anything about tokenization…',
      thinking: 'Thinking…',
      error: 'Something went wrong reaching Bori. Please try again in a moment.',
      networkError: "I couldn't reach Bori. Check your connection and try again.",
      suggestions: [
        'What exactly is tokenization?',
        'How does tokenized real estate work?',
        'What is the difference between tokens and cryptocurrency?',
        'What are the main risks of tokenized assets?',
        'What regulations apply in the US?',
        'Can you explain RWAs (real-world assets)?'
      ]
    },
    es: {
      placeholder: 'Pregúntale a Bori sobre tokenización…',
      thinking: 'Pensando…',
      error: 'Algo salió mal al conectar con Bori. Por favor intenta de nuevo en un momento.',
      networkError: 'No pude conectar con Bori. Revisa tu conexión y vuelve a intentarlo.',
      suggestions: [
        '¿Qué es exactamente la tokenización?',
        '¿Cómo funcionan los bienes raíces tokenizados?',
        '¿Cuál es la diferencia entre tokens y criptomonedas?',
        '¿Cuáles son los riesgos principales de los activos tokenizados?',
        '¿Qué regulaciones aplican en EE.UU.?',
        '¿Puedes explicar los RWAs (activos del mundo real)?'
      ]
    }
  };

  // ── LANGUAGE STATE ────────────────────────────────────────────────────────
  function currentLang() {
    try {
      const stored = localStorage.getItem('heyBoriLang');
      return stored === 'es' ? 'es' : 'en';
    } catch {
      return 'en';
    }
  }

  function setLang(lang) {
    try { localStorage.setItem('heyBoriLang', lang); } catch {}

    // Toggle language-scoped elements
    document.querySelectorAll('[data-lang]').forEach(el => {
      el.classList.toggle('show', el.dataset.lang === lang);
    });

    // Update lang toggle buttons
    if (langEnBtn) langEnBtn.classList.toggle('active', lang === 'en');
    if (langEsBtn) langEsBtn.classList.toggle('active', lang === 'es');

    // Update html lang attribute
    document.documentElement.lang = lang === 'es' ? 'es' : 'en';

    // Update placeholder
    inputEl.placeholder = I18N[lang].placeholder;

    // Re-render suggestions in new language
    renderSuggestions();
  }

  if (langEnBtn) langEnBtn.addEventListener('click', () => setLang('en'));
  if (langEsBtn) langEsBtn.addEventListener('click', () => setLang('es'));

  // ── SUGGESTIONS ───────────────────────────────────────────────────────────
  function renderSuggestions() {
    if (!suggestEl) return;
    const lang = currentLang();
    const items = I18N[lang].suggestions;
    suggestEl.innerHTML = '';
    items.forEach(text => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.type = 'button';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        inputEl.value = text;
        autoResize();
        handleSend();
      });
      suggestEl.appendChild(chip);
    });
  }

  // ── CHAT STATE ────────────────────────────────────────────────────────────
  const history = [];
  let conversationStarted = false;
  let isSending = false;

  function startConversation() {
    if (conversationStarted) return;
    conversationStarted = true;
    if (welcomeEl) welcomeEl.remove();
  }

  function addMessage(role, content, opts = {}) {
    const { store = true, isError = false } = opts;
    const el = document.createElement('div');
    el.className = 'msg ' + (isError ? 'error' : (role === 'user' ? 'user' : 'bori'));
    el.textContent = content;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (store && (role === 'user' || role === 'assistant')) {
      history.push({ role, content });
    }
    return el;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'typing';
    el.setAttribute('aria-label', I18N[currentLang()].thinking);
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function setSending(state) {
    isSending = state;
    sendBtn.disabled = state;
    inputEl.disabled = state;
  }

  // ── API CALL ──────────────────────────────────────────────────────────────
  async function fetchReply() {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, language: currentLang() })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed (${res.status})`);
    }

    const data = await res.json();
    if (!data || typeof data.reply !== 'string') {
      throw new Error('Malformed response from server.');
    }
    return data.reply;
  }

  // ── SEND FLOW ─────────────────────────────────────────────────────────────
  async function handleSend() {
    if (isSending) return;
    const text = (inputEl.value || '').trim();
    if (!text) return;

    startConversation();
    addMessage('user', text);
    inputEl.value = '';
    autoResize();

    setSending(true);
    const typing = showTyping();

    try {
      const reply = await fetchReply();
      if (typing) typing.remove();
      addMessage('assistant', reply);
    } catch (err) {
      console.error('[Hey Bori] send failed:', err);
      if (typing) typing.remove();
      const msg =
        err && err.message && /fetch|network|failed to fetch/i.test(err.message)
          ? I18N[currentLang()].networkError
          : I18N[currentLang()].error;
      addMessage('assistant', msg, { store: false, isError: true });
    } finally {
      setSending(false);
      inputEl.focus();
    }
  }

  // ── INPUT BEHAVIORS ───────────────────────────────────────────────────────
  function autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
  }

  inputEl.addEventListener('input', autoResize);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    setLang(currentLang());
    autoResize();
    inputEl.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
