// chat.js — Hoops.Money chat frontend with free/pro gating + PDF export
// Youth-focused: middle school, HS, early college, parents

(function () {
  'use strict';

  const ENDPOINT = '/api/chat';
  const STORAGE_KEY = 'hoopsMoneyConversation';
  const LANG_KEY = 'hoopsMoneyLang';
  const ANON_ID_KEY = 'hoopsMoneyAnonId';
  const PRO_KEY = 'hoopsMoneyPro';
  const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/8x228sg0T0xw4og1Ue8Zq04';

  const messagesEl   = document.getElementById('messages');
  const inputEl      = document.getElementById('input');
  const sendBtn      = document.getElementById('send');
  const langEnBtn    = document.getElementById('lang-en');
  const langEsBtn    = document.getElementById('lang-es');
  const newChatBtn   = document.getElementById('newChat');
  const upgradeBtn   = document.getElementById('upgradeBtn');
  const proBadge     = document.getElementById('proBadge');
  const exportBtn    = document.getElementById('exportBtn');
  const upgradeModal = document.getElementById('upgradeModal');

  if (!messagesEl || !inputEl || !sendBtn) {
    console.error('[Hoops.Money] Required markup missing.');
    return;
  }

  const I18N = {
    en: {
      placeholder: 'Ask about NIL, money, offers, social media, anything…',
      error: 'Something went wrong. Try again in a sec.',
      networkError: "I couldn't reach the server. Check your connection.",
      clearConfirm: 'Start a new conversation? Your current chat will be cleared.',
      welcomeEyebrow: 'Built for players & families',
      welcomeTitle: "Real talk about the business of basketball.",
      welcomeSub: "Middle school. High school. College. Parents trying to figure this out with their kid. Hoops.Money is built for you. NIL, money, branding, decisions — explained straight. No hype. No selling. No adults talking down to you. Ask anything.",
      topics: ['NIL Basics', 'Money & Taxes', 'Social Media', 'Offers & Red Flags', "Who's Around You", 'Long-Term Thinking'],
      limitTitle: "You've hit today's free limit",
      limitBody: "15 messages a day is the free plan. Upgrade to Pro for unlimited access + download your conversations — $9/month, cancel anytime.",
      upgradeCta: 'Upgrade to Pro',
      proWelcome: "You're Pro. Unlimited access is on, and you can download any conversation as a PDF. Thanks for supporting Hoops.Money.",
      exportLabel: 'Download PDF',
      exportEmpty: 'Start a conversation first, then you can download it as a PDF.',
      exportProOnly: 'Download as PDF is a Pro feature. Upgrade to Pro for unlimited access + conversation downloads.',
      pdfTitle: 'Hoops.Money — Conversation',
      pdfSubtitle: 'The Business of Basketball',
      pdfFooter: 'Educational information only. Not legal, tax, or financial advice. hoops.money',
      pdfUserLabel: 'You',
      pdfAssistantLabel: 'Hoops.Money'
    },
    es: {
      placeholder: 'Pregunta sobre NIL, dinero, ofertas, redes, lo que sea…',
      error: 'Algo salió mal. Intenta de nuevo en un momento.',
      networkError: 'No pude conectar con el servidor. Revisa tu conexión.',
      clearConfirm: '¿Comenzar una nueva conversación? Tu chat actual será borrado.',
      welcomeEyebrow: 'Para jugadores y familias',
      welcomeTitle: 'Hablando claro sobre el negocio del baloncesto.',
      welcomeSub: 'Escuela intermedia. Escuela superior. Universidad. Padres tratando de entender todo esto con su hijo. Hoops.Money es para ti. NIL, dinero, imagen, decisiones — explicado directo. Sin hype. Sin venderte nada. Sin adultos hablándote por encima. Pregunta lo que quieras.',
      topics: ['NIL Básico', 'Dinero e Impuestos', 'Redes Sociales', 'Ofertas y Señales', 'Tu Círculo', 'Pensamiento a Largo Plazo'],
      limitTitle: 'Llegaste al límite gratis de hoy',
      limitBody: '15 mensajes al día es el plan gratis. Pásate a Pro para acceso ilimitado + descarga tus conversaciones — $9/mes, cancela cuando quieras.',
      upgradeCta: 'Pásate a Pro',
      proWelcome: 'Eres Pro. Acceso ilimitado activo y ahora puedes descargar cualquier conversación como PDF. Gracias por apoyar a Hoops.Money.',
      exportLabel: 'Descargar PDF',
      exportEmpty: 'Inicia una conversación primero, luego podrás descargarla como PDF.',
      exportProOnly: 'Descargar como PDF es una función Pro. Pásate a Pro para acceso ilimitado + descargas de conversaciones.',
      pdfTitle: 'Hoops.Money — Conversación',
      pdfSubtitle: 'El Negocio del Baloncesto',
      pdfFooter: 'Información educativa únicamente. No es asesoría legal, fiscal o financiera. hoops.money',
      pdfUserLabel: 'Tú',
      pdfAssistantLabel: 'Hoops.Money'
    }
  };

  let history = [];
  let conversationStarted = false;
  let isSending = false;

  function getOrCreateAnonId() {
    try {
      let id = localStorage.getItem(ANON_ID_KEY);
      if (!id) {
        id = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(ANON_ID_KEY, id);
      }
      return id;
    } catch {
      return 'anon_fallback_' + Date.now();
    }
  }

  function isPro() {
    try { return localStorage.getItem(PRO_KEY) === 'true'; } catch { return false; }
  }

  function setPro(val) {
    try {
      if (val) localStorage.setItem(PRO_KEY, 'true');
      else localStorage.removeItem(PRO_KEY);
    } catch {}
    updateProUI();
  }

  function updateProUI() {
    const pro = isPro();
    if (proBadge) proBadge.style.display = pro ? 'inline-flex' : 'none';
    if (upgradeBtn) upgradeBtn.style.display = pro ? 'none' : 'inline-flex';
    if (exportBtn) exportBtn.style.display = pro ? 'inline-flex' : 'none';
  }

  function checkStripeRedirect() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setPro(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        addMessage('assistant', I18N[currentLang()].proWelcome, { store: false });
      }, 400);
    }
  }

  function currentLang() {
    try { return localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en'; } catch { return 'en'; }
  }

  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
    document.querySelectorAll('[data-lang]').forEach(el => {
      el.classList.toggle('show', el.dataset.lang === lang);
    });
    if (langEnBtn) langEnBtn.classList.toggle('active', lang === 'en');
    if (langEsBtn) langEsBtn.classList.toggle('active', lang === 'es');
    document.documentElement.lang = lang === 'es' ? 'es' : 'en';
    inputEl.placeholder = I18N[lang].placeholder;
    if (!conversationStarted) renderWelcome();
  }

  function saveConversation() {
    try {
      if (history.length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }

  function loadConversation() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(m =>
        m && (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' && m.content.length > 0
      );
    } catch {
      return [];
    }
  }

  function renderWelcome() {
    messagesEl.innerHTML = '';
    const t = I18N[currentLang()];

    const wrap = document.createElement('div');
    wrap.className = 'welcome';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'welcome-eyebrow';
    eyebrow.textContent = t.welcomeEyebrow;

    const title = document.createElement('h1');
    title.className = 'welcome-title';
    title.innerHTML = t.welcomeTitle.replace(
      /basketball|baloncesto/i,
      match => `<span class="accent">${match}</span>`
    );

    const sub = document.createElement('p');
    sub.className = 'welcome-sub';
    sub.textContent = t.welcomeSub;

    const topics = document.createElement('div');
    topics.className = 'welcome-topics';
    t.topics.forEach(topic => {
      const chip = document.createElement('span');
      chip.className = 'topic-chip';
      chip.textContent = topic;
      topics.appendChild(chip);
    });

    wrap.appendChild(eyebrow);
    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(topics);
    messagesEl.appendChild(wrap);
  }

  function renderMessage(role, content, isError) {
    const el = document.createElement('div');
    el.className = 'msg ' + (isError ? 'error' : (role === 'user' ? 'user' : 'bori'));
    el.textContent = content;
    messagesEl.appendChild(el);
  }

  function renderLimitMessage() {
    const t = I18N[currentLang()];
    const wrap = document.createElement('div');
    wrap.className = 'msg bori limit-notice';

    const title = document.createElement('div');
    title.className = 'limit-title';
    title.textContent = t.limitTitle;

    const body = document.createElement('div');
    body.className = 'limit-body';
    body.textContent = t.limitBody;

    const btn = document.createElement('button');
    btn.className = 'limit-upgrade-btn';
    btn.type = 'button';
    btn.textContent = t.upgradeCta;
    btn.addEventListener('click', openUpgradeModal);

    wrap.appendChild(title);
    wrap.appendChild(body);
    wrap.appendChild(btn);
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function startConversation() {
    if (conversationStarted) return;
    conversationStarted = true;
    messagesEl.innerHTML = '';
  }

  function addMessage(role, content, opts) {
    opts = opts || {};
    const store = opts.store !== false;
    const isError = !!opts.isError;
    renderMessage(role, content, isError);
    scrollToBottom();
    if (store && (role === 'user' || role === 'assistant')) {
      history.push({ role, content });
      saveConversation();
    }
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function setSending(state) {
    isSending = state;
    sendBtn.disabled = state;
    inputEl.disabled = state;
    if (newChatBtn) newChatBtn.disabled = state;
  }

  function restoreConversation() {
    const saved = loadConversation();
    if (saved.length === 0) {
      renderWelcome();
      return;
    }
    history = saved;
    conversationStarted = true;
    messagesEl.innerHTML = '';
    history.forEach(m => renderMessage(m.role, m.content, false));
    scrollToBottom();
  }

  function clearConversation() {
    if (isSending) return;
    if (history.length > 0) {
      const ok = window.confirm(I18N[currentLang()].clearConfirm);
      if (!ok) return;
    }
    history = [];
    saveConversation();
    conversationStarted = false;
    renderWelcome();
    inputEl.focus();
  }

  function openUpgradeModal() {
    if (upgradeModal) upgradeModal.classList.add('show');
  }

  function closeUpgradeModal() {
    if (upgradeModal) upgradeModal.classList.remove('show');
  }

  function goToCheckout() {
    const anonId = getOrCreateAnonId();
    window.location.href = STRIPE_CHECKOUT_URL + '?client_reference_id=' + encodeURIComponent(anonId);
  }

  // ── PDF EXPORT ────────────────────────────────────────────────
  async function exportAsPDF() {
    const t = I18N[currentLang()];

    if (!isPro()) {
      alert(t.exportProOnly);
      return;
    }

    if (history.length === 0) {
      alert(t.exportEmpty);
      return;
    }

    if (typeof window.jspdf === 'undefined') {
      alert('PDF library failed to load. Please refresh and try again.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 54;
    const marginTop = 70;
    const marginBottom = 60;
    let y = marginTop;

    // Header bar
    doc.setFillColor(10, 8, 6);
    doc.rect(0, 0, pageW, 50, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Hoops', marginX, 30);
    doc.setTextColor(240, 183, 74);
    doc.text('.Money', marginX + doc.getTextWidth('Hoops'), 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(t.pdfSubtitle, pageW - marginX, 30, { align: 'right' });

    // Title + date
    y = 80;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(t.pdfTitle, marginX, y);

    y += 18;
    const dateStr = new Date().toLocaleDateString(
      currentLang() === 'es' ? 'es-ES' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(130, 130, 130);
    doc.text(dateStr, marginX, y);

    y += 24;
    doc.setDrawColor(230, 230, 230);
    doc.line(marginX, y, pageW - marginX, y);
    y += 20;

    const contentWidth = pageW - marginX * 2;

    history.forEach(m => {
      const label = m.role === 'user' ? t.pdfUserLabel : t.pdfAssistantLabel;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      if (m.role === 'user') {
        doc.setTextColor(255, 106, 26);
      } else {
        doc.setTextColor(40, 40, 40);
      }

      if (y > pageH - marginBottom - 30) {
        doc.addPage();
        y = marginTop;
      }

      doc.text(label, marginX, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(m.content, contentWidth);

      lines.forEach(line => {
        if (y > pageH - marginBottom) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(line, marginX, y);
        y += 14;
      });

      y += 10;
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(t.pdfFooter, pageW / 2, pageH - 30, { align: 'center' });
      doc.text(`${i} / ${pageCount}`, pageW - marginX, pageH - 30, { align: 'right' });
    }

    const filename = `hoops-money-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  async function fetchReply() {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        language: currentLang(),
        isPro: isPro(),
        anonId: getOrCreateAnonId()
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data && data.limitReached) {
        const err = new Error('LIMIT_REACHED');
        err.limitReached = true;
        throw err;
      }
      throw new Error(data.error || 'Request failed (' + res.status + ')');
    }

    if (!data || typeof data.reply !== 'string') {
      throw new Error('Malformed response from server.');
    }
    return data.reply;
  }

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
      if (typing) typing.remove();
      if (err.limitReached) {
        renderLimitMessage();
        setTimeout(openUpgradeModal, 600);
      } else {
        console.error('[Hoops.Money] send failed:', err);
        const t = I18N[currentLang()];
        const msg = /fetch|network|failed to fetch/i.test(err.message || '') ? t.networkError : t.error;
        addMessage('assistant', msg, { store: false, isError: true });
      }
    } finally {
      setSending(false);
      inputEl.focus();
    }
  }

  function autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
  }

  inputEl.addEventListener('input', autoResize);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn.addEventListener('click', handleSend);

  if (langEnBtn) langEnBtn.addEventListener('click', () => setLang('en'));
  if (langEsBtn) langEsBtn.addEventListener('click', () => setLang('es'));
  if (newChatBtn) newChatBtn.addEventListener('click', clearConversation);
  if (upgradeBtn) upgradeBtn.addEventListener('click', openUpgradeModal);
  if (exportBtn) exportBtn.addEventListener('click', exportAsPDF);

  if (upgradeModal) {
    const closeBtn = upgradeModal.querySelector('[data-modal-close]');
    const ctaBtn = upgradeModal.querySelector('[data-modal-cta]');
    const backdrop = upgradeModal.querySelector('.modal-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', closeUpgradeModal);
    if (backdrop) backdrop.addEventListener('click', closeUpgradeModal);
    if (ctaBtn) ctaBtn.addEventListener('click', goToCheckout);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeUpgradeModal();
    });
  }

  function init() {
    getOrCreateAnonId();
    updateProUI();
    checkStripeRedirect();
    setLang(currentLang());
    restoreConversation();
    autoResize();
    if (window.matchMedia('(min-width: 700px)').matches) inputEl.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
