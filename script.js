/* Matrix Rain Effect */
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nums = '0123456789';
const alphabet = katakana + latin + nums;

const fontSize = 16;
const columns = canvas.width / fontSize;

const rainDrops = [];

for (let x = 0; x < columns; x++) {
    rainDrops[x] = 1;
}

const drawMatrix = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            rainDrops[i] = 0;
        }
        rainDrops[i]++;
    }
};

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

setInterval(drawMatrix, 30);


/* Logic for Login System */

// State
let failedAttempts = 0;
let isLocked = false;
let totalAttempts = 0;
let detectedThreats = 0;
let logs = [];

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageArea = document.getElementById('message-area');
const attemptDisplay = document.getElementById('attempt-display');
const logConsole = document.getElementById('log-console');
const togglePassBtn = document.getElementById('togglePassword');

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');

// Dashboard Elements
const totalAttemptsDisplay = document.getElementById('total-attempts-count');
const failedAttemptsDisplay = document.getElementById('failed-attempts-count');
const threatsBlockedDisplay = document.getElementById('threats-blocked-count');
const logoutBtn = document.getElementById('logout-btn');

// Constants
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 5000; // 5 seconds for demo purposes
const CORRECT_USER = 'admin';
const CORRECT_PASS = 'secure123'; // Hardcoded for demo

// Utils
const generateIP = () => {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

const getTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}

const addLog = (user, status, type = 'info') => {
    const p = document.createElement('div');
    p.classList.add('log-line');

    let colorClass = 'log-user';
    if (type === 'error') colorClass = 'log-alert';
    if (type === 'success') colorClass = 'log-success';

    p.innerHTML = `
        <span class="log-timestamp">[${getTime()}]</span>
        <span class="log-ip">IP: ${generateIP()}</span> | 
        <span class="${colorClass}">USER: ${user || 'UNKNOWN'}</span> | 
        <span class="${colorClass}">STATUS: ${status}</span>
    `;

    logConsole.appendChild(p);
    // Auto scroll
    logConsole.scrollTop = logConsole.scrollHeight;

    // Track for dashboard
    logs.push({
        time: getTime(),
        user: user,
        status: status,
        type: type
    });
};

const updateUI = () => {
    attemptDisplay.innerText = `ATTEMPTS: ${failedAttempts}`;
    if (failedAttempts >= MAX_ATTEMPTS) {
        attemptDisplay.style.color = 'red';
    } else {
        attemptDisplay.style.color = 'var(--primary-color)';
    }
}

const lockAccount = () => {
    isLocked = true;
    detectedThreats++;
    loginBtn.disabled = true;
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    messageArea.innerHTML = '<span class="error-msg">⚠ BRUTE FORCE DETECTED. TERMINAL LOCKED.</span>';

    addLog(usernameInput.value, 'BRUTE FORCE DETECTED - LOCKED', 'error');

    let countdown = LOCKOUT_TIME / 1000;
    const interval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(interval);
            unlockAccount();
        }
    }, 1000);
}

const unlockAccount = () => {
    isLocked = false;
    failedAttempts = 0;
    loginBtn.disabled = false;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    usernameInput.value = '';
    passwordInput.value = '';
    messageArea.innerHTML = '';
    updateUI();
    addLog('SYSTEM', 'TERMINAL UNLOCKED', 'info');
}

// Event Listeners
togglePassBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassBtn.classList.remove('fa-eye');
        togglePassBtn.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        togglePassBtn.classList.remove('fa-eye-slash');
        togglePassBtn.classList.add('fa-eye');
    }
});

const handleLogin = () => {
    if (isLocked) return;

    const user = usernameInput.value;
    const pass = passwordInput.value;

    if (!user || !pass) {
        messageArea.innerHTML = '<span class="error-msg">CREDENTIALS REQUIRED</span>';
        return;
    }

    totalAttempts++;

    // Simulate processing delay
    loginBtn.innerHTML = '<span class="blink">AUTHENTICATING...</span>';

    setTimeout(() => {
        if (user === CORRECT_USER && pass === CORRECT_PASS) {
            // Success
            addLog(user, 'ACCESS GRANTED', 'success');
            loginSuccess();
        } else {
            // Fail
            failedAttempts++;
            updateUI();
            addLog(user, `AUTH FAILED (Attempt ${failedAttempts})`, 'info');

            if (failedAttempts >= MAX_ATTEMPTS) {
                lockAccount();
            } else {
                messageArea.innerHTML = '<span class="error-msg">INVALID CREDENTIALS</span>';
            }
        }
        loginBtn.innerHTML = '<span class="btn-text">AUTHENTICATE</span><span class="btn-glitch"></span>';
    }, 800);
};

loginBtn.addEventListener('click', handleLogin);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// Dashboard Logic
const loginSuccess = () => {
    messageArea.innerHTML = '<span class="success-msg">ACCESS GRANTED. REDIRECTING...</span>';
    setTimeout(() => {
        loginSection.classList.add('hidden-section');
        loginSection.classList.remove('active-section');

        dashboardSection.classList.remove('hidden-section');
        dashboardSection.classList.add('active-section');

        loadDashboard();
    }, 1500);
}

const loadDashboard = () => {
    totalAttemptsDisplay.innerText = totalAttempts;
    failedAttemptsDisplay.innerText = totalAttempts - 1; // Assuming 1 success
    threatsBlockedDisplay.innerText = detectedThreats;

    const eventList = document.getElementById('event-list');
    eventList.innerHTML = '';
    logs.slice().reverse().forEach(log => {
        const li = document.createElement('li');
        li.style.borderBottom = "1px solid #333";
        li.style.padding = "5px 0";
        li.style.color = log.type === 'error' ? 'red' : (log.type === 'success' ? '#0f0' : '#ccc');
        li.innerText = `[${log.time}] ${log.user} - ${log.status}`;
        eventList.appendChild(li);
    });
}

logoutBtn.addEventListener('click', () => {
    location.reload(); // Simple reload to reset state for demo
});

// Init
addLog('SYSTEM', 'INITIATING LOG SEQUENCE...', 'info');
