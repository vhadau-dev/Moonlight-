const Lottery = require('../../models/Lottery');
const User = require('../../models/User');

moon({
  name: "lottery",
  category: "economy",
  description: "Join the lottery to win big prizes!",
  usage: ".lottery",

  async execute(sock, jid, sender, args, m, { reply, findOrCreateWhatsApp, pushName }) {
    try {
      const senderNumber = sender.split('@')[0];
      const user = await findOrCreateWhatsApp(sender, pushName);

      // =========================
      // 🎯 REMOVED SUBCOMMAND FINE
      // =========================
      if (args[0]?.toLowerCase() === "draw") {
        const fineAmount = 100000;
        user.balance = Math.max(0, (user.balance || 0) - fineAmount);
        await user.save();
        
        return reply(`❌ Sorry baka, the \`.lottery draw\` command has been removed. You have been fined *${fineAmount.toLocaleString()}* coins for trying to use it!`);
      }

      let lottery = await Lottery.findOne({ active: true });

      if (!lottery) {
        lottery = new Lottery({
          active: true,
          participants: []
        });
      }

      const userId = sender;

      // =========================
      // 🎟️ JOIN LOGIC
      // =========================
      const existing = lottery.participants.find(p => p.userId === userId);

      if (existing) {
        if (existing.entries >= 3) {
          return reply("❌ You can only join this lottery up to 3 times.");
        }
        existing.entries += 1;
      } else {
        lottery.participants.push({
          userId,
          entries: 1
        });
      }

      await lottery.save();

      const count = lottery.participants.length;

      await reply(`🎟️ Joined lottery!\n👥 Players: ${count}/5`);

      // =========================
      // 🎯 AUTO DRAW AT 5
      // =========================
      if (count >= 5) {
        return await drawLottery();
      }

      // =========================
      // 🎯 DRAW FUNCTION
      // =========================
      async function drawLottery() {
        const valid = lottery.participants.filter(p => p && p.userId);

        if (valid.length < 2) {
          // Reset if not enough valid participants
          lottery.participants = [];
          await lottery.save();
          return reply("❌ Not enough valid participants to draw. Lottery reset.");
        }

        // Shuffle
        const shuffled = valid.sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, 2);

        const firstPrize = 500000;
        const secondPrize = 250000;

        for (let i = 0; i < winners.length; i++) {
          const w = winners[i];
          const winnerUser = await User.findOne({ userId: w.userId.split('@')[0] });

          if (winnerUser) {
            const prize = i === 0 ? firstPrize : secondPrize;
            winnerUser.balance = (winnerUser.balance || 0) + prize;
            await winnerUser.save();
          }
        }

        // Announce with mentions
        const winner1 = winners[0].userId;
        const winner2 = winners[1].userId;

        await sock.sendMessage(jid, {
          text: `🏆 *Lottery Results* 🏆\n\n🥇 1st Winner: @${winner1.split('@')[0]} → *${firstPrize.toLocaleString()}* coins\n🥈 2nd Winner: @${winner2.split('@')[0]} → *${secondPrize.toLocaleString()}* coins\n\n🎉 Congratulations to the winners!`,
          mentions: [winner1, winner2]
        }, { quoted: m });

        // Reset lottery
        lottery.participants = [];
        await lottery.save();
      }

    } catch (err) {
      console.error("lottery error:", err);
      reply("❌ Lottery command failed.");
    }
  }
});
