const Card = require('../../models/Card');

moon({
  name: "search",
  aliases: ["srch", "cardinfo"],
  category: "cards",
  description: "Search and get info about a card",
  usage: ".search <id>",
  cooldown: 5,
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const cardId = args[0]?.toUpperCase();
      if (!cardId) {
        return reply("❌ Provide a Card ID to search.\nExample: .search ABC123");
      }

      const card = await Card.findOne({ cardId });
      if (!card) {
        return reply("❌ Card not found.");
      }

      const msg = `🃏 *CARD INFO* 🃏\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `🆔 ID: \`${card.cardId}\`\n` +
                  `🎈 Name: *${card.name}*\n` +
                  `🎐 Tier: *${card.tier}*\n` +
                  `💰 Price: *${card.price.toLocaleString()} coins*\n` +
                  `👤 Owner: ${card.owner ? '@' + card.owner.split('@')[0] : "None"}\n` +
                  `📜 Description: ${card.description || "No description available."}\n` +
                  `━━━━━━━━━━━━━━━━━━━━`;

      return sock.sendMessage(
        jid,
        { 
          image: { url: card.image }, 
          caption: msg,
          mentions: card.owner ? [card.owner.includes('@') ? card.owner : card.owner + '@s.whatsapp.net'] : []
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("search error:", err);
      reply("❌ Failed to search card.");
    }
  }
});
