const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const logsystem = require('./logsystem.cjs');

module.exports = {
    name: 'logs',
    description: 'Configurar sistema de logs',
    
    slashData: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configurar sistema de logs'),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply({ content: 'Você não tem permissão para usar esse comando.', ephemeral: true });
        }
        await this.showLogsPanel(message, message.guild, client, config, colors, createYakuzaEmbed);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: 'Você não tem permissão para usar esse comando.', ephemeral: true });
        }
        await this.showLogsPanel(interaction, interaction.guild, client, config, colors, createYakuzaEmbed);
    },
    
    async showLogsPanel(context, guild, client, config, colors, createYakuzaEmbed) {
        const logsConfig = logsystem.getLogsConfig(guild.id);

        const statusText = logsConfig.enabled ? 'Ativado' : 'Desativado';
        const moderationChannel = logsConfig.channels.moderation ? `<#${logsConfig.channels.moderation}>` : 'Não configurado';
        const messagesChannel = logsConfig.channels.messages ? `<#${logsConfig.channels.messages}>` : 'Não configurado';
        const membersChannel = logsConfig.channels.members ? `<#${logsConfig.channels.members}>` : 'Não configurado';
        const voiceChannel = logsConfig.channels.voice ? `<#${logsConfig.channels.voice}>` : 'Não configurado';

        const logsEmbed = new EmbedBuilder()
            .setTitle('Configuração de Logs')
            .setDescription('Configure os canais para registrar eventos do servidor.')
            .setColor(colors.primary)
            .addFields([
                { name: 'Status', value: statusText, inline: false },
                { name: 'Moderação (Ban, Mute, Kick)', value: moderationChannel, inline: false },
                { name: 'Mensagens (Editar, Deletar)', value: messagesChannel, inline: false },
                { name: 'Membros (Entrada, Avatar, Nickname)', value: membersChannel, inline: false },
                { name: 'Voz (Entrar, Sair, Câmera, Stream)', value: voiceChannel, inline: false }
            ])
            .setFooter({ text: 'Selecione uma opção' })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('logs_main_select')
            .setPlaceholder('Escolha uma opção')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                { label: logsConfig.enabled ? 'Desativar Logs' : 'Ativar Logs', value: 'logs_toggle' },
                { label: 'Configurar Canais', value: 'logs_channels' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        if (context.reply) {
            await context.reply({ embeds: [logsEmbed], components: [row] });
        } else {
            await context.editReply({ embeds: [logsEmbed], components: [row] });
        }
    },

    async handleSelectMenu(interaction, client, config, colors, createYakuzaEmbed) {
        const { customId, values } = interaction;

        if (customId === 'logs_main_select') {
            const selected = values[0];

            if (selected === 'logs_toggle') {
                const logsConfig = logsystem.getLogsConfig(interaction.guild.id);
                logsConfig.enabled = !logsConfig.enabled;
                logsystem.saveLogsConfig(interaction.guild.id, logsConfig);

                const statusText = logsConfig.enabled ? 'Ativado' : 'Desativado';
                const embed = new EmbedBuilder()
                    .setTitle('Sistema de Logs')
                    .setDescription(`Status: ${statusText}`)
                    .setColor(logsConfig.enabled ? 0x00ff00 : 0xff0000)
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });

                setTimeout(async () => {
                    try {
                        await this.showLogsPanel(interaction, interaction.guild, client, config, colors, createYakuzaEmbed);
                    } catch (e) {}
                }, 2000);
            } else if (selected === 'logs_channels') {
                await this.showChannelsMenu(interaction, client, config, colors, createYakuzaEmbed);
            }
        }

        if (customId.startsWith('logs_type_button_')) {
            const logType = customId.replace('logs_type_button_', '');
            await this.showChannelModal(interaction, logType);
        }
    },

    async showChannelsMenu(interaction, client, config, colors, createYakuzaEmbed) {
        const embed = new EmbedBuilder()
            .setTitle('Configurar Canais de Log')
            .setDescription('Escolha qual tipo de log você quer configurar:')
            .setColor(colors.primary);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('logs_type_button_moderation')
                .setLabel('Moderação')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('logs_type_button_messages')
                .setLabel('Mensagens')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('logs_type_button_members')
                .setLabel('Membros')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('logs_type_button_voice')
                .setLabel('Voz')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.update({ embeds: [embed], components: [row] });
    },

    async showChannelModal(interaction, logType) {
        const typeNames = {
            moderation: 'Moderação',
            messages: 'Mensagens',
            members: 'Membros',
            voice: 'Voz'
        };

        const modal = new ModalBuilder()
            .setCustomId(`logs_modal_${logType}`)
            .setTitle(`Canal de Log - ${typeNames[logType]}`);

        const channelInput = new TextInputBuilder()
            .setCustomId('channel_input')
            .setLabel('Mencione o canal (#canal) ou ID do canal')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#logs-moderacao ou 123456789')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(channelInput)
        );

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction, client, config, colors, createYakuzaEmbed) {
        const customId = interaction.customId;

        if (customId.startsWith('logs_modal_')) {
            const logType = customId.replace('logs_modal_', '');
            const channelInput = interaction.fields.getTextInputValue('channel_input');
            
            let channelId = null;

            // Tentar extrair ID da menção (#canal) ou do ID direto
            if (channelInput.startsWith('<#') && channelInput.endsWith('>')) {
                channelId = channelInput.slice(2, -1);
            } else if (/^\d+$/.test(channelInput)) {
                channelId = channelInput;
            } else {
                return interaction.reply({
                    content: 'Canal inválido! Use #canal ou o ID do canal.',
                    ephemeral: true
                });
            }

            // Verificar se o canal existe
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel || !channel.isTextBased()) {
                return interaction.reply({
                    content: 'Canal não encontrado ou não é um canal de texto!',
                    ephemeral: true
                });
            }

            const logsConfig = logsystem.getLogsConfig(interaction.guild.id);
            logsConfig.channels[logType] = channelId;
            logsystem.saveLogsConfig(interaction.guild.id, logsConfig);

            const typeNames = {
                moderation: 'Moderação',
                messages: 'Mensagens',
                members: 'Membros',
                voice: 'Voz'
            };

            const successEmbed = new EmbedBuilder()
                .setTitle('Log Configurado')
                .setDescription(`Canal de **${typeNames[logType]}** configurado para <#${channelId}>`)
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            setTimeout(async () => {
                try {
                    await this.showLogsPanel(interaction, interaction.guild, client, config, colors, createYakuzaEmbed);
                } catch (e) {}
            }, 2000);
        }
    }
};
