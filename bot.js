cat << 'EOF' > bot.js
const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://p2p-coinflip-game.onrender.com';

if (!BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN is missing in environment variables!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// 1. Menu Button Setup
bot.telegram.setChatMenuButton({
  menuButton: {
    type: 'web_app',
    text: '🎮 Play Now',
    web_app: { url: WEB_APP_URL }
  }
}).catch(err => console.error('Error setting menu button:', err));

// 2. Main Game Keyboard
const getGameKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp('🪙 Play Coin Flip Game', WEB_APP_URL)
    ],
    [
      Markup.button.switchToChat('🚀 Share with Friends', 'እነሆ የ P2P Coin Flip ጨዋታ! ተወራረድና አሸንፍ 🪙'),
      Markup.button.callback('❓ How to Play', 'HOW_TO_PLAY')
    ]
  ]);
};

// 3. /start Command
bot.start((ctx) => {
  const firstName = ctx.from?.first_name || 'ወዳጄ';
  const welcomeText = 
`👋 **እንኳን ወደ P2P Coin Flip Game በሰላም መጡ፣ ${firstName}!**

🪙 **ምን ማድረግ ይቻላል?**
• ከሌሎች ተጫዋቾች ጋር በቀጥታ ይወራረዱ
• HEADS ወይም TAILS በመምረጥ ዕድልዎን ይሞክሩ
• 100% Provably Fair እና ፈጣን ክፍያ

ለመለመድና ለመጫወት ከታች ያለውን **Play Coin Flip Game** የሚለውን ቁልፍ ይጫኑ!`;

  return ctx.replyWithMarkdown(welcomeText, getGameKeyboard());
});

// 4. /play Command
bot.command('play', (ctx) => {
  return ctx.reply('🎮 ጨዋታውን ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ፦', getGameKeyboard());
});

// 5. /help Command
bot.help((ctx) => {
  const helpText = 
`📖 **የጨዋታው ህጎች፦**

1️⃣ **Challenge ይፍጠሩ፦** የሚወራረዱበትን መጠን (ምሳሌ 10 ETB) እና ጎን (HEADS/TAILS) መርጠው Challenge ይክፈቱ።
2️⃣ **ተቀዳዳሚ ያግኙ፦** ሌላ ተጫዋች የእርስዎን Challenge ሲቀበለው ሳንቲሙ በራሱ ይሽከረከራል።
3️⃣ **ያሸንፉ፦** አሸናፊው የሁለቱንም ተጫዋቾች ድምር ብር (2x) በቅጽበት ወደ ባላንሱ ገቢ ያደርጋል!`;

  return ctx.replyWithMarkdown(helpText, getGameKeyboard());
});

// 6. Callback Query for "How to Play" Button
bot.action('HOW_TO_PLAY', (ctx) => {
  ctx.answerCbQuery();
  const helpText = 
`📖 **የጨዋታው ህጎች፦**

1️⃣ **Challenge ይፍጠሩ፦** መጠንና ጎን መርጠው ይክፈቱ።
2️⃣ **ተቀዳዳሚ ያግኙ፦** ሌላ ተጫዋች ሲቀበለው ሳንቲሙ ይሽከረከራል።
3️⃣ **ያሸንፉ፦** አሸናፊው 2x ድምር ብር ያገኛል!`;

  return ctx.replyWithMarkdown(helpText);
});

// 7. Bot Launch
bot.launch().then(() => {
  console.log('🤖 Telegram Bot upgraded & running successfully!');
}).catch((err) => {
  console.error('Bot launch error:', err);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
EOF
