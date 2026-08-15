// STATE VARIABLES
let selectedAmount = 10;
let selectedChoice = 'HEADS';
let selectedWheelAmount = 10;
let selectedPenaltyAmount = 10;
let currentUserId = null;
let currentGame = 'coinflip'; // 'coinflip', 'wheel', or 'penalty'

// WHEEL CONFIGURATION
let wheelAngle = 0;
let isSpinning = false;
const wheelSlices = [
  { label: '0x', value: 0, color: '#ef4444' },
  { label: '1.2x', value: 1.2, color: '#3b82f6' },
  { label: '1.5x', value: 1.5, color: '#10b981' },
  { label: '2x', value: 2.0, color: '#f59e0b' },
  { label: '0x', value: 0, color: '#ef4444' },
  { label: '3x', value: 3.0, color: '#8b5cf6' },
  { label: '0.5x', value: 0.5, color: '#64748b' },
  { label: '5x', value: 5.0, color: '#ec4899' }
];

const tg = window.Telegram?.WebApp;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initApp();
  drawWheel(0);
});

async function initApp() {
  try {
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.colorScheme) {
        document.documentElement.setAttribute('data-theme', tg.colorScheme);
      }
    }

    const tgUser = tg?.initDataUnsafe?.user;
    currentUserId = tgUser?.id ? String(tgUser.id) : '1859332145';
    const username = tgUser?.username || tgUser?.first_name || 'Guest User';
    const firstName = tgUser?.first_name || 'Guest';

    // Update UI
    const usernameEl = document.getElementById('username');
    const avatarEl = document.getElementById('avatar-letter');
    const statusEl = document.getElementById('tg-status');

    if (usernameEl) usernameEl.textContent = username;
    if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
    if (statusEl) statusEl.textContent = tgUser ? 'Connected via Telegram' : 'Local Sandbox Mode';

    await syncUser(currentUserId, username, firstName);
    await loadLobby();

    setInterval(() => {
      if (currentGame === 'coinflip') loadLobby();
    }, 4000);
  } catch (error) {
    console.error('App init error:', error);
  }
}

// GAME SWITCHER
function switchGame(game) {
  currentGame = game;
  const coinSection = document.getElementById('coinflip-game-section');
  const wheelSection = document.getElementById('wheel-game-section');
  const penaltySection = document.getElementById('penalty-game-section');

  const coinTab = document.getElementById('tab-coinflip');
  const wheelTab = document.getElementById('tab-wheel');
  const penaltyTab = document.getElementById('tab-penalty');

  // Reset tab styles
  [coinTab, wheelTab, penaltyTab].forEach(tab => {
    if (tab) {
      tab.style.background = '#1e293b';
      tab.style.color = '#94a3b8';
    }
  });

  // Hide all sections
  if (coinSection) coinSection.style.display = 'none';
  if (wheelSection) wheelSection.style.display = 'none';
  if (penaltySection) penaltySection.style.display = 'none';

  // Activate selected section & tab
  if (game === 'coinflip') {
    if (coinSection) coinSection.style.display = 'block';
    if (coinTab) { coinTab.style.background = '#3b82f6'; coinTab.style.color = '#fff'; }
  } else if (game === 'wheel') {
    if (wheelSection) wheelSection.style.display = 'block';
    if (wheelTab) { wheelTab.style.background = '#f59e0b'; wheelTab.style.color = '#fff'; }
    drawWheel(wheelAngle);
  } else if (game === 'penalty') {
    if (penaltySection) penaltySection.style.display = 'block';
    if (penaltyTab) { penaltyTab.style.background = '#10b981'; penaltyTab.style.color = '#fff'; }
  }
}

function setupEventListeners() {
  // Coin Flip Amount Selection
  document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = Number(btn.getAttribute('data-amount'));
    });
  });

  // Wheel Amount Selection
  document.querySelectorAll('.wheel-amount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wheel-amount-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedWheelAmount = Number(btn.getAttribute('data-amount'));
    });
  });

  // Penalty Amount Selection
  document.querySelectorAll('.penalty-amount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.penalty-amount-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPenaltyAmount = Number(btn.getAttribute('data-amount'));
    });
  });

  // Choice Selection (HEADS / TAILS)
  document.querySelectorAll('.coin-choice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.coin-choice').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedChoice = e.currentTarget.dataset.choice;
    });
  });

  // Create Challenge Button
  const createBtn = document.getElementById('create-game-btn');
  if (createBtn) createBtn.addEventListener('click', handleCreateChallenge);

  // Spin Wheel Button
  const spinBtn = document.getElementById('spin-wheel-btn');
  if (spinBtn) spinBtn.addEventListener('click', handleSpinWheel);

  // Deposit Modal Triggers
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) payBtn.addEventListener('click', executeChapaPay);
}

// USER SYNC
async function syncUser(telegramId, username, firstName) {
  try {
    const res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId, username, firstName })
    });
    const data = await res.json();
    if (data.success && data.user) {
      updateBalance(data.user.balance);
    }
  } catch (err) {
    console.error('Sync error:', err);
  }
}

function updateBalance(balance) {
  const el = document.getElementById('user-balance');
  if (el) el.textContent = Number(balance || 0).toLocaleString();
}

// ==========================================
// 🎡 WHEEL OF FORTUNE CANVAS & LOGIC
// ==========================================

function drawWheel(angle) {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const radius = width / 2;
  const sliceAngle = (2 * Math.PI) / wheelSlices.length;

  ctx.clearRect(0, 0, width, height);

  wheelSlices.forEach((slice, i) => {
    const startAngle = angle + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    // Draw Slice
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius - 5, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Draw Text
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(slice.label, radius - 20, 6);
    ctx.restore();
  });

  // Inner Circle
  ctx.beginPath();
  ctx.arc(radius, radius, 25, 0, 2 * Math.PI);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();
}

async function handleSpinWheel() {
  if (isSpinning) return;

  const btn = document.getElementById('spin-wheel-btn');
  try {
    isSpinning = true;
    if (btn) btn.disabled = true;

    const res = await fetch('/api/wheel/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        amount: selectedWheelAmount
      })
    });

    const data = await res.json();
    if (!data.success) {
      showMessage(data.message || 'Spin failed!');
      isSpinning = false;
      if (btn) btn.disabled = false;
      return;
    }

    // Calculate rotation angle for chosen slice
    const sliceIndex = data.sliceIndex;
    const sliceAngle = (2 * Math.PI) / wheelSlices.length;
    const targetSliceAngle = (3 * Math.PI / 2) - (sliceIndex * sliceAngle) - (sliceAngle / 2);
    const totalRotation = (2 * Math.PI * 5) + targetSliceAngle; // 5 Full spins

    let startTime = null;
    const duration = 4000; // 4 seconds spin

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out effect
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAngle = wheelAngle + (totalRotation * easeOut);

      drawWheel(currentAngle % (2 * Math.PI));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        wheelAngle = targetSliceAngle % (2 * Math.PI);
        isSpinning = false;
        if (btn) btn.disabled = false;

        updateBalance(data.newBalance);
        if (data.payout > 0) {
          showMessage(`🎉 CONGRATS! You won ${data.payout} ETB (${data.multiplier}x)!`);
        } else {
          showMessage('❌ No luck this time! Try again.');
        }
      }
    }

    requestAnimationFrame(animate);
  } catch (err) {
    isSpinning = false;
    if (btn) btn.disabled = false;
    showMessage('Error processing spin.');
  }
}

// ==========================================
// ⚽ PENALTY SHOOTOUT LOGIC
// ==========================================

async function shootPenalty(target) {
  const shotBtns = document.querySelectorAll('.shot-btn');
  try {
    shotBtns.forEach(btn => btn.disabled = true);

    const res = await fetch('/api/penalty/shoot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        amount: selectedPenaltyAmount,
        target: target
      })
    });

    const data = await res.json();
    shotBtns.forEach(btn => btn.disabled = false);

    if (!data.success) {
      showMessage(data.message || 'Shot failed!');
      return;
    }

    updateBalance(data.newBalance);

    if (data.isGoal) {
      showMessage(`⚽ GOAL! You won ${data.payout} ETB! (Keeper dived: ${data.keeperDive.replace('_', ' ').toUpperCase()})`);
    } else {
      showMessage(`🧤 SAVED! Keeper caught your shot! (Keeper dived: ${data.keeperDive.replace('_', ' ').toUpperCase()})`);
    }
  } catch (err) {
    shotBtns.forEach(btn => btn.disabled = false);
    showMessage('Error processing penalty shot.');
  }
}

// CREATE CHALLENGE
async function handleCreateChallenge() {
  const btn = document.getElementById('create-game-btn');
  try {
    if (btn) btn.disabled = true;

    const res = await fetch('/api/coinflip/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        amount: selectedAmount,
        choice: selectedChoice
      })
    });
    const data = await res.json();
    if (btn) btn.disabled = false;

    if (data.success) {
      updateBalance(data.newBalance);
      showMessage('Challenge Created! Waiting for opponent...');
      await loadLobby();
    } else {
      showMessage(data.message || 'Failed to create challenge');
    }
  } catch (err) {
    if (btn) btn.disabled = false;
    showMessage('Error creating challenge');
  }
}

// LOAD ACTIVE LOBBY
async function loadLobby() {
  const container = document.getElementById('lobby-container');
  if (!container) return;

  try {
    const res = await fetch('/api/coinflip/lobby');
    const data = await res.json();

    if (!data.success || !Array.isArray(data.games) || data.games.length === 0) {
      container.innerHTML = `<div class="loading-state"><span>No open challenges. Create one! 🪙</span></div>`;
      return;
    }

    container.innerHTML = data.games.map(game => {
      const isMyGame = String(game.creatorId) === String(currentUserId);
      return `
        <div class="lobby-item">
          <div class="lobby-info">
            <strong>${game.amount} ETB Challenge</strong>
            <small>Creator chose: ${game.creatorChoice} ${isMyGame ? '(You)' : ''}</small>
          </div>
          ${!isMyGame 
            ? `<button class="join-btn" onclick="acceptChallenge(${game.id})">Accept</button>` 
            : `<small style="color:var(--muted); font-weight: 600;">Waiting for opponent...</small>`
          }
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Lobby load error:', err);
  }
}

// ACCEPT CHALLENGE & FLIP COIN
async function acceptChallenge(gameId) {
  try {
    const res = await fetch('/api/coinflip/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, opponentId: currentUserId })
    });
    const data = await res.json();

    if (data.success) {
      animateCoinFlip(data.winningChoice, () => {
        if (String(data.winnerId) === String(currentUserId)) {
          showMessage('🎉 CONGRATULATIONS! YOU WON!');
        } else {
          showMessage('❌ YOU LOST! Better luck next time.');
        }
        updateBalance(data.newBalance);
        loadLobby();
      });
    } else {
      showMessage(data.message || 'Failed to accept challenge');
    }
  } catch (err) {
    showMessage('Error accepting challenge');
  }
}

// COIN FLIP ANIMATION
function animateCoinFlip(winningChoice, onComplete) {
  const modal = document.getElementById('coin-modal');
  const coin = document.getElementById('coin');
  const statusText = document.getElementById('modal-status');
  const resultText = document.getElementById('modal-result-text');

  if (!modal || !coin) return;

  modal.style.display = 'flex';
  coin.className = 'coin';
  if (statusText) statusText.innerText = 'Flipping Coin...';
  if (resultText) resultText.innerText = 'Good Luck!';

  setTimeout(() => {
    coin.classList.add(winningChoice === 'HEADS' ? 'spin-heads' : 'spin-tails');
  }, 100);

  setTimeout(() => {
    if (statusText) statusText.innerText = `Result: ${winningChoice}!`;
    if (onComplete) onComplete();
    setTimeout(() => {
      modal.style.display = 'none';
      coin.className = 'coin';
    }, 2500);
  }, 3100);
}

function showMessage(msg) {
  if (tg?.showAlert) tg.showAlert(String(msg));
  else alert(String(msg));
}

// ==========================================
// 💳 CHAPA PAYMENT (DEPOSIT MODAL LOGIC)
// ==========================================

function openDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (modal) modal.style.display = 'flex';
}

function closeDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (modal) modal.style.display = 'none';
}

async function executeChapaPay() {
  const amountInput = document.getElementById('deposit-amount')?.value;
  const payBtn = document.getElementById('pay-btn');

  if (!amountInput || Number(amountInput) <= 0) {
    showMessage('እባክዎን ትክክለኛ የብር መጠን ያስገቡ!');
    return;
  }

  try {
    if (payBtn) {
      payBtn.innerText = "እየላከ ነው...";
      payBtn.disabled = true;
    }

    const tgUser = tg?.initDataUnsafe?.user;
    
    const res = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        amount: Number(amountInput),
        firstName: tgUser?.first_name || 'User',
        email: `${currentUserId}@p2papp.com`
      })
    });

    const data = await res.json();
    
    if (payBtn) {
      payBtn.innerText = "በ Chapa ክፈል";
      payBtn.disabled = false;
    }

    if (data.success && data.checkout_url) {
      closeDepositModal();
      if (tg?.openLink) {
        tg.openLink(data.checkout_url);
      } else {
        window.location.href = data.checkout_url;
      }
    } else {
      showMessage(data.message || 'ክፍያ ማስጀመር አልተቻለም!');
    }
  } catch (err) {
    if (payBtn) {
      payBtn.innerText = "በ Chapa ክፈል";
      payBtn.disabled = false;
    }
    showMessage('የሰርቨር ኤረር አጋጥሟል!');
  }
}
