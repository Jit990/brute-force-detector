// CAPTCHA callback for invisible mode
function onCaptcha(token) {
  document.getElementById('loginForm').dataset.captchaToken = token;
}

const statusEl = document.getElementById('status');
const loginForm = document.getElementById('loginForm');
const goAdminBtn = document.getElementById('goAdmin');
const adminPanel = document.getElementById('adminPanel');

let failCount = 0;
const MAX_FAILS = 4;
let attemptsLog = []; // store failed attempts for admin view only

// Hacker matrix rain background
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
const letters = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function draw() {
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0F0';
  ctx.font = fontSize + 'px monospace';
  for (let i = 0; i < drops.length; i++) {
    const text = letters[Math.floor(Math.random() * letters.length)];
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}
setInterval(draw, 33);

// LOGIN HANDLER
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('user').value.trim();
  const password = document.getElementById('password').value;
  const status = document.getElementById('status');

  // Admin login check
  if (user === 'admin' && password === 'admin9907') {
    status.style.color = '#00ff9c';
    status.textContent = 'Access granted. Welcome Admin!';
    failCount = 0; // reset counter
    adminPanel.hidden = false;
    loadAnalytics();
    loadAttempts();
    return;
  }

  // Brute force detection
  if (failCount >= MAX_FAILS) {
    status.style.color = '#ff5252';
    status.textContent = 'Account locked due to brute force detection.';
    return;
  }

  // Wrong password attempt
  failCount++;
  attemptsLog.push({
    time: new Date().toLocaleString(),
    user: user,
    ip: '127.0.0.1',
    ua: 'Browser',
    success: false,
    reason: 'Invalid password'
  });
  status.style.color = '#ff5252';
  status.textContent = `Invalid credentials. Attempt ${failCount}/${MAX_FAILS}`;
});

// ADMIN DASHBOARD FUNCTIONS
function loadAnalytics() {
  const el = document.getElementById('analytics');
  el.innerHTML = `
    <div>Total Attempts: ${attemptsLog.length}</div>
    <div>Failures: ${failCount}</div>
    <div>Status: ${failCount >= MAX_FAILS ?
      '<span style="color:#ff5252">LOCKED</span>' :
      '<span style="color:#00ff9c">ACTIVE</span>'}</div>
  `;
}

function loadAttempts() {
  const tbody = document.querySelector('#attempts tbody');
  tbody.innerHTML = '';
  attemptsLog.forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td>${a.time}</td>
        <td>${a.user}</td>
        <td>${a.ip}</td>
        <td>${a.ua}</td>
        <td class="success-no">No</td>
        <td>${a.reason}</td>
      </tr>
    `;
  });
}

// Admin dashboard toggle
goAdminBtn.addEventListener('click', () => {
  const user = document.getElementById('user').value.trim();
  const password = document.getElementById('password').value;
  if (user === 'admin' && password === 'admin9907') {
    adminPanel.hidden = false;
    loadAnalytics();
    loadAttempts();
  } else {
    statusEl.textContent = 'Please log in as admin to access dashboard.';
  }
});
