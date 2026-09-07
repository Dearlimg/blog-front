(() => {
  const $ = id => document.getElementById(id);
  const state = { session: '', run: '', owner: '', epoch: 0, sessions: [], seen: new Set() };
  try { state.sessions = JSON.parse(localStorage.getItem('durlim-agent-sessions') || '[]').slice(0, 20); } catch {}
  const welcome = $('welcome').cloneNode(true);

  async function api(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.owner) headers.Authorization = 'Bearer ' + state.owner;
    const response = await fetch('/api/v1/agent' + path, {
      method: body === undefined ? 'GET' : 'POST', headers,
      body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    return data;
  }

  function status(text, error = false) { $('run-status').textContent = text; $('run-status').classList.toggle('error', error); }
  function safeURL(raw) { try { const u = new URL(raw); return ['http:', 'https:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
  function renderText(parent, text) {
    const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      parent.append(document.createTextNode(text.slice(offset, match.index)));
      const href = safeURL(match[2]);
      if (href) { const a = document.createElement('a'); a.textContent = match[1]; a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; parent.append(a); }
      else parent.append(document.createTextNode(match[0]));
      offset = match.index + match[0].length;
    }
    parent.append(document.createTextNode(text.slice(offset)));
  }
  function message(role, text, sources = []) {
    $('welcome')?.remove();
    const article = document.createElement('article'); article.className = 'message ' + role;
    const speaker = document.createElement('div'); speaker.className = 'speaker'; speaker.textContent = role === 'user' ? '你' : 'Durlim · AI';
    const body = document.createElement('div'); body.className = 'body'; renderText(body, text);
    article.append(speaker, body);
    const unique = new Map(sources.map(source => [source.url, source]));
    if (unique.size) {
      const list = document.createElement('div'); list.className = 'sources';
      for (const source of unique.values()) { const href = safeURL(source.url); if (!href) continue; const a = document.createElement('a'); a.href = href; a.textContent = source.title; a.target = '_blank'; a.rel = 'noopener noreferrer'; list.append(a); }
      article.append(list);
    }
    $('conversation').append(article); article.scrollIntoView({ block: 'end' });
  }
  function busy(value) { $('send').hidden = value; $('cancel').hidden = !value; $('new-chat').disabled = value; $('prompt').disabled = value; }
  function listSessions() {
    $('sessions').replaceChildren();
    for (const session of state.sessions) {
      const button = document.createElement('button'); button.textContent = session.title;
      if (session.id === state.session) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', () => { if (!state.run) selectSession(session.id); });
      $('sessions').append(button);
    }
  }
  async function selectSession(id) {
    const epoch = ++state.epoch;
    try {
      const session = await api('/sessions/' + id);
      if (epoch !== state.epoch) return;
      state.session = id; state.seen.clear(); $('conversation').replaceChildren();
      session.messages.forEach(m => message(m.role, m.content));
      if (!session.messages.length) $('conversation').append(welcome.cloneNode(true));
      renderApprovals(session.approvals); listSessions();
      if (session.active_run) { state.run = session.active_run; busy(true); poll(state.run, epoch); }
    } catch (error) { status(error.message, true); }
  }
  function renderApprovals(items) {
    $('approvals').replaceChildren();
    for (const item of items) {
      const box = document.createElement('div'); box.className = 'approval';
      const title = document.createElement('strong'); title.textContent = '待确认操作：' + item.tool;
      const pre = document.createElement('pre'); pre.textContent = JSON.stringify(item.arguments, null, 2);
      box.append(title, pre);
      for (const [label, allow] of [['允许', true], ['拒绝', false]]) {
        const button = document.createElement('button'); button.textContent = label; button.disabled = !!state.run;
        button.addEventListener('click', async () => {
          box.querySelectorAll('button').forEach(b => b.disabled = true);
          try { const result = await api('/sessions/' + state.session + '/approvals/' + item.id, { allow }); box.remove(); status(result.status === 'failed' ? '操作未完成：' + result.result : allow ? '已确认执行。可继续对话。' : '已拒绝操作。', result.status === 'failed'); }
          catch (error) { status(error.message, true); box.querySelectorAll('button').forEach(b => b.disabled = false); }
        }); box.append(button);
      }
      $('approvals').append(box);
    }
  }
  async function poll(id, epoch) {
    try {
      const run = await api('/runs/' + id);
      if (epoch !== state.epoch) return;
      $('activity').hidden = !run.events.length;
      $('events').replaceChildren(...run.events.map(event => { const li = document.createElement('li'); li.textContent = event.type + (event.text.trim() ? ' · ' + event.text : ''); return li; }));
      if (run.status === 'running') { status('正在思考与查证…'); setTimeout(() => poll(id, epoch), 1300); return; }
      state.run = ''; busy(false);
      if (!state.seen.has(id)) { state.seen.add(id); if (run.answer) message('assistant', run.answer, run.sources); }
      status(run.status === 'completed' ? '' : run.error || run.status, run.status !== 'completed');
      const session = await api('/sessions/' + state.session); renderApprovals(session.approvals);
      $('todos').replaceChildren(...session.todos.map(todo => { const li = document.createElement('li'); li.textContent = todo.status + ' · ' + todo.content; return li; }));
    } catch (error) { if (epoch !== state.epoch) return; status(error.message + '，正在重连…', true); setTimeout(() => poll(id, epoch), 4000); }
  }
  $('chat-form').addEventListener('submit', async event => {
    event.preventDefault(); if (state.run) return;
    const text = $('prompt').value.trim(); if (!text) return;
    busy(true);
    try {
      if (!state.session) {
        const session = await api('/sessions', {}); state.session = session.id;
        if (!state.owner) { state.sessions.unshift({ id: session.id, title: text.slice(0, 24) }); state.sessions = state.sessions.slice(0, 20); localStorage.setItem('durlim-agent-sessions', JSON.stringify(state.sessions)); }
        listSessions();
      }
      const goal = $('goal-mode').checked ? $('goal').value.trim() : '';
      if ($('goal-mode').checked && !goal) throw new Error('请填写目标完成标准');
      const result = await api('/sessions/' + state.session + '/messages', { message: text, goal });
      message('user', text); $('prompt').value = ''; state.run = result.run_id; poll(state.run, state.epoch);
    } catch (error) { busy(false); status(error.message, true); }
  });
  $('cancel').addEventListener('click', async () => { try { await api('/runs/' + state.run + '/cancel', {}); status('正在停止…'); } catch (e) { status(e.message, true); } });
  $('goal-mode').addEventListener('change', () => { $('goal').hidden = !$('goal-mode').checked; });
  $('new-chat').addEventListener('click', () => { if (state.run) return; state.epoch++; state.session = ''; $('conversation').replaceChildren(welcome.cloneNode(true)); $('approvals').replaceChildren(); $('activity').hidden = true; status(''); listSessions(); });
  $('conversation').addEventListener('click', event => { const button = event.target.closest('[data-prompt]'); if (button) { $('prompt').value = button.dataset.prompt; $('prompt').focus(); } });
  $('prompt').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } });
  $('owner-toggle').addEventListener('click', () => $('owner-dialog').showModal());
  $('owner-login').addEventListener('submit', async event => {
    event.preventDefault(); state.owner = $('owner-token').value; $('owner-token').value = '';
    try { const info = await api('/info'); if (!info.owner) throw new Error('令牌无效'); $('owner-tools').hidden = false; $('owner-login').hidden = true; $('owner-status').textContent = '已连接。令牌仅保存在当前页面内存。'; state.session = ''; state.epoch++; await ownerRefresh(); }
    catch (e) { state.owner = ''; $('owner-status').textContent = e.message; }
  });
  $('owner-logout').addEventListener('click', () => location.reload());
  async function ownerRefresh() {
    try { const data = await api('/owner/state'); $('owner-jobs').replaceChildren(); for (const job of data.jobs) { const row = document.createElement('div'); row.className = 'job'; row.textContent = job.prompt + '\n' + job.status + (job.cron ? ' · ' + job.cron : ''); const button = document.createElement('button'); button.textContent = '取消'; button.disabled = job.status !== 'active'; button.addEventListener('click', async () => { try { await ownerTool('job_cancel', { id: job.id }); ownerRefresh(); } catch(e) { $('owner-status').textContent = e.message; } }); row.append(button); $('owner-jobs').append(row); } }
    catch (e) { $('owner-status').textContent = e.message; }
  }
  async function ownerTool(name, args) { if (!state.session) state.session = (await api('/sessions', {})).id; return api('/owner/tools/' + name, { session_id: state.session, arguments: args }); }
  $('owner-refresh').addEventListener('click', ownerRefresh);
  $('job-form').addEventListener('submit', async event => {
    event.preventDefault();
    try { const cron = $('job-cron').value.trim(); const result = await ownerTool(cron ? 'schedule_cron' : 'background_start', { prompt: $('job-prompt').value, cron }); if (result.error) throw new Error(result.error); $('owner-status').textContent = result.status === 'approval_required' ? '定时任务等待对话页中的确认。' : '后台任务已创建。'; if (result.status === 'approval_required') { const session = await api('/sessions/' + state.session); renderApprovals(session.approvals); } await ownerRefresh(); }
    catch (e) { $('owner-status').textContent = e.message; }
  });
  listSessions();
  api('/info').then(info => { $('connection').textContent = info.configured ? 'DeepSeek · 在线' : '服务未配置'; if (!info.configured) $('send').disabled = true; }).catch(() => { $('connection').textContent = '连接不可用'; });
})();
