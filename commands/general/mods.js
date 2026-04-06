const User = require('../../models/User');
const config = require('../../config');

moon({
  name: 'mods',
  category: 'general',
  description: 'Show Moonlight Haven owners and moderators',

  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      // Fetch all owners and mods from database
      const staff = await User.find({ 
        role: { $in: ['Owner', 'True Owner', 'Mod'] } 
      });

      if (!staff.length) {
        return reply("❌ No staff members found in the database.");
      }

      const owners = staff.filter(u => u.role === 'Owner' || u.role === 'True Owner');
      const mods = staff.filter(u => u.role === 'Mod');

      let mentions = [];
      let ownersText = owners.map(u => {
        const jidUser = u.whatsappNumber || (u.userId + '@s.whatsapp.net');
        mentions.push(jidUser);
        return `✦ @${u.userId} (${u.username})`;
      }).join('\n');

      let modsText = mods.map(u => {
        const jidUser = u.whatsappNumber || (u.userId + '@s.whatsapp.net');
        mentions.push(jidUser);
        return `✦ @${u.userId} (${u.username})`;
      }).join('\n');

      const caption = `
*「 🌙 𝓜𝓸𝓸𝓷𝓵𝓲𝓰𝓱𝓽 𝓗𝓪𝓿𝓮𝓷 」*

⳹─❖「 👑 𝗢𝘄𝗻𝗲𝗿𝘀 」❖─⳹
${ownersText || 'None'}

⳹─❖「 🛡️ 𝗠𝗼𝗱𝗲𝗿𝗮𝘁𝗼𝗿𝘀 」❖─⳹
${modsText || 'None'}

⳹─❖────「⚔️ 」────❖─⳹

> ⚠️ Use this command only when necessary.  
> Repeated usage may lead to restrictions. Don't tell us you were just testing
> Or we will test the .kick cmd on you
      `.trim();

      if (config.MOONLIGHT_IMAGE) {
        await sock.sendMessage(jid, {
          image: { url: config.MOONLIGHT_IMAGE },
          caption,
          mentions
        }, { quoted: m });
      } else {
        await sock.sendMessage(jid, {
          text: caption,
          mentions
        }, { quoted: m });
      }

    } catch (err) {
      console.error("Mods command error:", err);
      reply("❌ Failed to load staff members.");
    }
  }
});
