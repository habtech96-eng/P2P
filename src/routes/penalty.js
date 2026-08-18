const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { users, penaltyBets } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');

// Penalty Shoot Endpoint
router.post('/shoot', async (req, res) => {
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

module.exports = router;
