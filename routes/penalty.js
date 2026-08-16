mkdir routes
cat << 'EOF' > routes/penalty.js
const express = require('express');
const router = express.Router();

// ⚽ PENALTY SHOOTOUT LOGIC
router.post('/shoot', async (req, res) => {
    const { userId, amount, target } = req.body;

    try {
        // 1. እዚህ ቦታ ላይ ከ Database ተጠቃሚውን እና ബാലንሱን ያረጋግጡ
        // ምሳሌ፡ const user = await db.users.findOne({ id: userId });
        
        // ለሙከራ እንዲረዳ (ይህንን ከ Database ጋር ያገናኙት)
        const userBalance = 1000; // Fake balance

        if (userBalance < amount) {
            return res.json({ success: false, message: 'በቂ ብር የለዎትም!' });
        }

        // 2. የግብ ጠባቂው እንቅስቃሴ (Randomly select dive direction)
        const keeperOptions = ['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center'];
        const keeperDive = keeperOptions[Math.floor(Math.random() * keeperOptions.length)];

        // 3. የጨዋታ ውጤት (target != keeperDive ከሆነ ጎል ነው)
        const isGoal = target !== keeperDive;
        const multiplier = 1.9;
        const payout = isGoal ? (amount * multiplier) : 0;
        
        // 4. ባላንሱን ማዘመን (Update Balance in DB)
        const newBalance = isGoal ? (userBalance - amount + payout) : (userBalance - amount);

        res.json({
            success: true,
            isGoal: isGoal,
            payout: payout.toFixed(2),
            keeperDive: keeperDive,
            newBalance: newBalance
        });

    } catch (err) {
        console.error('Penalty error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
EOF
