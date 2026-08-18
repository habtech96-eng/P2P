const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const db = require('./db');
const { users, coinFlipGames, wheelSpins, penaltyBets, minesGames } = require('./schema');
const { eq, sql } = require('drizzle-orm');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 1. USER SYNC & PROFILE
// ==========================================
app.post('/api/user/sync', async (req, res) => {
  try {
    const { telegramId, username, firstName } = req.body;
    if (!telegramId) return res.status(400).json({ success: false, message: 'telegramId is required' });

    const tid = String(telegramId);
    let existingUser = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);

    if (existingUser.length === 0) {
      const newUser = await db.insert(users).values({
        telegramId: tid,
        username: username || '',
        firstName: firstName || 'User',
        balance: 10
      }).returning();
      return res.json({ success: true, user: newUser[0] });
    }

    res.json({ success: true, user: existingUser[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 🪙 2. COIN FLIP ENDPOINTS
// ==========================================
app.post('/api/coinflip/create', async (req, res) => {
  try {
    const { userId, amount, choice } = req.body;
    const betAmount = Number(amount);
    const tid = String(userId);

    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({ success: false, message: 'እባክዎን ትክክለኛ የብር መጠን ይምረጡ!' });
    }

    const user = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);
    if (!user.length || Number(user[0].balance) < betAmount) {
      return res.status(400).json({ success: false, message: 'በቂ ሂሳብ የለዎትም!' });
    }

    const updatedUser = await db.update(users)
      .set({ balance: sql`${users.balance} - ${betAmount}` })
      .where(eq(users.telegramId, tid))
      .returning();

    const newGame = await db.insert(coinFlipGames).values({
      creatorId: tid,
      amount: betAmount,
      creatorChoice: choice,
      status: 'WAITING'
    }).returning();

    res.json({ success: true, game: newGame[0], newBalance: updatedUser[0].balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/coinflip/lobby', async (req, res) => {
  try {
    const activeGames = await db.select().from(coinFlipGames).where(eq(coinFlipGames.status, 'WAITING'));
    res.json({ success: true, games: activeGames });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/coinflip/accept', async (req, res) => {
  try {
    const { gameId, opponentId } = req.body;
    const tid = String(opponentId);

    const game = await db.select().from(coinFlipGames).where(eq(coinFlipGames.id, Number(gameId))).limit(1);
    if (!game.length || game[0].status !== 'WAITING') {
      return res.status(400).json({ success: false, message: 'ጨዋታው ቀደም ብሎ ተወስዷል ወይም ተሰርዟል!' });
    }

    const currentGame = game[0];
    const betAmount = currentGame.amount;

    if (String(currentGame.creatorId) === tid) {
      return res.status(400).json({ success: false, message: 'የራስዎን Challenge መቀበል አይችሉም!' });
    }

    const opponent = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);
    if (!opponent.length || Number(opponent[0].balance) < betAmount) {
      return res.status(400).json({ success: false, message: 'በቂ ሂሳብ የለዎትም!' });
    }

    await db.update(users).set({ balance: sql`${users.balance} - ${betAmount}` }).where(eq(users.telegramId, tid));

    const outcomes = ['HEADS', 'TAILS'];
    const winningChoice = outcomes[Math.floor(Math.random() * 2)];

    const winnerId = currentGame.creatorChoice === winningChoice ? currentGame.creatorId : tid;
    const totalPrize = betAmount * 2;

    await db.update(users)
      .set({ balance: sql`${users.balance} + ${totalPrize}` })
      .where(eq(users.telegramId, winnerId));

    await db.update(coinFlipGames).set({
      opponentId: tid,
      winningChoice: winningChoice,
      winnerId: winnerId,
      status: 'COMPLETED'
    }).where(eq(coinFlipGames.id, Number(gameId)));

    const callingUser = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);

    res.json({
      success: true,
      winningChoice,
      winnerId,
      newBalance: callingUser[0].balance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 🎡 3. WHEEL OF FORTUNE ENDPOINT
// ==========================================
app.post('/api/wheel/spin', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const betAmount = Number(amount);
    const tid = String(userId);

    if (!tid || isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ success: false, message: 'እባክዎን ትክክለኛ የብር መጠን ይምረጡ!' });
    }

    const userResult = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);
    if (!userResult.length || Number(userResult[0].balance) < betAmount) {
      return res.status(400).json({ success: false, message: 'በቂ ሂሳብ የለዎትም!' });
    }

    const slices = [
      { multiplier: 0 },
      { multiplier: 1.2 },
      { multiplier: 1.5 },
      { multiplier: 2.0 },
      { multiplier: 0 },
      { multiplier: 3.0 },
      { multiplier: 0.5 },
      { multiplier: 5.0 }
    ];

    const sliceIndex = Math.floor(Math.random() * slices.length);
    const chosenSlice = slices[sliceIndex];
    const payout = betAmount * chosenSlice.multiplier;
    const netChange = payout - betAmount;

    const updatedUser = await db.update(users)
      .set({ balance: sql`${users.balance} + ${netChange}` })
      .where(eq(users.telegramId, tid))
      .returning();

    await db.insert(wheelSpins).values({
      userId: tid,
      amount: betAmount,
      multiplier: chosenSlice.multiplier,
      payout: Math.floor(payout)
    });

    res.json({
      success: true,
      sliceIndex,
      multiplier: chosenSlice.multiplier,
      payout,
      newBalance: updatedUser[0].balance
    });
  } catch (err) {
    console.error('Wheel Spin Error:', err.message);
    res.status(500).json({ success: false, message: 'Server Error during Wheel Spin' });
  }
});

// ==========================================
// ⚽ 4. PENALTY SHOOTOUT ENDPOINT
// ==========================================
app.post('/api/penalty/shoot', async (req, res) => {
  try {
    const { userId, amount, direction } = req.body;
    const betAmount = Number(amount);
    const tid = String(userId);

    if (!tid || isNaN(betAmount) || betAmount <= 0 || !direction) {
      return res.status(400).json({ success: false, message: 'መረጃው የተሟላ አይደለም!' });
    }

    const user = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);
    if (!user.length || Number(user[0].balance) < betAmount) {
      return res.status(400).json({ success: false, message: 'በቂ ሂሳብ የለዎትም!' });
    }

    const directions = ['top_left', 'center', 'top_right', 'bottom_left', 'bottom_right'];
    const keeperDirection = directions[Math.floor(Math.random() * directions.length)];

    const isGoal = direction !== keeperDirection;
    const multiplier = 1.9;
    const payout = isGoal ? Math.floor(betAmount * multiplier) : 0;
    const netChange = payout - betAmount;

    const updatedUser = await db.update(users)
      .set({ balance: sql`${users.balance} + ${netChange}` })
      .where(eq(users.telegramId, tid))
      .returning();

    await db.insert(penaltyBets).values({
      userId: tid,
      amount: betAmount,
      direction,
      keeperDirection,
      isGoal,
      payout
    });

    res.json({
      success: true,
      isGoal,
      keeperDirection,
      payout,
      newBalance: updatedUser[0].balance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 💣 5. MINES GAME ENDPOINTS
// ==========================================

// Helper to generate unique random mine locations (0-24)
function generateMines(count) {
  const positions = Array.from({ length: 25 }, (_, i) => i);
  const mines = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    mines.push(positions.splice(randomIndex, 1)[0]);
  }
  return mines;
}

// A. Start Mines Game
app.post('/api/mines/start', async (req, res) => {
  try {
    const { userId, amount, minesCount } = req.body;
    const betAmount = Number(amount);
    const mCount = Number(minesCount);
    const tid = String(userId);

    if (!tid || isNaN(betAmount) || betAmount <= 0 || !mCount) {
      return res.status(400).json({ success: false, message: 'ትክክለኛ መረጃ ያስገቡ!' });
    }

    const user = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);
    if (!user.length || Number(user[0].balance) < betAmount) {
      return res.status(400).json({ success: false, message: 'በቂ ሂሳብ የለዎትም!' });
    }

    // Deduct Balance
    const updatedUser = await db.update(users)
      .set({ balance: sql`${users.balance} - ${betAmount}` })
      .where(eq(users.telegramId, tid))
      .returning();

    const mineLocations = generateMines(mCount);

    const newGame = await db.insert(minesGames).values({
      userId: tid,
      betAmount,
      minesCount: mCount,
      mineLocations,
      revealedTiles: [],
      status: 'IN_PROGRESS',
      currentMultiplier: '1.00',
      profit: 0
    }).returning();

    res.json({
      success: true,
      gameId: newGame[0].id,
      newBalance: updatedUser[0].balance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// B. Reveal Tile
app.post('/api/mines/reveal', async (req, res) => {
  try {
    const { gameId, tileIndex } = req.body;
    const idx = Number(tileIndex);

    const game = await db.select().from(minesGames).where(eq(minesGames.id, Number(gameId))).limit(1);
    if (!game.length || game[0].status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'ጨዋታው ተጠናቋል!' });
    }

    const currentGame = game[0];
    const mines = currentGame.mineLocations;

    // BUSTED (Hit a Mine)
    if (mines.includes(idx)) {
      await db.update(minesGames)
        .set({ status: 'BUSTED' })
        .where(eq(minesGames.id, currentGame.id));

      return res.json({
        success: true,
        hitMine: true,
        status: 'BUSTED',
        mineLocations: mines
      });
    }

    // SAFE (Diamond)
    const revealed = [...(currentGame.revealedTiles || []), idx];
    
    // Multiplier Calculation Formula
    const safeTiles = 25 - currentGame.minesCount;
    const revealedCount = revealed.length;
    let nextMult = 1.0;
    
    for (let i = 0; i < revealedCount; i++) {
      nextMult *= (25 - i) / (safeTiles - i);
    }
    nextMult = parseFloat((nextMult * 0.95).toFixed(2)); // 5% House edge

    await db.update(minesGames)
      .set({
        revealedTiles: revealed,
        currentMultiplier: String(nextMult)
      })
      .where(eq(minesGames.id, currentGame.id));

    res.json({
      success: true,
      hitMine: false,
      status: 'IN_PROGRESS',
      multiplier: nextMult,
      revealedTiles: revealed
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// C. Cashout Mines Game
app.post('/api/mines/cashout', async (req, res) => {
  try {
    const { gameId } = req.body;

    const game = await db.select().from(minesGames).where(eq(minesGames.id, Number(gameId))).limit(1);
    if (!game.length || game[0].status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'ወደ ሂሳብ ማስገባት አይቻልም!' });
    }

    const currentGame = game[0];
    const mult = parseFloat(currentGame.currentMultiplier);
    const winAmount = Math.floor(currentGame.betAmount * mult);

    // Credit User
    const updatedUser = await db.update(users)
      .set({ balance: sql`${users.balance} + ${winAmount}` })
      .where(eq(users.telegramId, currentGame.userId))
      .returning();

    await db.update(minesGames)
      .set({
        status: 'CASHOUT',
        profit: winAmount - currentGame.betAmount
      })
      .where(eq(minesGames.id, currentGame.id));

    res.json({
      success: true,
      status: 'CASHOUT',
      winAmount,
      newBalance: updatedUser[0].balance,
      mineLocations: currentGame.mineLocations
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 💳 6. BALANCE & PAYMENT INTEGRATION
// ==========================================
app.post('/api/user/add-balance', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const addAmount = Number(amount) || 1000;
    const tid = String(userId);

    const updatedUser = await db.update(users)
      .set({ balance: sql`${users.balance} + ${addAmount}` })
      .where(eq(users.telegramId, tid))
      .returning();

    if (!updatedUser.length) {
      return res.status(404).json({ success: false, message: 'ተጠቃሚው አልተገኘም' });
    }

    res.json({ success: true, newBalance: updatedUser[0].balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/pay', async (req, res) => {
  try {
    const { userId, amount, email, firstName } = req.body;
    const depositAmount = Number(amount);
    const tid = String(userId);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ success: false, message: 'ትክክለኛ የብር መጠን ያስገቡ!' });
    }

    const tx_ref = `tx-p2p-${Date.now()}-${tid}-${depositAmount}`;

    const response = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        amount: depositAmount,
        currency: 'ETB',
        email: email || 'user@p2papp.com',
        first_name: firstName || 'User',
        tx_ref: tx_ref,
        callback_url: 'https://p2p-coinflip-game.onrender.com/api/chapa-webhook',
        return_url: 'https://p2p-coinflip-game.onrender.com',
        customization: {
          title: 'P2P Coinflip',
          description: 'Deposit',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status === 'success') {
      res.json({ success: true, checkout_url: response.data.data.checkout_url });
    } else {
      res.status(400).json({ success: false, message: 'Payment initialization failed' });
    }
  } catch (error) {
    console.error('Chapa Initialization Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Server Error during Chapa Payment' });
  }
});

app.post('/api/chapa-webhook', async (req, res) => {
  try {
    const { status, tx_ref } = req.body;

    if (status === 'success' && tx_ref && tx_ref.startsWith('tx-p2p-')) {
      const parts = tx_ref.split('-');
      const tid = String(parts[3]);
      const depositAmount = Number(parts[4]);

      if (tid && depositAmount > 0) {
        await db.update(users)
          .set({ balance: sql`${users.balance} + ${depositAmount}` })
          .where(eq(users.telegramId, tid));

        console.log(`✅ Chapa Deposit Successful! User ${tid} credited with ${depositAmount} ETB.`);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});