const User = require('../../models/User');
const Card = require('../../models/Card');

moon({
  name: "trade",
  category: "cards",
  description: "Exchange cards with another user",
  usage: ".trade @user <your_card_id> <their_card_id>",
  cooldown: 10,

  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const mentionedJid = contextInfo?.mentionedJid?.[0] || contextInfo?.participant;
      
      if (!mentionedJid || mentionedJid === sender) {
        return reply("❌ Tag another user to trade with! Example: .trade @user <your_id> <their_id>");
      }

      const yourCardId = args[1]?.toUpperCase();
      const theirCardId = args[2]?.toUpperCase();

      if (!yourCardId || !theirCardId) {
        return reply("❌ Usage: .trade @user <your_card_id> <their_card_id>");
      }

      const senderNumber = sender.split('@')[0];
      const targetNumber = mentionedJid.split('@')[0];

      // Find cards
      const yourCard = await Card.findOne({ cardId: yourCardId, owner: senderNumber });
      const theirCard = await Card.findOne({ cardId: theirCardId, owner: targetNumber });

      if (!yourCard) return reply(`❌ You don't own card ID: \`${yourCardId}\``);
      if (!theirCard) return reply(`❌ @${targetNumber} doesn't own card ID: \`${theirCardId}\``, { mentions: [mentionedJid] });

      const tradeInfo = `🤝 *Trade Request* 🤝\n\n` +
                        `👤 *From:* @${senderNumber}\n` +
                        `📦 *Offering:* ${yourCard.name} (${yourCard.tier})\n\n` +
                        `👤 *To:* @${targetNumber}\n` +
                        `📦 *Requesting:* ${theirCard.name} (${theirCard.tier})\n\n` +
                        `*@${targetNumber}, type ".confirmtrade" to accept this trade!*`;

      await reply(tradeInfo, { mentions: [sender, mentionedJid] });

      // Store pending trade in global
      if (!global.pendingTrades) global.pendingTrades = new Map();
      global.pendingTrades.set(targetNumber, {
        from: senderNumber,
        yourCardId,
        theirCardId,
        expires: Date.now() + 60000 // 1 minute
      });

    } catch (err) {
      console.error("trade command error:", err);
      reply("❌ Trade failed.");
    }
  }
});

// Add confirmtrade command
moon({
  name: "confirmtrade",
  category: "cards",
  async execute(sock, jid, sender, args, m, { reply }) {
    const senderNumber = sender.split('@')[0];
    const trade = global.pendingTrades?.get(senderNumber);

    if (!trade || trade.expires < Date.now()) {
      return reply("❌ You have no pending trades or the trade has expired.");
    }

    try {
      const yourCard = await Card.findOne({ cardId: trade.theirCardId, owner: senderNumber });
      const theirCard = await Card.findOne({ cardId: trade.yourCardId, owner: trade.from });

      if (!yourCard || !theirCard) {
        global.pendingTrades.delete(senderNumber);
        return reply("❌ One of the cards is no longer owned by the traders.");
      }

      // Swap owners
      yourCard.owner = trade.from;
      yourCard.isEquipped = false;
      theirCard.owner = senderNumber;
      theirCard.isEquipped = false;

      await yourCard.save();
      await theirCard.save();

      // Update User inventories
      const user1 = await User.findOne({ whatsappNumber: trade.from });
      const user2 = await User.findOne({ whatsappNumber: senderNumber });

      if (user1) {
        user1.cards = user1.cards.filter(c => c.cardId !== trade.yourCardId);
        user1.cards.push({ cardId: trade.theirCardId, name: yourCard.name, tier: yourCard.tier, price: yourCard.price, image: yourCard.image });
        await user1.save();
      }

      if (user2) {
        user2.cards = user2.cards.filter(c => c.cardId !== trade.theirCardId);
        user2.cards.push({ cardId: trade.yourCardId, name: theirCard.name, tier: theirCard.tier, price: theirCard.price, image: theirCard.image });
        await user2.save();
      }

      global.pendingTrades.delete(senderNumber);
      reply(`✅ *Trade Successful!*\n\n@${trade.from} received ${yourCard.name}\n@${senderNumber} received ${theirCard.name}`, { mentions: [trade.from + '@s.whatsapp.net', sender] });

    } catch (err) {
      console.error("confirmtrade error:", err);
      reply("❌ Failed to complete trade.");
    }
  }
});
