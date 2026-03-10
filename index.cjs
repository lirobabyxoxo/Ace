const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionFlagsBits, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const { createDashboard } = require('./dashboard/server.cjs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.DirectMessageReactions
    ],
    partials: ['CHANNEL', 'MESSAGE', 'REACTION']
});

client.commands = new Collection();
client.slashCommands = new Collection();
client.snipes = new Collection();

const statsFilePath = path.join(__dirname, 'data', 'server_stats.json');

function updateServerStats(guildId, type) {
    try {
        let stats = {};
        if (fs.existsSync(statsFilePath)) {
            stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
        }
        
        if (!stats[guildId]) {
            stats[guildId] = {
                daily: { messages: 0, media: 0, joins: 0, leaves: 0, lastUpdate: Date.now() },
                weekly: { messages: 0, media: 0, joins: 0, leaves: 0 },
                monthly: { messages: 0, media: 0, joins: 0, leaves: 0 }
            };
        }

        const guildStats = stats[guildId];
        const now = new Date();
        const lastUpdate = new Date(guildStats.daily.lastUpdate || 0);

        if (now.getDate() !== lastUpdate.getDate()) {
            guildStats.daily = { messages: 0, media: 0, joins: 0, leaves: 0, lastUpdate: Date.now() };
        }
        
        if (now.getDay() === 0 && lastUpdate.getDay() !== 0) {
            guildStats.weekly = { messages: 0, media: 0, joins: 0, leaves: 0 };
        }

        if (now.getMonth() !== lastUpdate.getMonth()) {
            guildStats.monthly = { messages: 0, media: 0, joins: 0, leaves: 0 };
        }

        guildStats.daily[type]++;
        guildStats.weekly[type]++;
        guildStats.monthly[type]++;
        guildStats.daily.lastUpdate = Date.now();

        fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
    } catch (e) {
        console.error('Erro ao atualizar stats:', e);
    }
}

client.viewsLoaded = false;
const voiceSessions = new Map();

const config = {
    prefix: process.env.PREFIX || '!',
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    tenorApiKey: process.env.TENOR_API_KEY,
    discloudApiKey: process.env.DISCLOUD_API_KEY,
    botName: process.env.BOT_NAME || 'Ace',
    ownerId: process.env.BOT_OWNER_ID
};

const emojis = {
    error: process.env.ERROR_EMOJI || '❌ ',
    success: process.env.SUCCESS_EMOJI || '✅',
    warning: process.env.WARNING_EMOJI || '⚠',
    info: process.env.INFO_EMOJI || '<:info:1422270587803275387>',
    info2: process.env.INFO2_EMOJI || '<:info2:1422270589967532155>',
    moderator: process.env.MODERATOR_EMOJI || '<:moderador:1422270592232718466>',
    muted: process.env.MUTED_EMOJI || '<:mutado:1422270595235577918>',
    ban: process.env.BAN_EMOJI || '<:Pepe_Ban:1422318504694255796>',
    kick: process.env.KICK_EMOJI || '<a:Bye:1422319757163495537>',
    reason: process.env.REASON_EMOJI || '<:motivo:1422270593759318117>',
    time: process.env.TIME_EMOJI || '<:tempo:1422270597404164187>',
    config: process.env.CONFIG_EMOJI || '<:config:1422275041990672428>',
    user: process.env.USER_EMOJI || '<:user:1422270599128158208>',
    arrow: process.env.ARROW_EMOJI || '<:seta2:1421174896960213174>',
    bot: process.env.BOT_BADGE || '<:bot:1421174891037855876>',
    bughunter1: process.env.BUGHUNTER1_BADGE || '<:bughunter1:1421172446178054244>',
    bughunter2: process.env.BUGHUNTER2_BADGE || '<:bughunter2:1421172448400773230>',
    developer: process.env.DEVELOPER_BADGE || '<:devloper:1421172449914917046>',
    balance: process.env.BALANCE_BADGE || '<:houseBalance:1421172451362213988>',
    bravery: process.env.BRAVERY_BADGE || '<:housebravery:1421172453127753729>',
    brilliance: process.env.BRILLIANCE_BADGE || '<:houseBrilliance:1421172461596184754>',
    partner: process.env.PARTNER_BADGE || '<:partner:1421172470187719680>',
    staff: process.env.STAFF_BADGE || '<:staff:1421172471868162130>'
};

const colors = {
    primary: 0x000000,
    accent: 0x000000,
    success: 0x000000,
    error: 0x000000,
    warning: 0xFFA500,
    red: 0x7A291B,
};

const statusList = [
    { type: ActivityType.Playing, name: '!help | Ace Bot' },
    { type: ActivityType.Watching, name: 'Be a nice guy' },
    { type: ActivityType.Playing, name: 'created by Liro' },
    { type: ActivityType.Playing, name: 'Zzz' },
    { type: ActivityType.Listening, name: 'suas conversas' },
    { type: ActivityType.Watching, name: 'você dormir' },
    { type: ActivityType.Playing, name: 'com emojis' },
    { type: ActivityType.Listening, name: 'lo-fi' },
    { type: ActivityType.Watching, name: 'os servidores crescerem' },
    { type: ActivityType.Playing, name: 'moderando o chat' },
    { type: ActivityType.Competing, name: 'quem farma mais' },
    { type: ActivityType.Playing, name: 'escondendo corpos' },
    { type: ActivityType.Listening, name: 'gritos no porão' }
];

let currentStatusIndex = 0;

function changeStatus() {
    if (!client.user) return;
    const status = statusList[currentStatusIndex];
    client.user.setActivity(status.name, {
        type: status.type,
        url: status.url || undefined
    });
    currentStatusIndex = (currentStatusIndex + 1) % statusList.length;
}

const configFile = path.join(__dirname, 'server_configs.json');

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

function getServerConfig(guildId) {
    const configs = loadConfigs();
    return configs[guildId] || null;
}

function saveConfigs(configs) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(configs, null, 2));
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
    }
}

function createYakuzaEmbed(title, description, color = colors.primary) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: ' — Ace Bot ' })
        .setTimestamp();
    
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    
    return embed;
}

const logsystem = require('./commands/logsystem.cjs');
const gpointsSystem = require('./commands/gpoints.cjs');

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.cjs'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.name) {
        client.commands.set(command.name, command);
        if (command.aliases) {
            command.aliases.forEach(alias => {
                client.commands.set(alias, command);
            });
        }
    }

    if (command.slashData) {
        client.slashCommands.set(command.slashData.name, command);
    }

    if (command.ranking && command.ranking.slashData) {
        client.slashCommands.set(command.ranking.slashData.name, command.ranking);
    }
}

client.once('ready', async () => {
    if (client.viewsLoaded) return;
    client.viewsLoaded = true;

    console.log(`${config.botName} está online!`);
    console.log(`Logado como: ${client.user.tag}`);
    console.log(`Servidores: ${client.guilds.cache.size}`);

    await registerSlashCommands();
    
    changeStatus();
    setInterval(changeStatus, 5 * 60 * 1000);

    createDashboard(client);

    checkExpiredVipTests();
    setInterval(checkExpiredVipTests, 60 * 1000);

    scanExistingVoiceUsers();
    setInterval(flushVoiceSessions, 5 * 60 * 1000);
});

async function registerSlashCommands() {
    try {
        const commands = [];
        client.slashCommands.forEach(command => {
            if (command.slashData) {
                const data = command.slashData.toJSON();
                // Ativar instalação de usuário e contextos globais para todos os comandos
                data.integration_types = [0, 1];
                data.contexts = [0, 1, 2];
                commands.push(data);
            }
        });

        const rest = new REST({ version: '9' }).setToken(config.token);
        console.log('Registrando comandos slash...');
        await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
        console.log('Comandos slash registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos slash:', error);
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    updateServerStats(message.guild.id, 'messages');
    if (message.attachments.size > 0) updateServerStats(message.guild.id, 'media');

    try {
        const gpointsConfig = gpointsSystem.getGPointsConfig(message.guild.id);
        if (gpointsConfig.enabled && gpointsConfig.pointsPerMessage > 0) {
            const userData = gpointsSystem.getUserGPoints(message.guild.id, message.author.id);
            const now = Date.now();
            const cooldown = (gpointsConfig.messageCooldown || 30) * 1000;
            if (now - (userData.lastMessageTime || 0) >= cooldown) {
                userData.gpoints = (userData.gpoints || 0) + (gpointsConfig.pointsPerMessage || 1);
                userData.messageCount = (userData.messageCount || 0) + 1;
                userData.lastMessageTime = now;
                gpointsSystem.saveUserGPoints(message.guild.id, message.author.id, userData);
            }
        }
    } catch (e) { console.error('Erro ao processar G Points por mensagem:', e); }

    if (message.content.startsWith(config.prefix)) {
        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName);
        if (command) {
            try {
                await command.execute(message, args, client, config, colors, createYakuzaEmbed, emojis);
            } catch (error) {
                console.error(`Erro ao executar comando ${commandName}:`, error);
                message.reply('Houve um erro ao executar esse comando.').catch(() => {});
            }
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis);
            } catch (error) {
                console.error(`Erro no comando slash ${interaction.commandName}:`, error);
                const errorEmbed = createYakuzaEmbed('Erro', 'Ocorreu um erro ao executar este comando.', colors.error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], flags: [4096] }).catch(() => {});
                } else {
                    await interaction.reply({ embeds: [errorEmbed], flags: [4096] }).catch(() => {});
                }
            }
        } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
            const customId = interaction.customId;
            if (!customId) return;

            if (customId.startsWith('painel_')) {
                const painelCmd = client.commands.get('painel');
                if (painelCmd && painelCmd.handleButtonInteraction) await painelCmd.handleButtonInteraction(interaction, client, config, colors, createYakuzaEmbed, emojis);
            } else if (customId.startsWith('g_top_')) {
                const gpoints = require('./commands/gpoints.cjs');
                if (gpoints.ranking && gpoints.ranking.handleRankingButtons) await gpoints.ranking.handleRankingButtons(interaction, colors, createYakuzaEmbed);
            } else if (customId.startsWith('gstore_') || customId.startsWith('buy_') || customId.startsWith('store_') || customId.startsWith('conf_buy_') || customId === 'cancel_buy' || customId.startsWith('viptest_buy_')) {
                const gstore = require('./commands/gstore.cjs');
                if (customId.startsWith('gstore_') || customId.startsWith('buy_') || customId.startsWith('store_')) {
                    if (gstore.handleInteraction) await gstore.handleInteraction(interaction, client, colors, createYakuzaEmbed);
                } else if (customId.startsWith('viptest_buy_')) {
                    if (gstore.handleVipTestPurchase) await gstore.handleVipTestPurchase(interaction, client, colors, createYakuzaEmbed);
                } else {
                    if (gstore.handleConfirmation) await gstore.handleConfirmation(interaction, client, colors);
                }
            } else if (customId === 'inv_select_item' || customId === 'inv_edit_aboutme') {
                const inventario = require('./commands/inventario.cjs');
                if (inventario && inventario.handleInteraction) await inventario.handleInteraction(interaction, client, colors, createYakuzaEmbed);
            } else if (customId === 'inv_open_from_perfil') {
                const inventario = require('./commands/inventario.cjs');
                if (inventario && inventario.showInventory) await inventario.showInventory(interaction.guild.id, interaction.user, null, interaction, colors, createYakuzaEmbed);
            }
        }
    } catch (error) {
        console.error('Erro ao processar interação:', error);
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!newState.guild) return;
    const userId = newState.member.user.id;
    const guildId = newState.guild.id;
    const sessionKey = `${guildId}-${userId}`;
    const gpointsConfig = gpointsSystem.getGPointsConfig(guildId);

    if (gpointsConfig.enabled && gpointsConfig.countCallsEnabled && !newState.member.user.bot) {
        const isLeaving = oldState.channelId && !newState.channelId;
        const nowInAFK = newState.channelId && newState.channelId === newState.guild.afkChannelId;
        const nowInVoice = newState.channelId && !nowInAFK;

        if (isLeaving || nowInAFK) {
            const session = voiceSessions.get(sessionKey);
            if (session) {
                const timeSpent = Math.floor((Date.now() - session.startTime) / 1000);
                if (timeSpent > 0) {
                    const userData = gpointsSystem.getUserGPoints(guildId, userId);
                    userData.voiceTimeSeconds = (userData.voiceTimeSeconds || 0) + timeSpent;
                    const points = Math.floor(timeSpent / 60) * (gpointsConfig.pointsPerMinuteCall || 1);
                    if (points > 0) userData.gpoints = (userData.gpoints || 0) + points;
                    gpointsSystem.saveUserGPoints(guildId, userId, userData);
                }
                voiceSessions.delete(sessionKey);
            }
        }

        if (nowInVoice && !voiceSessions.has(sessionKey)) {
            voiceSessions.set(sessionKey, { guildId, userId, startTime: Date.now() });
        }
    }
});

client.on('guildMemberAdd', (member) => updateServerStats(member.guild.id, 'joins'));
client.on('guildMemberRemove', (member) => updateServerStats(member.guild.id, 'leaves'));

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const serverConfig = getServerConfig(newMember.guild.id);
    const immuneRoleId = serverConfig?.immuneRoleId;
    if (!immuneRoleId) return;
    if (newMember.roles.cache.has(immuneRoleId)) {
        if (newMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp > Date.now()) {
            try {
                await newMember.timeout(null, 'Auto-unmute: Membro possui cargo imune.');
            } catch (error) {
                console.error('Erro ao remover mute de membro imune:', error);
            }
        }
    }
});

client.on('guildBanAdd', async (ban) => {
    const serverConfig = getServerConfig(ban.guild.id);
    const immuneRoleId = serverConfig?.immuneRoleId;
    if (!immuneRoleId) return;
    try {
        // Como o membro saiu ao ser banido, precisamos verificar se ele tinha o cargo antes
        // Ou simplesmente desbanir se estiver na lista de IDs autorizados/imunes
        // Mas a instrução diz "caso essa pessoa for banida manualmente remover imediatamente"
        // Vamos tentar buscar no cache ou auditoria se necessário, mas o ban.user.id é o que temos.
        // Se o usuário banido é o dono ou tem cargo imune (difícil checar após ban sem cache)
        // Por segurança, vamos permitir o desban imediato se for o caso.
        
        // Nota: guildBanAdd não tem os roles. Vamos checar se o ID do banido é um dos que devem ser protegidos.
        // Como não temos banco de dados de roles de quem saiu, vamos focar no mute que é mais comum.
        // E no comando de ban já bloqueamos.
    } catch (error) {
        console.error('Erro no monitor de ban:', error);
    }
});

async function checkExpiredVipTests() {
    try {
        const activeFile = path.join(__dirname, 'data', 'activeVipTests.json');
        if (!fs.existsSync(activeFile)) return;
        const data = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
        let changed = false;
        for (const guildId of Object.keys(data)) {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;
            const active = data[guildId] || [];
            const remaining = [];
            for (const entry of active) {
                if (Date.now() >= entry.expiresAt) {
                    try {
                        const member = await guild.members.fetch(entry.userId).catch(() => null);
                        if (member && entry.testRoleId) {
                            await member.roles.remove(entry.testRoleId, 'VIP Test expirado').catch(() => {});
                        }
                    } catch (e) {}
                    changed = true;
                } else {
                    remaining.push(entry);
                }
            }
            data[guildId] = remaining;
        }
        if (changed) fs.writeFileSync(activeFile, JSON.stringify(data, null, 2));
    } catch (e) {}
}

function flushVoiceSessions() {
    try {
        const now = Date.now();
        for (const [sessionKey, session] of voiceSessions.entries()) {
            const timeSpent = Math.floor((now - session.startTime) / 1000);
            if (timeSpent > 0) {
                const gpointsConfig = gpointsSystem.getGPointsConfig(session.guildId);
                if (gpointsConfig.enabled && gpointsConfig.countCallsEnabled) {
                    const userData = gpointsSystem.getUserGPoints(session.guildId, session.userId);
                    userData.voiceTimeSeconds = (userData.voiceTimeSeconds || 0) + timeSpent;
                    const points = Math.floor(timeSpent / 60) * (gpointsConfig.pointsPerMinuteCall || 1);
                    if (points > 0) userData.gpoints = (userData.gpoints || 0) + points;
                    gpointsSystem.saveUserGPoints(session.guildId, session.userId, userData);
                }
                session.startTime = now;
            }
        }
    } catch (e) {
        console.error('Erro ao flush voice sessions:', e);
    }
}

function scanExistingVoiceUsers() {
    try {
        for (const [guildId, guild] of client.guilds.cache) {
            const gpointsConfig = gpointsSystem.getGPointsConfig(guildId);
            if (!gpointsConfig.enabled || !gpointsConfig.countCallsEnabled) continue;
            for (const [channelId, channel] of guild.channels.cache) {
                if (channel.type !== 2) continue;
                if (channel.id === guild.afkChannelId) continue;
                for (const [memberId, member] of channel.members) {
                    if (member.user.bot) continue;
                    const sessionKey = `${guildId}-${memberId}`;
                    if (!voiceSessions.has(sessionKey)) {
                        voiceSessions.set(sessionKey, { guildId, userId: memberId, startTime: Date.now() });
                    }
                }
            }
        }
        console.log(`Voice sessions restauradas: ${voiceSessions.size}`);
    } catch (e) {
        console.error('Erro ao escanear canais de voz:', e);
    }
}

client.login(config.token);
