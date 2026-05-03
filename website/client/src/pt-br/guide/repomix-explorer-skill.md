---
title: "Repomix Explorer Skill (Agent Skills)"
description: "Instale a agent skill Repomix Explorer para analisar bases de código locais e remotas com Claude Code e outros assistentes de IA compatíveis com o formato Agent Skills."
---

# Repomix Explorer Skill (Agent Skills)

Repomix fornece um skill **Repomix Explorer** pronto para uso que permite que assistentes de codificação de IA analisem e explorem bases de código usando Repomix CLI.

Este skill foi projetado para Claude Code e outros assistentes de IA compatíveis com o formato Agent Skills.

## Instalação Rápida

Para Claude Code, instale o plugin oficial Repomix Explorer:

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

O plugin do Claude Code fornece comandos com namespace como `/repomix-explorer:explore-local` e `/repomix-explorer:explore-remote`. Veja [Plugins do Claude Code](/pt-br/guide/claude-code-plugins) para a configuração completa.

Para Codex, Cursor, OpenClaw e outros assistentes compatíveis com Agent Skills, instale a skill independente com a Skills CLI:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Para direcionar um assistente específico, passe `--agent`:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Para Hermes Agent, instale a skill de arquivo único com o comando nativo de skills do Hermes Agent:

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

Se você usa Hermes Agent principalmente para análise de repositórios, a configuração do [Servidor MCP](/pt-br/guide/mcp-server) também é uma boa opção, pois executa o Repomix diretamente como servidor MCP.

## O Que Faz

Uma vez instalado, você pode analisar bases de código com instruções em linguagem natural.

#### Analisar repositórios remotos

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Explorar bases de código locais

```text
"What's in this project?
~/projects/my-app"
```

Isso é útil não apenas para entender bases de código, mas também quando você quer implementar recursos referenciando seus outros repositórios.

## Como Funciona

O skill Repomix Explorer guia os assistentes de IA através do fluxo de trabalho completo:

1. **Executar comandos repomix** - Empacotar repositórios em formato amigável para IA
2. **Analisar arquivos de saída** - Usar busca de padrões (grep) para encontrar código relevante
3. **Fornecer insights** - Reportar estrutura, métricas e recomendações acionáveis

## Exemplos de Casos de Uso

### Entender uma Nova Base de Código

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

A IA executará repomix, analisará a saída e fornecerá uma visão geral estruturada da base de código.

### Encontrar Padrões Específicos

```text
"Find all authentication-related code in this repository."
```

A IA buscará padrões de autenticação, categorizará achados por arquivo e explicará como a autenticação está implementada.

### Referenciar Seus Próprios Projetos

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

A IA analisará seu outro repositório e ajudará você a referenciar suas próprias implementações.

## Conteúdo do Skill

O skill inclui:

- **Reconhecimento de intenção do usuário** - Entende várias formas que os usuários pedem análise de bases de código
- **Guia de comandos Repomix** - Sabe quais opções usar (`--compress`, `--include`, etc.)
- **Fluxo de trabalho de análise** - Abordagem estruturada para explorar saídas empacotadas
- **Melhores práticas** - Dicas de eficiência como usar grep antes de ler arquivos inteiros

## Recursos Relacionados

- [Geração de Agent Skills](/pt-br/guide/agent-skills-generation) - Gere seus próprios skills a partir de bases de código
- [Plugins Claude Code](/pt-br/guide/claude-code-plugins) - Plugins Repomix para Claude Code
- [Servidor MCP](/pt-br/guide/mcp-server) - Método de integração alternativo
