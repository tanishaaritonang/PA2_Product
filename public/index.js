// index.js
const button = document.getElementById('submit-btn');
const userInput = document.getElementById('user-input');
const chatbotConversation = document.getElementById('chatbot-conversation-container');
const recentChatsContainer = document.getElementById('recent-chats-container');
const clearChatsBtn = document.getElementById('clear-chats-btn');

// Generate a session ID when the page loads
let sessionId = Date.now().toString();

// Function to save recent chats to localStorage
function saveRecentChat(question, response) {
    const recentChats = JSON.parse(localStorage.getItem('recentChats') || '[]');
    const newChat = {
        id: Date.now(),
        question,
        response,
        timestamp: new Date().toLocaleString()
    };
    recentChats.unshift(newChat);
    
    // Keep only last 10 chats
    const limitedChats = recentChats.slice(0, 10);
    localStorage.setItem('recentChats', JSON.stringify(limitedChats));
    
    renderRecentChats();
}

// Function to render recent chats in sidebar
function renderRecentChats() {
    const recentChats = JSON.parse(localStorage.getItem('recentChats') || '[]');
    recentChatsContainer.innerHTML = recentChats.map(chat => `
        <div class="recent-chat-item" data-id="${chat.id}">
            <p>${chat.question}</p>
            <small>${chat.timestamp}</small>
        </div>
    `).join('');

    // Add click event to restore chat
    document.querySelectorAll('.recent-chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.getAttribute('data-id');
            restoreChat(chatId);
        });
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

// Clear chats button
clearChatsBtn.addEventListener('click', () => {
    localStorage.removeItem('recentChats');
    recentChatsContainer.innerHTML = '';
    chatbotConversation.innerHTML = `
        <div class="default-text">
            <h1>Anaques</h1>
            <img src="logo.png" alt="Anaques Logo" style="width: 200px; height: auto; display: block; margin: 10px auto;">
            <h2>Hello! I Am Ready To Help You Explore and Wonder</h2>
            <p>Ask me anything what’s on your mind.</p>
            <p> Am here to assist you!</p>
        </div>
    `;
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
        
        // Add AI response to UI
        addMessageToUI(responseData, 'ai');

        // Save to recent chats
        saveRecentChat(question, responseData);

    } catch (error) {
        console.error('Error fetching data:', error);
        // Show error message in UI
        addMessageToUI('Sorry, I encountered an error. Please try again.', 'ai', true);
    } finally {
        button.disabled = false; // Re-enable button
    }
}

function addMessageToUI(message, sender, isError = false) {
    const newSpeechBubble = document.createElement("div");
    newSpeechBubble.classList.add("speech", `speech-${sender}`);
    if (isError) {
        newSpeechBubble.classList.add("error");
    }
    chatbotConversation.appendChild(newSpeechBubble);
    newSpeechBubble.textContent = message;
    
    // Scroll to bottom
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
}

// Load recent chats on page load
renderRecentChats();


