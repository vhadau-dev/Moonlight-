const Card = require('../../models/Card');
const User = require('../../models/User');
const { createCanvas, loadImage } = require('canvas');

moon({
  name: "deck",
  category: "cards",
  description: "Show your cards as a visual deck",
  usage: ".deck [page]",
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];
      const page = parseInt(args[0]) || 1;
      const limit = 6;
      const skip = (page - 1) * limit;

      const user = await User.findOne({ whatsappNumber: sender });
      if (!user || !user.cards || user.cards.length === 0) {
        return reply("📭 Your collection is empty. Claim some cards first!");
      }

      const totalCards = user.cards.length;
      const totalPages = Math.ceil(totalCards / limit);

      if (page > totalPages) {
        return reply(`❌ Invalid page. You only have ${totalPages} pages.`);
      }

      const cardsToShow = user.cards.slice(skip, skip + limit);

      // Create Canvas for Deck Image
      const canvasWidth = 1200;
      const canvasHeight = 1800;
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`MY DECK - PAGE ${page}/${totalPages}`, canvasWidth / 2, 100);

      // Draw Cards
      const cardWidth = 500;
      const cardHeight = 750;
      const margin = 50;
      const startX = 75;
      const startY = 150;

      for (let i = 0; i < cardsToShow.length; i++) {
        const card = cardsToShow[i];
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = startX + col * (cardWidth + margin);
        const y = startY + row * (cardHeight + margin);

        // Card Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, cardWidth, cardHeight);
        ctx.strokeStyle = '#62fe00';
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, cardWidth, cardHeight);

        try {
          const cardImg = await loadImage(card.image);
          ctx.drawImage(cardImg, x + 10, y + 10, cardWidth - 20, cardHeight - 150);
        } catch (err) {
          ctx.fillStyle = '#333';
          ctx.fillRect(x + 10, y + 10, cardWidth - 20, cardHeight - 150);
          ctx.fillStyle = '#fff';
          ctx.font = '30px Arial';
          ctx.fillText('Image Load Failed', x + cardWidth / 2, y + cardHeight / 2);
        }

        // Card Info
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 35px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(card.name.toUpperCase(), x + cardWidth / 2, y + cardHeight - 100);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = '#9ec0fd';
        ctx.fillText(`ID: ${card.cardId} | TIER: ${card.tier}`, x + cardWidth / 2, y + cardHeight - 50);
      }

      const buffer = canvas.toBuffer();
      await sock.sendMessage(jid, { 
        image: buffer, 
        caption: `🎒 *Your Deck (Page ${page}/${totalPages})*\nTotal Cards: ${totalCards}` 
      }, { quoted: m });

    } catch (err) {
      console.error("deck error:", err);
      reply("❌ Failed to generate deck image.");
    }
  }
});
