---
title: FAQ e solução de problemas
description: Respostas para perguntas comuns sobre Repomix, repositórios privados, suporte a C# e Python, agentes compatíveis com MCP, formatos de saída, redução de tokens, segurança e fluxos de IA.
---

# FAQ e solução de problemas

Esta página ajuda a escolher o fluxo de trabalho correto do Repomix, reduzir saídas grandes e preparar contexto de codebase para assistentes de IA.

## Perguntas frequentes

### Para que serve o Repomix?

O Repomix empacota um repositório em um único arquivo amigável para IA. Você pode fornecer contexto completo da codebase para ChatGPT, Claude, Gemini e outros assistentes em revisões, investigação de bugs, refatoração, documentação e onboarding.

### O Repomix funciona com repositórios privados?

Sim. Execute o Repomix localmente em um checkout que sua máquina já consegue acessar:

```bash
repomix
```

Revise o arquivo gerado antes de compartilhá-lo com qualquer serviço externo de IA.

### Ele processa repositórios públicos do GitHub sem clonar?

Sim. Use `--remote` com shorthand ou URL completa:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Qual formato de saída devo escolher?

Use XML por padrão. Use Markdown para conversas legíveis, JSON para automação e texto simples para máxima compatibilidade.

```bash
repomix --style markdown
repomix --style json
```

Veja [Formatos de saída](/pt-br/guide/output).

## Reduzindo tokens

### O arquivo gerado está grande demais. O que fazer?

Reduza o contexto:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Em repositórios grandes, combine padrões include/ignore com compressão de código.

### O que `--compress` faz?

`--compress` preserva estruturas importantes como imports, exports, classes, funções e interfaces, removendo muitos detalhes de implementação. É útil quando o modelo precisa entender a arquitetura.

## Segurança e privacidade

### A CLI envia meu código?

A CLI do Repomix roda localmente e escreve um arquivo de saída na sua máquina. O site e a extensão de navegador têm fluxos diferentes; consulte a [Política de privacidade](/pt-br/guide/privacy).

### Como o Repomix evita incluir segredos?

O Repomix usa verificações baseadas em Secretlint. Trate isso como uma camada extra e sempre revise a saída.

## Solução de problemas

### Por que faltam arquivos na saída?

O Repomix respeita `.gitignore`, regras ignore padrão e padrões personalizados. Verifique `repomix.config.json`, `--ignore` e suas regras git.

### Como tornar a saída reproduzível para a equipe?

Crie e versione uma configuração compartilhada:

```bash
repomix --init
```

## Perguntas frequentes adicionais

### O Repomix funciona com C#, Python, Java, Go, Rust ou outras linguagens?

Sim. O Repomix lê os arquivos do seu projeto e os formata para ferramentas de IA, então pode empacotar repositórios escritos em qualquer linguagem de programação. A CLI requer Node.js 20 ou superior. Alguns recursos avançados, como compressão de código baseada em Tree-sitter, dependem do suporte de parser para cada linguagem.

### Posso usar o Repomix com Hermes Agent, OpenClaw ou outros agentes compatíveis com MCP?

Sim. O Repomix pode rodar como servidor MCP:

```bash
npx -y repomix --mcp
```

Para Hermes Agent, adicione o Repomix como servidor MCP stdio em `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

Para OpenClaw ou outros agentes compatíveis com MCP, use o mesmo command e args onde o agente permitir configurar um servidor MCP stdio externo. Se seu assistente suporta Agent Skills, você também pode usar o [Repomix Explorer Skill](/pt-br/guide/repomix-explorer-skill).

### Como uso o Repomix para ajudar um assistente de IA a entender uma nova biblioteca ou framework?

Empacote o repositório da biblioteca ou sua documentação e entregue a saída ao assistente de IA como material de referência:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Para uso repetido, você pode gerar um diretório Agent Skills reutilizável:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### Como excluo CSS, testes, saída de build ou outros arquivos ruidosos?

Use `--ignore` para comandos pontuais:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Use `--include` quando quiser manter apenas caminhos específicos de código-fonte ou documentação:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Existe limite de tamanho de repositório?

A CLI não tem um limite fixo de tamanho de repositório, mas repositórios muito grandes podem ser limitados por memória, tamanho de arquivo ou limites de upload e contexto da ferramenta de IA. Para projetos grandes, comece com padrões include direcionados, inspecione arquivos com muitos tokens e divida a saída se necessário:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### Por que `--include` não inclui arquivos de `node_modules`, diretórios de build ou caminhos ignorados?

`--include` restringe os arquivos que o Repomix tenta empacotar, mas as regras de ignore continuam valendo. Arquivos ainda podem ser excluídos por `.gitignore`, `.ignore`, `.repomixignore`, padrões padrão integrados ou `repomix.config.json`. Em casos avançados, opções como `--no-gitignore` ou `--no-default-patterns` podem ajudar, mas use com cuidado porque podem incluir dependências, artefatos de build ou outros arquivos ruidosos.

## Recursos relacionados

- [Uso básico](/pt-br/guide/usage)
- [Opções de linha de comando](/pt-br/guide/command-line-options)
- [Compressão de código](/pt-br/guide/code-compress)
- [Segurança](/pt-br/guide/security)
