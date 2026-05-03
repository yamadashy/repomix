---
title: "Usando o Repomix com GitHub Actions"
description: "Automatize o Repomix no GitHub Actions para empacotar repositórios para análise por IA, fluxos de CI, artefatos, revisão de código e saída compactada."
---

# Usando o Repomix com GitHub Actions

Você pode automatizar o empacotamento do seu código para análise por IA integrando o Repomix aos seus workflows do GitHub Actions. Isso é útil para integração contínua (CI), revisão de código ou preparação para ferramentas LLM.

## Uso básico

Adicione o seguinte passo ao seu arquivo YAML de workflow para empacotar seu repositório:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Usando diferentes formatos de saída

Você pode especificar diferentes formatos de saída usando o parâmetro `style` (o padrão é `xml`):

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.md
    style: markdown
```

```yaml
- name: Pack repository with Repomix (JSON format)
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.json
    style: json
```

## Empacotando múltiplos diretórios com compressão

Você pode especificar múltiplos diretórios, padrões de inclusão/exclusão e ativar a compressão inteligente:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src tests
    include: "**/*.ts,**/*.md"
    ignore: "**/*.test.ts"
    output: repomix-output.txt
    compress: true
```

## Enviando o arquivo de saída como artefato

Para disponibilizar o arquivo empacotado para etapas posteriores ou para download, envie-o como artefato:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src
    output: repomix-output.xml
    compress: true

- name: Upload Repomix output
  uses: actions/upload-artifact@v4
  with:
    name: repomix-output
    path: repomix-output.xml
```

## Parâmetros de entrada da Action

| Nome               | Descrição                                   | Padrão            |
|--------------------|---------------------------------------------|-------------------|
| `directories`      | Lista de diretórios a empacotar (separados por espaço) | `.`         |
| `include`          | Padrões glob a incluir (separados por vírgula) | `""`         |
| `ignore`           | Padrões glob a ignorar (separados por vírgula) | `""`         |
| `output`           | Caminho do arquivo de saída                  | `repomix-output.xml`     |
| `style`            | Estilo de saída (xml, markdown, json, plain)       | `xml`             |
| `compress`         | Ativar compressão inteligente                | `true`            |
| `additional-args`  | Argumentos extras para o repomix CLI         | `""`         |
| `repomix-version`  | Versão do pacote npm a instalar              | `latest`          |

## Saídas da Action

| Nome          | Descrição                        |
|---------------|----------------------------------|
| `output_file` | Caminho do arquivo gerado         |

## Exemplo de workflow completo

Aqui está um exemplo completo de workflow do GitHub Actions usando o Repomix:

```yaml
name: Pack repository with Repomix

on:
  workflow_dispatch:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  pack-repo:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Pack repository with Repomix
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: repomix-output.xml

      - name: Upload Repomix output
        uses: actions/upload-artifact@v4
        with:
          name: repomix-output.xml
          path: repomix-output.xml
          retention-days: 30
```

Veja o [exemplo completo do workflow](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml).
