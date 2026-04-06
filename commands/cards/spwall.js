const GroupSpawn = require('../../models/GroupSpawn');
const Card = require('../../models/Card');
const config = require('../../config');
const axios = require('axios');
const { generateCardImage } = require('../../utils/cardGenerator');

// ================= ID GENERATOR =================
function generateId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ================= SPAWN LOGIC =================
async function spawnCard(sock, jid, card = null) {
  try {
    let targetCard = card;
    
    if (!targetCard) {
      const randomId = Math.floor(Math.random() * 5000) + 1;
      const res = await axios.get(`https://api.jikan.moe/v4/characters/${randomId}/full`).catch(() => null);
      if (!res?.data?.data) return null;

      const char = res.data.data;
      const tiers = ["1", "2", "3", "4", "5", "6"];
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const cardId = generateId();

      const exists = await Card.findOne({ cardId });
      if (exists) return null;

      targetCard = await Card.create({
        cardId,
        name: char.name,
        tier,
        atk: Math.floor(Math.random() * 5000) + 1000,
        def: Math.floor(Math.random() * 5000) + 1000,
        level: 1,
        image: char.images?.jpg?.image_url,
        description: char.about || "No description",
        owner: null,
        isEquipped: false,
        source: "spawn"
      });
    }

    const cardBuffer = await generateCardImage(targetCard);

    await sock.sendMessage(jid, {
      image: cardBuffer,
      caption: `🃏 *${config.BOT_NAME} SPAWN EVENT* 🃏\n\nUse *.claim ${targetCard.cardId}* to collect!`
    });

    return targetCard;

  } catch (err) {
    console.error("Spawn error:", err);
    return null;
  }
}

// ================= CMD =================
moon({
  name: "spwall",
  category: "cards",
  async execute(sock, jid, sender, args, m, { reply, isCDC }) {
    try {
      // 🛡️ CDC CHECK
      if (!(await isCDC())) {
        return reply("⛔ You don't have permission for that. Only Card Creators can use this.");
      }

      // Get all enabled groups
      const groups = await GroupSpawn.find({ enabled: true });

      if (!groups.length) {
        return reply("❌ No groups have spawning enabled.");
      }

      reply(`🚀 Spawning ${config.BOT_NAME} cards in ${groups.length} group(s)...`);

      let success = 0;
      let spawnedCard = null;

      for (const g of groups) {
        try {
          // Spawn the SAME card in all groups
          spawnedCard = await spawnCard(sock, g.jid, spawnedCard);
          if (spawnedCard) success++;
        } catch (err) {
          console.error(`Failed spawning in ${g.jid}`, err);
        }
      }

      reply(`✅ Spawn complete in ${success}/${groups.length} groups.`);

    } catch (err) {
      console.error("spwall error:", err);
      reply("❌ An error occurred.");
    }
  }
});
