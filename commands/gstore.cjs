const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const gstoreFile = path.join(__dirname, '..', 'data', 'gstore.json');
const activeVipTestsFile = path.join(__dirname, '..', 'data', 'activeVipTests.json');
const gpointsSystem = require('./gpoints.cjs');
const { loadVipTests } = require('./viptest.cjs');
const { generateColorPreview } = require('../utils/profileCard.cjs');

function loadStore() {
    try {
        if (fs.existsSync(gstoreFile)) return JSON.parse(fs.readFileSync(gstoreFile, 'utf8'));
    } catch (e) {}
    return { items: [] };
}

function loadActiveVipTests(guildId) {
    try {
        if (fs.existsSync(activeVipTestsFile)) {
            const data = JSON.parse(fs.readFileSync(activeVipTestsFile, 'utf8'));
            return data[guildId] || [];
        }
    } catch (e) {}
    return [];
}

function saveActiveVipTest(guildId, entry) {
    let data = {};
    try { if (fs.existsSync(activeVipTestsFile)) data = JSON.parse(fs.readFileSync(activeVipTestsFile, 'utf8')); } catch (e) {}
    if (!data[guildId]) data[guildId] = [];
    data[guildId].push(entry);
    fs.writeFileSync(activeVipTestsFile, JSON.stringify(data, null, 2));
}

function formatDuration(ms) {
    if (ms >= 86400000) return Math.round(ms / 86400000) + 'd';
    if (ms >= 3600000) return Math.round(ms / 3600000) + 'h';
    return Math.round(ms / 60000) + 'm';
}

const categoryNames = {
    cor: 'Cores',
    banner: 'Banners',
    selo: 'Selos',
    moldura: 'Molduras'
};

async function buildItemEmbed(item, index, total, colors, userId) {
    const catName = categoryNames[item.type] || item.type;
    const embed = new EmbedBuilder()
        .setTitle(`${catName} - ${item.name}`)
        .setColor(colors.primary);

    let desc = '';
    if (item.description) desc += `${item.description}\n\n`;
    desc += `Preco: **${item.price}** Points`;
    embed.setDescription(desc);
    embed.setFooter({ text: `${index + 1}/${total}` });

    try {
        if (item.type === 'cor' && item.value) embed.setColor(item.value);
    } catch (e) {}

    let files = [];

    if (item.type === 'banner' && item.value) {
        embed.setImage(item.value);
    } else if (item.type === 'selo' && item.value) {
        embed.setThumbnail(item.value);
    } else if (item.type === 'moldura' && item.value) {
        embed.setImage(item.value);
    } else if (item.type === 'cor' && item.value) {
        const previewBuffer = await generateColorPreview(item.value);
        const attachment = new AttachmentBuilder(previewBuffer, { name: 'color_preview.png' });
        embed.setImage('attachment://color_preview.png');
        files.push(attachment);
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`store_prev_${item.type}_${index}_${userId}`)
            .setLabel('<')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === 0),
        new ButtonBuilder()
            .setCustomId(`store_buy_${item.id}_${userId}`)
            .setLabel('COMPRAR')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`store_next_${item.type}_${index}_${userId}`)
            .setLabel('>')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index >= total - 1)
    );

    return { embed, row, files };
}

module.exports = {
    name: 'gstore',
    aliases: ['store'],
    description: 'Loja de Points para customização do perfil',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const guildId = message.guild.id;
        const userId = message.author.id;
        const userData = gpointsSystem.getUserGPoints(guildId, userId);
        const userPoints = userData.gpoints || 0;

        const embed = new EmbedBuilder()
            .setTitle('Store - Customização de Perfil')
            .setDescription(`Seu saldo: **${userPoints}** Points\n\nEscolha uma categoria abaixo para ver os itens disponíveis:`)
            .setColor(colors.primary);

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gstore_category')
                .setPlaceholder('Selecione uma categoria')
                .addOptions([
                    { label: 'Cores', description: 'Cores para a embed do perfil', value: 'cor' },
                    { label: 'Banners', description: 'Imagens de fundo para o perfil', value: 'banner' },
                    { label: 'Selos', description: 'Emojis decorativos para o perfil', value: 'selo' },
                    { label: 'Molduras', description: 'Molduras decorativas para o avatar', value: 'moldura' },
                    { label: 'Cargos', description: 'Testes VIP disponíveis', value: 'cargos' }
                ])
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction, client, colors, createYakuzaEmbed) {
        if (interaction.isStringSelectMenu() && interaction.customId === 'gstore_category') {
            const category = interaction.values[0];

            if (category === 'cargos') {
                const guildId = interaction.guild.id;
                const vipTests = loadVipTests(guildId);
                if (vipTests.length === 0) {
                    return interaction.reply({ content: 'Nenhum teste VIP disponível no momento.', ephemeral: true });
                }
                const embed = new EmbedBuilder()
                    .setTitle('Loja - Cargos (Teste VIP)')
                    .setDescription('Escolha um teste VIP para comprar:')
                    .setColor(colors.primary);

                const rows = [];
                let currentRow = new ActionRowBuilder();
                vipTests.forEach((test, index) => {
                    if (index > 0 && index % 5 === 0) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
                    currentRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`viptest_buy_${test.id}`)
                            .setLabel(`Teste ${test.testRoleName} (${test.cost} Points - ${formatDuration(test.duration)})`)
                            .setStyle(ButtonStyle.Secondary)
                    );
                });
                if (currentRow.components.length > 0) rows.push(currentRow);
                return await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
            }

            const store = loadStore();
            const items = store.items.filter(i => i.type === category && i.active !== false);

            if (items.length === 0) {
                return interaction.reply({ content: 'Nenhum item disponível nesta categoria no momento.', ephemeral: true });
            }

            const userId = interaction.user.id;
            const { embed, row, files } = await buildItemEmbed(items[0], 0, items.length, colors, userId);
            return await interaction.reply({ embeds: [embed], components: [row], files, ephemeral: true });
        }

        if (interaction.isButton() && interaction.customId.startsWith('store_prev_')) {
            const parts = interaction.customId.split('_');
            const ownerId = parts[parts.length - 1];
            if (interaction.user.id !== ownerId) return interaction.reply({ content: 'Esses botoes nao sao seus.', ephemeral: true });

            const category = parts[2];
            const currentIndex = parseInt(parts[3]);
            const newIndex = currentIndex - 1;

            const store = loadStore();
            const items = store.items.filter(i => i.type === category && i.active !== false);
            if (newIndex < 0 || newIndex >= items.length) {
                return interaction.reply({ content: 'Item nao disponivel.', ephemeral: true });
            }

            const { embed, row, files } = await buildItemEmbed(items[newIndex], newIndex, items.length, colors, ownerId);
            return await interaction.update({ embeds: [embed], components: [row], files });
        }

        if (interaction.isButton() && interaction.customId.startsWith('store_next_')) {
            const parts = interaction.customId.split('_');
            const ownerId = parts[parts.length - 1];
            if (interaction.user.id !== ownerId) return interaction.reply({ content: 'Esses botoes nao sao seus.', ephemeral: true });

            const category = parts[2];
            const currentIndex = parseInt(parts[3]);
            const newIndex = currentIndex + 1;

            const store = loadStore();
            const items = store.items.filter(i => i.type === category && i.active !== false);
            if (newIndex < 0 || newIndex >= items.length) {
                return interaction.reply({ content: 'Item nao disponivel.', ephemeral: true });
            }

            const { embed, row, files } = await buildItemEmbed(items[newIndex], newIndex, items.length, colors, ownerId);
            return await interaction.update({ embeds: [embed], components: [row], files });
        }

        if (interaction.isButton() && interaction.customId.startsWith('store_buy_')) {
            const parts = interaction.customId.split('_');
            const ownerId = parts[parts.length - 1];
            if (interaction.user.id !== ownerId) return interaction.reply({ content: 'Esses botoes nao sao seus.', ephemeral: true });

            const itemId = parts.slice(2, parts.length - 1).join('_');
            const store = loadStore();
            const item = store.items.find(i => i.id === itemId);
            if (!item) return interaction.reply({ content: 'Item nao encontrado.', ephemeral: true });

            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const userData = gpointsSystem.getUserGPoints(guildId, userId);
            const userPoints = userData.gpoints || 0;

            if (userData.inventory && userData.inventory.some(i => i.id === item.id)) {
                return interaction.reply({ content: 'Voce ja possui este item em seu inventario!', ephemeral: true });
            }
            if (userPoints < item.price) {
                return interaction.reply({ content: `Falta: **${item.price - userPoints}** Points.`, ephemeral: true });
            }

            const confirmEmbed = new EmbedBuilder()
                .setTitle('Confirmar Compra')
                .setDescription(`Deseja comprar **${item.name}** por **${item.price}** Points?`)
                .setColor(0xFFFF00);
            if (item.type === 'banner' && item.value) {
                confirmEmbed.setImage(item.value);
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`conf_buy_${item.id}_${userId}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`cancel_buy_${userId}`).setLabel('Cancelar').setStyle(ButtonStyle.Danger)
            );
            await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
        }
    },

    async handleVipTestPurchase(interaction, client, colors, createYakuzaEmbed) {
        const testId = interaction.customId.replace('viptest_buy_', '');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const vipTests = loadVipTests(guildId);
        const test = vipTests.find(t => t.id === testId);

        if (!test) return interaction.reply({ content: 'Teste VIP não encontrado.', ephemeral: true });

        const userData = gpointsSystem.getUserGPoints(guildId, userId);
        const userPoints = userData.gpoints || 0;

        const activeTests = loadActiveVipTests(guildId);
        const alreadyActive = activeTests.find(a => a.userId === userId && a.testId === testId && Date.now() < a.expiresAt);
        if (alreadyActive) {
            return interaction.reply({ content: 'Você já possui este teste VIP ativo!', ephemeral: true });
        }

        if (userPoints < test.cost) {
            return interaction.reply({ content: `Falta: **${test.cost - userPoints}** Points.`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            userData.gpoints -= test.cost;
            gpointsSystem.saveUserGPoints(guildId, userId, userData);

            const member = await interaction.guild.members.fetch(userId);
            await member.roles.add(test.testRoleId, 'VIP Test comprado via Store');

            const expiresAt = Date.now() + test.duration;
            saveActiveVipTest(guildId, { userId, testId: test.id, testRoleId: test.testRoleId, expiresAt, boughtAt: Date.now() });

            const embed = new EmbedBuilder()
                .setTitle('Teste VIP Ativado!')
                .setDescription(`Você ativou o teste **${test.testRoleName}**!\n\nExpira em: **${formatDuration(test.duration)}**`)
                .setColor(0x27ae60);
            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            userData.gpoints += test.cost;
            gpointsSystem.saveUserGPoints(guildId, userId, userData);
            await interaction.editReply({ content: 'Erro ao ativar o teste VIP. Seus pontos foram devolvidos.' });
        }
    },

    async handleConfirmation(interaction, client, colors) {
        if (interaction.customId.startsWith('cancel_buy')) {
            const parts = interaction.customId.split('_');
            const ownerId = parts[parts.length - 1];
            if (ownerId && ownerId !== 'buy' && interaction.user.id !== ownerId) return interaction.reply({ content: 'Esses botoes nao sao seus.', ephemeral: true });
            return await interaction.update({ content: 'Compra cancelada.', embeds: [], components: [] });
        }
        if (interaction.customId.startsWith('conf_buy_')) {
            const parts = interaction.customId.replace('conf_buy_', '').split('_');
            const ownerId = parts[parts.length - 1];
            if (ownerId && parts.length > 1 && interaction.user.id !== ownerId) return interaction.reply({ content: 'Esses botoes nao sao seus.', ephemeral: true });
            const itemId = parts.length > 1 ? parts.slice(0, -1).join('_') : parts[0];
            const store = loadStore();
            const item = store.items.find(i => i.id === itemId);
            if (!item) return;

            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const userData = gpointsSystem.getUserGPoints(guildId, userId);

            if (userData.inventory && userData.inventory.some(i => i.id === item.id)) {
                return await interaction.update({ content: 'Erro: Você já possui este item.', embeds: [], components: [] });
            }
            if (userData.gpoints < item.price) {
                return await interaction.update({ content: 'Erro: Saldo insuficiente.', embeds: [], components: [] });
            }

            userData.gpoints -= item.price;
            if (!userData.inventory) userData.inventory = [];
            userData.inventory.push({ id: item.id, name: item.name, type: item.type, value: item.value, boughtAt: Date.now() });
            gpointsSystem.saveUserGPoints(guildId, userId, userData);

            await interaction.update({ content: `Compra realizada! Você adquiriu: **${item.name}**.`, embeds: [], components: [] });
        }
    }
};
