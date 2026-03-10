const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'unlock',
    description: 'Desbloqueia o canal para que todos possam escrever',
    
    slashData: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Desbloqueia o canal para que todos possam escrever')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        const channel = message.channel;
        
        try {
            const everyoneRole = message.guild.roles.everyone;
            
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null
            });
            
            const embed = createYakuzaEmbed(
                'Canal Desbloqueado',
                `O canal foi **desbloqueado**. Todos podem enviar mensagens novamente.`,
                colors.primary
            );
            
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao desbloquear canal:', error);
            message.reply('Erro ao desbloquear o canal. Verifique minhas permissões.');
        }
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed) {
        const channel = interaction.channel;
        
        try {
            const everyoneRole = interaction.guild.roles.everyone;
            
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null
            });
            
            const embed = createYakuzaEmbed(
                'Canal Desbloqueado',
                `O canal foi **desbloqueado**. Todos podem enviar mensagens novamente.`,
                colors.primary
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao desbloquear canal:', error);
            interaction.reply('Erro ao desbloquear o canal. Verifique minhas permissões.');
        }
    }
};
