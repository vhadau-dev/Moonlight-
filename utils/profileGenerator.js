const { createCanvas, loadImage } = require('canvas');
const path = require('path');

/**
 * Generates a high-quality profile image for the user.
 * @param {Object} userData - { username, role, pfp, background }
 * @returns {Promise<Buffer>} - The generated image buffer.
 */
async function generateProfileImage(userData) {
    const width = 800;
    const height = 450;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const DEFAULT_BG = 'https://files.catbox.moe/d04wzu.jpg';

    // 1. Draw Background
    try {
        const bgImg = await loadImage(userData.background || DEFAULT_BG);
        ctx.drawImage(bgImg, 0, 0, width, height);
    } catch (err) {
        console.error("Failed to load background image:", err);
        // Fallback to dark gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0f0c29');
        gradient.addColorStop(0.5, '#302b63');
        gradient.addColorStop(1, '#24243e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Add Overlay for better text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // 3. Draw Profile Picture (Circle)
    const pfpSize = 150;
    const pfpX = 50;
    const pfpY = height / 2 - pfpSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    try {
        const pfpImg = await loadImage(userData.pfp || 'https://i.imgur.com/6VBx3io.png');
        ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);
    } catch (err) {
        ctx.fillStyle = '#555';
        ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);
    }
    ctx.restore();

    // White border for PFP
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Draw Text Info
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;

    // Username
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(userData.username.toUpperCase(), pfpX + pfpSize + 40, height / 2);

    // Role Badge
    const roleY = height / 2 + 60;
    const roleX = pfpX + pfpSize + 40;
    
    ctx.font = 'italic 30px Arial';
    ctx.fillStyle = '#ffd700'; // Gold color for role
    ctx.fillText(`𝚳𝚯𝚯𝚴𝐋𝚰𝐆𝚮𝚻 @${userData.role}`, roleX, roleY);

    return canvas.toBuffer();
}

module.exports = { generateProfileImage };
