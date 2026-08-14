const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const db = require('./db');
const { users, coinFlipGames } = require('./schema');
const { eq, sql } = require('drizzle-orm');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. User Sync
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

// 2. Create Coin Flip Challenge
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

    // Deduct balance
    const updatedUser = await db.update(users)
      .set({ balance: sql`${users.balance} - ${betAmount}` })
      .where(eq(users.telegramId, tid))
      .returning();

    // Create Game
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

// 3. Get Active Lobby Games
app.get('/api/coinflip/lobby', async (req, res) => {
  try {
    const activeGames = await db.select().from(coinFlipGames).where(eq(coinFlipGames.status, 'WAITING'));
    res.json({ success: true, games: activeGames });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Accept Challenge & Determine Result
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

    // 🛑 ራስን በራስ ከመጫወት መከልከል
    if (String(currentGame.creatorId) === tid) {
      return res.status(400).json({ success: false, message: 'የራስዎን Challenge መቀበል አይችሉም!' });
    }

    // Check Opponent Balance
    const opponent = await db.select().from(users).where(eq(users.telegramId, tid)).limit(1);
    if (!opponent.length || Number(opponent[0].balance) < betAmount) {
      return res.status(400).json({ success: false, message: 'በቂ ሂሳብ የለዎትም!' });
    }

    // Deduct Opponent Balance
    await db.update(users).set({ balance: sql`${users.balance} - ${betAmount}` }).where(eq(users.telegramId, tid));

    // Provably Fair Random Result (HEADS or TAILS)
    const outcomes = ['HEADS', 'TAILS'];
    const winningChoice = outcomes[Math.floor(Math.random() * 2)];

    // Identify Winner
    const winnerId = currentGame.creatorChoice === winningChoice ? currentGame.creatorId : tid;
    const totalPrize = betAmount * 2;

    // Credit Winner
    await db.update(users)
      .set({ balance: sql`${users.balance} + ${totalPrize}` })
      .where(eq(users.telegramId, winnerId));

    // Mark Game Completed
    await db.update(coinFlipGames).set({
      opponentId: tid,
      winningChoice: winningChoice,
      winnerId: winnerId,
      status: 'COMPLETED'
    }).where(eq(coinFlipGames.id, Number(gameId)));

    // Fetch updated balance for calling user
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

// 5. Add / Refill Balance API
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

// ==========================================
// 💳 6. CHAPA PAYMENT INTEGRATION
// ==========================================

// A. Initialize Chapa Payment
app.post('/api/pay', async (req, res) => {
  try {
    const { userId, amount, email, firstName } = req.body;
    const depositAmount = Number(amount);
    const tid = String(userId);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ success: false, message: 'ትክክለኛ የብር መጠን ያስገቡ!' });
    }

    // Unique reference number: tx-p2p-[timestamp]-[userId]-[amount]
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
          title: 'P2P Coinflip', // 👈 12 characters (Max 16)
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

// B. Chapa Webhook
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
