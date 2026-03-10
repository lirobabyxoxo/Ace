const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setrole',
    description: 'Adiciona ou remove um cargo de um membro.',
    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        // Limite apenas para o desenvolvedor principal (Regra do SOS Ban)
        const devId = '1427437680504864870';
        if (message.author.id !== devId) {
            return message.reply('Este comando é exclusivo para o desenvolvedor em situações de emergência.');
        }

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) {
            return message.reply('Mencione um usuário válido ou forneça o ID.');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) {
            return message.reply('Mencione um cargo válido ou forneça o ID.');
        }

        // Ignorando hierarquia para o desenvolvedor, mas o bot ainda precisa de permissão técnica
        // Verificar se o cargo do bot está acima do cargo alvo para a API permitir a ação
        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply('Meu cargo não é alto o suficiente para gerenciar este cargo.');
        }

        try {
            if (target.roles.cache.has(role.id)) {
                await target.roles.remove(role);
                const embed = createYakuzaEmbed(
                    'Cargo Removido',
                    `O cargo **${role.name}** foi removido de ${target.user.tag}.`,
                    colors.primary
                );
                return message.reply({ embeds: [embed] });
            } else {
                await target.roles.add(role);
                const embed = createYakuzaEmbed(
                    'Cargo Adicionado',
                    `O cargo **${role.name}** foi adicionado a ${target.user.tag}.`,
                    colors.primary
                );
                return message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            message.reply('Houve um erro ao tentar gerenciar o cargo do usuário.');
        }
    }
};
