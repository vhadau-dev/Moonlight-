const Card = require('../../models/Card');
const User = require('../../models/User');
const config = require('../../config');
const { generateCardImage } = require('../../utils/cardGenerator');

moon({
  name: "cardinfo",
  category: "cards",
  aliases: ["ci", "detail"],
  cooldown: 5,
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const cardId = args[0]?.toUpperCase();
      if (!cardId) {
        return reply(`❌ *Usage:* .cardinfo [CARD_ID]`);
      }

      const card = await Card.findOne({ cardId });
      if (!card) {
        return reply("❌ Card not found.");
      }

      // Generate the stylized card image
      const cardBuffer = await generateCardImage(card);

      const msg =
        `🃏 *${config.BOT_NAME} CARD DETAILS* 🃏\n\n` +
        `🆔 ID: ${card.cardId}\n` +
        `🎈 Name: ${card.name}\n` +
        `🎐 Tier: ${card.tier}\n` +
        `⚔️ ATK: ${card.atk?.toLocaleString() ?? 0}\n` +
        `🛡️ DEF: ${card.def?.toLocaleString() ?? 0}\n` +
        `🔯 Level: ${card.level ?? 1}\n` +
        `👤 Owner: ${card.owner ? '@' + card.owner.split('@')[0] : "None"}`;

      return sock.sendMessage(
        jid,
        { 
          image: cardBuffer, 
          caption: msg,
          mentions: card.owner ? [card.owner.includes('@') ? card.owner : card.owner + '@s.whatsapp.net'] : []
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("cardinfo error:", err);
      reply("❌ An error occurred while fetching card info.");
    }
  }
});