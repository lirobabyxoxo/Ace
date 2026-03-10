const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: '8ball',
    aliases: ['bola', 'pergunta'],
    description: 'Responde sua pergunta com uma frase aleatória',
    
    slashData: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Responde sua pergunta com uma frase aleatória')
        .addStringOption(option =>
            option.setName('pergunta')
                .setDescription('Sua pergunta')
                .setRequired(true)
        ),
    
    async execute(message, args, client, config, colors, createYakuzaEmbed, emojis) {
        const question = args.join(' ');
        
        if (!question) {
            const errorEmbed = createYakuzaEmbed(
                'Erro',
                'Você precisa fazer uma pergunta!\n\n**Exemplo:** `.8ball vou ser rico?`',
                colors.error
            );
            return await message.reply({ embeds: [errorEmbed] });
        }
        
        await perform8Ball(question, message, null, colors, createYakuzaEmbed);
    },
    
    async executeSlash(interaction, client, config, colors, createYakuzaEmbed, emojis) {
        const question = interaction.options.getString('pergunta');
        await perform8Ball(question, null, interaction, colors, createYakuzaEmbed);
    }
};

async function perform8Ball(question, message, interaction, colors, createYakuzaEmbed) {
    try {
        const answers = [
            // Respostas positivas
            'Com certeza! ',
            'Sem dúvidas!',
            'Isso é lowkey pra caralho! ',
            'KKKK SIM',
            'Sim',
            'É óbvio',
            'Claro que sim',
            'Com toda certeza arrombot',
            'SIMMMMMMMMMMM',
            'lmao sim',
            
            // Respostas neutras/incertas
            'Talvez... ',
            'Não sei dizer... ',
            'Pergunta de novo mais tarde... ',
            'Melhor não te contar agora',
            'Concentre-se e pergunte novamente novinha',
            'É incerto ',
            'Não posso prever isso ',
            'Não tenho certeza ... mas sipa...',
            'Depende... ',
            'As estrelas não estão alinhadas ',
            
            // Respostas negativas
            'Nem pensar! ',
            'Definitivamente não! ',
            'Não conte com isso amigo...',
            'Muito improvável ',
            'Nem fodendo! ',
            'Esquece! ',
            'Não vai rolar ',
            'Absolutamente não!',
            'Não né porra',
            'Negativo ',
            
            // Respostas engraçadas
            'Pergunta pra minha pica ',
            'Vai sonhando kkkk ',
            'Nos seus sonhos sipa xd',
            'Quando o doxy parar de explanar a bia, talvez ',
            'Aí tu me quebra ',
            'Nem a pau! ',
            'Sei lá, caralho',
            'Deus me livre',
            'Só no Minecraft ',
            'Capaz! Confia '
        ];
        
        const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
        const replyText =  `${randomAnswer}`;
        
        if (message) {
            await message.reply(replyText);
        } else {
            await interaction.reply(replyText);
        }
        
    } catch (error) {
        console.error('Erro no comando 8ball:', error);
        const errorText = 'Ocorreu um erro ao executar este comando.';
        
        if (message) {
            await message.reply(errorText);
        } else {
            await interaction.reply({ content: errorText, ephemeral: true });
        }
    }
}