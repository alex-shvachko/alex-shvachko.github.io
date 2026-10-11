document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Sample responses for the bot
    const botResponses = [
        "I'm here to help with any questions about Alex's work and services.",
        "That's an interesting question! Let me think about that...",
        "I can provide more information about Alex's projects and skills.",
        "Feel free to ask me anything about web development, design, or automation.",
        "I'm still learning, but I'll do my best to answer your questions!"
    ];

    // Function to add a message to the chat
    function addMessage(text, isBot = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${isBot ? '🤖' : '👤'}</div>
            <div class="message-content">
                <div class="message-sender">${isBot ? 'AI Assistant' : 'You'}</div>
                <div class="message-text">${text}</div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to simulate bot typing
    function showTypingIndicator(show) {
        typingIndicator.style.display = show ? 'flex' : 'none';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to get a random response from the bot
    function getBotResponse() {
        return botResponses[Math.floor(Math.random() * botResponses.length)];
    }

    // Function to handle user input
    function handleUserInput() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, false);
        userInput.value = '';
        
        // Show typing indicator
        showTypingIndicator(true);
        
        // Simulate bot thinking
        setTimeout(() => {
            showTypingIndicator(false);
            
            // Add bot response
            setTimeout(() => {
                const response = getBotResponse();
                addMessage(response, true);
            }, 300);
        }, 1000 + Math.random() * 2000);
    }

    // Event listeners
    sendButton.addEventListener('click', handleUserInput);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    // Add initial bot message if chat is empty
    if (chatMessages.children.length === 0) {
        setTimeout(() => {
            addMessage("Hi there! I'm your AI assistant. How can I help you today?", true);
        }, 500);
    }
});
