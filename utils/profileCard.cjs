const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');

const CARD_WIDTH = 934;
const CARD_HEIGHT = 525;
const AVATAR_SIZE = 120;
const AVATAR_X = 50;
const AVATAR_Y = 100;

function hexToRgb(hex) {
    if (typeof hex !== 'string') return { r: 255, g: 107, b: 0 };
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    if (isNaN(num)) return { r: 255, g: 107, b: 0 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function isAllowedURL(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        const host = parsed.hostname.toLowerCase();
        const allowed = ['cdn.discordapp.com', 'media.discordapp.net', 'i.imgur.com', 'imgur.com', 'images-ext-1.discordapp.net', 'images-ext-2.discordapp.net'];
        return allowed.some(d => host === d || host.endsWith('.' + d));
    } catch {
        return false;
    }
}

async function fetchImage(url) {
    if (!isAllowedURL(url)) return null;
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            maxRedirects: 3,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AceBot/1.0)',
                'Accept': 'image/*,*/*'
            }
        });
        return await loadImage(Buffer.from(response.data));
    } catch (e) {
        console.error('fetchImage error for', url, e.message);
        return null;
    }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
}

function wrapText(ctx, text, maxWidth, maxLines) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
            if (lines.length >= maxLines) break;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
    }
    if (lines.length >= maxLines && words.length > 0) {
        const last = lines[maxLines - 1];
        if (ctx.measureText(last).width > maxWidth) {
            lines[maxLines - 1] = truncateText(ctx, last, maxWidth);
        }
    }
    return lines;
}

function drawBadge(ctx, x, y, size, color, symbol) {
    const r = size / 2;
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.font = `bold ${Math.floor(size * 0.55)}px "Arial", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + r, y + r + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

async function drawSeloImage(ctx, x, y, size, url, accentStr) {
    const img = await fetchImage(url);
    if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.strokeStyle = accentStr;
        ctx.lineWidth = 2;
        ctx.stroke();
        return true;
    }
    return false;
}

function getActivityLabel(type) {
    const labels = { 0: 'Jogando', 1: 'Transmitindo', 2: 'Ouvindo', 3: 'Assistindo', 5: 'Competindo' };
    return labels[type] || 'Jogando';
}

function isAllowedActivityURL(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        const host = parsed.hostname.toLowerCase();
        const allowed = [
            'cdn.discordapp.com', 'media.discordapp.net',
            'i.scdn.co', 'mosaic.scdn.co',
            'i.imgur.com', 'imgur.com',
            'images-ext-1.discordapp.net', 'images-ext-2.discordapp.net'
        ];
        return allowed.some(d => host === d || host.endsWith('.' + d));
    } catch {
        return false;
    }
}

async function fetchActivityImage(url) {
    if (!isAllowedActivityURL(url)) return null;
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
            maxRedirects: 2,
            headers: { 'User-Agent': 'AceBot/1.0' }
        });
        return await loadImage(Buffer.from(response.data));
    } catch (e) {
        return null;
    }
}

async function generateProfileCard(options) {
    const {
        username = 'User',
        displayName = null,
        avatarURL = null,
        bannerURL = null,
        profileColor = '#FF6B00',
        points = 0,
        voiceTime = '0h 0m',
        messageCount = 0,
        rank = 'N/A',
        marriageInfo = null,
        selo = null,
        badges = [],
        boosterRole = null,
        activity = null,
        aboutMe = null,
        molduraURL = null,
        bfInfo = null
    } = options;

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');
    const accent = hexToRgb(profileColor);
    const accentStr = `rgb(${accent.r}, ${accent.g}, ${accent.b})`;

    drawRoundedRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 18);
    ctx.clip();

    let bannerLoaded = false;
    if (bannerURL) {
        const bannerImg = await fetchImage(bannerURL);
        if (bannerImg) {
            const scale = Math.max(CARD_WIDTH / bannerImg.width, CARD_HEIGHT / bannerImg.height);
            const sw = bannerImg.width * scale;
            const sh = bannerImg.height * scale;
            ctx.drawImage(bannerImg, (CARD_WIDTH - sw) / 2, (CARD_HEIGHT - sh) / 2, sw, sh);
            bannerLoaded = true;
        }
    }

    if (!bannerLoaded) {
        drawDefaultBackground(ctx, accent);
    }

    ctx.fillStyle = bannerLoaded ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    const glowGrad = ctx.createRadialGradient(
        AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, 30,
        AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, 220
    );
    glowGrad.addColorStop(0, `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.10)`);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.3)`;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 0.5, 0.5, CARD_WIDTH - 1, CARD_HEIGHT - 1, 18);
    ctx.stroke();

    const avatarCenterX = AVATAR_X + AVATAR_SIZE / 2;
    const avatarCenterY = AVATAR_Y + AVATAR_SIZE / 2;
    const avatarRadius = AVATAR_SIZE / 2;

    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = accentStr;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (avatarURL) {
        const avatarImg = await fetchImage(avatarURL);
        if (avatarImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatarImg, AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
            ctx.restore();
        } else {
            drawDefaultAvatar(ctx, avatarCenterX, avatarCenterY, avatarRadius, accent);
        }
    } else {
        drawDefaultAvatar(ctx, avatarCenterX, avatarCenterY, avatarRadius, accent);
    }

    if (molduraURL) {
        const molduraImg = await fetchImage(molduraURL);
        if (molduraImg) {
            const molduraSize = 160;
            const molduraX = avatarCenterX - molduraSize / 2;
            const molduraY = avatarCenterY - molduraSize / 2;
            ctx.drawImage(molduraImg, molduraX, molduraY, molduraSize, molduraSize);
        }
    }

    const textStartX = AVATAR_X + AVATAR_SIZE + 30;
    const nameY = 52;

    const shownName = displayName || username;
    ctx.font = 'bold 30px "Arial", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const maxNameWidth = CARD_WIDTH - textStartX - 200;
    const truncName = truncateText(ctx, shownName, maxNameWidth);
    ctx.fillText(truncName, textStartX, nameY);

    let badgeX = textStartX + ctx.measureText(truncName).width + 12;
    const badgeY = nameY - 18;
    const badgeSize = 22;
    const badgeGap = 6;

    const badgeDefs = {
        'nitro': { color: '#5865F2', symbol: 'N' },
        'booster': { color: '#F47FFF', symbol: 'B' },
        'early_supporter': { color: '#5865F2', symbol: 'E' },
        'active_developer': { color: '#248046', symbol: 'D' },
        'hypesquad_bravery': { color: '#9B59B6', symbol: 'H' },
        'hypesquad_brilliance': { color: '#E74C3C', symbol: 'H' },
        'hypesquad_balance': { color: '#2ECC71', symbol: 'H' },
        'verified_developer': { color: '#5865F2', symbol: 'V' },
        'bug_hunter': { color: '#3BA55D', symbol: 'B' },
        'staff': { color: '#5865F2', symbol: 'S' },
        'moderator': { color: '#5865F2', symbol: 'M' }
    };

    for (const badge of badges) {
        const def = badgeDefs[badge];
        if (def && badgeX + badgeSize < CARD_WIDTH - 20) {
            drawBadge(ctx, badgeX, badgeY, badgeSize, def.color, def.symbol);
            badgeX += badgeSize + badgeGap;
        }
    }

    const seloStr = typeof selo === 'string' ? selo.trim() : '';
    const seloIsUrl = seloStr !== '' && /^https?:\/\//i.test(seloStr);
    if (seloStr !== '') {
        if (badgeX + badgeSize < CARD_WIDTH - 20) {
            if (seloIsUrl) {
                const drawn = await drawSeloImage(ctx, badgeX, badgeY, badgeSize, seloStr, accentStr);
                if (!drawn) {
                    drawBadge(ctx, badgeX, badgeY, badgeSize, accentStr, 'S');
                }
            } else {
                drawBadge(ctx, badgeX, badgeY, badgeSize, accentStr, 'S');
            }
            badgeX += badgeSize + badgeGap;
        }
    }

    let subLineY = nameY + 22;
    ctx.font = '15px "Arial", "Segoe UI", sans-serif';

    if (displayName && displayName !== username) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(`@${username}`, textStartX, subLineY);
        if (boosterRole) {
            const usernameWidth = ctx.measureText(`@${username}  `).width;
            drawBoosterTag(ctx, textStartX + usernameWidth, subLineY, boosterRole, accent);
        }
    } else if (boosterRole) {
        drawBoosterTag(ctx, textStartX, subLineY, boosterRole, accent);
    }

    const statsY = 110;
    const stats = [
        { label: 'POINTS', value: String(points) },
        { label: 'VOICE', value: voiceTime },
        { label: 'MSGS', value: String(messageCount) },
        { label: 'RANK', value: `#${rank}` }
    ];

    const statBoxWidth = 155;
    const statBoxHeight = 70;
    const statGap = 14;

    stats.forEach((stat, i) => {
        const sx = textStartX + i * (statBoxWidth + statGap);
        const sy = statsY;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        drawRoundedRect(ctx, sx, sy, statBoxWidth, statBoxHeight, 10);
        ctx.fill();

        ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.25)`;
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, sx, sy, statBoxWidth, statBoxHeight, 10);
        ctx.stroke();

        ctx.font = 'bold 12px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = accentStr;
        ctx.fillText(stat.label, sx + 14, sy + 24);

        ctx.font = 'bold 24px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        const valText = truncateText(ctx, stat.value, statBoxWidth - 28);
        ctx.fillText(valText, sx + 14, sy + 54);
    });

    let infoY = statsY + statBoxHeight + 20;

    if (activity) {
        const actLabel = getActivityLabel(activity.type);
        let actText = activity.name || '';
        if (activity.type === 2 && activity.details) {
            actText = `${activity.details}`;
            if (activity.state) actText += ` - ${activity.state}`;
        }

        let actImgLoaded = null;
        if (activity.largeImageURL) {
            actImgLoaded = await fetchActivityImage(activity.largeImageURL);
        }

        if (actImgLoaded) {
            const imgSize = 50;
            const imgX = textStartX;
            const imgY = infoY - 2;
            const imgRadius = 6;

            ctx.save();
            ctx.beginPath();
            drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
            ctx.clip();
            ctx.drawImage(actImgLoaded, imgX, imgY, imgSize, imgSize);
            ctx.restore();

            ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.4)`;
            ctx.lineWidth = 1;
            drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
            ctx.stroke();

            const actTextX = textStartX + imgSize + 12;

            ctx.font = 'bold 14px "Arial", "Segoe UI", sans-serif';
            ctx.fillStyle = accentStr;
            ctx.fillText(actLabel.toUpperCase(), actTextX, infoY + 12);

            ctx.font = 'bold 16px "Arial", "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            const truncActivity = truncateText(ctx, actText, CARD_WIDTH - actTextX - 40);
            ctx.fillText(truncActivity, actTextX, infoY + 32);

            if (activity.state && activity.type !== 2) {
                ctx.font = '13px "Arial", "Segoe UI", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                const truncState = truncateText(ctx, activity.state, CARD_WIDTH - actTextX - 40);
                ctx.fillText(truncState, actTextX, infoY + 48);
            }

            infoY += imgSize + 10;
        } else {
            ctx.font = 'bold 14px "Arial", "Segoe UI", sans-serif';
            ctx.fillStyle = accentStr;
            ctx.fillText(actLabel.toUpperCase(), textStartX, infoY);

            ctx.font = 'bold 16px "Arial", "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            const truncActivity = truncateText(ctx, actText, CARD_WIDTH - textStartX - 50);
            ctx.fillText(truncActivity, textStartX, infoY + 20);
            infoY += 46;
        }
    }

    if (aboutMe && typeof aboutMe === 'string' && aboutMe.trim() !== '') {
        const aboutMaxWidth = CARD_WIDTH - textStartX - 40;
        const aboutX = textStartX;
        const aboutY = infoY + 4;

        ctx.font = 'bold 13px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = accentStr;
        ctx.fillText('SOBRE MIM', aboutX, aboutY);

        ctx.font = '14px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const bioLines = wrapText(ctx, aboutMe.trim(), aboutMaxWidth, 3);
        bioLines.forEach((line, i) => {
            ctx.fillText(line, aboutX, aboutY + 18 + i * 18);
        });
    }

    let leftY = AVATAR_Y + AVATAR_SIZE + 45;
    const leftX = AVATAR_X;
    const leftMaxWidth = 200;

    if (marriageInfo) {
        ctx.font = 'bold 12px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = accentStr;
        ctx.fillText('MARRY', leftX, leftY);
        leftY += 18;

        ctx.font = 'bold 16px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = accentStr;
        const marryName = truncateText(ctx, marriageInfo.partnerName || 'alguem', leftMaxWidth);
        ctx.fillText(marryName, leftX, leftY);
        leftY += 16;

        const marryDays = marriageInfo.days || 0;
        const marryHours = marriageInfo.hours || 0;
        let timeText = `${marryDays} dias`;
        if (marryHours > 0) timeText += `, ${marryHours}h`;
        ctx.font = '12px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(timeText, leftX, leftY);
        leftY += 24;
    }

    if (bfInfo) {
        ctx.font = 'bold 12px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = accentStr;
        ctx.fillText('BEST FRIEND', leftX, leftY);
        leftY += 18;

        ctx.font = 'bold 15px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = accentStr;
        const bfName = truncateText(ctx, bfInfo.partnerName || 'alguem', leftMaxWidth);
        ctx.fillText(bfName, leftX, leftY);
        leftY += 16;

        const bfDays = bfInfo.days || 0;
        ctx.font = '12px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`${bfDays} dias`, leftX, leftY);
    }

    ctx.font = '11px "Arial", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.textAlign = 'right';
    ctx.fillText('Ace Bot', CARD_WIDTH - 18, CARD_HEIGHT - 14);
    ctx.textAlign = 'left';

    return canvas.toBuffer('image/png');
}

function drawBoosterTag(ctx, x, y, roleName, accent) {
    ctx.font = 'bold 12px "Arial", "Segoe UI", sans-serif';
    const tagText = roleName;
    const tagWidth = ctx.measureText(tagText).width + 16;
    const tagHeight = 20;
    const tagY = y - 14;

    ctx.fillStyle = 'rgba(244, 127, 255, 0.15)';
    drawRoundedRect(ctx, x, tagY, tagWidth, tagHeight, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 127, 255, 0.4)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, tagY, tagWidth, tagHeight, 4);
    ctx.stroke();

    ctx.fillStyle = '#F47FFF';
    ctx.fillText(tagText, x + 8, y - 1);
}

function drawDefaultBackground(ctx, accent) {
    const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    grad.addColorStop(0, `rgb(${Math.floor(accent.r * 0.15)}, ${Math.floor(accent.g * 0.15)}, ${Math.floor(accent.b * 0.15)})`);
    grad.addColorStop(0.5, 'rgb(18, 18, 24)');
    grad.addColorStop(1, `rgb(${Math.floor(accent.r * 0.1)}, ${Math.floor(accent.g * 0.1)}, ${Math.floor(accent.b * 0.1)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

function drawDefaultAvatar(ctx, cx, cy, r, accent) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${Math.floor(accent.r * 0.3)}, ${Math.floor(accent.g * 0.3)}, ${Math.floor(accent.b * 0.3)})`;
    ctx.fill();
    ctx.font = 'bold 48px "Arial", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

async function generateColorPreview(hexColor) {
    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');
    const accent = hexToRgb(hexColor);
    const accentStr = typeof hexColor === 'string' && hexColor.startsWith('#') ? hexColor : `rgb(${accent.r}, ${accent.g}, ${accent.b})`;

    drawDefaultBackground(ctx, accent);

    const overlay = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
    overlay.addColorStop(0, 'rgba(0,0,0,0.3)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    const glow = ctx.createRadialGradient(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, 30, AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, 220);
    glow.addColorStop(0, `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.08)`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    const cx = AVATAR_X + AVATAR_SIZE / 2;
    const cy = AVATAR_Y + AVATAR_SIZE / 2;
    const r = AVATAR_SIZE / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = accentStr;
    ctx.fill();

    drawDefaultAvatar(ctx, cx, cy, r, accent);

    const textStartX = AVATAR_X + AVATAR_SIZE + 30;

    ctx.font = 'bold 26px "Arial", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Preview', textStartX, AVATAR_Y + 30);

    ctx.font = '16px "Arial", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('@preview', textStartX, AVATAR_Y + 52);

    const statsY = AVATAR_Y + AVATAR_SIZE + 60;
    const statsLabels = ['POINTS', 'VOICE', 'MSGS', 'RANK'];
    const statsValues = ['0', '0h 0m', '0', '#0'];
    const statBoxWidth = 160;
    const statBoxHeight = 50;
    const statSpacing = 18;
    const statsStartX = textStartX;

    statsLabels.forEach((label, i) => {
        const bx = statsStartX + i * (statBoxWidth + statSpacing);
        if (bx + statBoxWidth > CARD_WIDTH - 20) return;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        drawRoundedRect(ctx, bx, statsY, statBoxWidth, statBoxHeight, 8);
        ctx.fill();

        ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.15)`;
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, bx, statsY, statBoxWidth, statBoxHeight, 8);
        ctx.stroke();

        ctx.font = 'bold 11px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = accentStr;
        ctx.globalAlpha = 0.7;
        ctx.fillText(label, bx + 12, statsY + 18);
        ctx.globalAlpha = 1.0;

        ctx.font = 'bold 18px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(statsValues[i], bx + 12, statsY + 40);
    });

    ctx.font = '11px "Arial", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.textAlign = 'right';
    ctx.fillText('Ace Bot', CARD_WIDTH - 18, CARD_HEIGHT - 14);
    ctx.textAlign = 'left';

    return canvas.toBuffer('image/png');
}

module.exports = { generateProfileCard, generateColorPreview };
