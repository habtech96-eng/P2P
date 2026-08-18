const express = require('express');
const router = express.Router();
const axios = require('axios');
const { db } = require('../db/db');
const { users } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');

router.post('/add-balance', async (req, res) => {
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

router.post('/pay', async (req, res) => {
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
        callback_url: 'https://p2p-coinflip-game.onrender.com/api/payment/chapa-webhook',
        return_url: 'https://p2p-coinflip-game.onrender.com',
        customization: { title: 'P2P Coinflip', description: 'Deposit' },
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
    res.status(500).json({ success: false, message: 'Server Error during Chapa Payment' });
  }
});

router.post('/chapa-webhook', async (req, res) => {
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
      }
    }
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

module.exports = router; // 👈 አስፈላጊ ነው!
