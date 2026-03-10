const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const logsConfigFile = path.join(__dirname, '..', 'data', 'logsConfig.json');

function getLogsConfig(guildId) {
    try {
        if (fs.existsSync(logsConfigFile)) {
            const data = JSON.parse(fs.readFileSync(logsConfigFile, 'utf8'));
            return data[guildId] || {
                enabled: false,
                channels: {
                    moderation: null,
                    messages: null,
                    members: null,
                    voice: null
                }
            };
        }
    } catch (error) {
        console.error('Erro ao carregar config de logs:', error);
    }
    return {
        enabled: false,
        channels: {
            moderation: null,
            messages: null,
            members: null,
            voice: null
        }
    };
}

function saveLogsConfig(guildId, config) {
    try {
        let data = {};
        if (fs.existsSync(logsConfigFile)) {
            data = JSON.parse(fs.readFileSync(logsConfigFile, 'utf8'));
        }
        data[guildId] = config;
        fs.writeFileSync(logsConfigFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar config de logs:', error);
    }
}

async function sendLog(guild, logType, embed, files = []) {
    try {
        const config = getLogsConfig(guild.id);
        if (!config.enabled) return;

        const channelId = config.channels[logType];
        if (!channelId) return;

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const messageOptions = { embeds: [embed] };
        if (files && files.length > 0) {
            messageOptions.files = files;
        }

        await channel.send(messageOptions);
    } catch (error) {
        console.error('Erro ao enviar log:', error);
    }
}

module.exports = {
    getLogsConfig,
    saveLogsConfig,
    sendLog
};
