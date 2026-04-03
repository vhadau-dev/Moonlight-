const User = require('../../models/User');
const config = require('../../config');
const { generateProfileImage } = require('../../utils/profileGenerator');
const moment = require('moment-timezone');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

// ── Helper: check if a number is an owner ──────────────────────────────────
function isOwner(number) {
  return config.OWNER_NUMBERS?.includes(number);
}

// ── Helper: convert video buffer → 5-second GIF buffer via ffmpeg ──────────
async function videoToGif(videoBuffer) {
  const tmpDir   = os.tmpdir();
  const inFile   = path.join(tmpDir, `ml_vbg_${Date.now()}.mp4`);
  const outFile  = path.join(tmpDir, `ml_vbg_${Date.now()}.gif`);

  try {
    fs.writeFileSync(inFile, videoBuffer);

    // Trim to first 5 s, scale to 800px wide, 15 fps, decent quality
    execSync(
      `ffmpeg -y -t 5 -i "${inFile}" -vf "fps=15,scale=800:-1:flags=lanczos" -loop 0 "${outFile}"`,
      { stdio: 'pipe' }
    );

    const gifBuffer = fs.readFileSync(outFile);
    return gifBuffer;
  } finally {
    try { fs.unlinkSync(inFile);  } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

// ── Helper: upload buffer to Catbox.moe ────────────────────────────────────
async function uploadToCatbox(buffer, extension = 'gif') {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('userhash', '');
  form.append('fileToUpload', buffer, {
    filename: `vbg.${extension}`,
    contentType: `image/${extension}`
  });

  const response = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders(),
    timeout: 60000
  });

  return (response.data || '').trim();
}

// ── .profile / .p ──────────────────────────────────────────────────────────
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

      // ── Decide background ─────────────────────────────────────────────────
      let backgroundForCard = user.backgroundImage || null;
      let videoGifUrl       = null;

      if (isOwner(targetNumber) && user.videoBackground) {
        videoGifUrl = user.videoBackground;
      }

      // Generate stylized profile image (static canvas card)
      const profileBuffer = await generateProfileImage({
        username:     user.username || pushName || 'N/A',
        role:         role,
        pfp:          pfp,
        background:   backgroundForCard,
        bio:          user.bio || '.',
        wallet:       wallet,
        bank:         bank,
        messageCount: user.messageCount || 0
      });

      const registeredDate = moment(user.createdAt).format('DD/MM/YYYY');
      const bannedStatus   = user.banned ? "Yes ❌" : "No ✅";
      const total          = wallet + bank;

      const cleanStatus = user.bio && user.bio !== '.'
        ? (user.bio.length > 30 ? user.bio.substring(0, 27) + '...' : user.bio)
        : 'Active';

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

      // ── Send profile card ─────────────────────────────────────────────────
      if (videoGifUrl) {
        // Owner with video background: send GIF (plays in chat) + profile card
        await sock.sendMessage(
          jid,
          {
            video:    { url: videoGifUrl },
            gifPlayback: true,
            caption:  '🎬 *Profile Background*',
            mentions: [target]
          },
          { quoted: m }
        );

        return sock.sendMessage(
          jid,
          {
            image:    profileBuffer,
            caption:  msg,
            mentions: [target]
          },
          { quoted: m }
        );
      } else {
        // Regular users / owners without video bg: single image card
        return sock.sendMessage(
          jid,
          {
            image:    profileBuffer,
            caption:  msg,
            mentions: [target]
          },
          { quoted: m }
        );
      }

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

// ── .setvbc – set video background (OWNERS ONLY) ───────────────────────────
moon({
  name: "setvbc",
  category: "profile",
  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const senderNumber = sender.split('@')[0];

      // ── Owner-only gate ───────────────────────────────────────────────────
      if (!isOwner(senderNumber)) {
        return reply("⛔ Only bot owners can set a video background.");
      }

      // ── Must reply to a video ─────────────────────────────────────────────
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const quotedMsg   = contextInfo?.quotedMessage;

      if (!quotedMsg?.videoMessage) {
        return reply("❌ Please *reply to a video* with `.setvbc` to set your video background.");
      }

      await reply("⏳ Processing your video background (trimming to 5s & converting to GIF)...");

      // ── Download the quoted video ─────────────────────────────────────────
      const videoBuffer = await downloadMediaMessage(
        {
          message: quotedMsg,
          key: {
            remoteJid: jid,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant || sender
          }
        },
        'buffer',
        {},
        {
          logger: require('pino')({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage
        }
      );

      if (!videoBuffer || !videoBuffer.length) {
        return reply("❌ Failed to download the video. Please try again.");
      }

      // ── Convert to 5-second GIF ───────────────────────────────────────────
      let gifBuffer;
      try {
        gifBuffer = await videoToGif(videoBuffer);
      } catch (ffErr) {
        console.error("ffmpeg error:", ffErr);
        return reply("❌ Failed to process the video. Make sure it is a valid video file.");
      }

      // ── Upload to Catbox ──────────────────────────────────────────────────
      let catboxUrl;
      try {
        catboxUrl = await uploadToCatbox(gifBuffer);
      } catch (upErr) {
        console.error("Catbox upload error:", upErr);
        return reply("❌ Failed to upload video background to server.");
      }

      // ── Save URL on the user document ─────────────────────────────────────
      const user = await findOrCreateWhatsApp(sender, pushName);
      if (!user) return reply("❌ User not found.");

      user.videoBackground = catboxUrl;
      await user.save();

      reply("✅ Your *video background* has been set! It will play as a GIF when someone views your profile. 🎬");

    } catch (err) {
      console.error("setvbc error:", err);
      reply("❌ Failed to set video background. Please try again.");
    }
  }
});

// ── .clearvbc – remove video background (OWNERS ONLY) ─────────────────────
moon({
  name: "clearvbc",
  category: "profile",
  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const senderNumber = sender.split('@')[0];

      if (!isOwner(senderNumber)) {
        return reply("⛔ Only bot owners can use this command.");
      }

      const user = await findOrCreateWhatsApp(sender, pushName);
      if (!user) return reply("❌ User not found.");

      user.videoBackground = null;
      await user.save();

      reply("✅ Your video background has been removed.");
    } catch (err) {
      console.error("clearvbc error:", err);
      reply("❌ Failed to clear video background.");
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
