# Formatos de Saída

O Repomix suporta três formatos de saída:
- Texto simples (padrão)
- XML
- Markdown

## Formato de Texto Simples

```bash
repomix --style plain
```

Estrutura de saída:
```text
Este arquivo é uma representação consolidada de toda a base de código...

================
Resumo do Arquivo
================
(Metadados e instruções para IA)

================
Estrutura de Diretórios
================
src/
  index.ts
  utils/
    helper.ts

================
Arquivos
================

================
Arquivo: src/index.ts
================
// Conteúdo do arquivo aqui
```

## Formato XML

```bash
repomix --style xml
```

O formato XML é otimizado para processamento por IA:

::: tip Por que XML?
As tags XML ajudam modelos de IA como o Claude a analisar o conteúdo com mais precisão. A [documentação do Claude](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) recomenda o uso de tags XML para prompts estruturados.
:::

```xml
Este arquivo é uma representação consolidada de toda a base de código...

<file_summary>
(Metadados e instruções para IA)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// Conteúdo do arquivo aqui
</file>
</files>
```

## Formato Markdown

```bash
repomix --style markdown
```

O Markdown oferece formatação legível:

```markdown
Este arquivo é uma representação consolidada de toda a base de código...

# Resumo do Arquivo
(Metadados e instruções para IA)

# Estrutura de Diretórios
```text
src/
  index.ts
  utils/
    helper.ts
```

# Arquivos

## Arquivo: src/index.ts
```typescript
// Conteúdo do arquivo aqui
```
```

## Uso com Modelos de IA

Cada formato funciona bem com modelos de IA, mas considere:
- Use XML para Claude (melhor precisão de análise)
- Use Markdown para leitura geral
- Use Texto Simples para simplicidade e compatibilidade universal

## Customização

Defina o formato padrão no `repomix.config.json`:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```
