const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const categories = {
    administrativo: {
        name: 'Administrativo',
        commands: [
            { name: 'ban', usage: '[@usuário] [motivo]', desc: 'Banir usuário', example: '@usuario spam', simulatedResult: 'Usuário foi banido do servidor por: spam' },
            { name: 'kick', usage: '[@usuário] [motivo]', desc: 'Expulsar usuário', example: '@usuario comportamento', simulatedResult: 'Usuário foi expulso do servidor por: comportamento' },
            { name: 'mute', usage: '[@usuário] [tempo] [motivo]', desc: 'Mutar (1s a 28d)', example: '@usuario 10m spam', simulatedResult: 'Usuário foi mutado por 10 minutos. Motivo: spam' },
            { name: 'unmute', usage: '[@usuário]', desc: 'Desmutar usuário', example: '@usuario', simulatedResult: 'Usuário foi desmutado com sucesso' },
            { name: 'unban', usage: '[ID]', desc: 'Desbanir usuário', example: '123456789', simulatedResult: 'Usuário foi desbanido do servidor' },
            { name: 'clear', usage: '[número]', desc: 'Limpar mensagens (1-100)', example: '50', simulatedResult: '50 mensagens foram deletadas deste canal' },
            { name: 'lock', usage: '', desc: 'Bloquear o canal', example: '', simulatedResult: 'O canal foi bloqueado. Apenas staff pode enviar mensagens' },
            { name: 'unlock', usage: '', desc: 'Desbloquear o canal', example: '', simulatedResult: 'O canal foi desbloqueado. Todos podem enviar mensagens' }
        ]
    },
    roleplay: {
        name: 'Roleplay',
        commands: [
            { name: 'kiss', usage: '[@usuário]', desc: 'Beijar alguém', example: '@usuario', simulatedResult: 'Você beijou @usuario com um GIF animado' },
            { name: 'hug', usage: '[@usuário]', desc: 'Abraçar alguém', example: '@usuario', simulatedResult: 'Você abraçou @usuario com um GIF animado' },
            { name: 'kill', usage: '[@usuário]', desc: 'Matar alguém', example: '@usuario', simulatedResult: 'Você matou @usuario com um GIF animado' },
            { name: 'pat', usage: '[@usuário]', desc: 'Afagar alguém', example: '@usuario', simulatedResult: 'Você afagou @usuario com um GIF animado' },
            { name: 'slap', usage: '[@usuário]', desc: 'Dar um tapa', example: '@usuario', simulatedResult: 'Você deu um tapa em @usuario com um GIF animado' }
        ]
    },
    pontos: {
        name: 'Points & Ranking',
        commands: [
            { name: 'perfil', usage: '[@usuário]', desc: 'Ver Points', example: '@usuario', simulatedResult: 'Perfil de @usuario: 150 Points' },
            { name: 'g top', usage: '', desc: 'Ranking Points (top 50)', example: '', simulatedResult: 'Top 5 membros com mais Points' }
        ]
    },
    jogos: {
        name: 'Jogos & Sorte',
        commands: [
            { name: '8ball', usage: '[pergunta]', desc: 'Bola mágica responde', example: 'Vou passar no teste?', simulatedResult: '8ball responde: Sim, com certeza!' }
        ]
    },
    utilitarios: {
        name: 'Utilitários',
        commands: [
            { name: 'avatar', usage: '[@usuário]', desc: 'Mostrar avatar', example: '@usuario', simulatedResult: 'Avatar de @usuario: [imagem exibida]' },
            { name: 'userinfo', usage: '[@usuário]', desc: 'Info do usuário', example: '@usuario', simulatedResult: 'Informações de @usuario exibidas em embed' },
            { name: 'ping', usage: '', desc: 'Ping do bot', example: '', simulatedResult: 'Pong! 45ms' },
            { name: 'help', usage: '', desc: 'Esta mensagem', example: '', simulatedResult: 'Ajuda enviada no DM com dropdown de categorias' }
        ]
    },
    redes: {
        name: 'Redes Sociais',
        commands: [
            { name: 'roblox', usage: '<username>', desc: 'Perfil do Roblox', example: 'builderman', simulatedResult: 'Perfil Roblox: builderman com 5M de seguidores' }
        ]
    }
};

module.exports = {
    name: 'help',
    aliases: ['ajuda', 'comandos'],
    description: 'Mostra todos os comandos disponíveis',

    slashData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Mostra todos os comandos disponíveis'),

    async execute(message, args, client, config, colors, createYakuzaEmbed) {
        await sendHelpMessage(message.author, message, null, config, colors, createYakuzaEmbed);
    },

    async executeSlash(interaction, client, config, colors, createYakuzaEmbed) {
        await sendHelpMessage(interaction.user, null, interaction, config, colors, createYakuzaEmbed);
    }
};

const categoryOptions = [
    { label: 'Points & Ranking', value: 'pontos', description: 'Sistema de Points' },
    { label: 'Administrativo', value: 'administrativo', description: 'Comandos de moderação' },
    { label: 'Roleplay', value: 'roleplay', description: 'Comandos de roleplay' },
    { label: 'Jogos & Sorte', value: 'jogos', description: 'Comandos de jogos' },
    { label: 'Utilitários', value: 'utilitarios', description: 'Comandos úteis' },
    { label: 'Redes Sociais', value: 'redes', description: 'Perfis de redes sociais' }
];

async function sendHelpMessage(user, message, interaction, config, colors, createYakuzaEmbed) {
    const mainEmbed = createYakuzaEmbed(
        'Precisando de ajuda?',
        'Selecione uma categoria abaixo para ver os comandos disponíveis.',
        colors.accent
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Escolha uma categoria...')
        .addOptions(categoryOptions);

    const actionRow = new ActionRowBuilder()
        .addComponents(selectMenu);

    try {
        await user.send({ embeds: [mainEmbed], components: [actionRow] });

        const confirmEmbed = createYakuzaEmbed(
            'Sabe nem usar o bot!',
            'Te mandei o tutorial na DM',
            colors.success
        );

        if (message) {
            await message.reply({ embeds: [confirmEmbed] });
        } else if (interaction) {
            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        }

    } catch (error) {
        const errorEmbed = createYakuzaEmbed(
            'Erro',
            'Abre o pv ae pORRA, não consegui te mandar a mensagem.',
            colors.error
        );

        if (message) {
            await message.reply({ embeds: [errorEmbed] });
        } else if (interaction) {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

function createCategoryEmbed(categoryKey, config, colors, createYakuzaEmbed) {
    const category = categories[categoryKey];
    if (!category) return null;

    let description = '';
    category.commands.forEach(cmd => {
        const usage = cmd.usage ? ` ${cmd.usage}` : '';
        description += `**›** \`${config.prefix}${cmd.name}\`${usage}\n${cmd.desc}\n\n`;
    });

    const embed = createYakuzaEmbed(
        category.name,
        description.trim(),
        colors.primary
    );

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`help_example_${categoryKey}`)
                .setLabel('Exemplo')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('help_return')
                .setLabel('Retornar')
                .setStyle(ButtonStyle.Primary)
        );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Escolha uma categoria...')
        .addOptions(categoryOptions);

    const selectRow = new ActionRowBuilder()
        .addComponents(selectMenu);

    return { embed, buttons, selectRow };
}

function createExampleEmbed(categoryKey, config, colors, createYakuzaEmbed) {
    const category = categories[categoryKey];
    if (!category) return null;

    let description = '';
    category.commands.forEach(cmd => {
        const usage = cmd.usage ? ` ${cmd.usage}` : '';
        description += `**${config.prefix}${cmd.name}**${usage}\n`;
        description += `> ${cmd.simulatedResult}\n\n`;
    });

    const embed = createYakuzaEmbed(
        `Exemplos - ${category.name}`,
        description.trim(),
        colors.primary
    );

    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`help_example_${categoryKey}`)
                .setLabel('Voltar aos Comandos')
                .setStyle(ButtonStyle.Primary)
        );

    return { embed, button };
}

module.exports.categories = categories;
module.exports.createCategoryEmbed = createCategoryEmbed;
module.exports.createExampleEmbed = createExampleEmbed;
module.exports.handleSelectMenu = async function(interaction, client, config, colors, createYakuzaEmbed) {
    const selectedCategory = interaction.values[0];
    const categoryData = createCategoryEmbed(selectedCategory, config, colors, createYakuzaEmbed);
    
    if (!categoryData) {
        return interaction.update({ content: 'Categoria não encontrada.', embeds: [], components: [] });
    }

    await interaction.update({ 
        embeds: [categoryData.embed], 
        components: [categoryData.selectRow, categoryData.buttons] 
    });
};

module.exports.handleButtonInteraction = async function(interaction, client, config, colors, createYakuzaEmbed) {
    const customId = interaction.customId;

    if (customId === 'help_return') {
        const mainEmbed = createYakuzaEmbed(
            'Precisando de ajuda?',
            'Selecione uma categoria abaixo para ver os comandos disponíveis.',
            colors.accent
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Escolha uma categoria...')
            .addOptions(categoryOptions);

        const actionRow = new ActionRowBuilder()
            .addComponents(selectMenu);

        return interaction.update({ embeds: [mainEmbed], components: [actionRow] });
    }

    if (customId.startsWith('help_example_')) {
        const categoryKey = customId.replace('help_example_', '');
        const currentCustomId = interaction.message.components[0]?.components[0]?.customId;
        
        if (currentCustomId && currentCustomId.startsWith('help_example_')) {
            const categoryData = createCategoryEmbed(categoryKey, config, colors, createYakuzaEmbed);
            if (!categoryData) {
                return interaction.update({ content: 'Categoria não encontrada.', embeds: [], components: [] });
            }
            return interaction.update({ 
                embeds: [categoryData.embed], 
                components: [categoryData.selectRow, categoryData.buttons] 
            });
        }

        const exampleData = createExampleEmbed(categoryKey, config, colors, createYakuzaEmbed);
        
        if (!exampleData) {
            return interaction.update({ content: 'Categoria não encontrada.', embeds: [], components: [] });
        }

        return interaction.update({ 
            embeds: [exampleData.embed], 
            components: [exampleData.button] 
        });
    }
};
