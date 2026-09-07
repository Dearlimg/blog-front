document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('messageForm');
  const list = document.getElementById('messagesList');
  const refresh = document.getElementById('refreshMessages');
  const submit = form.querySelector('.submit-btn');
  let loading = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function createMessage(message) {
    const item = element('article', 'message-item', '');
    const header = element('div', 'message-header', '');
    const date = new Date(message.create_at);
    const formattedDate = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    header.append(element('span', 'message-author', message.name || 'Anonymous'));
    const time = element('time', 'message-date', formattedDate);
    if (formattedDate) time.dateTime = date.toISOString();
    header.append(time);
    item.append(header, element('p', 'message-content', message.content || ''));
    const meta = element('div', 'message-meta', '');
    if (message.email) meta.append(element('span', 'meta-email', message.email));
    if (message.ip) meta.append(element('span', 'meta-ip', 'IP ' + message.ip));
    item.append(meta);
    return item;
  }

  async function loadMessages() {
    if (loading) return;
    loading = true;
    refresh.disabled = true;
    list.setAttribute('aria-busy', 'true');
    list.replaceChildren(element('div', 'message-loading', 'Loading messages...'));
    try {
      const response = await API.get('/messages');
      if (!Array.isArray(response.data)) throw new Error('Invalid message response');
      list.replaceChildren(...response.data.map(createMessage));
      if (!response.data.length) list.append(element('div', 'no-messages', 'A quiet corner for a conversation. Leave the first note.'));
    } catch {
      const error = element('div', 'message-error', 'Messages are unavailable right now.');
      const retry = element('button', 'retry-messages', 'Try again');
      retry.id = 'retry-messages';
      retry.type = 'button';
      retry.addEventListener('click', loadMessages);
      error.append(retry);
      list.replaceChildren(error);
    } finally {
      loading = false;
      refresh.disabled = false;
      list.setAttribute('aria-busy', 'false');
    }
  }

  function notify(text, type) {
    form.parentElement.querySelector('.form-notification')?.remove();
    const notice = element('div', 'form-notification message-' + type, text);
    notice.setAttribute('role', type === 'error' ? 'alert' : 'status');
    form.before(notice);
  }

  refresh.addEventListener('click', loadMessages);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const data = new FormData(form);
    const content = String(data.get('message') || '').trim();
    if (!content) {
      notify('Please write a message before sending.', 'error');
      form.elements.message.focus();
      return;
    }
    const original = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = 'Sending...';
    try {
      await API.post('/messages', {
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        content,
      });
      form.reset();
      notify('Thank you. Your message has been sent.', 'success');
      await loadMessages();
    } catch {
      notify('Your message could not be sent. Please try again.', 'error');
    } finally {
      submit.innerHTML = original;
      submit.disabled = false;
    }
  });
  loadMessages();
});
