const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    description: 'Mostrar avatar de um usuário',
    
    slashData: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Mostrar avatar de um usuário')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('Usuário para mostrar o avatar')
                .setRequired(false)
        ),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const user = message.mentions.users.first() || 
                    (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || 
                    message.author;
        
        await showAvatar(user, message, null, message.guild, client, colors, createYakuzaEmbed);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        const user = interaction.options.getUser('usuário') || interaction.user;
        await showAvatar(user, null, interaction, interaction.guild, client, colors, createYakuzaEmbed);
    },

    async handleButtonInteraction(interaction, client, colors, createYakuzaEmbed) {
        const [action, userId] = interaction.customId.replace('avatar_', '').split('_');
        
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) {
                return interaction.update({ content: 'Usuário não encontrado.', embeds: [], components: [] });
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            
            if (action === 'principal') {
                // Mostrar avatar principal
                const avatarEmbed = createYakuzaEmbed(
                    `Avatar de ${user.username}`,
                    null,
                    colors.accent
                );
                
                const avatarURL = user.displayAvatarURL({ 
                    dynamic: true, 
                    size: 1024 
                });
                
                avatarEmbed.setImage(avatarURL);
                
                const replyOptions = { embeds: [avatarEmbed] };
                
                // Mostrar botão para avatar do servidor se existir
                if (member && member.avatar) {
                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`avatar_servidor_${userId}`)
                                .setLabel('Avatar do Servidor')
                                .setStyle(ButtonStyle.Primary)
                        );
                    replyOptions.components = [buttons];
                }
                
                await interaction.update(replyOptions);
                
            } else if (action === 'servidor') {
                // Mostrar avatar do servidor
                if (!member || !member.avatar) {
                    return interaction.update({ content: 'Este usuário não possui avatar do servidor.', embeds: [], components: [] });
                }
                
                const serverAvatarEmbed = createYakuzaEmbed(
                    `Avatar do Servidor de ${user.username}`,
                    null,
                    colors.accent
                );
                
                const serverAvatarURL = member.displayAvatarURL({ 
                    dynamic: true, 
                    size: 1024 
                });
                
                serverAvatarEmbed.setImage(serverAvatarURL);
                
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`avatar_principal_${userId}`)
                            .setLabel('Avatar Principal')
                            .setStyle(ButtonStyle.Primary)
                    );
                
                await interaction.update({ embeds: [serverAvatarEmbed], components: [buttons] });
            }
        } catch (error) {
            console.error('Erro ao alternar avatar:', error);
            await interaction.update({ content: 'Erro ao alterar avatar.', embeds: [], components: [] });
        }
    }
};

async function showAvatar(user, message, interaction, guild, client, colors, createYakuzaEmbed) {
    try {
        const avatarEmbed = createYakuzaEmbed(
            `Avatar de ${user.username}`,
            null,
            colors.accent
        );
        
        const avatarURL = user.displayAvatarURL({ 
            dynamic: true, 
            size: 1024 
        });
        
        avatarEmbed.setImage(avatarURL);
        
        const member = await guild.members.fetch(user.id).catch(() => null);
        const hasServerAvatar = member && member.avatar;
        
        const replyOptions = { embeds: [avatarEmbed] };
        
        if (hasServerAvatar) {
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`avatar_servidor_${user.id}`)
                        .setLabel('Avatar do Servidor')
                        .setStyle(ButtonStyle.Primary)
                );
            replyOptions.components = [buttons];
        }
        
        if (message) {
            await message.reply(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }
        
    } catch (error) {
        console.error('Erro ao mostrar avatar:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro',
            'Não foi possível obter o avatar deste usuário.',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}
