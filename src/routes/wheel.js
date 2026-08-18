const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { users, wheelSpins } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');

router.post('/spin', async (req, res) => {
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
    res.status(500).json({ success: false, message: 'Server Error during Wheel Spin' });
  }
});

module.exports = router; // 👈 አስፈላጊ ነው!
