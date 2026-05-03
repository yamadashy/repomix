---
title: "Usar Repomix con GitHub Actions"
description: "Automatiza Repomix en GitHub Actions para empaquetar repositorios destinados a análisis de IA, flujos de CI, artefactos, revisiones de código y salidas comprimidas."
---

# Usar Repomix con GitHub Actions

Puedes automatizar el empaquetado de tu base de código para análisis por IA integrando Repomix en tus flujos de trabajo de GitHub Actions. Esto es útil para integración continua (CI), revisión de código o preparación para herramientas LLM.

## Uso básico

Agrega el siguiente paso a tu archivo YAML de workflow para empaquetar tu repositorio:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Usar diferentes formatos de salida

Puedes especificar diferentes formatos de salida utilizando el parámetro `style` (el predeterminado es `xml`):

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

## Empaquetar múltiples directorios con compresión

Puedes especificar múltiples directorios, patrones de inclusión/exclusión y habilitar la compresión inteligente:

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

## Subir el archivo de salida como artefacto

Para que el archivo empaquetado esté disponible para pasos posteriores o para descarga, súbelo como artefacto:

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

## Parámetros de entrada de la Action

| Nombre             | Descripción                                 | Predeterminado    |
|--------------------|---------------------------------------------|-------------------|
| `directories`      | Lista de directorios a empaquetar (separados por espacio) | `.`         |
| `include`          | Patrones glob a incluir (separados por coma) | `""`         |
| `ignore`           | Patrones glob a excluir (separados por coma) | `""`         |
| `output`           | Ruta del archivo de salida                   | `repomix-output.xml`     |
| `compress`         | Habilitar compresión inteligente             | `true`            |
| `style`            | Formato de salida (xml, markdown, json, plain)     | `xml`             |
| `additional-args`  | Argumentos extra para repomix CLI            | `""`         |
| `repomix-version`  | Versión del paquete npm a instalar           | `latest`          |

## Salidas de la Action

| Nombre         | Descripción                        |
|---------------|------------------------------------|
| `output_file` | Ruta del archivo generado           |

## Ejemplo de workflow completo

Aquí tienes un ejemplo completo de workflow de GitHub Actions usando Repomix:

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

Ver el [ejemplo completo del workflow](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml).
