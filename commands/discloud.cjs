const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'discloud',
    aliases: ['status', 'logs'],
    description: 'Comandos para integração com DISCLOUD',
    
    slashData: new SlashCommandBuilder()
        .setName('discloud')
        .setDescription('Comandos para integração com DISCLOUD')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Ver status do bot na DISCLOUD')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('Ver logs do bot na DISCLOUD')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart')
                .setDescription('Reiniciar o bot na DISCLOUD')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        // Verificar se é o dono do bot
        if (message.author.id !== config.ownerId) {
            const errorEmbed = createYakuzaEmbed(
                '❌ Sem Permissão',
                'Apenas o dono do bot pode usar comandos DISCLOUD.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }

        const subcommand = args[0]?.toLowerCase();
        
        switch (subcommand) {
            case 'status':
                await getStatus(message, null, config, colors, createYakuzaEmbed);
                break;
            case 'logs':
                await getLogs(message, null, config, colors, createYakuzaEmbed);
                break;
            case 'restart':
                await restartBot(message, null, config, colors, createYakuzaEmbed);
                break;
            default:
                const helpEmbed = createYakuzaEmbed(
                    '🔥 DISCLOUD Commands',
                    '💀 **Comandos disponíveis:**\n' +
                    `\`${config.prefix}discloud status\` - Ver status do bot\n` +
                    `\`${config.prefix}discloud logs\` - Ver logs do bot\n` +
                    `\`${config.prefix}discloud restart\` - Reiniciar o bot`,
                    colors.accent
                );
                await message.reply({ embeds: [helpEmbed] });
        }
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        // Verificar se é o dono do bot
        if (interaction.user.id !== config.ownerId) {
            const errorEmbed = createYakuzaEmbed(
                '❌ Sem Permissão',
                'Apenas o dono do bot pode usar comandos DISCLOUD.',
                colors.error
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'status':
                await getStatus(null, interaction, config, colors, createYakuzaEmbed);
                break;
            case 'logs':
                await getLogs(null, interaction, config, colors, createYakuzaEmbed);
                break;
            case 'restart':
                await restartBot(null, interaction, config, colors, createYakuzaEmbed);
                break;
        }
    }
};

async function makeDiscloudRequest(endpoint, method = 'GET', data = null, apiKey) {
    try {
        if (!apiKey) {
            throw new Error('DISCLOUD_API_KEY não configurada');
        }

        const config = {
            method,
            url: `https://api.discloud.app/v2/${endpoint}`,
            headers: {
                'api-token': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error('Erro na requisição DISCLOUD:', error);
        throw error;
    }
}

async function getStatus(message, interaction, config, colors, createYakuzaEmbed) {
    try {
        if (message) {
            await message.reply('🔄 Consultando status na DISCLOUD...');
        } else {
            await interaction.deferReply();
        }

        const data = await makeDiscloudRequest('app/all/status', 'GET', null, config.discloudApiKey);
        
        if (data && data.apps && data.apps.length > 0) {
            const app = data.apps[0]; // Primeiro app da lista
            
            const statusEmbed = createYakuzaEmbed(
                '📊 Status DISCLOUD',
                null,
                colors.accent
            );
            
            statusEmbed.addFields(
                {
                    name: '🤖 **Bot Status**',
                    value: [
                        `**Nome:** ${app.name || 'N/A'}`,
                        `**ID:** ${app.id || 'N/A'}`,
                        `**Status:** ${app.status === 'online' ? '🟢 Online' : '🔴 Offline'}`,
                        `**Última Atividade:** <t:${Math.floor(Date.parse(app.last) / 1000)}:R>`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💻 **Recursos**',
                    value: [
                        `**CPU:** ${app.cpu || 'N/A'}`,
                        `**RAM:** ${app.memory || 'N/A'}`,
                        `**SSD:** ${app.ssd || 'N/A'}`,
                        `**Uptime:** ${formatUptime(app.uptime) || 'N/A'}`
                    ].join('\n'),
                    inline: true
                }
            );
            
            if (message) {
                await message.edit({ content: null, embeds: [statusEmbed] });
            } else {
                await interaction.editReply({ embeds: [statusEmbed] });
            }
        } else {
            throw new Error('Nenhum app encontrado');
        }
        
    } catch (error) {
        const errorEmbed = createYakuzaEmbed(
            '❌ Erro DISCLOUD',
            `Erro ao consultar status: ${error.message}`,
            colors.error
        );
        
        if (message) {
            await message.edit({ content: null, embeds: [errorEmbed] });
        } else {
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}

async function getLogs(message, interaction, config, colors, createYakuzaEmbed) {
    try {
        if (message) {
            await message.reply('🔄 Buscando logs na DISCLOUD...');
        } else {
            await interaction.deferReply();
        }

        const data = await makeDiscloudRequest('app/all/logs', 'GET', null, config.discloudApiKey);
        
        if (data && data.apps && data.apps.length > 0) {
            const app = data.apps[0];
            const logs = app.terminal || 'Nenhum log disponível';
            
            const logsEmbed = createYakuzaEmbed(
                '📄 Logs DISCLOUD',
                `\`\`\`\n${logs.slice(-1000)}\n\`\`\``, // Últimos 1000 caracteres
                colors.accent
            );
            
            if (message) {
                await message.edit({ content: null, embeds: [logsEmbed] });
            } else {
                await interaction.editReply({ embeds: [logsEmbed] });
            }
        } else {
            throw new Error('Nenhum app encontrado');
        }
        
    } catch (error) {
        const errorEmbed = createYakuzaEmbed(
            '❌ Erro DISCLOUD',
            `Erro ao buscar logs: ${error.message}`,
            colors.error
        );
        
        if (message) {
            await message.edit({ content: null, embeds: [errorEmbed] });
        } else {
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}

async function restartBot(message, interaction, config, colors, createYakuzaEmbed) {
    try {
        if (message) {
            await message.reply('🔄 Reiniciando bot na DISCLOUD...');
        } else {
            await interaction.deferReply();
        }

        await makeDiscloudRequest('app/all/restart', 'PUT', null, config.discloudApiKey);
        
        const successEmbed = createYakuzaEmbed(
            '✅ Bot Reiniciado',
            'O bot foi reiniciado com sucesso na DISCLOUD! 🔥',
            colors.success
        );
        
        if (message) {
            await message.edit({ content: null, embeds: [successEmbed] });
        } else {
            await interaction.editReply({ embeds: [successEmbed] });
        }
        
    } catch (error) {
        const errorEmbed = createYakuzaEmbed(
            '❌ Erro DISCLOUD',
            `Erro ao reiniciar bot: ${error.message}`,
            colors.error
        );
        
        if (message) {
            await message.edit({ content: null, embeds: [errorEmbed] });
        } else {
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}

function formatUptime(seconds) {
    if (!seconds) return null;
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let uptime = '';
    if (days > 0) uptime += `${days}d `;
    if (hours > 0) uptime += `${hours}h `;
    if (minutes > 0) uptime += `${minutes}m`;
    
    return uptime || '0m';
}