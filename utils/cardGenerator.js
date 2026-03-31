const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

/**
 * Generates a premium, highly stylized anime card image.
 * Matches the "Card Auction" style with gradients, bold typography, and a modern layout.
 * @param {Object} cardData - { name, tier, atk, def, image, cardId }
 * @returns {Promise<Buffer>} - The generated image buffer.
 */
async function generateCardImage(cardData) {
    const width = 600;
    const height = 900;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- 1. Background Layer ---
    // Deep dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // --- 2. Character Image Layer ---
    try {
        const charImage = await loadImage(cardData.image);
        
        // Calculate dimensions to fill the card while maintaining aspect ratio
        const imgAspect = charImage.width / charImage.height;
        const canvasAspect = width / height;
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (imgAspect > canvasAspect) {
            // Image is wider than canvas
            drawHeight = height;
            drawWidth = height * imgAspect;
            offsetX = (width - drawWidth) / 2;
        } else {
            // Image is taller than canvas
            drawWidth = width;
            drawHeight = width / imgAspect;
            offsetY = (height - drawHeight) / 2;
        }

        // Draw character image
        ctx.save();
        ctx.drawImage(charImage, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();
    } catch (err) {
        console.error("Failed to load character image for card:", err);
        // Fallback pattern if image fails
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
    }

    // --- 3. Aesthetic Overlays ---
    
    // Bottom Gradient Overlay (for text readability)
    const bottomGradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
    bottomGradient.addColorStop(0, 'rgba(0,0,0,0)');
    bottomGradient.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    bottomGradient.addColorStop(0.8, 'rgba(0,0,0,0.9)');
    bottomGradient.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, height * 0.4, width, height * 0.6);

    // Top Header Gradient (for subtle depth)
    const topGradient = ctx.createLinearGradient(0, 0, 0, 150);
    topGradient.addColorStop(0, 'rgba(0,0,0,0.8)');
    topGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, width, 150);

    // --- 4. Frame & Borders ---
    // Outer Thin Golden Border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    // --- 5. Content & Typography ---
    ctx.shadowBlur = 0; // Reset shadow

    // Tier Badge (Top Left)
    const tierColors = {
        "1": "#cd7f32", // Bronze
        "2": "#c0c0c0", // Silver
        "3": "#ffd700", // Gold
        "4": "#e5e4e2", // Platinum
        "5": "#ff00ff", // Diamond/Epic
        "6": "#ff4500"  // Legendary (Red/Orange)
    };
    const tierColor = tierColors[cardData.tier] || "#ffffff";

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.moveTo(30, 30);
    ctx.lineTo(120, 30);
    ctx.lineTo(100, 80);
    ctx.lineTo(30, 80);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = tierColor;
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`T${cardData.tier}`, 70, 65);

    // ID Tag (Top Right)
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`#${cardData.cardId}`, width - 40, 55);

    // Character Name (Large & Bold)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    // Add subtle shadow to name
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 15;
    ctx.fillText(cardData.name.toUpperCase(), 40, height - 160);
    ctx.shadowBlur = 0; // Reset

    // Stats Row
    const statBoxWidth = 250;
    const statBoxHeight = 60;
    
    // ATK Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(40, height - 120, statBoxWidth, statBoxHeight);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, height - 120, statBoxWidth, statBoxHeight);

    ctx.font = '22px Arial';
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('⚔️ ATK', 55, height - 82);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(cardData.atk.toLocaleString(), 40 + statBoxWidth - 15, height - 82);

    // DEF Box
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(width - 40 - statBoxWidth, height - 120, statBoxWidth, statBoxHeight);
    ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(width - 40 - statBoxWidth, height - 120, statBoxWidth, statBoxHeight);

    ctx.font = '22px Arial';
    ctx.fillStyle = '#4da6ff';
    ctx.fillText('🛡️ DEF', width - 40 - statBoxWidth + 15, height - 82);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(cardData.def.toLocaleString(), width - 55, height - 82);

    // Footer Attribution
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '14px Arial';
    ctx.fillText('🌙 MOONLIGHT HAVEN COLLECTIBLES', width / 2, height - 30);

    return canvas.toBuffer();
}

module.exports = { generateCardImage };
