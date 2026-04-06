const User = require('../../models/User');

moon({
  name: "password",
  category: "owner",
  description: "Claim the bot as the True Owner using a password.",
  usage: ".password <password>",
  async execute(sock, jid, sender, args, m, { reply, pushName }) {
    try {
      const password = args[0];
      if (!password) return reply("❌ Please provide the password.");

      // The password is hidden here and not stored in config.js
      const correctPassword = "mudaumudau.bots";

      if (password !== correctPassword) {
        return reply("❌ Incorrect password. Access denied.");
      }

      const senderNumber = sender.split('@')[0];
      let user = await User.findOne({ userId: senderNumber });

      if (!user) {
        user = await User.create({
          userId: senderNumber,
          whatsappNumber: sender,
          username: pushName || 'Owner',
          role: 'True Owner',
          isTrueOwner: true
        });
      } else {
        user.role = 'True Owner';
        user.isTrueOwner = true;
        await user.save();
      }

      return reply(`✅ Authentication successful! You are now recognized as the *True Owner* of ${sock.user.name || 'the bot'}. You cannot be demoted.`);

    } catch (err) {
      console.error("password error:", err);
      reply("❌ An error occurred during authentication.");
    }
  }
});
