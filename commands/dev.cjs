const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const staffConfigFile = path.join(__dirname, '..', 'data', 'staffConfig.json');
const DEV_ID = '1427437680504864870'; // ID Autorizado

function loadStaff() {
    try {
        if (fs.existsSync(staffConfigFile)) {
            return JSON.parse(fs.readFileSync(staffConfigFile, 'utf8'));
        }
    } catch (e) {
        console.error('Erro ao carregar staffConfig:', e);
    }
    return { staff: [] };
}

function saveStaff(data) {
    try {
        fs.writeFileSync(staffConfigFile, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Erro ao salvar staffConfig:', e);
    }
}

const gstoreFile = path.join(__dirname, '..', 'data', 'gstore.json');

function loadStoreFromPath() {
    try {
        if (fs.existsSync(gstoreFile)) return JSON.parse(fs.readFileSync(gstoreFile, 'utf8'));
    } catch (e) {}
    return { items: [] };
}

function saveStoreToPath(data) {
    try {
        fs.writeFileSync(gstoreFile, JSON.stringify(data, null, 2));
    } catch (e) {}
}

module.exports = {
    name: 'dev',
    description: 'Painel de desenvolvedor',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (message.author.id !== DEV_ID) {
            return message.reply('Acesso restrito ao desenvolvedor supremo.');
        }

        if (args[0] === 'delitem') {
            const id = args[1];
            const store = loadStoreFromPath();
            const originalLength = store.items.length;
            store.items = store.items.filter(i => i.id !== id);
            if (store.items.length === originalLength) return message.reply('Item não encontrado.');
            saveStoreToPath(store);
            return message.reply(`Item \`${id}\` removido.`);
        }

        if (args[0] === 'toggle') {
            const id = args[1];
            const store = loadStoreFromPath();
            const item = store.items.find(i => i.id === id);
            if (!item) return message.reply('Item não encontrado.');
            item.active = !item.active;
            saveStoreToPath(store);
            return message.reply(`Item \`${id}\` agora está **${item.active ? 'Ativo' : 'Inativo'}**.`);
        }

        try {
            const embed = new EmbedBuilder()
                .setTitle('Painel de Desenvolvedor')
                .setDescription('Ferramentas administrativas do bot')
                .setColor(colors.primary)
                .setFooter({ text: 'Exclusivo para Desenvolvedor' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_store').setLabel('Configurar Store').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_team').setLabel('Gerenciar Equipe').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_custom').setLabel('Personalizar Bot').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_restart').setLabel('Reiniciar Bot').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('dev_close').setLabel('Fechar Painel').setStyle(ButtonStyle.Secondary)
            );

            await message.author.send({ embeds: [embed], components: [row] });
            if (message.guild) {
                await message.reply('Enviei o painel na sua DM!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
            }
        } catch (error) {
            console.error('Erro ao enviar DM:', error);
            await message.reply('Não consegui enviar DM. Verifique se sua DM está aberta.').catch(() => {});
        }
    },

    // Handler de interações (chamado pelo index.cjs se necessário ou via coletor)
    async handleInteraction(interaction, client, colors) {
        if (interaction.user.id !== DEV_ID) return;

        const customId = interaction.customId;

        if (customId === 'dev_close') {
            return await interaction.update({ content: 'Painel fechado.', embeds: [], components: [] });
        }

        if (customId === 'dev_store') {
            const store = loadStoreFromPath();
            const embed = new EmbedBuilder()
                .setTitle('Store - Gerenciamento')
                .setDescription(`Atualmente existem **${store.items.length}** itens cadastrados.\n\nSelecione uma ação abaixo:`)
                .setColor(colors.primary);
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_store_add').setLabel('Criar Item').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('dev_store_list').setLabel('Listar/Editar/Remover').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_team_back').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
            );
            return await interaction.update({ embeds: [embed], components: [row] });
        }

        if (customId === 'dev_store_add') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_store_add_cor').setLabel('COR').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_store_add_banner').setLabel('BANNER').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_store_add_selo').setLabel('SELO').setStyle(ButtonStyle.Primary)
            );
            return await interaction.reply({ content: 'Qual tipo de item deseja criar?', components: [row], ephemeral: true });
        }

        if (customId.startsWith('dev_store_add_')) {
            const type = customId.replace('dev_store_add_', '');
            const filter = m => m.author.id === interaction.user.id;
            const channel = interaction.channel || await interaction.user.createDM();
            
            await interaction.reply({ content: 'Qual o **nome** do item?', ephemeral: true });
            
            const collector = channel.createMessageCollector({ filter, time: 120000 });
            let step = 0;
            const itemData = { type, active: true, id: `${type}_${Date.now()}` };

            collector.on('collect', async m => {
                // Se a mensagem for de um comando, ignorar
                if (m.content.startsWith('!')) return;

                step++;
                if (step === 1) {
                    itemData.name = m.content.trim();
                    await interaction.followUp({ content: 'Qual a **descrição** do item?', ephemeral: true });
                } else if (step === 2) {
                    itemData.description = m.content.trim();
                    await interaction.followUp({ content: 'Qual o **preço** (Points)?', ephemeral: true });
                } else if (step === 3) {
                    itemData.price = parseInt(m.content.trim());
                    const valLabel = type === 'cor' ? 'HEX da cor (ex: #FF0000)' : (type === 'banner' ? 'URL da imagem' : 'Emoji do selo');
                    await interaction.followUp({ content: `Qual o **valor** do item? (${valLabel})`, ephemeral: true });
                } else if (step === 4) {
                    itemData.value = m.content.trim();
                    const store = loadStoreFromPath();
                    store.items.push(itemData);
                    saveStoreToPath(store);
                    await interaction.followUp({ content: `✅ Item **${itemData.name}** criado com sucesso!\nID Gerado: \`${itemData.id}\``, ephemeral: true });
                    collector.stop();
                }
            });
            return;
        }

        if (customId === 'dev_store_list') {
            const store = loadStoreFromPath();
            if (store.items.length === 0) return await interaction.reply({ content: 'Nenhum item cadastrado.', ephemeral: true });
            
            const list = store.items.map(i => `ID: \`${i.id}\` | **${i.name}** (${i.price}) [${i.active ? 'Ativo' : 'Inativo'}]`).join('\n');
            const embed = new EmbedBuilder()
                .setTitle('Itens da Store')
                .setDescription(list.substring(0, 4000))
                .setColor(colors.primary)
                .setFooter({ text: 'Para deletar use: !dev delitem <id> | Para (des)ativar use: !dev toggle <id>' });
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (customId === 'dev_team') {
            return await this.sendTeamMenu(interaction, colors);
        }

        if (customId === 'dev_custom') {
            return await this.sendCustomMenu(interaction, colors);
        }

        if (customId === 'dev_restart') {
            const embed = new EmbedBuilder()
                .setTitle('Reiniciar Bot')
                .setDescription('Tem certeza que deseja reiniciar o bot?')
                .setColor(0xff0000);
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_restart_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('dev_restart_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
            );
            return await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        if (customId === 'dev_restart_confirm') {
            await interaction.update({ content: 'Reiniciando...', embeds: [], components: [] });
            process.exit(0);
        }

        if (customId === 'dev_restart_cancel') {
            return await interaction.update({ content: 'Operação cancelada.', embeds: [], components: [] });
        }

        // Submenus do Time
        if (customId === 'dev_team_add') {
            await interaction.reply({ content: 'Envie o ID do usuário para adicionar à equipe:', ephemeral: true });
            const filter = m => m.author.id === DEV_ID;
            
            // Garantir que o coletor funcione em DMs (interaction.user.dmChannel)
            const channel = interaction.channel || await interaction.user.createDM();
            const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async m => {
                const id = m.content.trim();
                const data = loadStaff() || { staff: [] };
                if (!data.staff) data.staff = [];
                
                if (!data.staff.includes(id)) {
                    data.staff.push(id);
                    saveStaff(data);
                    await interaction.followUp({ content: `Usuário \`${id}\` adicionado à equipe.`, ephemeral: true });
                } else {
                    await interaction.followUp({ content: 'Este usuário já está na equipe.', ephemeral: true });
                }
            });
        }

        if (customId === 'dev_team_remove') {
            await interaction.reply({ content: 'Envie o ID do usuário para remover da equipe:', ephemeral: true });
            const filter = m => m.author.id === DEV_ID;
            
            const channel = interaction.channel || await interaction.user.createDM();
            const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async m => {
                const id = m.content.trim();
                const data = loadStaff() || { staff: [] };
                if (!data.staff) data.staff = [];
                
                if (data.staff.includes(id)) {
                    data.staff = data.staff.filter(s => s !== id);
                    saveStaff(data);
                    await interaction.followUp({ content: `Usuário \`${id}\` removido da equipe.`, ephemeral: true });
                } else {
                    await interaction.followUp({ content: 'Este usuário não está na equipe.', ephemeral: true });
                }
            });
        }

        if (customId === 'dev_team_list') {
            const data = loadStaff() || { staff: [] };
            if (!data.staff) data.staff = [];
            const list = data.staff.length > 0 ? data.staff.map(id => `<@${id}> (\`${id}\`)`).join('\n') : 'Nenhum membro na equipe.';
            const embed = new EmbedBuilder()
                .setTitle('Equipe do Bot')
                .setDescription(list)
                .setColor(colors.primary);
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (customId === 'dev_team_back' || customId === 'dev_custom_back') {
            const embed = new EmbedBuilder()
                .setTitle('Painel de Desenvolvedor')
                .setDescription('Ferramentas administrativas do bot')
                .setColor(colors.primary);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_store').setLabel('Configurar Store').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_team').setLabel('Gerenciar Equipe').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_custom').setLabel('Personalizar Bot').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('dev_restart').setLabel('Reiniciar Bot').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('dev_close').setLabel('Fechar Painel').setStyle(ButtonStyle.Secondary)
            );
            return await interaction.update({ embeds: [embed], components: [row] });
        }

        // Submenus de Customização
        if (customId === 'dev_custom_name') {
            await interaction.reply({ content: 'Envie o novo nome do bot:', ephemeral: true });
            const filter = m => m.author.id === DEV_ID;
            
            const channel = interaction.channel || await interaction.user.createDM();
            const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async m => {
                const newName = m.content.trim();
                await client.user.setUsername(newName);
                await interaction.followUp({ content: `Nome alterado para: **${newName}**`, ephemeral: true });
            });
        }

        if (customId === 'dev_custom_avatar') {
            await interaction.reply({ content: 'Faça o upload da nova imagem para o avatar:', ephemeral: true });
            const filter = m => m.author.id === DEV_ID && m.attachments.size > 0;
            
            const channel = interaction.channel || await interaction.user.createDM();
            const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async m => {
                const avatar = m.attachments.first().url;
                await client.user.setAvatar(avatar);
                await interaction.followUp({ content: 'Avatar alterado com sucesso!', ephemeral: true });
            });
        }
    },

    async sendTeamMenu(interaction, colors) {
        const embed = new EmbedBuilder()
            .setTitle('Gerenciar Equipe')
            .setDescription('Selecione uma opção abaixo:')
            .setColor(colors.primary);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dev_team_add').setLabel('Adicionar membro').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('dev_team_remove').setLabel('Remover membro').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('dev_team_list').setLabel('Listar equipe').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dev_team_back').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        return await interaction.update({ embeds: [embed], components: [row] });
    },

    async sendCustomMenu(interaction, colors) {
        const embed = new EmbedBuilder()
            .setTitle('Personalizar Bot')
            .setDescription('Selecione o que deseja alterar:')
            .setColor(colors.primary);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dev_custom_name').setLabel('Alterar nome').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dev_custom_avatar').setLabel('Alterar avatar').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dev_custom_back').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        return await interaction.update({ embeds: [embed], components: [row] });
    }
};