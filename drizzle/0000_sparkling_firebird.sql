CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" text NOT NULL,
	"username" text,
	"first_name" text,
	"balance" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "coin_flip_games" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"opponent_id" text,
	"amount" integer NOT NULL,
	"creator_choice" varchar(10) NOT NULL,
	"winner_id" text,
	"winning_choice" varchar(10),
	"status" varchar(20) DEFAULT 'WAITING' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wheel_spins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"multiplier" double precision NOT NULL,
	"payout" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "penalty_bets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"direction" varchar(20) NOT NULL,
	"keeper_direction" varchar(20) NOT NULL,
	"is_goal" boolean NOT NULL,
	"payout" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mines_games" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bet_amount" integer NOT NULL,
	"mines_count" integer NOT NULL,
	"mine_locations" jsonb NOT NULL,
	"revealed_tiles" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'IN_PROGRESS' NOT NULL,
	"current_multiplier" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"profit" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
