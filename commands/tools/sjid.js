/**
 * .sjid — Tool command to retrieve sticker metadata from a replied image or sticker.
 * 
 * Usage:
 *   Reply to an image or sticker message, then send:  .sjid
 * 
 * The bot will:
 *   1. Extract the sticker ID, pack name, author, and other metadata.
 *   2. Reply with the formatted information.
 */
moon({
  name: 'sjid',
  category: 'tools',
  description: 'Get sticker metadata (ID, pack, author) from a replied image or sticker.',
  usage: '.sjid (reply to an image or sticker)',
  cooldown: 5,

  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      // ── 1. Resolve the quoted / replied message ───────────────────────────
      const contextInfo =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo       ||
        m.message?.videoMessage?.contextInfo       ||
        m.message?.stickerMessage?.contextInfo;

      const quotedMsg = contextInfo?.quotedMessage;

      if (!quotedMsg) {
        return reply('❌ Please *reply to an image or sticker* with `.sjid` to get its metadata.');
      }

      // ── 2. Extract metadata based on message type ─────────────────────────
      let metadata = {};
      let type = '';

      if (quotedMsg.stickerMessage) {
        type = 'Sticker';
        const sticker = quotedMsg.stickerMessage;
        metadata = {
          'Sticker ID': sticker.fileSha256 ? Buffer.from(sticker.fileSha256).toString('hex').slice(0, 16) : 'N/A',
          'Mimetype': sticker.mimetype || 'image/webp',
          'Direct URL': sticker.url || 'N/A',
          'Media Key': sticker.mediaKey ? Buffer.from(sticker.mediaKey).toString('hex').slice(0, 16) + '...' : 'N/A',
          'File Length': sticker.fileLength ? `${(sticker.fileLength / 1024).toFixed(2)} KB` : 'N/A'
        };
      } else if (quotedMsg.imageMessage) {
        type = 'Image';
        const image = quotedMsg.imageMessage;
        metadata = {
          'Image ID': image.fileSha256 ? Buffer.from(image.fileSha256).toString('hex').slice(0, 16) : 'N/A',
          'Mimetype': image.mimetype || 'image/jpeg',
          'Width': image.width || 'N/A',
          'Height': image.height || 'N/A',
          'File Length': image.fileLength ? `${(image.fileLength / 1024).toFixed(2)} KB` : 'N/A'
        };
      } else {
        return reply('❌ The replied message must be an *image* or *sticker*.');
      }

      // ── 3. Format and send the reply ──────────────────────────────────────
      let msg = `✨ *${type} Metadata* ✨\n\n`;
      for (const [key, value] of Object.entries(metadata)) {
        msg += `*${key}*: \`${value}\`\n`;
      }
      
      msg += `\n_Use this ID for custom sticker packs or tracking._`;

      return reply(msg);

    } catch (err) {
      console.error('sjid command error:', err);
      reply('❌ An error occurred while retrieving metadata. Please try again.');
    }
  }
});
