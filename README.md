
# Ace Bot

O **Ace Bot** é um bot multifuncional para Discord, desenvolvido em **Node.js**, utilizando **Discord.js v14** e **Express**.  
Ele combina ferramentas de **moderação, diversão, jogos, roleplay e utilidades**, sendo uma solução completa para servidores que buscam organização e entretenimento.  

---

## Requisitos

- [Node.js](https://nodejs.org/) v18 ou superior  
- [npm](https://www.npmjs.com/) (instalado junto com o Node.js)  
- Uma aplicação criada no [Discord Developer Portal](https://discord.com/developers/applications)  
- Token de bot válido  

---

## Instalação

Clone o repositório e entre no diretório:  
```bash
git clone https://github.com/lirobabyxoxo/Ace-Bot.git
cd Ace-Bot
```

Instale as dependências:  
```bash
npm install
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:  

```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_id_da_aplicacao
GUILD_ID=seu_id_do_servidor
```

- `DISCORD_TOKEN`: Token do bot (obtido no Discord Developer Portal)  
- `CLIENT_ID`: ID da aplicação  
- `GUILD_ID`: Opcional, usado apenas para registrar comandos em um servidor específico  

---

## Execução

### Ambiente de Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

---

## Deploy no Discloud

O **Discloud** é uma plataforma de hospedagem gratuita para bots de Discord.  
Para hospedar o Ace Bot:  

1. Crie uma conta em [Discloud](https://discloud.com/).  
2. Instale a **CLI do Discloud**.  
   ```bash
   npm install -g discloud-cli
   ```  
3. Faça login com seu token da Discloud.  
   ```bash
   discloud login
   ```  
4. Faça o upload do projeto compactado (`.zip`) contendo o `package.json`, `index.cjs` e demais arquivos necessários.  
   ```bash
   discloud upload ./ace-bot.zip
   ```  
5. O bot será iniciado automaticamente na nuvem.  

---

## Funcionalidades

- **Moderação**: banir, expulsar, silenciar, limpar mensagens  
- **Roleplay**: comandos interativos como abraçar, beijar, bater  
- **Diversão**: medidores e índices aleatórios (IQ, gado, etc.)  
- **Jogos**: dado, cara ou coroa, 8ball  
- **Manipulação de imagens**: memes automáticos (triggered, stonks, lixo)  
- **Utilidades**: avatar, informações de usuário, ping, help  

---

## Desenvolvimento

Verificação de tipos:  
```bash
npm run check
```

Aplicar alterações no banco de dados (Drizzle ORM):  
```bash
npm run db:push
```

---

## Nota do Criador

“O Ace Bot ainda está em desenvolvimento. Novos recursos e melhorias serão adicionados constantemente. Esta é apenas a base de algo maior.”  
— Liro  
