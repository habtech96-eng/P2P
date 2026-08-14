const { Telegraf } = require('telegraf');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;

// በ Pinggy ያገኘኸውን ሊንክ እዚህ ተካው
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://tymfq-196-189-127-87.run.pinggy-free.link';

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('👋 እንኳን ወደ P2P Coin Flip Mini Game በሰላም መጡ!', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🪙 Play Coin Flip Game',
            web_app: { url: WEB_APP_URL }
          }
        ]
      ]
    }
  });
});

bot.launch().then(() => {
  console.log('🤖 Telegram Bot is running...');
}).catch((err) => {
  console.error('Bot launch error:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
