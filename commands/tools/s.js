const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

moon({
  name: 's',
  category: 'tools',
  description: 'Convert an image or video to a sticker',
  usage: '.s (reply to an image or video)',
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo || m.message?.imageMessage?.contextInfo || m.message?.videoMessage?.contextInfo;
      const quoted = contextInfo?.quotedMessage;

      if (!quoted) {
        return reply('❌ Reply to an image or video to make a sticker.');
      }

      const imageMsg  = quoted.imageMessage;
      const videoMsg  = quoted.videoMessage;
      const stickerMsg = quoted.stickerMessage;

      if (!imageMsg && !videoMsg && !stickerMsg) {
        return reply('❌ Reply to an image, video, or sticker.');
      }

      // Download the media
      const buffer = await downloadMediaMessage(
        {
          message: quoted,
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

      // Create and format the sticker
      const sticker = new Sticker(buffer, {
        pack: '𝚳𝚯𝚯𝚴𝐋𝚰𝐆𝚮𝚻', // Pack name
        author: '𝚳𝚯𝚯𝚴𝐋𝚰𝐆𝚮𝚻 ✑ pack', // Author name
        type: StickerTypes.FULL, // Full sticker (no crop)
        categories: ['🤩', '✨'], // Sticker categories
        id: 'moonlight-sticker', // Sticker id
        quality: 70, // Quality of the sticker
      });

      const stickerBuffer = await sticker.toBuffer();

      // Send the formatted sticker
      await sock.sendMessage(
        jid,
        { sticker: stickerBuffer },
        { quoted: m }
      );

    } catch (err) {
      console.error('Sticker cmd error:', err);
      reply('❌ Failed to create sticker. Make sure the video is short (under 10s).');
    }
  }
});
