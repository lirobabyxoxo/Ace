const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Verificar latência do bot',
    
    slashData: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verificar latência do bot'),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const sent = await message.reply({ content: 'Calculando ping...' });
        
        const messagePing = sent.createdTimestamp - message.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);
        
        const pingEmbed = createYakuzaEmbed(
            '🏓 Pong!',
            `**Latência da Mensagem:** ${messagePing}ms\n🩸 **Latência da API:** ${apiPing}ms\n⚡ **Status:** ${getStatusEmoji(apiPing)} ${getStatusText(apiPing)}`,
            getPingColor(apiPing, colors)
        );
        
        await sent.edit({ content: null, embeds: [pingEmbed] });
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        await interaction.deferReply();
        
        const apiPing = Math.round(client.ws.ping);
        const responsePing = Date.now() - interaction.createdTimestamp;
        
        const pingEmbed = createYakuzaEmbed(
            '🏓 Pong!',
            `**Latência da Resposta:** ${responsePing}ms\n🩸 **Latência da API:** ${apiPing}ms\n⚡ **Status:** ${getStatusEmoji(apiPing)} ${getStatusText(apiPing)}`,
            getPingColor(apiPing, colors)
        );
        
        await interaction.editReply({ embeds: [pingEmbed] });
    }
};

function getPingColor(ping, colors) {
    if (ping < 100) return colors.success;
    if (ping < 200) return colors.accent;
    return colors.error;
}

function getStatusEmoji(ping) {
    if (ping < 100) return '🟢';
    if (ping < 200) return '🟡';
    return '🔴';
}

function getStatusText(ping) {
    if (ping < 100) return 'Excelente';
    if (ping < 200) return 'Bom';
    if (ping < 300) return 'Regular';
    return 'Ruim';
}