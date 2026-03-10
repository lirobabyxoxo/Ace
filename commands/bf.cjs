const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bfFile = path.join(__dirname, '..', 'data', 'bestfriends.json');

function loadBFs() {
    try {
        if (fs.existsSync(bfFile)) {
            const data = fs.readFileSync(bfFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao carregar best friends:', error);
    }
    return {};
}

function saveBFs(bfs) {
    try {
        fs.writeFileSync(bfFile, JSON.stringify(bfs, null, 2));
    } catch (error) {
        console.error('Erro ao salvar best friends:', error);
    }
}

function findBF(userId) {
    const bfs = loadBFs();
    for (const key in bfs) {
        const bf = bfs[key];
        if (bf.status === 'bf' && (bf.user1 === userId || bf.user2 === userId)) {
            return { key, bf };
        }
    }
    return null;
}

function getPartner(bf, userId) {
    return bf.user1 === userId ? bf.user2 : bf.user1;
}

function getTimeSince(dateString) {
    const startDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - startDate);

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
}

module.exports = {
    name: 'bf',
    aliases: ['bestfriend', 'melhoramigo'],
    description: 'Sistema de melhor amigo',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (args[0] && args[0].toLowerCase() === 'top') {
            return this.showTop(message, client, colors, createYakuzaEmbed);
        }

        const target = message.mentions.users.first();

        const authorBF = findBF(message.author.id);

        if (!target) {
            if (authorBF) {
                const partnerId = getPartner(authorBF.bf, message.author.id);
                const time = getTimeSince(authorBF.bf.date);
                const embed = new EmbedBuilder()
                    .setDescription(`Melhor amigo(a): <@${partnerId}>\n ${time.days} dias, ${time.hours} horas e ${time.minutes} minutos.`)
                    .setColor(colors.primary);
                return message.reply({ embeds: [embed] });
            } else {
                const embed = createYakuzaEmbed(
                    'Sem Melhor Amigo',
                    `> *${message.author}, voce ainda nao tem um melhor amigo(a).*`,
                    colors.primary
                );
                return message.reply({ embeds: [embed] });
            }
        }

        if (target.id === message.author.id) {
            const embed = createYakuzaEmbed(
                'Erro',
                `${message.author}, voce nao pode ser seu proprio melhor amigo!`,
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        if (target.bot) {
            const embed = createYakuzaEmbed(
                'Erro',
                `${message.author}, voce nao pode adicionar um bot como melhor amigo!`,
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        if (authorBF) {
            const partnerId = getPartner(authorBF.bf, message.author.id);
            const time = getTimeSince(authorBF.bf.date);
            const embed = createYakuzaEmbed(
                'Ja tem Melhor Amigo',
                `Voce ja tem <@${partnerId}> como melhor amigo(a)!\n **${time.days}** dias, **${time.hours}** horas e **${time.minutes}** minutos.`,
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        const targetBF = findBF(target.id);
        if (targetBF) {
            const partnerId = getPartner(targetBF.bf, target.id);
            const time = getTimeSince(targetBF.bf.date);
            const embed = createYakuzaEmbed(
                'Pessoa Ja Tem BF',
                `${target} ja tem <@${partnerId}> como melhor amigo(a)!\nHa **${time.days}** dias, **${time.hours}** horas e **${time.minutes}** minutos.`,
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        const proposalEmbed = new EmbedBuilder()
            .setTitle('Pedido de Melhor Amigo')
            .setDescription(`${message.author} quer ser melhor amigo(a) de ${target}!\nVoce aceita?`)
            .setColor(colors.primary)
            .setFooter({ text: ' — Ace Bot' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bf_accept_${message.author.id}_${target.id}`)
                    .setLabel('SIM')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`bf_reject_${message.author.id}_${target.id}`)
                    .setLabel('NAO')
                    .setStyle(ButtonStyle.Danger)
            );

        const proposalMessage = await message.reply({ embeds: [proposalEmbed], components: [row] });

        const filter = (i) => {
            return i.customId.startsWith('bf_') &&
                (i.customId.includes(message.author.id) && i.customId.includes(target.id)) &&
                i.user.id === target.id;
        };

        const collector = proposalMessage.createMessageComponentCollector({
            filter,
            time: 60000,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId.startsWith('bf_accept_')) {
                const authorBFNow = findBF(message.author.id);
                const targetBFNow = findBF(target.id);

                if (authorBFNow) {
                    const errorEmbed = createYakuzaEmbed(
                        'Pedido Expirado',
                        `${message.author} ja adicionou outro melhor amigo!`,
                        colors.error
                    );
                    return await interaction.update({ embeds: [errorEmbed], components: [] });
                }

                if (targetBFNow) {
                    const errorEmbed = createYakuzaEmbed(
                        'Pedido Expirado',
                        `${target} ja adicionou outro melhor amigo!`,
                        colors.error
                    );
                    return await interaction.update({ embeds: [errorEmbed], components: [] });
                }

                const bfs = loadBFs();
                const bfKey = `${message.author.id}_${target.id}`;

                bfs[bfKey] = {
                    user1: message.author.id,
                    user2: target.id,
                    date: new Date().toISOString(),
                    status: 'bf'
                };

                saveBFs(bfs);

                const successEmbed = createYakuzaEmbed(
                    'Melhores Amigos',
                    `${message.author} e ${target} agora sao melhores amigos!`,
                    colors.success
                );

                await interaction.update({ embeds: [successEmbed], components: [] });

            } else if (interaction.customId.startsWith('bf_reject_')) {
                const rejectEmbed = createYakuzaEmbed(
                    'Pedido Recusado',
                    `${target} nao aceitou seu pedido de melhor amigo...`,
                    colors.error
                );

                await interaction.update({ embeds: [rejectEmbed], components: [] });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutEmbed = createYakuzaEmbed(
                    'Tempo Esgotado',
                    `${target} nao respondeu ao pedido de melhor amigo a tempo.`,
                    colors.warning
                );

                proposalMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => { });
            }
        });
    },

    async showTop(message, client, colors, createYakuzaEmbed) {
        const bfs = loadBFs();
        const allBFs = Object.values(bfs);

        const activeBFs = allBFs.filter(b => b.status === 'bf');
        activeBFs.sort((a, b) => new Date(a.date) - new Date(b.date));

        const top5 = activeBFs.slice(0, 5);

        if (top5.length === 0) {
            const embed = createYakuzaEmbed(
                'Ranking de Melhores Amigos',
                'Nenhuma amizade ativa registrada.',
                colors.primary
            );
            return message.reply({ embeds: [embed] });
        }

        let description = '';
        for (let i = 0; i < top5.length; i++) {
            const bf = top5[i];
            const time = getTimeSince(bf.date);

            description += `**${i + 1}.** <@${bf.user1}> + <@${bf.user2}>\n${time.days} dias, ${time.hours}h e ${time.minutes}min\n\n`;
        }

        const embed = createYakuzaEmbed(
            'Ranking de Melhores Amigos',
            description,
            colors.primary
        );

        return message.reply({ embeds: [embed] });
    }
};
