const Card = require('../../models/Card');
const User = require('../../models/User');

moon({
  name: "give",
  category: "cards",
  description: "Give a card to another user",
  usage: ".give @user <id>",
  cooldown: 5,
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const mentionedJid = contextInfo?.mentionedJid?.[0] || contextInfo?.participant;
      
      if (!mentionedJid || mentionedJid === sender) {
        return reply("❌ Tag or reply to a user to give a card! Example: .give @user <id>");
      }

      const cardId = args.find(arg => !arg.includes('@'))?.toUpperCase();
      if (!cardId) {
        return reply("❌ Provide a Card ID to give.\nExample: .give @user ABC123");
      }

      const senderNumber = sender.split('@')[0];
      const targetNumber = mentionedJid.split('@')[0];

      const user = await User.findOne({ whatsappNumber: sender });
      const targetUser = await User.findOne({ whatsappNumber: mentionedJid });

      if (!user || !user.cards || user.cards.length === 0) {
        return reply("📭 Your collection is empty.");
      }

      const cardIndex = user.cards.findIndex(c => c.cardId === cardId);
      if (cardIndex === -1) {
        return reply(`❌ You don't own card ID: \`${cardId}\``);
      }

      const cardToGive = user.cards[cardIndex];

      // Transfer logic
      if (targetUser) {
        targetUser.cards.push(cardToGive);
        await targetUser.save();
      } else {
        // Create target user if they don't exist
        await User.create({
          whatsappNumber: mentionedJid,
          username: targetNumber,
          cards: [cardToGive]
        });
      }

      user.cards.splice(cardIndex, 1);
      await user.save();

      // Update card owner in Card collection
      const cardData = await Card.findOne({ cardId });
      if (cardData) {
        cardData.owner = targetNumber;
        cardData.isEquipped = false;
        await cardData.save();
      }

      return reply(`✅ Successfully gave *${cardToGive.name}* to @${targetNumber}!`, { mentions: [mentionedJid] });

    } catch (err) {
      console.error("give error:", err);
      reply("❌ Failed to give card.");
    }
  }
});
