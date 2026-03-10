# Ace Bot - Bot Discord Multifuncional

## Visão Geral

Ace Bot é um bot multifuncional para Discord desenvolvido em Node.js com Discord.js v14.
Ele oferece ferramentas de moderação, diversão, jogos, roleplay e utilidades para servidores Discord.

## Estrutura do Projeto

```
├── index.cjs           # Arquivo principal do bot
├── commands/           # Comandos do bot
│   ├── painel.cjs      # Sistema de painel interno (Ban/Mute/CL config)
│   ├── ban.cjs         # Comando de banimento com embed personalizada
│   ├── mute.cjs        # Comando de mute com embed personalizada
│   ├── economiaconfig.cjs  # Configuração do sistema de economia
│   └── ...             # Outros comandos
├── data/               # Dados de configuração
│   ├── <staffId>.json  # Configs individuais por staff
│   ├── clConfig.json   # Configuração do sistema CL
│   └── marriages.json  # Dados de casamentos
├── economy_data.json   # Dados do sistema de economia
└── server_configs.json # Configurações gerais do servidor
```

## Funcionalidades Principais

### Sistema de Painel (`!painel` / `/painel`)
- Configuração individual de embeds de Ban e Mute por staff
- Contador de punições aplicadas no footer
- Sistema CL (Tomalerda) para limpeza de mensagens

### Sistema CL (Tomalerda)
- Configurável via painel: cargos permitidos e mensagem-chave
- Apaga até 100 mensagens do próprio autor
- Mensagem de feedback opcional

### Sistema de Economia (`!economiaconfig` / `/economia config`)
- Configuração de win rate do cassino
- Valores de work e daily
- Limites de aposta

### Sistema de Casamento (`!marry` / `!divorce`)
- `!marry @alvo` - Pedido de casamento com botões SIM/NÃO
- `!marry top` - Ranking top 5 casais mais antigos
- `!divorce` - Divorcia do parceiro atual
- Dados salvos em `data/marriages.json`
- Proteção contra casamentos duplicados

## Configuração

### Variáveis de Ambiente
```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_id_da_aplicacao
GUILD_ID=seu_id_do_servidor (opcional)
PREFIX=! (opcional, padrão: !)
```

## Comandos Disponíveis

### Moderação
- `!ban` / `/ban` - Banir usuário (embed personalizada)
- `!mute` / `/mute` - Mutar usuário (embed personalizada)
- `!kick` / `/kick` - Expulsar usuário
- `!clear` - Limpar mensagens

### Configuração
- `!painel` / `/painel` - Painel de configuração do staff
- `!economiaconfig` / `/economia config` - Configurar economia

### Economia
- `!daily` - Recompensa diária
- `!work` - Trabalhar
- `!saldo` - Ver saldo
- `!cassino` - Apostar no cassino
- `!coinflip` - Cara ou coroa

### Diversão
- `!8ball` - Bola 8 mágica
- `!dado` - Rolar dado
- `!gay` - Medidor de gay
- `!iq` - Teste de QI

### Casamento
- `!marry @alvo` - Pedir em casamento (aliases: !casar)
- `!marry top` - Ver ranking de casais
- `!divorce` - Divorcia (aliases: !divorciar)

### Sistema de Boost
- `!boost` - Abre painel para personalizar cargo de booster
  - Alterar nome do cargo
  - Alterar cor do cargo
  - Alterar ícone do cargo (requer Premium Tier 2+)
- `!addemoji <emoji/url>` - Adicionar emoji customizado ao servidor (apenas boosters)
- Cargo criado automaticamente ao boostar
- Cargo deletado automaticamente quando para de boostar
- Configurável via `!painel` > "Configurar Boost" para definir posição do cargo

### Sistema Snipe (`!snipe`)
- Exibe a última mensagem deletada no canal
- Armazena por 5 minutos após deleção
- Mostra autor, conteúdo e tempo desde a deleção
- Limite de 1 mensagem por canal

### Sistema Auto-Delete (Configurável via `!painel`)
- Tempo configurável de 0 a 120 segundos (0 = desativado)
- Apaga automaticamente mensagem do comando E resposta do bot
- Comandos EXCLUÍDOS (não são apagados):
  - Roleplay: hug, kiss, slap, pat, kill
  - Casamento: marry, divorce, casar, casamento
- Configuração salva em `server_configs.json`

## Preferências do Usuário
- Idioma: Português (Brasil)
- Estilo: Simples e direto
- Sem web dashboard - tudo dentro do Discord

## Últimas Alterações
- **04/12/2025**: Adicionado sistema Auto-Delete configurável via painel (exclui comandos de roleplay e casamento)
- **04/12/2025**: Adicionado comando `!snipe` para ver última mensagem deletada
- **04/12/2025**: Corrigido comando `!marry` para mostrar duração do casamento atual
- **04/12/2025**: Corrigido comando `!boost` (cor hex 6 dígitos)
- **02/12/2025**: Adicionado sistema de casamento estilo Shine Bot (!marry, !divorce, !marry top)
- Removido frontend web (React/Express)
- Implementado sistema de painel 100% Discord
- Adicionado sistema CL (Tomalerda)
- Embeds de ban/mute personalizadas por staff
- Contador de punições no footer
