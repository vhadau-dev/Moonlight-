const fs = require('fs');
const config = require('../../config');

/**
 * .restart — Owner-only command to reboot the bot.
 * 
 * The bot saves the current context (jid and message key) to restart_info.json,
 * then exits with code 0. It relies on an external process manager (like PM2, 
 * nodemon, or a hosting panel) to automatically restart the process.
 * 
 * On startup, index.js checks for restart_info.json and sends a confirmation 
 * message back to the user.
 */
moon({
  name: "restart",
  category: "owner",
  async execute(sock, jid, sender, args, m, { reply, isOwner }) {
    try {
      const senderNumber = sender.split('@')[0];
      
      // ── 1. Owner-only check ───────────────────────────────────────────────
      if (!(await isOwner())) {
        return reply("⛔ You don't have permission for that.");
      }

      // ── 2. Save restart state ─────────────────────────────────────────────
      // We save the full message key to ensure we can quote the original message
      const restartData = {
        jid: jid,
        m: m,
        time: Date.now()
      };

      try {
        fs.writeFileSync('./restart_info.json', JSON.stringify(restartData, null, 2));
      } catch (fsErr) {
        console.error("Failed to write restart_info.json:", fsErr);
        return reply("❌ Failed to save restart state. Restart aborted.");
      }

      // ── 3. Notify user ────────────────────────────────────────────────────
      await reply(`🔄 *${config.BOT_NAME}* is restarting...\n_Please wait a few seconds for the bot to come back online._`);

      // ── 4. Exit process ───────────────────────────────────────────────────
      // Small delay to allow the reply message to be sent to WhatsApp servers
      setTimeout(() => {
        console.log(`[RESTART] Initiated by ${senderNumber}. Exiting...`);
        process.exit(0); 
      }, 2000);

    } catch (err) {
      console.error("restart command error:", err);
      // Cleanup on failure
      if (fs.existsSync('./restart_info.json')) {
        try { fs.unlinkSync('./restart_info.json'); } catch {}
      }
      reply("❌ An error occurred while trying to restart the bot.");
    }
  }
});
