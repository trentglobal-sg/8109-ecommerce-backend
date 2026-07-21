const form = document.getElementById('chat-form');
const input = document.getElementById('message');
const messages = document.getElementById('messages');

function addMessage(type, text) {
    const message = document.createElement('div');
    message.className = 'message rounded p-2 mb-2 ' + type;

    if (type === 'agent') {
        message.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
        message.textContent = text;
    }

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}

async function sendMessage(event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addMessage('admin', message);
    input.value = '';

    const response = await axios.post('/admin/chat', {
        message: message
    });
    addMessage('agent', response.data.response || response.data.error);
}

form.addEventListener('submit', sendMessage);
