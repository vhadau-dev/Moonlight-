const User = require('../models/User');
const config = require('../config');

// ✅ In-memory cache for users
const userCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

/**
 * Finds a user by WhatsApp ID or creates them if they don't exist
 * @param {string} whatsappNumber - the WhatsApp sender ID (e.g. 123@s.whatsapp.net)
 * @param {string} username - optional username
 * @returns {Promise<User>}
 */
async function findOrCreateWhatsApp(whatsappNumber, username = 'Unknown') {
  // ✅ Check cache first
  if (userCache.has(whatsappNumber)) {
    return userCache.get(whatsappNumber);
  }

  const senderNumber = whatsappNumber.split('@')[0];
  
  // Try finding by whatsappNumber or userId (senderNumber)
  let user = await User.findOne({ 
    $or: [
      { whatsappNumber }, 
      { userId: senderNumber }
    ] 
  });

  if (!user) {
    user = await User.create({
      whatsappNumber,
      userId: senderNumber,
      username
    });
  } else {
    // Ensure both fields are set for older records
    if (!user.whatsappNumber) user.whatsappNumber = whatsappNumber;
    if (!user.userId) user.userId = senderNumber;
    if (user.isModified()) await user.save();
  }

  // ✅ Store in cache
  userCache.set(whatsappNumber, user);

  // ✅ Auto-delete after TTL
  setTimeout(() => {
    userCache.delete(whatsappNumber);
  }, CACHE_TTL);

  return user;
}

/**
 * Permission Helpers
 */
async function isTrueOwner(sender) {
  const user = await findOrCreateWhatsApp(sender);
  return user.isTrueOwner === true || user.role === 'True Owner';
}

async function isOwner(sender) {
  const user = await findOrCreateWhatsApp(sender);
  return user.isTrueOwner || user.role === 'Owner' || user.role === 'True Owner';
}

async function isMod(sender) {
  const user = await findOrCreateWhatsApp(sender);
  return user.isTrueOwner || user.role === 'Owner' || user.role === 'True Owner' || user.role === 'Mod';
}

async function isCDC(sender) {
  const user = await findOrCreateWhatsApp(sender);
  return user.isTrueOwner || user.role === 'Owner' || user.role === 'True Owner' || user.isCDC === true;
}

module.exports = { 
  findOrCreateWhatsApp, 
  userCache,
  isTrueOwner,
  isOwner,
  isMod,
  isCDC
};
