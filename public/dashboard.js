// DOM Elements
const totalUsersElement = document.getElementById('total-users');
const totalSessionsElement = document.getElementById('total-sessions');
const totalMessagesElement = document.getElementById('total-messages');
const totalQAEntriesElement = document.getElementById('total-qa-entries');
const recentSessionsBody = document.getElementById('recent-sessions-body');
const adminEmailElement = document.getElementById('admin-email');

// Charts
let userActivityChart;
let messageDistributionChart;


// Fetch total users count
async function fetchTotalUsers() {
  try {
    const response = await fetch('/api/stats/users');
    
    if (!response.ok) {
      // If API endpoint doesn't exist yet, we'll use a fetch from Supabase directly
      // This demonstrates querying through the server, which should be implemented
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
      
      // Update UI with count
      totalUsersElement.textContent = data || '0';
      return;
    }
    
    const data = await response.json();
    totalUsersElement.textContent = data.count || '0';
  } catch (error) {
    console.error('Error fetching total users:', error);
    totalUsersElement.textContent = 'Error';
  }
}

// Fetch total chat sessions
async function fetchTotalSessions() {
  try {
    const response = await fetch('/api/stats/sessions');
    
    if (!response.ok) {
      // If API endpoint doesn't exist yet, fetch directly
      const { data, error } = await fetch('/api/supabase-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'sessions',
          count: true
        })
      }).then(res => res.json());
      
      if (error) throw new Error(error.message);
      
      // Update UI
      totalSessionsElement.textContent = data || '0';
      return;
    }
    
    const data = await response.json();
    totalSessionsElement.textContent = data.count || '0';
  } catch (error) {
    console.error('Error fetching total sessions:', error);
    totalSessionsElement.textContent = 'Error';
  }
}

// Fetch total messages count
async function fetchTotalMessages() {
  try {
    const response = await fetch('/api/stats/messages');
    
    if (!response.ok) {
      // If API endpoint doesn't exist yet
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
      
      // Update UI
      totalMessagesElement.textContent = data || '0';
      return;
    }
    
    const data = await response.json();
    totalMessagesElement.textContent = data.count || '0';
  } catch (error) {
    console.error('Error fetching total messages:', error);
    totalMessagesElement.textContent = 'Error';
  }
}

// Fetch total Q&A entries
async function fetchTotalQAEntries() {
  try {
    const response = await fetch('/api/stats/qa-entries');
    
    if (!response.ok) {
      // If API endpoint doesn't exist yet
      const { data, error } = await fetch('/api/supabase-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'documents',
          count: true
        })
      }).then(res => res.json());
      
      if (error) throw new Error(error.message);
      
      // Update UI
      totalQAEntriesElement.textContent = data || '0';
      return;
    }
    
    const data = await response.json();
    totalQAEntriesElement.textContent = data.count || '0';
  } catch (error) {
    console.error('Error fetching total Q&A entries:', error);
    totalQAEntriesElement.textContent = 'Error';
  }
}

// Fetch recent chat sessions
async function fetchRecentSessions() {
  try {
    const response = await fetch('/chat-sessions');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recent sessions: ${response.status}`);
    }
    
    const sessions = await response.json();
    
    if (sessions.length === 0) {
      recentSessionsBody.innerHTML = '<tr><td colspan="4">No recent sessions found</td></tr>';
      return;
    }
    
    // Clear the table
    recentSessionsBody.innerHTML = '';
    
    // Add up to 10 recent sessions
    sessions.slice(0, 10).forEach(session => {
      const row = document.createElement('tr');
      
      // Format date
      const createdAt = new Date(session.created_at);
      const formattedDate = createdAt.toLocaleDateString() + ' ' + 
                           createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      row.innerHTML = `
        <td>${session.id.substring(0, 8)}...</td>
        <td>User ${session.user_id ? session.user_id.substring(0, 8) : 'Unknown'}</td>
        <td>${session.preview || 'No message'}</td>
        <td>${formattedDate}</td>
      `;
      
      recentSessionsBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    recentSessionsBody.innerHTML = `<tr><td colspan="4">Error loading sessions: ${error.message}</td></tr>`;
  }
}

// Initialize and render User Activity Chart
async function initUserActivityChart() {
  const ctx = document.getElementById('userActivityChart').getContext('2d');
  let userActivityChart;
  
  try {
    // 1. Generate labels for the last 7 days
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    // 2. Fetch all data from a single endpoint
    const response = await fetch('/api/activity-data');
    if (!response.ok) throw new Error('Failed to fetch activity data');
    
    const { sessionsCount, messagesCount } = await response.json();

    // 3. Create/update chart
    if (userActivityChart) {
      userActivityChart.destroy();
    }

    window.userActivityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Chat Sessions',
            data: sessionsCount,
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
            borderColor: '#3498db',
            borderWidth: 1
          },
          {
            label: 'Messages',
            data: messagesCount,
            backgroundColor: 'rgba(46, 204, 113, 0.7)',
            borderColor: '#2ecc71',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            enabled: true,
            position: 'nearest',
            backgroundColor: 'rgba(0,0,0,0.8)',
            bodyFont: {
              size: 14
            },
            displayColors: true,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              drawBorder: false
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Chart initialization failed:', error);
    displayChartError('userActivityChart', 'Failed to load chart data');
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


// When the document is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  
  // Fetch stats
  fetchTotalUsers();
  fetchTotalSessions();
  fetchTotalMessages();
  fetchTotalQAEntries();
  
  // Fetch recent sessions
  fetchRecentSessions();
  
  // Initialize charts
  initUserActivityChart();

});

// Add a function to fetch Supabase stats directly if the API endpoints don't exist yet
// This would need a corresponding server endpoint
async function fetchStats() {
  try {
    // Fetch all stats in parallel
    await Promise.all([
      fetchTotalUsers(),
      fetchTotalSessions(),
      fetchTotalMessages(),
      fetchTotalQAEntries(),
      fetchRecentSessions()
    ]);
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Refresh stats every 60 seconds
setInterval(fetchStats, 60000);