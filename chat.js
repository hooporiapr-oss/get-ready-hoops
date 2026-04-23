// chat.js — Hey Bori chat frontend
// Persists conversation across visits via localStorage.
// Talks to /api/chat (Vercel serverless function).

(function () {
  'use strict';

  const ENDPOINT = '/api/chat';
  const STORAGE_KEY = 'heyBoriConversation';

  const messagesEl = document.getElementById('messages');
  const welcomeEl  = document.getElementById('welcome');
  const suggestEl  = document.getElementById('suggestions');
  const inputEl    = document.getElementById('input');
  const sendBtn    = document.getElementById('send');
  const langEnBtn  = document.getElementById('lang-en');
  const langEsBtn  = document.getElementById('lang-es');
  const newChatBtn = document.getElementById('newChat');

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
      clearConfirm: 'Start a new conversation? Your current chat will be cleared.',
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
      clearConfirm: '¿Comenzar una nueva conversación? Tu chat actual será borrado.',
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

    document.querySelectorAll('[data-lang]').forEach(el => {
      el.classList.toggle('show', el.dataset.lang === lang);
    });

    if (langEnBtn) langEnBtn.classList.toggle('active', lang === 'en');
    if (langEsBtn) langEsBtn.classList.toggle('active', lang === 'es');

    document.documentElement.lang = lang === 'es' ? 'es' : 'en';
    inputEl.placeholder = I18N[lang].placeholder;

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
  let history = [];
  let conversationStarted = false;
  let isSending = false;

  // ── PERSISTENCE ───────────────────────────────────────────────────────────
  function saveConversation() {
    try {
      if (history.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      }
    } catch (err) {
      console.warn('[Hey Bori] Could not save conversation:', err);
    }
  }

  function loadConversation() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Filter to only valid message shapes
      return parsed.filter(m =>
        m && typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0
      );
    } catch (err) {
      console.warn('[Hey Bori] Could not load conversation:', err);
      return [];
    }
  }

  // ── RENDERING ─────────────────────────────────────────────────────────────
  function startConversation() {
    if (conversationStarted) return;
    conversationStarted = true;
    if (welcomeEl && welcomeEl.parentNode) welcomeEl.remove();
  }

  function renderMessage(role, content, opts = {}) {
    const { isError = false } = opts;
    const el = document.createElement('div');
    el.className = 'msg ' + (isError ? 'error' : (role === 'user' ? 'user' : 'bori'));
    el.textContent = content;
    messagesEl.appendChild(el);
  }

  function addMessage(role, content, opts = {}) {
    const { store = true, isError = false } = opts;
    renderMessage(role, content, { isError });
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (store && (role === 'user' || role === 'assistant')) {
      history.push({ role, content });
      saveConversation();
    }
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
    if (newChatBtn) newChatBtn.disabled = state;
  }

  // ── RESTORE PRIOR CONVERSATION ────────────────────────────────────────────
  function restoreConversation() {
    const saved = loadConversation();
    if (saved.length === 0) return;

    history = saved;
    startConversation();
    history.forEach(m => renderMessage(m.role, m.content));
    // Scroll to bottom after DOM settles
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ── NEW CONVERSATION ──────────────────────────────────────────────────────
  function clearConversation() {
    if (isSending) return;

    // Only confirm if there's something to clear
    if (history.length > 0) {
      const ok = window.confirm(I18N[currentLang()].clearConfirm);
      if (!ok) return;
    }

    history = [];
    saveConversation();
    messagesEl.innerHTML = '';
    conversationStarted = false;

    // Rebuild welcome
    const wrap = document.createElement('div');
    wrap.className = 'welcome';
    wrap.id = 'welcome';
    wrap.innerHTML = `
      <div class="welcome-eyebrow" data-lang="en">Educational · Independent · Neutral</div>
      <div class="welcome-eyebrow" data-lang="es">Educativo · Independiente · Neutral</div>

      <h1 class="welcome-title" data-lang="en">Ask me anything about tokenization.</h1>
      <h1 class="welcome-title" data-lang="es">Pregúntame lo que quieras sobre tokenización.</h1>

      <p class="welcome-sub" data-lang="en">I explain concepts, mechanics, regulation, and risks across tokenized real estate, art, funds, securities, and real-world assets. I don't sell anything. I don't recommend deals. I teach so you can make informed decisions.</p>
      <p class="welcome-sub" data-lang="es">Explico conceptos, mecánica, regulación y riesgos a través de bienes raíces tokenizados, arte, fondos, valores y activos del mundo real. No vendo nada. No recomiendo ofertas. Enseño para que puedas tomar decisiones informadas.</p>

      <div class="suggestions" id="suggestions"></div>
    `;
    messagesEl.appendChild(wrap);

    // Re-point the suggestions ref and re-render
    const newSuggestEl = document.getElementById('suggestions');
    if (newSuggestEl) {
      // Overwrite the outer reference
      suggestElRef.current = newSuggestEl;
      renderSuggestionsInto(newSuggestEl);
    }

    // Re-apply language visibility to the new welcome nodes
    setLang(currentLang());

    inputEl.focus();
  }

  // Small ref pattern so renderSuggestions can target the current welcome node
  const suggestElRef = { current: suggestEl };

  function renderSuggestionsInto(target) {
    if (!target) return;
    const lang = currentLang();
    const items = I18N[lang].suggestions;
    target.innerHTML = '';
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
      target.appendChild(chip);
    });
  }

  // Override renderSuggestions to use the current ref
  const originalRenderSuggestions = renderSuggestions;
  // eslint-disable-next-line no-func-assign
  renderSuggestions = function () {
    renderSuggestionsInto(suggestElRef.current);
  };

  if (newChatBtn) {
    newChatBtn.addEventListener('click', clearConversation);
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
    restoreConversation();
    autoResize();
    inputEl.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
