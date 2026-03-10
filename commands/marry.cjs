const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const marriagesFile = path.join(__dirname, '..', 'data', 'marriages.json');

function loadMarriages() {
    try {
        if (fs.existsSync(marriagesFile)) {
            const data = fs.readFileSync(marriagesFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao carregar casamentos:', error);
    }
    return {};
}

function saveMarriages(marriages) {
    try {
        fs.writeFileSync(marriagesFile, JSON.stringify(marriages, null, 2));
    } catch (error) {
        console.error('Erro ao salvar casamentos:', error);
    }
}

function findMarriage(userId) {
    const marriages = loadMarriages();
    for (const key in marriages) {
        const marriage = marriages[key];
        if (marriage.status === 'casado' && (marriage.user1 === userId || marriage.user2 === userId)) {
            return { key, marriage };
        }
    }
    return null;
}

function getPartner(marriage, userId) {
    return marriage.user1 === userId ? marriage.user2 : marriage.user1;
}

function getDaysSince(dateString) {
    const marriageDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - marriageDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getTimeSince(dateString) {
    const marriageDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - marriageDate);

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
}

module.exports = {
    name: 'marry',
    aliases: ['casar', 'casamento'],
    description: 'Sistema de casamento',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (args[0] && args[0].toLowerCase() === 'top') {
            return this.showTop(message, client, colors, createYakuzaEmbed);
        }

        const target = message.mentions.users.first();

        const authorMarriage = findMarriage(message.author.id);

        if (!target) {
            if (authorMarriage) {
                const partnerId = getPartner(authorMarriage.marriage, message.author.id);
                const time = getTimeSince(authorMarriage.marriage.date);
                const embed = new EmbedBuilder()
                    .setDescription(`Casado(a) com <@${partnerId}>\n ${time.days} dias, ${time.hours} horas e ${time.minutes} minutos.`)
                    .setColor(colors.primary);
                return message.reply({ embeds: [embed] });
            } else {
                const embed = createYakuzaEmbed(
                    'Sozinho(a)',
                    `> *😔 | ${message.author}, você está sozinho(a).*`,
                    colors.primary
                );
                return message.reply({ embeds: [embed] });
            }
        }

        if (target.id === message.author.id) {
            const embed = createYakuzaEmbed(
                'Amor Próprio',
                `💕 | ${message.author}, o amor próprio é lindo, mas vai arrumar alguém!`,
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        if (target.bot) {
            const embed = createYakuzaEmbed(
                'Erro',
                `❌ | ${message.author}, você não pode casar com um bot!`,
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        if (authorMarriage) {
            const partnerId = getPartner(authorMarriage.marriage, message.author.id);
            const time = getTimeSince(authorMarriage.marriage.date);
            const embed = createYakuzaEmbed(
                'Já Casado(a)',
                `Você já é casado(a) com <@${partnerId}>\n **${time.days}** dias, **${time.hours}** horas e **${time.minutes}** minutos.`,
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        const targetMarriage = findMarriage(target.id);
        if (targetMarriage) {
            const partnerId = getPartner(targetMarriage.marriage, target.id);
            const time = getTimeSince(targetMarriage.marriage.date);
            const embed = createYakuzaEmbed(
                'Pessoa Casada',
                `💍 | ${target} já é casado(a) com <@${partnerId}>\n⏰ | Há **${time.days}** dias, **${time.hours}** horas e **${time.minutes}** minutos.`,
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        const proposalEmbed = new EmbedBuilder()
            .setTitle('💌 Pedido de Casamento')
            .setDescription(`${message.author} pediu ${target} em casamento!\nVocê aceita?`)
            .setColor(colors.primary)
            .setFooter({ text: ' — by liro' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`marry_accept_${message.author.id}_${target.id}`)
                    .setLabel('💗 SIM')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`marry_reject_${message.author.id}_${target.id}`)
                    .setLabel('💔 NÃO')
                    .setStyle(ButtonStyle.Danger)
            );

        const proposalMessage = await message.reply({ embeds: [proposalEmbed], components: [row] });

        const filter = (i) => {
            return i.customId.startsWith('marry_') &&
                (i.customId.includes(message.author.id) && i.customId.includes(target.id)) &&
                i.user.id === target.id;
        };

        const collector = proposalMessage.createMessageComponentCollector({
            filter,
            time: 60000,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId.startsWith('marry_accept_')) {
                const authorMarriageNow = findMarriage(message.author.id);
                const targetMarriageNow = findMarriage(target.id);

                if (authorMarriageNow) {
                    const errorEmbed = createYakuzaEmbed(
                        'Pedido Expirado',
                        `❌ | ${message.author} já se casou com outra pessoa!`,
                        colors.error
                    );
                    return await interaction.update({ embeds: [errorEmbed], components: [] });
                }

                if (targetMarriageNow) {
                    const errorEmbed = createYakuzaEmbed(
                        'Pedido Expirado',
                        `❌ | ${target} já se casou com outra pessoa!`,
                        colors.error
                    );
                    return await interaction.update({ embeds: [errorEmbed], components: [] });
                }

                const marriages = loadMarriages();
                const marriageKey = `${message.author.id}_${target.id}`;

                marriages[marriageKey] = {
                    user1: message.author.id,
                    user2: target.id,
                    date: new Date().toISOString(),
                    status: 'casado'
                };

                saveMarriages(marriages);

                const successEmbed = createYakuzaEmbed(
                    'Casamento Realizado',
                    `💞 | ${message.author} e ${target} agora estão casados!\nDesejo felicidades ao casal 💍`,
                    colors.success
                );

                await interaction.update({ embeds: [successEmbed], components: [] });

            } else if (interaction.customId.startsWith('marry_reject_')) {
                const rejectEmbed = createYakuzaEmbed(
                    'Pedido Recusado',
                    `💔 | ${target} não aceitou seu pedido de casamento…`,
                    colors.error
                );

                await interaction.update({ embeds: [rejectEmbed], components: [] });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutEmbed = createYakuzaEmbed(
                    'Tempo Esgotado',
                    `⏰ | ${target} não respondeu ao pedido de casamento a tempo.`,
                    colors.warning
                );

                proposalMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => { });
            }
        });
    },

    async showTop(message, client, colors, createYakuzaEmbed) {
        const marriages = loadMarriages();
        const allMarriages = Object.values(marriages);

        const activeMarriages = allMarriages.filter(m => m.status === 'casado');
        activeMarriages.sort((a, b) => new Date(a.date) - new Date(b.date));

        const top5 = activeMarriages.slice(0, 5);

        if (top5.length === 0) {
            const embed = createYakuzaEmbed(
                '🏆 Ranking de Casais',
                'Nenhum casamento ativo registrado.',
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        let description = '';
        for (let i = 0; i < top5.length; i++) {
            const marriage = top5[i];
            const time = getTimeSince(marriage.date);

            description += `**${i + 1}.** <@${marriage.user1}> + <@${marriage.user2}>\n⏰ ${time.days} dias, ${time.hours}h e ${time.minutes}min\n\n`;
        }

        const embed = createYakuzaEmbed(
            '🏆 Ranking de Casais',
            description,
            colors.primary
        );

        return message.reply({ embeds: [embed] });
    }
};
