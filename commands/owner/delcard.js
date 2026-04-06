const Card = require('../../models/Card');
const config = require('../../config');

moon({
  name: "delcard",
  category: "owner",
  description: "Delete cards (owner only)",

  async execute(sock, jid, sender, args, m, { reply, isCDC }) {
    try {
      // 🛡️ CDC CHECK (The user previously used CARDS_CREATERS for this)
      if (!(await isCDC())) {
        return reply("⛔ You don't have permission for that. Only Card Creators can use this.");
      }

      // ================= USAGE =================
      if (!args[0]) {
        return reply(
`❌ Usage:
.delcard <cardId>
.delcard all <keyword>
.delcard tier <tier>

Examples:
.delcard ABC123
.delcard all test
.delcard tier C`
        );
      }

      const mode = args[0].toLowerCase();

      // ================= DELETE BY ID =================
      if (mode !== "all" && mode !== "tier") {

        const cardId = args[0];

        const card = await Card.findOne({ cardId });

        if (!card) {
          return reply("❌ Card not found.");
        }

        await Card.deleteOne({ cardId });

        return reply(`🗑 Card deleted:\n🆔 ${cardId}\n🎈 ${card.name}`);
      }

      // ================= DELETE ALL BY KEYWORD =================
      if (mode === "all") {

        const keyword = args.slice(1).join(' ');

        if (!keyword) {
          return reply("❌ Provide a keyword.\nExample: .delcard all test");
        }

        const result = await Card.deleteMany({
          name: { $regex: keyword, $options: "i" }
        });

        return reply(`🗑 Deleted ${result.deletedCount} card(s) matching "${keyword}"`);
      }

      // ================= DELETE BY TIER =================
      if (mode === "tier") {

        const tier = args[1]?.toUpperCase();

        if (!tier) {
          return reply("❌ Usage: .delcard tier <S|A|B|C>");
        }

        const result = await Card.deleteMany({ tier });

        return reply(`🗑 Deleted ${result.deletedCount} card(s) from tier ${tier}`);
      }

    } catch (err) {
      console.error("delcard error:", err);
      return reply("❌ Failed to delete card(s).");
    }
  }
});
