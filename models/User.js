const mongoose = require('mongoose');

// ---------------- CARD SUB-SCHEMA ----------------
const cardSchema = new mongoose.Schema({
  cardId: String,
  name: String,
  description: String,
  tier: String,
  price: Number,
  image: String,
  obtainedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  discordId: { type: String, unique: true, sparse: true },
  whatsappNumber: { type: String, unique: true, sparse: true },

  username: { type: String, default: 'Unknown' },

  balance: { type: Number, default: 50000 },
  bank: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalLost: { type: Number, default: 0 },
  stars: { type: Number, default: 0 },

  // ---------------- PROFILE SYSTEM ----------------
  profileImage: { type: String, default: null },
  backgroundImage: { type: String, default: null },
  videoBackground: { type: String, default: null },
  age: { type: Number, default: 0 },
  bio: { type: String, default: '.' },
  role: { type: String, default: 'User' },

  // ---------------- BAN SYSTEM ----------------
  banned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  bannedAt: { type: Date, default: null },

  // ---------------- INVENTORY ----------------
  inventory: [
    {
      id: { type: String },
      name: { type: String },
      boughtAt: { type: Date, default: Date.now }
    }
  ],

  // ---------------- 🃏 CARD SYSTEM ----------------
  cards: [cardSchema],
  cardLimit: { type: Number, default: 100 },

  // ---------------- PET ----------------
  pet: {
    name: { type: String, default: null },
    type: { type: String, default: null },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    hunger: { type: Number, default: 100 },
    health: { type: Number, default: 100 },
    happiness: { type: Number, default: 100 },
    lastHunt: { type: Date, default: null },
    lastTrain: { type: Date, default: null },
    lastInteraction: { type: Date, default: null }
  },

  // ---------------- COOLDOWNS ----------------
  lastWork: { type: Date, default: null },
  lastDaily: { type: Date, default: null },
  lastRob: { type: Date, default: null },

  // ---------------- LINKING ----------------
  linkCode: { type: String, default: null },
  linkCodeExpiry: { type: Date, default: null },

  // =========================
  // 🆕 LOTTERY SUPPORT (ADDED)
  // =========================

  lotteryEntries: { type: Number, default: 0 }, // total entries across rounds

  currentLotteryEntries: { type: Number, default: 0 }, // entries in current round (limit 3)

  // ---------------- MESSAGE COUNT ----------------
  messageCount: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
