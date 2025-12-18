// CAPTCHA callback for invisible mode
function onCaptcha(token) {
  document.getElementById('loginForm').dataset.captchaToken = token;
}

const statusEl = document.getElementById('status');
const loginForm = document.getElementById('loginForm');
const goAdminBtn = document.getElementById('goAdmin');
const adminPanel = document.getElementById('adminPanel');

function getToken() { return localStorage.getItem('token'); }

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    statusEl.textContent = 'Session expired. Please log in again.';
    adminPanel.hidden = true;
  }
  return resp;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';

  if (typeof grecaptcha !== 'undefined') {
    await grecaptcha.execute();
  }

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const captchaToken = loginForm.dataset.captchaToken;

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      statusEl.textContent = data.error || 'Login failed';
      return;
    }
    localStorage.setItem('token', data.token);
    statusEl.style.color = '#00ff9c';
    statusEl.textContent = 'Access granted.';
    adminPanel.hidden = false;
    loadAnalytics();
    loadAttempts();
  } catch {
    statusEl.textContent = 'Network error';
  } finally {
    loginForm.dataset.captchaToken = '';
    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
  }
});

goAdminBtn.addEventListener('click', () => {
  const token = getToken();
  if (!token) {
    statusEl.textContent = 'Please log in to access admin.';
    return;
  }
  adminPanel.hidden = false;
  loadAnalytics();
  loadAttempts();
});

async function loadAnalytics() {
  const el = document.getElementById('analytics');
  const resp = await authFetch('/api/admin/analytics');
  const data = await resp.json();
  el.innerHTML = `
    <div>Attempts: <span style="color:#00ff9c">${data.totalAttempts}</span></div>
    <div>Successes: <span style="color:#00ff9c">${data.successes}</span></div>
    <div>Failures: <span style="color:#ff5252">${data.failures}</span></div>
  `;
}

async function loadAttempts(page = 1) {
  const tbody = document.querySelector('#attempts tbody');
  const resp = await authFetch(`/api/admin/attempts?page=${page}&limit=20`);
  const data = await resp.json();
  tbody.innerHTML = (data.items || []).map(a => `
    <tr>
      <td>${new Date(a.createdAt).toLocaleString()}</td>
      <td>${a.email || '-'}</td>
      <td>${a.ip}</td>
      <td title="${a.userAgent || ''}">${(a.userAgent || '').slice(0,24)}${(a.userAgent || '').length > 24 ? '…' : ''}</td>
      <td class="${a.success ? 'success-yes' : 'success-no'}">${a.success ? 'Yes' : 'No'}</td>
      <td>${a.reason}</td>
    </tr>
  `).join('');
}

document.getElementById('blockBtn').addEventListener('click', () => blockUser(true));
document.getElementById('unblockBtn').addEventListener('click', () => blockUser(false));

async function blockUser(block) {
  const email = document.getElementById('userEmail').value.trim();
  const adminStatus = document.getElementById('adminStatus');
  if (!email) { adminStatus.textContent = 'Enter an email'; return; }
  const resp = await authFetch('/api/admin/users/block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, block }),
  });
  const data = await resp.json();
  adminStatus.style.color = resp.ok ? '#00ff9c' : '#ff5252';
  adminStatus.textContent = resp.ok ? `Updated: ${data.email} => blocked=${data.isBlocked}` : (data.error || 'Error');
}
