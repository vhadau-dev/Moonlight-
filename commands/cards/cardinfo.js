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

      // Fetch owner name if exists
      let ownerName = "None";
      let ownerJid = null;
      
      if (card.owner) {
        const ownerUser = await User.findOne({ whatsappNumber: card.owner.includes('@') ? card.owner : card.owner + '@s.whatsapp.net' });
        ownerName = ownerUser?.username || card.owner.split('@')[0];
        ownerJid = card.owner.includes('@') ? card.owner : card.owner + '@s.whatsapp.net';
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
        `👤 Owner: ${ownerJid ? '@' + ownerJid.split('@')[0] + ' (' + ownerName + ')' : "None"}`;

      return sock.sendMessage(
        jid,
        { 
          image: cardBuffer, 
          caption: msg,
          mentions: ownerJid ? [ownerJid] : []
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("cardinfo error:", err);
      reply("❌ An error occurred while fetching card info.");
    }
  }
});
