// STATE VARIABLES
let balance = 1000;
let betAmount = 50;
let numMines = 3;
let gemsRevealed = 0;
let currentMultiplier = 1.0;
let isGameActive = false;
let gridData = []; // Array storing 'GEM' or 'MINE'

// DOM ELEMENTS
const balanceEl = document.getElementById("user-balance");
const gridEl = document.getElementById("mines-grid");
const betInput = document.getElementById("bet-amount");
const minesSelect = document.getElementById("mines-count");
const nextMultEl = document.getElementById("next-mult");
const currentProfitEl = document.getElementById("current-profit");
const startBtn = document.getElementById("start-btn");
const cashoutBtn = document.getElementById("cashout-btn");
const cashoutAmountEl = document.getElementById("cashout-amount");

// INITIALIZE GRID UI
function initGrid() {
  gridEl.innerHTML = "";
  for (let i = 0; i < 25; i++) {
    const tile = document.createElement("button");
    tile.classList.add("tile");
    tile.dataset.index = i;
    tile.disabled = true;
    tile.addEventListener("click", () => revealTile(i));
    gridEl.appendChild(tile);
  }
}

// MULTIPLIER CALCULATOR
function calculateMultiplier(gemsFound, minesCount) {
  const totalTiles = 25;
  let mult = 1.0;
  for (let i = 0; i < gemsFound; i++) {
    mult *= (totalTiles - i) / (totalTiles - minesCount - i);
  }
  // House edge ~3%
  return Math.max(1.01, mult * 0.97);
}

// START GAME
startBtn.addEventListener("click", () => {
  betAmount = parseFloat(betInput.value);
  numMines = parseInt(minesSelect.value);

  if (isNaN(betAmount) || betAmount <= 0 || betAmount > balance) {
    alert("እባክዎን ትክክለኛ የብር መጠን ያስገቡ!");
    return;
  }

  // Deduct Balance
  balance -= betAmount;
  balanceEl.textContent = balance.toFixed(0);

  // Reset Game State
  isGameActive = true;
  gemsRevealed = 0;
  currentMultiplier = 1.0;

  // Generate Board Data
  gridData = Array(25).fill("GEM");
  let placedMines = 0;
  while (placedMines < numMines) {
    const randIdx = Math.floor(Math.random() * 25);
    if (gridData[randIdx] !== "MINE") {
      gridData[randIdx] = "MINE";
      placedMines++;
    }
  }

  // Reset UI
  initGrid();
  const tiles = gridEl.querySelectorAll(".tile");
  tiles.forEach(t => (t.disabled = false));

  startBtn.style.display = "none";
  cashoutBtn.style.display = "block";
  cashoutBtn.disabled = true;

  betInput.disabled = true;
  minesSelect.disabled = true;

  updateStats();
});

// REVEAL TILE
function revealTile(index) {
  if (!isGameActive) return;

  const tiles = gridEl.querySelectorAll(".tile");
  const tile = tiles[index];

  if (tile.classList.contains("revealed")) return;

  const type = gridData[index];
  tile.classList.add("revealed");

  if (type === "MINE") {
    // HIT BOMB -> GAME OVER
    tile.classList.add("mine");
    tile.textContent = "💣";
    gameOver(false);
  } else {
    // HIT GEM
    tile.classList.add("gem");
    tile.textContent = "💎";
    gemsRevealed++;

    currentMultiplier = calculateMultiplier(gemsRevealed, numMines);
    cashoutBtn.disabled = false;
    updateStats();

    // Checked all safe gems?
    if (gemsRevealed === 25 - numMines) {
      gameOver(true);
    }
  }
}

// UPDATE MULTIPLIER & PROFIT DISPLAY
function updateStats() {
  const currentProfit = betAmount * currentMultiplier;
  const nextMultiplier = calculateMultiplier(gemsRevealed + 1, numMines);

  nextMultEl.textContent = `${nextMultiplier.toFixed(2)}x`;
  currentProfitEl.textContent = `${currentProfit.toFixed(0)} ETB`;
  cashoutAmountEl.textContent = currentProfit.toFixed(0);
}

// CASHOUT ACTION
cashoutBtn.addEventListener("click", () => {
  if (!isGameActive || gemsRevealed === 0) return;
  gameOver(true);
});

// END GAME (WIN / LOSS)
function gameOver(isWin) {
  isGameActive = false;
  const tiles = gridEl.querySelectorAll(".tile");

  // Reveal all remaining tiles
  gridData.forEach((type, idx) => {
    const t = tiles[idx];
    t.disabled = true;
    if (!t.classList.contains("revealed")) {
      t.classList.add("revealed");
      if (type === "MINE") {
        t.textContent = "💣";
        t.style.opacity = "0.5";
      } else {
        t.textContent = "💎";
        t.style.opacity = "0.3";
      }
    }
  });

  if (isWin) {
    const winAmount = betAmount * currentMultiplier;
    balance += winAmount;
    balanceEl.textContent = balance.toFixed(0);
    alert(`🎉 እንኳን ደስ አለዎት! ${winAmount.toFixed(0)} ETB አሸንፈዋል (${currentMultiplier.toFixed(2)}x)`);
  } else {
    alert("💣 ቦምብ ፈነዳ! ብርዎን ተበልተዋል።");
  }

  // Restore UI Controls
  startBtn.style.display = "block";
  cashoutBtn.style.display = "none";
  betInput.disabled = false;
  minesSelect.disabled = false;
}

// FIRST LOAD
initGrid();