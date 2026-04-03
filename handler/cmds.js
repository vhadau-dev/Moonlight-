const fs = require('fs');
const path = require('path');
const config = require('../config');

// ---------------- STORAGE ----------------
const commands = new Map();
const aliases = new Map();

// ✅ COOLDOWN STORAGE
const cooldowns = new Map();

// ---------------- REGISTER FUNCTION ----------------
function moon(cmd) {
  try {
    if (!cmd || !cmd.name) return;

    cmd.name = cmd.name.toLowerCase();

    // ✅ ENFORCE CATEGORY
    if (!cmd.category) {
      console.warn(`⚠️ Command [${cmd.name}] has no category! Defaulting to 'general'.`);
      cmd.category = 'general';
    }

    // Save main command
    commands.set(cmd.name, cmd);

    // Save aliases
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
      for (const alias of cmd.aliases) {
        aliases.set(alias.toLowerCase(), cmd);
      }
    }

  } catch (err) {
    console.error('❌ Error registering command:', err);
  }
}

// 🌍 MAKE GLOBAL (VERY IMPORTANT)
global.moon = moon;

// ---------------- LOAD COMMANDS ----------------
function loadCommands(dir = path.join(__dirname, '../commands')) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      loadCommands(fullPath);
    } else if (file.endsWith('.js')) {
      try {
        // ✅ Use require for command registration
        require(fullPath);
        // console.log(`✅ Loaded: ${file}`);
      } catch (err) {
        console.error(`❌ Failed to load ${file}:`, err);
      }
    }
  }
}

// Load all commands
loadCommands();

// ---------------- GAMBLING LOCK ----------------
function isAllowedGroup(jid) {
  if (!jid.endsWith('@g.us')) return true;

  const allowed = config.ECONOMY_GROUPS || [];
  return allowed.includes(jid);
}

// ---------------- WRAP EXECUTE ----------------
for (const cmd of commands.values()) {
  const originalExecute = cmd.execute;

  cmd.execute = async function (sock, jid, sender, args, m, context) {
    const startTime = Date.now();

    try {
      // 🔒 LOCK GAMBLING CMDS
      if (cmd.category === 'gambling') {
        if (!isAllowedGroup(jid)) {
          return context.reply(
`❌ Sorry this command is locked you can only use it on the following groups 

*𝚳𝚯𝚯𝚴𝐋𝚰𝐆𝚮𝚻 casino ( l )*
https://chat.whatsapp.com/KAG8xDAJmYODIZPWEcntCX

*𝚳𝚯𝚯𝚴𝐋𝚰𝐆𝚮𝚻 casino ( ll)*
https://chat.whatsapp.com/KAG8xDAJmYODIZPWEcntCX`
          );
        }
      }

      // ⏳ GLOBAL COOLDOWN SYSTEM
      const cooldownTime = cmd.cooldown || 3; // Default 3 seconds
      const cooldownKey = `${sender}_${cmd.name}`;
      const now = Date.now();

      if (cooldowns.has(cooldownKey)) {
        const expirationTime = cooldowns.get(cooldownKey);
        if (now < expirationTime) {
          const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
          return context.reply(`⏳ Please wait *${timeLeft}s* before using \`${cmd.name}\` again.`);
        }
      }

      // Set new cooldown
      cooldowns.set(cooldownKey, now + (cooldownTime * 1000));
      // Cleanup cooldown entry after it expires
      setTimeout(() => cooldowns.delete(cooldownKey), cooldownTime * 1000);

      // ▶️ RUN COMMAND
      const result = await originalExecute(sock, jid, sender, args, m, context);

      // 📊 PERFORMANCE MONITORING REMOVED

      return result;

    } catch (err) {
      console.error(`❌ Error in command ${cmd.name}:`, err);
      return context.reply('❌ Command crashed.');
    }
  };
}

// ---------------- EXPORT ----------------
module.exports = {
  commands,
  aliases
};
