// handlers/OwnersMeme.js

const config = require('../config');

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = async (sock, m) => {
  try {
    if (!m.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const sender = m.key.participant || jid;

    // ---------------- GET TEXT ----------------
    const body =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      '';

    // ---------------- MENTIONS ----------------
    const mentioned =
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
      m.message?.imageMessage?.contextInfo?.mentionedJid ||
      m.message?.videoMessage?.contextInfo?.mentionedJid ||
      [];

    const mentionedNumbers = mentioned.map(j => j.split('@')[0]);

    const ownerNumbers = config.OWNER_NUMBERS || [];

    const isOwnerMentioned = mentionedNumbers.some(num =>
      ownerNumbers.includes(num)
    );

    const isOwnerSender = ownerNumbers.includes(sender.split('@')[0]);

    // ---------------- STICKERS (AUTO-REPLY WHEN TAGGED) ----------------
    if (isOwnerMentioned && config.OWNER_STICKERS?.length) {
      const url = random(config.OWNER_STICKERS);

      try {
        const res = await require('axios').get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data);

        await sock.sendMessage(jid, {
          sticker: buffer
        }, { quoted: m });

        return true;
      } catch (upErr) {
        console.error("Failed to send owner sticker:", upErr);
      }
    }

    // ---------------- OWNER TALKING MEME ----------------
    if (isOwnerSender) {
      if (body.toLowerCase().includes("hi") || body.toLowerCase().includes("hello")) {
        await sock.sendMessage(jid, {
          text: "👑 The owner has spoken..."
        }, { quoted: m });

        return true;
      }
    }

  } catch (err) {
    console.error("OwnersMeme error:", err);
  }

  return false;
};