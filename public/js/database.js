// DOM Elements
const uploadForm = document.getElementById("uploadForm");
const fileUpload = document.getElementById("fileUpload");
const previewSection = document.getElementById("previewSection");
const filePreview = document.getElementById("filePreview");
const statusMessage = document.getElementById("statusMessage");
const allQuestionList = document.getElementById("allQuestionList");
const userIconContainer = document.getElementById('userIconContainer');
const userDropdown = document.getElementById('user-dropdown');
const userEmailFull = document.getElementById('userEmailFull');
const logoutButton = document.getElementById('logoutButton');


const handleLogout = () => {
  // Perform logout action
  fetch("/logout", {
    method: "POST",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      window.location.href = "/login"; // Redirect to login page
    })
    .catch((error) => {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    });
};


fileUpload.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    previewSection.style.display = "none";
    return;
  }

  // Show preview section
  previewSection.style.display = "block";

  // Read file content
  const reader = new FileReader();
  reader.onload = function (event) {
    const content = event.target.result;
    // Display preview (limited to first 2000 characters to avoid performance issues)
    filePreview.textContent =
      content.length > 2000
        ? content.substring(0, 2000) + "... (content truncated for preview)"
        : content;
  };
  reader.readAsText(file);
});

// Form submission
// Modify your upload form submission handler to store more metadata
uploadForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const file = fileUpload.files[0];
  if (!file) {
    showStatus("Please select a file to upload.", "error");
    return;
  }

  try {
    showStatus("Uploading and processing file...", "info");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    console.log("Server response:", result);

    showStatus(
      result.message || "File processed successfully!",
      "success"
    );

    // Refresh all questions list
    await fetchAndRenderAllQuestions();
  } catch (error) {
    console.error("Upload error:", error);
    showStatus(`Error: ${error.message}`, "error");
  }
});
// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = "block";

  // Auto hide after 5 seconds
  setTimeout(() => {
    statusMessage.style.display = "none";
  }, 5000);
}

// Render questions to a specific list element
function renderQuestions(listElement, questionsToRender) {
  listElement.innerHTML = "";

  if (!questionsToRender || questionsToRender.length === 0) {
    listElement.innerHTML = "<tr><td colspan='3'>No questions found.</td></tr>";
    return;
  }
  
  // Create table element
  const table = document.createElement("table");
  table.className = "questions-table";
  
  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const questionHeader = document.createElement("th");
  questionHeader.textContent = "Question";
  const answerHeader = document.createElement("th");
  answerHeader.textContent = "Answer";
  const actionHeader = document.createElement("th");
  actionHeader.textContent = "Action";
  
  headerRow.appendChild(questionHeader);
  headerRow.appendChild(answerHeader);
  headerRow.appendChild(actionHeader);
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement("tbody");
  
  questionsToRender.forEach((q) => {
    // Handle different possible data formats
    let questionText, answerText, id;

    if (q.question && q.answer) {
      // If format is { question: "...", answer: "..." }
      questionText = q.question;
      answerText = q.answer;
      id = q.id || "No ID provided";
    }

    // Create table row
    const row = document.createElement("tr");
    row.className = "question-row";

    // Add question cell
    const questionCell = document.createElement("td");
    questionCell.className = "question-cell";
    questionCell.textContent = questionText;
    row.appendChild(questionCell);

    // Add answer cell
    const answerCell = document.createElement("td");
    answerCell.className = "answer-cell";
    answerCell.textContent = answerText;
    row.appendChild(answerCell);

    // Add action cell with delete button
    const actionCell = document.createElement("td");
    actionCell.className = "action-cell";
    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = '<img src="/img/icons8-delete-trash-64.png" alt="Delete" style="width:auto; height:20px;">';
    deleteButton.onclick = function () {
      // Handle delete action
      if (confirm("Are you sure you want to delete this question?")) {
        fetch(`/delete-question`, {
          method: "POST",
          body: JSON.stringify({ questionId: id }),
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Failed to delete question: ${response.status}`
              );
            }
            return response.json();
          })
          .then((result) => {
            console.log("Delete response:", result);
            alert("Question deleted successfully!");
            fetchAndRenderAllQuestions(); // Refresh the list after deletion
          })
          .catch((error) => {
            console.error("Delete error:", error);
            showStatus(
              `Error deleting question: ${error.message}`,
              "error"
            );
          });
      }
    };
    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  listElement.appendChild(table);
}

// Function to fetch all questions from the server and render them
async function fetchAndRenderAllQuestions() {
  try {
    const response = await fetch("/questions");

    if (!response.ok) {
      throw new Error(`Failed to fetch questions: ${response.status}`);
    }

    const result = await response.json();

    if (result.questions) {
      renderQuestions(allQuestionList, result.questions);
    } else {
      console.warn("No questions array in server response");
      allQuestionList.innerHTML =
        "<tr><td colspan='3'>No questions found in database.</td></tr>";
    }
  } catch (error) {
    console.error("Error fetching all questions:", error);
    showStatus(`Error fetching questions: ${error.message}`, "error");
    allQuestionList.innerHTML = `<tr><td colspan='3'>Error loading questions: ${error.message}</td></tr>`;
  }
}
userIconContainer.addEventListener('click', () => {
    userDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    if (!userIconContainer.contains(event.target) && !userDropdown.contains(event.target)) {
        userDropdown.classList.remove('active');
    }
});
logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Redirect to login page
            window.location.href = '/login';
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
});

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

      // Set first two letters as user icon
      const userIcon = document.querySelector(".user-icon");
      if (userIcon) {
        // Get first two letters and convert to uppercase
        userIcon.textContent = userData.email.substring(0, 2).toUpperCase();
      }
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
    // Handle error gracefully - perhaps leave as default "--"
  }
}

// Initial load - fetch all questions when page loads
document.addEventListener("DOMContentLoaded", function() {
    fetchAndRenderAllQuestions();
    fetchUserInfo();
});