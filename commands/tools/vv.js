const { downloadMediaMessage } = require('@whiskeysockets/baileys');

moon({
  name: 'vv',
  category: 'tools',
  description: 'Reveal a view-once image, video, or voice note (group admins only)',
  usage: '.vv (reply to a view-once message)',
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      // ── 1. Group-only + admin-only check ─────────────────────────────────
      if (!jid.endsWith('@g.us')) {
        return reply('❌ This command can only be used in groups.');
      }

      let isAdmin = false;
      try {
        const meta = await sock.groupMetadata(jid);
        const participant = meta.participants.find(p => p.id === sender);
        isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
      } catch {
        return reply('❌ Could not verify group permissions.');
      }

      if (!isAdmin) {
        return reply('⛔ Only group admins can use this command.');
      }

      // ── 2. Must be a reply ────────────────────────────────────────────────
      const contextInfo = m.message?.extendedTextMessage?.contextInfo || m.message?.imageMessage?.contextInfo || m.message?.videoMessage?.contextInfo;
      const quotedMsg   = contextInfo?.quotedMessage;

      if (!quotedMsg) {
        return reply('❌ Reply to a view-once message to reveal it.');
      }

      // ── 3. Find the view-once content ─────────────────────────────────────
      // Baileys sometimes nests the view-once message differently
      let viewOnce =
        quotedMsg.viewOnceMessage?.message ||
        quotedMsg.viewOnceMessageV2?.message ||
        quotedMsg.viewOnceMessageV2Extension?.message ||
        null;

      // If not found in standard wrappers, check if the quoted message itself is the media
      // but has the viewOnce property set to true inside the media message
      if (!viewOnce) {
        if (quotedMsg.imageMessage?.viewOnce) viewOnce = quotedMsg;
        else if (quotedMsg.videoMessage?.viewOnce) viewOnce = quotedMsg;
        else if (quotedMsg.audioMessage?.viewOnce) viewOnce = quotedMsg;
      }

      if (!viewOnce) {
        return reply('❌ The replied message is not a view-once message.');
      }

      // Extract the actual media message
      const mediaMsg = viewOnce.imageMessage || viewOnce.videoMessage || viewOnce.audioMessage;

      if (!mediaMsg) {
        return reply('❌ No supported media found in the view-once message.');
      }

      // ── 4. Download ───────────────────────────────────────────────────────
      const buffer = await downloadMediaMessage(
        {
          message: viewOnce,
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

      // ── 5. Re-send as normal media ────────────────────────────────────────
      if (viewOnce.imageMessage) {
        await sock.sendMessage(jid, {
          image:   buffer,
          caption: '👁️ *View-once revealed by admin*'
        }, { quoted: m });
      } else if (viewOnce.videoMessage) {
        await sock.sendMessage(jid, {
          video:   buffer,
          caption: '👁️ *View-once video revealed by admin*'
        }, { quoted: m });
      } else if (viewOnce.audioMessage) {
        await sock.sendMessage(jid, {
          audio:   buffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt:     true
        }, { quoted: m });
      }

    } catch (err) {
      console.error('vv command error:', err);
      reply('❌ Failed to reveal the view-once message. It might have already been opened or expired.');
    }
  }
});
