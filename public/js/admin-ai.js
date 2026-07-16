(function () {
  const aiState = {
    ready: false,
    busy: false,
    suggestions: [],
    messages: []
  };

  function aiEscape(value) {
    if (typeof adminEscapeHtml === 'function') return adminEscapeHtml(value);
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function aiCardsHtml(cards = []) {
    if (!Array.isArray(cards) || !cards.length) return '';
    return `
      <div class="lencho-ai-cards">
        ${cards.map(card => `
          <div class="lencho-ai-card tone-${aiEscape(card.tone || 'pink')}">
            <span>${aiEscape(card.label || '')}</span>
            <strong>${aiEscape(card.value || '0')}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  function aiTableHtml(table) {
    if (!table || !Array.isArray(table.rows) || !table.rows.length) return '';
    const cols = Array.isArray(table.columns) ? table.columns : [];
    return `
      <div class="lencho-ai-table-wrap">
        <div class="lencho-ai-table-title">${aiEscape(table.title || 'Details')}</div>
        <table class="lencho-ai-table">
          <thead>
            <tr>${cols.map(col => `<th>${aiEscape(col)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${table.rows.map(row => `
              <tr>${(Array.isArray(row) ? row : []).map(cell => `<td>${aiEscape(cell)}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function aiWarningsHtml(items = []) {
    if (!Array.isArray(items) || !items.length) return '';
    return `<div class="lencho-ai-warnings">${items.map(item => `<p>${aiEscape(item)}</p>`).join('')}</div>`;
  }

  function aiMessageHtml(message) {
    const isUser = message.role === 'user';
    return `
      <div class="lencho-ai-msg ${isUser ? 'is-user' : 'is-ai'}">
        <div class="lencho-ai-avatar">${isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}</div>
        <div class="lencho-ai-bubble">
          <p>${aiEscape(message.text)}</p>
          ${aiCardsHtml(message.cards)}
          ${aiTableHtml(message.table)}
          ${aiTableHtml(message.secondaryTable)}
          ${aiWarningsHtml(message.completeness)}
          ${message.meta ? `<div class="lencho-ai-meta">${aiEscape(message.meta)}</div>` : ''}
        </div>
      </div>
    `;
  }

  function renderMessages() {
    const box = document.getElementById('lencho-ai-messages');
    if (!box) return;
    box.innerHTML = aiState.messages.map(aiMessageHtml).join('');
    box.scrollTop = box.scrollHeight;
  }

  function setBusy(isBusy) {
    aiState.busy = isBusy;
    const btn = document.getElementById('lencho-ai-send');
    const input = document.getElementById('lencho-ai-input');
    if (btn) {
      btn.disabled = isBusy;
      btn.innerHTML = isBusy ? '<i class="fas fa-spinner fa-spin"></i> Thinking' : '<i class="fas fa-paper-plane"></i> Ask';
    }
    if (input) input.disabled = isBusy;
  }

  function renderSuggestions() {
    const target = document.getElementById('lencho-ai-suggestions');
    if (!target) return;
    const list = aiState.suggestions.length ? aiState.suggestions : [
      'Aaj ka business summary batao',
      'Low stock products dikhao',
      'Woollen collections me kitne products hain?'
    ];
    target.innerHTML = list.map(prompt => `
      <button class="lencho-ai-chip" type="button" onclick="runAdminAiSuggestion('${encodeURIComponent(prompt)}')">${aiEscape(prompt)}</button>
    `).join('');
  }

  async function loadAiStatus() {
    const statusEl = document.getElementById('lencho-ai-status');
    try {
      const status = await adminCachedApi('/api/admin/ai/status');
      if (status?.error) throw new Error(status.error);
      aiState.ready = true;
      aiState.suggestions = Array.isArray(status.suggestedPrompts) ? status.suggestedPrompts : [];
      if (statusEl) {
        statusEl.innerHTML = `
          <span><i class="fas fa-lock"></i> Admin only</span>
          <span><i class="fas fa-eye"></i> Read-only</span>
          <span><i class="fas fa-key"></i> ${status.openAiConfigured ? 'OpenAI ready' : 'Local summaries'}</span>
        `;
      }
      renderSuggestions();
    } catch (error) {
      if (statusEl) statusEl.innerHTML = `<span class="danger"><i class="fas fa-triangle-exclamation"></i> ${aiEscape(error.message || 'AI offline')}</span>`;
      renderSuggestions();
    }
  }

  function getRangeValue() {
    const select = document.getElementById('lencho-ai-range');
    return select ? select.value : 'all';
  }

  async function sendAdminAiMessage(message) {
    const input = document.getElementById('lencho-ai-input');
    const text = String(message || input?.value || '').trim();
    if (!text || aiState.busy) return;
    if (input) input.value = '';
    aiState.messages.push({ role: 'user', text });
    renderMessages();
    setBusy(true);

    try {
      const payload = {
        message: text,
        range: getRangeValue()
      };
      const data = await api('/api/admin/ai/chat', { method: 'POST', body: payload, timeoutMs: 20000 });
      if (data?.error) throw new Error(data.error);
      aiState.messages.push({
        role: 'ai',
        text: data.answer || 'Summary ready hai.',
        cards: data.cards || [],
        table: data.table || null,
        secondaryTable: data.secondaryTable || null,
        completeness: data.completeness || [],
        meta: `${data.toolName || 'tool'} | ${data.provider || 'local'} | read-only`
      });
      renderMessages();
    } catch (error) {
      aiState.messages.push({
        role: 'ai',
        text: `AI summary nahi aa paya: ${error.message || 'Unknown error'}`,
        completeness: ['Admin session, MongoDB connection, ya OpenAI env check karo.']
      });
      renderMessages();
    } finally {
      setBusy(false);
    }
  }

  function renderAdminAiAssistant() {
    const content = document.getElementById('admin-content');
    if (!content) return;
    content.innerHTML = `
      <div class="lencho-ai-shell">
        <section class="lencho-ai-hero">
          <div>
            <span class="lencho-ai-kicker">Lencho Admin AI</span>
            <h2>Ask your store in Hinglish, Hindi, or English</h2>
            <p>Read-only business answers for orders, stock, collections, sales, GST, and website health.</p>
            <div class="lencho-ai-status" id="lencho-ai-status">
              <span><i class="fas fa-spinner fa-spin"></i> Checking access</span>
            </div>
          </div>
          <div class="lencho-ai-orb" aria-hidden="true">
            <span></span>
            <i class="fas fa-wand-magic-sparkles"></i>
          </div>
        </section>

        <section class="lencho-ai-panel">
          <div class="lencho-ai-toolbar">
            <div>
              <label for="lencho-ai-range">Date range</label>
              <select id="lencho-ai-range">
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="last7days">Last 7 days</option>
                <option value="last30days">Last 30 days</option>
                <option value="thisMonth">This month</option>
                <option value="lastMonth">Last month</option>
              </select>
            </div>
            <button class="btn-outline" type="button" onclick="clearAdminAiConversation()"><i class="fas fa-broom"></i> Clear</button>
          </div>

          <div class="lencho-ai-suggestions" id="lencho-ai-suggestions"></div>

          <div class="lencho-ai-messages" id="lencho-ai-messages"></div>

          <div class="lencho-ai-compose">
            <button class="lencho-ai-mic" type="button" title="Voice assistant next phase" disabled><i class="fas fa-microphone"></i></button>
            <textarea id="lencho-ai-input" rows="2" placeholder="Example: Haryana se last 7 days me kitne orders aaye?"></textarea>
            <button id="lencho-ai-send" class="btn-primary" type="button" onclick="sendAdminAiMessage()"><i class="fas fa-paper-plane"></i> Ask</button>
          </div>
        </section>
      </div>
    `;

    aiState.messages = [{
      role: 'ai',
      text: 'Namaste. Main read-only mode me hoon. Orders, stock, collections, sales aur website health ka answer de sakta hoon. Koi delete/refund/publish action yahan se nahi hoga.'
    }];
    renderMessages();
    loadAiStatus();

    const input = document.getElementById('lencho-ai-input');
    if (input) {
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          sendAdminAiMessage();
        }
      });
      setTimeout(() => input.focus(), 80);
    }
  }

  function runAdminAiSuggestion(encodedPrompt) {
    const prompt = decodeURIComponent(encodedPrompt || '');
    sendAdminAiMessage(prompt);
  }

  function clearAdminAiConversation() {
    aiState.messages = [{
      role: 'ai',
      text: 'Conversation clear ho gayi. Fresh question pucho.'
    }];
    renderMessages();
  }

  window.renderAdminAiAssistant = renderAdminAiAssistant;
  window.sendAdminAiMessage = sendAdminAiMessage;
  window.runAdminAiSuggestion = runAdminAiSuggestion;
  window.clearAdminAiConversation = clearAdminAiConversation;
})();
