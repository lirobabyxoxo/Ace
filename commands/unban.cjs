const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logsystem = require('./logsystem.cjs');

const dataDir = path.join(__dirname, '..', 'data');

function getStaffConfig(staffId) {
    const filePath = path.join(dataDir, `${staffId}.json`);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error('Erro ao carregar config do staff:', error);
    }
    return {
        ban: {
            title: 'Usuário Banido',
            description: 'O usuário foi banido do servidor.',
            color: '#ff0000',
            image: null,
            message: null
        },
        unban: {
            title: 'Usuário Desbanido',
            description: 'O usuário foi desbanido do servidor.',
            color: '#00ff00',
            image: null,
            message: null
        },
        mute: {
            title: 'Usuário Mutado',
            description: 'O usuário foi mutado.',
            color: '#ff6600',
            image: null,
            message: null
        },
        stats: {
            bans: 0,
            unbans: 0,
            mutes: 0
        }
    };
}

function saveStaffConfig(staffId, config) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, `${staffId}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Erro ao salvar config do staff:', error);
    }
}

module.exports = {
    name: 'unban',
    aliases: ['desbanir'],
    description: 'Desbanir um usuário do servidor',
    
    slashData: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Desbanir um usuário do servidor')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID do usuário a desbanir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo do desbane')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const errorEmbed = createYakuzaEmbed(
                'Sem Permissão',
                'Você não tem permissão para desbanir membros.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        if (!args[0]) {
            const errorEmbed = createYakuzaEmbed(
                'ID Inválido',
                'Por favor, forneça um ID de usuário válido.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        const userId = args[0];
        const reason = args.slice(1).join(' ') || 'Motivo não especificado';

        // Tentar buscar o usuário, mas não falhar se for apenas ID
        let user;
        try {
            user = await client.users.fetch(userId);
        } catch (error) {
            user = { id: userId, tag: `Usuário (${userId})`, username: userId };
        }

        await unbanUser(message.guild, user, userId, reason, message.author, message, null, colors, createYakuzaEmbed, client);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        const userId = interaction.options.getString('id');
        const reason = interaction.options.getString('motivo') || 'Motivo não especificado';

        let user;
        try {
            user = await client.users.fetch(userId);
        } catch (error) {
            user = { id: userId, tag: `Usuário (${userId})`, username: userId };
        }

        await unbanUser(interaction.guild, user, userId, reason, interaction.user, null, interaction, colors, createYakuzaEmbed, client);
    }
};

async function unbanUser(guild, user, userId, reason, executor, message, interaction, colors, createYakuzaEmbed, client) {
    try {
        // Tentar desbanir diretamente e capturar erro se não estiver banido
        try {
            await guild.bans.remove(userId, `${reason} - Desbanido por: ${executor.tag}`);
        } catch (error) {
            if (error.code === 10026) { // Unknown Ban
                const errorEmbed = createYakuzaEmbed(
                    'Não Está Banido',
                    `O usuário **${user.tag || userId}** não está na lista de banimentos do servidor.`,
                    colors.error
                );
                
                if (message) {
                    return await message.reply({ embeds: [errorEmbed] });
                } else {
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
            throw error;
        }

        // Atualizar estatísticas do staff
        const staffConfig = getStaffConfig(executor.id);
        staffConfig.stats.unbans = (staffConfig.stats.unbans || 0) + 1;
        saveStaffConfig(executor.id, staffConfig);

        // Tentar enviar DM para o usuário
        try {
            const dmEmbed = createYakuzaEmbed(
                'Você foi desbanido!',
                `**Servidor:** ${guild.name}\n**Motivo:** ${reason}\n**Moderador:** ${executor.tag}`,
                colors.success
            );
            await user.send({ embeds: [dmEmbed] });
        } catch (error) {}

        // Criar embed de sucesso
        const unbanConfig = staffConfig.unban || {
            title: 'Usuário Desbanido',
            description: 'O usuário foi desbanido do servidor.',
            color: '#00ff00',
            image: null,
            message: null
        };

        const { EmbedBuilder } = require('discord.js');
        const successEmbed = new EmbedBuilder()
            .setTitle(unbanConfig.title)
            .setDescription(
                unbanConfig.description + 
                `\n\n**Usuário:** ${user.tag} (${user.id})\n` +
                `**Motivo:** ${reason}\n` +
                `**Moderador:** ${executor.tag}`
            )
            .setColor(parseInt(unbanConfig.color.replace('#', ''), 16))
            .setFooter({ text: `Desbanimentos aplicados por ${executor.username}: ${staffConfig.stats.unbans}` })
            .setTimestamp();

        if (unbanConfig.image) {
            successEmbed.setImage(unbanConfig.image);
        }

        const replyOptions = {
            content: unbanConfig.message || null,
            embeds: [successEmbed]
        };

        if (message) {
            await message.reply(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }

        await logsystem.sendLog(guild, 'moderation', successEmbed);

    } catch (error) {
        console.error('Erro ao desbanir usuário:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro no Desbane',
            'Ocorreu um erro ao tentar desbanir o usuário.',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}
