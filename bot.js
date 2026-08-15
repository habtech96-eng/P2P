cat << 'EOF' > bot.js
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://p2p-coinflip-game.onrender.com';
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN is missing in environment variables!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// Express health check endpoint (Render ሰርቨሩ እንዳይዘጋ)
app.use(express.json());
app.get('/', (req, res) => {
  res.send('🤖 Telegram Bot & WebApp Service is Live!');
});

// 1. Menu Button Setup
bot.telegram.setChatMenuButton({
  menuButton: {
    type: 'web_app',
    text: '🎮 Play Games',
    web_app: { url: WEB_APP_URL }
  }
}).catch(err => console.error('Error setting menu button:', err));

// 2. Main Game Keyboard
const getGameKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp('🎮 Play Games (Coin Flip / Wheel / Penalty)', WEB_APP_URL)
    ],
    [
      Markup.button.switchToChat('🚀 Share with Friends', 'እነሆ የ P2P Game Hub! ተወራረድና አሸንፍ 🪙⚽🎡'),
      Markup.button.callback('❓ How to Play', 'HOW_TO_PLAY')
    ]
  ]);
};

// 3. /start Command
bot.start((ctx) => {
  const firstName = ctx.from?.first_name || 'ወዳጄ';
  const welcomeText = 
`👋 **እንኳን ወደ P2P Game Hub በሰላም መጡ፣ ${firstName}!**

🎮 **ምን ማጫወት ይቻላል?**
• **Coin Flip:** ከሌሎች ተጫዋቾች ጋር በቀጥታ ይወራረዱ
• **Wheel of Fortune:** ጎማውን በማሽከርከር እስከ 5x አሸንፉ
• **Penalty Shootout:** ፍጹም ቅጣት ምት በመምታት ግብ አገባቡ!

ለመለመድና ለመጫወት ከታች ያለውን **Play Games** የሚለውን ቁልፍ ይጫኑ!`;

  return ctx.replyWithMarkdown(welcomeText, getGameKeyboard());
});

// 4. /play Command
bot.command('play', (ctx) => {
  return ctx.reply('🎮 ጨዋታውን ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ፦', getGameKeyboard());
});

// 5. /help Command
bot.help((ctx) => {
  const helpText = 
`📖 **የጨዋታዎች ህግ፦**

🪙 **Coin Flip:** Challenge ይፍጠሩ ወይም የተቀባይ Challenge ይቀበሉ። አሸናፊው 2x ያገኛል!
🎡 **Wheel of Fortune:** የቤቱን ጎማ በማሽከርከር የብሩን ብዛት በማብዛት (Up to 5x) ያሸንፉ!
⚽ **Penalty Shootout:** ኳሷን የት እንደምትመቱ ይምረጡ፤ ግብ ጠባቂው ካላደነው ያሸንፋሉ!`;

  return ctx.replyWithMarkdown(helpText, getGameKeyboard());
});

// 6. Callback Query for "How to Play" Button
bot.action('HOW_TO_PLAY', (ctx) => {
  ctx.answerCbQuery();
  const helpText = 
`📖 **የጨዋታው ህጎች፦**

1️⃣ **Coin Flip:** Challenge ይፍጠሩ/ተቀበሉ።
2️⃣ **Wheel of Fortune:** መጠን መርጠው ያሽከርክሩ።
3️⃣ **Penalty:** ግብ አገባበው ብርዎን ያበዛሉ!`;

  return ctx.replyWithMarkdown(helpText);
});

// Start Express Server & Bot
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  bot.launch().then(() => {
    console.log('🤖 Telegram Bot upgraded & running successfully!');
  }).catch((err) => {
    console.error('Bot launch error:', err);
  });
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
EOF
