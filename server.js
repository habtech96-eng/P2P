const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Import Routes
const userRoutes = require('./src/routes/user');
const coinflipRoutes = require('./src/routes/coinflip');
const minesRoutes = require('./src/routes/mines');
const paymentRoutes = require('./src/routes/payment');
const penaltyRoutes = require('./src/routes/penalty');
const wheelRoutes = require('./src/routes/wheel');

// 1. Mount API Routes
app.use('/api/user', userRoutes);
app.use('/api/coinflip', coinflipRoutes);
app.use('/api/mines', minesRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/penalty', penaltyRoutes);
app.use('/api/wheel', wheelRoutes);

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
