const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'lock',
    description: 'Locka o canal para que apenas membros com permissão possam escrever',
    
    slashData: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Locka o canal para que apenas membros com permissão possam escrever')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        const channel = message.channel;
        
        try {
            const everyoneRole = message.guild.roles.everyone;
            
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });
            
            const embed = createYakuzaEmbed(
                'Canal Bloqueado',
                `O canal foi **bloqueado**. Apenas membros com permissão podem enviar mensagens.`,
                colors.primary
            );
            
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao lockar canal:', error);
            message.reply('Erro ao lockar o canal. Verifique minhas permissões.');
        }
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed) {
        const channel = interaction.channel;
        
        try {
            const everyoneRole = interaction.guild.roles.everyone;
            
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });
            
            const embed = createYakuzaEmbed(
                'Canal Bloqueado',
                `O canal foi **bloqueado**. Apenas membros com permissão podem enviar mensagens.`,
                colors.primary
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao lockar canal:', error);
            interaction.reply('Erro ao lockar o canal. Verifique minhas permissões.');
        }
    }
};
