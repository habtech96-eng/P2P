// STATE VARIABLES
let selectedAmount = 10;
let selectedChoice = 'HEADS';
let currentUserId = null;

const tg = window.Telegram?.WebApp;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initApp();
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
    document.getElementById('username').textContent = username;
    document.getElementById('avatar-letter').textContent = username.charAt(0).toUpperCase();
    document.getElementById('tg-status').textContent = tgUser ? 'Connected via Telegram' : 'Local Sandbox Mode';

    await syncUser(currentUserId, username, firstName);
    await loadLobby();

    setInterval(loadLobby, 4000); // Poll lobby every 4 sec
  } catch (error) {
    console.error('App init error:', error);
  }
}

function setupEventListeners() {
  // Amount Selection
  document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = Number(btn.getAttribute('data-amount'));
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
  document.getElementById('create-game-btn').addEventListener('click', handleCreateChallenge);
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

// CREATE CHALLENGE
async function handleCreateChallenge() {
  try {
    const btn = document.getElementById('create-game-btn');
    btn.disabled = true;

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
    btn.disabled = false;

    if (data.success) {
      updateBalance(data.newBalance);
      showMessage('Challenge Created! Waiting for opponent...');
      await loadLobby();
    } else {
      showMessage(data.message || 'Failed to create challenge');
    }
  } catch (err) {
    document.getElementById('create-game-btn').disabled = false;
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

  modal.style.display = 'flex';
  coin.className = 'coin';
  statusText.innerText = 'Flipping Coin...';
  resultText.innerText = 'Good Luck!';

  setTimeout(() => {
    coin.classList.add(winningChoice === 'HEADS' ? 'spin-heads' : 'spin-tails');
  }, 100);

  setTimeout(() => {
    statusText.innerText = `Result: ${winningChoice}!`;
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
