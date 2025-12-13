# Usare Repomix con GitHub Actions

Puoi automatizzare l'impacchettamento della tua codebase per l'analisi IA integrando Repomix nei tuoi workflow GitHub Actions. Questo è utile per l'integrazione continua (CI), la revisione del codice o la preparazione per strumenti LLM.

## Utilizzo Base

Aggiungi il seguente step al tuo file YAML del workflow per impacchettare il tuo repository:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Usare Diversi Formati di Output

Puoi specificare diversi formati di output usando il parametro `style` (il formato predefinito è `xml`):

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

## Impacchettare Più Cartelle con Compressione

Puoi specificare più cartelle, pattern di inclusione/esclusione e abilitare la compressione intelligente:

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

## Caricare il File Generato come Artifact

Per rendere il file impacchettato disponibile per gli step successivi o per il download, caricalo come artifact:

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

## Parametri di Input dell'Action

| Nome                | Descrizione                                   | Predefinito        |
|--------------------|-----------------------------------------------|-------------------|
| `directories`      | Lista delle cartelle da impacchettare (separate da spazio) | `.`           |
| `include`          | Pattern glob da includere (separati da virgola) | `""`           |
| `ignore`           | Pattern glob da escludere (separati da virgola) | `""`           |
| `output`           | Percorso del file di output                   | `repomix-output.xml`     |
| `style`            | Stile di output (xml, markdown, json, plain)        | `xml`             |
| `compress`         | Abilita la compressione intelligente           | `true`            |
| `additional-args`  | Argomenti aggiuntivi per repomix CLI    | `""`           |
| `repomix-version`  | Versione del pacchetto npm da installare            | `latest`          |

## Output dell'Action

| Nome           | Descrizione                        |
|---------------|------------------------------------|
| `output_file` | Percorso del file generato            |

## Esempio di Workflow Completo

Ecco un esempio completo di workflow GitHub Actions usando Repomix:

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

Consulta [l'esempio completo del workflow](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml).
