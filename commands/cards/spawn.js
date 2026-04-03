const Card = require('../../models/Card');
const GroupSpawn = require('../../models/GroupSpawn');
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

// ================= CHECK SPAWN STATUS =================
async function isSpawnEnabled(jid) {
  const settings = await GroupSpawn.findOne({ jid });
  if (!settings) return false; // Default to OFF for safety, user must enable it
  return settings.enabled;
}

// ================= CARD SPAWN =================
async function spawnCard(sock, jid, card = null) {
  try {
    // If no card provided, generate a new one
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
        description: char.about || "No description available.",
        owner: null,
        isEquipped: false,
        source: "spawn"
      });
    }

    const cardBuffer = await generateCardImage(targetCard);

    await sock.sendMessage(jid, {
      image: cardBuffer,
      caption: `🃏 *${config.BOT_NAME} SPAWN EVENT* 🃏\n\nUse *.claim ${targetCard.cardId}* to collect it!`
    });

    return targetCard;

  } catch (err) {
    console.error("Spawn error:", err);
    return null;
  }
}

// ================= COMMAND =================
moon({
  name: "spawn",
  category: "cards",
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];

      const isCreator = config.CARDS_CREATERS?.map(String).includes(senderNumber);
      if (!isCreator) {
        return reply("⛔ You don't have permission for that.");
      }

      // Get or create group settings
      let settings = await GroupSpawn.findOne({ jid });

      if (!settings) {
        settings = await GroupSpawn.create({
          jid,
          enabled: true
        });
      }

      const action = args[0]?.toLowerCase();

      // ================= ON =================
      if (action === "on") {
        settings.enabled = true;
        await settings.save();
        return reply("✅ Spawn enabled for this group.");
      }

      // ================= OFF =================
      if (action === "off") {
        settings.enabled = false;
        await settings.save();
        return reply("❌ Spawn disabled for this group.");
      }

      // ================= FORCE =================
      if (action === "force") {
        reply("🚀 Forcing spawn...");
        await spawnCard(sock, jid);
        return;
      }

      // ================= STATUS =================
      if (action === "status") {
        return reply(`📊 Spawn is ${settings.enabled ? "ON ✅" : "OFF ❌"}`);
      }

      return reply(
        "❓ Usage:\n" +
        ".spawn on\n" +
        ".spawn off\n" +
        ".spawn force\n" +
        ".spawn status"
      );

    } catch (err) {
      console.error("spawn command error:", err);
      reply("❌ An error occurred.");
    }
  }
});

// ================= AUTO SPAWN =================
/**
 * Automatically spawns cards in all enabled groups every 35 minutes.
 */
function startAutoSpawn(sock) {
  console.log("🎴 Card Auto-Spawn System started (Interval: 35m)");

  setInterval(async () => {
    try {
      // Find all groups that have spawning enabled
      const enabledGroups = await GroupSpawn.find({ enabled: true });
      
      if (enabledGroups.length === 0) {
        console.log("[AUTO-SPAWN] No groups have spawning enabled. Skipping.");
        return;
      }

      console.log(`[AUTO-SPAWN] Spawning cards in ${enabledGroups.length} groups...`);

      let spawnedCard = null;
      for (const group of enabledGroups) {
        // Spawn the SAME card in all groups for this interval
        spawnedCard = await spawnCard(sock, group.jid, spawnedCard);
      }
    } catch (err) {
      console.error("[AUTO-SPAWN] Error in interval:", err);
    }
  }, 35 * 60 * 1000); // 35 minutes
}

module.exports = {
  spawnCard,
  startAutoSpawn
};
