const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'addemoji',
    aliases: ['adicionaremoji', 'novoemoji'],
    description: 'Adiciona um ou mais emojis ao servidor',

    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const member = message.member;
        const guild = message.guild;

        // Verificar permissões (Manage Emojis)
        if (!member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const embed = createYakuzaEmbed(
                'Sem Permissão',
                `❌ | Você não tem permissão para gerenciar emojis.`,
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        if (!args.length) {
            const embed = createYakuzaEmbed(
                'Uso Incorreto',
                `❌ | Uso: !addemoji <emoji> [emoji2] [emoji3]...`,
                colors.error
            );
            return message.reply({ embeds: [embed] });
        }

        // Identificar emojis personalizados do Discord na mensagem
        // Formato: <a:nome:id> ou <:nome:id>
        const emojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
        const foundEmojis = [];
        let match;

        while ((match = emojiRegex.exec(message.content)) !== null) {
            foundEmojis.push({
                animated: match[1] === 'a',
                name: match[2],
                id: match[3],
                url: `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] === 'a' ? 'gif' : 'png'}`
            });
        }

        if (foundEmojis.length === 0) {
            return message.reply("⚠️ Emoji inválido ou não suportado. Certifique-se de usar emojis personalizados do Discord.");
        }

        const totalEmojis = foundEmojis.length;
        let addedCount = 0;
        let failedCount = 0;
        let isCancelled = false;

        const progressEmbed = new EmbedBuilder()
            .setTitle('Processando Emojis')
            .setColor(colors.primary)
            .setDescription(`Processando emoji 1/${totalEmojis}\nProgresso: 0%\nAdicionados: 0\nFalhas: 0`)
            .setTimestamp();

        const cancelBtn = new ButtonBuilder()
            .setCustomId('cancel_addemoji')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(cancelBtn);

        const progressMsg = await message.reply({ embeds: [progressEmbed], components: [row] });

        const collector = progressMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId === 'cancel_addemoji',
            time: 300000 // 5 minutos de limite para o processo todo
        });

        collector.on('collect', async i => {
            isCancelled = true;
            await i.update({ content: '🛑 Processo cancelado pelo usuário.', components: [] });
            collector.stop();
        });

        for (let i = 0; i < foundEmojis.length; i++) {
            if (isCancelled) break;

            const emojiData = foundEmojis[i];
            
            // Atualizar embed de progresso
            const percent = Math.round(((i) / totalEmojis) * 100);
            progressEmbed.setDescription(`Processando emoji ${i + 1}/${totalEmojis}: \`${emojiData.name}\`\nProgresso: ${percent}%\nAdicionados: ${addedCount}\nFalhas: ${failedCount}`);
            await progressMsg.edit({ embeds: [progressEmbed] }).catch(() => {});

            try {
                // Verificar se já existe um emoji com o mesmo nome
                const existing = guild.emojis.cache.find(e => e.name === emojiData.name);
                if (existing) {
                    await message.channel.send(`⚠️ O emoji \`${emojiData.name}\` já existe no servidor.`);
                    failedCount++;
                    continue;
                }

                // Verificar slots
                const isAnimated = emojiData.animated;
                const emojisInGuild = guild.emojis.cache;
                const animatedCount = emojisInGuild.filter(e => e.animated).size;
                const staticCount = emojisInGuild.filter(e => !e.animated).size;
                
                // Limites baseados no nível do servidor (simplificado: pegando o limite máximo configurado ou assumindo padrão)
                // O discord.js lida com o erro se o limite for atingido
                
                await guild.emojis.create({
                    attachment: emojiData.url,
                    name: emojiData.name,
                    reason: `Adicionado por ${message.author.tag} via !addemoji`
                });

                await message.channel.send(`✅ Emoji \`${emojiData.name}\` adicionado com sucesso.`);
                addedCount++;
            } catch (error) {
                console.error(`Erro ao adicionar emoji ${emojiData.name}:`, error);
                let errorMsg = `❌ Não foi possível adicionar o emoji \`${emojiData.name}\`.`;
                
                if (error.code === 30008) errorMsg = `❌ Limite de emojis do servidor atingido ao adicionar \`${emojiData.name}\`.`;
                else if (error.code === 50013) errorMsg = `❌ Não foi possível adicionar o emoji \`${emojiData.name}\` (sem permissões).`;
                else if (error.code === 50035) errorMsg = `⚠️ Emoji \`${emojiData.name}\` inválido ou não suportado (formato/tamanho).`;

                await message.channel.send(errorMsg);
                failedCount++;
            }
        }

        if (!isCancelled) {
            const finalEmbed = createYakuzaEmbed(
                'Processamento Concluído',
                `**Resumo:**\nTotal de emojis adicionados: ${addedCount}\nTotal de falhas: ${failedCount}`,
                addedCount > 0 ? colors.success : colors.error
            );
            await progressMsg.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
        }
    }
};
