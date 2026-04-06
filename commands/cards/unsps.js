const Card = require('../../models/Card');
const config = require('../../config');

moon({
  name: "unsps",
  category: "cards",
  description: "List all cards that are not spawned and have no owner.",
  async execute(sock, jid, sender, args, m, { reply, isCDC }) {
    try {
      // 🛡️ CDC CHECK
      if (!(await isCDC())) {
        return reply("⛔ You don't have permission for that. Only Card Creators can use this.");
      }

      // Find cards that:
      // - are NOT spawned
      // - have no owner
      const cards = await Card.find({
        owner: null,
        source: { $ne: "spawn" }
      }).sort({ _id: -1 });

      if (!cards.length) {
        return reply("📭 No unspawned & unowned cards found.");
      }

      let msg = `🃏 *UNSPAWNED & UNOWNED CARDS* 🃏\n\n`;

      cards.slice(0, 20).forEach((c, i) => {
        msg += `${i + 1}. ${c.name} [${c.tier}] (ID: ${c.cardId}) | Source: ${c.source || "unknown"}\n`;
      });

      if (cards.length > 20) {
        msg += `\n...and ${cards.length - 20} more`;
      }

      return reply(msg);

    } catch (err) {
      console.error("unsps error:", err);
      reply("❌ An error occurred while fetching cards.");
    }
  }
});
