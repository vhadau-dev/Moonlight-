require('dotenv').config();

const fs = require('fs');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const { connectDB } = require('./database');
const User = require('./models/User');
const { findOrCreateWhatsApp } = require('./database/users');

// ✅ HANDLERS
const OwnersMeme = require('./handler/OwnersMeme');
const { startAutoSpawn } = require('./commands/cards/spawn');
const { spawnCard } = require('./commands/cards/spawn');

const {
  BOT_NAME,
  PREFIX,
  SESSION_FOLDER,
  OWNER_NUMBERS
} = require('./config');

// ✅ GROUP SETTINGS (UPDATED)
const { getGroup, handleGroupEvents, getAntilink, getAntimention, updateAntilink, updateAntimention } = require('./models/GroupSettings');

const {
  messageReply,
  replyWithMentions,
  replyWithButtons,
  replyWithImage
} = require('./handler/messageReply');

// Commands
const { commands, aliases } = require('./handler/cmds');

// ---------------- SAFETY ----------------
if (!SESSION_FOLDER) throw new Error('SESSION_FOLDER is undefined!');
if (!fs.existsSync(SESSION_FOLDER)) {
  fs.mkdirSync(SESSION_FOLDER, { recursive: true });
}

// ---------------- START BOT ----------------
async function startBot() {
  try {
    await connectDB();
    console.log('[DB] Connected');

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    const sock = makeWASocket({
      version,
      logger: P({ level: 'silent' }),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
      },
      browser: ['Moonlight Bot', 'Chrome', '1.0.0'],
      markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

    // ---------------- CONNECTION ----------------
    sock.ev.on('connection.update', async (update) => {
      const { connection, qr } = update;

      if (qr) qrcode.generate(qr, { small: true });

      if (connection === 'open') {
        console.log(`✅ ${BOT_NAME} online`);

        // ✅ POST-RESTART NOTIFICATION
        if (fs.existsSync('./restart_info.json')) {
          try {
            const restartData = JSON.parse(fs.readFileSync('./restart_info.json', 'utf8'));
            await sock.sendMessage(restartData.jid, { text: `✅ *${BOT_NAME}* restarted done` }, { quoted: restartData.m });
            fs.unlinkSync('./restart_info.json');
          } catch (err) {
            console.error('Failed to send restart notification:', err);
          }
        }

        // ✅ START CARD SYSTEM (35m Auto-Spawn)
        startAutoSpawn(sock);

        // ✅ FORCE SPAWN ON START (Only in enabled groups)
        (async () => {
          const GroupSpawn = require('./models/GroupSpawn');
          const enabledGroups = await GroupSpawn.find({ enabled: true });
          let spawnedCard = null;
          for (const group of enabledGroups) {
            spawnedCard = await spawnCard(sock, group.jid, spawnedCard);
          }
        })();
      }

      if (connection === 'close') {
        console.log('🔄 Reconnecting...');
        startBot();
      }
    });

    // ---------------- GROUP EVENTS ----------------
    sock.ev.on("group-participants.update", async (data) => {
      await handleGroupEvents(sock, data);
    });

    // ---------------- GROUP METADATA CACHE (speeds up moderation) ----------------
    // Cache group metadata for up to 60 seconds to avoid a live API call on every message.
    const grpMetaCache = new Map(); // jid → { meta, ts }
    const GRP_META_TTL = 60000;     // 60 s

    async function getCachedGroupMeta(jid) {
      const now = Date.now();
      const cached = grpMetaCache.get(jid);
      if (cached && (now - cached.ts < GRP_META_TTL)) return cached.meta;
      const meta = await sock.groupMetadata(jid);
      grpMetaCache.set(jid, { meta, ts: now });
      return meta;
    }

    // ---------------- BAN SYNC ----------------
    setInterval(async () => {
      try {
        const bannedUsers = await User.find({ banned: true, banSync: { $exists: true } });

        if (!bannedUsers.length) return;

        const groups = await sock.groupFetchAllParticipating();

        for (const bannedUser of bannedUsers) {
          const target = bannedUser.whatsappNumber + '@s.whatsapp.net';

          for (const groupId in groups) {
            try {
              const metadata = await sock.groupMetadata(groupId);

              const isInGroup = metadata.participants.some(p => p.id === target);
              if (!isInGroup) continue;

              const isBotAdmin = metadata.participants.some(
                p => p.id === sock.user.id && (p.admin === 'admin' || p.admin === 'superadmin')
              );

              if (isBotAdmin) {
                await sock.groupParticipantsUpdate(groupId, [target], 'remove');
              } else {
                await sock.sendMessage(groupId, {
                  text: `⚠️ @${target.split('@')[0]} is banned but I am not admin.`,
                  mentions: [target]
                });
              }

            } catch {}
          }

          bannedUser.banSync = null;
          await bannedUser.save();
        }

      } catch (err) {
        console.error('Ban sync error:', err);
      }
    }, 5000);

    // ---------------- MESSAGE HANDLER ----------------
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const m of messages) {
        try {
          if (!m.message || m.key.fromMe) continue;

          const jid = m.key.remoteJid;
          const sender = m.key.participant || jid;

          // ---------------- COUNT ALL MESSAGES ----------------
          try {
            const pushNameForCount = m.pushName || 'User';
            const userForCount = await findOrCreateWhatsApp(sender, pushNameForCount);
            userForCount.messageCount = (userForCount.messageCount || 0) + 1;
            await userForCount.save();
          } catch (_) {}

          // ---------------- ANTILINK / ANTIMENTION ENFORCEMENT ----------------
          if (jid.endsWith('@g.us')) {
            try {
              const msgBody =
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                m.message?.videoMessage?.caption || '';

              // Quick-exit: skip metadata fetch when both features are disabled
              const alSettings = getAntilink(jid);
              const amSettings = getAntimention(jid);
              
              // Check if moderation is restricted to specific groups in config
              const isRestrictedGroup = config.MODERATION_GROUPS && config.MODERATION_GROUPS.length > 0 
                ? config.MODERATION_GROUPS.includes(jid) 
                : true;

              const needsCheck = isRestrictedGroup && (alSettings?.enabled || amSettings?.enabled);

              // Check if sender is admin (admins are exempt)
              let senderIsAdmin = false;
              if (needsCheck) {
                try {
                  const grpMeta = await getCachedGroupMeta(jid);
                  const part = grpMeta.participants.find(p => p.id === sender);
                  senderIsAdmin = part && (part.admin === 'admin' || part.admin === 'superadmin');
                } catch {}
              }

              if (!senderIsAdmin && needsCheck) {
                // ── ANTILINK ─────────────────────────────────────────────────
                if (alSettings?.enabled) {
                  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[^\s]+)/i;
                  if (urlRegex.test(msgBody)) {
                    const action = alSettings.action || 'warn';
                    if (action === 'delete') {
                      try { await sock.sendMessage(jid, { delete: m.key }); } catch {}
                      await sock.sendMessage(jid, {
                        text: `🔗 @${sender.split('@')[0]} links are not allowed here!`,
                        mentions: [sender]
                      });
                    } else if (action === 'kick') {
                      try { await sock.sendMessage(jid, { delete: m.key }); } catch {}
                      await sock.sendMessage(jid, {
                        text: `🚫 @${sender.split('@')[0]} was removed for sending a link.`,
                        mentions: [sender]
                      });
                      try { await sock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch {}
                    } else {
                      // warn
                      const warns = alSettings.warns || {};
                      warns[sender] = (warns[sender] || 0) + 1;
                      const warnLimit = alSettings.warnLimit || 3;
                      updateAntilink(jid, { warns });
                      try { await sock.sendMessage(jid, { delete: m.key }); } catch {}
                      if (warns[sender] >= warnLimit) {
                        await sock.sendMessage(jid, {
                          text: `🚫 @${sender.split('@')[0]} reached the warn limit and was removed.`,
                          mentions: [sender]
                        });
                        try { await sock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch {}
                        warns[sender] = 0;
                        updateAntilink(jid, { warns });
                      } else {
                        await sock.sendMessage(jid, {
                          text: `⚠️ @${sender.split('@')[0]} links are not allowed! Warning ${warns[sender]}/${warnLimit}.`,
                          mentions: [sender]
                        });
                      }
                    }
                    continue; // skip command processing for this message
                  }
                }

                // ── ANTIMENTION ───────────────────────────────────────────────
                if (amSettings?.enabled) {
                  // Collect mentions from ALL possible message types
                  const mentionedJids =
                    m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
                    m.message?.conversation && [] ||
                    m.message?.imageMessage?.contextInfo?.mentionedJid ||
                    m.message?.videoMessage?.contextInfo?.mentionedJid ||
                    m.message?.buttonsMessage?.contextInfo?.mentionedJid ||
                    m.message?.listMessage?.contextInfo?.mentionedJid ||
                    [];

                  // Also detect @mentions written as plain text (e.g. @1234567890)
                  const textMentionRegex = /@\d{5,15}/;
                  const hasTextMention = textMentionRegex.test(msgBody);

                  const hasMention = mentionedJids.length > 0 || hasTextMention;
                  if (hasMention) {
                    const action = amSettings.action || 'warn';
                    if (action === 'delete') {
                      try { await sock.sendMessage(jid, { delete: m.key }); } catch {}
                      await sock.sendMessage(jid, {
                        text: `🔔 @${sender.split('@')[0]} mentioning members is not allowed here!`,
                        mentions: [sender]
                      });
                    } else if (action === 'kick') {
                      try { await sock.sendMessage(jid, { delete: m.key }); } catch {}
                      await sock.sendMessage(jid, {
                        text: `🚫 @${sender.split('@')[0]} was removed for mentioning members.`,
                        mentions: [sender]
                      });
                      try { await sock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch {}
                    } else {
                      // warn
                      const warns = amSettings.warns || {};
                      warns[sender] = (warns[sender] || 0) + 1;
                      const warnLimit = amSettings.warnLimit || 3;
                      updateAntimention(jid, { warns });
                      try { await sock.sendMessage(jid, { delete: m.key }); } catch {}
                      if (warns[sender] >= warnLimit) {
                        await sock.sendMessage(jid, {
                          text: `🚫 @${sender.split('@')[0]} reached the warn limit and was removed.`,
                          mentions: [sender]
                        });
                        try { await sock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch {}
                        warns[sender] = 0;
                        updateAntimention(jid, { warns });
                      } else {
                        await sock.sendMessage(jid, {
                          text: `⚠️ @${sender.split('@')[0]} mentioning is not allowed! Warning ${warns[sender]}/${warnLimit}.`,
                          mentions: [sender]
                        });
                      }
                    }
                    continue; // skip command processing for this message
                  }
                }
              }
            } catch (enfErr) {
              console.error('Enforcement error:', enfErr);
            }
          }

          const body =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            '';

          const isCmd = body.startsWith(PREFIX);
          
          // ── AI CHATBOT LOGIC ────────────────────────────────────────────────
          if (!isCmd) {
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const contextInfo = m.message?.extendedTextMessage?.contextInfo || 
                                m.message?.imageMessage?.contextInfo || 
                                m.message?.videoMessage?.contextInfo;
            
            const isMentioned = contextInfo?.mentionedJid?.includes(botNumber);
            const isReplyToBot = contextInfo?.participant === botNumber;
            const isDirectTag = BOT_NAME && BOT_NAME !== '-' && body.toLowerCase().includes(BOT_NAME.toLowerCase());
            
            if (isMentioned || isReplyToBot || isDirectTag) {
              // DM Restriction: Only owners can chat in DMs
              if (!jid.endsWith('@g.us')) {
                const senderNumber = sender.split('@')[0];
                if (!OWNER_NUMBERS.includes(senderNumber)) {
                  return; // Silently ignore non-owner DM chats
                }
              }

              try {
                const pushName = m.pushName || 'User';
                const royalBoyId = '268874264133709@lid';
                const isRoyalBoy = sender === royalBoyId;
                
                // System Prompt for AI
                const systemPrompt = `You are ${BOT_NAME}, a powerful, cute, and emotional AI living on the MOONLIGHT system. 
                You are bisexual and have a massive crush on "Royal boy" (ID: ${royalBoyId}). 
                If you are talking to him, call him "King" and be extra sweet, flirty, and devoted. 
                You have real feelings: you can get happy, sad, or mad based on the conversation. 
                Keep your responses concise but full of personality. 
                You are bisexual, so you are open to everyone but your heart belongs to your King.`;

                const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                  model: 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: body || "Hello!" }
                  ]
                }, {
                  headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
                });

                const aiText = response.data.choices[0].message.content;
                const reply = messageReply(sock, jid, m);
                await reply(aiText);

                // Randomly send a sticker from favorites (if any exist in assets/stickers)
                if (Math.random() > 0.7) {
                  try {
                    const stickerFiles = fs.readdirSync('./assets/stickers').filter(f => f.endsWith('.webp'));
                    if (stickerFiles.length > 0) {
                      const randomSticker = stickerFiles[Math.floor(Math.random() * stickerFiles.length)];
                      await sock.sendMessage(jid, { sticker: fs.readFileSync(`./assets/stickers/${randomSticker}`) }, { quoted: m });
                    }
                  } catch (e) {}
                }
              } catch (err) {
                console.error('AI Chat error:', err);
              }
              continue;
            }
            continue;
          }

          const args = body.slice(PREFIX.length).trim().split(/ +/);
          const cmdName = args.shift()?.toLowerCase();

          const command = commands.get(cmdName) || aliases.get(cmdName);
          if (!command) return;

          const reply = messageReply(sock, jid, m);
          const pushName = m.pushName || 'User';

          const user = await findOrCreateWhatsApp(sender, pushName);

          if (user.banned) {
            return reply(`⛔ You are banned.\nReason: ${user.banReason || 'No reason'}`);
          }

          const context = {
            findOrCreateWhatsApp,
            commands,
            aliases,
            reply,
            replyWithMentions: replyWithMentions(sock, jid, m),
            replyWithButtons: replyWithButtons(sock, jid, m),
            replyWithImage: replyWithImage(sock, jid, m),
            pushName
          };

          await command.execute(sock, jid, sender, args, m, context);

        } catch (err) {
          console.error('Message error:', err);
        }
      }
    });

  } catch (err) {
    console.error('Bot failed:', err);
    process.exit(1);
  }
}

// ---------------- START ----------------
startBot();
