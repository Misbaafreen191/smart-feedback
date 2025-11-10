// ==================== BACKEND API URLs ====================
const API_POST_FEEDBACK      = 'http://127.0.0.1:5000/api/feedback';
const API_GET_SUMMARY        = 'http://127.0.0.1:5000/api/summary';
const API_GET_RECENT         = 'http://127.0.0.1:5000/api/feedbacks';
const API_REGISTER           = 'http://127.0.0.1:5000/api/register';
const API_LOGIN              = 'http://127.0.0.1:5000/api/login';

// ==================== ADMIN API URLs ====================
const API_ADMIN_USERS        = 'http://127.0.0.1:5000/api/admin/users';
const API_ADMIN_FEEDBACKS    = 'http://127.0.0.1:5000/api/admin/feedbacks';
const API_ADMIN_FEEDBACK_DEL = id => `http://127.0.0.1:5000/api/admin/feedbacks/${id}/delete`;

// ==================== GLOBAL DOM INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('userRole'); // get role from storage
  const path = window.location.pathname;

  if (role === 'admin' && (path.endsWith('index.html') || path === '/' || path === '')) {
    window.location.href = 'admin.html';
    return;
  }

  if (path.endsWith('index.html') || path === '/' || path === '') {
    initFeedbackPage();
  } else if (path.endsWith('analysis.html')) {
    initAnalysisWelcomePage(); // <- changed here
  } else if (path.endsWith('login.html')) {
    initLoginPage();
  } else if (path.endsWith('register.html')) {
    initRegisterPage();
  } else if (path.endsWith('admin.html')) {
    initAdminPage();
  }
});
// 🟢 1. ANALYSIS PAGE — landing with 3 buttons
// ===========================================================
function initAnalysisPage() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const guestBtn = document.getElementById('guestBtn');

  if (loginBtn) loginBtn.addEventListener('click', () => (window.location.href = 'login.html'));
  if (registerBtn) registerBtn.addEventListener('click', () => (window.location.href = 'register.html'));
  if (guestBtn) guestBtn.addEventListener('click', () => (window.location.href = 'index.html'));
}


// ===========================================================
// 🟠 LOGIN PAGE
// ===========================================================
async function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    if (!email || !pass) {
      alert('Please fill all fields.');
      return;
    }

    try {
      const resp = await fetch(API_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      if (!resp.ok) throw new Error(`Login failed: ${resp.status}`);
      const data = await resp.json();

      // Store role and email
      const role = data.user?.role?.toLowerCase() || 'user';
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userRole', role);

      // Redirect according to backend response
      window.location.href = data.redirect;

    } catch (err) {
      console.error(err);
      alert('Invalid email or password.');
    }
  });
}

// ===========================================================
// 🟡 ADMIN PAGE
// ===========================================================
async function initAdminPage() {
  const role = localStorage.getItem('userRole');
  if (role !== 'admin') {
    alert('Access denied. Admins only.');
    window.location.href = 'login.html';
    return;
  }

  const adminName = localStorage.getItem('userEmail') || 'Admin';
  document.getElementById('adminName').textContent = adminName;

  const usersTable = document.querySelector('#usersTable tbody');
  const feedbackTable = document.querySelector('#feedbackTable tbody');
  const usersLoading = document.getElementById('usersLoading');
  const feedbackLoading = document.getElementById('feedbackLoading');

  // Load Users
  try {
    const usersRes = await fetch(API_ADMIN_USERS);
    const users = await usersRes.json();
    usersLoading.style.display = 'none';
    users.forEach(u => {
      usersTable.innerHTML += `
        <tr>
          <td>${u.id}</td>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
        </tr>`;
    });
  } catch (err) {
    usersLoading.textContent = 'Failed to load users.';
    console.error(err);
  }

  // Load Feedbacks
  try {
    const fbRes = await fetch(API_ADMIN_FEEDBACKS);
    const feedbacks = await fbRes.json();
    feedbackLoading.style.display = 'none';
    feedbacks.forEach(fb => {
      feedbackTable.innerHTML += `
        <tr>
          <td>${fb.id}</td>
          <td>${fb.name || 'Anonymous'}</td>
          <td>${fb.message}</td>
          <td>${fb.sentiment}</td>
          <td>${fb.score}</td>
          <td>${new Date(fb.timestamp).toLocaleString()}</td>
          <td>
            <button class="deleteFeedbackBtn" data-id="${fb.id}">Delete</button>
          </td>
        </tr>`;
    });

    // Delete feedback buttons
    document.querySelectorAll('.deleteFeedbackBtn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm(`Are you sure you want to delete feedback ID ${id}?`)) {
          try {
            const resp = await fetch(API_ADMIN_FEEDBACK_DEL(id), { method: 'DELETE' });
            if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
            alert('Feedback deleted!');
            btn.closest('tr').remove();
          } catch (err) {
            console.error(err);
            alert('Failed to delete feedback.');
          }
        }
      });
    });

  } catch (err) {
    feedbackLoading.textContent = 'Failed to load feedbacks.';
    console.error(err);
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

// ===========================================================
// 🔵 REGISTER PAGE
// ===========================================================
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const roleSelect = document.getElementById('regRole');
  const adminPassDiv = document.getElementById('adminPassDiv');
  const ADMIN_PASSKEY = "SuperSecret123";

  roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'admin') {
      adminPassDiv.classList.remove('hidden');
    } else {
      adminPassDiv.classList.add('hidden');
      document.getElementById('adminPasskey').value = '';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    let role = roleSelect.value;

    if (!name || !email || !pass || !role) {
      alert('Please fill all fields.');
      return;
    }

    if (role === 'admin') {
      const enteredPass = document.getElementById('adminPasskey').value.trim();
      if (enteredPass !== ADMIN_PASSKEY) {
        alert('Incorrect Admin Passkey! You will be registered as a User instead.');
        role = 'user';
      }
    }

    try {
      const resp = await fetch(API_REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass, role }),
      });

      if (!resp.ok) throw new Error(`Register failed: ${resp.status}`);
      await resp.json();

      alert(`Registration successful! You are registered as ${role}.`);
      window.location.href = 'login.html';
    } catch (err) {
      console.error(err);
      alert('Failed to register. Please try again.');
    }
  });
}

// ===========================================================
// 🔵 FEEDBACK PAGE
// ===========================================================
function initFeedbackPage() {
  const form = document.getElementById('feedbackForm');
  if (!form) return;

  const messageInput = document.getElementById('message');
  const nameInput = document.getElementById('name');
  const resultBox = document.getElementById('result');
  const sentimentLabel = document.getElementById('sentimentLabel');
  const confidenceBox = document.getElementById('confidence');
  const recentList = document.getElementById('recentList');
  const clearBtn = document.getElementById('clearBtn');
  let chart;

  initChart();
  loadSummary();
  loadRecent();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    const name = nameInput.value.trim() || localStorage.getItem('userEmail') || 'Guest';

    if (!message) {
      alert('Please enter feedback before submitting.');
      return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const payload = { name, message };
      const resp = await fetch(API_POST_FEEDBACK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const data = await resp.json();
      showResult(data);
      await loadSummary();
      await loadRecent();
      form.reset();
    } catch (err) {
      console.error(err);
      alert('Failed to submit feedback. Check console and backend.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  });

  clearBtn.addEventListener('click', () => form.reset());

  function showResult(data) {
    resultBox.classList.remove('hidden');
    const sentiment = (data.sentiment || data.label || 'Unknown').toString();
    sentimentLabel.textContent = sentiment;
    sentimentLabel.style.color =
      sentiment.toLowerCase().includes('pos') ? 'var(--success)' :
      sentiment.toLowerCase().includes('neg') ? 'var(--danger)' :
      'var(--neutral)';
    confidenceBox.textContent = data.score ? `Score: ${data.score}` : '';
  }

  function initChart() {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'pie',
      data: { labels: ['Positive', 'Negative', 'Neutral'], datasets: [{ data: [0, 0, 0] }] },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } } 
      },
    });
  }

  async function loadSummary() {
    try {
      const resp = await fetch(API_GET_SUMMARY);
      const s = await resp.json();
      chart.data.datasets[0].data = [s.positive || 0, s.negative || 0, s.neutral || 0];
      chart.update();
    } catch (err) {
      console.warn('Could not load summary:', err);
    }
  }

  async function loadRecent() {
    try {
      const resp = await fetch(API_GET_RECENT);
      const list = await resp.json();
      if (localStorage.getItem('userRole') === 'admin') renderRecent(list);
    } catch {}
  }

  function renderRecent(list) {
    if (!Array.isArray(list)) return;
    recentList.innerHTML = '';
    list.slice(0, 10).forEach((item) => {
      const li = document.createElement('li');
      const txt = document.createElement('div');
      txt.textContent = item.message || '';
      const meta = document.createElement('div');
      meta.className = 'recent-meta';
      const who = item.name ? `${item.name} • ` : '';
      const when = item.timestamp ? ` ${new Date(item.timestamp).toLocaleString()}` : '';
      const label = item.sentiment ? ` [${item.sentiment}]` : '';
      meta.textContent = `${who}${label}${when}`;
      li.appendChild(txt);
      li.appendChild(meta);
      recentList.appendChild(li);
    });
  }
}

// ===========================================================
// 🔵 ANALYSIS (HOME/WELCOME) PAGE
// ===========================================================
function initAnalysisWelcomePage() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const guestBtn = document.getElementById('guestBtn');

  if (loginBtn) loginBtn.addEventListener('click', () => window.location.href = 'login.html');
  if (registerBtn) registerBtn.addEventListener('click', () => window.location.href = 'register.html');
  if (guestBtn) guestBtn.addEventListener('click', () => {
    localStorage.setItem('userRole', 'guest');
    localStorage.setItem('userEmail', 'Guest');
    window.location.href = 'index.html'; // redirect to feedback page
  });
}
