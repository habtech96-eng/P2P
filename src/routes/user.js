const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

router.post('/sync', async (req, res) => {
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

module.exports = router; // 👈 አስፈላጊ ነው!
