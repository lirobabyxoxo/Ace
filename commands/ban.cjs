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

module.exports = {
    name: 'ban',
    aliases: ['vaza', 'banir'],
    description: 'Banir um usuário do servidor',
    
    slashData: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banir um usuário do servidor')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('Usuário a ser banido')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo do banimento')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (message.author.id !== '1427437680504864870' && !message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
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
        const reason = args.slice(1).join(' ') || 'Motivo não especificado';

        await banUser(message.guild, user, member, reason, message.author, message, null, colors, createYakuzaEmbed, emojis);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        if (interaction.user.id !== '1427437680504864870' && !interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const errorEmbed = createYakuzaEmbed(
                'Acesso Negado',
                'Voce nao tem permissao para usar este comando.',
                colors.error
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const user = interaction.options.getUser('usuário');
        const reason = interaction.options.getString('motivo') || 'Motivo não especificado';
        const member = interaction.guild.members.cache.get(user.id);

        await banUser(interaction.guild, user, member, reason, interaction.user, null, interaction, colors, createYakuzaEmbed, emojis);
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

async function banUser(guild, user, member, reason, executor, message, interaction, colors, createYakuzaEmbed, emojis) {
    try {
        const executorMember = message ? message.member : interaction.member;
        
        if (member) {
            const srvConfig = getServerConfig(guild.id);
            const immuneRoleId = srvConfig.immuneRoleId;
            if (immuneRoleId && member.roles.cache.has(immuneRoleId)) {
                const errorEmbed = createYakuzaEmbed(
                    'Usuário Imune',
                    'esse usuario não pode ser banido pois possui cargo imune',
                    colors.error
                );
                
                if (message) {
                    return await message.reply({ embeds: [errorEmbed] });
                } else {
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }

            if (member.roles.highest.position >= executorMember.roles.highest.position) {
                const errorEmbed = createYakuzaEmbed(
                    'Hierarquia Insuficiente',
                    'Você não pode banir este usuário devido à hierarquia de cargos.',
                    colors.error
                );
                
                if (message) {
                    return await message.reply({ embeds: [errorEmbed] });
                } else {
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
            
            if (!member.bannable) {
                const errorEmbed = createYakuzaEmbed(
                    'Não Banível',
                    'Não posso banir este usuário. Verifique minhas permissões e a hierarquia.',
                    colors.error
                );
                
                if (message) {
                    return await message.reply({ embeds: [errorEmbed] });
                } else {
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        }

        try {
            const dmEmbed = createYakuzaEmbed(
                '🔨 Você foi banido!',
                `**Servidor:** ${guild.name}\n**Motivo:** ${reason}\n**Moderador:** ${executor.tag}`,
                colors.error
            );
            await user.send({ embeds: [dmEmbed] });
        } catch (error) {}

        await guild.members.ban(user, { reason: `${reason} - Banido por: ${executor.tag}` });

        const stats = updateStaffStats(executor.id, 'ban');
        const banConfig = getStaffEmbedConfig(executor.id, 'ban');
        
        const successEmbed = new EmbedBuilder()
            .setTitle(banConfig.title)
            .setDescription(
                banConfig.description + 
                `\n\n**Usuário:** ${user.tag} (${user.id})\n` +
                `**Motivo:** ${reason}\n` +
                `**Staff:** ${executor.tag}\n` +
                `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setColor(banConfig.color.startsWith('#') ? parseInt(banConfig.color.replace('#', ''), 16) : (parseInt(banConfig.color) || colors.primary))
            .setThumbnail(member ? member.displayAvatarURL({ dynamic: true }) : user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Bans aplicados por ${executor.username}: ${stats.bans} — Ace Bot` })
            .setTimestamp();

        if (banConfig.image) {
            successEmbed.setImage(banConfig.image);
        }

        const replyOptions = {
            embeds: [successEmbed]
        };

        if (message) {
            await message.reply(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }

        await logsystem.sendLog(guild, 'moderation', successEmbed);

    } catch (error) {
        console.error('Erro ao banir usuário:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro no Banimento',
            'Ocorreu um erro ao tentar banir o usuário.',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}
