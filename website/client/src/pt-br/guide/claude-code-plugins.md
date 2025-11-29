# Plugins do Claude Code

O Repomix fornece plugins oficiais para o [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) que se integram perfeitamente ao ambiente de desenvolvimento baseado em IA. Esses plugins facilitam a analise e o empacotamento de bases de codigo diretamente dentro do Claude Code usando comandos em linguagem natural.

## Instalacao

### 1. Adicionar o Marketplace de Plugins do Repomix

Primeiro, adicione o marketplace de plugins do Repomix ao Claude Code:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Instalar Plugins

Instale os plugins usando os seguintes comandos:

```text
# Instalar plugin do servidor MCP (base recomendada)
/plugin install repomix-mcp@repomix

# Instalar plugin de comandos (estende a funcionalidade)
/plugin install repomix-commands@repomix

# Instalar plugin explorador de repositorio (analise alimentada por IA)
/plugin install repomix-explorer@repomix
```

::: tip Relacao entre Plugins
O plugin `repomix-mcp` e recomendado como base. O plugin `repomix-commands` fornece comandos slash convenientes, enquanto o `repomix-explorer` adiciona capacidades de analise alimentadas por IA. Embora voce possa instala-los independentemente, usar os tres proporciona a experiencia mais abrangente.
:::

### Alternativa: Instalacao Interativa

Voce tambem pode usar o instalador de plugins interativo:

```text
/plugin
```

Isso abrira uma interface interativa onde voce pode navegar e instalar plugins disponiveis.

## Plugins Disponiveis

### 1. repomix-mcp (Plugin do Servidor MCP)

Plugin base que fornece analise de base de codigo alimentada por IA atraves da integracao com o servidor MCP.

**Recursos:**
- Empacotar repositorios locais e remotos
- Pesquisar saidas empacotadas
- Ler arquivos com verificacao de seguranca integrada ([Secretlint](https://github.com/secretlint/secretlint))
- Compressao automatica Tree-sitter (reducao de aproximadamente 70% de tokens)

### 2. repomix-commands (Plugin de Comandos Slash)

Fornece comandos slash convenientes com suporte a linguagem natural.

**Comandos Disponiveis:**
- `/repomix-commands:pack-local` - Empacotar base de codigo local com varias opcoes
- `/repomix-commands:pack-remote` - Empacotar e analisar repositorios remotos do GitHub

### 3. repomix-explorer (Plugin de Agente de Analise de IA)

Agente de analise de repositorio alimentado por IA que explora bases de codigo de forma inteligente usando Repomix CLI.

**Recursos:**
- Exploracao e analise de base de codigo em linguagem natural
- Descoberta inteligente de padroes e compreensao da estrutura do codigo
- Analise incremental usando grep e leitura de arquivos direcionada
- Gerenciamento automatico de contexto para repositorios grandes

**Comandos Disponiveis:**
- `/repomix-explorer:explore-local` - Analisar base de codigo local com assistencia de IA
- `/repomix-explorer:explore-remote` - Analisar repositorios remotos do GitHub com assistencia de IA

**Como funciona:**
1. Executa `npx repomix@latest` para empacotar o repositorio
2. Usa ferramentas Grep e Read para buscar eficientemente a saida
3. Fornece analise abrangente sem consumir contexto excessivo

## Exemplos de Uso

### Empacotando uma Base de Codigo Local

Use o comando `/repomix-commands:pack-local` com instrucoes em linguagem natural:

```text
/repomix-commands:pack-local
Empacotar este projeto em formato Markdown com compressao
```

Outros exemplos:
- "Empacotar apenas o diretorio src"
- "Empacotar arquivos TypeScript com numeros de linha"
- "Gerar saida em formato JSON"

### Empacotando um Repositorio Remoto

Use o comando `/repomix-commands:pack-remote` para analisar repositorios do GitHub:

```text
/repomix-commands:pack-remote yamadashy/repomix
Empacotar apenas arquivos TypeScript do repositorio yamadashy/repomix
```

Outros exemplos:
- "Empacotar o branch main com compressao"
- "Incluir apenas arquivos de documentacao"
- "Empacotar diretorios especificos"

### Explorando Base de Codigo Local com IA

Use o comando `/repomix-explorer:explore-local` para analise alimentada por IA:

```text
/repomix-explorer:explore-local ./src
Encontrar todo o codigo relacionado a autenticacao
```

Outros exemplos:
- "Analisar a estrutura deste projeto"
- "Mostrar os componentes principais"
- "Encontrar todos os endpoints de API"

### Explorando Repositorio Remoto com IA

Use o comando `/repomix-explorer:explore-remote` para analisar repositorios do GitHub:

```text
/repomix-explorer:explore-remote facebook/react
Mostrar a arquitetura dos componentes principais
```

Outros exemplos:
- "Encontrar todos os hooks do React no repositorio"
- "Explicar a estrutura do projeto"
- "Onde estao definidos os limites de erro?"

## Recursos Relacionados

- [Documentacao do Servidor MCP](/guide/mcp-server) - Saiba mais sobre o servidor MCP subjacente
- [Configuracao](/guide/configuration) - Personalize o comportamento do Repomix
- [Seguranca](/guide/security) - Entenda os recursos de seguranca
- [Opcoes de Linha de Comando](/guide/command-line-options) - Opcoes CLI disponiveis

## Codigo-fonte dos Plugins

O codigo-fonte dos plugins esta disponivel no repositorio do Repomix:

- [Marketplace de Plugins](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [Plugin MCP](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Plugin de Comandos](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Plugin Explorador de Repositorio](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Feedback e Suporte

Se voce encontrar problemas ou tiver sugestoes para os plugins do Claude Code:

- [Abrir um issue no GitHub](https://github.com/yamadashy/repomix/issues)
- [Junte-se a nossa comunidade no Discord](https://discord.gg/wNYzTwZFku)
- [Ver discussoes existentes](https://github.com/yamadashy/repomix/discussions)
