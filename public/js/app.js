/* ==========================================
   1. TELEGRAM SDK & INITIALIZATION
   ========================================== */
const tg = window.Telegram?.WebApp;

// Telegram Theme and Setup
if (tg) {
  tg.expand();
  tg.ready();
}

// Sound Effects Engine
const sounds = {
  click: new Audio('assets/sounds/click.mp3'),
  win: new Audio('assets/sounds/win.mp3'),
  lose: new Audio('assets/sounds/lose.mp3'),
  flip: new Audio('assets/sounds/flip.mp3')
};

function playSound(name) {
  try {
    if (sounds[name]) {
      sounds[name].currentTime = 0;
      sounds[name].play().catch(() => {});
    }
  } catch (e) {
    console.log("Audio playback error:", e);
  }
}

// Haptic Feedback Helper
function triggerHaptic(type = 'medium') {
  if (tg?.HapticFeedback) {
    if (type === 'success' || type === 'error' || type === 'warning') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  }
}

// State Management
const state = {
  user: {
    username: tg?.initDataUnsafe?.user?.first_name || "Guest",
    balance: 1000.00
  },
  activeGame: 'coinflip',
  coinflip: { choice: 'HEADS', amount: 10 },
  wheel: { amount: 10, spinning: false },
  penalty: { amount: 10 },
  mines: { amount: 10, count: 3, active: false, revealed: 0, multiplier: 1.0 }
};

/* ==========================================
   2. APP INITIALIZATION & UI SETUP
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
  initUser();
  setupEventListeners();
  initWheelCanvas();
});

function initUser() {
  const usernameEl = document.getElementById("username");
  const avatarEl = document.getElementById("avatar-letter");
  const statusEl = document.getElementById("tg-status");

  if (usernameEl) usernameEl.innerText = state.user.username;
  if (avatarEl) avatarEl.innerText = state.user.username.charAt(0).toUpperCase();
  if (statusEl) statusEl.innerText = tg?.initDataUnsafe?.user ? "Telegram Connected" : "Guest Mode";

  updateBalanceUI();
}

function updateBalanceUI() {
  const balanceEl = document.getElementById("user-balance");
  if (balanceEl) balanceEl.innerText = state.user.balance.toFixed(2);
}

/* ==========================================
   3. NAVIGATION TABS (GAME SWITCHING)
   ========================================== */
function switchGame(gameName) {
  playSound('click');
  triggerHaptic('light');

  state.activeGame = gameName;

  // Toggle Tab Buttons
  document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
  const activeTab = document.getElementById(`tab-${gameName}`);
  if (activeTab) activeTab.classList.add("active");

  // Toggle Game Views
  document.querySelectorAll(".game-view").forEach(view => view.classList.add("hidden"));
  const activeView = document.getElementById(`${gameName}-game-section`);
  if (activeView) activeView.classList.remove("hidden");
}

/* ==========================================
   4. GAME 1: COIN FLIP
   ========================================== */
function setupEventListeners() {
  // Coinside Selection
  document.querySelectorAll(".coin-choice").forEach(btn => {
    btn.addEventListener("click", (e) => {
      playSound('click');
      triggerHaptic('selectionChanged');
      document.querySelectorAll(".coin-choice").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.coinflip.choice = btn.dataset.choice;
    });
  });

  // Coinflip Amount
  document.querySelectorAll(".amount-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      playSound('click');
      triggerHaptic('selectionChanged');
      document.querySelectorAll(".amount-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.coinflip.amount = parseFloat(btn.dataset.amount);
    });
  });

  // Create Challenge Button
  const createGameBtn = document.getElementById("create-game-btn");
  if (createGameBtn) {
    createGameBtn.addEventListener("click", startCoinflip);
  }
}

function startCoinflip() {
  if (state.user.balance < state.coinflip.amount) {
    triggerHaptic('error');
    alert("በቂ የብር መጠን የለዎትም!");
    return;
  }

  state.user.balance -= state.coinflip.amount;
  updateBalanceUI();
  triggerHaptic('medium');
  playSound('flip');

  const modal = document.getElementById("coin-modal");
  const status = document.getElementById("modal-status");
  const resultText = document.getElementById("modal-result-text");

  modal.classList.remove("hidden");
  status.innerText = "Flipping Coin...";
  resultText.innerText = `Staked: ${state.coinflip.amount} ETB on ${state.coinflip.choice}`;

  setTimeout(() => {
    const isWin = Math.random() > 0.5;
    const outcome = isWin ? state.coinflip.choice : (state.coinflip.choice === 'HEADS' ? 'TAILS' : 'HEADS');

    if (isWin) {
      const winAmount = state.coinflip.amount * 1.95;
      state.user.balance += winAmount;
      updateBalanceUI();
      playSound('win');
      triggerHaptic('success');
      status.innerText = "🎉 YOU WON!";
      resultText.innerText = `Outcome: ${outcome}. Won ${winAmount.toFixed(2)} ETB!`;
    } else {
      playSound('lose');
      triggerHaptic('error');
      status.innerText = "❌ YOU LOST!";
      resultText.innerText = `Outcome: ${outcome}. Better luck next time.`;
    }

    setTimeout(() => {
      modal.classList.add("hidden");
    }, 2000);
  }, 1500);
}

/* ==========================================
   5. GAME 2: WHEEL OF FORTUNE
   ========================================== */
function initWheelCanvas() {
  const canvas = document.getElementById("wheel-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const segments = ["0.5x", "1.5x", "2.0x", "0x", "5.0x", "1.2x"];
  const colors = ["#ef4444", "#3b82f6", "#10b981", "#6b7280", "#f59e0b", "#8b5cf6"];

  const angle = (2 * Math.PI) / segments.length;
  for (let i = 0; i < segments.length; i++) {
    ctx.beginPath();
    ctx.arc(130, 130, 120, i * angle, (i + 1) * angle);
    ctx.lineTo(130, 130);
    ctx.fillStyle = colors[i];
    ctx.fill();

    ctx.save();
    ctx.translate(130, 130);
    ctx.rotate(i * angle + angle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(segments[i], 100, 5);
    ctx.restore();
  }
}

/* ==========================================
   6. GAME 3: PENALTY SHOOTOUT
   ========================================== */
function shootPenalty(direction) {
  triggerHaptic('heavy');
  playSound('click');
  
  const isGoal = Math.random() > 0.4; // 60% win rate
  const amount = state.penalty.amount;

  if (state.user.balance < amount) {
    alert("በቂ የብር መጠን የለዎትም!");
    return;
  }

  if (isGoal) {
    const winAmount = amount * 1.9;
    state.user.balance += winAmount;
    updateBalanceUI();
    playSound('win');
    triggerHaptic('success');
    alert(`⚽ GOAL! You won ${winAmount.toFixed(2)} ETB!`);
  } else {
    state.user.balance -= amount;
    updateBalanceUI();
    playSound('lose');
    triggerHaptic('error');
    alert("🧤 SAVED BY KEEPER! You lost.");
  }
}

/* ==========================================
   7. MODALS LOGIC
   ========================================== */
function openDepositModal() {
  playSound('click');
  triggerHaptic('light');
  document.getElementById("deposit-modal")?.classList.remove("hidden");
}

function closeDepositModal() {
  playSound('click');
  document.getElementById("deposit-modal")?.classList.add("hidden");
}
