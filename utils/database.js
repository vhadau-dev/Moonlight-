const User = require('../models/User');

/**
 * Get or create a user by WhatsApp number or Discord ID.
 * @param {string} id - The ID of the user.
 * @param {string} platform - The platform ('whatsapp' or 'discord').
 * @returns {Promise<Object>} - The user document.
 */
async function getOrCreateUser(id, platform = 'whatsapp') {
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
            username: 'Unknown'
        });
    }
    return user;
}

/**
 * Find a user by their temporary link code.
 * @param {string} code - The 6-digit link code.
 * @returns {Promise<Object|null>} - The user document or null.
 */
async function findUserByLinkCode(code) {
    return await User.findOne({
        linkCode: code,
        linkCodeExpiry: { $gt: new Date() }
    });
}

/**
 * Link a WhatsApp account to a Discord ID.
 * @param {string} whatsappNumber - The WhatsApp number.
 * @param {string} discordId - The Discord ID.
 * @returns {Promise<Object>} - The updated user document.
 */
async function linkAccounts(whatsappNumber, discordId) {
    const user = await getOrCreateUser(whatsappNumber, 'whatsapp');
    user.discordId = discordId;
    user.linkCode = null;
    user.linkCodeExpiry = null;
    return await user.save();
}

/**
 * Generate a random 6-digit link code.
 * @returns {string} - The generated code.
 */
function generateLinkCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    getOrCreateUser,
    findUserByLinkCode,
    linkAccounts,
    generateLinkCode,
    User
};
