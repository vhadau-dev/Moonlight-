const Card = require('../../models/Card');
const config = require('../../config');

moon({
  name: "delcd",
  category: "cards",
  description: "Delete a card from the database (Card Creators only)",
  usage: ".delcd <id>",
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];
      const isCreator = config.CARDS_CREATERS?.map(String).includes(senderNumber);
      
      if (!isCreator) {
        return reply("⛔ You don't have permission to delete cards.");
      }

      const cardId = args[0]?.toUpperCase();
      if (!cardId) {
        return reply("❌ Provide a Card ID to delete.\nExample: .delcd ABC123");
      }

      const card = await Card.findOne({ cardId });
      if (!card) {
        return reply("❌ Card not found.");
      }

      await Card.deleteOne({ cardId });

      return reply(`🗑️ *Card Deleted Successfully!*\n\n🆔 ID: \`${cardId}\`\n🎈 Name: ${card.name}`);

    } catch (err) {
      console.error("delcd error:", err);
      reply("❌ Failed to delete card.");
    }
  }
});
