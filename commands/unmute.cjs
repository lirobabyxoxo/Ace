const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: 'Desmutar um usuário',
    
    slashData: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Desmutar um usuário')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('Usuário a ser desmutado')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = createYakuzaEmbed(
                'Sem Permissão',
                'Você não tem permissão para desmutar membros.',
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

        await unmuteUser(member, message.author, message, null, colors, createYakuzaEmbed);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        const user = interaction.options.getUser('usuário');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            const errorEmbed = createYakuzaEmbed(
                'Membro Não Encontrado',
                'Este usuário não está no servidor.',
                colors.error
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await unmuteUser(member, interaction.user, null, interaction, colors, createYakuzaEmbed);
    }
};

async function unmuteUser(member, executor, message, interaction, colors, createYakuzaEmbed) {
    try {
        if (!member.isCommunicationDisabled()) {
            const errorEmbed = createYakuzaEmbed(
                'Usuário Não Mutado',
                'Este usuário não está mutado.',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [errorEmbed] });
            } else {
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }

        // Executar o unmute
        await member.timeout(null, `Desmutado por: ${executor.tag}`);

        // Tentar enviar DM
        try {
            const dmEmbed = createYakuzaEmbed(
                '🔊 Você foi desmutado!',
                `**Servidor:** ${member.guild.name}\n**Moderador:** ${executor.tag}`,
                colors.success
            );
            await member.user.send({ embeds: [dmEmbed] });
        } catch (error) {
            // Ignorar se não conseguir enviar DM
        }

        // Embed de confirmação
        const successEmbed = createYakuzaEmbed(
            '🔊 Usuário Desmutado',
            `**Usuário:** ${member.user.tag} (${member.user.id})\n⚡ **Moderador:** ${executor.tag}`,
            colors.success
        );

        if (message) {
            await message.reply({ embeds: [successEmbed] });
        } else {
            await interaction.reply({ embeds: [successEmbed] });
        }

    } catch (error) {
        console.error('Erro ao desmutar usuário:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro no Unmute',
            'Ocorreu um erro ao tentar desmutar o usuário.',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}