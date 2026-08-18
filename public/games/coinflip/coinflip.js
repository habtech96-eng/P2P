let selectedChoice = 'HEADS';
let selectedAmount = 10;

export function initCoinflip(tgUser, updateBalanceUI) {
  setupEventListeners(tgUser, updateBalanceUI);
  fetchLobby(tgUser, updateBalanceUI);
}

function setupEventListeners(tgUser, updateBalanceUI) {
  // Choice selection
  document.querySelectorAll('.coin-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.coin-choice-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedChoice = btn.dataset.choice;
    });
  });

  // Amount selection
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = Number(btn.dataset.amount);
    });
  });

  // Create Challenge Button
  const createBtn = document.getElementById('create-coin-challenge');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/coinflip/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: tgUser.id,
            amount: selectedAmount,
            choice: selectedChoice
          })
        });

        const data = await res.json();
        if (data.success) {
          updateBalanceUI(data.newBalance);
          fetchLobby(tgUser, updateBalanceUI);
        } else {
          alert(data.message || 'Challenge መፍጠር አልተቻለም');
        }
      } catch (err) {
        alert('የኔትወርክ ችግር አጋጥሟል');
      }
    });
  }
}

export async function fetchLobby(tgUser, updateBalanceUI) {
  const container = document.getElementById('lobby-container');
  if (!container) return;

  try {
    const res = await fetch('/api/coinflip/lobby');
    const data = await res.json();

    if (!data.success || !data.games.length) {
      container.innerHTML = '<p class="empty-text">ምንም ክፍት ጨዋታ የለም:: የመጀመሪያው ይሁኑ!</p>';
      return;
    }

    container.innerHTML = data.games.map(game => `
      <div class="lobby-card">
        <div class="lobby-info">
          <span>👤 ${game.creatorId.slice(0, 6)}...</span>
          <strong>${game.amount} ETB</strong>
        </div>
        <button class="accept-btn" onclick="window.acceptCoinChallenge(${game.id})">
          መጫወቻ (Accept)
        </button>
      </div>
    `).join('');

    // Global hook for accept button
    window.acceptCoinChallenge = async (gameId) => {
      try {
        const acceptRes = await fetch('/api/coinflip/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, opponentId: tgUser.id })
        });
        const result = await acceptRes.json();

        if (result.success) {
          updateBalanceUI(result.newBalance);
          alert(result.winnerId === String(tgUser.id) ? '🎉 አሸንፈዋል!' : '❌ ተሸንፈዋል!');
          fetchLobby(tgUser, updateBalanceUI);
        } else {
          alert(result.message);
        }
      } catch (e) {
        alert('ችግር ተፈጥሯል');
      }
    };
  } catch (err) {
    container.innerHTML = '<p class="error-text">መረጃ መጫን አልተቻለም</p>';
  }
}