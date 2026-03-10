const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logsystem = require('./logsystem.cjs');

const dataDir = path.join(__dirname, '..', 'data');
const configFile = path.join(__dirname, '..', 'server_configs.json');

function getServerConfig(guildId) {
    try {
        if (fs.existsSync(configFile)) {
            const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            return data[guildId] || {};
        }
    } catch (e) {}
    return {};
}

function getPainelConfig(guildId) {
    const painelConfigFile = path.join(dataDir, 'painelConfig.json');
    const defaults = {
        embeds: {
            ban: { title: '🔨 Usuário Banido', description: 'O usuário foi banido do servidor.', color: '#ff0000', image: null },
            mute: { title: '🔇 Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null }
        }
    };
    try {
        if (fs.existsSync(painelConfigFile)) {
            const data = JSON.parse(fs.readFileSync(painelConfigFile, 'utf8'));
            const saved = data[guildId];
            if (saved) {
                return {
                    ...defaults,
                    ...saved,
                    embeds: { ...defaults.embeds, ...(saved.embeds || {}) }
                };
            }
        }
    } catch (error) {
        console.error('Erro ao carregar painel config:', error);
    }
    return defaults;
}

function getStaffStats(staffId) {
    const staffConfigFile = path.join(dataDir, 'staffConfig.json');
    try {
        if (fs.existsSync(staffConfigFile)) {
            const data = JSON.parse(fs.readFileSync(staffConfigFile, 'utf8'));
            return data[staffId]?.stats || { bans: 0, mutes: 0 };
        }
    } catch (e) {}
    return { bans: 0, mutes: 0 };
}

function updateStaffStats(staffId, type) {
    const staffConfigFile = path.join(dataDir, 'staffConfig.json');
    try {
        let data = {};
        if (fs.existsSync(staffConfigFile)) {
            data = JSON.parse(fs.readFileSync(staffConfigFile, 'utf8'));
        }
        if (!data[staffId]) data[staffId] = { stats: { bans: 0, mutes: 0 } };
        if (!data[staffId].stats) data[staffId].stats = { bans: 0, mutes: 0 };
        
        if (type === 'ban') data[staffId].stats.bans++;
        else if (type === 'mute') data[staffId].stats.mutes++;
        
        fs.writeFileSync(staffConfigFile, JSON.stringify(data, null, 2));
        return data[staffId].stats;
    } catch (e) {
        console.error('Erro ao atualizar stats do staff:', e);
    }
    return { bans: 0, mutes: 0 };
}

function parseTime(timeStr) {
    const regex = /(\d+)([smhd])/i;
    const match = timeStr.match(regex);
    
    if (!match) return null;
    
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    let milliseconds = 0;
    
    switch (unit) {
        case 's':
            milliseconds = amount * 1000;
            break;
        case 'm':
            milliseconds = amount * 60 * 1000;
            break;
        case 'h':
            milliseconds = amount * 60 * 60 * 1000;
            break;
        case 'd':
            milliseconds = amount * 24 * 60 * 60 * 1000;
            break;
    }
    
    const maxTime = 28 * 24 * 60 * 60 * 1000;
    if (milliseconds > maxTime) return null;
    
    return milliseconds;
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    name: 'mute',
    aliases: ['mutar', 'silenciar'],
    description: 'Mutar um usuário por um tempo específico',
    
    slashData: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutar um usuário por um tempo específico')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('Usuário a ser mutado')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tempo')
                .setDescription('Tempo do mute (ex: 1m, 1h, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo do mute')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (message.author.id !== '1427437680504864870' && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = createYakuzaEmbed(
                'Acesso Negado',
                'Voce nao tem permissao para usar este comando.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!user) {
            const errorEmbed = createYakuzaEmbed(
                'Usuário Inválido',
                'Por favor, mencione um usuário válido ou forneça um ID.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        const member = message.guild.members.cache.get(user.id);
        if (!member) {
            const errorEmbed = createYakuzaEmbed(
                'Membro Não Encontrado',
                'Este usuário não está no servidor.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        const timeStr = args[1];
        if (!timeStr) {
            const errorEmbed = createYakuzaEmbed(
                'Tempo Não Especificado',
                'Por favor, especifique um tempo (ex: 1m, 1h, 1d).',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        const reason = args.slice(2).join(' ') || 'Motivo não especificado';

        await muteUser(member, timeStr, reason, message.author, message, null, colors, createYakuzaEmbed);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        if (interaction.user.id !== '1427437680504864870' && !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = createYakuzaEmbed(
                'Acesso Negado',
                'Voce nao tem permissao para usar este comando.',
                colors.error
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const user = interaction.options.getUser('usuário');
        const timeStr = interaction.options.getString('tempo');
        const reason = interaction.options.getString('motivo') || 'Motivo não especificado';
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            const errorEmbed = createYakuzaEmbed(
                'Membro Não Encontrado',
                'Este usuário não está no servidor.',
                colors.error
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await muteUser(member, timeStr, reason, interaction.user, null, interaction, colors, createYakuzaEmbed);
    }
};

function getStaffEmbedConfig(staffId, type) {
    const staffConfigFile = path.join(dataDir, 'staffConfig.json');
    const defaults = {
        ban: { title: '🔨 Usuário Banido', description: 'O usuário foi banido do servidor.', color: '#ff0000', image: null },
        mute: { title: '🔇 Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null }
    };
    try {
        if (fs.existsSync(staffConfigFile)) {
            const data = JSON.parse(fs.readFileSync(staffConfigFile, 'utf8'));
            const staffData = data[staffId];
            if (staffData && staffData[type]) {
                const config = { ...defaults[type], ...staffData[type] };
                // Ensure color is a string for the startsWith check
                if (config.color && typeof config.color !== 'string') {
                    config.color = config.color.toString();
                }
                return config;
            }
        }
    } catch (error) {}
    return defaults[type];
}

async function muteUser(member, timeStr, reason, executor, message, interaction, colors, createYakuzaEmbed) {
    try {
        const srvConfig = getServerConfig(member.guild.id);
        const immuneRoleId = srvConfig.immuneRoleId;
        if (immuneRoleId && member.roles.cache.has(immuneRoleId)) {
            const errorEmbed = createYakuzaEmbed(
                'Usuário Imune',
                'esse usuario não pode ser mutado pois possui cargo imune',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [errorEmbed] });
            } else {
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }

        const duration = parseTime(timeStr);
        
        if (!duration) {
            const errorEmbed = createYakuzaEmbed(
                'Tempo Inválido',
                'Formato de tempo inválido. Use: 1s, 1m, 1h, 1d (máximo 28 dias)',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [errorEmbed] });
            } else {
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }

        const executorMember = message ? message.member : interaction.member;
        
        if (member.roles.highest.position >= executorMember.roles.highest.position) {
            const errorEmbed = createYakuzaEmbed(
                'Hierarquia Insuficiente',
                'Você não pode mutar este usuário devido à hierarquia de cargos.',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [errorEmbed] });
            } else {
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
        
        if (!member.moderatable) {
            const errorEmbed = createYakuzaEmbed(
                'Não Moderável',
                'Não posso mutar este usuário. Verifique minhas permissões e a hierarquia.',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [errorEmbed] });
            } else {
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }

        try {
            const dmEmbed = createYakuzaEmbed(
                '🔇 Você foi mutado!',
                `**Servidor:** ${member.guild.name}\n**Tempo:** ${formatTime(duration)}\n**Motivo:** ${reason}\n**Moderador:** ${executor.tag}`,
                colors.warning
            );
            await member.user.send({ embeds: [dmEmbed] });
        } catch (error) {}

        await member.timeout(duration, `${reason} - Mutado por: ${executor.tag}`);

        const stats = updateStaffStats(executor.id, 'mute');
        const muteConfig = getStaffEmbedConfig(executor.id, 'mute');
        
        const successEmbed = new EmbedBuilder()
            .setTitle(muteConfig.title)
            .setDescription(
                muteConfig.description + 
                `\n\n**Usuário:** ${member.user.tag} (${member.user.id})\n` +
                `**Tempo:** ${formatTime(duration)}\n` +
                `**Motivo:** ${reason}\n` +
                `**Staff:** ${executor.tag}\n` +
                `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setColor(muteConfig.color.startsWith('#') ? parseInt(muteConfig.color.replace('#', ''), 16) : (parseInt(muteConfig.color) || colors.primary))
            .setThumbnail(member.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Mutes aplicados por ${executor.username}: ${stats.mutes} — Ace Bot` })
            .setTimestamp();

        if (muteConfig.image) {
            successEmbed.setImage(muteConfig.image);
        }

        const replyOptions = {
            embeds: [successEmbed]
        };

        if (message) {
            await message.reply(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }

        await logsystem.sendLog(member.guild, 'moderation', successEmbed);

    } catch (error) {
        console.error('Erro ao mutar usuário:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro no Mute',
            'Ocorreu um erro ao tentar mutar o usuário.',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}
