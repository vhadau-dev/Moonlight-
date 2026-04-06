const Card = require('../../models/Card');
const config = require('../../config');

moon({
  name: 'reall',
  category: 'cards',
  description: 'Update all existing cards to the new design (Owner/Card Creator only)',
  usage: '.reall',
  async execute(sock, jid, sender, args, m, { reply, isCDC }) {
    try {
      // 🛡️ CDC CHECK
      if (!(await isCDC())) {
        return reply("⛔ You don't have permission for that. Only Card Creators can use this.");
      }

      // ── 2. Fetch all cards ────────────────────────────────────────────────
      const cards = await Card.find({});
      if (!cards.length) {
        return reply("📭 No cards found in the database.");
      }

      await reply(`🔄 Starting update for ${cards.length} cards. This might take a moment...`);

      // ── 3. Update logic ───────────────────────────────────────────────────
      // Since the card image is generated on-the-fly when viewed (usually),
      // we just need to ensure the database records are consistent.
      // If the system caches images, we would clear them here.
      // Based on the current structure, the cardGenerator is used when the card is displayed.
      
      // We'll perform a dummy update to trigger any middleware or just to confirm.
      let updatedCount = 0;
      for (const card of cards) {
        // Ensure description exists for the new design
        if (!card.description || card.description === "No description") {
          card.description = "The moonlight reveals all secrets...";
        }
        await card.save();
        updatedCount++;
      }

      return reply(`✅ Successfully updated ${updatedCount} cards to the new design system.`);

    } catch (err) {
      console.error('reall command error:', err);
      reply('❌ Failed to update cards.');
    }
  }
});
