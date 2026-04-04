const Card = require('../../models/Card');
const User = require('../../models/User');
const config = require('../../config');

moon({
  name: "cdgv",
  category: "cards",
  description: "Give a card that has not yet spawned to a user (Card Creators only)",
  usage: ".cdgv @user <id>",
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];
      const isCreator = config.CARDS_CREATERS?.map(String).includes(senderNumber);
      
      if (!isCreator) {
        return reply("⛔ You don't have permission to use this command.");
      }

      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const mentionedJid = contextInfo?.mentionedJid?.[0] || contextInfo?.participant;
      
      if (!mentionedJid) {
        return reply("❌ Tag or reply to a user to give a card! Example: .cdgv @user <id>");
      }

      const cardId = args.find(arg => !arg.includes('@'))?.toUpperCase();
      if (!cardId) {
        return reply("❌ Provide a Card ID to give.\nExample: .cdgv @user ABC123");
      }

      const targetNumber = mentionedJid.split('@')[0];
      const card = await Card.findOne({ cardId });

      if (!card) {
        return reply("❌ Card not found in the database.");
      }

      // Check if card is already owned
      if (card.owner) {
        return reply(`❌ This card is already owned by @${card.owner.split('@')[0]}.`, { mentions: [card.owner + '@s.whatsapp.net'] });
      }

      // Give card to user
      let targetUser = await User.findOne({ whatsappNumber: mentionedJid });
      if (!targetUser) {
        targetUser = await User.create({
          whatsappNumber: mentionedJid,
          username: targetNumber,
          cards: []
        });
      }

      targetUser.cards.push({
        cardId: card.cardId,
        name: card.name,
        tier: card.tier,
        price: card.price,
        image: card.image,
        obtainedAt: new Date()
      });
      await targetUser.save();

      card.owner = targetNumber;
      await card.save();

      return reply(`✅ Successfully gave *${card.name}* to @${targetNumber}!`, { mentions: [mentionedJid] });

    } catch (err) {
      console.error("cdgv error:", err);
      reply("❌ Failed to give card.");
    }
  }
});
