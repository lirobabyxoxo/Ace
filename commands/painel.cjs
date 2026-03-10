const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadVipTests, saveVipTests, parseTime } = require('./viptest.cjs');

const DEV_ID = '1427437680504864870';
const dataDir = path.join(__dirname, '..', 'data');
const painelConfigFile = path.join(dataDir, 'painelConfig.json');
const staffConfigFile = path.join(dataDir, 'staffConfig.json');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

async function safeUpdate(interaction, data) {
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(data);
    } else {
        await interaction.update(data);
    }
}

function getPainelConfig(guildId) {
    const defaults = {
        roles: { moderador: null, admin: null },
        channels: {
            logsGeral: null,
            logsVoz: null,
            logsModeracao: null,
            autoDelete: null,
            cl: null,
            mute: null,
            ban: null
        },
        embeds: {
            ban: { title: '🔨 Usuário Banido', description: 'O usuário foi banido do servidor.', color: '#ff0000', image: null },
            mute: { title: '🔇 Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null }
        },
        cl: {
            allowedRoles: [],
            triggerMessage: null,
            limit: 100
        },
        autoDeleteTime: 0,
        gpoints: {
            enabled: true,
            pointsPerMinuteCall: 1,
            pointsPerMessage: 1,
            messageCooldown: 30,
            countCallsEnabled: true
        }
    };

    try {
        if (fs.existsSync(painelConfigFile)) {
            const data = JSON.parse(fs.readFileSync(painelConfigFile, 'utf8'));
            const saved = data[guildId];
            if (saved) {
                return {
                    ...defaults,
                    ...saved,
                    roles: { ...defaults.roles, ...(saved.roles || {}) },
                    channels: { ...defaults.channels, ...(saved.channels || {}) },
                    embeds: { ...defaults.embeds, ...(saved.embeds || {}) },
                    cl: { ...defaults.cl, ...(saved.cl || {}) },
                    gpoints: { ...defaults.gpoints, ...(saved.gpoints || {}) }
                };
            }
        }
    } catch (error) {
        console.error('Erro ao carregar painel config:', error);
    }
    return defaults;
}

function savePainelConfig(guildId, config) {
    try {
        let data = {};
        if (fs.existsSync(painelConfigFile)) {
            data = JSON.parse(fs.readFileSync(painelConfigFile, 'utf8'));
        }
        data[guildId] = config;
        fs.writeFileSync(painelConfigFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar painel config:', error);
    }
}

function getStaffConfig(staffId) {
    try {
        if (fs.existsSync(staffConfigFile)) {
            const data = JSON.parse(fs.readFileSync(staffConfigFile, 'utf8'));
            return data[staffId] || {
                ban: { title: 'Usuário Banido', description: 'O usuário foi banido.', color: '#ff0000', image: null, message: null },
                mute: { title: 'Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null, message: null },
                stats: { bans: 0, mutes: 0, unbans: 0 }
            };
        }
    } catch (error) {
        console.error('Erro ao carregar staff config:', error);
    }
    return {
        ban: { title: 'Usuário Banido', description: 'O usuário foi banido.', color: '#ff0000', image: null, message: null },
        mute: { title: 'Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null, message: null },
        stats: { bans: 0, mutes: 0, unbans: 0 }
    };
}

function saveStaffConfig(staffId, config) {
    try {
        let data = {};
        if (fs.existsSync(staffConfigFile)) {
            data = JSON.parse(fs.readFileSync(staffConfigFile, 'utf8'));
        }
        data[staffId] = config;
        fs.writeFileSync(staffConfigFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar staff config:', error);
    }
}

function hasAccess(user, guild) {
    if (user.id === DEV_ID) return true;
    if (guild.ownerId === user.id) return true;
    return user.permissions?.has(PermissionFlagsBits.Administrator) || false;
}

function hasModeratorAccess(member, guildId) {
    const config = getPainelConfig(guildId);
    if (member.id === DEV_ID) return true;
    if (member.guild.ownerId === member.id) return true;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    if (config.roles.moderador && member.roles.cache.has(config.roles.moderador)) return true;
    try {
        if (fs.existsSync(staffConfigFile)) {
            const data = JSON.parse(fs.readFileSync(staffConfigFile, 'utf8'));
            if ((data.staff || []).includes(member.id)) return true;
        }
    } catch (e) {}
    return false;
}

function hasAdminAccess(member, guildId) {
    const config = getPainelConfig(guildId);
    if (member.id === DEV_ID) return true;
    if (member.guild.ownerId === member.id) return true;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    if (config.roles.admin && member.roles.cache.has(config.roles.admin)) return true;
    return false;
}

module.exports = {
    name: 'painel',
    aliases: ['panel'],
    description: 'Painel de configurações do servidor',
    
    slashData: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Abrir painel de configurações'),

    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        if (!hasModeratorAccess(message.member, message.guild.id) && !hasAdminAccess(message.member, message.guild.id)) {
            const noAccessEmbed = createYakuzaEmbed('Acesso Negado', 'Você não tem permissão para acessar o painel.', colors.error);
            return message.reply({ embeds: [noAccessEmbed] });
        }
        await this.showMainPanel(message, message.author, message.guild, message, null, config, colors, createYakuzaEmbed);
    },

    async executeSlash(interaction, client, config, colors, createYakuzaEmbed) {
        if (!hasModeratorAccess(interaction.member, interaction.guild.id) && !hasAdminAccess(interaction.member, interaction.guild.id)) {
            const noAccessEmbed = createYakuzaEmbed('Acesso Negado', 'Você não tem permissão para acessar o painel.', colors.error);
            return interaction.reply({ embeds: [noAccessEmbed], ephemeral: true });
        }
        await this.showMainPanel(interaction, interaction.user, interaction.guild, null, interaction, config, colors, createYakuzaEmbed);
    },

    async showMainPanel(context, user, guild, message, interaction, config, colors, createYakuzaEmbed) {
        const staffConfigPath = path.join(__dirname, '..', 'data', 'staffConfig.json');
        const gpointsFile = path.join(__dirname, '..', 'data', 'gpoints.json');
        const member = message ? message.member : (interaction ? interaction.member : null);
        const isAdmin = member ? hasAdminAccess(member, guild.id) : false;

        let stats = { bans: 0, mutes: 0, cl: 0, emojis: guild.emojis.cache.size, gpoints: 0 };
        
        try {
            if (fs.existsSync(staffConfigPath)) {
                const data = JSON.parse(fs.readFileSync(staffConfigPath, 'utf8'));
                Object.values(data).forEach(s => {
                    if (s.stats) {
                        stats.bans += (s.stats.bans || 0);
                        stats.mutes += (s.stats.mutes || 0);
                    }
                });
            }
            if (fs.existsSync(gpointsFile)) {
                const data = JSON.parse(fs.readFileSync(gpointsFile, 'utf8'));
                const guildData = data[guild.id] || {};
                Object.values(guildData).forEach(u => {
                    stats.gpoints += (u.gpoints || 0);
                });
            }
        } catch (e) {}

        const buttons2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('painel_edit_mute').setLabel('Editar Mute').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('painel_edit_ban').setLabel('Editar Ban').setStyle(ButtonStyle.Primary)
            );

        if (isAdmin) {
            const statsEmbed = createYakuzaEmbed(
                'Estatísticas do Servidor',
                `Total de Bans: \`${stats.bans}\`\nTotal de Mutes: \`${stats.mutes}\`\nTotal de Emojis: \`${stats.emojis}\`\nTotal de Points: \`${stats.gpoints}\``,
                colors.primary
            );

            const painelEmbed = createYakuzaEmbed(
                'Painel de Configurações',
                'Selecione o que deseja configurar:',
                colors.primary
            );

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('painel_config_roles').setLabel('Configurar Cargos').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('painel_config_channels').setLabel('Configurar Canais').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('painel_config_cl').setLabel('Configurar CL').setStyle(ButtonStyle.Secondary)
                );

            const buttons3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('painel_config_gpoints').setLabel('Configurar Points').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('painel_set_autodelete').setLabel('Auto-Delete').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('painel_config_viptest').setLabel('Teste Vip').setStyle(ButtonStyle.Secondary)
                );

            const replyOptions = { embeds: [statsEmbed, painelEmbed], components: [buttons, buttons2, buttons3] };
            if (message) await message.reply(replyOptions);
            else if (interaction) await (interaction.deferred || interaction.replied ? interaction.editReply(replyOptions) : interaction.reply(replyOptions));
        } else {
            const staffEmbed = createYakuzaEmbed(
                'Suas Embeds',
                'Configure suas embeds pessoais de ban e mute:',
                colors.primary
            );

            const replyOptions = { embeds: [staffEmbed], components: [buttons2] };
            if (message) await message.reply(replyOptions);
            else if (interaction) await (interaction.deferred || interaction.replied ? interaction.editReply(replyOptions) : interaction.reply(replyOptions));
        }
    },

    async handleButtonInteraction(interaction, client, config, colors, createYakuzaEmbed) {
        const { customId } = interaction;
        const guild = interaction.guild;

        if (!hasModeratorAccess(interaction.member, guild.id) && !hasAdminAccess(interaction.member, guild.id)) {
            return interaction.reply({ content: 'Acesso negado.', ephemeral: true });
        }

        const adminOnlyIds = ['painel_config_roles', 'painel_config_channels', 'painel_config_cl', 'painel_cl_edit_roles', 'painel_cl_roles_confirm', 'painel_cl_set_trigger', 'painel_cl_set_limit', 'painel_cl_set_channel', 'painel_config_gpoints', 'painel_set_moderador', 'painel_set_admin', 'painel_set_autodelete', 'painel_config_viptest', 'painel_viptest_criar', 'painel_viptest_excluir', 'painel_viptest_select_delete'];
        const isAdminAction = adminOnlyIds.includes(customId) || customId.startsWith('painel_set_channel_') || customId.startsWith('painel_gpoints_') || customId.startsWith('painel_viptest_delete_');
        if (isAdminAction && !hasAdminAccess(interaction.member, guild.id)) {
            return interaction.reply({ content: 'Acesso restrito a administradores.', ephemeral: true });
        }

        if (customId === 'painel_config_roles') await this.showRolesConfig(interaction, guild, colors, createYakuzaEmbed);
        else if (customId === 'painel_config_channels') await this.showChannelsConfig(interaction, guild, colors, createYakuzaEmbed);
        else if (customId === 'painel_config_cl') await this.showCLConfig(interaction, guild, colors, createYakuzaEmbed);
        else if (customId === 'painel_cl_edit_roles') await this.showCLRolesEdit(interaction, guild, colors, createYakuzaEmbed);
        else if (customId === 'painel_cl_roles_confirm') {
            const config = getPainelConfig(guild.id);
            const tempData = interaction.client.tempPainelData?.[interaction.user.id] || {};
            if (tempData.selectedRoles) {
                const clFile = path.join(__dirname, '..', 'data', 'clConfig.json');
                let d = fs.existsSync(clFile) ? JSON.parse(fs.readFileSync(clFile, 'utf8')) : {};
                if (!d[guild.id]) d[guild.id] = { allowedRoles: [], triggerMessage: null, limit: 100 };
                d[guild.id].allowedRoles = tempData.selectedRoles;
                fs.writeFileSync(clFile, JSON.stringify(d, null, 2));
                await interaction.reply({ content: 'Cargos do CL salvos!', flags: [4096] }).catch(() => {});
            }
            await this.showCLConfig(interaction, guild, colors, createYakuzaEmbed);
        } else if (customId === 'painel_cl_set_trigger') await this.askForCLSetting(interaction, 'triggerMessage', 'Mensagem Gatilho', colors, createYakuzaEmbed);
        else if (customId === 'painel_cl_set_limit') await this.askForCLSetting(interaction, 'limit', 'Quantidade de Mensagens (ex: 100)', colors, createYakuzaEmbed);
        else if (customId === 'painel_cl_set_channel') await this.askForChannel(interaction, 'cl', colors, createYakuzaEmbed, 'painel_config_cl');
        else if (customId === 'painel_config_gpoints') await this.showGPointsConfig(interaction, guild, colors, createYakuzaEmbed);
        else if (customId === 'painel_set_moderador') await this.askForRole(interaction, 'moderador', colors, createYakuzaEmbed, 'painel_config_roles');
        else if (customId === 'painel_set_admin') await this.askForRole(interaction, 'admin', colors, createYakuzaEmbed, 'painel_config_roles');
        else if (customId.startsWith('painel_set_channel_')) await this.askForChannel(interaction, customId.replace('painel_set_channel_', ''), colors, createYakuzaEmbed, 'painel_config_channels');
        else if (customId === 'painel_edit_mute' || customId === 'painel_edit_ban') {
            const embedType = customId === 'painel_edit_mute' ? 'mute' : 'ban';
            interaction.client.tempPainelData = interaction.client.tempPainelData || {};
            interaction.client.tempPainelData[interaction.user.id] = { previousScreen: 'main' };
            await this.editEmbedMenu(interaction, embedType, colors, createYakuzaEmbed, guild);
        } else if (customId.startsWith('painel_edit_mute_') || customId.startsWith('painel_edit_ban_')) {
            const parts = customId.split('_');
            const embedType = parts[2];
            const field = parts[3];
            const embed = createYakuzaEmbed('Editar ' + field, `Envie no chat o novo valor para o campo **${field}**:`, colors.accent);
            await safeUpdate(interaction, { embeds: [embed], components: [] });
            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
            collector.on('collect', async (msg) => {
                const newValue = msg.content;
                const staffConfig = getStaffConfig(interaction.user.id);
                if (!staffConfig[embedType]) staffConfig[embedType] = {};
                if (field === 'color' && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue)) await msg.reply('Cor inválida (ex: #ff0000)');
                else if (field === 'image' && !newValue.match(/\.(jpeg|jpg|gif|png|webp)$/i) && !newValue.startsWith('http')) await msg.reply('URL inválida.');
                else {
                    staffConfig[embedType][field] = newValue;
                    saveStaffConfig(interaction.user.id, staffConfig);
                    await msg.reply('Embed pessoal atualizada!');
                }
                await this.editEmbedMenu(interaction, embedType, colors, createYakuzaEmbed, guild);
            });
        } else if (customId === 'painel_set_autodelete') {
            const embed = createYakuzaEmbed('Auto-Delete', `Envie o novo tempo (0 p/ desativar):`, colors.accent);
            await safeUpdate(interaction, { embeds: [embed], components: [] });
            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
            collector.on('collect', async (msg) => {
                const seconds = parseInt(msg.content);
                if (isNaN(seconds) || seconds < 0) await msg.reply('Número inválido.');
                else {
                    const config = getPainelConfig(guild.id);
                    config.autoDeleteTime = seconds;
                    savePainelConfig(guild.id, config);
                    await msg.reply(`Tempo atualizado para \`${seconds}\`s!`);
                }
                await this.showMainPanel(interaction, interaction.user, guild, null, interaction, {}, colors, createYakuzaEmbed);
            });
        } else if (customId === 'painel_edit_selection') {
            const prev = interaction.client.tempPainelData?.[interaction.user.id]?.previousScreen;
            if (prev === 'painel_config_roles') await this.showRolesConfig(interaction, guild, colors, createYakuzaEmbed);
            else if (prev === 'painel_config_channels') await this.showChannelsConfig(interaction, guild, colors, createYakuzaEmbed);
            else await this.showMainPanel(interaction, interaction.user, guild, null, interaction, {}, colors, createYakuzaEmbed);
        } else if (customId === 'painel_cancel') await this.showMainPanel(interaction, interaction.user, guild, null, interaction, {}, colors, createYakuzaEmbed);
        else if (customId.startsWith('painel_gpoints_')) {
            const config = getPainelConfig(guild.id);
            if (customId === 'painel_gpoints_toggle') config.gpoints.enabled = !config.gpoints.enabled;
            else if (customId === 'painel_gpoints_toggle_call') config.gpoints.countCallsEnabled = !config.gpoints.countCallsEnabled;
            savePainelConfig(guild.id, config);
            await this.showGPointsConfig(interaction, guild, colors, createYakuzaEmbed);
        } else if (customId === 'painel_cl_roles_select') {
            interaction.client.tempPainelData = interaction.client.tempPainelData || {};
            interaction.client.tempPainelData[interaction.user.id] = interaction.client.tempPainelData[interaction.user.id] || {};
            interaction.client.tempPainelData[interaction.user.id].selectedRoles = interaction.values;
            await interaction.deferUpdate();
        } else if (customId === 'painel_config_viptest') {
            await this.showVipTestConfig(interaction, guild, colors, createYakuzaEmbed);
        } else if (customId === 'painel_viptest_criar') {
            await this.vipTestCriarFlow(interaction, guild, colors, createYakuzaEmbed);
        } else if (customId === 'painel_viptest_excluir') {
            await this.vipTestExcluirFlow(interaction, guild, colors, createYakuzaEmbed);
        } else if (customId === 'painel_viptest_select_delete') {
            const testId = interaction.values[0];
            await this.vipTestDeleteConfirm(interaction, guild, testId, colors, createYakuzaEmbed);
        } else if (customId.startsWith('painel_viptest_delete_')) {
            const testId = customId.replace('painel_viptest_delete_', '');
            await this.vipTestDeleteConfirm(interaction, guild, testId, colors, createYakuzaEmbed);
        }
    },

    async showRolesConfig(interaction, guild, colors, createYakuzaEmbed) {
        const config = getPainelConfig(guild.id);
        const embed = createYakuzaEmbed('Configurar Cargos', `Mod: ${config.roles.moderador ? `<@&${config.roles.moderador}>` : 'N/C'}\nAdmin: ${config.roles.admin ? `<@&${config.roles.admin}>` : 'N/C'}`, colors.primary);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('painel_set_moderador').setLabel('Definir Mod').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('painel_set_admin').setLabel('Definir Admin').setStyle(ButtonStyle.Secondary)
        );
        await safeUpdate(interaction, { embeds: [embed], components: [row] });
    },

    async showChannelsConfig(interaction, guild, colors, createYakuzaEmbed) {
        const c = getPainelConfig(guild.id).channels;
        const info = [`Logs G: ${c.logsGeral ? `<#${c.logsGeral}>` : 'N/C'}`, `Logs V: ${c.logsVoz ? `<#${c.logsVoz}>` : 'N/C'}`, `Logs M: ${c.logsModeracao ? `<#${c.logsModeracao}>` : 'N/C'}`, `A-D: ${c.autoDelete ? `<#${c.autoDelete}>` : 'N/C'}`, `CL: ${c.cl ? `<#${c.cl}>` : 'N/C'}`, `Mute: ${c.mute ? `<#${c.mute}>` : 'N/C'}`, `Ban: ${c.ban ? `<#${c.ban}>` : 'N/C'}`];
        const embed = createYakuzaEmbed('Configurar Canais', info.join('\n'), colors.primary);
        const rows = [
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_set_channel_logsGeral').setLabel('Logs G').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('painel_set_channel_logsVoz').setLabel('Logs V').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('painel_set_channel_logsModeracao').setLabel('Logs M').setStyle(ButtonStyle.Secondary)),
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_set_channel_autoDelete').setLabel('A-D').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('painel_set_channel_cl').setLabel('CL').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('painel_set_channel_mute').setLabel('Mute').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('painel_set_channel_ban').setLabel('Ban').setStyle(ButtonStyle.Secondary))
        ];
        await safeUpdate(interaction, { embeds: [embed], components: rows });
    },

    async editEmbedMenu(interaction, embedType, colors, createYakuzaEmbed, guild) {
        const staffConfig = getStaffConfig(interaction.user.id);
        const defaults = {
            ban: { title: '🔨 Usuário Banido', description: 'O usuário foi banido do servidor.', color: '#ff0000', image: null },
            mute: { title: '🔇 Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null }
        };
        const cur = { ...defaults[embedType], ...(staffConfig[embedType] || {}) };
        const preview = new EmbedBuilder()
            .setTitle(cur.title).setDescription(cur.description)
            .setColor(cur.color.startsWith('#') ? parseInt(cur.color.replace('#', ''), 16) : (parseInt(cur.color) || colors.primary))
            .setThumbnail(interaction.member.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: ' — Ace Bot ' }).setTimestamp();
        if (cur.image) preview.setImage(cur.image);

        const menu = createYakuzaEmbed(`Editar ${embedType} (Pessoal)`, 'Configure sua embed:', colors.primary);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`painel_edit_${embedType}_title`).setLabel('Título').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`painel_edit_${embedType}_description`).setLabel('Descrição').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`painel_edit_${embedType}_color`).setLabel('Cor').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`painel_edit_${embedType}_image`).setLabel('Imagem').setStyle(ButtonStyle.Secondary)
        );
        const back = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_cancel').setLabel('Voltar').setStyle(ButtonStyle.Danger));
        await safeUpdate(interaction, { embeds: [preview, menu], components: [row, back] });
    },

    async showCLConfig(interaction, guild, colors, createYakuzaEmbed) {
        const clConfigFile = path.join(__dirname, '..', 'data', 'clConfig.json');
        let clC = { allowedRoles: [], triggerMessage: null, limit: 100 };
        try { if (fs.existsSync(clConfigFile)) clC = { ...clC, ...JSON.parse(fs.readFileSync(clConfigFile, 'utf8'))[guild.id] }; } catch (e) {}
        const clChan = getPainelConfig(guild.id).channels.cl ? `<#${getPainelConfig(guild.id).channels.cl}>` : 'N/C';
        const embed = createYakuzaEmbed('Configurar CL', `Gatilho: \`${clC.triggerMessage || 'N/C'}\`\nCanal: ${clChan}\nLimite: \`${clC.limit}\` msgs\nCargos: ${clC.allowedRoles.length ? clC.allowedRoles.map(r => `<@&${r}>`).join(', ') : 'Admin'}`, colors.primary);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('painel_cl_set_trigger').setLabel('Gatilho').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('painel_cl_set_channel').setLabel('Canal').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('painel_cl_set_limit').setLabel('Limite').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('painel_cl_edit_roles').setLabel('Cargos').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('painel_cancel').setLabel('Voltar').setStyle(ButtonStyle.Danger)
        );
        await safeUpdate(interaction, { embeds: [embed], components: [row] });
    },

    async showCLRolesEdit(interaction, guild, colors, createYakuzaEmbed) {
        const roles = guild.roles.cache.filter(r => r.name !== '@everyone' && !r.managed).sort((a, b) => b.position - a.position).first(25);
        const embed = createYakuzaEmbed('Selecionar Cargos CL', 'Selecione os cargos permitidos:', colors.primary);
        const roleOptions = roles.map(r => ({ label: r.name, value: r.id, description: `ID: ${r.id}` }));
        const roleSelect = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('painel_cl_roles_select').setPlaceholder('Selecione os cargos').setMinValues(1).setMaxValues(Math.min(roleOptions.length, 10)).addOptions(roleOptions));
        const confirm = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_cl_roles_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('painel_config_cl').setLabel('Cancelar').setStyle(ButtonStyle.Danger));
        await safeUpdate(interaction, { embeds: [embed], components: [roleSelect, confirm] });
    },

    async askForCLSetting(interaction, type, label, colors, createYakuzaEmbed) {
        await safeUpdate(interaction, { embeds: [createYakuzaEmbed('Configurar CL', `Envie o novo valor para **${label}**:`, colors.accent)], components: [] });
        const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 30000, max: 1 });
        collector.on('collect', async (msg) => {
            const clFile = path.join(__dirname, '..', 'data', 'clConfig.json');
            let d = fs.existsSync(clFile) ? JSON.parse(fs.readFileSync(clFile, 'utf8')) : {};
            if (!d[interaction.guild.id]) d[interaction.guild.id] = { allowedRoles: [], triggerMessage: null, limit: 100 };
            d[interaction.guild.id][type] = type === 'limit' ? parseInt(msg.content) || 100 : msg.content;
            fs.writeFileSync(clFile, JSON.stringify(d, null, 2));
            await msg.reply('CL atualizado!');
            await this.showCLConfig(interaction, interaction.guild, colors, createYakuzaEmbed);
        });
    },

    async showGPointsConfig(interaction, guild, colors, createYakuzaEmbed) {
        const config = getPainelConfig(guild.id).gpoints;
        const embed = createYakuzaEmbed('Configurar Points', `Ativo: ${config.enabled ? 'Sim' : 'Não'}\nCalls: ${config.countCallsEnabled ? 'Sim' : 'Não'}\nMin Call: ${config.pointsPerMinuteCall}\nMsg: ${config.pointsPerMessage}\nCD Msg: ${config.messageCooldown}s`, colors.primary);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_gpoints_toggle').setLabel('Toggle Ativo').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('painel_gpoints_toggle_call').setLabel('Toggle Calls').setStyle(ButtonStyle.Secondary));
        await safeUpdate(interaction, { embeds: [embed], components: [row] });
    },

    async askForRole(interaction, type, colors, createYakuzaEmbed, prev) {
        await safeUpdate(interaction, { embeds: [createYakuzaEmbed('Configurar Cargo', `Mencione o cargo para **${type}**:`, colors.accent)], components: [] });
        const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 30000, max: 1 });
        collector.on('collect', async (msg) => {
            const roleId = msg.mentions.roles.first()?.id || (await interaction.guild.roles.fetch(msg.content).catch(() => null))?.id;
            if (!roleId) await msg.reply('Cargo inválido.');
            else {
                const config = getPainelConfig(interaction.guild.id);
                config.roles[type] = roleId;
                savePainelConfig(interaction.guild.id, config);
                await msg.reply('Cargo atualizado!');
            }
            if (prev === 'painel_config_roles') await this.showRolesConfig(interaction, interaction.guild, colors, createYakuzaEmbed);
        });
    },

    async askForChannel(interaction, type, colors, createYakuzaEmbed, prev) {
        await safeUpdate(interaction, { embeds: [createYakuzaEmbed('Configurar Canal', `Mencione o canal para **${type}**:`, colors.accent)], components: [] });
        const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 30000, max: 1 });
        collector.on('collect', async (msg) => {
            const channelId = msg.mentions.channels.first()?.id || (await interaction.guild.channels.fetch(msg.content).catch(() => null))?.id;
            if (!channelId) await msg.reply('Canal inválido.');
            else {
                const config = getPainelConfig(interaction.guild.id);
                config.channels[type] = channelId;
                savePainelConfig(interaction.guild.id, config);
                await msg.reply('Canal atualizado!');
            }
            if (prev === 'painel_config_channels') await this.showChannelsConfig(interaction, interaction.guild, colors, createYakuzaEmbed);
            else if (prev === 'painel_config_cl') await this.showCLConfig(interaction, interaction.guild, colors, createYakuzaEmbed);
        });
    },

    async showVipTestConfig(interaction, guild, colors, createYakuzaEmbed) {
        const tests = loadVipTests(guild.id);
        let desc = '';
        if (tests.length === 0) {
            desc = 'Nenhum teste vip configurado...';
        } else {
            desc = tests.map((t, i) => {
                const dur = t.duration >= 86400000 ? `${Math.floor(t.duration / 86400000)}d` : t.duration >= 3600000 ? `${Math.floor(t.duration / 3600000)}h` : `${Math.floor(t.duration / 60000)}m`;
                return `**${i + 1}.** <@&${t.testRoleId}> - Custo: \`${t.cost}\` Points - Duração: \`${dur}\``;
            }).join('\n');
        }
        const embed = createYakuzaEmbed('Teste Vip', desc, colors.primary);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('painel_viptest_criar').setLabel('Criar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('painel_viptest_excluir').setLabel('Excluir').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('painel_cancel').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );
        await safeUpdate(interaction, { embeds: [embed], components: [row] });
    },

    async vipTestCriarFlow(interaction, guild, colors, createYakuzaEmbed) {
        const botMember = guild.members.me;
        const embed = createYakuzaEmbed('Criar Teste Vip - Passo 1/3', 'Mencione ou envie o ID do **cargo** que deseja criar um teste:', colors.accent);
        await safeUpdate(interaction, { embeds: [embed], components: [] });

        const filter = m => m.author.id === interaction.user.id;
        const collector1 = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector1.on('collect', async (msg1) => {
            const roleId = msg1.mentions.roles.first()?.id || msg1.content.trim();
            const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));

            if (!role) {
                await msg1.reply('Que!?. Você não entendeu.. você pode configurar desse jeito aqui (Só exemplo). `@Cargo` ou `ID do cargo`');
                return this.showVipTestConfig(interaction, guild, colors, createYakuzaEmbed);
            }

            if (botMember.roles.highest.position <= role.position) {
                await msg1.reply('Irmão sobe meu cargo ae. Consigo fazer nada sendo peblea.');
                return this.showVipTestConfig(interaction, guild, colors, createYakuzaEmbed);
            }

            if (interaction.member.roles.highest.position <= role.position && interaction.member.id !== guild.ownerId) {
                await msg1.reply('Meio que... você... não pode alterar um cargo maio que o seu **PORRA ** <:aura:1454762227528892437>');
                return this.showVipTestConfig(interaction, guild, colors, createYakuzaEmbed);
            }

            const embed2 = createYakuzaEmbed('Criar Teste Vip - Passo 2/3', `Cargo selecionado: <@&${role.id}>\n\nEnvie o **custo em Points** (número):`, colors.accent);
            await msg1.reply({ embeds: [embed2] });

            const collector2 = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
            collector2.on('collect', async (msg2) => {
                const cost = parseFloat(msg2.content);
                if (isNaN(cost) || cost <= 0) {
                    await msg2.reply('Que!?. Você não entendeu.. você pode configurar desse jeito aqui (Só exemplo). `100` ou `50.5`');
                    return this.showVipTestConfig(interaction, guild, colors, createYakuzaEmbed);
                }

                const embed3 = createYakuzaEmbed('Criar Teste Vip - Passo 3/3', `Custo: \`${cost}\` Points\n\nEnvie a **duração** do teste (ex: \`10m\`, \`1h\`, \`1d\`, \`30d\`):`, colors.accent);
                await msg2.reply({ embeds: [embed3] });

                const collector3 = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
                collector3.on('collect', async (msg3) => {
                    const duration = parseTime(msg3.content);
                    if (!duration) {
                        await msg3.reply('Que!?. Você não entendeu.. você pode configurar desse jeito aqui (Só exemplo). `10m`, `1h`, `1d`, `30d`');
                        return this.showVipTestConfig(interaction, guild, colors, createYakuzaEmbed);
                    }

                    try {
                        const channelOverwrites = [];
                        const channels = guild.channels.cache;
                        channels.forEach(channel => {
                            const overwrite = channel.permissionOverwrites.cache.get(role.id);
                            if (overwrite) {
                                channelOverwrites.push({
                                    channelId: channel.id,
                                    allow: overwrite.allow.bitfield.toString(),
                                    deny: overwrite.deny.bitfield.toString()
                                });
                            }
                        });

                        const testRole = await guild.roles.create({
                            name: `${role.name}-teste`,
                            color: role.color,
                            permissions: role.permissions,
                            hoist: role.hoist,
                            mentionable: role.mentionable,
                            reason: 'Teste Vip criado via painel'
                        });

                        for (const ow of channelOverwrites) {
                            const channel = guild.channels.cache.get(ow.channelId);
                            if (channel) {
                                await channel.permissionOverwrites.create(testRole, {
                                    ...Object.fromEntries(
                                        Object.entries(
                                            new (require('discord.js').PermissionsBitField)(BigInt(ow.allow)).serialize()
                                        ).filter(([, v]) => v).map(([k]) => [k, true])
                                    ),
                                    ...Object.fromEntries(
                                        Object.entries(
                                            new (require('discord.js').PermissionsBitField)(BigInt(ow.deny)).serialize()
                                        ).filter(([, v]) => v).map(([k]) => [k, false])
                                    )
                                }).catch(() => {});
                            }
                        }

                        const tests = loadVipTests(guild.id);
                        tests.push({
                            id: `vip_${Date.now()}`,
                            originalRoleId: role.id,
                            testRoleId: testRole.id,
                            testRoleName: testRole.name,
                            cost,
                            duration,
                            createdAt: Date.now()
                        });
                        saveVipTests(guild.id, tests);

                        const durStr = duration >= 86400000 ? `${Math.floor(duration / 86400000)}d` : duration >= 3600000 ? `${Math.floor(duration / 3600000)}h` : `${Math.floor(duration / 60000)}m`;
                        const successEmbed = createYakuzaEmbed('Teste Vip Criado', `Cargo: <@&${testRole.id}>\nBaseado em: <@&${role.id}>\nCusto: \`${cost}\` Points\nDuração: \`${durStr}\``, colors.success || '#00ff00');
                        await msg3.reply({ embeds: [successEmbed] });
                    } catch (err) {
                        console.error('Erro ao criar teste vip:', err);
                        await msg3.reply('Irmão sobe meu cargo ae. Consigo fazer nada sendo peblea.');
                    }
                    await this.showVipTestConfig(interaction, guild, colors, createYakuzaEmbed);
                });
            });
        });
    },

    async vipTestExcluirFlow(interaction, guild, colors, createYakuzaEmbed) {
        const tests = loadVipTests(guild.id);
        if (tests.length === 0) {
            const embed = createYakuzaEmbed('Excluir Teste Vip', 'Nenhum teste vip configurado...', colors.error || '#ff0000');
            await safeUpdate(interaction, { embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_config_viptest').setLabel('Voltar').setStyle(ButtonStyle.Secondary))] });
            return;
        }

        const options = tests.map((t, i) => ({
            label: t.testRoleName || `Teste ${i + 1}`,
            value: t.id,
            description: `Custo: ${t.cost} Points`
        }));

        const embed = createYakuzaEmbed('Excluir Teste Vip', 'Selecione o teste vip que deseja excluir:', colors.error || '#ff0000');
        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('painel_viptest_select_delete')
                .setPlaceholder('Selecione um teste')
                .addOptions(options)
        );
        const backRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_config_viptest').setLabel('Voltar').setStyle(ButtonStyle.Secondary));
        await safeUpdate(interaction, { embeds: [embed], components: [selectRow, backRow] });
    },

    async vipTestDeleteConfirm(interaction, guild, testId, colors, createYakuzaEmbed) {
        const tests = loadVipTests(guild.id);
        const testIndex = tests.findIndex(t => t.id === testId);
        if (testIndex === -1) {
            await safeUpdate(interaction, { embeds: [createYakuzaEmbed('Erro', 'Teste não encontrado.', colors.error || '#ff0000')], components: [] });
            return;
        }

        const test = tests[testIndex];
        const testRole = guild.roles.cache.get(test.testRoleId);
        if (testRole) {
            await testRole.delete('Teste Vip excluído via painel').catch(() => {});
        }

        tests.splice(testIndex, 1);
        saveVipTests(guild.id, tests);

        await safeUpdate(interaction, { embeds: [createYakuzaEmbed('Teste Vip Excluído', `O teste **${test.testRoleName}** foi removido.`, colors.success || '#00ff00')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('painel_config_viptest').setLabel('Voltar').setStyle(ButtonStyle.Secondary))] });
    },

    async handleConfirmation(interaction, guild, colors, createYakuzaEmbed) {
        await interaction.reply({ content: 'Configuração salva!', ephemeral: true });
    },

    getPainelConfig,
    getStaffConfig,
    hasModeratorAccess,
    hasAdminAccess,
    getAutoDeleteConfig(guildId) { return getPainelConfig(guildId).autoDeleteTime || 0; }
};