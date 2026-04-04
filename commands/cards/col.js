const Card = require('../../models/Card');
const User = require('../../models/User');

moon({
  name: "col",
  aliases: ["collection"],
  category: "cards",
  description: "Show a user's full collection of cards",
  usage: ".col [@user] [page]",
  cooldown: 5,
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const mentionedJid = contextInfo?.mentionedJid?.[0] || contextInfo?.participant || sender;
      const targetNumber = mentionedJid.split('@')[0];
      
      const page = parseInt(args.find(arg => !arg.includes('@'))) || 1;
      const limit = 15;
      const skip = (page - 1) * limit;

      const user = await User.findOne({ whatsappNumber: mentionedJid });
      if (!user || !user.cards || user.cards.length === 0) {
        return reply(`📭 @${targetNumber}'s collection is empty.`, { mentions: [mentionedJid] });
      }

      const totalCards = user.cards.length;
      const totalPages = Math.ceil(totalCards / limit);

      if (page > totalPages) {
        return reply(`❌ Invalid page. There are only ${totalPages} pages.`);
      }

      const cardsToShow = user.cards.slice(skip, skip + limit);

      let msg = `🎴 *COLLECTION: @${targetNumber}* 🎴\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `Page: ${page}/${totalPages} | Total: ${totalCards}\n\n`;

      cardsToShow.forEach((c, i) => {
        msg += `${skip + i + 1}. [${c.tier}] *${c.name}* (ID: \`${c.cardId}\`)\n`;
      });

      msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `Use \`.col @user [page]\` to see more.`;

      return reply(msg, { mentions: [mentionedJid] });

    } catch (err) {
      console.error("col error:", err);
      reply("❌ Failed to fetch collection.");
    }
  }
});
