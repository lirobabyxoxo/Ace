const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const GIF_URL = 'https://media.discordapp.net/attachments/1382155072183599214/1453665338435833928/convert.gif?ex=694e46d8&is=694cf558&hm=890734c164b21bb69354ab094bc022abb39f8179bfc690fd9062af42d82e3082&=&width=431&height=350';

module.exports = {
    name: 'clear',
    aliases: ['limpar', 'purge'],
    description: 'Limpar mensagens do canal',
    
    slashData: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpar mensagens do canal')
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Número de mensagens para limpar (1-1000)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000)
        )
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Opcional: Limpar apenas mensagens deste usuário')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorEmbed = createYakuzaEmbed(
                'Sem Permissão',
                'Você não tem permissão para gerenciar mensagens.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        const amount = parseInt(args[0]);
        const targetUser = message.mentions.users.first();
        await clearMessages(message.channel, amount, message.author, message, null, colors, createYakuzaEmbed, targetUser);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        const amount = interaction.options.getInteger('quantidade');
        const targetUser = interaction.options.getUser('usuario');
        await clearMessages(interaction.channel, amount, interaction.user, null, interaction, colors, createYakuzaEmbed, targetUser);
    }
};

async function clearMessages(channel, amount, executor, message, interaction, colors, createYakuzaEmbed, targetUser) {
    try {
        if (!amount || amount < 1 || amount > 1000) {
            const errorEmbed = createYakuzaEmbed(
                'Quantidade Inválida',
                'Por favor, forneça um número entre 1 e 1000.',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [errorEmbed] });
            } else {
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }

        let fetchLimit = Math.min(amount * 5, 250);
        let messages = await channel.messages.fetch({ limit: fetchLimit });
        
        const twoWeeks = 14 * 24 * 60 * 60 * 1000;
        let recentMessages = messages.filter(msg => 
            Date.now() - msg.createdTimestamp < twoWeeks
        );

        if (targetUser) {
            recentMessages = recentMessages.filter(msg => msg.author.id === targetUser.id);
        }

        const messagesToDelete = recentMessages.slice(0, amount);

        if (messagesToDelete.size === 0) {
            const errorEmbed = createYakuzaEmbed(
                'Nenhuma Mensagem',
                'Não há mensagens para deletar.',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [errorEmbed] });
            } else {
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }

        let deletedCount = 0;
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

        if (messagesToDelete.size > 1) {
            const recentForBulk = messagesToDelete.filter(m => Date.now() - m.createdTimestamp < twoWeeksMs);
            const oldMessages = messagesToDelete.filter(m => Date.now() - m.createdTimestamp >= twoWeeksMs);

            if (recentForBulk.size > 0) {
                const deleted = await channel.bulkDelete(recentForBulk, true);
                deletedCount += deleted.size;
            }

            for (const msg of oldMessages.values()) {
                try {
                    await msg.delete().catch(() => {});
                    deletedCount++;
                } catch (err) {
                    // Ignorar erro ao deletar msg antiga
                }
            }
        } else {
            await messagesToDelete.first().delete().catch(() => {});
            deletedCount = 1;
        }

        if (message && deletedCount > 0) {
            deletedCount = Math.max(0, deletedCount - 1);
        }

        const gifMsg = await channel.send(GIF_URL);
        setTimeout(() => gifMsg.delete().catch(() => {}), 5000);

    } catch (error) {
        console.error('Erro ao limpar mensagens:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro na Limpeza',
            'Ocorreu um erro ao tentar limpar as mensagens.',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}
