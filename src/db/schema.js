const { pgTable, serial, text, integer, varchar, timestamp, doublePrecision, boolean, jsonb, numeric } = require('drizzle-orm/pg-core');

// 1. Users Table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  username: text('username'),
  firstName: text('first_name'),
  balance: integer('balance').default(1000).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// 2. Coin Flip Games Table
const coinFlipGames = pgTable('coin_flip_games', {
  id: serial('id').primaryKey(),
  creatorId: text('creator_id').notNull(),
  opponentId: text('opponent_id'),
  amount: integer('amount').notNull(),
  creatorChoice: varchar('creator_choice', { length: 10 }).notNull(), // 'HEADS' or 'TAILS'
  winnerId: text('winner_id'),
  winningChoice: varchar('winning_choice', { length: 10 }),
  status: varchar('status', { length: 20 }).default('WAITING').notNull(), // 'WAITING', 'COMPLETED', 'CANCELLED'
  createdAt: timestamp('created_at').defaultNow()
});

// 3. Wheel Spins Table
const wheelSpins = pgTable('wheel_spins', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  amount: integer('amount').notNull(),
  multiplier: doublePrecision('multiplier').notNull(),
  payout: integer('payout').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// 4. Penalty Bets Table
const penaltyBets = pgTable('penalty_bets', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  amount: integer('amount').notNull(),
  direction: varchar('direction', { length: 20 }).notNull(), // 'top_left', 'center', etc.
  keeperDirection: varchar('keeper_direction', { length: 20 }).notNull(),
  isGoal: boolean('is_goal').notNull(),
  payout: integer('payout').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// 5. Mines Games Table (NEW 💣)
const minesGames = pgTable('mines_games', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  betAmount: integer('bet_amount').notNull(),
  minesCount: integer('mines_count').notNull(),
  mineLocations: jsonb('mine_locations').notNull(), // Array of mine positions [e.g. 2, 5, 12]
  revealedTiles: jsonb('revealed_tiles').default([]), // Array of revealed tile indexes
  status: varchar('status', { length: 20 }).default('IN_PROGRESS').notNull(), // 'IN_PROGRESS', 'CASHOUT', 'BUSTED'
  currentMultiplier: numeric('current_multiplier', { precision: 10, scale: 2 }).default('1.00').notNull(),
  profit: integer('profit').default(0),
  createdAt: timestamp('created_at').defaultNow()
});

module.exports = { 
  users, 
  coinFlipGames, 
  wheelSpins, 
  penaltyBets, 
  minesGames 
};