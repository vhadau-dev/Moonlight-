const Card = require('../../models/Card');
const config = require('../../config');
const axios = require('axios');

function generateId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

moon({
  name: "crcd",
  category: "cards",
  async execute(sock, jid, sender, args, m, { reply, isCDC }) {
    try {
      // 🛡️ CDC CHECK
      if (!(await isCDC())) {
        return reply("⛔ You don't have permission for that. Only Card Creators can use this.");
      }

      const sub = args[0]?.toLowerCase();

      // ================= LIST MODE =================
      if (sub === "list") {
        const cards = await Card.find({ source: "crcd" }).sort({ _id: -1 });

        if (!cards.length) {
          return reply("📭 No CRCD cards found.");
        }

        let msg = `🃏 *CRCD CREATED CARDS* 🃏\n\n`;

        cards.slice(0, 20).forEach((c, i) => {
          msg += `${i + 1}. ${c.name} [${c.tier}] (ID: ${c.cardId})\n`;
        });

        if (cards.length > 20) {
          msg += `\n...and ${cards.length - 20} more`;
        }

        return reply(msg);
      }

      // ================= CREATE MODE =================
      const amount = parseInt(args[0]) || 1;

      if (isNaN(amount) || amount <= 0) {
        return reply("❌ Usage:\n.crcd <amount>\n.crcd list");
      }

      const tiers = ["C", "B", "A", "S"];
      let created = [];

      for (let i = 0; i < amount * 5; i++) {
        const randomId = Math.floor(Math.random() * 5000) + 1;

        const res = await axios
          .get(`https://api.jikan.moe/v4/characters/${randomId}/full`)
          .catch(() => null);

        if (!res?.data?.data) continue;

        const char = res.data.data;
        const cardId = generateId();

        const exists = await Card.findOne({ cardId });
        if (exists) continue;

        const tier = tiers[Math.floor(Math.random() * tiers.length)];

        const card = await Card.create({
          cardId,
          name: char.name,
          tier,
          atk: Math.floor(Math.random() * 1000) + 500,
          def: Math.floor(Math.random() * 1000) + 500,
          level: 1,
          image: char.images?.jpg?.image_url,
          description: char.about || "No description available.",
          owner: null,
          isEquipped: false,
          source: "crcd"
        });

        created.push(card);
      }

      if (!created.length) {
        return reply("❌ No cards were created.");
      }

      let msg =
        `✅ *CRCD COMPLETE*\n\n` +
        `Created: ${created.length} cards\n\n`;

      created.slice(0, 10).forEach((c, i) => {
        msg += `${i + 1}. ${c.name} [${c.tier}] (ID: ${c.cardId})\n`;
      });

      if (created.length > 10) {
        msg += `\n...and more`;
      }

      return reply(msg);

    } catch (err) {
      console.error("crcd error:", err);
      reply("❌ An error occurred.");
    }
  }
});
