let currentGameId = null;
let selectedAmount = 10;
let isGameActive = false;

export function initMines(tgUser, updateBalanceUI) {
  renderGrid();
  setupEventListeners(tgUser, updateBalanceUI);
}

function renderGrid() {
  const gridContainer = document.getElementById('mines-grid');
  if (!gridContainer) return;

  gridContainer.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    const tile = document.createElement('button');
    tile.className = 'mine-tile';
    tile.dataset.index = i;
    tile.disabled = true;
    tile.innerText = '❓';
    gridContainer.appendChild(tile);
  }
}

function setupEventListeners(tgUser, updateBalanceUI) {
  // Amount Selection
  document.querySelectorAll('.mines-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isGameActive) return;
      document.querySelectorAll('.mines-chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = Number(btn.dataset.amount);
    });
  });

  // Start Game Button
  const startBtn = document.getElementById('start-mines-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => handleStartGame(tgUser, updateBalanceUI));
  }

  // Cashout Button
  const cashoutBtn = document.getElementById('cashout-mines-btn');
  if (cashoutBtn) {
    cashoutBtn.addEventListener('click', () => handleCashout(updateBalanceUI));
  }
}

async function handleStartGame(tgUser, updateBalanceUI) {
  const minesCount = document.getElementById('mines-count-select').value;

  try {
    const res = await fetch('/api/mines/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: tgUser.id,
        amount: selectedAmount,
        minesCount: Number(minesCount)
      })
    });

    const data = await res.json();
    if (data.success) {
      currentGameId = data.gameId;
      isGameActive = true;
      updateBalanceUI(data.newBalance);
      
      resetUIForNewGame();
      enableGrid(tgUser, updateBalanceUI);
    } else {
      alert(data.message || 'ጨዋታ መጀመር አልተቻለም');
    }
  } catch (err) {
    alert('የኔትወርክ ችግር አጋጥሟል');
  }
}

function enableGrid(tgUser, updateBalanceUI) {
  document.querySelectorAll('.mine-tile').forEach(tile => {
    tile.disabled = false;
    tile.innerText = '';
    tile.className = 'mine-tile';
    
    tile.onclick = async () => {
      if (!isGameActive || tile.disabled) return;
      tile.disabled = true;

      const tileIndex = tile.dataset.index;
      try {
        const res = await fetch('/api/mines/reveal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: currentGameId, tileIndex })
        });
        const result = await res.json();

        if (result.success) {
          if (result.hitMine) {
            tile.classList.add('revealed-bomb');
            tile.innerText = '💣';
            endGame(false, result.mineLocations);
          } else {
            tile.classList.add('revealed-gem');
            tile.innerText = '💎';
            
            document.getElementById('mines-next-mult').innerText = `${result.multiplier}x`;
            const profit = Math.floor(selectedAmount * result.multiplier);
            document.getElementById('mines-profit').innerText = `${profit} ETB`;
            
            const cashoutBtn = document.getElementById('cashout-mines-btn');
            cashoutBtn.disabled = false;
            document.getElementById('mines-cashout-val').innerText = profit;
          }
        }
      } catch (e) {
        alert('ስህተት ተፈጥሯል');
      }
    };
  });
}

async function handleCashout(updateBalanceUI) {
  if (!isGameActive || !currentGameId) return;

  try {
    const res = await fetch('/api/mines/cashout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: currentGameId })
    });
    const data = await res.json();

    if (data.success) {
      updateBalanceUI(data.newBalance);
      alert(`🎉 ተሳክቷል! ${data.winAmount} ETB ወጥቷል!`);
      endGame(true, data.mineLocations);
    }
  } catch (err) {
    alert('የCashout ችግር አጋጥሟል');
  }
}

function endGame(won, mineLocations = []) {
  isGameActive = false;

  document.querySelectorAll('.mine-tile').forEach(tile => {
    tile.disabled = true;
    const idx = Number(tile.dataset.index);
    if (mineLocations.includes(idx)) {
      tile.classList.add('revealed-bomb');
      tile.innerText = '💣';
    }
  });

  document.getElementById('start-mines-btn').classList.remove('hidden');
  document.getElementById('cashout-mines-btn').classList.add('hidden');
}

function resetUIForNewGame() {
  document.getElementById('start-mines-btn').classList.add('hidden');
  const cashoutBtn = document.getElementById('cashout-mines-btn');
  cashoutBtn.classList.remove('hidden');
  cashoutBtn.disabled = true;

  document.getElementById('mines-next-mult').innerText = '1.00x';
  document.getElementById('mines-profit').innerText = '0 ETB';
  document.getElementById('mines-cashout-val').innerText = '0';
}