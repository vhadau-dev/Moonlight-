
const User = require('../../models/User');
const config = require('../../config');
const { generateProfileImage } = require('../../utils/profileGenerator');
const moment = require('moment-timezone');

// ── Helper: check if a number is an owner ──────────────────────────────────
function isOwner(number) {
  return config.OWNER_NUMBERS?.includes(number);
}

// ── .profile / .p ──────────────────────────────────────────────────────────
moon({
  name: "p",
  category: "profile",
  aliases: ["prpfile"],
  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const context = m.message?.extendedTextMessage?.contextInfo;
      let target = sender;
      if (context?.mentionedJid?.length) target = context.mentionedJid[0];
      else if (context?.participant) target = context.participant;

      const targetNumber = target.split('@')[0];

      const user = await findOrCreateWhatsApp(target, pushName);
      if (!user) return reply('❌ User not found.');

      // Determine Role
      let role = "citizen";
      if (isOwner(targetNumber)) {
        role = "Owner 👑";
      } else if (config.CARDS_CREATERS?.includes(targetNumber)) {
        role = "Card Creator";
      }

      // Fetch live profile picture from WhatsApp
      let pfp;
      try {
        pfp = await sock.profilePictureUrl(target, 'image');
      } catch {
        pfp = user.profileImage || 'https://i.imgur.com/6VBx3io.png';
      }

      const wallet = user.balance || 0;
      const bank   = user.bank   || 0;

      // Generate stylized profile image
      const profileBuffer = await generateProfileImage({
        username:     user.username || pushName || 'N/A',
        role:         role,
        pfp:          pfp,
        background:   user.backgroundImage || null,
        bio:          user.bio || '> --bio not set',
        wallet:       wallet,
        bank:         bank,
        messageCount: user.messageCount || 0
      });

      const registeredDate = moment(user.createdAt).format('DD/MM/YYYY');
      const bannedStatus   = user.banned ? "Yes" : "No";
      const total          = wallet + bank;

      const cleanStatus = user.bio && user.bio !== '.'
        ? (user.bio.length > 30 ? user.bio.substring(0, 27) + '...' : user.bio)
        : 'Active';

      const msg = `
╭━━━★彡 𝚳𝚯𝚯𝚴𝐋𝚰𝐆𝚮𝚻
 *Name*    : ${user.username || pushName || 'N/A'}
 *Age*      : ${user.age || 'N/A'}

*⳹─❖────────❖─⳹*
 *Status*  : player
 *Role*    : *${role}*

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
          image:    profileBuffer,
          caption:  msg,
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

// ── .setbc – set background image (all users) ──────────────────────────────
moon({
  name: "setbc",
  category: "profile",
  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const url = args[0];

      if (!url || !url.startsWith('http')) {
        return reply("❌ Please provide a direct image URL.\nExample: .setbc https://example.com/image.jpg");
      }

      const user = await findOrCreateWhatsApp(sender, pushName);
      if (!user) return reply("❌ User not found.");

      user.backgroundImage = url;
      await user.save();

      reply("✅ Your profile background has been updated!");
    } catch (err) {
      console.error("setbc error:", err);
      reply("❌ Failed to set background. Please try again.");
    }
  }
});

// ── .setp – set middle (profile) image ─────────────────────────────────────
moon({
  name: "setp",
  category: "profile",
  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const url = args[0];

      if (!url || !url.startsWith('http')) {
        return reply("❌ Please provide a direct image URL.\nExample: .setp https://example.com/image.jpg");
      }

      const user = await findOrCreateWhatsApp(sender, pushName);
      if (!user) return reply("❌ User not found.");

      user.profileImage = url;
      await user.save();

      reply("✅ Your profile picture has been updated!");
    } catch (err) {
      console.error("setp error:", err);
      reply("❌ Failed to set profile image. Please try again.");
    }
  }
});
