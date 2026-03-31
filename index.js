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
const { startCardSystem } = require('./handler/CardsSystem');
const { spawnCard } = require('./handler/CardsSystem');

const {
  BOT_NAME,
  PREFIX,
  SESSION_FOLDER
} = require('./config');

// ✅ GROUP SETTINGS (UPDATED)
const { getGroup, handleGroupEvents } = require('./models/GroupSettings');

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
            await sock.sendMessage(restartData.jid, { text: "✅ *Restarting done!* The bot is back online and ready." }, { quoted: restartData.m });
            fs.unlinkSync('./restart_info.json');
          } catch (err) {
            console.error('Failed to send restart notification:', err);
          }
        }

        // ✅ START CARD SYSTEM
        startCardSystem(sock);

        // ✅ FORCE SPAWN ON START
        const groupId = "120363400061711508@g.us";
        await spawnCard(sock, groupId, true);
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

          const body =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            '';

          let prefix = PREFIX;
          let isCmd = body.startsWith(PREFIX);

          if (!isCmd && body.length > 0) {
            // Check if the body matches any command name or alias without prefix
            const possibleCmd = body.trim().split(/ +/)[0].toLowerCase();
            if (commands.has(possibleCmd) || aliases.has(possibleCmd)) {
              isCmd = true;
              prefix = '';
            }
          }

          if (!isCmd) continue;

          const args = body.slice(prefix.length).trim().split(/ +/);
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