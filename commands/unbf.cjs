const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bfFile = path.join(__dirname, '..', 'data', 'bestfriends.json');

function loadBFs() {
    try {
        if (fs.existsSync(bfFile)) {
            const data = fs.readFileSync(bfFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao carregar best friends:', error);
    }
    return {};
}

function saveBFs(bfs) {
    try {
        fs.writeFileSync(bfFile, JSON.stringify(bfs, null, 2));
    } catch (error) {
        console.error('Erro ao salvar best friends:', error);
    }
}

function findBF(userId) {
    const bfs = loadBFs();
    for (const key in bfs) {
        const bf = bfs[key];
        if (bf.status === 'bf' && (bf.user1 === userId || bf.user2 === userId)) {
            return { key, bf };
        }
    }
    return null;
}

function getPartner(bf, userId) {
    return bf.user1 === userId ? bf.user2 : bf.user1;
}

module.exports = {
    name: 'unbf',
    aliases: ['desfazeramizade'],
    description: 'Desfaz a amizade com seu melhor amigo(a)',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const userBF = findBF(message.author.id);

        if (!userBF) {
            const embed = createYakuzaEmbed(
                'Sem Melhor Amigo',
                `${message.author}, voce nao tem um melhor amigo(a) no momento.`,
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        const partnerId = getPartner(userBF.bf, message.author.id);

        const bfs = loadBFs();
        bfs[userBF.key].status = 'ended';
        bfs[userBF.key].endDate = new Date().toISOString();
        bfs[userBF.key].endedBy = message.author.id;
        saveBFs(bfs);

        const embed = createYakuzaEmbed(
            'Amizade Desfeita',
            `${message.author} desfez a amizade com <@${partnerId}>.`,
            colors.error
        );

        return message.reply({ embeds: [embed] });
    }
};
