const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

/**
 * .url — Upload a replied image or video to catbox.moe and return the direct URL.
 *
 * Usage:
 *   Reply to an image or video message, then send:  .url
 *
 * The bot will:
 *   1. Download the media from WhatsApp
 *   2. Upload it to https://catbox.moe
 *   3. Reply with the direct public URL
 */
moon({
  name: 'url',
  category: 'tools',
  description: 'Upload a replied image or video to catbox.moe and get a direct URL.',
  usage: '.url (reply to an image or video)',
  cooldown: 10,

  async execute(sock, jid, sender, args, m, { reply }) {
    try {

      // ── 1. Resolve the quoted / replied message ───────────────────────────
      const contextInfo =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo       ||
        m.message?.videoMessage?.contextInfo;

      const quotedMsg = contextInfo?.quotedMessage;

      if (!quotedMsg) {
        return reply('❌ Please *reply to an image or video* with `.url` to upload it.');
      }

      // ── 2. Determine media type and build a fake message object ───────────
      let mediaMessage = null;
      let mediaType    = null;
      let extension    = 'bin';

      if (quotedMsg.imageMessage) {
        mediaMessage = { message: quotedMsg, key: { remoteJid: jid, id: contextInfo.stanzaId, participant: contextInfo.participant || sender } };
        mediaType    = 'image';
        extension    = 'jpg';
      } else if (quotedMsg.videoMessage) {
        mediaMessage = { message: quotedMsg, key: { remoteJid: jid, id: contextInfo.stanzaId, participant: contextInfo.participant || sender } };
        mediaType    = 'video';
        extension    = 'mp4';
      } else if (quotedMsg.documentMessage) {
        // Also support documents (e.g. a video sent as a file)
        mediaMessage = { message: quotedMsg, key: { remoteJid: jid, id: contextInfo.stanzaId, participant: contextInfo.participant || sender } };
        mediaType    = 'document';
        const mime   = quotedMsg.documentMessage?.mimetype || '';
        if (mime.startsWith('image/')) extension = mime.split('/')[1] || 'jpg';
        else if (mime.startsWith('video/')) extension = mime.split('/')[1] || 'mp4';
        else extension = quotedMsg.documentMessage?.fileName?.split('.').pop() || 'bin';
      } else {
        return reply('❌ The replied message must be an *image* or *video*.');
      }

      await reply(`⏳ Uploading ${mediaType} to catbox.moe...`);

      // ── 3. Download the media buffer ──────────────────────────────────────
      const buffer = await downloadMediaMessage(
        mediaMessage,
        'buffer',
        {},
        {
          logger: require('pino')({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage
        }
      );

      if (!buffer || !buffer.length) {
        return reply('❌ Failed to download the media. It may have expired.');
      }

      // ── 4. Upload to catbox.moe ───────────────────────────────────────────
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('userhash', '');                          // anonymous upload
      form.append('fileToUpload', buffer, {
        filename:    `upload.${extension}`,
        contentType: mediaType === 'image' ? `image/${extension}` : `video/${extension}`
      });

      const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength:    Infinity
      });

      const uploadedUrl = (response.data || '').trim();

      if (!uploadedUrl.startsWith('https://')) {
        console.error('Catbox response:', response.data);
        return reply('❌ Upload failed. Catbox.moe returned an unexpected response.');
      }

      // ── 5. Reply with the URL ─────────────────────────────────────────────
      const emoji = mediaType === 'image' ? '🖼️' : '🎬';
      return reply(
`${emoji} *Upload successful!*

🔗 *URL:* ${uploadedUrl}

_Hosted on catbox.moe — direct link, no expiry._`
      );

    } catch (err) {
      console.error('url command error:', err);
      reply('❌ An error occurred while uploading. Please try again.');
    }
  }
});
