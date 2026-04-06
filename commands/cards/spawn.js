const Card = require('../../models/Card');
const GroupSpawn = require('../../models/GroupSpawn');
const config = require('../../config');
const { spawnCard } = require('../../handler/CardsSystem');

// ================= COMMAND =================
moon({
  name: "spawn",
  category: "cards",
  async execute(sock, jid, sender, args, m, { reply, isCDC }) {
    try {
      // 🛡️ CDC CHECK
      if (!(await isCDC())) {
        return reply("⛔ You don't have permission for that. Only Card Creators can use this.");
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
