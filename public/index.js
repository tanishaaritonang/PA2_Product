// index.js
const button = document.getElementById('submit-btn');
const userInput = document.getElementById('user-input');
const chatbotConversation = document.getElementById('chatbot-conversation-container');
const recentChatsContainer = document.getElementById('recent-chats-container');
const sidebarToggle = document.getElementById('sidebar-toggle');
const clearChatBtn = document.getElementById('clear-chat-btn'); // Get the clear chat button

// Generate a session ID when the page loads
let sessionId = Date.now().toString();

// Add event listener for the clear chat button
// clearChatBtn.addEventListener('click', clearChat);

// Function to clear the chat
function clearChat() {
    // Generate a new session ID
    sessionId = Date.now().toString();
    
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
            <h2>Hello! I Am Anaques Ready To Help You Explore and Wonder</h2>
            <p>Ask me anything what's on your mind.</p>
            <p>Am here to assist you!</p>
        </div>
        <div class="popular-prompts-container" id="popular-prompts-container"></div>
    `;
    
    // Refresh popular prompts
    fetchPopularPrompts();
    
    // Also call the backend clear-chat endpoint (optional)
    fetch('http://localhost:3000/clear-chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: sessionId })
    })
    .catch(error => {
        console.error('Error clearing chat on server:', error);
    });
}

// Function to restore a specific chat
function restoreChat(chatId) {
    const recentChats = JSON.parse(localStorage.getItem('recentChats') || '[]');
    const chat = recentChats.find(c => c.id === parseInt(chatId));
    
    if (chat) {
        // Clear current conversation
        chatbotConversation.innerHTML = '';
  
        // Add restored messages
        addMessageToUI(chat.question, 'human');
        addMessageToUI(chat.response, 'ai');
    }
}

// Fetch popular prompts from the server
async function fetchPopularPrompts() {
    try {
        const response = await fetch('http://localhost:3000/popular-prompts');
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
        const response = await fetch('http://localhost:3000/chat', {
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

// Modified addMessageToUI function with typing animation
// Modified addMessageToUI function with enhanced typing animation and loading indicator
function addMessageToUI(message, sender, isError = false) {
    const newSpeechBubble = document.createElement("div");
    newSpeechBubble.classList.add("speech", `speech-${sender}`);
    if (isError) {
        newSpeechBubble.classList.add("error");
    }
    chatbotConversation.appendChild(newSpeechBubble);
    
    // If it's an AI message, add typing animation
    if (sender === 'ai') {
        // Add typing indicator with 3 dots
        newSpeechBubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        
        // Wait a bit with the typing indicator visible
        setTimeout(() => {
            // Start typing animation
            typeMessage(message, newSpeechBubble);
        }, 1500); // Show the dots for 1.5 seconds before starting to type
    } else {
        // For human messages, just display immediately
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

// Toggle sidebar function
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("collapsed");
}

// Load recent chats and popular prompts on page load
document.addEventListener('DOMContentLoaded', () => {
    // Get the clear chat button reference after DOM is loaded
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChat);
    }
    
    fetchPopularPrompts();
});