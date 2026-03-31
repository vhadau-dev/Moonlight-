const User = require('../../models/User');
const config = require('../../config');
const { generateProfileImage } = require('../../utils/profileGenerator');
const moment = require('moment-timezone');

moon({
  name: "profile",
  category: "profile",
  aliases: ["p"],
  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const context = m.message?.extendedTextMessage?.contextInfo;
      let target = sender;
      if (context?.mentionedJid?.length) target = context.mentionedJid[0];
      else if (context?.participant) target = context.participant;

      const targetNumber = target.split('@')[0];

      // Use the bot's standard findOrCreateWhatsApp to ensure data consistency
      const user = await findOrCreateWhatsApp(target, pushName);
      if (!user) return reply('❌ User not found.');

      // Determine Role
      let role = "Lord 👑";
      if (config.OWNER_NUMBERS?.includes(targetNumber)) {
        role = "Owner";
      } else if (config.CARDS_CREATERS?.includes(targetNumber)) {
        role = "Card Creator";
      }

      // Fetch Profile Picture
      let pfp;
      try {
        pfp = await sock.profilePictureUrl(target, 'image');
      } catch (err) {
        pfp = 'https://i.imgur.com/6VBx3io.png'; // Fallback
      }

      // Generate stylized profile image
      const profileBuffer = await generateProfileImage({
        username: user.username || pushName || 'N/A',
        role: role,
        pfp: pfp,
        background: user.backgroundImage
      });

      const registeredDate = moment(user.createdAt).format('DD/MM/YYYY');
      const bannedStatus = user.banned ? "Yes ❌" : "No ✅";
      const wallet = user.balance || 0;
      const bank = user.bank || 0;
      const total = wallet + bank;

      // Clean up bio for Status (short version)
      const cleanStatus = user.bio && user.bio !== '.' ? (user.bio.length > 30 ? user.bio.substring(0, 27) + "..." : user.bio) : "Active";

      const msg = `
╭━━━★彡 𝚳𝚯𝚯𝚴𝐋𝚰𝐆𝚮𝚻
 *Name*    : ${user.username || pushName || 'N/A'}
 *Age*      : ${user.age || 'N/A'}

*⳹─❖────────❖─⳹*
 *Status*  : ${cleanStatus}
 *Role*    : ${role}

 *Wallet*  : ${wallet.toLocaleString()}
 *Bank*    : ${bank.toLocaleString()}
 *Total*   : ${total.toLocaleString()}

 *Registered* : ${registeredDate}
 *Banned*     : ${bannedStatus}

*⳹─❖────────❖─⳹*
        *ꕥ     Bio      ꕥ*
${user.bio || 'No bio set'}

*⳹─❖──「 🌛 」──❖─⳹*
🌙 Moonlight Haven
      `.trim();

      return sock.sendMessage(
        jid,
        { 
          image: profileBuffer, 
          caption: msg,
          mentions: [target]
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("profile error:", err);
      reply("❌ An error occurred while fetching the profile.");
    }
  }
});

moon({
  name: "setbc",
  category: "profile",
  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const url = args[0];

      if (!url || !url.startsWith('http')) {
        return reply("❌ Please provide a direct image URL to set your background.\nExample: .setbc https://example.com/image.jpg");
      }

      // Get user using standard method
      const user = await findOrCreateWhatsApp(sender, pushName);
      if (!user) return reply("❌ User not found.");

      // Update background image
      user.backgroundImage = url;
      await user.save();

      reply("✅ Your profile background has been updated!");

    } catch (err) {
      console.error("setbc error:", err);
      reply("❌ Failed to set background. Please try again.");
    }
  }
});
