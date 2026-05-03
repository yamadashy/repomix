---
title: "Verwendung von Repomix mit GitHub Actions"
description: "Automatisieren Sie Repomix in GitHub Actions, um Repositories für KI-Analysen, CI-Workflows, Artefakte, Code-Reviews und komprimierte Ausgaben zu packen."
---

# Verwendung von Repomix mit GitHub Actions

Sie können den Verpackungsprozess Ihres Codebases für die KI-Analyse automatisieren, indem Sie Repomix in Ihre GitHub Actions Workflows integrieren. Dies ist nützlich für Continuous Integration (CI), Code-Reviews oder die Vorbereitung für LLM-Tools.

## Grundlegende Nutzung

Fügen Sie den folgenden Schritt zu Ihrer Workflow-YAML-Datei hinzu, um Ihr Repository zu verpacken:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Verwendung verschiedener Ausgabeformate

Sie können verschiedene Ausgabeformate mit dem Parameter `style` festlegen (Standard ist `xml`):

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

## Mehrere Verzeichnisse mit Komprimierung verpacken

Sie können mehrere Verzeichnisse, Include-/Exclude-Patterns und intelligente Komprimierung angeben:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src tests
    include: "**/*.ts,**/*.md"
    ignore: "**/*.test.ts"
    output: repomix-output.xml
    compress: true
```

## Ausgabedatei als Artefakt hochladen

Um die verpackte Datei für nachfolgende Schritte oder zum Download bereitzustellen, laden Sie sie als Artefakt hoch:

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

## Action-Eingabeparameter

| Name               | Beschreibung                                 | Standardwert      |
|--------------------|----------------------------------------------|-------------------|
| `directories`      | Zu verpackende Verzeichnisse (Leerzeichen-getrennt) | `.`         |
| `include`          | Einzuschließende Glob-Patterns (kommagetrennt) | `""`         |
| `ignore`           | Auszuschließende Glob-Patterns (kommagetrennt) | `""`         |
| `output`           | Pfad der Ausgabedatei                         | `repomix-output.xml`     |
| `style`            | Ausgabestil (xml, markdown, json, plain)            | `xml`             |
| `compress`         | Intelligente Komprimierung aktivieren          | `true`            |
| `additional-args`  | Zusätzliche Argumente für repomix CLI          | `""`         |
| `repomix-version`  | Zu installierende npm-Paketversion             | `latest`          |

## Action-Ausgaben

| Name          | Beschreibung                        |
|---------------|-------------------------------------|
| `output_file` | Pfad zur generierten Ausgabedatei    |

## Komplettes Workflow-Beispiel

## Beispiel: Vollständiger Workflow

Hier ein vollständiges Beispiel für einen GitHub Actions Workflow mit Repomix:

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

Das [vollständige Workflow-Beispiel](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml) finden Sie hier.
