const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'slap',
    aliases: ['tapar', 'tapa'],
    description: 'Dar um tapa em alguém',
    
    slashData: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Dar um tapa em alguém')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('Usuário para dar um tapa')
                .setRequired(true)
        ),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        
        if (!target) {
            const errorEmbed = createYakuzaEmbed(
                'Usuário Inválido',
                'Por favor, mencione um usuário para dar um tapa.',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }
        
        await performRoleplay('slap', message.author, target, message, null, config, colors, createYakuzaEmbed, emojis);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        const target = interaction.options.getUser('usuário');
        await performRoleplay('slap', interaction.user, target, null, interaction, config, colors, createYakuzaEmbed, emojis);
    }
};

async function performRoleplay(action, author, target, message, interaction, config, colors, createYakuzaEmbed, emojis) {
    try {
        if (author.id === target.id) {
            const selfEmbed = createYakuzaEmbed(
                'Ação Inválida',
                'Você não pode se dar um tapa! Isso seria estranho!',
                colors.error
            );
            
            if (message) {
                return await message.reply({ embeds: [selfEmbed] });
            } else {
                return await interaction.reply({ embeds: [selfEmbed], ephemeral: true });
            }
        }
        
        const gifUrl = await getAnimeGif(action, config.tenorApiKey);
        
        const messages = {
            slap: [
                `**${author.username}** deu um tapa em **${target.username}**`,
                `**${target.username}** levou uma bofetada de **${author.username}**`,
                `**${author.username}** esbofeteou **${target.username}**`,
                `TAPA! **${author.username}** acertou **${target.username}** em cheio`
            ]
        };
        
        const randomMessage = messages[action][Math.floor(Math.random() * messages[action].length)];
        
        const roleplayEmbed = createYakuzaEmbed(
            'Tapa Certeiro',
            randomMessage,
            colors.accent
        );
        
        if (gifUrl) {
            roleplayEmbed.setImage(gifUrl);
        }
        
        if (message) {
            await message.reply({ embeds: [roleplayEmbed] });
        } else {
            await interaction.reply({ embeds: [roleplayEmbed] });
        }
        
    } catch (error) {
        console.error('Erro no comando de roleplay:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro',
            'Ocorreu um erro ao executar esta ação.',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

async function getAnimeGif(action, apiKey) {
    try {
        if (!apiKey) return null;
        
        const searchTerms = {
            slap: 'anime slap funny',
        };
        
        const response = await axios.get(`https://tenor.googleapis.com/v2/search`, {
            params: {
                q: searchTerms[action] || action,
                key: apiKey,
                client_key: 'yakuza_discord_bot',
                limit: 20,
                media_filter: 'gif',
                contentfilter: 'medium'
            },
            timeout: 5000
        });
        
        if (response.data && response.data.results && response.data.results.length > 0) {
            const randomGif = response.data.results[Math.floor(Math.random() * response.data.results.length)];
            return randomGif.media_formats.gif.url;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar GIF:', error);
        return null;
    }
}
