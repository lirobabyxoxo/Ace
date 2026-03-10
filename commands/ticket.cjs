const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, '..', 'server_configs.json');

function loadConfigs() {
    try {
        if (fs.existsSync(configFile)) {
            const data = fs.readFileSync(configFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
    return {};
}

function saveConfigs(configs) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(configs, null, 2));
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
    }
}

function getServerConfig(guildId) {
    const configs = loadConfigs();
    return configs[guildId] || null;
}

function setServerConfig(guildId, config) {
    const configs = loadConfigs();
    if (!configs[guildId]) {
        configs[guildId] = {};
    }
    configs[guildId] = { ...configs[guildId], ...config };
    saveConfigs(configs);
}

module.exports = {
    name: 'ticket',
    description: 'Sistema de tickets de suporte',
    
    slashData: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Sistema de tickets de suporte')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('setup')
                .setDescription('Configurar sistema de tickets')
                .addChannelOption(opt => 
                    opt.setName('categoria')
                        .setDescription('Categoria onde os tickets serão criados')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
                .addChannelOption(opt => 
                    opt.setName('logs')
                        .setDescription('Canal para enviar logs dos tickets')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addRoleOption(opt =>
                    opt.setName('cargo_staff')
                        .setDescription('Cargo da staff que terá acesso aos tickets')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('painel')
                .setDescription('Criar painel de tickets no canal atual')
        )
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Ver configurações atuais do sistema de tickets')
        ),

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const noPermEmbed = createYakuzaEmbed(
                'Sem Permissão',
                'Apenas administradores podem usar este comando.',
                colors.error
            );
            return message.reply({ embeds: [noPermEmbed] });
        }

        const helpEmbed = createYakuzaEmbed(
            'Sistema de Tickets',
            '**Comandos disponíveis:**\n\n' +
            '`/ticket setup` - Configurar o sistema de tickets\n' +
            '`/ticket painel` - Criar painel de abertura de tickets\n' +
            '`/ticket config` - Ver configurações atuais\n\n' +
            '*Use os comandos slash (/) para configurar o sistema.*',
            colors.primary
        );
        
        return message.reply({ embeds: [helpEmbed] });
    },

    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const noPermEmbed = createYakuzaEmbed(
                'Sem Permissão',
                'Apenas administradores podem usar este comando.',
                colors.error
            );
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const categoria = interaction.options.getChannel('categoria');
            const logsChannel = interaction.options.getChannel('logs');
            const staffRole = interaction.options.getRole('cargo_staff');

            const serverConfig = getServerConfig(interaction.guild.id) || {};
            serverConfig.ticketSystem = {
                categoria: categoria.id,
                logsChannel: logsChannel.id,
                staffRole: staffRole.id,
                ticketCounter: 0,
                activeTickets: {},
                configuredAt: new Date().toISOString(),
                configuredBy: interaction.user.id
            };

            setServerConfig(interaction.guild.id, serverConfig);

            const setupEmbed = createYakuzaEmbed(
                'Sistema de Tickets Configurado ✅',
                `O sistema de tickets foi configurado com sucesso!\n\n` +
                `**・   Categoria:** ${categoria}\n` +
                `**・   Canal de Logs:** ${logsChannel}\n` +
                `**・   Cargo da Staff:** ${staffRole}\n\n` +
                `Use \`/ticket painel\` para criar o painel de abertura de tickets.`,
                colors.success
            );

            return interaction.reply({ embeds: [setupEmbed] });
        }

        if (subcommand === 'painel') {
            const serverConfig = getServerConfig(interaction.guild.id);
            
            if (!serverConfig || !serverConfig.ticketSystem) {
                const notConfiguredEmbed = createYakuzaEmbed(
                    'Sistema Não Configurado',
                    'O sistema de tickets ainda não foi configurado!\n\n' +
                    'Use `/ticket setup` para configurar primeiro.',
                    colors.error
                );
                return interaction.reply({ embeds: [notConfiguredEmbed], ephemeral: true });
            }

            const panelEmbed = new EmbedBuilder()
                .setTitle('Sistema de Suporte')
                .setDescription(
                    '**Precisa de ajuda?**\n\n' +
                    'Clique no botão abaixo para abrir um ticket de suporte.\n' +
                    'Nossa equipe responderá o mais rápido possível!\n\n' +
                    '**Como funciona:**\n' +
                    '• Um canal privado será criado para você\n' +
                    '• Apenas você e a staff terão acesso\n' +
                    '• Descreva seu problema ou dúvida\n' +
                    '• Aguarde a resposta da equipe\n\n' +
                    '**Lembre-se:** Crie tickets apenas quando necessário!'
                )
                .setColor(0x5865F2)
                .setTimestamp();

            const button = new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Abrir Ticket')
                .setStyle(ButtonStyle.Success);
                

            const row = new ActionRowBuilder().addComponents(button);

            await interaction.channel.send({
                embeds: [panelEmbed],
                components: [row]
            });

            const successEmbed = createYakuzaEmbed(
                'Painel Criado <:sucess:1422318507374415903>',
                'O painel de tickets foi criado com sucesso neste canal!',
                colors.success
            );

            return interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }

        if (subcommand === 'config') {
            const serverConfig = getServerConfig(interaction.guild.id);
            
            if (!serverConfig || !serverConfig.ticketSystem) {
                const notConfiguredEmbed = createYakuzaEmbed(
                    'Sistema Não Configurado',
                    'O sistema de tickets ainda não foi configurado!\n\n' +
                    'Use `/ticket setup` para configurar.',
                    colors.error
                );
                return interaction.reply({ embeds: [notConfiguredEmbed], ephemeral: true });
            }

            const ticketConfig = serverConfig.ticketSystem;
            const categoria = interaction.guild.channels.cache.get(ticketConfig.categoria);
            const logsChannel = interaction.guild.channels.cache.get(ticketConfig.logsChannel);
            const staffRole = interaction.guild.roles.cache.get(ticketConfig.staffRole);
            const activeCount = Object.keys(ticketConfig.activeTickets || {}).length;

            const configEmbed = createYakuzaEmbed(
                'Configuração do Sistema de Tickets',
                `**・ Categoria:** ${categoria || 'Canal não encontrado'}\n` +
                `**・ Canal de Logs:** ${logsChannel || 'Canal não encontrado'}\n` +
                `**・ Cargo da Staff:** ${staffRole || 'Cargo não encontrado'}\n` +
                `**・ Tickets Criados:** ${ticketConfig.ticketCounter || 0}\n` +
                `**・ Tickets Ativos:** ${activeCount}\n\n` +
                `*Configurado em: ${new Date(ticketConfig.configuredAt).toLocaleString('pt-BR')}*`,
                colors.primary
            );

            return interaction.reply({ embeds: [configEmbed], ephemeral: true });
        }
    }
};
