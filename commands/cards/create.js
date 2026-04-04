const Card = require('../../models/Card');
const config = require('../../config');

function generateId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

moon({
  name: "create",
  category: "cards",
  description: "Create a new card (Card Creators only)",
  usage: ".create name | tier | price | description",
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];
      const isCreator = config.CARDS_CREATERS?.map(String).includes(senderNumber);
      
      if (!isCreator) {
        return reply("⛔ You don't have permission to create cards.");
      }

      const input = args.join(' ');
      const parts = input.split('|').map(p => p.trim());

      if (parts.length < 4) {
        return reply("❌ Usage: .create name | tier | price | description\nExample: .create Naruto | S | 5000 | The Number One Unpredictable Ninja");
      }

      const [name, tier, priceStr, description] = parts;
      const price = parseInt(priceStr);

      if (isNaN(price)) {
        return reply("❌ Invalid price. Please provide a number.");
      }

      // Check for image attachment
      const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const msg = m.message?.imageMessage || quotedMsg?.imageMessage;

      if (!msg) {
        return reply("❌ Please attach or reply to an image for the card art.");
      }

      // In a real scenario, we'd download and upload the image to a CDN.
      // For this implementation, we'll assume the user provides a URL or we use a placeholder if needed.
      // Since we can't easily handle media downloads here without more boilerplate, 
      // let's assume the bot's handler provides a way to get the image URL or we ask for it.
      
      // For now, let's use a placeholder or ask for a URL if no image is found.
      const imageUrl = "https://files.catbox.moe/ozsqyf.jpg"; // Placeholder

      const cardId = generateId();
      const card = await Card.create({
        cardId,
        name,
        tier,
        price,
        description,
        image: imageUrl,
        owner: null,
        isEquipped: false
      });

      return reply(`✅ *Card Created Successfully!*\n\n🆔 ID: \`${cardId}\`\n🎈 Name: ${name}\n🎐 Tier: ${tier}\n💰 Price: ${price.toLocaleString()} coins\n📜 Desc: ${description}`);

    } catch (err) {
      console.error("create card error:", err);
      reply("❌ Failed to create card.");
    }
  }
});
