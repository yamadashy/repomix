---
title: "Utiliser Repomix avec GitHub Actions"
description: "Automatisez Repomix dans GitHub Actions pour empaqueter des dépôts destinés à l'analyse IA, aux workflows CI, aux artefacts, aux revues de code et aux sorties compressées."
---

# Utiliser Repomix avec GitHub Actions

Vous pouvez automatiser le packaging de votre codebase pour l'analyse par IA en intégrant Repomix dans vos workflows GitHub Actions. Ceci est utile pour l'intégration continue (CI), la revue de code ou la préparation pour des outils LLM.

## Utilisation de base

Ajoutez l'étape suivante à votre fichier YAML de workflow pour packager votre dépôt :

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Utiliser différents formats de sortie

Vous pouvez spécifier différents formats de sortie en utilisant le paramètre `style` (le format par défaut est `xml`) :

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

## Packager plusieurs dossiers avec compression

Vous pouvez spécifier plusieurs dossiers, des patterns d'inclusion/exclusion et activer la compression intelligente :

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

## Télécharger le fichier généré comme artefact

Pour rendre le fichier packagé disponible pour les étapes suivantes ou pour le téléchargement, téléchargez-le comme artefact :

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

## Paramètres d'entrée de l'Action

| Nom                | Description                                   | Par défaut        |
|--------------------|-----------------------------------------------|-------------------|
| `directories`      | Liste des dossiers à packager (séparés par espace) | `.`           |
| `include`          | Patterns glob à inclure (séparés par virgule) | `""`           |
| `ignore`           | Patterns glob à exclure (séparés par virgule) | `""`           |
| `output`           | Chemin du fichier de sortie                   | `repomix-output.xml`     |
| `style`            | Style de sortie (xml, markdown, json, plain)        | `xml`             |
| `compress`         | Activer la compression intelligente           | `true`            |
| `additional-args`  | Arguments supplémentaires pour repomix CLI    | `""`           |
| `repomix-version`  | Version du package npm à installer            | `latest`          |

## Sorties de l'Action

| Nom           | Description                        |
|---------------|------------------------------------|
| `output_file` | Chemin du fichier généré            |

## Exemple de workflow complet

Voici un exemple complet de workflow GitHub Actions utilisant Repomix :

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

Consultez [l'exemple complet du workflow](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml).
