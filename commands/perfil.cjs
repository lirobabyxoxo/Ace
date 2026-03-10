const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { generateProfileCard } = require('../utils/profileCard.cjs');

const gpointsFile = path.join(__dirname, '..', 'data', 'gpoints.json');
const marriagesFile = path.join(__dirname, '..', 'data', 'marriages.json');
const bestfriendsFile = path.join(__dirname, '..', 'data', 'bestfriends.json');
const boosterRolesFile = path.join(__dirname, '..', 'data', 'boosterRoles.json');

function loadData(file) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {
        console.error(`Erro ao carregar ${file}:`, e);
    }
    return {};
}

function getUserBadges(user, member) {
    const badges = [];
    const flags = user.flags?.toArray?.() || [];

    const hasAnimatedAvatar = user.avatar && user.avatar.startsWith('a_');
    const hasNitroBadge = flags.includes('PremiumEarlySupporter');
    if (hasAnimatedAvatar || hasNitroBadge) badges.push('nitro');
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
        if (flagMap[flag] && !badges.includes(flagMap[flag])) {
            badges.push(flagMap[flag]);
        }
    }

    return badges;
}

function getBoosterRoleName(guildId, userId, guild) {
    const boosterRoles = loadData(boosterRolesFile);
    const guildBoosterRoles = boosterRoles[guildId];
    if (!guildBoosterRoles || !guildBoosterRoles[userId]) return null;

    const roleId = guildBoosterRoles[userId];
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : null;
}

module.exports = {
    name: 'perfil',
    aliases: ['p', 'profile', 'points'],
    description: 'Mostra o perfil de um usuário',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const target = message.mentions.users.first() || 
                       (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || 
                       message.author;
        
        const guild = message.guild;
        const member = guild.members.cache.get(target.id) || await guild.members.fetch(target.id).catch(() => null);

        await this.sendProfile(message, target, member, colors, createYakuzaEmbed, client);
    },

    async sendProfile(message, user, member, colors, createYakuzaEmbed, client) {
        const guildId = message.guild.id;
        const gpointsData = loadData(gpointsFile);
        const marriages = loadData(marriagesFile);

        const userData = gpointsData[guildId]?.[user.id] || { gpoints: 0, voiceTimeSeconds: 0, messageCount: 0, equipped: {} };
        const equipped = userData.equipped || {};
        
        const guildScores = gpointsData[guildId] || {};
        const sortedUsers = Object.keys(guildScores).sort((a, b) => (guildScores[b].gpoints || 0) - (guildScores[a].gpoints || 0));
        const rank = sortedUsers.indexOf(user.id) + 1 || 'N/A';

        const totalSeconds = userData.voiceTimeSeconds || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        let marriageInfo = null;
        for (const key in marriages) {
            const m = marriages[key];
            if (m.status === 'casado' && (m.user1 === user.id || m.user2 === user.id)) {
                const partnerId = m.user1 === user.id ? m.user2 : m.user1;
                const diffTime = Date.now() - new Date(m.date).getTime();
                const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                let partnerName = partnerId;
                try {
                    const partnerUser = await client.users.fetch(partnerId).catch(() => null);
                    if (partnerUser) partnerName = partnerUser.displayName || partnerUser.username;
                } catch (e) {}
                marriageInfo = { partnerName, days, hours };
                break;
            }
        }

        let bfInfo = null;
        const bestfriends = loadData(bestfriendsFile);
        for (const key in bestfriends) {
            const b = bestfriends[key];
            if (b.status === 'bf' && (b.user1 === user.id || b.user2 === user.id)) {
                const bfPartnerId = b.user1 === user.id ? b.user2 : b.user1;
                const bfDays = Math.floor((Date.now() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24));
                let bfPartnerName = bfPartnerId;
                try {
                    const bfUser = await client.users.fetch(bfPartnerId).catch(() => null);
                    if (bfUser) bfPartnerName = bfUser.displayName || bfUser.username;
                } catch (e) {}
                bfInfo = { partnerName: bfPartnerName, days: bfDays };
                break;
            }
        }

        const profileColor = equipped.color || colors.primary;
        const profileBanner = equipped.banner || null;
        const profileSelo = equipped.selo || null;

        const avatarURL = member 
            ? member.displayAvatarURL({ extension: 'png', size: 256 }) 
            : user.displayAvatarURL({ extension: 'png', size: 256 });

        const displayName = member ? member.displayName : (user.globalName || user.username);

        const fetchedUser = await client.users.fetch(user.id, { force: true }).catch(() => user);
        const badges = getUserBadges(fetchedUser, member);
        const boosterRole = getBoosterRoleName(guildId, user.id, message.guild);

        let activity = null;
        if (member && member.presence && member.presence.activities && member.presence.activities.length > 0) {
            for (const act of member.presence.activities) {
                if (act.type === 4) continue;
                activity = { name: act.name, type: act.type, details: act.details || null, state: act.state || null, largeImageURL: act.assets?.largeImageURL?.({ size: 128 }) || null };
                break;
            }
        }

        const aboutMe = userData.aboutMe || null;
        const profileMoldura = equipped.moldura || null;

        let reply;
        try {
            const cardBuffer = await generateProfileCard({
                username: user.username,
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

            const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile.png' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`profile_close_${user.id}`).setLabel('Fechar').setStyle(ButtonStyle.Secondary)
            );

            if (user.id === message.author.id) {
                row.addComponents(
                    new ButtonBuilder().setCustomId(`profile_edit_${user.id}`).setLabel('Editar perfil').setStyle(ButtonStyle.Primary)
                );
            }

            reply = await message.reply({ files: [attachment], components: [row] });
        } catch (err) {
            console.error('Erro ao gerar card de perfil:', err);
            reply = await message.reply(`**Perfil de ${user.username}**\nPoints: ${userData.gpoints || 0} | Voice: ${hours}h ${minutes}m | Msgs: ${userData.messageCount || 0} | Rank: #${rank}`);
            return;
        }

        const collector = reply.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i) => {
            if (i.customId.startsWith('profile_close_')) {
                return await i.message.delete().catch(() => {});
            }

            if (i.customId.startsWith('profile_edit_')) {
                if (i.user.id !== user.id) return i.reply({ content: 'Você não pode editar este perfil.', ephemeral: true });
                
                const invCmd = client.commands.get('inventario');
                if (invCmd) {
                    return await invCmd.showInventory(guildId, user, null, i, colors, createYakuzaEmbed);
                } else {
                    return i.reply({ content: 'Erro ao abrir o menu de edição.', ephemeral: true });
                }
            }
        });
    }
};
