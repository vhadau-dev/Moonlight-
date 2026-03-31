const fs = require('fs');
const config = require('../../config');

moon({
  name: "restart",
  category: "owner",
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];
      if (!config.OWNER_NUMBERS || !config.OWNER_NUMBERS.includes(senderNumber)) {
        return reply("❌ This command is strictly for owners only.");
      }

      // Save restart info to send confirmation message after startup
      fs.writeFileSync('./restart_info.json', JSON.stringify({ jid, m }));

      await reply(`🔄 *${config.BOT_NAME}* is restarting...`);

      // Small delay to ensure message is sent before exit
      setTimeout(() => {
        process.exit(0); 
        // This will trigger the panel's auto-restart feature
      }, 1500);

    } catch (err) {
      console.error("restart command error:", err);
      if (fs.existsSync('./restart_info.json')) fs.unlinkSync('./restart_info.json');
      reply("❌ Failed to initiate restart.");
    }
  }
});
