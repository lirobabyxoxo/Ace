const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPainelConfig } = require('./painel.cjs');

module.exports = {
    name: 'sosban',
    description: 'Comando de emergência para banir ignorando hierarquia.',
    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        // Limite apenas para o desenvolvedor principal
        const devId = '1427437680504864870';
        if (message.author.id !== devId) {
            return message.reply('Este comando é exclusivo para o desenvolvedor em situações de emergência.');
        }

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) {
            return message.reply('Mencione um usuário válido ou forneça o ID.');
        }

        if (target.id === message.author.id) {
            return message.reply('Você não pode banir a si mesmo.');
        }

        if (target.id === client.user.id) {
            return message.reply('Eu não posso me banir.');
        }

        const reason = args.slice(1).join(' ') || 'Emergência (SOS Ban)';

        try {
            // O segredo aqui é usar o método ban() do membro diretamente.
            // O bot ainda precisa ter um cargo acima do alvo para conseguir banir via API,
            // mas este comando ignora a verificação de hierarquia do DISCORD.JS entre o autor e o alvo.
            await target.ban({ reason: `SOS Ban por ${message.author.tag}: ${reason}` });

            const successEmbed = createYakuzaEmbed(
                'BAN EXECUTADO',
                `**Usuário:** ${target.user.tag} (${target.id})\n**Motivo:** ${reason}\n**Executor:** ${message.author.tag}`,
                colors.error
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
        } catch (error) {
            console.error(error);
            message.reply('Não foi possível banir o usuário. Verifique se meu cargo está acima do dele.');
        }
    }
};
