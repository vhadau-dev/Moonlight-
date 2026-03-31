const { exec } = require('child_process');
const config = require('../../config');
const path = require('path');
const fs = require('fs');

let isUpdating = false;

moon({
  name: "update",
  category: "owner",
  aliases: ["up"],
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const senderNumber = sender.split('@')[0];
      if (!config.OWNER_NUMBERS || !config.OWNER_NUMBERS.includes(senderNumber)) {
        return reply("❌ This command is strictly for owners only.");
      }

      if (isUpdating) {
        return reply("⚠️ An update is already in progress. Please wait.");
      }

      isUpdating = true;
      reply(`🔄 *Updating ${config.BOT_NAME}...* Please wait.`);

      const tempDir = path.join(__dirname, '../../.temp_update');
      const botDir = path.join(__dirname, '../../');
      
      // We pull the URL from the local git config to keep it private
      const cmd = `
        rm -rf "${tempDir}" &&
        git clone "$(git config --get remote.origin.url)" "${tempDir}" &&
        cd "${tempDir}" &&
        rm -f config.js &&
        rm -rf sessions/ &&
        cp -R * "${botDir}" &&
        cd "${botDir}" &&
        rm -rf "${tempDir}"
      `;

      exec(cmd, (error, stdout, stderr) => {
        isUpdating = false;
        if (error) {
          console.error("Update error:", error);
          return reply("❌ *Update failed!*");
        }
        
        reply(`✅ *${config.BOT_NAME}* update done. Use *restart* to apply changes.`);
      });

    } catch (err) {
      isUpdating = false;
      console.error("Update command error:", err);
      reply("❌ An error occurred while trying to update the bot.");
    }
  }
});
