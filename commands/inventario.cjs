const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'inventario',
    aliases: ['inv', 'i'],
    description: 'Visualizar e equipar seus itens comprados',

    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        await this.showInventory(message.guild.id, message.author, message, null, colors, createYakuzaEmbed);
    },

    async handleInteraction(interaction, client, colors, createYakuzaEmbed) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const gpointsSystem = require('./gpoints.cjs');

        if (interaction.isStringSelectMenu() && interaction.customId === 'inv_select_item') {
            const itemId = interaction.values[0];
            const userData = gpointsSystem.getUserGPoints(guildId, userId);
            const item = userData.inventory.find(i => i.id === itemId);

            if (!item) return interaction.reply({ content: 'Item não encontrado no seu inventário.', ephemeral: true });

            gpointsSystem.equipItem(guildId, userId, item);

            return await interaction.update({ 
                content: `✅ Você equipou: **${item.name}**!`, 
                embeds: [], 
                components: [] 
            });
        }

        if (interaction.isButton() && interaction.customId === 'inv_edit_aboutme') {
            await interaction.reply({ content: 'Digite seu novo **Sobre mim** (máximo 150 caracteres, 30 segundos):', ephemeral: true });

            const filter = m => m.author.id === userId;
            const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });

            collector.on('collect', async (msg) => {
                let bio = msg.content.trim();
                if (bio.length > 150) {
                    bio = bio.substring(0, 150);
                }
                const userData = gpointsSystem.getUserGPoints(guildId, userId);
                userData.aboutMe = bio;
                gpointsSystem.saveUserGPoints(guildId, userId, userData);
                try { await msg.delete().catch(() => {}); } catch (e) {}
                await interaction.followUp({ content: `✅ Seu **Sobre mim** foi atualizado para:\n> ${bio}`, ephemeral: true });
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.followUp({ content: '⏰ Tempo esgotado. Nenhuma alteração foi feita.', ephemeral: true }).catch(() => {});
                }
            });
            return;
        }
    },

    async showInventory(guildId, user, message, interaction, colors, createYakuzaEmbed) {
        const gpointsSystem = require('./gpoints.cjs');
        const userData = gpointsSystem.getUserGPoints(guildId, user.id);
        const inventory = userData.inventory || [];
        const currentBio = userData.aboutMe || '';

        const aboutMeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('inv_edit_aboutme')
                .setLabel('Editar Sobre mim')
                .setStyle(ButtonStyle.Secondary)
        );

        if (inventory.length === 0) {
            const emptyEmbed = createYakuzaEmbed('Editar Perfil', currentBio ? `**Sobre mim atual:** ${currentBio}\n\nVocê ainda não comprou nenhum item na Store.` : 'Você ainda não comprou nenhum item na Store.', colors.primary);
            if (message) return message.reply({ embeds: [emptyEmbed], components: [aboutMeButton] });
            if (interaction.replied || interaction.deferred) {
                return interaction.editReply({ embeds: [emptyEmbed], components: [aboutMeButton] });
            }
            return interaction.reply({ embeds: [emptyEmbed], components: [aboutMeButton], ephemeral: true });
        }

        const descParts = [];
        if (currentBio) descParts.push(`**Sobre mim atual:** ${currentBio}\n`);
        descParts.push('Selecione abaixo o item que deseja equipar (Banners, Cores, Selos ou Molduras):');

        const embed = new EmbedBuilder()
            .setTitle('Editar Perfil')
            .setDescription(descParts.join('\n'))
            .setColor(colors.primary)
            .setFooter({ text: ' — Ace Bot ' })
            .setTimestamp();

        const options = inventory.map(item => ({
            label: item.name,
            description: `Tipo: ${item.type}`,
            value: item.id
        }));

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('inv_select_item')
                .setPlaceholder('Selecione um item para equipar')
                .addOptions(options.slice(0, 25))
        );

        const components = [selectRow, aboutMeButton];

        if (message) {
            await message.reply({ embeds: [embed], components });
        } else {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components });
            } else {
                await interaction.reply({ embeds: [embed], components, ephemeral: true });
            }
        }
    }
};
