// DOM Elements
const totalPromptsElement = document.getElementById('total-prompts');
const avgPromptsElement = document.getElementById('avg-prompts');
const avgResponseTimeElement = document.getElementById('avg-response-time');
const successRateElement = document.getElementById('success-rate');
const topPromptsBody = document.getElementById('top-prompts-body');
const adminEmailElement = document.getElementById('admin-email');
const logoutBtn = document.getElementById('logout-btn');
const userIconContainer = document.getElementById('userIconContainer');
const userDropdown = document.getElementById('userDropdown');
const userEmailFull = document.getElementById('userEmailFull');
const logoutButton = document.getElementById('logoutButton');

// Charts
let popularPromptsChart;
let userEngagementChart;


// Fetch total prompts count
async function fetchTotalPrompts() {
  try {
    // Using the messages table as a proxy for prompts
    const response = await fetch('/api/stats/messages');
    
    if (!response.ok) {
      // If API endpoint doesn't exist yet, we'll use a fetch from Supabase directly
      const { data, error } = await fetch('/api/supabase-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'messages',
          count: true
        })
      }).then(res => res.json());
      
      if (error) throw new Error(error.message);
      
      // Update UI with count
      totalPromptsElement.textContent = data || '0';
      return data;
    }
    
    const data = await response.json();
    totalPromptsElement.textContent = data.count || '0';
    return data.count;
  } catch (error) {
    console.error('Error fetching total prompts:', error);
    totalPromptsElement.textContent = 'Error';
    return 0;
  }
}

// Fetch average prompts per user
async function fetchAvgPrompts() {
  try {
    const totalPrompts = await fetchTotalPrompts();
    const response = await fetch('/api/stats/users');
    
    if (!response.ok) {
      // If API endpoint doesn't exist yet
      const { data, error } = await fetch('/api/supabase-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'profiles',
          count: true
        })
      }).then(res => res.json());
      
      if (error) throw new Error(error.message);
      
      const userCount = data || 1; // Avoid division by zero
      const average = (totalPrompts / userCount).toFixed(1);
      
      // Update UI with average
      avgPromptsElement.textContent = average;
      return;
    }
    
    const data = await response.json();
    const userCount = data.count || 1; // Avoid division by zero
    const average = (totalPrompts / userCount).toFixed(1);
    
    avgPromptsElement.textContent = average;
  } catch (error) {
    console.error('Error calculating average prompts:', error);
    avgPromptsElement.textContent = 'Error';
  }
}
// Fetch popular prompts
async function fetchPopularPrompts() {
    try {
        const response = await fetch("/popular-prompts");
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const promptsWithCount = await response.json(); // Full data: [{ prompt, count }]
        
        renderPromptsWithCount(promptsWithCount);
      } catch (error) {
        console.error("Error fetching popular prompts:", error);
      }
    }

// Initialize and render Popular Prompts Chart
async function initPopularPromptsChart() {
    const ctx = document.getElementById('popularPromptsChart').getContext('2d');
    
    try {
      const response = await fetch('/popular-prompts');
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const promptsData = await response.json();
  
      popularPromptsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: promptsData.map(item => item.prompt),
          datasets: [{
            label: 'Usage Count',
            data: promptsData.map(item => item.count),
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
            borderColor: '#3498db',
            borderWidth: 1,
            hoverBackgroundColor: 'rgba(52, 152, 219, 0.9)',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              callbacks: {
                title: (tooltipItems) => {
                  // Show full prompt in tooltip title
                  const index = tooltipItems[0].dataIndex;
                  return promptsData[index].prompt;
                },
                label: (context) => {
                  // Show count in tooltip body
                  return `Count: ${context.raw}`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                callback: function(value) {
                  // Truncated x-axis labels (3 words max)
                  const fullText = this.getLabelForValue(value);
                  const words = fullText.split(' ');
                  return words.length > 3 
                    ? words.slice(0, 3).join(' ') + '...' 
                    : fullText;
                },
                maxRotation: 0,
                autoSkip: false
              },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Usage Count' },
              grid: { drawBorder: false }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Chart initialization failed:', error);
      displayChartError('popularPromptsChart', 'Failed to load chart data');
    }
  }

// Helper function for error display
function displayChartError(chartId, message) {
  const chartContainer = document.getElementById(chartId).parentElement;
  chartContainer.style.display = 'flex';
  chartContainer.style.alignItems = 'center';
  chartContainer.style.justifyContent = 'center';
  chartContainer.style.color = 'red';
  chartContainer.style.fontWeight = 'bold';
  chartContainer.innerHTML = message;
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


// When the document is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  
  fetchUserInfo();
  // Fetch stats
  await fetchTotalPrompts();
  await fetchAvgPrompts();
  
  // Initialize charts
  initPopularPromptsChart();

});

// Refresh stats every 60 seconds
setInterval(async () => {
  await fetchTotalPrompts();
  await fetchAvgPrompts();
  initPopularPromptsChart();
}, 60000);