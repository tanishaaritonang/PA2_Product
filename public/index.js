// index.js
const button = document.getElementById('submit-btn');
const userInput = document.getElementById('user-input');
const chatbotConversation = document.getElementById('chatbot-conversation-container');
const recentChatsContainer = document.getElementById('recent-chats-container');
const clearChatBtn = document.getElementById('clear-chat-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');

// Generate a session ID when the page loads or get from localStorage
let sessionId = localStorage.getItem('currentSessionId') || Date.now().toString();
localStorage.setItem('currentSessionId', sessionId);

// Toggle sidebar visibility
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
    });
}

// Add event listener for the clear chat button
if (clearChatBtn) {
    clearChatBtn.addEventListener('click', clearChat);
}

// Function to clear the chat
function clearChat() {
    // Generate a new session ID
    sessionId = Date.now().toString();
    localStorage.setItem('currentSessionId', sessionId);
    
    // Clear the UI
    chatbotConversation.innerHTML = '';
    
    // Add back the default welcome message
    chatbotConversation.innerHTML = `
        <div class="default-text">
            <img
              src="./img/logo.png"
              alt="Anaques Logo"
              style="
                width: 200px;
                height: auto;
                display: block;
                margin: 10px auto;
              "
            />
            <h2>Hello! I Am TanyaBot Ready To Help You Explore and Wonder</h2>
            <p>Ask me anything what's on your mind.</p>
            <p>I Am here to assist you!</p>
        </div>
        <div class="popular-prompts-container" id="popular-prompts-container"></div>
    `;
    
    // Refresh popular prompts
    fetchPopularPrompts();
}

// Function to fetch chat sessions
async function fetchChatSessions() {
    try {
        const response = await fetch('/chat-sessions', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const sessions = await response.json();
        renderChatSessions(sessions);
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        recentChatsContainer.innerHTML = `
            <div class="no-history">
                Unable to load chat history
            </div>
        `;
    }
}

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// Function to render chat sessions in sidebar
function renderChatSessions(sessions) {
    recentChatsContainer.innerHTML = '';
    
    if (sessions.length === 0) {
        recentChatsContainer.innerHTML = `
            <div class="no-history">
                No chat history yet
            </div>
        `;
        return;
    }
    
    sessions.forEach(session => {
        const sessionElement = document.createElement('div');
        sessionElement.classList.add('chat-session-item');
        
        // Mark the current session as active
        if (session.id === sessionId) {
            sessionElement.classList.add('active');
        }
        
        // Get the first question as preview text
        const previewText = session.preview || 'Chat session';
        
        sessionElement.innerHTML = `
            <div class="chat-session-date">${formatDate(session.created_at)}</div>
            <div class="chat-session-preview">${previewText}</div>
        `;
        
        // Add click event to load this chat session
        sessionElement.addEventListener('click', () => loadChatSession(session.id));
        
        recentChatsContainer.appendChild(sessionElement);
    });
}

// Function to load a specific chat session
async function loadChatSession(id) {
    try {
        // Update active session in UI
        document.querySelectorAll('.chat-session-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.sessionId === id) {
                item.classList.add('active');
            }
        });
        
        // Store the current session ID
        sessionId = id;
        localStorage.setItem('currentSessionId', sessionId);
        
        // Fetch all messages for this session
        const response = await fetch(`/session-messages/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const messages = await response.json();
        
        // Clear current conversation
        chatbotConversation.innerHTML = '';
        
        // Remove default text if present
        const defaultText = chatbotConversation.querySelector('.default-text');
        if (defaultText) {
            defaultText.remove();
        }
        
        // Add all messages to the UI
        messages.forEach(message => {
            const sender = message.message_type === 'question' ? 'human' : 'ai';
            addMessageToUI(message.body, sender, false, false); // Don't animate past messages
        });
        
        // Scroll to bottom
        chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
        
    } catch (error) {
        console.error('Error loading chat session:', error);
        addMessageToUI('Error loading chat history. Please try again.', 'ai', true, false);
    }
}

// Fetch popular prompts from the server
async function fetchPopularPrompts() {
    try {
        const response = await fetch('/popular-prompts');
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const prompts = await response.json();
        renderPopularPrompts(prompts);
    } catch (error) {
        console.error('Error fetching popular prompts:', error);
    }
}

// Render popular prompts as buttons
function renderPopularPrompts(prompts) {
    const container = document.getElementById('popular-prompts-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    prompts.forEach(prompt => {
        const button = document.createElement('button');
        button.classList.add('popular-prompt-btn');
        button.textContent = prompt;
        button.addEventListener('click', () => {
            userInput.value = prompt;
            userInput.focus();
        });
        container.appendChild(button);
    });
}

button.addEventListener("click", (e) => {
    e.preventDefault();
    handleUserMessage();
});

// Handle Enter key press
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleUserMessage();
    }
});

async function handleUserMessage() {
    const question = userInput.value;
    if (!question.trim()) return; // Don't send empty messages
    
    userInput.value = ""; // Clear input field
    button.disabled = true; // Disable button during request
    
    // Remove default text but keep existing messages
    const defaultText = chatbotConversation.querySelector(".default-text");
    if (defaultText) {
        defaultText.remove();
    }
    
    // Add human message to UI
    addMessageToUI(question, 'human');
    
    // Add AI loading message immediately
    const loadingBubble = document.createElement("div");
    loadingBubble.classList.add("speech", "speech-ai");
    loadingBubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatbotConversation.appendChild(loadingBubble);
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question,
                sessionId // Send sessionId with each request
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const responseData = await response.json();
        
        // Remove loading message
        chatbotConversation.removeChild(loadingBubble);
        
        // Add AI response to UI with typing animation
        addMessageToUI(responseData, 'ai');
        
        // Refresh chat sessions after a message is sent
        fetchChatSessions();
        
        // Refresh popular prompts after successful message
        fetchPopularPrompts();

    } catch (error) {
        console.error('Error fetching data:', error);
        // Remove loading message
        chatbotConversation.removeChild(loadingBubble);
        // Show error message in UI
        addMessageToUI('Sorry, I encountered an error. Please try again.', 'ai', true);
    } finally {
        button.disabled = false; // Re-enable button
    }
}

// Modified addMessageToUI function with typing animation option
function addMessageToUI(message, sender, isError = false, animate = true) {
    const newSpeechBubble = document.createElement("div");
    newSpeechBubble.classList.add("speech", `speech-${sender}`);
    if (isError) {
        newSpeechBubble.classList.add("error");
    }
    chatbotConversation.appendChild(newSpeechBubble);
    
    // If it's an AI message and we want animation, add typing animation
    if (sender === 'ai' && animate) {
        // Add typing indicator with 3 dots
        newSpeechBubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        
        // Wait a bit with the typing indicator visible
        setTimeout(() => {
            // Start typing animation
            typeMessage(message, newSpeechBubble);
        }, 1000); // Show the dots for 1 second before starting to type
    } else {
        // For human messages or non-animated AI messages, just display immediately
        newSpeechBubble.textContent = message;
    }
    
    // Scroll to bottom
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
}

// Function to simulate typing animation
function typeMessage(message, element) {
    let i = 0;
    const typingSpeed = 10; // Milliseconds per character
    
    // Clear the typing indicator but keep the element
    element.innerHTML = '';
    
    // Create a typing animation
    const typingInterval = setInterval(() => {
        if (i < message.length) {
            element.textContent += message.charAt(i);
            i++;
            
            // Scroll to bottom with each character
            chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
        } else {
            clearInterval(typingInterval);
            
            // Scroll to bottom again when done
            chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
        }
    }, typingSpeed);
}

// Load chat sessions and popular prompts on page load
document.addEventListener('DOMContentLoaded', () => {
    // Fetch chat history for the sidebar
    fetchChatSessions();
    
    // Fetch popular prompts
    fetchPopularPrompts();
});