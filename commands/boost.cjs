const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const boostConfigFile = path.join(dataDir, 'boostConfig.json');
const boosterRolesFile = path.join(dataDir, 'boosterRoles.json');

function getBoostConfig(guildId) {
    try {
        if (fs.existsSync(boostConfigFile)) {
            const data = JSON.parse(fs.readFileSync(boostConfigFile, 'utf8'));
            return data[guildId] || { rolePosition: null };
        }
    } catch (error) {
        console.error('> *erro ao carregar config de boost:*', error);
    }
    return { rolePosition: null };
}

function saveBoostConfig(guildId, config) {
    try {
        let data = {};
        if (fs.existsSync(boostConfigFile)) {
            data = JSON.parse(fs.readFileSync(boostConfigFile, 'utf8'));
        }
        data[guildId] = config;
        fs.writeFileSync(boostConfigFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('> *Erro ao salvar config de boost:*', error);
    }
}

function getBoosterRoles(guildId) {
    try {
        if (fs.existsSync(boosterRolesFile)) {
            const data = JSON.parse(fs.readFileSync(boosterRolesFile, 'utf8'));
            return data[guildId] || {};
        }
    } catch (error) {
        console.error('Erro ao carregar cargos de booster:', error);
    }
    return {};
}

function saveBoosterRoles(guildId, roles) {
    try {
        let data = {};
        if (fs.existsSync(boosterRolesFile)) {
            data = JSON.parse(fs.readFileSync(boosterRolesFile, 'utf8'));
        }
        data[guildId] = roles;
        fs.writeFileSync(boosterRolesFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar cargos de booster:', error);
    }
}

function getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

module.exports = {
    name: 'boost',
    aliases: ['booster', 'vip', 'b'],
    description: 'Sistema de boost - personalize seu cargo de booster',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const member = message.member;
        const guild = message.guild;

        if (!member.premiumSince) {
            const embed = createYakuzaEmbed(
                '<a:KFFW_preto_time:1434736472421957723>',
                `>  *Você não possui boosts ativos neste servidor.*`,
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        const boosterRoles = getBoosterRoles(guild.id);
        let userRole = null;
        let userRoleId = boosterRoles[member.id];

        if (userRoleId) {
            userRole = guild.roles.cache.get(userRoleId);
            if (!userRole) {
                delete boosterRoles[member.id];
                saveBoosterRoles(guild.id, boosterRoles);
                userRoleId = null;
            }
        }

        if (!userRoleId) {
            const boostConfig = getBoostConfig(guild.id);
            try {
                const newRole = await guild.roles.create({
                    name: member.displayName,
                    color: '#000000',
                    reason: `Cargo de booster para ${member.user.tag}`
                });

                if (boostConfig.rolePosition) {
                    const referenceRole = guild.roles.cache.get(boostConfig.rolePosition);
                    if (referenceRole && referenceRole.position > 1) {
                        try {
                            await newRole.setPosition(referenceRole.position - 1);
                        } catch (posError) {
                            console.error('Erro ao posicionar cargo de booster:', posError);
                        }
                    }
                }

                await member.roles.add(newRole);
                
                boosterRoles[member.id] = newRole.id;
                saveBoosterRoles(guild.id, boosterRoles);
                
                userRole = newRole;
                userRoleId = newRole.id;
            } catch (error) {
                console.error('Erro ao criar cargo de booster:', error);
                const errorEmbed = createYakuzaEmbed(
                    'Erro',
                    `<a:KFFW_preto_time:1434736472421957723>  | Não foi possível criar seu cargo de booster. Verifique minhas permissões.`,
                    colors.error
                );
                return message.reply({ embeds: [errorEmbed] });
            }
        }

        const boostCount = member.premiumSince ? 1 : 0;
        const boostingSince = formatDate(member.premiumSince);
        const boostingDays = getDaysSince(member.premiumSince);
        const roleName = userRole ? userRole.name : 'Não definido';
        const roleColor = userRole ? `#${userRole.color.toString(16).padStart(6, '0')}` : '#ff73fa';

        const boostEmbed = new EmbedBuilder()
            .setTitle('PAINEL BOOSTER')
            .setDescription(`Obrigado por impulsionar o servidor!`)
            .setColor(userRole ? userRole.color : 0o0)
            .addFields([
                { name: ' `boost`', value: `${boostCount}`, inline: true },
                { name: '`impulsonou em`', value: boostingSince, inline: true },
                { name: ' `contagem` ', value: `${boostingDays} dias`, inline: true },
                { name: ' `cargo`', value: `<@&${userRoleId}>`, inline: true },
                { name: '`cor`', value: roleColor.toUpperCase(), inline: true }
            ])
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '-' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`boost_name_${member.id}`)
                    .setLabel('NOME')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`boost_color_${member.id}`)
                    .setLabel('COR')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`boost_icon_${member.id}`)
                    .setLabel('PNG')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`boost_cancel_${member.id}`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await message.reply({ embeds: [boostEmbed], components: [row] });
    },

    async handleButtonInteraction(interaction, client, config, colors, createYakuzaEmbed) {
        const { customId } = interaction;
        const userId = customId.split('_').pop();

        if (interaction.user.id !== userId) {
            return interaction.reply({
                content: '❌ | Você não pode usar este botão.',
                ephemeral: true
            });
        }

        const member = interaction.member;
        const guild = interaction.guild;
        const boosterRoles = getBoosterRoles(guild.id);
        const userRoleId = boosterRoles[member.id];

        if (!userRoleId) {
            return interaction.reply({
                content: '❌ | Você não tem um cargo de booster.',
                ephemeral: true
            });
        }

        const userRole = guild.roles.cache.get(userRoleId);
        if (!userRole) {
            return interaction.reply({
                content: '❌ | Seu cargo de booster não foi encontrado.',
                ephemeral: true
            });
        }

        if (customId.startsWith('boost_name_')) {
            const modal = new ModalBuilder()
                .setCustomId(`boost_modal_name_${member.id}`)
                .setTitle('Alterar Nome do Cargo');

            const nameInput = new TextInputBuilder()
                .setCustomId('boost_new_name')
                .setLabel('Qual nome deseja para seu cargo?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Digite o novo nome...')
                .setValue(userRole.name)
                .setRequired(true)
                .setMaxLength(100);

            modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
            await interaction.showModal(modal);

        } else if (customId.startsWith('boost_color_')) {
            const modal = new ModalBuilder()
                .setCustomId(`boost_modal_color_${member.id}`)
                .setTitle('Alterar Cor do Cargo');

            const colorInput = new TextInputBuilder()
                .setCustomId('boost_new_color')
                .setLabel('Envie um código HEX para a cor')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('#0o0')
                .setValue(`#${userRole.color.toString(16).padStart(6, '0')}`)
                .setRequired(true)
                .setMaxLength(7);

            modal.addComponents(new ActionRowBuilder().addComponents(colorInput));
            
            await interaction.showModal(modal);

            try {
                await interaction.followUp({
                    content: 'https://htmlcolorcodes.com',
                    ephemeral: true
                });
            } catch (e) {}

        } else if (customId.startsWith('boost_icon_')) {
            const guildLevel = guild.premiumTier;
            
            if (guildLevel < 2) {
                return interaction.reply({
                    content: 'o servidor ta falido kkk tem nem emoji de cargo tem nada..',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('Alterar Ícone do Cargo')
                .setDescription('Envie um **emoji** no chat para definir como ícone do seu cargo.\n\nVocê tem **30 segundos** para enviar.')
                .setColor(colors.primary)
                .setFooter({ text: 'Envie apenas UM emoji' });

            await interaction.reply({ embeds: [embed], ephemeral: true });

            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async (msg) => {
                const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
                const unicodeEmojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u;
                
                let emojiToUse = null;
                
                const customMatch = msg.content.match(emojiRegex);
                if (customMatch) {
                    const emojiId = customMatch[3];
                    const animated = customMatch[1] === 'a';
                    emojiToUse = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
                } else if (unicodeEmojiRegex.test(msg.content)) {
                    emojiToUse = msg.content.match(unicodeEmojiRegex)[0];
                }

                if (!emojiToUse) {
                    return msg.reply({
                        content: '> `❌ | Emoji inválido. Tente novamente com !boost`',
                        allowedMentions: { repliedUser: false }
                    });
                }

                try {
                    await msg.delete().catch(() => {});
                    
                    await userRole.setIcon(emojiToUse);
                    
                    const successEmbed = createYakuzaEmbed(
                        'Ícone Alterado',
                        `> *✅ | O ícone do seu cargo foi alterado com sucesso!*`,
                        colors.success
                    );
                    await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
                } catch (error) {
                    console.error('Erro ao alterar ícone:', error);
                    await interaction.followUp({
                        content: '> *❌ | Não foi possível alterar o ícone. Verifique se o emoji é válido.*',
                        ephemeral: true
                    });
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    interaction.followUp({
                        content: '> *⏰ | Tempo esgotado. Use !boost novamente.*',
                        ephemeral: true
                    }).catch(() => {});
                }
            });

        } else if (customId.startsWith('boost_cancel_')) {
            await interaction.update({
                content: '❌ | Operação cancelada.',
                embeds: [],
                components: []
            });
        }
    },

    async handleModalSubmit(interaction, client, config, colors, createYakuzaEmbed) {
        const { customId } = interaction;
        const member = interaction.member;
        const guild = interaction.guild;
        const boosterRoles = getBoosterRoles(guild.id);
        const userRoleId = boosterRoles[member.id];

        if (!userRoleId) {
            return interaction.reply({
                content: '❌ | Você não tem um cargo de booster.',
                ephemeral: true
            });
        }

        const userRole = guild.roles.cache.get(userRoleId);
        if (!userRole) {
            return interaction.reply({
                content: '❌ | Seu cargo de booster não foi encontrado.',
                ephemeral: true
            });
        }

        if (customId.startsWith('boost_modal_name_')) {
            const newName = interaction.fields.getTextInputValue('boost_new_name');
            
            try {
                await userRole.setName(newName);
                
                const successEmbed = createYakuzaEmbed(
                    'Nome Alterado',
                    `✅ | O nome do seu cargo foi alterado para **${newName}**!`,
                    colors.success
                );
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            } catch (error) {
                console.error('Erro ao alterar nome:', error);
                await interaction.reply({
                    content: '❌ | Não foi possível alterar o nome do cargo.',
                    ephemeral: true
                });
            }

        } else if (customId.startsWith('boost_modal_color_')) {
            let newColor = interaction.fields.getTextInputValue('boost_new_color');
            
            if (!newColor.startsWith('#')) {
                newColor = '#' + newColor;
            }

            if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                return interaction.reply({
                    content: '❌ | Cor inválida. Use o formato HEX (ex: #ff73fa)',
                    ephemeral: true
                });
            }

            try {
                await userRole.setColor(newColor);
                
                const successEmbed = createYakuzaEmbed(
                    'Cor Alterada',
                    `✅ | A cor do seu cargo foi alterada para **${newColor.toUpperCase()}**!`,
                    parseInt(newColor.replace('#', ''), 16)
                );
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            } catch (error) {
                console.error('Erro ao alterar cor:', error);
                await interaction.reply({
                    content: '❌ | Não foi possível alterar a cor do cargo.',
                    ephemeral: true
                });
            }
        }
    },

    getBoostConfig,
    saveBoostConfig,
    getBoosterRoles,
    saveBoosterRoles
};
