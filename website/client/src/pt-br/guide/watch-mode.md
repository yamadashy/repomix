---
title: Modo de observação
description: Reempacote automaticamente sua base de código quando os arquivos mudarem com o modo de observação do Repomix, incluindo debouncing, tratamento de ignorados e compatibilidade de opções.
---

# Modo de observação

O Repomix pode observar sua base de código e reempacotá-la automaticamente sempre que os arquivos mudarem. Isso mantém o arquivo de saída atualizado enquanto você trabalha, o que é útil quando você quer fornecer um snapshot continuamente atualizado a um assistente de IA.

## Uso

Inicie o modo de observação com a flag `-w` (ou `--watch`):

```bash
repomix --watch
```

O Repomix executa um empacotamento inicial e, em seguida, continua em execução, reempacotando a cada mudança. Você pode combinar o modo de observação com as opções habituais:

```bash
# Observa um conjunto específico de arquivos
repomix -w --include "src/**/*.ts"

# Observa com um arquivo de saída e formato personalizados
repomix --watch -o output.md --style markdown
```

Pressione `Ctrl+C` para parar a observação.

## Como funciona

- **Empacotamento inicial**: O Repomix empacota a base de código uma vez e, em seguida, informa quantos arquivos está observando.
- **Detecção de mudanças**: Arquivos novos, alterados e excluídos disparam um reempacotamento.
- **Debouncing**: Rajadas rápidas de mudanças (por exemplo, ao trocar de branch ou salvar muitos arquivos de uma vez) são agrupadas. O Repomix aguarda 300 ms após a última mudança antes de reempacotar, de modo que uma sequência de edições resulta em uma única reconstrução.
- **Timestamps**: Após cada reconstrução, o Repomix imprime um timestamp (`Rebuilt at HH:MM:SS`) para que você saiba quando a saída foi atualizada pela última vez.

## Arquivos ignorados

O modo de observação respeita as mesmas regras de ignorados que uma execução normal: `.gitignore`, `.repomixignore`, os padrões padrão embutidos (como `node_modules` e `.git`) e quaisquer padrões `--ignore` que você passar. Diretórios ignorados não são observados, o que mantém o modo de observação eficiente em projetos grandes.

## Compatibilidade de opções

O modo de observação funciona apenas com diretórios locais, portanto não pode ser combinado com as seguintes opções (quer você as defina na linha de comando ou no seu arquivo de configuração):

- `--remote` ou uma URL de repositório remoto posicional: o modo de observação é apenas local
- `--stdout` ou `--stdin`: os modos de streaming não têm um arquivo de saída persistente para atualizar
- `--split-output`
- `--skill-generate`
- `--copy`: reempacotar a cada mudança sobrescreveria repetidamente a área de transferência

Se você combinar uma dessas opções com `--watch`, o Repomix encerra com um erro explicando o conflito.

## Recursos relacionados

- [Opções de linha de comando](/pt-br/guide/command-line-options) - Referência completa da CLI, incluindo `--watch`
- [Uso básico](/pt-br/guide/usage) - Outras maneiras de executar o Repomix
- [Configuração](/pt-br/guide/configuration) - Defina opções de saída padrão no seu arquivo de configuração
