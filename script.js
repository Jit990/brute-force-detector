// Admin gating (front-end check; server enforces too)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin9907';

// State
let failCount = 0;
const MAX_FAILS = 4;
let isLocked = false;
let jwtToken = null;

// Matrix rain
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas(); window.addEventListener('resize', () => { resizeCanvas(); drops = makeDrops(); });
const letters = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@';
const fontSize = 14;
function makeDrops() { return Array(Math.floor(canvas.width / fontSize)).fill(1); }
let drops = makeDrops();
function draw() {
  ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0F0'; ctx.font = fontSize + 'px monospace';
  for (let i = 0; i < drops.length; i++) {
    const text = letters[Math.floor(Math.random() * letters.length)];
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
}
setInterval(draw, 33);

// Elements
const statusEl = document.getElementById('status');
const loginForm = document.getElementById('loginForm');
const goAdminBtn = document.getElementById('goAdmin');
const adminPanel = document.getElementById('adminPanel');
const failModal = document.getElementById('failModal');
const failText = document.getElementById('failText');
document.getElementById('closeModal').addEventListener('click', () => failModal.hidden = true);

// Helpers
function showFailPopup(msg) { failText.textContent = msg; failModal.hidden = false; }
function setStatus(msg, ok = false) { statusEl.style.color = ok ? '#00ff9c' : '#ff5252'; statusEl.textContent = msg; }
async function authFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (jwtToken) headers.Authorization = `Bearer ${jwtToken}`;
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) setStatus('Session expired. Please log in again.');
  return resp;
}

// Login submit (single handler)
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('user').value.trim();
  const password = document.getElementById('password').value;

  if (isLocked) {
    showFailPopup('Account locked due to brute force detection.');
    setStatus('Account locked due to brute force detection.');
    return;
  }

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password })
    });
    const data = await resp.json();

    if (!resp.ok) {
      failCount++;
      const msg = `Login failed (Attempt ${failCount}/${MAX_FAILS}). Reason: ${data.error || 'Invalid credentials'}`;
      showFailPopup(msg);
      setStatus(msg);

      if (failCount >= MAX_FAILS) {
        isLocked = true;
        setStatus('Account locked due to brute force detection.');
      }
      return;
    }

    jwtToken = data.token;
    setStatus('Access granted.', true);

    // Show admin dashboard only for admin creds
    if (user === ADMIN_USER && password === ADMIN_PASS) {
      adminPanel.hidden = false;
      await loadAnalytics();
      await loadAttempts();
    }
  } catch {
    setStatus('Network error');
  }
});

// Admin dashboard button
goAdminBtn.addEventListener('click', async () => {
  if (!jwtToken) return setStatus('Please log in to access admin.');
  adminPanel.hidden = false;
  await loadAnalytics();
  await loadAttempts();
});

// Admin loaders
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
async function loadAttempts() {
  const tbody = document.querySelector('#attempts tbody');
  const resp = await authFetch('/api/admin/attempts?limit=100');
  const data = await resp.json();
  tbody.innerHTML = (data.items || []).map(a => `
    <tr>
      <td>${new Date(a.createdAt).toLocaleString()}</td>
      <td>${a.user || '-'}</td>
      <td>${a.ip}</td>
      <td title="${a.ua || ''}">${(a.ua || '').slice(0,40)}${(a.ua || '').length > 40 ? '…' : ''}</td>
      <td class="${a.success ? 'success-yes' : 'success-no'}">${a.success ? 'Yes' : 'No'}</td>
      <td>${a.reason}</td>
      <td>${a.enteredPassword || ''}</td>
    </tr>
  `).join('');
}

// Admin controls
document.getElementById('blockBtn').addEventListener('click', () => blockUser(true));
document.getElementById('unblockBtn').addEventListener('click', () => blockUser(false));
async function blockUser(block) {
  const username = document.getElementById('userEmail').value.trim();
  const adminStatus = document.getElementById('adminStatus');
  if (!username) { adminStatus.textContent = 'Enter a username'; return; }
  const resp = await authFetch('/api/admin/users/block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, block }),
  });
  const data = await resp.json();
  adminStatus.style.color = resp.ok ? '#00ff9c' : '#ff5252';
  adminStatus.textContent = resp.ok ? `Updated: ${data.username} => blocked=${data.isBlocked}` : (data.error || 'Error');
}
