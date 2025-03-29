// index.js
const button = document.getElementById('submit-btn');
const userInput = document.getElementById('user-input');
const chatbotConversation = document.getElementById('chatbot-conversation-container');
const recentChatsContainer = document.getElementById('recent-chats-container');
const clearChatsBtn = document.getElementById('clear-chats-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');



// Generate a session ID when the page loads
let sessionId = Date.now().toString();



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

// Clear chats button


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

        
        // Refresh popular prompts after successful message
        fetchPopularPrompts();

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

// Toggle sidebar function
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("collapsed");
}

// Load recent chats and popular prompts on page load
document.addEventListener('DOMContentLoaded', () => {
 
    fetchPopularPrompts();
});