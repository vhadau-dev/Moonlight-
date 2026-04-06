const User = require('../../models/User');

moon({
  name: "set",
  category: "owner",
  description: "Manage user roles (Owner, Mod, CDC).",
  usage: ".set <role> @user | .set del <role> @user",
  async execute(sock, jid, sender, args, m, { reply, pushName }) {
    try {
      const senderNumber = sender.split('@')[0];
      const senderUser = await User.findOne({ userId: senderNumber });

      // Only True Owner can use this command
      if (!senderUser || !senderUser.isTrueOwner) {
        return reply("❌ Only the *True Owner* can manage roles.");
      }

      const sub = args[0]?.toLowerCase();
      if (!sub) return reply("❌ Usage: .set <owner|mod|cdc> @user or .set del <owner|mod|cdc> @user");

      // Handle deletion
      if (sub === "del") {
        const roleToDel = args[1]?.toLowerCase();
        const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.participant;

        if (!roleToDel || !target) {
          return reply("❌ Usage: .set del <owner|mod|cdc> @user");
        }

        const targetNumber = target.split('@')[0];
        const targetUser = await User.findOne({ userId: targetNumber });

        if (!targetUser) return reply("❌ User not found in database.");

        // True Owner cannot be demoted
        if (targetUser.isTrueOwner) {
          return reply("❌ You cannot demote the *True Owner*.");
        }

        if (roleToDel === "owner") {
          targetUser.role = 'User';
        } else if (roleToDel === "mod") {
          targetUser.role = 'User';
        } else if (roleToDel === "cdc") {
          targetUser.isCDC = false;
        } else {
          return reply("❌ Invalid role. Choose: owner, mod, or cdc.");
        }

        await targetUser.save();
        return reply(`✅ Successfully demoted @${targetNumber} from ${roleToDel.toUpperCase()}.`, { mentions: [target] });
      }

      // Handle setting roles
      const roleToSet = sub;
      const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.participant;

      if (!target) return reply(`❌ Usage: .set ${roleToSet} @user`);

      const targetNumber = target.split('@')[0];
      let targetUser = await User.findOne({ userId: targetNumber });

      if (!targetUser) {
        targetUser = await User.create({
          userId: targetNumber,
          whatsappNumber: target,
          username: 'User',
          role: 'User'
        });
      }

      if (roleToSet === "owner") {
        targetUser.role = 'Owner';
      } else if (roleToSet === "mod") {
        targetUser.role = 'Mod';
      } else if (roleToSet === "cdc") {
        targetUser.isCDC = true;
      } else {
        return reply("❌ Invalid role. Choose: owner, mod, or cdc.");
      }

      await targetUser.save();
      return reply(`✅ Successfully promoted @${targetNumber} to ${roleToSet.toUpperCase()}.`, { mentions: [target] });

    } catch (err) {
      console.error("set role error:", err);
      reply("❌ An error occurred while setting the role.");
    }
  }
});
