const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { users, coinFlipGames } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');

// 1. Create CoinFlip Game
router.post('/create', async (req, res) => {
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

// 2. Fetch Active Lobby Games
router.get('/lobby', async (req, res) => {
  try {
    const activeGames = await db.select().from(coinFlipGames).where(eq(coinFlipGames.status, 'WAITING'));
    res.json({ success: true, games: activeGames });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Accept CoinFlip Challenge
router.post('/accept', async (req, res) => {
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

module.exports = router;