const { pgTable, serial, text, integer, varchar, timestamp, doublePrecision } = require('drizzle-orm/pg-core');

// Users Table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  username: text('username'),
  firstName: text('first_name'),
  balance: integer('balance').default(1000).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Coin Flip Games Table
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

// Wheel Spins Table (NEW)
const wheelSpins = pgTable('wheel_spins', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  amount: integer('amount').notNull(),
  multiplier: doublePrecision('multiplier').notNull(), // e.g., 1.5, 2.0, 0
  payout: integer('payout').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

module.exports = { users, coinFlipGames, wheelSpins };
