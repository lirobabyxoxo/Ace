const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const statsFilePath = path.join(__dirname, '..', 'data', 'server_stats.json');

function loadStats() {
    try {
        if (fs.existsSync(statsFilePath)) {
            return JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
        }
    } catch (e) {
        console.error('Erro ao carregar stats:', e);
    }
    return {};
}

module.exports = {
    name: 'stats',
    description: 'Mostra estatísticas do servidor.',
    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        await this.showStats(message, 'diario', colors, createYakuzaEmbed);
    },

    async showStats(context, period, colors, createYakuzaEmbed, interaction = null) {
        const stats = loadStats();
        const guildId = context.guild.id;
        const guildStats = stats[guildId] || { daily: {}, weekly: {}, monthly: {} };
        
        let data;
        let title;
        
        if (period === 'diario') {
            data = guildStats.daily || {};
            title = 'Estatísticas Diárias';
        } else if (period === 'semanal') {
            data = guildStats.weekly || {};
            title = 'Estatísticas Semanais (7 dias)';
        } else {
            data = guildStats.monthly || {};
            title = 'Estatísticas Mensais (28 dias)';
        }

        const embed = createYakuzaEmbed(
            title,
            `**Mensagens:** \`${data.messages || 0}\`\n` +
            `**Mídias:** \`${data.media || 0}\`\n` +
            `**Entradas:** \`${data.joins || 0}\`\n` +
            `**Saídas:** \`${data.leaves || 0}\``,
            colors.primary
        ).setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('stats_diario').setLabel('DIÁRIO').setStyle(ButtonStyle.Primary).setDisabled(period === 'diario'),
            new ButtonBuilder().setCustomId('stats_semanal').setLabel('SEMANAL').setStyle(ButtonStyle.Primary).setDisabled(period === 'semanal'),
            new ButtonBuilder().setCustomId('stats_mensal').setLabel('MENSAL').setStyle(ButtonStyle.Primary).setDisabled(period === 'mensal'),
            new ButtonBuilder().setCustomId('stats_fechar').setLabel('FECHAR').setStyle(ButtonStyle.Danger)
        );

        if (interaction) {
            await interaction.update({ embeds: [embed], components: [row] });
        } else {
            await context.reply({ embeds: [embed], components: [row] });
        }
    },

    async handleInteraction(interaction, colors, createYakuzaEmbed) {
        if (interaction.customId === 'stats_fechar') {
            return await interaction.message.delete().catch(() => {});
        }
        
        const period = interaction.customId.replace('stats_', '');
        await this.showStats(interaction, period, colors, createYakuzaEmbed, interaction);
    }
};
