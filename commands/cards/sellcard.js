const Card = require('../../models/Card');
const User = require('../../models/User');

moon({
  name: "sellcard",
  aliases: ["sell"],
  category: "cards",
  description: "Sell a card in exchange for coins",
  usage: ".sellcard <id>",
  cooldown: 5,
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const cardId = args[0]?.toUpperCase();
      if (!cardId) {
        return reply("❌ Provide a Card ID to sell.\nExample: .sellcard ABC123");
      }

      const senderNumber = sender.split('@')[0];
      const user = await User.findOne({ whatsappNumber: sender });
      
      if (!user || !user.cards || user.cards.length === 0) {
        return reply("📭 Your collection is empty.");
      }

      const cardIndex = user.cards.findIndex(c => c.cardId === cardId);
      if (cardIndex === -1) {
        return reply(`❌ You don't own card ID: \`${cardId}\``);
      }

      const cardInInv = user.cards[cardIndex];
      const cardData = await Card.findOne({ cardId });
      
      // Sell for 50% of base price or a default value
      const sellPrice = cardData ? Math.floor(cardData.price * 0.5) : 500;

      // Update user
      user.balance = (user.balance || 0) + sellPrice;
      user.cards.splice(cardIndex, 1);
      await user.save();

      // Update card owner in Card collection
      if (cardData) {
        cardData.owner = null;
        cardData.isEquipped = false;
        await cardData.save();
      }

      return reply(`💰 Sold *${cardInInv.name}* for **${sellPrice.toLocaleString()} coins**!`);

    } catch (err) {
      console.error("sellcard error:", err);
      reply("❌ Failed to sell card.");
    }
  }
});
