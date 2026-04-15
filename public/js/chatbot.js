document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotPanel = document.getElementById('chatbot-panel');
    const chatbotClose = document.getElementById('chatbot-close');

    const addMessage = (text, role) => {
        const message = document.createElement('div');
        message.className = `chatbot-message chatbot-message-${role}`;

        // Parse markdown links [text](url) and convert to HTML
        if (role === 'bot') {
            const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            const htmlText = text.replace(linkRegex, '<a href="$2" target="_blank" style="color: var(--gold); text-decoration: underline; cursor: pointer;">$1</a>');
            message.innerHTML = htmlText.replace(/\n/g, '<br>');
        } else {
            message.textContent = text;
        }

        chatHistory.appendChild(message);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    const postMessage = async(message) => {
        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.disabled = true;

        try {
            const response = await fetch('/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            addMessage(data.reply || 'I did not receive a response.', 'bot');
        } catch (error) {
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
                    addMessage('Hello! I can help you find products, track orders, apply coupons, and answer shipping questions. Try asking: "Show me dresses under 3000"', 'bot');
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