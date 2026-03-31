const axios = require("axios");
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

      reply("🔄 *Restarting the bot...* Please wait a few seconds.");

      // Save restart info to send confirmation message after startup
      fs.writeFileSync('./restart_info.json', JSON.stringify({ jid, m }));

      // Pterodactyl API details
      const api_token = "ptlc_TE7rx4bmMzYteWFfVQG1QYd0RXNnSmjfWtYbNdgFzyM";
      const server_id = "24c41350";
      const api_url = `https://panel.spaceify.eu/api/client/servers/${server_id}/power`;

      // Tell the panel to restart the server
      await axios.post(api_url, {
        signal: "restart"
      }, {
        headers: {
          "Authorization": `Bearer ${api_token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });

    } catch (err) {
      console.error("restart command error:", err);
      if (fs.existsSync('./restart_info.json')) fs.unlinkSync('./restart_info.json');
      reply("❌ Failed to restart the bot via panel API. Check your API token and server ID.");
    }
  }
});
