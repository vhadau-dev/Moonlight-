const Card = require('../../models/Card');
const User = require('../../models/User');

moon({
  name: "add-deck",
  category: "cards",
  description: "Manage your cards and deck.",
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];

      let user = await User.findOne({ userId: senderNumber });
      if (!user) user = await User.create({ userId: senderNumber, cards: [], balance: 0 });

      const sub = args[0]?.toLowerCase();

      // HELP
      if (sub === "help") {
        return reply(
          "📖 *ADD-DECK HELP*\n\n" +
          ".add-deck collection\n" +
          ".add-deck claim <cardId>\n" +
          ".add-deck detail <cardId>\n"
        );
      }

      // COLLECTION
      if (sub === "collection" || sub === "col" || sub === "inv" || sub === "inventory") {
        const userCards = await Card.find({ owner: senderNumber });

        if (userCards.length === 0) {
          return reply("📭 Your collection is empty! Claim some cards first.");
        }

        let msg = "🎴 *YOUR CARD COLLECTION* 🎴\n\n";
        userCards.forEach((c, i) => {
          msg += `${i + 1}. [${c.tier}] ${c.name} (ID: ${c.cardId})\n`;
        });

        return reply(msg);
      }

      // CLAIM
      if (sub === "claim") {
        const cardId = args[1]?.toUpperCase();
        if (!cardId) return reply("❌ Please provide a Card ID.\nExample: .add-deck claim ABC123");

        const card = await Card.findOne({ cardId, owner: null });
        if (!card) return reply("❌ Card not found or already claimed!");

        card.owner = senderNumber;
        await card.save();

        return reply(`✅ Successfully claimed: *${card.name}* [${card.tier}]!`);
      }

      // DETAIL
      if (sub === "detail") {
        const cardId = args[1]?.toUpperCase();
        if (!cardId) return reply("❌ Provide a Card ID.\nExample: .add-deck detail ABC123");

        const card = await Card.findOne({ cardId });
        if (!card) return reply("❌ Card not found.");

        let msg =
          `🃏 *CARD DETAILS* 🃏\n\n` +
          `🆔 ID: ${card.cardId}\n` +
          `🎈 Name: ${card.name}\n` +
          `🎐 Tier: ${card.tier}\n` +
          `⚔️ ATK: ${card.atk}\n` +
          `🛡️ DEF: ${card.def}\n` +
          `🔯 Level: ${card.level}\n` +
          `👤 Owner: ${card.owner ? '@' + card.owner.split('@')[0] : "None"}`;

        return sock.sendMessage(
          jid,
          { 
            image: { url: card.image }, 
            caption: msg,
            mentions: card.owner ? [card.owner.includes('@') ? card.owner : card.owner + '@s.whatsapp.net'] : []
          },
          { quoted: m }
        );
      }

      // DEFAULT
      return reply("🛠️ Use:\n.add-deck help");

    } catch (err) {
      console.error("add-deck error:", err);
      reply("❌ An error occurred with the add-deck command.");
    }
  }
});