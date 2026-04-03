const Card = require('../../models/Card');
const User = require('../../models/User');

moon({
  name: "col",
  aliases: ["search", "inv", "inventory"],
  category: "cards",
  description: "View and manage your card collection.",
  cooldown: 5,
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];

      let user = await User.findOne({ userId: senderNumber });
      if (!user) {
        user = await User.create({
          userId: senderNumber,
          cards: [],
          balance: 0
        });
      }

      const sub = args[0]?.toLowerCase();

      // HELP
      if (sub === "help") {
        return reply(
          "📖 *COL HELP*\n\n" +
          ".col collection\n" +
          ".col detail <cardId>\n" +
          ".col claim <cardId>"
        );
      }

      // COLLECTION VIEW
      if (!sub || ["collection", "col", "inv", "inventory"].includes(sub)) {
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
        if (!cardId) {
          return reply("❌ Provide a Card ID.\nExample: .col claim ABC123");
        }

        const card = await Card.findOne({ cardId, owner: null });
        if (!card) {
          return reply("❌ Card not found or already claimed!");
        }

        card.owner = senderNumber;
        await card.save();

        return reply(`✅ Successfully claimed: *${card.name}* [${card.tier}]!`);
      }

      // DETAIL
      if (sub === "detail") {
        const cardId = args[1]?.toUpperCase();
        if (!cardId) {
          return reply("❌ Provide a Card ID.\nExample: .col detail ABC123");
        }

        const card = await Card.findOne({ cardId });
        if (!card) {
          return reply("❌ Card not found.");
        }

        const msg =
          `🃏 *CARD DETAILS* 🃏\n\n` +
          `🆔 ID: ${card.cardId}\n` +
          `🎈 Name: ${card.name}\n` +
          `🎐 Tier: ${card.tier}\n` +
          `⚔️ ATK: ${card.atk ?? 0}\n` +
          `🛡️ DEF: ${card.def ?? 0}\n` +
          `🔯 Level: ${card.level ?? 1}\n` +
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

      return reply("🛠️ Use .col help to see commands.");

    } catch (err) {
      console.error("col error:", err);
      reply("❌ An error occurred with the col command.");
    }
  }
});