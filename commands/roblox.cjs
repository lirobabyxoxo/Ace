const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'roblox',
    aliases: ['rb'],
    description: 'Ver perfil do Roblox de um usuário',
    
    slashData: new SlashCommandBuilder()
        .setName('roblox')
        .setDescription('Ver perfil do Roblox de um usuário')
        .addStringOption(option =>
            option.setName('usuário')
                .setDescription('Username do Roblox')
                .setRequired(true)
        ),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        if (!args[0]) {
            return message.reply('Use: !roblox <username>');
        }
        
        const username = args.join(' ');
        
        try {
            const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`);
            
            if (!searchRes.data.data || searchRes.data.data.length === 0) {
                return message.reply('Usuário Roblox não encontrado.');
            }
            
            const userBasicData = searchRes.data.data[0];
            const userId = userBasicData.id;
            
            const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
            const userData = userRes.data;
            
            const friendsRes = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
            const followersRes = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
            const followingRes = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
            
            const profileEmbed = createYakuzaEmbed(
                userData.displayName || userData.username,
                `Username: ${userData.username}\n` +
                `ID: ${userId}\n` +
                `Criada: <t:${Math.floor(new Date(userData.created).getTime() / 1000)}:d>\n` +
                `Status: ${userData.isBanned ? 'Banido' : (userData.hasVerifiedBadge ? 'Verificado' : 'Online')}\n\n` +
                `Seguidores: ${followersRes.data.count}\n` +
                `Seguindo: ${followingRes.data.count}\n` +
                `Amigos: ${friendsRes.data.count}`,
                colors.primary
            );
            
            profileEmbed.setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`);
            
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Acessar perfil')
                        .setURL(`https://www.roblox.com/users/${userId}/profile`)
                        .setStyle(ButtonStyle.Link)
                );
            
            await message.reply({ embeds: [profileEmbed], components: [button] });
        } catch (error) {
            console.error('Erro ao buscar dados do Roblox:', error.message);
            message.reply('Erro ao buscar dados do Roblox. Tente novamente.');
        }
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed) {
        const username = interaction.options.getString('usuário');
        
        try {
            const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`);
            
            if (!searchRes.data.data || searchRes.data.data.length === 0) {
                return interaction.reply('Usuário Roblox não encontrado.');
            }
            
            const userBasicData = searchRes.data.data[0];
            const userId = userBasicData.id;
            
            const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
            const userData = userRes.data;
            
            const friendsRes = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
            const followersRes = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
            const followingRes = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
            
            const profileEmbed = createYakuzaEmbed(
                userData.displayName || userData.username,
                `Username: ${userData.username}\n` +
                `ID: ${userId}\n` +
                `Criada: <t:${Math.floor(new Date(userData.created).getTime() / 1000)}:d>\n` +
                `Status: ${userData.isBanned ? 'Banido' : (userData.hasVerifiedBadge ? 'Verificado' : 'Online')}\n\n` +
                `Seguidores: ${followersRes.data.count}\n` +
                `Seguindo: ${followingRes.data.count}\n` +
                `Amigos: ${friendsRes.data.count}`,
                colors.primary
            );
            
            profileEmbed.setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`);
            
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Acessar perfil')
                        .setURL(`https://www.roblox.com/users/${userId}/profile`)
                        .setStyle(ButtonStyle.Link)
                );
            
            await interaction.reply({ embeds: [profileEmbed], components: [button] });
        } catch (error) {
            console.error('Erro ao buscar dados do Roblox:', error.message);
            interaction.reply('Erro ao buscar dados do Roblox. Tente novamente.');
        }
    }
};
