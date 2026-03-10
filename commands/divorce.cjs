const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const marriagesFile = path.join(__dirname, '..', 'data', 'marriages.json');

function loadMarriages() {
    try {
        if (fs.existsSync(marriagesFile)) {
            const data = fs.readFileSync(marriagesFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao carregar casamentos:', error);
    }
    return {};
}

function saveMarriages(marriages) {
    try {
        fs.writeFileSync(marriagesFile, JSON.stringify(marriages, null, 2));
    } catch (error) {
        console.error('Erro ao salvar casamentos:', error);
    }
}

function findMarriage(userId) {
    const marriages = loadMarriages();
    for (const key in marriages) {
        const marriage = marriages[key];
        if (marriage.status === 'casado' && (marriage.user1 === userId || marriage.user2 === userId)) {
            return { key, marriage };
        }
    }
    return null;
}

function getPartner(marriage, userId) {
    return marriage.user1 === userId ? marriage.user2 : marriage.user1;
}

module.exports = {
    name: 'divorce',
    aliases: ['divorciar', 'divorcio'],
    description: 'Divorcia do seu parceiro(a)',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const userMarriage = findMarriage(message.author.id);

        if (!userMarriage) {
            const embed = createYakuzaEmbed(
                'Não Casado(a)',
                `❌ | ${message.author}, você não está casado(a) com ninguém.`,
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        const partnerId = getPartner(userMarriage.marriage, message.author.id);
        
        const marriages = loadMarriages();
        marriages[userMarriage.key].status = 'divorciado';
        marriages[userMarriage.key].divorceDate = new Date().toISOString();
        marriages[userMarriage.key].divorcedBy = message.author.id;
        saveMarriages(marriages);

        const embed = createYakuzaEmbed(
            'Divórcio Realizado',
            `💔 | ${message.author} se divorciou de <@${partnerId}>.\nQue triste...`,
            colors.error
        );

        return message.reply({ embeds: [embed] });
    }
};
