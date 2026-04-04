const User = require('../models/User');

// ✅ In-memory cache for users
const userCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

/**
 * Finds a user by WhatsApp ID or Discord ID or creates them if they don't exist.
 * @param {string} id - The ID of the user (WhatsApp number or Discord ID).
 * @param {string} platform - The platform ('whatsapp' or 'discord').
 * @param {string} username - Optional username.
 * @returns {Promise<Object>} - The user document.
 */
async function findOrCreateUser(id, platform = 'whatsapp', username = 'Unknown') {
  const cacheKey = `${platform}:${id}`;
  
  // ✅ Check cache first
  if (userCache.has(cacheKey)) {
    return userCache.get(cacheKey);
  }

  let query = {};
  if (platform === 'whatsapp') {
    query = { whatsappNumber: id };
  } else if (platform === 'discord') {
    query = { discordId: id };
  }

  let user = await User.findOne(query);
  if (!user) {
    user = await User.create({
      [platform === 'whatsapp' ? 'whatsappNumber' : 'discordId']: id,
      username
    });
  }

  // ✅ Store in cache
  userCache.set(cacheKey, user);

  // ✅ Auto-delete after TTL
  setTimeout(() => {
    userCache.delete(cacheKey);
  }, CACHE_TTL);

  return user;
}

/**
 * Legacy wrapper for findOrCreateUser (WhatsApp only).
 */
async function findOrCreateWhatsApp(whatsappNumber, username = 'Unknown') {
  return await findOrCreateUser(whatsappNumber, 'whatsapp', username);
}

module.exports = { findOrCreateUser, findOrCreateWhatsApp, userCache };
