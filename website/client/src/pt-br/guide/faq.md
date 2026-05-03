---
title: FAQ e solução de problemas
description: Respostas para perguntas comuns sobre Repomix, repositórios privados, formatos de saída, redução de tokens, segurança e fluxos de trabalho com IA.
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

## Recursos relacionados

- [Uso básico](/pt-br/guide/usage)
- [Opções de linha de comando](/pt-br/guide/command-line-options)
- [Compressão de código](/pt-br/guide/code-compress)
- [Segurança](/pt-br/guide/security)
