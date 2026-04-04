const Card = require('../../models/Card');
const User = require('../../models/User');

moon({
  name: "buycard",
  aliases: ["buy"],
  category: "cards",
  description: "Buy a card from the card market",
  usage: ".buycard [id]",
  cooldown: 5,
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const cardId = args[0]?.toUpperCase();

      // Show market if no ID provided
      if (!cardId) {
        const marketCards = await Card.find({ owner: null }).limit(10);
        if (marketCards.length === 0) {
          return reply("📭 The card market is currently empty.");
        }

        let msg = "🛒 *CARD MARKET* 🛒\n";
        msg += "━━━━━━━━━━━━━━━━━━━━\n\n";
        marketCards.forEach((c, i) => {
          msg += `${i + 1}. [${c.tier}] *${c.name}*\n   💰 Price: ${c.price.toLocaleString()} | ID: \`${c.cardId}\`\n\n`;
        });
        msg += "━━━━━━━━━━━━━━━━━━━━\n";
        msg += "Use \`.buycard <id>\` to purchase a card.";
        return reply(msg);
      }

      // Purchase logic
      const card = await Card.findOne({ cardId, owner: null });
      if (!card) {
        return reply("❌ Card not found or already owned by someone else.");
      }

      const user = await User.findOne({ whatsappNumber: sender });
      if (!user || user.balance < card.price) {
        return reply(`❌ You don't have enough coins! This card costs **${card.price.toLocaleString()} coins**.`);
      }

      // Update user
      user.balance -= card.price;
      user.cards.push({
        cardId: card.cardId,
        name: card.name,
        tier: card.tier,
        price: card.price,
        image: card.image,
        obtainedAt: new Date()
      });
      await user.save();

      // Update card
      card.owner = sender.split('@')[0];
      await card.save();

      return reply(`✅ Successfully bought *${card.name}* for **${card.price.toLocaleString()} coins**!`);

    } catch (err) {
      console.error("buycard error:", err);
      reply("❌ Failed to buy card.");
    }
  }
});
