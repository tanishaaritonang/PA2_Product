// index.js
const button = document.getElementById("submit-btn");
const userInput = document.getElementById("user-input");
const chatbotConversation = document.getElementById(
  "chatbot-conversation-container"
);
const recentChatsContainer = document.getElementById("recent-chats-container");
const clearChatBtn = document.getElementById("clear-chat-btn");
const sidebarToggle1 = document.getElementById("sidebar-toggle1");
const sidebarToggle = document.getElementById("sidebar-toggle");
const userBtn = document.getElementById("user-btn");
const dropdownContent = document.getElementById("dropdown-content");
const logoutBtn = document.getElementById("logout-btn");
const userEmailShort = document.getElementById("user-email-short");
const userEmailFull = document.getElementById("user-email-full");
const newChatDesktop = document.getElementById("new-chat-desktop");
const newChatMobile = document.getElementById("new-chat-mobile");

sidebarToggle.addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  const chatbotWrapper = document.getElementById("chatbot-wrapper");
  sidebar.classList.toggle("collapsed");
  chatbotWrapper.classList.toggle("collapsed");
  sidebarToggle.classList.toggle("collapsed");
});

// Generate a session ID when the page loads or get from localStorage
let sessionId = Date.now().toString();

// Get user information on page load
async function fetchUserInfo() {
  try {
    const response = await fetch("/user-info", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const userData = await response.json();

    // Update UI with user email
    if (userData.email) {
      // Set full email in dropdown
      userEmailFull.textContent = userData.email;

      // Set shortened email or username in button
      // const shortEmail = userData.email.split('@')[0];
      // userEmailShort.textContent = shortEmail.length > 10 ? shortEmail.substring(0, 10) + '...' : shortEmail;

      // Set first letter as user icon
      const userIcon = document.querySelector(".user-icon");
      if (userIcon) {
        // Get first two letters and convert to uppercase
        userIcon.textContent = userData.email.substring(0, 2).toUpperCase();
      }
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
    // Handle error gracefully - perhaps leave as "User"
  }
}

// Toggle user dropdown
if (userBtn) {
  userBtn.addEventListener("click", () => {
    dropdownContent.classList.toggle("show");
  });

  // Close the dropdown when clicking outside of it
  window.addEventListener("click", (event) => {
    if (
      !event.target.matches(".user-btn") &&
      !event.target.parentNode.matches(".user-btn")
    ) {
      if (dropdownContent.classList.contains("show")) {
        dropdownContent.classList.remove("show");
      }
    }
  });
}

const handleLogout = () => {
  // Perform logout action
  fetch("/logout", {
    method: "POST",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      // clear session ID from localStorage
      sessionId = null;
      // remove session ID from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("sessionId");
      window.history.pushState({}, "", url);

      window.location.href = "/login"; // Redirect to login page
    })
    .catch((error) => {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    });
};

if (logoutBtn) {
  logoutBtn.addEventListener("click", handleLogout);
}

// Add event listener for the clear chat button
if (clearChatBtn) {
  clearChatBtn.addEventListener("click", clearInputText);
}


// Function to clear the chat
function clearChat() {
  // Generate a new session ID
  sessionId = Date.now().toString();

  // remove the session ID from the URL
  const url = new URL(window.location.href);
  url.searchParams.delete("sessionId");
  window.history.pushState({}, "", url);

  // Clear the UI
  chatbotConversation.innerHTML = "";

  // Add back the default welcome message
  chatbotConversation.innerHTML = `
            <div class="default-text">
          <img src="./img/logo.png" alt="Anaques Logo" style="width: 100px; display: block; margin: 10px auto;" />
          <h2>🌟 Halo! Aku TanyaBot🌟</h2>
          <p>Ayo jelajahi dunia bersama! 🚀</p>
          <br />
          <h3>Pertanyaan yang paling populer 🎈👇</h3>
        </div>
        <div class="popular-prompts-container" id="popular-prompts-container"></div>
    `;

  showWelcomeAnimation("./img/welcome.png");
  // Refresh popular prompts
  fetchPopularPrompts();
  // Refresh chat sessions
  fetchChatSessions();

}

document.getElementById("sidebar-toggle").addEventListener("click", function () {
  document.getElementById("sidebar").classList.toggle("active");
});

// Function to fetch chat sessions
async function fetchChatSessions() {
  try {
    const response = await fetch("/chat-sessions", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const sessions = await response.json();
    renderChatSessions(sessions);
    renderCurrentSession();
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    recentChatsContainer.innerHTML = `
            <div class="no-history">
                Unable to load chat history
            </div>
        `;
  }
}

function renderCurrentSession() {
  let currentSessionId;
  // get the current session ID from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get("sessionId");
  if (urlSessionId) {
    currentSessionId = urlSessionId;
  }

  if (!currentSessionId) return;
  loadChatSession(currentSessionId);
}

// Function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Function to render chat sessions in sidebar
function renderChatSessions(sessions) {
  recentChatsContainer.innerHTML = "";

  if (sessions.length === 0) {
    recentChatsContainer.innerHTML = `
            <div class="no-history">
                No chat history yet
            </div>
        `;
    return;
  }

  sessions.forEach((session) => {
    const sessionElement = document.createElement("div");
    sessionElement.classList.add("chat-session-item");
    sessionElement.dataset.sessionId = session.id;

    // Mark the current session as active
    if (session.id === sessionId) {
      sessionElement.classList.add("active");
    }

    // Get the first question as preview text
    const previewText = session.preview || "Chat session";

    sessionElement.innerHTML = `
            <div class="chat-session-date">${formatDate(
      session.created_at
    )}</div>
            <div class="chat-session-preview">${previewText}</div>
        `;

    // Add click event to load this chat session
    sessionElement.addEventListener("click", () => loadChatSession(session.id));

    recentChatsContainer.appendChild(sessionElement);
  });
}

// Function to load a specific chat session
async function loadChatSession(id) {
  try {
    // Update active session in UI
    document.querySelectorAll(".chat-session-item").forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.sessionId === id) {
        item.classList.add("active");
      }
    });

    // Store the current session ID
    sessionId = id;

    // add session ID to the URL query string
    const url = new URL(window.location.href);
    url.searchParams.set("sessionId", sessionId);
    window.history.pushState({}, "", url);

    // Fetch all messages for this session
    const response = await fetch(`/session-messages/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const messages = await response.json();

    // Clear current conversation
    chatbotConversation.innerHTML = "";

    // Remove default text if present
    const defaultText = chatbotConversation.querySelector(".default-text");
    if (defaultText) {
      defaultText.remove();
    }

    // Add all messages to the UI
    messages.forEach((message) => {
      const sender = message.message_type === "question" ? "human" : "ai";
      addMessageToUI(message.body, sender, false, false); // Don't animate past messages
    });

    // Scroll to bottom
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
  } catch (error) {
    console.error("Error loading chat session:", error);
    addMessageToUI(
      "Error loading chat history. Please try again.",
      "ai",
      true,
      false
    );
  }
}

// Fetch popular prompts from the server
async function fetchPopularPrompts() {
  try {
    const response = await fetch("/popular-prompts");
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const data = await response.json();
    const prompts = data.map((item) => item.prompt); // Extract only prompts

    renderPopularPrompts(prompts);
  } catch (error) {
    console.error("Error fetching popular prompts:", error);
  }
}

// Render popular prompts as buttons
function renderPopularPrompts(prompts) {
  const container = document.getElementById("popular-prompts-container");
  if (!container) return;

  container.innerHTML = "";

  prompts.forEach((prompt) => {
    const button = document.createElement("button");
    button.classList.add("popular-prompt-btn");
    button.textContent = prompt;
    button.addEventListener("click", () => {
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
  if (!question.trim()) return;

  userInput.value = "";
  button.disabled = true;

  const defaultText = chatbotConversation.querySelector(".default-text");
  if (defaultText) {
    defaultText.remove();
  }

  addMessageToUI(question, "human");
  showThinkingAnimation("./img/thinking.png");



  const loadingBubble = document.createElement("div");
  loadingBubble.classList.add("speech", "speech-ai");
  loadingBubble.innerHTML =
    '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  chatbotConversation.appendChild(loadingBubble);
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get("sessionId");

  if (urlSessionId) {
    sessionId = urlSessionId;
  }

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const responseData = await response.json();
    chatbotConversation.removeChild(loadingBubble);

    // Clear thinking animation before showing response
    clearThinkingAnimation();

    addMessageToUI(responseData, "ai");
    showFloatingAnimation(['🌟']);

    fetchChatSessions();
    fetchPopularPrompts();
  } catch (error) {
    console.error("Error fetching data:", error);
    chatbotConversation.removeChild(loadingBubble);

    // Clear thinking animation on error too
    clearThinkingAnimation();

    addMessageToUI(
      "Sorry, I encountered an error. Please try again.",
      "ai",
      true
    );
  } finally {
    button.disabled = false;
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
  if (sender === "ai" && animate) {
    // Add typing indicator with 3 dots
    newSpeechBubble.innerHTML =
      '<div class="typing-indicator"><span></span><span></span><span></span></div>';

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
  element.innerHTML = "";

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

function showFloatingAnimation(emoji = '⭐') {
  const container = document.getElementById('animation-container');
  const icon = document.createElement('div');
  icon.className = 'floating-icon';
  icon.textContent = emoji;

  // Set random X offset for variation
  icon.style.left = `${Math.random() * 100 - 50}%`;

  container.appendChild(icon);

  // Hapus animasi setelah selesai
  setTimeout(() => {
    container.removeChild(icon);
  }, 2000);
}

function showWelcomeAnimation(imagePath = './img/welcome.jpg') {
  // Get the conversation container where we want to show the animation
  const container = document.getElementById('chatbot-conversation-container');

  // Create the floating image element
  const welcomeImage = document.createElement('img');
  welcomeImage.className = 'welcome-floating-image';
  welcomeImage.src = imagePath;
  welcomeImage.alt = 'Welcome';

  // Create a wrapper div to control the animation position
  const wrapper = document.createElement('div');
  wrapper.className = 'welcome-animation-wrapper';
  wrapper.appendChild(welcomeImage);

  // Add the wrapper to the container
  container.appendChild(wrapper);

  // Remove the animation after it completes
  setTimeout(() => {
    container.removeChild(wrapper);
  }, 9000); // Animation duration + extra time to ensure completion
}


let thinkingAnimationInterval;
let currentThinkingAnimation = null;

// Modify the showAvatarAnimation function
function showThinkingAnimation(imagePath = './img/thinking.png') {
  // Clear any existing animation
  if (currentThinkingAnimation) {
    clearThinkingAnimation();
  }

  // Get the conversation container where we want to show the animation
  const container = document.getElementById('chatbot-conversation-container');

  // Create the floating image element
  const avatarImage = document.createElement('img');
  avatarImage.className = 'avatar-floating-image thinking';
  avatarImage.src = imagePath;
  avatarImage.alt = 'Thinking';

  // Create a wrapper div to control the animation position
  const wrapper = document.createElement('div');
  wrapper.className = 'avatar-animation-wrapper';
  wrapper.appendChild(avatarImage);

  // Add the wrapper to the container
  container.appendChild(wrapper);

  // Store reference to current animation
  currentThinkingAnimation = wrapper;

  // Start the continuous thinking animation
  thinkingAnimationInterval = setInterval(() => {
    avatarImage.classList.remove('thinking');
    // Trigger reflow
    void avatarImage.offsetWidth;
    avatarImage.classList.add('thinking');
  }, 4500); // Restart animation every 4.5 seconds
}

function clearThinkingAnimation() {
  if (currentThinkingAnimation) {
    // Add fade-out class
    currentThinkingAnimation.classList.add('fade-out');

    // Remove after animation completes
    setTimeout(() => {
      if (currentThinkingAnimation && currentThinkingAnimation.parentNode) {
        currentThinkingAnimation.parentNode.removeChild(currentThinkingAnimation);
      }
      currentThinkingAnimation = null;
    }, 500); // Match this with your CSS transition time

    // Clear the interval
    if (thinkingAnimationInterval) {
      clearInterval(thinkingAnimationInterval);
    }
  }
}

function clearInputText() {
  userInput.value = "";
  userInput.focus();
}

if (newChatDesktop) {
  newChatDesktop.addEventListener("click", clearChat);
}

if (newChatMobile) {
  newChatMobile.addEventListener("click", clearChat);
}


// Load chat sessions and popular prompts on page load
document.addEventListener("DOMContentLoaded", () => {
  // Fetch user info for the dropdown
  fetchUserInfo();
  showWelcomeAnimation("./img/welcome.png");
  // Fetch chat history for the sidebar
  fetchChatSessions();
  // Fetch popular prompts
  fetchPopularPrompts();
});
