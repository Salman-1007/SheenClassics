document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotPanel = document.getElementById('chatbot-panel');
    const chatbotClose = document.getElementById('chatbot-close');

    // Store conversation history in session storage for context
    let conversationHistory = [];

    const addMessage = (text, role, source = null) => {
        const message = document.createElement('div');
        message.className = `chatbot-message chatbot-message-${role}`;

        // Parse markdown links [text](url) and convert to HTML
        if (role === 'bot') {
            const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            const htmlText = text.replace(linkRegex, '<a href="$2" target="_blank" style="color: var(--gold); text-decoration: underline; cursor: pointer;">$1</a>');
            message.innerHTML = htmlText.replace(/\n/g, '<br>');

            // Add source indicator for bot messages
            if (source) {
                const sourceSpan = document.createElement('span');
                sourceSpan.style.fontSize = '0.75em';
                sourceSpan.style.color = 'var(--grey)';
                sourceSpan.style.display = 'block';
                sourceSpan.style.marginTop = '0.5em';
                sourceSpan.textContent = `(${source})`;
                message.appendChild(sourceSpan);
            }
        } else {
            message.textContent = text;
        }

        chatHistory.appendChild(message);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Add to conversation history for context
        conversationHistory.push({ role, content: text });
    };

    const addLoadingMessage = () => {
        const message = document.createElement('div');
        message.className = 'chatbot-message chatbot-message-bot chatbot-message-loading';
        message.innerHTML = '<em>Thinking...</em>';
        chatHistory.appendChild(message);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return message;
    };

    const postMessage = async(message) => {
        addMessage(message, 'user');
        const historyForRequest = conversationHistory.slice(0, -1);
        const loadingMessage = addLoadingMessage();
        chatInput.value = '';
        chatInput.disabled = true;

        try {
            // Send conversation history with the message for AI context
            const response = await fetch('/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    history: historyForRequest
                })
            });

            const data = await response.json();
            loadingMessage.remove();

            if (data.success) {
                addMessage(data.reply || 'I did not receive a response.', 'bot');

                // Log tools used for debugging
                if (data.toolsUsed && data.toolsUsed.length > 0) {
                    console.debug('Tools used:', data.toolsUsed);
                }
            } else {
                addMessage(data.reply || 'I did not receive a response.', 'bot');
            }
        } catch (error) {
            loadingMessage.remove();
            addMessage('Unable to reach the assistant. Please try again.', 'bot');
            console.error('Chatbot request failed:', error);
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    };

    // Toggle chatbot panel
    if (chatbotToggle) {
        chatbotToggle.addEventListener('click', () => {
            const isActive = chatbotPanel.classList.toggle('active');
            if (isActive) {
                // Show greeting if history is empty
                if (chatHistory.children.length === 0) {
                    addMessage('Hi! I am the SheenClassics assistant. Ask me about products, orders, shipping, returns, or styling ideas.', 'bot');
                }
                // Focus input after a short delay to ensure panel is rendered
                setTimeout(() => {
                    chatInput.focus();
                }, 100);
            }
        });
    }

    // Close chatbot panel
    if (chatbotClose) {
        chatbotClose.addEventListener('click', (e) => {
            e.stopPropagation();
            chatbotPanel.classList.remove('active');
        });
    }

    // Close on outside click
    document.addEventListener('click', (event) => {
        if (!chatbotPanel.contains(event.target) && !chatbotToggle.contains(event.target)) {
            chatbotPanel.classList.remove('active');
        }
    });

    // Handle form submission
    if (chatForm) {
        chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const message = chatInput.value.trim();
            if (!message) return;
            postMessage(message);
        });
    }

    // Allow keyboard interaction
    if (chatInput) {
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    }
});
