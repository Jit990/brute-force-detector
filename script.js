// --- CONFIGURATION ---
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
let logs = [];
let attempts = {};
let stats = { success: 0, fail: 0, threats: 0 };

// --- MATRIX BACKGROUND EFFECT ---
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;
let columns = Math.floor(width / 20);
const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*()_+-=[]{}|;:,.<>/?";
const charArray = characters.split("");
let drops = [];

for (let i = 0; i < columns; i++) {
  drops[i] = 1;
}

function drawMatrix() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#00ffcc";
  ctx.font = "15px monospace";

  for (let i = 0; i < drops.length; i++) {
    const text = charArray[Math.floor(Math.random() * charArray.length)];
    ctx.fillText(text, i * 20, drops[i] * 20);

    if (drops[i] * 20 > height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  columns = Math.floor(width / 20);
  drops = [];
  for (let i = 0; i < columns; i++) drops[i] = 1;
});

setInterval(drawMatrix, 50);

// --- CLOCK ---
function updateClock() {
  const now = new Date();
  document.getElementById('current-time').innerText = now.toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// --- LOGGING & AUTH ---
function generateIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function getTimestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function logEvent(ip, user, status, message) {
  const entry = {
    time: getTimestamp(),
    ip: ip,
    user: user || "N/A",
    status: status,
    msg: message
  };
  logs.unshift(entry); // Newest first
  if (logs.length > 50) logs.pop();
  renderLogs();
}

let isLocked = false;

function attemptLogin() {
  if (isLocked) return;

  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  const ip = "127.0.0.1 (LOCAL)";

  if (!user || !pass) {
    typeStatus("IDENTITY REQUIRED", "warning");
    return;
  }

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    stats.success++;
    typeStatus("SUCCESS: PROX_BYPASS_INITIATED... ACCESS GRANTED", "success");
    logEvent(ip, user, "SUCCESS", "Authentication override successful. Accessing shell...");

    setTimeout(() => {
      document.getElementById("loginBox").classList.add("hidden");
      document.getElementById("dashboard").classList.remove("hidden");
      logEvent("SYSTEM", "CORE", "READY", "Security Sentinel Dashboard Online.");
    }, 1500);
  } else {
    stats.fail++;
    logEvent(ip, user, "FAILURE", "Credential mismatch. Login attempt rejected.");
    detectBruteForce(ip, user);

    if (!isLocked) {
      typeStatus("CRITICAL_ERR: UNAUTHORIZED ACCESS ATTEMPT DETECTED", "danger");
    }
  }
  updateStats();
}

function detectBruteForce(ip, user) {
  const key = `${ip}_${user}`;
  attempts[key] = (attempts[key] || 0) + 1;

  if (attempts[key] >= 4) {
    isLocked = true;
    stats.threats++;
    logEvent(ip, user, "BLOCK", "SYSTEM_LOCKOUT: 4 failed attempts. Access permanently denied for this session.");
    updateThreatLevel();
    lockdownUI();
  }
}

function lockdownUI() {
  document.getElementById("username").disabled = true;
  document.getElementById("password").disabled = true;
  document.querySelector(".cyber-btn").disabled = true;
  document.querySelector(".cyber-btn").style.opacity = "0.5";
  document.querySelector(".cyber-btn").style.cursor = "not-allowed";
  typeStatus("SYSTEM_HALTED: IP_BLACKLISTED_PERMANENTLY", "danger");

  // Visual feedback for lockdown
  document.getElementById("loginBox").style.borderColor = "var(--danger)";
  document.getElementById("loginBox").style.boxShadow = "0 0 30px rgba(255, 0, 85, 0.4)";
}

function updateThreatLevel() {
  const el = document.getElementById("threatLevel");
  if (stats.threats > 5) {
    el.innerText = "CRITICAL";
    el.style.color = "#ff0055";
  } else if (stats.threats > 2) {
    el.innerText = "ELEVATED";
    el.style.color = "#ffcc00";
  } else {
    el.innerText = "LOW";
    el.style.color = "#00ffcc";
  }
}

function renderLogs() {
  const panel = document.getElementById("logPanel");
  panel.innerHTML = logs.map(l => {
    let color = "#00ffcc";
    if (l.status === "ALERT") color = "#ff0055";
    if (l.status === "FAILURE") color = "#ffcc00";
    if (l.status === "SUCCESS") color = "#00ff66";

    return `<div style="color:${color}; margin-bottom: 5px;">
            [${l.time}] [${l.ip}] [${l.status}] > ${l.msg}
        </div>`;
  }).join("");
}

function updateStats() {
  document.getElementById("successCount").innerText = stats.success;
  document.getElementById("failCount").innerText = stats.fail;
}

async function typeStatus(msg, type) {
  const el = document.getElementById("status");
  el.className = `login-status ${type}`;
  el.innerText = "";
  for (let char of msg) {
    el.innerText += char;
    await new Promise(r => setTimeout(r, 30));
  }
}

function clearLogs() {
  logs = [];
  renderLogs();
}

function exportLogs() {
  const text = logs.map(l => `[${l.time}] [${l.ip}] [${l.user}] [${l.status}] ${l.msg}`).join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `forensic_report_${Date.now()}.log`;
  a.click();
}

// --- SIMULATED BACKGROUND TRAFFIC ---
const FAKE_MSGS = [
  "Scanning open ports...",
  "Heartbeat detected on node 4.",
  "Bypassing firewall layer 2...",
  "Encrypted packet intercepted.",
  "Attempting SQL injection on /api/v1/auth",
  "DDoS attack mitigation active",
  "New user agent detected: Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)",
  "IP 45.12.89.22 flagged as malicious.",
  "Connection refused by peer 10.0.0.5",
  "Unusual traffic volume from internal subnet."
];

function simulateTraffic() {
  if (document.getElementById("dashboard").classList.contains("hidden")) return;

  if (Math.random() > 0.6) {
    const fakeIP = generateIP();
    const rand = Math.random();
    const msg = FAKE_MSGS[Math.floor(Math.random() * FAKE_MSGS.length)];

    if (rand > 0.85) {
      logEvent(fakeIP, "root", "ALERT", msg);
      stats.threats++;
      updateThreatLevel();
    } else {
      logEvent(fakeIP, "sub-sys", "INFO", msg);
    }
  }
}
setInterval(simulateTraffic, 3000);

