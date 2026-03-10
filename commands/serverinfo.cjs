const { 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder 
} = require('discord.js');

module.exports = {
    name: 'serverinfo',
    aliases: ['si', 'server', 'guildinfo'],
    description: 'Mostrar informações detalhadas do servidor',

    slashData: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Mostrar informações detalhadas do servidor'),

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        await showServerInfo(message.guild, message, null, colors, createYakuzaEmbed);
    },

    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        await showServerInfo(interaction.guild, null, interaction, colors, createYakuzaEmbed);
    }
};

async function showServerInfo(guild, message, interaction, colors, createYakuzaEmbed) {
    try {
        const fetchedGuild = await guild.fetch();

        const serverEmbed = createYakuzaEmbed(
            `**| Informações do Servidor**`,
            null,
            colors.accent
        );

        // Thumbnail = ícone
        if (fetchedGuild.iconURL()) {
            serverEmbed.setThumbnail(
                fetchedGuild.iconURL({ dynamic: true, size: 512 })
            );
        }

        // Banner = imagem principal
        if (fetchedGuild.bannerURL()) {
            serverEmbed.setImage(
                fetchedGuild.bannerURL({ size: 2048, extension: "png" })
            );
        }

        // Campos
        serverEmbed.addFields(
            {
                name: '`registro',
                value: [
                    `**Nome:** ${fetchedGuild.name}`,
                    `**ID:** ${fetchedGuild.id}`,
                    `**Dono:** <@${fetchedGuild.ownerId}>`,
                    `**Criado em:** <t:${Math.floor(fetchedGuild.createdTimestamp / 1000)}:D>`
                ].join('\n'),
                inline: false
            },
            {
                name: '`estatísticas`',
                value: [
                    `**Membros:** ${fetchedGuild.memberCount}`,
                    `**Canais:** ${fetchedGuild.channels.cache.size}`,
                    `**Boosts:** ${fetchedGuild.premiumSubscriptionCount}`,
                    `**Nível Boost:** ${fetchedGuild.premiumTier}`
                ].join('\n'),
                inline: false
            }
        );


        // BOTÃO ÚNICO DE DOWNLOAD
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`server_download_${guild.id}`)
                .setLabel('DOWNLOAD')
                .setStyle(ButtonStyle.Secondary)
        );

        if (message) {
            return message.reply({ embeds: [serverEmbed], components: [buttons] });
        } else {
            return interaction.reply({ embeds: [serverEmbed], components: [buttons] });
        }

    } catch (error) {
        console.error('Erro em serverinfo:', error);

        const errorEmbed = createYakuzaEmbed(
            'Erro',
            '> `Não foi possível obter as informações do servidor.`',
            colors.error
        );

        if (message) {
            return message.reply({ embeds: [errorEmbed] });
        } else {
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}
