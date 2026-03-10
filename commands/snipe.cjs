const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'snipe',
    aliases: ['s'],
    description: 'Mostra a última mensagem apagada no canal',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const snipe = client.snipes.get(message.channel.id);

        if (!snipe) {
            const embed = createYakuzaEmbed(
                'Snipe',
                '❌ | Não há mensagens apagadas recentemente neste canal.',
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        const timeSince = Math.floor((Date.now() - snipe.deletedAt) / 1000);
        let timeString;
        
        if (timeSince < 60) {
            timeString = `${timeSince} segundos atrás`;
        } else if (timeSince < 3600) {
            timeString = `${Math.floor(timeSince / 60)} minutos atrás`;
        } else {
            timeString = `${Math.floor(timeSince / 3600)} horas atrás`;
        }

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: snipe.author.tag, 
                iconURL: snipe.author.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(snipe.content || '*Sem conteúdo de texto*')
            .setColor(colors.primary)
            .setFooter({ text: `Apagada ${timeString}` })
            .setTimestamp(snipe.deletedAt);

        if (snipe.attachments) {
            embed.setImage(snipe.attachments);
        }

        return message.reply({ embeds: [embed] });
    }
};
