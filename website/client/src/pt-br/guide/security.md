---
title: "Segurança"
description: "Saiba como o Repomix usa Secretlint e verificações de segurança para detectar secrets, chaves de API, tokens, credenciais e conteúdo sensível antes de compactar."
---

# Segurança

## Recurso de Verificação de Segurança

O Repomix usa o [Secretlint](https://github.com/secretlint/secretlint) para detectar informações confidenciais em seus arquivos:
- Chaves de API
- Tokens de acesso
- Credenciais
- Chaves privadas
- Variáveis de ambiente

## Configuração

As verificações de segurança são habilitadas por padrão.

Desativar via CLI:
```bash
repomix --no-security-check
```

Ou em `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Medidas de Segurança

1. **Tratamento de Arquivos Binários**: Os conteúdos de arquivos binários são excluídos da saída, mas seus caminhos são listados na estrutura de diretórios para uma visão completa do repositório
2. **Compatível com Git**: Respeita os padrões do `.gitignore`
3. **Detecção Automatizada**: Verifica problemas de segurança comuns:
    - Credenciais da AWS
    - Strings de conexão de banco de dados
    - Tokens de autenticação
    - Chaves privadas

## Confiança na Configuração de Repositórios Remotos {#remote-repository-config-trust}

Ao compactar um repositório remoto com `--remote`, o Repomix trata a configuração desse repositório como código não confiável.

### Por Que um Arquivo de Configuração é Código

Um `repomix.config.*` não é apenas dados:

- `repomix.config.ts` / `.js` / `.mjs` é **executado** quando é carregado.
- `input.processors` executa comandos externos nos arquivos correspondentes.
- `output.instructionFilePath` e padrões de inclusão que usam `../` leem arquivos fora do repositório.

Por isso, carregar uma configuração não revisada de um repositório desconhecido é comparável a executar seu `Makefile`, ou a rodar `npm install` em um pacote com scripts de ciclo de vida.

### Padrão: Configurações Remotas Nunca São Carregadas

O Repomix ignora a configuração de um repositório clonado, a menos que você peça explicitamente. Sua configuração global e as opções de CLI continuam sendo aplicadas. Se você nunca passar a flag abaixo, nada nesta seção pode afetar você.

### Como Ativar

```bash
# Usando flag da CLI
repomix --remote user/repo --remote-trust-config

# Usando variável de ambiente
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Isso concede à configuração remota a mesma confiança de uma configuração escrita por você. Use apenas para repositórios em que você confia e que já revisou.

### Prompt de Confirmação

Em um terminal interativo, o Repomix mostra a configuração que está prestes a ser executada e pede confirmação antes de carregá-la:

| Escolha | Efeito |
| --- | --- |
| **Sim, só desta vez** | Confia apenas nesta execução. |
| **Sim, e não perguntar novamente para este repositório** | Lembra a decisão (veja abaixo). |
| **Não** (seleção padrão) | Aborta sem carregar a configuração. |

A configuração mostrada a você é escrita pelo autor do repositório, então o Repomix garante que a exibição não possa ser manipulada:

- **Sequências de controle e ANSI são escapadas**, para que uma configuração não consiga repintar o terminal nem rolar o aviso para fora da tela.
- **Caracteres bidirecionais e invisíveis são escapados**, para que o texto que você lê seja o texto que é executado ([Trojan Source](https://trojansource.codes/)).
- **A saída tem um limite** tanto no número de linhas quanto no tamanho em bytes, para que uma configuração preenchida artificialmente não consiga empurrar o aviso para fora da tela.
- **Cada linha da configuração recebe um prefixo**, para que uma configuração não consiga forjar os próprios separadores ou mensagens do Repomix.
- **Links simbólicos são recusados.** O Git preserva links simbólicos, então um repositório pode incluir um `repomix.config.json` que aponte para fora do clone. O Repomix exige que a configuração seja um arquivo comum dentro da árvore clonada; caso contrário, os bytes que você revisou não seriam os bytes que são executados.

### Lembrando uma Decisão

Escolher "não perguntar novamente" grava um marcador no seu diretório temporário (`$TMPDIR/repomix/trusted-remotes/`), legível e gravável apenas pela sua conta de usuário.

O marcador é **fixado ao conteúdo**: ele registra um hash da configuração que você aprovou. Se esse repositório publicar depois uma configuração diferente, o hash deixa de corresponder e **você é perguntado novamente** — o mesmo modelo do `direnv allow`.

::: warning Escopo da fixação
O hash cobre apenas o arquivo de configuração de entrada. Uma configuração `.ts` / `.js` pode fazer `import` de outros arquivos, e `input.processors` pode invocar scripts externos; nenhum dos dois é incluído no hash. Um repositório que você já confiou pode alterar esses arquivos enquanto o arquivo de entrada permanece idêntico. É por isso que configurações executáveis são identificadas como tais no prompt: trate "não perguntar novamente" como confiança no repositório, não apenas no arquivo que você leu.
:::

Os marcadores ficam no diretório temporário, então as decisões expiram quando o seu sistema operacional o limpa. Isso é intencional: expirar em direção a "perguntar novamente" é a direção segura.

### Quando o Prompt é Ignorado

| Situação | Comportamento |
| --- | --- |
| `--force` é passado | Confiado sem perguntar. A flag significa que você aceita as consequências; um aviso é impresso no stderr. |
| Shell não interativo (CI, pipes) | Confiado sem perguntar, preservando a automação existente. Um aviso é impresso no stderr. |
| Repositório já confiado | Carregado sem perguntar, desde que a configuração não tenha mudado. |
| Um `--config` absoluto é usado | A configuração própria do repositório clonado nunca é carregada, então não há nada a confirmar. |
| O clone não tem arquivo de configuração | Não há nada a confiar. |

Com `--stdout`, ou quando a saída padrão é redirecionada, o prompt não pode ser exibido. O Repomix reporta um erro com orientações em vez de confiar silenciosamente na configuração.

### Recomendações

1. Deixe `--remote-trust-config` desativado, a menos que você precise da configuração própria do repositório.
2. Leia a configuração no prompt antes de responder, especialmente `input.processors` e quaisquer caminhos `../`.
3. Prefira "Sim, só desta vez" para repositórios que você não controla.
4. Em CI, lembre-se de que o prompt não pode proteger você — fixe a revisão que você compacta e a revise previamente.

## Quando a Verificação de Segurança Encontra Problemas

Exemplo de saída:
```bash
🔍 Verificação de Segurança:
──────────────────
2 arquivo(s) suspeito(s) detectados e excluídos:
1. config/credentials.json
  - Chave de acesso da AWS encontrada
2. .env.local
  - Senha do banco de dados encontrada
```

## Melhores Práticas

1. Sempre revise a saída antes de compartilhar
2. Use `.repomixignore` para caminhos confidenciais
3. Mantenha as verificações de segurança habilitadas
4. Remova arquivos confidenciais do repositório

## Reportando Problemas de Segurança

Encontrou uma vulnerabilidade de segurança? Por favor:
1. Não abra uma issue pública
2. Envie um e-mail para: koukun0120@gmail.com
3. Ou use [Avisos de Segurança do GitHub](https://github.com/yamadashy/repomix/security/advisories/new)

## Recursos relacionados

- [Processamento de Repositório GitHub](/pt-br/guide/remote-repository-processing) - Compacte repositórios que você não clonou você mesmo
- [Configuração](/pt-br/guide/configuration) - Configurar verificações de segurança via `security.enableSecurityCheck`
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Usar a flag `--no-security-check`
- [Política de Privacidade](/pt-br/guide/privacy) - Saiba sobre o tratamento de dados do Repomix
