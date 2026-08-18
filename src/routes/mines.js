const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { users, minesGames } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');

function generateMines(count) {
  const positions = Array.from({ length: 25 }, (_, i) => i);
  const mines = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    mines.push(positions.splice(randomIndex, 1)[0]);
  }
  return mines;
}

router.post('/start', async (req, res) => {
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

router.post('/reveal', async (req, res) => {
  try {
    const { gameId, tileIndex } = req.body;
    const idx = Number(tileIndex);

    const game = await db.select().from(minesGames).where(eq(minesGames.id, Number(gameId))).limit(1);
    if (!game.length || game[0].status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'ጨዋታው ተጠናቋል!' });
    }

    const currentGame = game[0];
    const mines = currentGame.mineLocations;

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

    const revealed = [...(currentGame.revealedTiles || []), idx];
    const safeTiles = 25 - currentGame.minesCount;
    const revealedCount = revealed.length;
    let nextMult = 1.0;
    
    for (let i = 0; i < revealedCount; i++) {
      nextMult *= (25 - i) / (safeTiles - i);
    }
    nextMult = parseFloat((nextMult * 0.95).toFixed(2));

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

router.post('/cashout', async (req, res) => {
  try {
    const { gameId } = req.body;

    const game = await db.select().from(minesGames).where(eq(minesGames.id, Number(gameId))).limit(1);
    if (!game.length || game[0].status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'ወደ ሂሳብ ማስገባት አይቻልም!' });
    }

    const currentGame = game[0];
    const mult = parseFloat(currentGame.currentMultiplier);
    const winAmount = Math.floor(currentGame.betAmount * mult);

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

module.exports = router; // 👈 አስፈላጊ ነው!
