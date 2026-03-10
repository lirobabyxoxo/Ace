const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'info', 'whois', 'wi'],
    description: 'Mostrar informações detalhadas de um usuário',
    
    slashData: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Mostrar informações detalhadas de um usuário')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('Usuário para mostrar informações')
                .setRequired(false)
        ),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const user = message.mentions.users.first() || 
                    (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || 
                    message.author;
        
        const member = message.guild.members.cache.get(user.id);
        await showUserInfo(user, member, message, null, colors, createYakuzaEmbed);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        const user = interaction.options.getUser('usuário') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        await showUserInfo(user, member, null, interaction, colors, createYakuzaEmbed);
    }
};

async function showUserInfo(user, member, message, interaction, colors, createYakuzaEmbed) {
    try {
        const flags = (user.flags?.toArray?.() || user.publicFlags?.toArray?.() || []);
        
        const badgeEmojis = {
            ActiveDeveloper: '<:ActiveDeveloper:1445469975451144413>',
            VerifiedDeveloper: '<:VerifiedDeveloper:1445469972758265956>',
            CertifiedModerator: '<:CertifiedModerator:1445470015141974098>',
            Staff: '<:Staff:1445469964558532741>',
            PremiumEarlySupporter: '<:PremiumEarlySupporter:1445470057248325809>',
            BugHunterLevel1: '<:BugHunterLevel1:1445470006816276654>',
            BugHunterLevel2: '<:BugHunterLevel2:1445470009248714752>',
            HypeSquad: '<:HypeSquad:1445470017540980837>',
            HypeSquadBravery: '<:HypeSquadOnlineHouse1:1445470019759898674>',
            HypeSquadBrilliance: '<:HypeSquadOnlineHouse2:1445470021575774362>',
            HypeSquadBalance: '<:HypeSquadOnlineHouse3:1445470193810935940>'
        };

        const userBadges = flags.map(flag => badgeEmojis[flag]).filter(Boolean).join(' ') || 'Nenhuma insígnia';

        const userEmbed = new EmbedBuilder()
            .setColor(colors.primary)
            .setAuthor({ name: `${user.username} (${user.id})`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(member ? member.displayAvatarURL({ dynamic: true }) : user.displayAvatarURL({ dynamic: true }))
            .setDescription(`${user} \`${user.tag}\``)
            .addFields(
                { 
                    name: '<:username:1457114052785344593> Username', 
                    value: `\`${user.username}\``, 
                    inline: true 
                },
                { 
                    name: '<:id:1457114295329361952> ID do Usuário', 
                    value: `\`${user.id}\``, 
                    inline: true 
                },
                { 
                    name: '<:insigna:1457113984967905280> Insígnias', 
                    value: userBadges, 
                    inline: false 
                },
                { 
                    name: '<:calendario2:1457114054765318227> Criado em', 
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:f> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, 
                    inline: false 
                }
            );

        if (member) {
            userEmbed.addFields({ 
                name: '<:calendario2:1457114054765318227> Entrada no Servidor', 
                value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:f> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, 
                inline: false 
            });

            if (member.premiumSince) {
                userEmbed.addFields({ name: 'Boost', value: `<:BoostLevel1:1445469979200716953> Impulsionando desde <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: false });
            }
        }

        userEmbed.setFooter({ text: ' — Ace Bot ' }).setTimestamp();
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`avatar_${user.id}`)
                    .setLabel('AVATAR')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId(`banner_${user.id}`)
                    .setLabel('BANNER')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId(`permissions_${user.id}`)
                    .setLabel('PERM')
                    .setStyle(ButtonStyle.Danger)
            );
        
        if (message) {
            await message.reply({ embeds: [userEmbed], components: [buttons] });
        } else {
            await interaction.reply({ embeds: [userEmbed], components: [buttons] });
        }
        
    } catch (error) {
        console.error('Erro ao mostrar informações do usuário:', error);
        
        const errorEmbed = createYakuzaEmbed(
            'Erro',
            '> `Não foi possível obter as informações deste usuário.`',
            colors.error
        );
        
        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}