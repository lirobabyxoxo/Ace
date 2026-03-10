const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const gpointsFile = path.join(dataDir, 'gpoints.json');
const gpointsConfigFile = path.join(dataDir, 'gpointsConfig.json');
const boosterRolesFile = path.join(dataDir, 'boosterRoles.json');
const marriagesFile = path.join(dataDir, 'marriages.json');
const bestfriendsFile = path.join(dataDir, 'bestfriends.json');

function getBadgesForUser(user, member) {
    const badges = [];
    const flags = user.flags?.toArray?.() || [];
    const hasAnimatedAvatar = user.avatar && user.avatar.startsWith('a_');
    if (hasAnimatedAvatar || flags.includes('PremiumEarlySupporter')) badges.push('nitro');
    if (member && member.premiumSince) badges.push('booster');
    if (flags.includes('PremiumEarlySupporter')) badges.push('early_supporter');
    const flagMap = {
        'ActiveDeveloper': 'active_developer',
        'VerifiedDeveloper': 'verified_developer',
        'HypeSquadBravery': 'hypesquad_bravery',
        'HypeSquadBrilliance': 'hypesquad_brilliance',
        'HypeSquadBalance': 'hypesquad_balance',
        'BugHunterLevel1': 'bug_hunter',
        'BugHunterLevel2': 'bug_hunter',
        'Staff': 'staff',
        'CertifiedModerator': 'moderator'
    };
    for (const flag of flags) {
        if (flagMap[flag] && !badges.includes(flagMap[flag])) badges.push(flagMap[flag]);
    }
    return badges;
}

function getBoosterRoleName(guildId, userId, guild) {
    try {
        if (fs.existsSync(boosterRolesFile)) {
            const data = JSON.parse(fs.readFileSync(boosterRolesFile, 'utf8'));
            const guildData = data[guildId];
            if (guildData && guildData[userId]) {
                const role = guild.roles.cache.get(guildData[userId]);
                return role ? role.name : null;
            }
        }
    } catch (e) {}
    return null;
}

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function getGPointsConfig(guildId) {
    try {
        if (fs.existsSync(gpointsConfigFile)) {
            const data = JSON.parse(fs.readFileSync(gpointsConfigFile, 'utf8'));
            return data[guildId] || {
                enabled: true,
                pointsPerMinuteCall: 1,
                pointsPerMessage: 1,
                messageCooldown: 30,
                countCallsEnabled: true
            };
        }
    } catch (error) {
        console.error('Erro ao carregar config G Points:', error);
    }
    return {
        enabled: true,
        pointsPerMinuteCall: 1,
        pointsPerMessage: 1,
        messageCooldown: 30,
        countCallsEnabled: true
    };
}

function saveGPointsConfig(guildId, config) {
    try {
        let data = {};
        if (fs.existsSync(gpointsConfigFile)) {
            data = JSON.parse(fs.readFileSync(gpointsConfigFile, 'utf8'));
        }
        data[guildId] = config;
        fs.writeFileSync(gpointsConfigFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar config G Points:', error);
    }
}

function getUserGPoints(guildId, userId) {
    try {
        if (fs.existsSync(gpointsFile)) {
            const data = JSON.parse(fs.readFileSync(gpointsFile, 'utf8'));
            const guildData = data[guildId] || {};
            return guildData[userId] || {
                gpoints: 0,
                voiceTimeSeconds: 0,
                messageCount: 0,
                lastMessageTime: 0
            };
        }
    } catch (error) {
        console.error('Erro ao carregar G Points do usuário:', error);
    }
    return {
        gpoints: 0,
        voiceTimeSeconds: 0,
        messageCount: 0,
        lastMessageTime: 0
    };
}

function saveUserGPoints(guildId, userId, data) {
    try {
        let fileData = {};
        if (fs.existsSync(gpointsFile)) {
            fileData = JSON.parse(fs.readFileSync(gpointsFile, 'utf8'));
        }
        if (!fileData[guildId]) {
            fileData[guildId] = {};
        }
        fileData[guildId][userId] = data;
        fs.writeFileSync(gpointsFile, JSON.stringify(fileData, null, 2));
    } catch (error) {
        console.error('Erro ao salvar G Points do usuário:', error);
    }
}

function getAllGPoints(guildId) {
    try {
        if (fs.existsSync(gpointsFile)) {
            const data = JSON.parse(fs.readFileSync(gpointsFile, 'utf8'));
            return data[guildId] || {};
        }
    } catch (error) {
        console.error('Erro ao carregar todos G Points:', error);
    }
    return {};
}

function addGPoints(guildId, userId, amount) {
    const userData = getUserGPoints(guildId, userId);
    userData.gpoints = (userData.gpoints || 0) + amount;
    saveUserGPoints(guildId, userId, userData);
}

function equipItem(guildId, userId, item) {
    const userData = getUserGPoints(guildId, userId);
    
    const typeMap = {
        'cor': 'color',
        'banner': 'banner',
        'selo': 'selo',
        'moldura': 'moldura'
    };
    
    const equippedKey = typeMap[item.type] || item.type;
    
    // Validação de URL para banners
    if (equippedKey === 'banner' && item.value) {
        const isUrl = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|gifv))/i.test(item.value.split('?')[0]);
        if (!isUrl && !item.value.includes('discordapp.net')) {
             console.error(`URL de banner inválida detectada: ${item.value}`);
             // Permitimos URLs do discordapp mesmo sem extensão clara por causa do proxy
        }
    }
    
    if (!userData.equipped) userData.equipped = {};
    userData.equipped[equippedKey] = item.value;
    
    saveUserGPoints(guildId, userId, userData);
    return true;
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
}

module.exports = {
    async showProfile(guild, targetUser, message, interaction, colors, createYakuzaEmbed) {
        const { generateProfileCard } = require('../utils/profileCard.cjs');
        const userData = getUserGPoints(guild.id, targetUser.id);
        const totalSeconds = userData.voiceTimeSeconds || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        const profileColor = userData.equipped?.color || colors.primary;
        const profileBanner = userData.equipped?.banner || null;
        const profileSelo = userData.equipped?.selo || "";
        const profileMoldura = userData.equipped?.moldura || null;

        const member = guild.members.cache.get(targetUser.id) || await guild.members.fetch(targetUser.id).catch(() => null);
        const avatarURL = member
            ? member.displayAvatarURL({ extension: 'png', size: 256 })
            : targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        const displayName = member ? member.displayName : (targetUser.globalName || targetUser.username);

        const guildScores = getAllGPoints(guild.id) || {};
        const sortedUsers = Object.keys(guildScores).sort((a, b) => (guildScores[b].gpoints || 0) - (guildScores[a].gpoints || 0));
        const rank = sortedUsers.indexOf(targetUser.id) + 1 || 'N/A';

        const fetchedUser = await (message ? message.client : interaction.client).users.fetch(targetUser.id, { force: true }).catch(() => targetUser);
        const badges = getBadgesForUser(fetchedUser, member);
        const boosterRole = getBoosterRoleName(guild.id, targetUser.id, guild);

        let activity = null;
        if (member && member.presence && member.presence.activities && member.presence.activities.length > 0) {
            for (const act of member.presence.activities) {
                if (act.type === 4) continue;
                activity = { name: act.name, type: act.type, details: act.details || null, state: act.state || null, largeImageURL: act.assets?.largeImageURL?.({ size: 128 }) || null };
                break;
            }
        }
        const aboutMe = userData.aboutMe || null;

        let marriageInfo = null;
        try {
            if (fs.existsSync(marriagesFile)) {
                const marriages = JSON.parse(fs.readFileSync(marriagesFile, 'utf8'));
                for (const key in marriages) {
                    const m = marriages[key];
                    if (m.status === 'casado' && (m.user1 === targetUser.id || m.user2 === targetUser.id)) {
                        const partnerId = m.user1 === targetUser.id ? m.user2 : m.user1;
                        const diffTime = Date.now() - new Date(m.date).getTime();
                        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        const mHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        let partnerName = partnerId;
                        try {
                            const partnerUser = await (message ? message.client : interaction.client).users.fetch(partnerId).catch(() => null);
                            if (partnerUser) partnerName = partnerUser.displayName || partnerUser.username;
                        } catch (e) {}
                        marriageInfo = { partnerName, days, hours: mHours };
                        break;
                    }
                }
            }
        } catch (e) {}

        let bfInfo = null;
        try {
            if (fs.existsSync(bestfriendsFile)) {
                const bestfriends = JSON.parse(fs.readFileSync(bestfriendsFile, 'utf8'));
                for (const key in bestfriends) {
                    const b = bestfriends[key];
                    if (b.status === 'bf' && (b.user1 === targetUser.id || b.user2 === targetUser.id)) {
                        const bfPartnerId = b.user1 === targetUser.id ? b.user2 : b.user1;
                        const bfDays = Math.floor((Date.now() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24));
                        let bfPartnerName = bfPartnerId;
                        try {
                            const bfUser = await (message ? message.client : interaction.client).users.fetch(bfPartnerId).catch(() => null);
                            if (bfUser) bfPartnerName = bfUser.displayName || bfUser.username;
                        } catch (e) {}
                        bfInfo = { partnerName: bfPartnerName, days: bfDays };
                        break;
                    }
                }
            }
        } catch (e) {}

        try {
            const cardBuffer = await generateProfileCard({
                username: targetUser.username,
                displayName: displayName,
                avatarURL: avatarURL,
                bannerURL: profileBanner,
                profileColor: profileColor,
                points: userData.gpoints || 0,
                voiceTime: `${hours}h ${minutes}m`,
                messageCount: userData.messageCount || 0,
                rank: rank,
                marriageInfo: marriageInfo,
                selo: profileSelo,
                badges: badges,
                boosterRole: boosterRole,
                activity: activity,
                aboutMe: aboutMe,
                molduraURL: profileMoldura,
                bfInfo: bfInfo
            });

            const { AttachmentBuilder } = require('discord.js');
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile.png' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('inv_open_from_perfil')
                    .setLabel('Editar Perfil')
                    .setStyle(ButtonStyle.Primary)
            );

            const replyOptions = { files: [attachment], components: [row] };
            
            if (message) {
                await message.reply(replyOptions);
            } else {
                await interaction.reply(replyOptions);
            }
        } catch (err) {
            console.error('Erro ao gerar card de perfil:', err);
            const fallback = `**Perfil de ${targetUser.username}**\nPoints: ${userData.gpoints || 0} | Voice: ${hours}h ${minutes}m | Msgs: ${userData.messageCount || 0} | Rank: #${rank}`;
            if (message) {
                await message.reply(fallback);
            } else {
                await interaction.reply({ content: fallback });
            }
        }
    },

    addGPoints,
    equipItem,
    getUserGPoints,
    saveUserGPoints,
    getAllGPoints,
    getGPointsConfig,
    saveGPointsConfig,
    formatTime
};

module.exports.ranking = {
    name: 'g',
    description: 'Comandos de Points',

    slashData: new SlashCommandBuilder()
        .setName('g')
        .setDescription('Comandos de Points')
        .addSubcommand(sub =>
            sub.setName('top')
                .setDescription('Mostrar ranking dos Top Points')
        ),

    async executeSlash(interaction, client, config, colors, createYakuzaEmbed) {
        if (interaction.options.getSubcommand() === 'top') {
            await this.showRanking(interaction, colors, createYakuzaEmbed);
        }
    },

    async showRanking(context, colors, createYakuzaEmbed, page = 0) {
        const isInteraction = context.isButton?.() || context.customId?.startsWith('g_top_');
        const guild = context.guild;
        const allGPoints = getAllGPoints(guild.id);

        const validUsers = [];
        for (const [userId, data] of Object.entries(allGPoints)) {
            try {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member && !member.user.bot) {
                    validUsers.push({ userId, ...data });
                }
            } catch (e) {}
        }

        validUsers.sort((a, b) => (b.gpoints || 0) - (a.gpoints || 0));
        const topUsers = validUsers.slice(0, 50);

        const itemsPerPage = 10;
        const totalPages = Math.ceil(topUsers.length / itemsPerPage);
        const startIdx = page * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const pageUsers = topUsers.slice(startIdx, endIdx);

        let description = '';
        pageUsers.forEach((user, idx) => {
            const rank = startIdx + idx + 1;
            description += `${rank}. <@${user.userId}> — ${user.gpoints || 0} Points\n`;
        });

        const embed = createYakuzaEmbed(
            'Ranking Points',
            description || 'Nenhum usuário no ranking',
            colors.primary
        );
        embed.setFooter({ text: `Página ${page + 1}/${totalPages || 1}` });

        const buttons = new ActionRowBuilder();

        if (page > 0) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`g_top_prev_${page - 1}`)
                    .setLabel('<')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (page < totalPages - 1) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`g_top_next_${page + 1}`)
                    .setLabel('>')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (isInteraction && context.deferred) {
            await context.editReply({ embeds: [embed], components: buttons.components.length > 0 ? [buttons] : [] });
        } else if (isInteraction && !context.replied) {
            await context.update({ embeds: [embed], components: buttons.components.length > 0 ? [buttons] : [] }).catch(async () => {
                await context.followUp({ embeds: [embed], components: buttons.components.length > 0 ? [buttons] : [], ephemeral: true });
            });
        } else {
            await context.reply({ embeds: [embed], components: buttons.components.length > 0 ? [buttons] : [] });
        }
    },

    handleRankingButtons(interaction, colors, createYakuzaEmbed) {
        if (!interaction.deferred && !interaction.replied) {
            interaction.deferUpdate().catch(() => {});
        }
        const page = parseInt(interaction.customId.split('_')[3]);
        if (!isNaN(page)) {
            this.showRanking(interaction, colors, createYakuzaEmbed, page);
        }
    }
};
