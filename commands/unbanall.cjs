const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPainelConfig } = require('./painel.cjs');

module.exports = {
    name: 'unbanall',
    description: 'Desbane todos os usuários banidos do servidor.',
    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        // Limite apenas para quem tem a permissão de banir (ou flag específica conforme solicitado)
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers) && message.author.id !== '1427437680504864870') {
            return message.reply('Você não tem permissão para desbanir usuários.');
        }

        try {
            const bans = await message.guild.bans.fetch();
            if (bans.size === 0) {
                return message.reply('Não há nenhum usuário banido neste servidor.');
            }

            const confirmEmbed = createYakuzaEmbed(
                '⚠️ DESBANIR TODOS',
                `Existem **${bans.size}** usuários banidos. Tem certeza que deseja desbanir todos?\nEnvie \`confirmar\` no chat em 30 segundos para prosseguir.`,
                colors.warning
            );

            const confirmMsg = await message.reply({ embeds: [confirmEmbed] });

            const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'confirmar';
            const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async () => {
                let count = 0;
                let errorCount = 0;

                const processingEmbed = createYakuzaEmbed(
                    '⚙️ PROCESSANDO',
                    `Iniciando desbanimento de **${bans.size}** usuários...`,
                    colors.accent
                );
                await confirmMsg.edit({ embeds: [processingEmbed] });

                for (const ban of bans.values()) {
                    try {
                        await message.guild.members.unban(ban.user.id, `Unban All por ${message.author.tag}`);
                        count++;
                    } catch (err) {
                        console.error(`Erro ao desbanir ${ban.user.id}:`, err);
                        errorCount++;
                    }
                }

                const successEmbed = createYakuzaEmbed(
                    '✅ UNBAN ALL EXECUTADO',
                    `**Sucesso:** ${count} usuários desbanidos.\n**Falhas:** ${errorCount}\n**Executor:** ${message.author.tag}`,
                    colors.success
                );

                await message.reply({ embeds: [successEmbed] });

                // Tentar enviar log se configurado
                const painelConfig = getPainelConfig(message.guild.id);
                if (painelConfig.channels.logsModeracao) {
                    const logChannel = message.guild.channels.cache.get(painelConfig.channels.logsModeracao);
                    if (logChannel) {
                        logChannel.send({ embeds: [successEmbed] });
                    }
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    confirmMsg.edit({ content: 'Tempo expirado. Operação cancelada.', embeds: [] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error(error);
            message.reply('Houve um erro ao buscar a lista de banidos.');
        }
    }
};
